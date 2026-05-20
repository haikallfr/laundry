import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { hasRelationalStore, updateStore } from "@/lib/store";
import type { LaundryStatus } from "@/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { laundryStatus?: LaundryStatus };
  if (!body.laundryStatus) return NextResponse.json({ error: "Status laundry wajib diisi." }, { status: 400 });

  if (hasRelationalStore()) {
    const prisma = getPrisma();
    const transaction = await prisma.transaction.findUnique({ where: { id } });
    if (!transaction) return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
    if (body.laundryStatus === "PICKED_UP" && transaction.paymentStatus !== "PAID") {
      return NextResponse.json({ error: "Transaksi belum lunas. Lunasi pembayaran sebelum menandai sudah diambil." }, { status: 409 });
    }

    await prisma.transaction.update({
      where: { id },
      data: {
        laundryStatus: body.laundryStatus,
        pickedUpAt: body.laundryStatus === "PICKED_UP" ? new Date() : transaction.pickedUpAt,
        updatedAt: new Date()
      }
    });
    return NextResponse.json({ data: { id, laundryStatus: body.laundryStatus }, audit: { action: "LAUNDRY_STATUS_UPDATED" } });
  }

  let blockedReason = "";
  let found = false;
  await updateStore((data) => {
    data.transactions = data.transactions.map((row) => {
      if (row.id !== id) return row;
      found = true;
      if (body.laundryStatus === "PICKED_UP" && row.paymentStatus !== "PAID") {
        blockedReason = "Transaksi belum lunas. Lunasi pembayaran sebelum menandai sudah diambil.";
        return row;
      }
      return {
        ...row,
        laundryStatus: body.laundryStatus!,
        pickedUpAt: body.laundryStatus === "PICKED_UP" ? new Date().toISOString() : row.pickedUpAt,
        updatedAt: new Date().toISOString()
      };
    });
  });

  if (!found) return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
  if (blockedReason) return NextResponse.json({ error: blockedReason }, { status: 409 });

  return NextResponse.json({ data: { id, laundryStatus: body.laundryStatus }, audit: { action: "LAUNDRY_STATUS_UPDATED" } });
}
