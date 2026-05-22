import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type { CapitalPlan, Customer, Expense, LaundryService, StoreSettings, Transaction, User } from "@/types";
import { customers, expenses, services, settings, transactions, users } from "@/lib/mock-data";
import { getPrisma } from "@/lib/prisma";

export type AppData = {
  users: User[];
  customers: Customer[];
  services: LaundryService[];
  transactions: Transaction[];
  expenses: Expense[];
  settings: StoreSettings;
};

export type ShellData = {
  settings: StoreSettings;
  transactions: Transaction[];
};

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "laundry-pos.json");
const capitalPlanFile = path.join(dataDir, "capital-plan.json");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseTable = process.env.SUPABASE_STORE_TABLE || "app_store";
const storeKey = process.env.APP_STORE_KEY || "default";
const relationalStoreEnabled = Boolean(process.env.DATABASE_URL);

export function hasSupabaseStore() {
  return Boolean(supabaseUrl && supabaseKey);
}

export function hasRelationalStore() {
  return relationalStoreEnabled;
}

function seedData(): AppData {
  return {
    users,
    customers,
    services,
    transactions,
    expenses,
    settings
  };
}

function defaultCapitalPlan(): CapitalPlan {
  return {
    items: [
      { id: "cap-washer-1", name: "Mesin cuci", category: "Mesin", amount: 0, quantity: 1, purchasedAt: new Date().toISOString(), notes: "Isi harga pembelian mesin cuci" },
      { id: "cap-dryer-1", name: "Mesin pengering", category: "Mesin", amount: 0, quantity: 1, purchasedAt: new Date().toISOString(), notes: "Isi jika sudah beli dryer" },
      { id: "cap-renovation", name: "Renovasi / instalasi", category: "Setup", amount: 0, quantity: 1, purchasedAt: new Date().toISOString(), notes: "Listrik, air, meja, rak, signage" }
    ],
    assumptions: {
      workingDaysPerMonth: 26,
      targetDailyVolume: 30,
      primaryServiceId: "srv-2"
    }
  };
}

function isNextJsBuild() {
  return process.env.NEXT_PHASE === "phase-production-build" || process.env.NEXT_PHASE === "phase-development-build";
}

export const readStore = cache(async function readStore(): Promise<AppData> {
  if (hasRelationalStore()) {
    if (isNextJsBuild()) {
      return seedData();
    }
    return readPrismaStore();
  }
  if (hasSupabaseStore()) return readSupabaseStore();

  try {
    const raw = await readFile(dataFile, "utf8");
    return JSON.parse(raw) as AppData;
  } catch {
    const seeded = seedData();
    await writeStore(seeded);
    return seeded;
  }
});

export async function writeStore(data: AppData) {
  if (hasRelationalStore()) {
    await writePrismaStore(data);
    return;
  }

  if (hasSupabaseStore()) {
    await writeSupabaseStore(data);
    return;
  }

  await mkdir(dataDir, { recursive: true });
  const tmp = `${dataFile}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2));
  await rename(tmp, dataFile);
}

export async function updateStore(mutator: (data: AppData) => void | AppData | Promise<void | AppData>) {
  const data = await readStore();
  const result = await mutator(data);
  const next = result ?? data;
  await writeStore(next);
  return next;
}

export async function readUserById(id: string) {
  if (!hasRelationalStore()) {
    const data = await readStore();
    return data.users.find((user) => user.id === id) ?? null;
  }

  return getPrisma().user.findUnique({ where: { id } }).then((user) => user ? toUser(user) : null);
}

export async function readUserByEmail(email: string) {
  if (!hasRelationalStore()) {
    const data = await readStore();
    return data.users.find((user) => user.email === email) ?? null;
  }

  return getPrisma().user.findUnique({ where: { email } }).then((user) => user ? toUser(user) : null);
}

export async function readSettings(): Promise<StoreSettings> {
  if (!hasRelationalStore()) {
    const data = await readStore();
    return data.settings;
  }

  const storeSetting = await getPrisma().setting.findUnique({ where: { key: "store" } });
  return (storeSetting?.value as StoreSettings | null) ?? settings;
}

export async function readServices() {
  if (!hasRelationalStore()) {
    const data = await readStore();
    return data.services;
  }

  const rows = await getPrisma().service.findMany({
    orderBy: [{ isActive: "desc" }, { category: "asc" }, { name: "asc" }]
  });
  return rows.map(toService);
}

export async function readUsers() {
  if (!hasRelationalStore()) {
    const data = await readStore();
    return data.users;
  }

  const rows = await getPrisma().user.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toUser);
}

export async function readExpenses() {
  if (!hasRelationalStore()) {
    const data = await readStore();
    return data.expenses;
  }

  const rows = await getPrisma().expense.findMany({
    take: 500,
    orderBy: { date: "desc" }
  });
  return rows.map(toExpense);
}

export async function readTransactions(limit = 500) {
  if (!hasRelationalStore()) {
    const data = await readStore();
    return data.transactions.slice(0, limit);
  }

  const rows = await getPrisma().transaction.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      cashier: true,
      items: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { paidAt: "asc" } }
    }
  });
  return rows.map(toTransaction);
}

export async function readTransactionById(id: string) {
  if (!hasRelationalStore()) {
    const data = await readStore();
    return data.transactions.find((transaction) => transaction.id === id) ?? null;
  }

  const row = await getPrisma().transaction.findUnique({
    where: { id },
    include: {
      customer: true,
      cashier: true,
      items: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { paidAt: "asc" } }
    }
  });
  return row ? toTransaction(row) : null;
}

export async function readCashierData() {
  if (!hasRelationalStore()) {
    const data = await readStore();
    return {
      customers: data.customers,
      services: data.services,
      settings: data.settings,
      users: data.users
    };
  }

  const prisma = getPrisma();
  const [dbCustomers, dbServices, storeSetting, dbUsers] = await Promise.all([
    prisma.customer.findMany({ take: 300, orderBy: { updatedAt: "desc" } }),
    prisma.service.findMany({ where: { isActive: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.setting.findUnique({ where: { key: "store" } }),
    prisma.user.findMany({ where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } })
  ]);

  return {
    customers: dbCustomers.map(toCustomer),
    services: dbServices.map(toService),
    settings: (storeSetting?.value as StoreSettings | null) ?? settings,
    users: dbUsers.map(toUser)
  };
}

export async function readCustomersData() {
  if (!hasRelationalStore()) {
    const data = await readStore();
    return { customers: data.customers, transactions: data.transactions };
  }

  const [dbCustomers, dbTransactions] = await Promise.all([
    getPrisma().customer.findMany({ take: 500, orderBy: { updatedAt: "desc" } }),
    getPrisma().transaction.findMany({
      take: 700,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        cashier: true,
        items: { orderBy: { createdAt: "asc" } },
        payments: { orderBy: { paidAt: "asc" } }
      }
    })
  ]);

  return {
    customers: dbCustomers.map(toCustomer),
    transactions: dbTransactions.map(toTransaction)
  };
}

export async function readCustomerDetailData(id: string) {
  if (!hasRelationalStore()) {
    const data = await readStore();
    const customer = data.customers.find((row) => row.id === id) ?? data.customers[0];
    return {
      customer,
      transactions: data.transactions.filter((transaction) => transaction.customerId === customer?.id)
    };
  }

  const [customer, transactionRows] = await Promise.all([
    getPrisma().customer.findUnique({ where: { id } }),
    getPrisma().transaction.findMany({
      where: { customerId: id },
      take: 300,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        cashier: true,
        items: { orderBy: { createdAt: "asc" } },
        payments: { orderBy: { paidAt: "asc" } }
      }
    })
  ]);

  return {
    customer: customer ? toCustomer(customer) : null,
    transactions: transactionRows.map(toTransaction)
  };
}

export async function readReportData(limit = 1000) {
  if (!hasRelationalStore()) {
    const data = await readStore();
    return {
      expenses: data.expenses,
      settings: data.settings,
      transactions: data.transactions.slice(0, limit)
    };
  }

  const prisma = getPrisma();
  const [dbExpenses, storeSetting, dbTransactions] = await Promise.all([
    prisma.expense.findMany({ take: 500, orderBy: { date: "desc" } }),
    prisma.setting.findUnique({ where: { key: "store" } }),
    prisma.transaction.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        cashier: true,
        items: { orderBy: { createdAt: "asc" } },
        payments: { orderBy: { paidAt: "asc" } }
      }
    })
  ]);

  return {
    expenses: dbExpenses.map(toExpense),
    settings: (storeSetting?.value as StoreSettings | null) ?? settings,
    transactions: dbTransactions.map(toTransaction)
  };
}

export async function readCapitalPlan(): Promise<CapitalPlan> {
  if (!hasRelationalStore()) {
    try {
      const raw = await readFile(capitalPlanFile, "utf8");
      return normalizeCapitalPlan(JSON.parse(raw));
    } catch {
      const seeded = defaultCapitalPlan();
      await writeCapitalPlan(seeded);
      return seeded;
    }
  }

  const row = await getPrisma().setting.findUnique({ where: { key: "capital-plan" } });
  return normalizeCapitalPlan(row?.value);
}

export async function writeCapitalPlan(plan: CapitalPlan) {
  const normalized = normalizeCapitalPlan(plan);

  if (!hasRelationalStore()) {
    await mkdir(dataDir, { recursive: true });
    const tmp = `${capitalPlanFile}.tmp`;
    await writeFile(tmp, JSON.stringify(normalized, null, 2));
    await rename(tmp, capitalPlanFile);
    return normalized;
  }

  await getPrisma().setting.upsert({
    where: { key: "capital-plan" },
    update: { value: normalized },
    create: { key: "capital-plan", value: normalized }
  });
  return normalized;
}

function normalizeCapitalPlan(value: unknown): CapitalPlan {
  const fallback = defaultCapitalPlan();
  if (!value || typeof value !== "object") return fallback;

  const plan = value as Partial<CapitalPlan>;
  const rawAssumptions = (plan.assumptions ?? fallback.assumptions) as Partial<CapitalPlan["assumptions"]> & {
    targetDailyRevenue?: number;
    variableCostPercent?: number;
    monthlyFixedCost?: number;
    sellingPrice?: number;
    fixedCosts?: Record<string, number>;
  };
  const legacySellingPrice = Number(rawAssumptions.sellingPrice || 9000);
  const legacyTargetDailyVolume = rawAssumptions.targetDailyRevenue ? Math.max(1, Math.round(Number(rawAssumptions.targetDailyRevenue) / Math.max(1, legacySellingPrice))) : fallback.assumptions.targetDailyVolume;

  return {
    items: Array.isArray(plan.items)
      ? plan.items.map((item) => ({
          id: String(item.id || `cap-${Date.now()}`),
          name: String(item.name || "Modal"),
          category: String(item.category || "Lainnya"),
          amount: Number(item.amount || 0),
          quantity: Number(item.quantity || 1),
          purchasedAt: item.purchasedAt || new Date().toISOString(),
          notes: item.notes || undefined
        }))
      : fallback.items,
    assumptions: {
      workingDaysPerMonth: Number(rawAssumptions.workingDaysPerMonth || fallback.assumptions.workingDaysPerMonth),
      targetDailyVolume: Number(rawAssumptions.targetDailyVolume || legacyTargetDailyVolume),
      primaryServiceId: rawAssumptions.primaryServiceId || fallback.assumptions.primaryServiceId
    }
  };
}

export async function readShellData(user: User): Promise<ShellData> {
  if (!hasRelationalStore()) {
    const { settings, transactions } = await readStore();
    return { settings, transactions };
  }

  const prisma = getPrisma();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const ownerFilter = user.role === "OWNER" ? {} : { cashierId: user.id };
  const [storeSetting, notificationRows] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "store" } }),
    prisma.transaction.findMany({
      where: {
        ...ownerFilter,
        OR: [
          { laundryStatus: "READY_FOR_PICKUP" },
          { paymentStatus: { in: ["UNPAID", "PARTIAL"] } },
          { laundryStatus: { in: ["NEW", "PROCESSING"] }, estimatedDoneAt: { lte: todayEnd } },
          { createdAt: { gte: todayStart, lte: todayEnd } }
        ]
      },
      take: 80,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        cashier: true,
        items: { orderBy: { createdAt: "asc" } },
        payments: { orderBy: { paidAt: "asc" } }
      }
    })
  ]);

  return {
    settings: (storeSetting?.value as StoreSettings | null) ?? settings,
    transactions: notificationRows.map(toTransaction)
  };
}

async function requestSupabase(pathname: string, init?: RequestInit) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${pathname}`, {
    ...init,
    headers: {
      apikey: supabaseKey!,
      authorization: `Bearer ${supabaseKey}`,
      "content-type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase store error: ${response.status} ${message}`);
  }

  return response;
}

async function readSupabaseStore(): Promise<AppData> {
  const response = await requestSupabase(`${supabaseTable}?select=data&key=eq.${encodeURIComponent(storeKey)}&limit=1`);
  const rows = (await response.json()) as { data: AppData }[];
  if (rows[0]?.data) return rows[0].data;

  const seeded = seedData();
  await writeSupabaseStore(seeded);
  return seeded;
}

async function writeSupabaseStore(data: AppData) {
  await requestSupabase(supabaseTable, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ key: storeKey, data, updated_at: new Date().toISOString() })
  });
}

function iso(value?: string | Date | null) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

function asDate(value?: string | Date | null) {
  return value ? new Date(value) : undefined;
}

function asNumber(value: unknown) {
  return Number(value ?? 0);
}

const materialCoveragePattern = /\s*\[materialCoverageKg:([0-9]+(?:\.[0-9]+)?)\]\s*$/;

function decodeExpenseDescription(description: string) {
  const match = description.match(materialCoveragePattern);
  return {
    description: description.replace(materialCoveragePattern, ""),
    materialCoverageKg: match ? Number(match[1]) : undefined
  };
}

function encodeExpenseDescription(description: string, materialCoverageKg?: number) {
  const clean = description.replace(materialCoveragePattern, "");
  return materialCoverageKg && materialCoverageKg > 0 ? `${clean} [materialCoverageKg:${materialCoverageKg}]` : clean;
}

function toUser(row: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: User["role"];
  status: User["status"];
}): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    role: row.role,
    status: row.status
  };
}

function toCustomer(row: {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function toService(row: {
  id: string;
  name: string;
  category: string;
  unit: LaundryService["unit"];
  price: unknown;
  cost: unknown | null;
  estimatedDuration: string | null;
  isActive: boolean;
}): LaundryService {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    price: asNumber(row.price),
    cost: asNumber(row.cost),
    estimatedDuration: row.estimatedDuration ?? "",
    isActive: row.isActive
  };
}

function toExpense(row: {
  id: string;
  date: Date;
  category: string;
  description: string;
  amount: unknown;
  paymentMethod: Expense["paymentMethod"];
  proofImage: string | null;
  createdBy: string;
}): Expense {
  const decoded = decodeExpenseDescription(row.description);
  return {
    id: row.id,
    date: row.date.toISOString(),
    category: row.category,
    description: decoded.description,
    amount: asNumber(row.amount),
    materialCoverageKg: decoded.materialCoverageKg,
    paymentMethod: row.paymentMethod,
    proofImage: row.proofImage ?? undefined,
    createdBy: row.createdBy
  };
}

export function toTransaction(row: any): Transaction {
  return {
    id: row.id,
    transactionNumber: row.transactionNumber,
    customerId: row.customerId,
    cashierId: row.cashierId,
    customer: toCustomer(row.customer),
    cashier: toUser(row.cashier),
    items: row.items.map((item: any) => ({
      id: item.id,
      serviceId: item.serviceId ?? "",
      serviceName: item.serviceName,
      unit: item.unit,
      quantity: asNumber(item.quantity),
      price: asNumber(item.price),
      cost: asNumber(item.cost),
      subtotal: asNumber(item.subtotal),
      notes: item.notes ?? undefined
    })),
    payments: row.payments.map((payment: any) => ({
      id: payment.id,
      transactionId: payment.transactionId,
      paymentMethod: payment.paymentMethod,
      amount: asNumber(payment.amount),
      paidAt: payment.paidAt.toISOString(),
      referenceNumber: payment.referenceNumber ?? undefined,
      notes: payment.notes ?? undefined,
      createdBy: payment.createdBy
    })),
    subtotal: asNumber(row.subtotal),
    discount: asNumber(row.discount),
    additionalFee: asNumber(row.additionalFee),
    tax: asNumber(row.tax),
    grandTotal: asNumber(row.grandTotal),
    paidAmount: asNumber(row.paidAmount),
    changeAmount: asNumber(row.changeAmount),
    paymentStatus: row.paymentStatus,
    laundryStatus: row.laundryStatus,
    estimatedDoneAt: iso(row.estimatedDoneAt),
    completedAt: iso(row.completedAt),
    pickedUpAt: iso(row.pickedUpAt),
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    cancelledAt: iso(row.cancelledAt),
    cancelReason: row.cancelReason ?? undefined
  };
}

async function readPrismaStore(): Promise<AppData> {
  const prisma = getPrisma();
  const userCount = await prisma.user.count();

  if (userCount === 0) {
    const legacy = hasSupabaseStore() ? await readSupabaseStore().catch(() => null) : null;
    await writePrismaStore(legacy ?? seedData());
  }

  const [dbUsers, dbCustomers, dbServices, dbTransactions, dbExpenses, storeSetting] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.customer.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.service.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        cashier: true,
        items: { orderBy: { createdAt: "asc" } },
        payments: { orderBy: { paidAt: "asc" } }
      }
    }),
    prisma.expense.findMany({ orderBy: { date: "desc" } }),
    prisma.setting.findUnique({ where: { key: "store" } })
  ]);

  return {
    users: dbUsers.map(toUser),
    customers: dbCustomers.map(toCustomer),
    services: dbServices.map(toService),
    transactions: dbTransactions.map(toTransaction),
    expenses: dbExpenses.map(toExpense),
    settings: (storeSetting?.value as StoreSettings | null) ?? settings
  };
}

async function writePrismaStore(data: AppData) {
  const prisma = getPrisma();
  const userIds = new Set(data.users.map((user) => user.id));
  const fallbackUser = data.users[0] ?? users[0];
  const extraUsers = new Map<string, User>();

  for (const transaction of data.transactions) {
    if (!userIds.has(transaction.cashierId)) extraUsers.set(transaction.cashierId, { ...fallbackUser, id: transaction.cashierId, email: `${transaction.cashierId}@laundry.local`, name: transaction.cashier?.name ?? "System", role: "CASHIER" });
    for (const payment of transaction.payments) {
      if (!userIds.has(payment.createdBy)) extraUsers.set(payment.createdBy, { ...fallbackUser, id: payment.createdBy, email: `${payment.createdBy}@laundry.local`, name: "System", role: "CASHIER" });
    }
  }

  for (const expense of data.expenses) {
    if (!userIds.has(expense.createdBy)) extraUsers.set(expense.createdBy, { ...fallbackUser, id: expense.createdBy, email: `${expense.createdBy}@laundry.local`, name: "System", role: "OWNER" });
  }

  const allUsers = [...data.users, ...extraUsers.values()];

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany();
    await tx.payment.deleteMany();
    await tx.transactionItem.deleteMany();
    await tx.transaction.deleteMany();
    await tx.expense.deleteMany();
    await tx.qrisAsset.deleteMany();
    await tx.receiptTemplate.deleteMany();
    await tx.service.deleteMany();
    await tx.customer.deleteMany();
    await tx.setting.deleteMany();
    await tx.user.deleteMany();

    await tx.user.createMany({
      data: allUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone ?? null,
        passwordHash: "password",
        role: user.role,
        status: user.status
      })),
      skipDuplicates: true
    });

    await tx.customer.createMany({
      data: data.customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address ?? null,
        notes: customer.notes ?? null,
        createdAt: asDate(customer.createdAt) ?? new Date(),
        updatedAt: asDate(customer.updatedAt) ?? new Date()
      })),
      skipDuplicates: true
    });

    await tx.service.createMany({
      data: data.services.map((service) => ({
        id: service.id,
        name: service.name,
        category: service.category,
        unit: service.unit,
        price: service.price,
        cost: service.cost ?? 0,
        estimatedDuration: service.estimatedDuration ?? null,
        isActive: service.isActive
      })),
      skipDuplicates: true
    });

    await tx.setting.create({
      data: {
        key: "store",
        value: data.settings
      }
    });

    for (const expense of data.expenses) {
      await tx.expense.create({
        data: {
          id: expense.id,
          date: asDate(expense.date) ?? new Date(),
          category: expense.category,
          description: encodeExpenseDescription(expense.description, expense.materialCoverageKg),
          amount: expense.amount,
          paymentMethod: expense.paymentMethod,
          proofImage: expense.proofImage ?? null,
          createdBy: expense.createdBy
        }
      });
    }

    for (const transaction of data.transactions) {
      await tx.transaction.create({
        data: {
          id: transaction.id,
          transactionNumber: transaction.transactionNumber,
          customerId: transaction.customerId,
          cashierId: transaction.cashierId,
          subtotal: transaction.subtotal,
          discount: transaction.discount,
          additionalFee: transaction.additionalFee,
          tax: transaction.tax,
          grandTotal: transaction.grandTotal,
          paidAmount: transaction.paidAmount,
          changeAmount: transaction.changeAmount,
          paymentStatus: transaction.paymentStatus,
          laundryStatus: transaction.laundryStatus,
          estimatedDoneAt: asDate(transaction.estimatedDoneAt),
          completedAt: asDate(transaction.completedAt),
          pickedUpAt: asDate(transaction.pickedUpAt),
          notes: transaction.notes ?? null,
          createdAt: asDate(transaction.createdAt) ?? new Date(),
          updatedAt: asDate(transaction.updatedAt) ?? new Date(),
          cancelledAt: asDate(transaction.cancelledAt),
          cancelReason: transaction.cancelReason ?? null,
          items: {
            create: transaction.items.map((item) => ({
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
            create: transaction.payments.map((payment) => ({
              id: payment.id,
              paymentMethod: payment.paymentMethod,
              amount: payment.amount,
              paidAt: asDate(payment.paidAt) ?? new Date(),
              referenceNumber: payment.referenceNumber ?? null,
              notes: payment.notes ?? null,
              createdBy: payment.createdBy
            }))
          }
        }
      });
    }
  });
}
