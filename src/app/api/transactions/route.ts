import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { hasRelationalStore, readStore, toTransaction, updateStore } from "@/lib/store";

export async function GET() {
  if (hasRelationalStore()) {
    const rows = await getPrisma().transaction.findMany({
      take: 500,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        cashier: true,
        items: { orderBy: { createdAt: "asc" } },
        payments: { orderBy: { paidAt: "asc" } }
      }
    });
    return NextResponse.json({ data: rows.map(toTransaction), meta: { total: rows.length, page: 1, perPage: 500 } });
  }

  const data = await readStore();
  return NextResponse.json({ data: data.transactions, meta: { total: data.transactions.length, page: 1, perPage: 25 } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (hasRelationalStore()) {
      const prisma = getPrisma();
      const customerPhone = body.customer?.phone?.trim();
      const customerPhoneForDb = customerPhone || `__NO_PHONE__:${body.customer?.id ?? body.customerId}`;

      if (body.customer) {
        const existingCustomer = await prisma.customer.findFirst({
          where: {
            OR: [
              { id: body.customer.id },
              ...(customerPhone ? [{ phone: customerPhone }] : [])
            ]
          }
        });

        if (existingCustomer) {
          await prisma.customer.update({
            where: { id: existingCustomer.id },
            data: {
              name: body.customer.name,
              phone: customerPhoneForDb,
              address: body.customer.address ?? null,
              notes: body.customer.notes ?? null
            }
          });
          body.customerId = existingCustomer.id;
        } else {
          await prisma.customer.create({
            data: {
              id: body.customer.id,
              name: body.customer.name,
              phone: customerPhoneForDb,
              address: body.customer.address ?? null,
              notes: body.customer.notes ?? null,
              createdAt: body.customer.createdAt ? new Date(body.customer.createdAt) : new Date(),
              updatedAt: new Date()
            }
          });
        }
      }

      await prisma.transaction.create({
        data: {
          id: body.id,
          transactionNumber: body.transactionNumber,
          customerId: body.customerId,
          cashierId: body.cashierId,
          subtotal: body.subtotal,
          discount: body.discount,
          additionalFee: body.additionalFee,
          tax: body.tax,
          grandTotal: body.grandTotal,
          paidAmount: body.paidAmount,
          changeAmount: body.changeAmount,
          paymentStatus: body.paymentStatus,
          laundryStatus: body.laundryStatus,
          estimatedDoneAt: body.estimatedDoneAt ? new Date(body.estimatedDoneAt) : null,
          notes: body.notes ?? null,
          createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
          updatedAt: body.updatedAt ? new Date(body.updatedAt) : new Date(),
          items: {
            create: body.items.map((item: any) => ({
              id: item.id,
              serviceId: item.serviceId || null,
              serviceName: item.serviceName,
              unit: item.unit,
              quantity: item.quantity,
              price: item.price,
              cost: item.cost ?? 0,
              subtotal: item.subtotal,
              notes: item.notes ?? null
            }))
          },
          payments: {
            create: body.payments.map((payment: any) => ({
              id: payment.id,
              paymentMethod: payment.paymentMethod,
              amount: payment.amount,
              paidAt: payment.paidAt ? new Date(payment.paidAt) : new Date(),
              referenceNumber: payment.referenceNumber ?? null,
              notes: payment.notes ?? null,
              createdBy: payment.createdBy || body.cashierId
            }))
          }
        }
      });

      return NextResponse.json({ data: body, audit: { action: "TRANSACTION_CREATED", at: new Date().toISOString() } }, { status: 201 });
    }

    await updateStore((data) => {
      const customerPhone = body.customer?.phone?.trim();
      const existingCustomerIndex = data.customers.findIndex((row) => row.id === body.customer?.id || (Boolean(customerPhone) && row.phone === customerPhone));
      if (existingCustomerIndex >= 0 && body.customer) data.customers[existingCustomerIndex] = { ...data.customers[existingCustomerIndex], ...body.customer, updatedAt: new Date().toISOString() };
      if (existingCustomerIndex < 0 && body.customer) data.customers.unshift({ ...body.customer, createdAt: body.customer.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() });
      data.transactions.unshift(body);
    });
    return NextResponse.json({ data: body, audit: { action: "TRANSACTION_CREATED", at: new Date().toISOString() } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Transaksi gagal disimpan." }, { status: 500 });
  }
}
