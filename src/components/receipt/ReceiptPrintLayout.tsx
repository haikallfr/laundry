"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatDate, formatRupiah, laundryStatusLabel, paymentMethodLabel, paymentStatusLabel, unitLabel } from "@/lib/utils";
import type { StoreSettings, Transaction } from "@/types";

export function ReceiptPrintLayout({ transaction, settings }: { transaction: Transaction; settings: StoreSettings }) {
  const [width, setWidth] = useState<58 | 80>(settings.receiptWidth);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    if (search.get("autoprint") === "1") setTimeout(() => window.print(), 350);
  }, []);

  return (
    <div className="print-shell min-h-screen bg-slate-100 p-6">
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => window.print()}>Print Nota</Button>
        <Button variant="secondary" onClick={() => setWidth(58)}>58mm</Button>
        <Button variant="secondary" onClick={() => setWidth(80)}>80mm</Button>
      </div>
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
