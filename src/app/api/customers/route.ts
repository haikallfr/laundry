import { NextResponse } from "next/server";
import { readStore, updateStore } from "@/lib/store";
import { customerSchema } from "@/lib/validations";

export async function GET() {
  const data = await readStore();
  return NextResponse.json({ data: data.customers, meta: { total: data.customers.length, page: 1, perPage: 25 } });
}

export async function POST(request: Request) {
  const parsed = customerSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const customer = { id: `cus-${Date.now()}`, ...parsed.data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await updateStore((data) => {
    const customerPhone = customer.phone?.trim();
    const existing = data.customers.findIndex((row) => Boolean(customerPhone) && row.phone === customerPhone);
    if (existing >= 0) data.customers[existing] = { ...data.customers[existing], ...customer, id: data.customers[existing].id };
    else data.customers.unshift(customer);
  });
  return NextResponse.json({ data: customer }, { status: 201 });
}
