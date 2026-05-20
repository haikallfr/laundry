import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { hasRelationalStore, updateStore } from "@/lib/store";
import type { LaundryStatus, PaymentStatus } from "@/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const patch = { id, laundryStatus: "CANCELLED" as LaundryStatus, paymentStatus: "CANCELLED" as PaymentStatus, cancelReason: body.reason ?? "Dibatalkan", cancelledAt: new Date().toISOString() };
  if (hasRelationalStore()) {
    await getPrisma().transaction.update({
      where: { id },
      data: {
        laundryStatus: patch.laundryStatus,
        paymentStatus: patch.paymentStatus,
        cancelReason: patch.cancelReason,
        cancelledAt: new Date(patch.cancelledAt),
        updatedAt: new Date()
      }
    });
    return NextResponse.json({ data: patch, audit: { action: "TRANSACTION_CANCELLED" } });
  }

  await updateStore((data) => {
    data.transactions = data.transactions.map((row) => row.id === id ? { ...row, ...patch, updatedAt: new Date().toISOString() } : row);
  });
  return NextResponse.json({ data: patch, audit: { action: "TRANSACTION_CANCELLED" } });
}
