import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { twMerge } from "tailwind-merge";
import type { LaundryStatus, PaymentMethod, PaymentStatus, ServiceUnit } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatDate(value: string | Date, pattern = "dd MMM yyyy, HH:mm") {
  return format(new Date(value), pattern, { locale: id });
}

export function generateTransactionNumber(sequence: number, date = new Date()) {
  const ymd = format(date, "yyyyMMdd");
  return `LDY-${ymd}-${String(sequence).padStart(4, "0")}`;
}

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  UNPAID: "Belum bayar",
  PARTIAL: "DP / sebagian",
  PAID: "Lunas",
  REFUNDED: "Refund",
  CANCELLED: "Batal"
};

export const laundryStatusLabel: Record<LaundryStatus, string> = {
  NEW: "Baru masuk",
  PROCESSING: "Diproses",
  DONE: "Selesai",
  READY_FOR_PICKUP: "Siap diambil",
  PICKED_UP: "Sudah diambil",
  CANCELLED: "Dibatalkan"
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  CASH: "Tunai",
  QRIS: "QRIS",
  BANK_TRANSFER: "Transfer",
  EWALLET: "E-wallet",
  SPLIT: "Split"
};

export const unitLabel: Record<ServiceUnit, string> = {
  KG: "Kg",
  PCS: "Pcs",
  PACKAGE: "Paket",
  METER: "Meter"
};

export function paymentStatusFromPaid(grandTotal: number, paidAmount: number): PaymentStatus {
  if (paidAmount <= 0) return "UNPAID";
  if (paidAmount < grandTotal) return "PARTIAL";
  return "PAID";
}
