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
    setBluetoothStatus("Menghubungkan printer Bluetooth...");

    try {
      await writeEscposReceipt(bluetooth, buildEscposReceipt(transaction, settings));
      setBluetoothStatus("Perintah cetak Bluetooth sudah dikirim ke printer.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : (error as any)?.message || String(error);
      setBluetoothStatus(`Gagal: ${msg}`);
    } finally {
      setIsBluetoothPrinting(false);
    }
  }

  return (
    <div className="print-shell min-h-screen bg-slate-100 p-6">
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <Button onClick={printViaBluetooth} disabled={isBluetoothPrinting}>
          {isBluetoothPrinting ? "Mengirim..." : "Print Bluetooth"}
        </Button>
        <Button variant="outline" onClick={() => window.print()}>Print Biasa</Button>
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

export type BluetoothNavigator = Navigator & {
  bluetooth?: {
    requestDevice(options: {
      acceptAllDevices: boolean;
      optionalServices: BluetoothServiceUUID[];
    }): Promise<BluetoothDeviceLike>;
    getDevices?(): Promise<BluetoothDeviceLike[]>;
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



export async function writeEscposReceipt(bluetooth: NonNullable<BluetoothNavigator["bluetooth"]>, text: string) {
  const device = await getBluetoothDevice(bluetooth);
  const server = await device.gatt?.connect();
  if (!server) throw new Error("Printer Bluetooth tidak bisa dihubungkan.");

  try {
    const characteristic = await findWritableCharacteristic(server);
    const bytes = new Uint8Array([
      0x1b, 0x40,
      ...new TextEncoder().encode(text),
      0x0a, 0x0a, 0x0a,
    ]);

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    for (let start = 0; start < bytes.length; start += 100) {
      const chunk = bytes.slice(start, start + 100);
      if (characteristic.writeValueWithoutResponse && characteristic.properties.writeWithoutResponse) {
        await characteristic.writeValueWithoutResponse(chunk);
      } else {
        await characteristic.writeValue(chunk);
      }
      await delay(20);
    }
  } finally {
    server.disconnect?.();
  }
}

async function getBluetoothDevice(bluetooth: NonNullable<BluetoothNavigator["bluetooth"]>) {
  if (typeof bluetooth.getDevices === "function") {
    try {
      const permittedDevices = await bluetooth.getDevices();
      const permittedDevice = permittedDevices.find((device) => device.gatt);
      if (permittedDevice) return permittedDevice;
    } catch (e) {
      // Abaikan jika error di Bluefy
    }
  }

  return bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: thermalPrinterServices,
  });
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

export function buildEscposReceipt(transaction: Transaction, settings: StoreSettings) {
  return buildReceiptText(transaction, settings);
}

function buildReceiptText(transaction: Transaction, settings: StoreSettings, includeHeader = true) {
  // 58mm = 32 chars, 80mm = 48 chars
  const lineWidth = settings.receiptWidth === 80 ? 48 : 32;

  const sanitizeReceiptText = (value: string) => {
    return value.replace(/\xA0|&nbsp;/g, " ");
  };

  const formatLine = (left: string, right: string) => {
    let leftText = sanitizeReceiptText(left).trim();
    const rightText = sanitizeReceiptText(right).trim().slice(0, lineWidth - 1);
    let spaces = lineWidth - leftText.length - rightText.length;

    if (spaces < 1) {
      leftText = leftText.substring(0, Math.max(0, lineWidth - rightText.length - 1));
      spaces = lineWidth - leftText.length - rightText.length;
    }

    return `${leftText}${" ".repeat(spaces)}${rightText}`;
  };

  const wrapText = (value: string) => {
    const words = sanitizeReceiptText(value).trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [""];
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
      if (word.length > lineWidth) {
        if (current) lines.push(current);
        for (let index = 0; index < word.length; index += lineWidth) {
          lines.push(word.slice(index, index + lineWidth));
        }
        current = "";
        continue;
      }

      const next = current ? `${current} ${word}` : word;
      if (next.length <= lineWidth) current = next;
      else {
        lines.push(current);
        current = word;
      }
    }

    if (current) lines.push(current);
    return lines;
  };

  const divider = () => "-".repeat(lineWidth);

  let result = "";

  if (includeHeader) {
    // ESC a 1: Rata Tengah Bawaan Printer (Native Hardware Alignment)
    result += "\x1b\x61\x01"; 
    result += wrapText(settings.storeName).join("\n") + "\n";
    result += wrapText(settings.address).join("\n") + "\n";
    result += wrapText(`WA: ${settings.whatsapp}`).join("\n") + "\n";
    result += "\n";
    // ESC a 0: Rata Kiri Bawaan Printer
    result += "\x1b\x61\x00"; 
  }

  result += divider() + "\n";
  result += formatLine("No", transaction.transactionNumber) + "\n";
  result += formatLine("Tanggal", formatDate(transaction.createdAt)) + "\n";
  result += formatLine("Kasir", transaction.cashier.name) + "\n";
  result += formatLine("Pelanggan", transaction.customer.name) + "\n";
  result += formatLine("HP", transaction.customer.phone || "-") + "\n";
  result += "\n";
  result += divider() + "\n";

  for (const item of transaction.items) {
    result += wrapText(item.serviceName).join("\n") + "\n";
    result += formatLine(`${item.quantity} ${unitLabel[item.unit]} x ${formatRupiah(item.price)}`, formatRupiah(item.subtotal)) + "\n";
    if (item.notes) {
      result += wrapText(`Catatan: ${item.notes}`).join("\n") + "\n";
    }
  }

  result += "\n";
  result += divider() + "\n";
  result += formatLine("Subtotal", formatRupiah(transaction.subtotal)) + "\n";
  if (transaction.discount > 0) result += formatLine("Diskon", formatRupiah(transaction.discount)) + "\n";
  if (transaction.additionalFee > 0) result += formatLine("Tambahan", formatRupiah(transaction.additionalFee)) + "\n";
  if (transaction.tax > 0) result += formatLine("Pajak", formatRupiah(transaction.tax)) + "\n";
  
  result += "\n";
  result += divider() + "\n";
  result += formatLine("TOTAL", formatRupiah(transaction.grandTotal)) + "\n";
  result += formatLine("Dibayar", formatRupiah(transaction.paidAmount)) + "\n";
  result += formatLine("Kembali", formatRupiah(transaction.changeAmount)) + "\n";
  result += formatLine("Metode", transaction.payments[0] ? paymentMethodLabel[transaction.payments[0].paymentMethod] : "-") + "\n";
  result += formatLine("Bayar", receiptPaymentStatus(transaction)) + "\n";
  result += formatLine("Estimasi", transaction.estimatedDoneAt ? formatDate(transaction.estimatedDoneAt, "dd MMM yyyy") : "-") + "\n";
  if (transaction.notes) {
    result += wrapText(`Catatan: ${transaction.notes}`).join("\n") + "\n";
  }

  result += "\n";
  result += divider() + "\n";
  result += "\n";

  // ESC a 1: Rata Tengah Bawaan Printer
  result += "\x1b\x61\x01"; 
  result += wrapText("Terima kasih sudah menggunakan").join("\n") + "\n";
  result += wrapText("layanan kami.").join("\n") + "\n";
  // ESC a 0: Rata Kiri Bawaan Printer
  result += "\x1b\x61\x00"; 

  return result;
}
