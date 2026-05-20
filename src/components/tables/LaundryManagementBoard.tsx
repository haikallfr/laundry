"use client";

import Link from "next/link";
import { Banknote, CreditCard, Filter, MessageCircle, Printer, RotateCw, Search, Shirt, Timer, Truck, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { formatDate, formatRupiah, laundryStatusLabel, paymentStatusLabel, unitLabel } from "@/lib/utils";
import type { LaundryStatus, PaymentMethod, PaymentStatus, Transaction } from "@/types";

const statusGroups: Array<{ status: LaundryStatus; title: string; icon: typeof Timer; tone: string }> = [
  { status: "NEW", title: "Baru Masuk", icon: Timer, tone: "bg-amber-50 text-amber-700" },
  { status: "PROCESSING", title: "Diproses", icon: RotateCw, tone: "bg-blue-50 text-blue-700" },
  { status: "READY_FOR_PICKUP", title: "Siap Diambil", icon: Truck, tone: "bg-teal-50 text-teal-700" }
];

const nextStatus: Record<LaundryStatus, LaundryStatus | null> = {
  NEW: "PROCESSING",
  PROCESSING: "READY_FOR_PICKUP",
  DONE: "READY_FOR_PICKUP",
  READY_FOR_PICKUP: "PICKED_UP",
  PICKED_UP: null,
  CANCELLED: null
};

const activeStatuses: LaundryStatus[] = ["NEW", "PROCESSING", "READY_FOR_PICKUP"];
type PeriodFilter = "3d" | "today" | "7d" | "month" | "all";

export function LaundryManagementBoard({ transactions }: { transactions: Transaction[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState("");
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("3d");
  const [status, setStatus] = useState<LaundryStatus | "">("");
  const [mobileStatus, setMobileStatus] = useState<LaundryStatus>("NEW");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "">("");
  const [pickupPayment, setPickupPayment] = useState<Transaction | null>(null);
  const [pickupAmount, setPickupAmount] = useState(0);
  const [pickupMethod, setPickupMethod] = useState<PaymentMethod>("CASH");
  const [pickupReference, setPickupReference] = useState("");
  const [error, setError] = useState("");
  const periodRange = useMemo(() => resolvePeriodRange(period, transactions), [period, transactions]);
  const activeTransactions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions
      .filter((trx) => activeStatuses.includes(trx.laundryStatus))
      .filter((trx) => !status || trx.laundryStatus === status)
      .filter((trx) => !paymentStatus || trx.paymentStatus === paymentStatus)
      .filter((trx) => inRange(trx.createdAt, periodRange.start, periodRange.end))
      .filter((trx) => !q || [trx.transactionNumber, trx.customer.name, trx.customer.phone, trx.cashier.name].some((value) => (value ?? "").toLowerCase().includes(q)))
      .sort(sortByWorkPriority);
  }, [paymentStatus, periodRange, query, status, transactions]);
  const visibleTotal = activeTransactions.reduce((sum, trx) => sum + trx.grandTotal, 0);
  const mobileRows = activeTransactions.filter((trx) => trx.laundryStatus === mobileStatus);

  async function updateStatus(transactionId: string, status: LaundryStatus) {
    const transaction = transactions.find((item) => item.id === transactionId);
    if (status === "PICKED_UP" && transaction && transaction.paymentStatus !== "PAID") {
      const remaining = Math.max(0, transaction.grandTotal - transaction.paidAmount);
      setPickupPayment(transaction);
      setPickupAmount(remaining);
      setPickupMethod("CASH");
      setPickupReference("");
      setError("");
      return;
    }

    setSaving(transactionId);
    setError("");
    const response = await fetch(`/api/transactions/${transactionId}/laundry-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ laundryStatus: status })
    });
    setSaving("");
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setError(result?.error || "Gagal mengubah status laundry.");
      return;
    }
    router.refresh();
  }

  async function completePickupWithPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!pickupPayment) return;
    const remaining = Math.max(0, pickupPayment.grandTotal - pickupPayment.paidAmount);
    if (pickupAmount < remaining) {
      setError(`Nominal pelunasan minimal ${formatRupiah(remaining)}.`);
      return;
    }

    setSaving(pickupPayment.id);
    setError("");
    const paymentResponse = await fetch(`/api/transactions/${pickupPayment.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentMethod: pickupMethod,
        amount: pickupAmount,
        referenceNumber: pickupReference,
        notes: "Pelunasan saat pengambilan laundry",
        createdBy: pickupPayment.cashierId
      })
    });

    if (!paymentResponse.ok) {
      const result = await paymentResponse.json().catch(() => null);
      setSaving("");
      setError(result?.error || "Gagal menyimpan pembayaran.");
      return;
    }

    const statusResponse = await fetch(`/api/transactions/${pickupPayment.id}/laundry-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ laundryStatus: "PICKED_UP" })
    });

    setSaving("");
    if (!statusResponse.ok) {
      const result = await statusResponse.json().catch(() => null);
      setError(result?.error || "Pembayaran tersimpan, tetapi status belum berhasil diubah.");
      router.refresh();
      return;
    }

    setPickupPayment(null);
    router.refresh();
  }

  function sendReadyReminder(transaction: Transaction) {
    const url = getReadyReminderUrl(transaction);
    if (!url) {
      window.alert("Nomor HP pelanggan belum diisi, reminder WhatsApp tidak bisa dikirim.");
      return;
    }
    window.location.href = url;
  }

  function getReadyReminderUrl(transaction: Transaction) {
    if (!transaction.customer.phone.trim()) return "";
    const phone = transaction.customer.phone.replace(/\D/g, "").replace(/^0/, "62");
    const remaining = Math.max(0, transaction.grandTotal - transaction.paidAmount);
    const paymentLines = transaction.paymentStatus === "PAID"
      ? [`Status bayar: ${paymentStatusLabel[transaction.paymentStatus]}`]
      : [
          `Status bayar: ${paymentStatusLabel[transaction.paymentStatus]}`,
          `Sudah dibayar: ${formatRupiah(transaction.paidAmount)}`,
          `Sisa pembayaran: ${formatRupiah(remaining)}`
        ];
    const closingLine = transaction.paymentStatus === "PAID"
      ? "Silakan datang ke toko untuk mengambil laundry Anda."
      : "Silakan datang ke toko untuk mengambil laundry dan melakukan pelunasan.";
    const message = [
      `Halo ${transaction.customer.name}, laundry Anda sudah siap diambil.`,
      "",
      `No nota: ${transaction.transactionNumber}`,
      `Status: ${laundryStatusLabel[transaction.laundryStatus]}`,
      `Total: ${formatRupiah(transaction.grandTotal)}`,
      ...paymentLines,
      "",
      closingLine,
      "Terima kasih."
    ].join("\n");
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}
      <section className="rounded-lg border border-line bg-white p-3 shadow-subtle sm:p-4">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-xl font-black text-ink sm:text-2xl">Kelola Laundry</h1>
          </div>
          <div className="grid grid-cols-3 gap-2 xl:w-[560px]">
            <div className="rounded-lg bg-slate-50 p-2 sm:p-3">
              <p className="text-xs font-semibold text-muted">Transaksi tampil</p>
              <p className="mt-1 text-base font-black text-ink sm:text-xl">{activeTransactions.length}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2 sm:p-3">
              <p className="text-xs font-semibold text-muted">Total nominal</p>
              <p className="mt-1 truncate text-sm font-black text-ink sm:text-lg">{formatRupiah(visibleTotal)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2 sm:p-3">
              <p className="text-xs font-semibold text-muted">Periode</p>
              <p className="mt-1 text-xs font-black text-ink sm:text-sm">{formatDate(periodRange.start, "dd MMM")} - {formatDate(periodRange.end, "dd MMM")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-3 shadow-subtle sm:p-4">
        <div className="mb-2 flex items-center gap-2 sm:mb-3">
          <Filter className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-black text-ink">Filter operasional</h2>
        </div>
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]">
          <div className="relative col-span-4 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 w-full rounded-lg border border-line bg-slate-50 pl-10 pr-3 text-xs outline-none focus:border-brand-500 focus:bg-white sm:h-10 sm:text-sm" placeholder="Cari nota, pelanggan, nomor HP" />
          </div>
          <select value={period} onChange={(event) => setPeriod(event.target.value as PeriodFilter)} className="h-9 min-w-0 rounded-lg border border-line px-1.5 text-[11px] outline-none focus:border-brand-500 sm:h-10 sm:px-3 sm:text-sm">
            <option value="3d">3 hari</option>
            <option value="today">Hari ini</option>
            <option value="7d">7 hari</option>
            <option value="month">Bulan</option>
            <option value="all">Semua</option>
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value as LaundryStatus | "")} className="h-9 min-w-0 rounded-lg border border-line px-1.5 text-[11px] outline-none focus:border-brand-500 sm:h-10 sm:px-3 sm:text-sm">
            <option value="">Status</option>
            <option value="NEW">Baru</option>
            <option value="PROCESSING">Proses</option>
            <option value="READY_FOR_PICKUP">Ambil</option>
          </select>
          <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus | "")} className="h-9 min-w-0 rounded-lg border border-line px-1.5 text-[11px] outline-none focus:border-brand-500 sm:h-10 sm:px-3 sm:text-sm">
            <option value="">Bayar</option>
            <option value="UNPAID">Belum</option>
            <option value="PARTIAL">DP</option>
            <option value="PAID">Lunas</option>
          </select>
          <Button variant="secondary" className="h-9 min-w-0 whitespace-nowrap px-1.5 text-[11px] sm:h-10 sm:px-3 sm:text-sm" onClick={() => { setQuery(""); setPeriod("3d"); setStatus(""); setPaymentStatus(""); }}>Reset</Button>
        </div>
      </section>

      <section className="md:hidden">
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-line bg-white p-2 shadow-subtle">
          {statusGroups.map(({ status, title, icon: Icon, tone }) => {
            const count = activeTransactions.filter((trx) => trx.laundryStatus === status).length;
            const active = mobileStatus === status;
            return (
              <button key={status} type="button" onClick={() => setMobileStatus(status)} className={`relative min-w-0 rounded-lg border px-2 py-2 text-left transition ${active ? "border-brand-600 bg-brand-50" : "border-line bg-white"}`}>
                <div className="flex items-center gap-1.5">
                  <span className={`shrink-0 rounded-md p-1 ${tone}`}><Icon className="h-3.5 w-3.5" /></span>
                  <span className={`truncate text-[11px] font-black ${active ? "text-brand-700" : "text-ink"}`}>{title}</span>
                </div>
                <span className={`absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black ${count ? "bg-red-600 text-white" : "bg-slate-200 text-muted"}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 space-y-3">
          {mobileRows.map((trx) => {
            const target = nextStatus[trx.laundryStatus];
            const reminderUrl = trx.laundryStatus === "READY_FOR_PICKUP" ? getReadyReminderUrl(trx) : "";
            const needsPayment = trx.paymentStatus === "UNPAID" || trx.paymentStatus === "PARTIAL";
            return (
              <article key={trx.id} className="rounded-lg border border-line bg-white p-3 shadow-subtle">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/transactions/${trx.id}`} className="block truncate text-sm font-black text-brand-700 hover:underline">{trx.transactionNumber}</Link>
                    <p className="mt-1 truncate text-lg font-black text-ink">{trx.customer.name}</p>
                    <p className="truncate text-sm text-muted">{trx.customer.phone || "Tanpa HP"}</p>
                  </div>
                  <div className="min-w-[116px] shrink-0 text-right text-xs font-bold leading-snug text-muted">
                    <p>Diterima: {formatDate(trx.createdAt, "dd MMM")}</p>
                    <p>Estimasi: {formatEstimate(trx)}</p>
                    <p className="mt-1 truncate text-sm font-semibold leading-tight text-ink">{serviceSummary(trx)}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="flex items-center gap-1.5 text-muted"><Banknote className="h-4 w-4" />Total</div>
                    <strong className="mt-1 block text-ink">{formatRupiah(trx.grandTotal)}</strong>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="flex items-center gap-1.5 text-muted">
                      <span>Pembayaran</span>
                      {needsPayment ? <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-600 shadow-[0_0_0_3px_rgba(220,38,38,0.14)]" aria-label="Belum lunas" /> : null}
                    </div>
                    <strong className={`mt-1 block truncate ${needsPayment ? "text-red-700" : "text-ink"}`}>{paymentDisplayLabel(trx)}</strong>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {target ? (
                    <Button size="sm" disabled={saving === trx.id} onClick={() => updateStatus(trx.id, target)}>
                      {saving === trx.id ? "Menyimpan..." : compactActionLabel(target)}
                    </Button>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2">
                    <Link href={`/transactions/${trx.id}`}><Button className="w-full" variant="secondary" size="sm">Detail</Button></Link>
                    <Link href={`/print/receipt/${trx.id}`} target="_blank"><Button className="w-full" variant="secondary" size="sm"><Printer className="h-4 w-4" />Nota</Button></Link>
                  </div>
                  {trx.laundryStatus === "READY_FOR_PICKUP" ? (
                    reminderUrl ? (
                      <a href={reminderUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:bg-slate-50">
                        <MessageCircle className="h-4 w-4" />WA Reminder
                      </a>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => sendReadyReminder(trx)}>
                        <MessageCircle className="h-4 w-4" />WA Reminder
                      </Button>
                    )
                  ) : null}
                </div>
              </article>
            );
          })}
          {mobileRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line bg-white p-6 text-center shadow-subtle">
              <Shirt className="mx-auto h-7 w-7 text-muted" />
              <p className="mt-2 text-sm font-bold text-ink">Kosong</p>
              <p className="text-xs text-muted">Tidak ada cucian di status ini.</p>
            </div>
          ) : null}
        </div>
      </section>

      <div className="hidden grid-cols-3 items-start gap-3 md:grid xl:gap-4">
        {statusGroups.map(({ status, title, icon: Icon, tone }) => {
          const rows = activeTransactions.filter((trx) => trx.laundryStatus === status);
          return (
            <section key={status} className="min-w-0 rounded-lg border border-line bg-white p-1.5 shadow-subtle sm:p-3 xl:p-4">
              <div className="flex min-w-0 flex-col gap-1.5 border-b border-line pb-1.5 sm:flex-row sm:items-center sm:justify-between sm:pb-3">
                <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                  <span className={`shrink-0 rounded-md p-1 sm:rounded-lg sm:p-2 ${tone}`}><Icon className="h-3 w-3 sm:h-4 sm:w-4" /></span>
                  <div className="min-w-0">
                    <h2 className="truncate text-[10px] font-black leading-tight text-ink min-[390px]:text-[11px] sm:text-sm xl:text-base">{title}</h2>
                    <p className="text-[10px] text-muted sm:text-xs">{rows.length} trx</p>
                  </div>
                </div>
                <span className="hidden rounded-lg bg-slate-50 px-2.5 py-1 text-sm font-black text-ink sm:inline-flex">{rows.length}</span>
              </div>
              <div className="mt-1.5 space-y-1.5 sm:mt-3 sm:space-y-3">
                {rows.map((trx) => {
                  const target = nextStatus[trx.laundryStatus];
                  const reminderUrl = trx.laundryStatus === "READY_FOR_PICKUP" ? getReadyReminderUrl(trx) : "";
                  const needsPayment = trx.paymentStatus === "UNPAID" || trx.paymentStatus === "PARTIAL";
                  return (
                    <article key={trx.id} className="min-w-0 rounded-lg border border-line bg-slate-50 p-1.5 transition hover:border-brand-200 hover:bg-white sm:p-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <div className="min-w-0">
                          <Link href={`/transactions/${trx.id}`} className="block truncate text-[10px] font-black text-brand-700 hover:underline sm:text-xs xl:text-sm">{trx.transactionNumber}</Link>
                          <p className="mt-0.5 truncate text-[11px] font-black leading-tight text-ink sm:mt-1 sm:text-sm xl:text-base">{trx.customer.name}</p>
                          <p className="hidden truncate text-[10px] text-muted sm:block sm:text-xs">{trx.customer.phone || "Tanpa HP"}</p>
                        </div>
                        <div className="min-w-0 text-[9px] font-bold leading-tight text-muted sm:text-[10px] xl:text-xs">
                          <p className="whitespace-nowrap">Diterima: {formatDate(trx.createdAt, "dd MMM")}</p>
                          <p className="truncate">Estimasi: {formatEstimate(trx)}</p>
                          <p className="mt-0.5 truncate text-[10px] font-semibold leading-tight text-ink sm:text-xs">{serviceSummary(trx)}</p>
                        </div>
                      </div>
                      <div className="mt-1.5 grid grid-cols-1 gap-1 text-[10px] sm:mt-3 sm:gap-2 sm:text-xs xl:grid-cols-2">
                        <div className="min-w-0 rounded-md bg-white px-1.5 py-1 sm:rounded-lg sm:p-2">
                          <div className="flex items-center gap-1 text-muted"><Banknote className="h-3 w-3 sm:h-3.5 sm:w-3.5" />Total</div>
                          <strong className="block truncate text-[10px] text-ink min-[390px]:text-[11px] sm:mt-1 sm:text-xs xl:text-sm">{formatRupiah(trx.grandTotal)}</strong>
                        </div>
                        <div className="min-w-0 rounded-md bg-white px-1.5 py-1 sm:rounded-lg sm:p-2">
                          <div className="flex items-center gap-1.5 text-muted">
                            <span>Pembayaran</span>
                            {needsPayment ? <span className="h-2 w-2 shrink-0 rounded-full bg-red-600 shadow-[0_0_0_3px_rgba(220,38,38,0.14)] sm:h-2.5 sm:w-2.5" aria-label="Belum lunas" /> : null}
                          </div>
                          <strong className={`block truncate text-[10px] min-[390px]:text-[11px] sm:mt-1 sm:text-xs xl:text-sm ${needsPayment ? "text-red-700" : "text-ink"}`}>{paymentDisplayLabel(trx)}</strong>
                        </div>
                      </div>
                      <div className="mt-1.5 flex flex-col gap-1 sm:mt-3 sm:gap-2">
                        {target ? (
                          <Button className="h-7 px-1 text-[10px] leading-tight sm:h-9 sm:px-2 sm:text-xs xl:text-sm" size="sm" disabled={saving === trx.id} onClick={() => updateStatus(trx.id, target)}>
                            {saving === trx.id ? "Simpan..." : compactActionLabel(target)}
                          </Button>
                        ) : null}
                        <div className="grid grid-cols-2 gap-1 sm:gap-2">
                          <Link className="min-w-0" href={`/transactions/${trx.id}`}><Button className="h-7 w-full px-1 text-[10px] sm:h-9 sm:px-2 sm:text-xs xl:text-sm" variant="secondary" size="sm">Detail</Button></Link>
                          <Link className="min-w-0" href={`/print/receipt/${trx.id}`} target="_blank"><Button className="h-7 w-full gap-0.5 px-1 text-[10px] sm:h-9 sm:gap-1 sm:px-2 sm:text-xs xl:text-sm" variant="secondary" size="sm"><Printer className="h-3 w-3 sm:h-4 sm:w-4" /><span>Nota</span></Button></Link>
                        </div>
                        {trx.laundryStatus === "READY_FOR_PICKUP" ? (
                          reminderUrl ? (
                            <a href={reminderUrl} target="_blank" rel="noreferrer" className="inline-flex h-7 min-w-0 items-center justify-center gap-1 rounded-lg border border-line bg-white px-1 text-[10px] font-semibold leading-tight text-ink transition hover:bg-slate-50 sm:h-9 sm:gap-2 sm:px-2 sm:text-xs xl:text-sm">
                              <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" /><span className="truncate">WA</span><span className="hidden xl:inline">Reminder</span>
                            </a>
                          ) : (
                            <Button className="h-7 px-1 text-[10px] sm:h-9 sm:px-2 sm:text-xs xl:text-sm" variant="secondary" size="sm" onClick={() => sendReadyReminder(trx)}>
                              <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />WA
                            </Button>
                          )
                        ) : null}
                      </div>
                    </article>
                  );
                })}
                {rows.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-line bg-slate-50 p-2 text-center sm:p-5">
                    <Shirt className="mx-auto h-5 w-5 text-muted sm:h-7 sm:w-7" />
                    <p className="mt-1 text-[11px] font-bold text-ink sm:mt-2 sm:text-sm">Kosong</p>
                    <p className="text-[10px] text-muted sm:text-xs">Tidak ada cucian.</p>
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
      {pickupPayment ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-3 sm:items-center">
          <form onSubmit={completePickupWithPayment} className="w-full max-w-lg rounded-xl border border-line bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
              <div>
                <h2 className="text-lg font-black text-ink">Pelunasan Pengambilan</h2>
                <p className="text-sm text-muted">Transaksi harus lunas sebelum ditandai sudah diambil.</p>
              </div>
              <button type="button" className="rounded-lg p-1 text-muted hover:bg-slate-100 hover:text-ink" onClick={() => setPickupPayment(null)} aria-label="Tutup modal">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">No nota</span>
                <strong className="text-right text-ink">{pickupPayment.transactionNumber}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Pelanggan</span>
                <strong className="text-right text-ink">{pickupPayment.customer.name}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Total</span>
                <strong className="text-right text-ink">{formatRupiah(pickupPayment.grandTotal)}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Sudah dibayar</span>
                <strong className="text-right text-ink">{formatRupiah(pickupPayment.paidAmount)}</strong>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                <span className="font-bold text-muted">Sisa pelunasan</span>
                <strong className="text-right text-lg text-ink">{formatRupiah(Math.max(0, pickupPayment.grandTotal - pickupPayment.paidAmount))}</strong>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]">
              <label className="grid gap-1 text-sm font-semibold text-ink">
                Nominal bayar
                <input type="number" min={Math.max(0, pickupPayment.grandTotal - pickupPayment.paidAmount)} value={pickupAmount || ""} onChange={(event) => setPickupAmount(Number(event.target.value))} className="h-10 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand-500" placeholder="Nominal pelunasan" />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-ink">
                Metode
                <select value={pickupMethod} onChange={(event) => setPickupMethod(event.target.value as PaymentMethod)} className="h-10 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand-500">
                  <option value="CASH">Cash</option>
                  <option value="QRIS">QRIS</option>
                  <option value="BANK_TRANSFER">Transfer</option>
                  <option value="EWALLET">E-wallet</option>
                  <option value="SPLIT">Split</option>
                </select>
              </label>
            </div>
            <label className="mt-3 grid gap-1 text-sm font-semibold text-ink">
              Referensi opsional
              <input value={pickupReference} onChange={(event) => setPickupReference(event.target.value)} className="h-10 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand-500" placeholder="No referensi transfer/QRIS" />
            </label>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setPickupPayment(null)}>Batal</Button>
              <Button disabled={saving === pickupPayment.id || pickupAmount <= 0}>
                <CreditCard className="h-4 w-4" />{saving === pickupPayment.id ? "Menyimpan..." : "Lunasi & Tandai Diambil"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function compactActionLabel(status: LaundryStatus) {
  if (status === "PROCESSING") return "Proses";
  if (status === "READY_FOR_PICKUP") return "Siap";
  if (status === "PICKED_UP") return "Diambil";
  return laundryStatusLabel[status];
}

function paymentDisplayLabel(transaction: Transaction) {
  if (transaction.paymentStatus === "PARTIAL") return `DP: ${formatRupiah(transaction.paidAmount)}`;
  return paymentStatusLabel[transaction.paymentStatus];
}

function serviceSummary(transaction: Transaction) {
  const [first, second] = transaction.items;
  if (!first) return "Tanpa layanan";
  const firstLabel = `${first.serviceName} ${first.quantity} ${unitLabel[first.unit]}`;
  if (!second) return firstLabel;
  return `${firstLabel} +${transaction.items.length - 1} layanan`;
}

function formatEstimate(transaction: Transaction) {
  if (!transaction.estimatedDoneAt) return "-";
  const createdAt = new Date(transaction.createdAt);
  const estimatedAt = new Date(transaction.estimatedDoneAt);
  const sameDay = createdAt.toDateString() === estimatedAt.toDateString();
  return formatDate(estimatedAt, sameDay ? "dd MMM, HH:mm" : "dd MMM");
}

function resolvePeriodRange(period: PeriodFilter, transactions: Transaction[]) {
  const newestDate = transactions.length ? new Date(Math.max(...transactions.map((trx) => new Date(trx.createdAt).getTime()))) : new Date();
  const end = new Date(newestDate);
  end.setHours(23, 59, 59, 999);

  if (period === "all") {
    const oldestDate = transactions.length ? new Date(Math.min(...transactions.map((trx) => new Date(trx.createdAt).getTime()))) : new Date();
    oldestDate.setHours(0, 0, 0, 0);
    return { start: oldestDate, end };
  }

  if (period === "today") {
    const start = new Date(end);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  if (period === "month") {
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  const days = period === "7d" ? 7 : 3;
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function inRange(date: string, start: Date, end: Date) {
  const value = new Date(date).getTime();
  return value >= start.getTime() && value <= end.getTime();
}

function sortByWorkPriority(a: Transaction, b: Transaction) {
  const estimatedA = a.estimatedDoneAt ? new Date(a.estimatedDoneAt).getTime() : Number.MAX_SAFE_INTEGER;
  const estimatedB = b.estimatedDoneAt ? new Date(b.estimatedDoneAt).getTime() : Number.MAX_SAFE_INTEGER;
  if (estimatedA !== estimatedB) return estimatedA - estimatedB;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}
