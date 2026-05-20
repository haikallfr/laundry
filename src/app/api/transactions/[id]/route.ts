import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { hasRelationalStore, readStore, toTransaction, updateStore } from "@/lib/store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (hasRelationalStore()) {
    const row = await getPrisma().transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        cashier: true,
        items: { orderBy: { createdAt: "asc" } },
        payments: { orderBy: { paidAt: "asc" } }
      }
    });
    return NextResponse.json({ data: row ? toTransaction(row) : null });
  }

  const data = await readStore();
  return NextResponse.json({ data: data.transactions.find((row) => row.id === id) ?? null });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  if (hasRelationalStore()) {
    const updated = await getPrisma().transaction.update({
      where: { id },
      data: {
        subtotal: body.subtotal,
        discount: body.discount,
        additionalFee: body.additionalFee,
        tax: body.tax,
        grandTotal: body.grandTotal,
        paidAmount: body.paidAmount,
        changeAmount: body.changeAmount,
        paymentStatus: body.paymentStatus,
        laundryStatus: body.laundryStatus,
        estimatedDoneAt: body.estimatedDoneAt ? new Date(body.estimatedDoneAt) : undefined,
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
        pickedUpAt: body.pickedUpAt ? new Date(body.pickedUpAt) : undefined,
        notes: body.notes ?? undefined,
        updatedAt: new Date()
      }
    });
    return NextResponse.json({ data: updated, audit: { action: "TRANSACTION_UPDATED" } });
  }

  await updateStore((data) => {
    data.transactions = data.transactions.map((row) => row.id === id ? { ...row, ...body, id, updatedAt: new Date().toISOString() } : row);
  });
  return NextResponse.json({ data: { id, ...body }, audit: { action: "TRANSACTION_UPDATED" } });
}
