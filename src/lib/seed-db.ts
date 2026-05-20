import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { getPrisma } from "./prisma";

loadLocalEnv();

const prisma = getPrisma();

const defaultStore = {
  storeName: "LaundryPro Makassar",
  address: "Jl. Boulevard Raya No. 17, Makassar",
  whatsapp: "0812-3456-7890",
  receiptWidth: 58,
  taxRate: 0,
  qrisUrl: "/qris-demo.svg"
};

const defaultOutlet = {
  id: "outlet-main",
  name: "Outlet Utama",
  code: "MAIN",
  address: defaultStore.address,
  whatsapp: defaultStore.whatsapp,
  isMain: true,
  isActive: true
};

const defaultServices = [
  {
    id: "srv-cuci-kering",
    name: "Cuci Kering",
    category: "Reguler",
    unit: "KG" as const,
    price: 7000,
    cost: 0,
    estimatedDuration: "2 hari",
    isActive: true
  },
  {
    id: "srv-cuci-setrika",
    name: "Cuci Setrika",
    category: "Reguler",
    unit: "KG" as const,
    price: 9000,
    cost: 0,
    estimatedDuration: "2 hari",
    isActive: true
  },
  {
    id: "srv-setrika",
    name: "Setrika Saja",
    category: "Reguler",
    unit: "KG" as const,
    price: 6000,
    cost: 0,
    estimatedDuration: "1 hari",
    isActive: true
  },
  {
    id: "srv-express",
    name: "Laundry Express",
    category: "Express",
    unit: "KG" as const,
    price: 15000,
    cost: 0,
    estimatedDuration: "8 jam",
    isActive: true
  },
  {
    id: "srv-bed-cover",
    name: "Bed Cover",
    category: "Household",
    unit: "PCS" as const,
    price: 35000,
    cost: 0,
    estimatedDuration: "3 hari",
    isActive: true
  },
  {
    id: "srv-sepatu",
    name: "Cuci Sepatu",
    category: "Special Care",
    unit: "PCS" as const,
    price: 45000,
    cost: 0,
    estimatedDuration: "3 hari",
    isActive: true
  },
  {
    id: "srv-karpet",
    name: "Cuci Karpet",
    category: "Household",
    unit: "METER" as const,
    price: 18000,
    cost: 0,
    estimatedDuration: "4 hari",
    isActive: true
  },
  {
    id: "srv-boneka",
    name: "Cuci Boneka",
    category: "Special Care",
    unit: "PCS" as const,
    price: 25000,
    cost: 0,
    estimatedDuration: "2 hari",
    isActive: true
  }
];

function loadLocalEnv() {
  for (const file of [".env.local", ".env"]) {
    const fullPath = path.join(process.cwd(), file);
    if (!existsSync(fullPath)) continue;

    for (const line of readFileSync(fullPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator <= 0) continue;

      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      const value = rawValue.replace(/^["']|["']$/g, "");
      process.env[key] ??= value;
    }
  }
}

async function main() {
  const owner = await prisma.user.findFirst({
    where: { role: "OWNER", status: "ACTIVE" },
    orderBy: { createdAt: "asc" }
  });

  if (!owner) {
    throw new Error("Owner aktif tidak ditemukan. Seed user OWNER terlebih dahulu sebelum menjalankan seed default toko.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.setting.upsert({
      where: { key: "store" },
      update: { value: defaultStore },
      create: { key: "store", value: defaultStore }
    });

    await tx.setting.upsert({
      where: { key: "outlet:main" },
      update: { value: { ...defaultOutlet, ownerId: owner.id } },
      create: { key: "outlet:main", value: { ...defaultOutlet, ownerId: owner.id } }
    });

    await tx.service.createMany({
      data: defaultServices,
      skipDuplicates: true
    });

    await tx.auditLog.createMany({
      data: [
        {
          userId: owner.id,
          action: "SEED_DEFAULT_STORE",
          entityType: "settings",
          entityId: "store",
          newValue: defaultStore
        },
        {
          userId: owner.id,
          action: "SEED_DEFAULT_OUTLET",
          entityType: "settings",
          entityId: "outlet:main",
          newValue: { ...defaultOutlet, ownerId: owner.id }
        },
        ...defaultServices.map((service) => ({
          userId: owner.id,
          action: "SEED_DEFAULT_SERVICE",
          entityType: "services",
          entityId: service.id,
          newValue: service
        }))
      ]
    });
  });

  console.log("Default toko, outlet utama, dan layanan berhasil di-seed.", {
    ownerId: owner.id,
    store: defaultStore.storeName,
    outlet: defaultOutlet.name,
    services: defaultServices.length
  });
}

main()
  .catch((error) => {
    console.error("Failed to seed default data:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
