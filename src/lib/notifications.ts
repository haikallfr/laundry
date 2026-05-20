import { formatDate, formatRupiah, laundryStatusLabel, paymentStatusLabel } from "@/lib/utils";
import type { Transaction, User } from "@/types";

export type NotificationTone = "amber" | "blue" | "green" | "red" | "slate";

export type AppNotification = {
  id: string;
  title: string;
  description: string;
  href: string;
  actionLabel?: string;
  actionHref?: string;
  tone: NotificationTone;
  priority: number;
};

export function buildNotifications(transactions: Transaction[], user: User): AppNotification[] {
  const scopedTransactions = user.role === "OWNER" ? transactions : transactions.filter((trx) => trx.cashierId === user.id);
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const notifications: AppNotification[] = [];

  scopedTransactions.forEach((transaction) => {
    const detailHref = `/transactions/${transaction.id}`;

    if (transaction.laundryStatus === "READY_FOR_PICKUP") {
      notifications.push({
        id: `ready-${transaction.id}`,
        title: `${transaction.customer.name} siap diambil`,
        description: `${transaction.transactionNumber} sudah siap. ${paymentStatusLabel[transaction.paymentStatus]}.`,
        href: detailHref,
        actionLabel: transaction.customer.phone ? "Kirim WA" : "Detail",
        actionHref: transaction.customer.phone ? readyWhatsAppUrl(transaction) : detailHref,
        tone: "green",
        priority: 1
      });
    }

    if (transaction.paymentStatus === "UNPAID" || transaction.paymentStatus === "PARTIAL") {
      const remaining = Math.max(0, transaction.grandTotal - transaction.paidAmount);
      notifications.push({
        id: `payment-${transaction.id}`,
        title: `${transaction.transactionNumber} belum lunas`,
        description: `${transaction.customer.name} masih perlu bayar ${formatRupiah(remaining)}.`,
        href: detailHref,
        actionLabel: transaction.customer.phone ? "Tagih WA" : "Detail",
        actionHref: transaction.customer.phone ? billingWhatsAppUrl(transaction, remaining) : detailHref,
        tone: "amber",
        priority: 2
      });
    }

    if (transaction.estimatedDoneAt && ["NEW", "PROCESSING"].includes(transaction.laundryStatus)) {
      const estimate = new Date(transaction.estimatedDoneAt);
      if (estimate >= todayStart && estimate <= todayEnd) {
        notifications.push({
          id: `due-today-${transaction.id}`,
          title: `${transaction.transactionNumber} estimasi hari ini`,
          description: `${transaction.customer.name} masih ${laundryStatusLabel[transaction.laundryStatus]}.`,
          href: "/laundry-management",
          actionLabel: "Kelola",
          actionHref: "/laundry-management",
          tone: "blue",
          priority: 3
        });
      }

      if (estimate < todayStart) {
        notifications.push({
          id: `overdue-${transaction.id}`,
          title: `${transaction.transactionNumber} terlambat`,
          description: `Estimasi selesai ${formatDate(estimate, "dd MMM yyyy")}, status masih ${laundryStatusLabel[transaction.laundryStatus]}.`,
          href: detailHref,
          actionLabel: "Detail",
          actionHref: detailHref,
          tone: "red",
          priority: 0
        });
      }
    }
  });

  const todayTransactions = scopedTransactions.filter((transaction) => {
    const createdAt = new Date(transaction.createdAt);
    return createdAt >= todayStart && createdAt <= todayEnd;
  });

  if (todayTransactions.length) {
    notifications.push({
      id: "today-transactions",
      title: `${todayTransactions.length} transaksi baru hari ini`,
      description: `Total nilai transaksi hari ini ${formatRupiah(todayTransactions.reduce((sum, trx) => sum + trx.grandTotal, 0))}.`,
      href: "/transactions?period=today",
      actionLabel: "Lihat",
      actionHref: "/transactions?period=today",
      tone: "slate",
      priority: 4
    });
  }

  return notifications.sort((a, b) => a.priority - b.priority).slice(0, 12);
}

function readyWhatsAppUrl(transaction: Transaction) {
  const phone = normalizePhone(transaction.customer.phone);
  const remaining = Math.max(0, transaction.grandTotal - transaction.paidAmount);
  const paymentLines = transaction.paymentStatus === "PAID"
    ? [`Status bayar: ${paymentStatusLabel[transaction.paymentStatus]}`]
    : [
        `Status bayar: ${paymentStatusLabel[transaction.paymentStatus]}`,
        `Sudah dibayar: ${formatRupiah(transaction.paidAmount)}`,
        `Sisa pembayaran: ${formatRupiah(remaining)}`
      ];
  const closingLine = transaction.paymentStatus === "PAID"
    ? "Silakan datang ke toko untuk mengambil laundry Anda. Terima kasih."
    : "Silakan datang ke toko untuk mengambil laundry dan melakukan pelunasan. Terima kasih.";
  const message = [
    `Halo ${transaction.customer.name}, laundry Anda sudah siap diambil.`,
    "",
    `No nota: ${transaction.transactionNumber}`,
    `Total: ${formatRupiah(transaction.grandTotal)}`,
    ...paymentLines,
    "",
    closingLine
  ].join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function billingWhatsAppUrl(transaction: Transaction, remaining: number) {
  const phone = normalizePhone(transaction.customer.phone);
  const message = [
    `Halo ${transaction.customer.name}, pembayaran laundry Anda belum lunas.`,
    "",
    `No nota: ${transaction.transactionNumber}`,
    `Total: ${formatRupiah(transaction.grandTotal)}`,
    `Sudah dibayar: ${formatRupiah(transaction.paidAmount)}`,
    `Sisa pembayaran: ${formatRupiah(remaining)}`,
    "",
    "Mohon lakukan pelunasan saat pengambilan laundry. Terima kasih."
  ].join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").replace(/^0/, "62");
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}
