"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatDate, formatRupiah, laundryStatusLabel, paymentMethodLabel, paymentStatusLabel, unitLabel } from "@/lib/utils";
import type { StoreSettings, Transaction } from "@/types";

export function ReceiptPrintLayout({ transaction, settings }: { transaction: Transaction; settings: StoreSettings }) {
  const [width, setWidth] = useState<58 | 80>(settings.receiptWidth);
  const [bluetoothStatus, setBluetoothStatus] = useState("");
  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState(false);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    if (search.get("autoprint") === "1") setTimeout(() => window.print(), 350);
  }, []);

  async function printViaBluetooth() {
    setBluetoothStatus("");
    const bluetooth = (navigator as BluetoothNavigator).bluetooth;
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (!bluetooth) {
      setBluetoothStatus(
        isIos
          ? "Bluetooth langsung tidak tersedia di browser iPhone. Gunakan tombol Print Nota/AirPrint, atau pakai Android/Windows untuk Bluetooth langsung."
          : "Browser ini belum mendukung Web Bluetooth. Coba Chrome/Edge di Android atau desktop."
      );
      return;
    }

    setIsBluetoothPrinting(true);
    setBluetoothStatus("Mencari printer Bluetooth...");

    try {
      await writeEscposReceipt(bluetooth, buildEscposReceipt(transaction, settings));
      setBluetoothStatus("Perintah cetak Bluetooth sudah dikirim ke printer.");
    } catch (error) {
      setBluetoothStatus(error instanceof Error ? error.message : "Gagal mengirim struk ke printer Bluetooth.");
    } finally {
      setIsBluetoothPrinting(false);
    }
  }

  return (
    <div className="print-shell min-h-screen bg-slate-100 p-6">
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => window.print()}>Print Nota</Button>
        <Button variant="secondary" onClick={printViaBluetooth} disabled={isBluetoothPrinting}>
          {isBluetoothPrinting ? "Mengirim..." : "Bluetooth Langsung"}
        </Button>
        <Button variant="secondary" onClick={() => setWidth(58)}>58mm</Button>
        <Button variant="secondary" onClick={() => setWidth(80)}>80mm</Button>
      </div>
      {bluetoothStatus ? (
        <div className="no-print mb-4 max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          {bluetoothStatus}
        </div>
      ) : null}
      <ReceiptPreview transaction={transaction} settings={settings} width={width} />
    </div>
  );
}

export function ReceiptPreview({ transaction, settings, width = 58 }: { transaction: Transaction; settings: StoreSettings; width?: 58 | 80 }) {
  return (
    <div className="receipt-paper mx-auto p-3 shadow-soft" data-width={width}>
      <div className="text-center">
        <div className="text-sm font-bold">{settings.storeName}</div>
        <div>{settings.address}</div>
        <div>WA: {settings.whatsapp}</div>
      </div>
      <div className="my-2 border-t border-dashed border-black" />
      <Row label="No" value={transaction.transactionNumber} />
      <Row label="Tanggal" value={formatDate(transaction.createdAt)} />
      <Row label="Kasir" value={transaction.cashier.name} />
      <Row label="Pelanggan" value={transaction.customer.name} />
      <Row label="HP" value={transaction.customer.phone} />
      <div className="my-2 border-t border-dashed border-black" />
      {transaction.items.map((item) => (
        <div key={item.id} className="mb-1">
          <div className="font-bold">{item.serviceName}</div>
          <div className="flex justify-between">
            <span>{item.quantity} {unitLabel[item.unit]} x {formatRupiah(item.price)}</span>
            <span>{formatRupiah(item.subtotal)}</span>
          </div>
          {item.notes ? <div>Catatan: {item.notes}</div> : null}
        </div>
      ))}
      <div className="my-2 border-t border-dashed border-black" />
      <Row label="Subtotal" value={formatRupiah(transaction.subtotal)} />
      {transaction.discount > 0 ? <Row label="Diskon" value={formatRupiah(transaction.discount)} /> : null}
      {transaction.additionalFee > 0 ? <Row label="Tambahan" value={formatRupiah(transaction.additionalFee)} /> : null}
      {transaction.tax > 0 ? <Row label="Pajak" value={formatRupiah(transaction.tax)} /> : null}
      <div className="my-1 border-t border-black" />
      <Row label="TOTAL" value={formatRupiah(transaction.grandTotal)} strong />
      <Row label="Dibayar" value={formatRupiah(transaction.paidAmount)} />
      <Row label="Kembali" value={formatRupiah(transaction.changeAmount)} />
      <Row label="Metode" value={transaction.payments[0] ? paymentMethodLabel[transaction.payments[0].paymentMethod] : "-"} />
      <Row label="Bayar" value={receiptPaymentStatus(transaction)} />
      <Row label="Estimasi" value={transaction.estimatedDoneAt ? formatDate(transaction.estimatedDoneAt, "dd MMM yyyy") : "-"} />
      {transaction.notes ? <div className="mt-1">Catatan: {transaction.notes}</div> : null}
      <div className="my-2 border-t border-dashed border-black" />
      <div className="text-center">Terima kasih sudah menggunakan layanan kami.</div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function receiptPaymentStatus(transaction: Transaction) {
  if (transaction.paymentStatus === "PARTIAL") return `DP: ${formatRupiah(transaction.paidAmount)}`;
  return paymentStatusLabel[transaction.paymentStatus];
}

type BluetoothNavigator = Navigator & {
  bluetooth?: {
    requestDevice(options: {
      acceptAllDevices: boolean;
      optionalServices: BluetoothServiceUUID[];
    }): Promise<BluetoothDeviceLike>;
  };
};

type BluetoothDeviceLike = {
  gatt?: {
    connect(): Promise<BluetoothServerLike>;
  };
};

type BluetoothServerLike = {
  getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothServiceLike>;
  disconnect?(): void;
};

type BluetoothServiceLike = {
  getCharacteristics(): Promise<BluetoothCharacteristicLike[]>;
};

type BluetoothCharacteristicLike = {
  properties: {
    write?: boolean;
    writeWithoutResponse?: boolean;
  };
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse?(value: BufferSource): Promise<void>;
};

type BluetoothServiceUUID = string | number;

const thermalPrinterServices: BluetoothServiceUUID[] = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
];

async function writeEscposReceipt(bluetooth: NonNullable<BluetoothNavigator["bluetooth"]>, text: string) {
  const device = await bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: thermalPrinterServices,
  });
  const server = await device.gatt?.connect();
  if (!server) throw new Error("Printer Bluetooth tidak bisa dihubungkan.");

  try {
    const characteristic = await findWritableCharacteristic(server);
    const bytes = new Uint8Array([
      0x1b, 0x40,
      ...new TextEncoder().encode(text),
      0x0a, 0x0a, 0x0a,
    ]);

    for (let start = 0; start < bytes.length; start += 120) {
      const chunk = bytes.slice(start, start + 120);
      if (characteristic.writeValueWithoutResponse && characteristic.properties.writeWithoutResponse) {
        await characteristic.writeValueWithoutResponse(chunk);
      } else {
        await characteristic.writeValue(chunk);
      }
    }
  } finally {
    server.disconnect?.();
  }
}

async function findWritableCharacteristic(server: BluetoothServerLike) {
  for (const serviceId of thermalPrinterServices) {
    try {
      const service = await server.getPrimaryService(serviceId);
      const characteristics = await service.getCharacteristics();
      const writable = characteristics.find((item) => item.properties.write || item.properties.writeWithoutResponse);
      if (writable) return writable;
    } catch {
      // Coba service umum berikutnya.
    }
  }

  throw new Error("Printer terhubung, tapi channel cetaknya tidak ditemukan. Printer ini kemungkinan Bluetooth Classic atau butuh protokol aplikasi vendor.");
}

function buildEscposReceipt(transaction: Transaction, settings: StoreSettings) {
  const width = settings.receiptWidth === 80 ? 42 : 32;
  const lines = [
    center(settings.storeName, width),
    center(settings.address, width),
    center(`WA: ${settings.whatsapp}`, width),
    divider(width),
    pair("No", transaction.transactionNumber, width),
    pair("Tanggal", formatDate(transaction.createdAt), width),
    pair("Kasir", transaction.cashier.name, width),
    pair("Pelanggan", transaction.customer.name, width),
    pair("HP", transaction.customer.phone, width),
    divider(width),
    ...transaction.items.flatMap((item) => [
      item.serviceName,
      pair(`${item.quantity} ${unitLabel[item.unit]} x ${formatRupiah(item.price)}`, formatRupiah(item.subtotal), width),
      ...(item.notes ? [`Catatan: ${item.notes}`] : []),
    ]),
    divider(width),
    pair("Subtotal", formatRupiah(transaction.subtotal), width),
    ...(transaction.discount > 0 ? [pair("Diskon", formatRupiah(transaction.discount), width)] : []),
    ...(transaction.additionalFee > 0 ? [pair("Tambahan", formatRupiah(transaction.additionalFee), width)] : []),
    ...(transaction.tax > 0 ? [pair("Pajak", formatRupiah(transaction.tax), width)] : []),
    divider(width),
    pair("TOTAL", formatRupiah(transaction.grandTotal), width),
    pair("Dibayar", formatRupiah(transaction.paidAmount), width),
    pair("Kembali", formatRupiah(transaction.changeAmount), width),
    pair("Metode", transaction.payments[0] ? paymentMethodLabel[transaction.payments[0].paymentMethod] : "-", width),
    pair("Bayar", receiptPaymentStatus(transaction), width),
    pair("Estimasi", transaction.estimatedDoneAt ? formatDate(transaction.estimatedDoneAt, "dd MMM yyyy") : "-", width),
    ...(transaction.notes ? [`Catatan: ${transaction.notes}`] : []),
    divider(width),
    center("Terima kasih", width),
  ];

  return lines.map((line) => line.slice(0, width)).join("\n");
}

function center(value: string, width: number) {
  const text = value.trim();
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return `${" ".repeat(padding)}${text}`;
}

function divider(width: number) {
  return "-".repeat(width);
}

function pair(label: string, value: string, width: number) {
  const left = label.trim();
  const right = value.trim();
  const space = Math.max(1, width - left.length - right.length);
  return `${left}${" ".repeat(space)}${right}`;
}
