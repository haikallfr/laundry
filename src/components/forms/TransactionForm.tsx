"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, MessageCircle, Plus, Printer, QrCode, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDate, formatRupiah, generateTransactionNumber, laundryStatusLabel, paymentMethodLabel, paymentStatusFromPaid, paymentStatusLabel, unitLabel } from "@/lib/utils";
import type { Customer, LaundryService, PaymentMethod, StoreSettings, Transaction, TransactionItem, User } from "@/types";

type DraftItem = TransactionItem;
type DraftCustomer = Customer;
type PaymentChoice = PaymentMethod | "UNPAID";

const emptyCustomer = (): DraftCustomer => ({
  id: `cus-${Date.now()}`,
  name: "",
  phone: "",
  address: "",
  notes: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

function paymentChoiceLabel(choice: PaymentChoice) {
  if (choice === "UNPAID") return "Belum lunas";
  return paymentMethodLabel[choice];
}

export function CustomerSearch({ customers, onPick }: { customers: Customer[]; onPick: (customer: Customer) => void }) {
  const [query, setQuery] = useState("");
  const matches = customers.filter((customer) => `${customer.name} ${customer.phone ?? ""}`.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
  return (
    <div className="relative">
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted" />
      <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-lg border border-line pl-10 pr-3 text-sm outline-none focus:border-brand-500" placeholder="Cari nomor HP atau nama pelanggan" />
      {query && matches.length > 0 ? (
        <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-lg border border-line bg-white shadow-soft">
          {matches.map((customer) => (
            <button key={customer.id} type="button" onClick={() => { onPick(customer); setQuery(""); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
              <strong>{customer.name}</strong><span className="ml-2 text-muted">{customer.phone || "Tanpa HP"}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ServiceSelector({ services, onAdd }: { services: LaundryService[]; onAdd: (service: LaundryService) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {services.filter((service) => service.isActive).map((service) => (
        <button key={service.id} type="button" onClick={() => onAdd(service)} className="rounded-lg border border-line bg-white p-3 text-left shadow-subtle transition hover:border-brand-500 hover:bg-brand-50">
          <div className="text-sm font-bold text-ink">{service.name}</div>
          <div className="mt-1 text-xs text-muted">{formatRupiah(service.price)} / {unitLabel[service.unit]}</div>
        </button>
      ))}
    </div>
  );
}

function calculateEstimatedDoneAt(items: TransactionItem[], services: LaundryService[]) {
  const serviceMap = new Map(services.map((service) => [service.id, service]));
  const maxDurationMs = items.reduce((max, item) => {
    const service = serviceMap.get(item.serviceId);
    return Math.max(max, parseDurationMs(service?.estimatedDuration));
  }, 0);
  return new Date(Date.now() + (maxDurationMs || 2 * 86_400_000)).toISOString();
}

function parseDurationMs(value?: string) {
  if (!value) return 0;
  const normalized = value.toLowerCase().trim();
  const amount = Number(normalized.match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(",", ".") ?? 0);
  if (!amount) return 0;
  if (normalized.includes("jam")) return amount * 3_600_000;
  if (normalized.includes("menit")) return amount * 60_000;
  if (normalized.includes("minggu")) return amount * 7 * 86_400_000;
  return amount * 86_400_000;
}

export function QRISPaymentModal({ open, qrisUrl, total, onClose, onPaid }: { open: boolean; qrisUrl: string; total: number; onClose: () => void; onPaid: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">Pembayaran QRIS</h2>
            <p className="text-sm text-muted">Tunjukkan QRIS ini ke pelanggan.</p>
          </div>
          <QrCode className="h-5 w-5 text-brand-600" />
        </div>
        <img src={qrisUrl} alt="QRIS toko" className="mx-auto my-5 h-72 w-72 rounded-lg border border-line object-contain p-3" />
        <div className="rounded-lg bg-slate-50 p-3 text-center">
          <p className="text-sm text-muted">Total pembayaran</p>
          <p className="text-2xl font-black text-ink">{formatRupiah(total)}</p>
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Tutup</Button>
          <Button className="flex-1" onClick={onPaid}>Tandai Lunas</Button>
        </div>
      </div>
    </div>
  );
}

export function PaymentModal({
  method,
  total,
  paidAmount,
  onMethod,
  onPaid
}: {
  method: PaymentChoice | "";
  total: number;
  paidAmount: string;
  onMethod: (value: PaymentChoice) => void;
  onPaid: (value: string) => void;
}) {
  const paid = Number(paidAmount || 0);
  const roundedToTen = Math.ceil(total / 10_000) * 10_000;
  const roundedToFifty = Math.ceil(total / 50_000) * 50_000;
  const cashShortcuts = Array.from(new Set([10_000, 20_000, 50_000, 100_000, total, roundedToTen, roundedToFifty]))
    .filter((value) => value > 0)
    .sort((a, b) => a - b);
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-subtle">
      <h2 className="text-base font-bold text-ink">Pembayaran</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 xl:grid-cols-2">
        {(["UNPAID", "CASH", "QRIS", "BANK_TRANSFER", "EWALLET", "SPLIT"] as PaymentChoice[]).map((item) => (
          <button key={item} type="button" onClick={() => onMethod(item)} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${method === item ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-white text-muted"}`}>{paymentChoiceLabel(item)}</button>
        ))}
      </div>
      {method === "UNPAID" ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          Transaksi akan disimpan sebagai belum bayar dan masuk ke piutang/follow-up.
        </div>
      ) : (
        <>
          <label className="mt-4 block text-sm font-semibold text-ink">Nominal dibayar</label>
          <input type="number" value={paidAmount} onChange={(event) => onPaid(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand-500" placeholder="Masukkan nominal" />
        </>
      )}
      {method === "CASH" ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Shortcut uang cash</p>
          <div className="mt-2 grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">
            {cashShortcuts.map((value) => (
              <button key={value} type="button" onClick={() => onPaid(String(value))} className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${Number(paidAmount || 0) === value ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-slate-50 text-ink hover:bg-white"}`}>
                {value === total ? "Uang pas" : formatRupiah(value)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-3 rounded-lg bg-slate-50 p-3">
        <div className="flex justify-between text-sm"><span>Total</span><strong>{formatRupiah(total)}</strong></div>
        <div className="mt-1 flex justify-between text-sm"><span>Kembalian</span><strong>{formatRupiah(Math.max(0, paid - total))}</strong></div>
      </div>
    </div>
  );
}

export function TransactionForm({ customers, services, settings, cashier }: { customers: Customer[]; services: LaundryService[]; settings: StoreSettings; cashier: User }) {
  const [step, setStep] = useState<"customer" | "service" | "items" | "payment" | "done">("customer");
  const [customer, setCustomer] = useState<DraftCustomer>(emptyCustomer());
  const [items, setItems] = useState<DraftItem[]>([]);
  const [discount, setDiscount] = useState("");
  const [additionalFee, setAdditionalFee] = useState("");
  const [tax, setTax] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [method, setMethod] = useState<PaymentChoice | "">("");
  const [qrisOpen, setQrisOpen] = useState(false);
  const [savedTransaction, setSavedTransaction] = useState<Transaction | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const discountValue = Number(discount || 0);
  const additionalFeeValue = Number(additionalFee || 0);
  const taxValue = Number(tax || 0);
  const paidAmountValue = Number(paidAmount || 0);
  const grandTotal = Math.max(0, subtotal - discountValue + additionalFeeValue + taxValue);
  const estimatedDoneAt = useMemo(() => calculateEstimatedDoneAt(items, services), [items, services]);

  const transaction = useMemo<Transaction>(() => ({
    id: savedTransaction?.id ?? "draft",
    transactionNumber: savedTransaction?.transactionNumber ?? generateTransactionNumber(999),
    customerId: customer.id,
    cashierId: cashier.id,
    customer,
    cashier,
    items,
    payments: paidAmountValue > 0 && method && method !== "UNPAID" ? [{ id: "draft-payment", transactionId: "draft", paymentMethod: method, amount: Math.min(paidAmountValue, grandTotal), paidAt: new Date().toISOString(), createdBy: cashier.id }] : [],
    subtotal,
    discount: discountValue,
    additionalFee: additionalFeeValue,
    tax: taxValue,
    grandTotal,
    paidAmount: paidAmountValue,
    changeAmount: Math.max(0, paidAmountValue - grandTotal),
    paymentStatus: paymentStatusFromPaid(grandTotal, paidAmountValue),
    laundryStatus: "NEW",
    estimatedDoneAt,
    notes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }), [cashier, customer, discountValue, estimatedDoneAt, additionalFeeValue, taxValue, grandTotal, items, method, paidAmountValue, savedTransaction, subtotal]);

  function addService(service: LaundryService) {
    setItems((current) => [...current, {
      id: crypto.randomUUID(),
      serviceId: service.id,
      serviceName: service.name,
      unit: service.unit,
      quantity: 0,
      price: service.price,
      cost: 0,
      subtotal: 0,
      notes: ""
    }]);
  }

  function updateItem(id: string, quantity: number) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, quantity, subtotal: quantity * item.price } : item));
  }

  function updateItemNotes(id: string, notes: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, notes } : item));
  }

  const canGoToService = customer.name.trim();
  const canGoToPayment = canGoToService && items.length > 0 && items.every((item) => item.quantity > 0);
  const canFinishPayment = canGoToPayment && Boolean(method) && (method === "UNPAID" || method === "QRIS" || paidAmountValue > 0 || grandTotal === 0);

  async function finishPayment() {
    if (isSaving || !customer.name.trim() || items.length === 0 || items.some((item) => item.quantity <= 0)) return;
    const number = generateTransactionNumber(Math.floor(Math.random() * 8999) + 1000);
    const transactionId = `trx-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const saved = {
      ...transaction,
      id: transactionId,
      transactionNumber: number,
      items: transaction.items.map((item) => ({ ...item, id: crypto.randomUUID() })),
      payments: transaction.payments.map((payment) => ({ ...payment, id: `pay-${crypto.randomUUID()}`, transactionId }))
    };
    setIsSaving(true);

    try {
      const response = await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(saved) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Transaksi gagal disimpan.");
      setSavedTransaction((payload?.data as Transaction | undefined) ?? saved);
      setStep("done");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Transaksi gagal disimpan.");
    } finally {
      setIsSaving(false);
    }
  }

  function sendWhatsApp() {
    if (!savedTransaction) return;
    const url = getWhatsAppUrl(savedTransaction);
    if (!url) {
      window.alert("Nomor HP pelanggan belum diisi, jadi struk tidak bisa dikirim ke WhatsApp.");
      return;
    }
    window.location.href = url;
  }

  function openReceipt(transactionId: string) {
    window.open(`/print/receipt/${transactionId}`, "_blank");
  }

  function getWhatsAppUrl(transactionData: Transaction) {
    const targetPhone = transactionData.customer.phone || customer.phone;
    if (!targetPhone.trim()) return "";
    const phone = targetPhone.replace(/\D/g, "").replace(/^0/, "62");
    const itemLines = transactionData.items.flatMap((item) => [
      item.serviceName,
      `${item.quantity} ${unitLabel[item.unit]} x ${formatRupiah(item.price)} = ${formatRupiah(item.subtotal)}`,
      item.notes ? `Catatan item: ${item.notes}` : ""
    ].filter(Boolean));
    const adjustmentLines = [
      transactionData.discount > 0 ? `Diskon: ${formatRupiah(transactionData.discount)}` : "",
      transactionData.additionalFee > 0 ? `Tambahan: ${formatRupiah(transactionData.additionalFee)}` : "",
      transactionData.tax > 0 ? `Pajak: ${formatRupiah(transactionData.tax)}` : ""
    ].filter(Boolean);
    const message = [
      settings.storeName,
      settings.address,
      `WA: ${settings.whatsapp}`,
      "------------------------------",
      `No: ${transactionData.transactionNumber}`,
      `Tanggal: ${formatDate(transactionData.createdAt)}`,
      `Kasir: ${transactionData.cashier.name}`,
      `Pelanggan: ${transactionData.customer.name}`,
      `HP: ${transactionData.customer.phone || "-"}`,
      "------------------------------",
      ...itemLines,
      "------------------------------",
      `Subtotal: ${formatRupiah(transactionData.subtotal)}`,
      ...adjustmentLines,
      "------------------------------",
      `TOTAL: ${formatRupiah(transactionData.grandTotal)}`,
      `Dibayar: ${formatRupiah(transactionData.paidAmount)}`,
      `Kembali: ${formatRupiah(transactionData.changeAmount)}`,
      `Metode: ${transactionData.payments[0] ? paymentMethodLabel[transactionData.payments[0].paymentMethod] : "-"}`,
      `Bayar: ${transactionData.paymentStatus === "PARTIAL" ? `DP: ${formatRupiah(transactionData.paidAmount)}` : paymentStatusLabel[transactionData.paymentStatus]}`,
      `Estimasi: ${formatTransactionEstimate(transactionData)}`,
      transactionData.notes ? `Catatan: ${transactionData.notes}` : "",
      "------------------------------",
      "Terima kasih sudah menggunakan layanan kami."
    ].join("\n");
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  const savedWhatsAppUrl = savedTransaction ? getWhatsAppUrl(savedTransaction) : "";

  return (
    <div className="mx-auto max-w-6xl space-y-3 md:space-y-4">
      <div className="hidden rounded-lg border border-line bg-white p-3 shadow-subtle md:block">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {[
            ["customer", "1. Pelanggan"],
            ["service", "2. Layanan"],
            ["items", "3. Detail Item"],
            ["payment", "4. Payment"],
            ["done", "5. Selesai"]
          ].map(([key, label]) => (
            <button key={key} type="button" onClick={() => {
              if (key === "customer") setStep("customer");
              if (key === "service" && canGoToService) setStep("service");
              if (key === "items" && items.length > 0) setStep("items");
              if (key === "payment" && canGoToPayment) setStep("payment");
              if (key === "done" && savedTransaction) setStep("done");
            }} className={`rounded-lg border px-3 py-2 text-left text-xs font-bold md:text-center ${step === key ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line text-muted"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-lg border border-line bg-white p-3 shadow-subtle sm:p-4">
          <div className="flex flex-col gap-3 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between">
            <div>
              <h1 className="text-xl font-black text-ink">Kasir Laundry</h1>
            </div>
            {savedTransaction ? <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => openReceipt(savedTransaction.id)}><Printer className="h-4 w-4" />Print</Button>{savedWhatsAppUrl ? <a href={savedWhatsAppUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:bg-slate-50"><MessageCircle className="h-4 w-4" />Kirim WA</a> : <Button variant="secondary" onClick={sendWhatsApp}><MessageCircle className="h-4 w-4" />Kirim WA</Button>}</div> : null}
          </div>
      </section>

      {step === "customer" ? (
        <section className="rounded-lg border border-line bg-white p-3 shadow-subtle sm:p-4">
          <h2 className="text-base font-bold text-ink">Data Pelanggan</h2>
          <div className="mt-3 grid gap-2 md:mt-4 md:grid-cols-2 md:gap-3">
            <CustomerSearch customers={customers} onPick={setCustomer} />
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-muted">
              {customer.name || customer.phone ? (
                <>
                  <strong className="text-ink">{customer.name || "Nama belum diisi"}</strong><span className="ml-2">{customer.phone || "Tanpa HP"}</span>
                  <div className="text-xs">{customer.address}</div>
                </>
              ) : "Belum ada pelanggan dipilih"}
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:mt-4 md:grid-cols-2 md:gap-3">
            <label className="text-sm font-semibold text-ink">Nama pelanggan<input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand-500" placeholder="Nama pelanggan" /></label>
            <label className="text-sm font-semibold text-ink">Nomor HP <span className="font-normal text-muted">(opsional)</span><input value={customer.phone} onChange={(e) => setCustomer({ ...customer, id: e.target.value.trim() && customers.some((row) => row.phone === e.target.value) ? customer.id : `cus-${Date.now()}`, phone: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand-500" placeholder="Nomor HP opsional" /></label>
            <label className="text-sm font-semibold text-ink">Alamat<input value={customer.address ?? ""} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand-500" placeholder="Alamat opsional" /></label>
            <label className="text-sm font-semibold text-ink">Catatan pelanggan<input value={customer.notes ?? ""} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand-500" placeholder="Catatan opsional" /></label>
          </div>
          <div className="mt-3 flex justify-end md:mt-4">
            <Button disabled={!canGoToService} onClick={() => setStep("service")}>Lanjut Pilih Layanan <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </section>
      ) : null}

      {step === "service" ? (
        <section className="rounded-lg border border-line bg-white p-3 shadow-subtle sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-ink">Pilih Layanan</h2>
            <span className="text-sm text-muted">{services.filter((service) => service.isActive).length} layanan aktif</span>
          </div>
          <ServiceSelector services={services} onAdd={addService} />
          {items.length > 0 ? (
            <div className="mt-3 rounded-lg border border-line bg-slate-50 p-3 md:mt-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-black text-ink">Item dipilih</h3>
                  <p className="text-xs text-muted">Isi berat/jumlah di sini, lalu lanjut payment.</p>
                </div>
                <span className="text-xs font-bold text-brand-700">{items.length} item</span>
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-2 lg:gap-3">
                {items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-line bg-white p-3 shadow-subtle">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-ink">{item.serviceName}</p>
                        <p className="text-xs text-muted">{formatRupiah(item.price)} / {unitLabel[item.unit]}</p>
                      </div>
                      <button type="button" onClick={() => setItems(items.filter((row) => row.id !== item.id))} className="rounded-lg bg-slate-50 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <label className="text-xs font-semibold text-muted">Berat / jumlah<input aria-label={`Qty ${item.serviceName}`} type="number" min="0.1" step="0.1" value={item.quantity || ""} onChange={(event) => updateItem(item.id, Number(event.target.value))} className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand-500" placeholder="Isi qty" /></label>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-xs font-semibold text-muted">Subtotal</p>
                        <p className="text-sm font-black text-ink">{formatRupiah(item.subtotal)}</p>
                      </div>
                    </div>
                    <input value={item.notes ?? ""} onChange={(event) => updateItemNotes(item.id, event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-brand-500" placeholder="Catatan item" />
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-lg bg-white p-3">
                <div className="flex justify-between text-sm"><span>Subtotal</span><strong>{formatRupiah(subtotal)}</strong></div>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  <label className="text-xs font-semibold text-muted">Diskon<input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand-500" placeholder="0" /></label>
                  <label className="text-xs font-semibold text-muted">Biaya tambahan<input type="number" value={additionalFee} onChange={(e) => setAdditionalFee(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand-500" placeholder="0" /></label>
                  <label className="text-xs font-semibold text-muted">Pajak<input type="number" value={tax} onChange={(e) => setTax(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand-500" placeholder="0" /></label>
                </div>
                <div className="mt-3 flex justify-between border-t border-line pt-3 text-lg font-black"><span>Total</span><span>{formatRupiah(grandTotal)}</span></div>
              </div>
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap justify-between gap-2 md:mt-4">
            <Button variant="secondary" onClick={() => setStep("customer")}><ArrowLeft className="h-4 w-4" />Kembali</Button>
            <Button disabled={!canGoToPayment} onClick={() => setStep("payment")}>Payment <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </section>
      ) : null}

      {step === "items" ? (
        <section className="rounded-lg border border-line bg-white p-3 shadow-subtle sm:p-4">
          <h2 className="text-base font-bold text-ink">Item Laundry</h2>
          <div className="mt-3 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.08em] text-muted">
                <tr><th className="py-2">Layanan</th><th>Qty</th><th>Harga</th><th>Subtotal</th><th>Catatan</th><th /></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 font-semibold">{item.serviceName}<div className="text-xs text-muted">{unitLabel[item.unit]}</div></td>
                    <td><input aria-label={`Qty ${item.serviceName}`} type="number" min="0.1" step="0.1" value={item.quantity || ""} onChange={(event) => updateItem(item.id, Number(event.target.value))} className="h-9 w-24 rounded-lg border border-line px-2" placeholder="Qty" /></td>
                    <td>{formatRupiah(item.price)}</td>
                    <td className="font-bold">{formatRupiah(item.subtotal)}</td>
                    <td><input value={item.notes ?? ""} onChange={(event) => updateItemNotes(item.id, event.target.value)} className="h-9 w-full rounded-lg border border-line px-2" placeholder="Catatan item" /></td>
                    <td><button type="button" onClick={() => setItems(items.filter((row) => row.id !== item.id))} className="text-red-600"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
                {items.length === 0 ? <tr><td colSpan={6} className="py-8 text-center text-muted">Belum ada layanan. Pilih layanan untuk memulai transaksi.</td></tr> : null}
              </tbody>
            </table>
          </div>
          <div className="mt-3 space-y-3 md:hidden">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-line bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ink">{item.serviceName}</p>
                    <p className="text-xs text-muted">{formatRupiah(item.price)} / {unitLabel[item.unit]}</p>
                  </div>
                  <button type="button" onClick={() => setItems(items.filter((row) => row.id !== item.id))} className="rounded-lg bg-white p-2 text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="text-xs font-semibold text-muted">Qty<input aria-label={`Qty ${item.serviceName}`} type="number" min="0.1" step="0.1" value={item.quantity || ""} onChange={(event) => updateItem(item.id, Number(event.target.value))} className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink" placeholder="Isi qty" /></label>
                  <div className="rounded-lg bg-white px-3 py-2">
                    <p className="text-xs font-semibold text-muted">Subtotal</p>
                    <p className="text-sm font-black text-ink">{formatRupiah(item.subtotal)}</p>
                  </div>
                </div>
                <input value={item.notes ?? ""} onChange={(event) => updateItemNotes(item.id, event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm" placeholder="Catatan item" />
              </div>
            ))}
            {items.length === 0 ? <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">Belum ada layanan. Pilih layanan untuk memulai transaksi.</div> : null}
          </div>
          <div className="mt-3 rounded-lg bg-slate-50 p-3 md:mt-4">
            <div className="flex justify-between text-sm"><span>Subtotal</span><strong>{formatRupiah(subtotal)}</strong></div>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              <label className="text-xs font-semibold text-muted">Diskon<input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink" placeholder="0" /></label>
              <label className="text-xs font-semibold text-muted">Biaya tambahan<input type="number" value={additionalFee} onChange={(e) => setAdditionalFee(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink" placeholder="0" /></label>
              <label className="text-xs font-semibold text-muted">Pajak<input type="number" value={tax} onChange={(e) => setTax(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink" placeholder="0" /></label>
            </div>
            <div className="mt-3 flex justify-between border-t border-line pt-3 text-lg font-black"><span>Total</span><span>{formatRupiah(grandTotal)}</span></div>
          </div>
          <div className="mt-3 flex flex-wrap justify-between gap-2 md:mt-4">
            <Button variant="secondary" onClick={() => setStep("service")}><ArrowLeft className="h-4 w-4" />Kembali</Button>
            <Button disabled={!canGoToPayment} onClick={() => setStep("payment")}>Payment <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </section>
      ) : null}

      {step === "payment" ? (
        <section className="grid gap-3 md:gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <PaymentModal method={method} total={grandTotal} paidAmount={paidAmount} onMethod={(value) => { setMethod(value); if (value === "UNPAID") setPaidAmount(""); if (value === "QRIS") setQrisOpen(true); }} onPaid={setPaidAmount} />
        <section className="rounded-lg border border-line bg-white p-3 shadow-subtle sm:p-4">
          <h2 className="text-base font-bold text-ink">Ringkasan</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><strong>{formatRupiah(subtotal)}</strong></div>
            <div className="flex items-center justify-between gap-3"><span>Diskon</span><input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="h-8 w-32 rounded-lg border border-line px-2 text-right" placeholder="0" /></div>
            <div className="flex items-center justify-between gap-3"><span>Biaya tambahan</span><input type="number" value={additionalFee} onChange={(e) => setAdditionalFee(e.target.value)} className="h-8 w-32 rounded-lg border border-line px-2 text-right" placeholder="0" /></div>
            <div className="flex items-center justify-between gap-3"><span>Pajak</span><input type="number" value={tax} onChange={(e) => setTax(e.target.value)} className="h-8 w-32 rounded-lg border border-line px-2 text-right" placeholder="0" /></div>
            <div className="border-t border-line pt-3 text-lg font-black"><div className="flex justify-between"><span>Total</span><span>{formatRupiah(grandTotal)}</span></div></div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Button disabled={!canFinishPayment || isSaving} onClick={finishPayment}><CheckCircle2 className="h-4 w-4" />{isSaving ? "Menyimpan..." : "Simpan transaksi"}</Button>
            <Button variant="secondary" onClick={() => setStep("items")}><ArrowLeft className="h-4 w-4" />Kembali item</Button>
          </div>
        </section>
        </section>
      ) : null}

      {step === "done" && savedTransaction ? (
        <section className="rounded-lg border border-line bg-white p-5 text-center shadow-subtle">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h2 className="mt-3 text-xl font-black text-ink">Transaksi tersimpan</h2>
          <p className="mt-1 text-sm text-muted">Transaksi {savedTransaction.transactionNumber} berhasil disimpan.</p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Button type="button" onClick={() => openReceipt(savedTransaction.id)}><Printer className="h-4 w-4" />Print nota</Button>
            {savedWhatsAppUrl ? <a href={savedWhatsAppUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:bg-slate-50"><MessageCircle className="h-4 w-4" />Kirim by WA</a> : <Button variant="secondary" onClick={sendWhatsApp}><MessageCircle className="h-4 w-4" />Kirim by WA</Button>}
            <Button variant="secondary" onClick={() => { setCustomer(emptyCustomer()); setItems([]); setDiscount(""); setAdditionalFee(""); setTax(""); setPaidAmount(""); setMethod(""); setSavedTransaction(null); setStep("customer"); }}><Plus className="h-4 w-4" />Transaksi baru</Button>
          </div>
        </section>
      ) : null}
      <QRISPaymentModal open={qrisOpen} qrisUrl={settings.qrisUrl} total={grandTotal} onClose={() => setQrisOpen(false)} onPaid={() => { setPaidAmount(String(grandTotal)); setQrisOpen(false); }} />
    </div>
  );
}

function formatTransactionEstimate(transaction: Transaction) {
  if (!transaction.estimatedDoneAt) return "-";
  const createdAt = new Date(transaction.createdAt);
  const estimatedAt = new Date(transaction.estimatedDoneAt);
  const sameDay = createdAt.toDateString() === estimatedAt.toDateString();
  return formatDate(estimatedAt, sameDay ? "dd MMM yyyy, HH:mm" : "dd MMM yyyy");
}
