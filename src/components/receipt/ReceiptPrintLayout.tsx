"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import strukLogo from "@/image/struk.png";
import { formatDate, formatRupiah, paymentMethodLabel, paymentStatusLabel, unitLabel } from "@/lib/utils";
import type { StoreSettings, Transaction } from "@/types";

export function ReceiptPrintLayout({ transaction, settings }: { transaction: Transaction; settings: StoreSettings }) {
  const [width, setWidth] = useState<58 | 80>(settings.receiptWidth);
  const [bluetoothStatus, setBluetoothStatus] = useState("");
  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState(false);

  async function printViaBluetooth() {
    setBluetoothStatus("");
    const bluetooth = (navigator as BluetoothNavigator).bluetooth;
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (!bluetooth) {
      setBluetoothStatus(
        isIos
          ? "Bluetooth langsung tidak tersedia di browser iPhone. Pakai Android/Windows untuk Bluetooth langsung."
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
        <Button onClick={printViaBluetooth} disabled={isBluetoothPrinting}>
          {isBluetoothPrinting ? "Mengirim..." : "Print Nota"}
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
    <div className="receipt-paper shadow-soft" data-width={width}>
      <div className="receipt-print-header">
        <div className="receipt-print-header-text">
          <div className="receipt-store-name">{settings.storeName}</div>
          <div>{settings.address}</div>
          <div>WA: {settings.whatsapp}</div>
        </div>
        <img className="receipt-print-logo" src={strukLogo.src} alt="" aria-hidden="true" />
      </div>
      <ReceiptHtmlBody transaction={transaction} />
    </div>
  );
}

function ReceiptHtmlBody({ transaction }: { transaction: Transaction }) {
  return (
    <div className="receipt-html-body">
      <ReceiptDivider />
      <ReceiptRow label="No" value={transaction.transactionNumber} />
      <ReceiptRow label="Tanggal" value={formatDate(transaction.createdAt)} />
      <ReceiptRow label="Kasir" value={transaction.cashier.name} />
      <ReceiptRow label="Pelanggan" value={transaction.customer.name} />
      <ReceiptRow label="HP" value={transaction.customer.phone || "-"} />

      <ReceiptDivider />
      {transaction.items.map((item, index) => (
        <div key={`${item.serviceId}-${index}`} className="receipt-item">
          <div className="receipt-item-name">{item.serviceName}</div>
          <ReceiptRow label={`${item.quantity} ${unitLabel[item.unit]} x ${formatRupiah(item.price)}`} value={formatRupiah(item.subtotal)} />
          {item.notes ? <div className="receipt-note">Catatan: {item.notes}</div> : null}
        </div>
      ))}

      <ReceiptDivider />
      <ReceiptRow label="Subtotal" value={formatRupiah(transaction.subtotal)} />
      {transaction.discount > 0 ? <ReceiptRow label="Diskon" value={formatRupiah(transaction.discount)} /> : null}
      {transaction.additionalFee > 0 ? <ReceiptRow label="Tambahan" value={formatRupiah(transaction.additionalFee)} /> : null}
      {transaction.tax > 0 ? <ReceiptRow label="Pajak" value={formatRupiah(transaction.tax)} /> : null}

      <ReceiptDivider />
      <ReceiptRow label="TOTAL" value={formatRupiah(transaction.grandTotal)} strong />
      <ReceiptRow label="Dibayar" value={formatRupiah(transaction.paidAmount)} />
      <ReceiptRow label="Kembali" value={formatRupiah(transaction.changeAmount)} />
      <ReceiptRow label="Metode" value={transaction.payments[0] ? paymentMethodLabel[transaction.payments[0].paymentMethod] : "-"} />
      <ReceiptRow label="Bayar" value={receiptPaymentStatus(transaction)} />
      <ReceiptRow label="Estimasi" value={transaction.estimatedDoneAt ? formatDate(transaction.estimatedDoneAt, "dd MMM yyyy") : "-"} />
      {transaction.notes ? <div className="receipt-note">Catatan: {transaction.notes}</div> : null}

      <ReceiptDivider />
      <div className="receipt-footer">
        <div>Terima kasih sudah menggunakan</div>
        <div>layanan kami.</div>
      </div>
    </div>
  );
}

function ReceiptDivider() {
  return <div className="receipt-divider" />;
}

function ReceiptRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "receipt-html-row receipt-html-row-strong" : "receipt-html-row"}>
      <span className="receipt-html-label">{label}</span>
      <span className="receipt-html-value">{value}</span>
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

const receiptLineWidth: Record<58 | 80, number> = {
  58: 35,
  80: 42,
};

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
  return buildReceiptText(transaction, settings, settings.receiptWidth);
}

function buildReceiptText(transaction: Transaction, settings: StoreSettings, paperWidth: 58 | 80, includeHeader = true) {
  const width = receiptLineWidth[paperWidth];
  const lines = [
    ...(includeHeader ? [
      ...centerLines(settings.storeName, width),
      ...centerLines(settings.address, width),
      ...centerLines(`WA: ${settings.whatsapp}`, width),
      ""
    ] : []),
    divider(width),
    ...pairLines("No", transaction.transactionNumber, width),
    ...pairLines("Tanggal", formatDate(transaction.createdAt), width),
    ...pairLines("Kasir", transaction.cashier.name, width),
    ...pairLines("Pelanggan", transaction.customer.name, width),
    ...pairLines("HP", transaction.customer.phone || "-", width),
    "",
    divider(width),
    ...transaction.items.flatMap((item) => [
      ...wrapText(item.serviceName, width),
      ...pairLines(`${item.quantity} ${unitLabel[item.unit]} x ${formatRupiah(item.price)}`, formatRupiah(item.subtotal), width),
      ...(item.notes ? wrapText(`Catatan: ${item.notes}`, width) : []),
    ]),
    "",
    divider(width),
    ...pairLines("Subtotal", formatRupiah(transaction.subtotal), width),
    ...(transaction.discount > 0 ? pairLines("Diskon", formatRupiah(transaction.discount), width) : []),
    ...(transaction.additionalFee > 0 ? pairLines("Tambahan", formatRupiah(transaction.additionalFee), width) : []),
    ...(transaction.tax > 0 ? pairLines("Pajak", formatRupiah(transaction.tax), width) : []),
    "",
    divider(width),
    ...pairLines("TOTAL", formatRupiah(transaction.grandTotal), width),
    ...pairLines("Dibayar", formatRupiah(transaction.paidAmount), width),
    ...pairLines("Kembali", formatRupiah(transaction.changeAmount), width),
    ...pairLines("Metode", transaction.payments[0] ? paymentMethodLabel[transaction.payments[0].paymentMethod] : "-", width),
    ...pairLines("Bayar", receiptPaymentStatus(transaction), width),
    ...pairLines("Estimasi", transaction.estimatedDoneAt ? formatDate(transaction.estimatedDoneAt, "dd MMM yyyy") : "-", width),
    ...(transaction.notes ? wrapText(`Catatan: ${transaction.notes}`, width) : []),
    "",
    divider(width),
    "",
    ...centerLines("Terima kasih sudah menggunakan", width),
    ...centerLines("layanan kami.", width),
  ];

  return `${lines.join("\n")}\n`;
}

function centerLines(value: string, width: number) {
  return wrapText(value, width).map((text) => {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return `${" ".repeat(padding)}${text}`;
  });
}

function wrapText(value: string, width: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.length > width) {
      if (current) lines.push(current);
      for (let index = 0; index < word.length; index += width) {
        lines.push(word.slice(index, index + width));
      }
      current = "";
      continue;
    }

    const next = current ? `${current} ${word}` : word;
    if (next.length <= width) current = next;
    else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function right(value: string, width: number) {
  const text = value.trim().slice(0, width);
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return `${" ".repeat(width - text.length)}${text}`;
}

function divider(width: number) {
  return "-".repeat(width);
}

function pairLines(label: string, value: string, width: number) {
  const left = label.trim();
  const right = value.trim();
  if (!right) return wrapText(left, width);

  if (left.length + right.length + 1 <= width) {
    return [`${left}${" ".repeat(width - left.length - right.length)}${right}`];
  }

  return [
    ...wrapText(left, width),
    ...wrapText(right, width).map((line) => rightPadLine(line, width))
  ];
}

function rightPadLine(value: string, width: number) {
  return right(value, width);
}
