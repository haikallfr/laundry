import { NextResponse } from "next/server";
import { paymentStatusFromPaid } from "@/lib/utils";
import { getPrisma } from "@/lib/prisma";
import { hasRelationalStore, updateStore } from "@/lib/store";
import type { PaymentMethod } from "@/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { paymentMethod?: PaymentMethod; amount?: number; referenceNumber?: string; notes?: string; createdBy?: string };
  const amount = Number(body.amount || 0);
  if (!body.paymentMethod) return NextResponse.json({ error: "Metode pembayaran wajib dipilih." }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Nominal pembayaran harus lebih dari 0." }, { status: 400 });

  if (hasRelationalStore()) {
    const prisma = getPrisma();
    const transaction = await prisma.transaction.findUnique({ where: { id } });
    if (!transaction) return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });

    const paidAmount = Number(transaction.paidAmount) + amount;
    const payment = await prisma.payment.create({
      data: {
        id: `pay-${Date.now()}`,
        transactionId: id,
        paymentMethod: body.paymentMethod,
        amount,
        paidAt: new Date(),
        referenceNumber: body.referenceNumber ?? null,
        notes: body.notes ?? null,
        createdBy: body.createdBy || transaction.cashierId
      }
    });
    await prisma.transaction.update({
      where: { id },
      data: {
        paidAmount,
        changeAmount: Math.max(0, paidAmount - Number(transaction.grandTotal)),
        paymentStatus: paymentStatusFromPaid(Number(transaction.grandTotal), paidAmount),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      data: { ...payment, amount: Number(payment.amount), paidAt: payment.paidAt.toISOString() },
      audit: { action: "PAYMENT_ADDED" }
    }, { status: 201 });
  }

  const payment = {
    id: `pay-${Date.now()}`,
    transactionId: id,
    paymentMethod: body.paymentMethod,
    amount,
    paidAt: new Date().toISOString(),
    referenceNumber: body.referenceNumber,
    notes: body.notes,
    createdBy: body.createdBy || "system"
  };
  let found = false;
  await updateStore((data) => {
    data.transactions = data.transactions.map((row) => {
      if (row.id !== id) return row;
      found = true;
      const paidAmount = row.paidAmount + amount;
      return {
        ...row,
        payments: [...row.payments, payment],
        paidAmount,
        changeAmount: Math.max(0, paidAmount - row.grandTotal),
        paymentStatus: paymentStatusFromPaid(row.grandTotal, paidAmount),
        updatedAt: new Date().toISOString()
      };
    });
  });
  if (!found) return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ data: payment, audit: { action: "PAYMENT_ADDED" } }, { status: 201 });
}
