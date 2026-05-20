"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatRupiah } from "@/lib/utils";
import type { PaymentMethod, Transaction } from "@/types";

export function TransactionPaymentActions({ transaction }: { transaction: Transaction }) {
  const router = useRouter();
  const outstanding = Math.max(0, transaction.grandTotal - transaction.paidAmount);
  const [amount, setAmount] = useState(outstanding);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [message, setMessage] = useState("");

  async function addPayment(event: React.FormEvent) {
    event.preventDefault();
    await fetch(`/api/transactions/${transaction.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethod: method, amount, referenceNumber, createdBy: transaction.cashierId })
    });
    setMessage("Pembayaran berhasil ditambahkan.");
    router.refresh();
  }

  async function cancelTransaction() {
    await fetch(`/api/transactions/${transaction.id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: cancelReason || "Dibatalkan dari halaman detail" })
    });
    setMessage("Transaksi berhasil dibatalkan.");
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-subtle">
      <h2 className="text-base font-bold">Pembayaran dan Pembatalan</h2>
      <p className="mt-1 text-sm text-muted">Sisa tagihan: <strong className="text-ink">{formatRupiah(outstanding)}</strong></p>
      <form onSubmit={addPayment} className="mt-3 grid gap-3 md:grid-cols-4">
        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="h-10 rounded-lg border border-line px-3 text-sm" placeholder="Nominal" />
        <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="h-10 rounded-lg border border-line px-3 text-sm">
          <option value="CASH">Cash</option><option value="QRIS">QRIS</option><option value="BANK_TRANSFER">Transfer</option><option value="EWALLET">E-wallet</option><option value="SPLIT">Split</option>
        </select>
        <input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className="h-10 rounded-lg border border-line px-3 text-sm" placeholder="Ref opsional" />
        <Button disabled={amount <= 0}>Tambah pembayaran</Button>
      </form>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="h-10 rounded-lg border border-line px-3 text-sm" placeholder="Alasan batal" />
        <Button variant="danger" onClick={cancelTransaction}>Batalkan transaksi</Button>
      </div>
      {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
    </section>
  );
}
