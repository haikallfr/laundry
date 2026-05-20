import type { Customer, Expense, LaundryService, StoreSettings, Transaction, User } from "@/types";
import { generateTransactionNumber } from "@/lib/utils";

const now = new Date();
const day = 86_400_000;

export const users: User[] = [
  { id: "usr-owner", name: "Nadia Owner", email: "owner@laundrypro.test", phone: "081234567890", role: "OWNER", status: "ACTIVE" },
  { id: "usr-cashier", name: "Rafi Kasir", email: "kasir@laundrypro.test", phone: "081298765432", role: "CASHIER", status: "ACTIVE" }
];

export const customers: Customer[] = [
  { id: "cus-1", name: "Budi Santoso", phone: "0811111111", address: "Jl. Melati No. 8", notes: "Minta parfum soft", createdAt: new Date(now.getTime() - day * 20).toISOString(), updatedAt: now.toISOString() },
  { id: "cus-2", name: "Dewi Lestari", phone: "0822222222", address: "Jl. Anggrek No. 12", notes: "Langganan express", createdAt: new Date(now.getTime() - day * 12).toISOString(), updatedAt: now.toISOString() },
  { id: "cus-3", name: "Andi Wijaya", phone: "0833333333", address: "Komplek Somba Opu", notes: "", createdAt: new Date(now.getTime() - day * 5).toISOString(), updatedAt: now.toISOString() },
  { id: "cus-4", name: "Siti Rahmah", phone: "0844444444", address: "Jl. Veteran", notes: "Hubungi sebelum antar", createdAt: new Date(now.getTime() - day * 2).toISOString(), updatedAt: now.toISOString() }
];

export const services: LaundryService[] = [
  { id: "srv-1", name: "Cuci Kering", category: "Reguler", unit: "KG", price: 7000, cost: 0, estimatedDuration: "2 hari", isActive: true },
  { id: "srv-2", name: "Cuci Setrika", category: "Reguler", unit: "KG", price: 9000, cost: 0, estimatedDuration: "2 hari", isActive: true },
  { id: "srv-3", name: "Setrika Saja", category: "Reguler", unit: "KG", price: 6000, cost: 0, estimatedDuration: "1 hari", isActive: true },
  { id: "srv-4", name: "Laundry Express", category: "Express", unit: "KG", price: 15000, cost: 0, estimatedDuration: "8 jam", isActive: true },
  { id: "srv-5", name: "Bed Cover", category: "Household", unit: "PCS", price: 35000, cost: 0, estimatedDuration: "3 hari", isActive: true },
  { id: "srv-6", name: "Sepatu", category: "Special Care", unit: "PCS", price: 45000, cost: 0, estimatedDuration: "3 hari", isActive: true },
  { id: "srv-7", name: "Karpet", category: "Household", unit: "METER", price: 18000, cost: 0, estimatedDuration: "4 hari", isActive: true },
  { id: "srv-8", name: "Boneka", category: "Special Care", unit: "PCS", price: 25000, cost: 0, estimatedDuration: "2 hari", isActive: true },
  { id: "srv-9", name: "Jas", category: "Premium", unit: "PCS", price: 55000, cost: 0, estimatedDuration: "3 hari", isActive: true }
];

function makeTransaction(index: number, customerIndex: number, cashier = users[1]): Transaction {
  const created = new Date(now.getTime() - day * index);
  const service = services[index % services.length];
  const second = services[(index + 2) % services.length];
  const qty = service.unit === "KG" ? 3.5 + (index % 4) : 1 + (index % 2);
  const qty2 = second.unit === "KG" ? 2 : 1;
  const items = [
    {
      id: `item-${index}-1`,
      serviceId: service.id,
      serviceName: service.name,
      unit: service.unit,
      quantity: qty,
      price: service.price,
      cost: 0,
      subtotal: qty * service.price,
      notes: index % 3 === 0 ? "Pisahkan baju putih" : ""
    },
    {
      id: `item-${index}-2`,
      serviceId: second.id,
      serviceName: second.name,
      unit: second.unit,
      quantity: qty2,
      price: second.price,
      cost: 0,
      subtotal: qty2 * second.price,
      notes: ""
    }
  ];
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const discount = index % 5 === 0 ? 5000 : 0;
  const additionalFee = index % 4 === 0 ? 3000 : 0;
  const tax = 0;
  const grandTotal = subtotal - discount + additionalFee + tax;
  const partial = index % 6 === 0;
  const paidAmount = index % 7 === 0 ? 0 : partial ? Math.round(grandTotal / 2) : grandTotal;
  return {
    id: `trx-${index}`,
    transactionNumber: generateTransactionNumber(index + 1, created),
    customerId: customers[customerIndex].id,
    cashierId: cashier.id,
    customer: customers[customerIndex],
    cashier,
    items,
    payments: paidAmount > 0 ? [{
      id: `pay-${index}`,
      transactionId: `trx-${index}`,
      paymentMethod: index % 4 === 0 ? "QRIS" : index % 3 === 0 ? "BANK_TRANSFER" : index % 5 === 0 ? "EWALLET" : "CASH",
      amount: paidAmount,
      paidAt: created.toISOString(),
      createdBy: cashier.id
    }] : [],
    subtotal,
    discount,
    additionalFee,
    tax,
    grandTotal,
    paidAmount,
    changeAmount: Math.max(0, paidAmount - grandTotal),
    paymentStatus: paidAmount <= 0 ? "UNPAID" : paidAmount < grandTotal ? "PARTIAL" : "PAID",
    laundryStatus: index % 5 === 0 ? "READY_FOR_PICKUP" : index % 4 === 0 ? "DONE" : index % 3 === 0 ? "PROCESSING" : "PICKED_UP",
    estimatedDoneAt: new Date(created.getTime() + day * 2).toISOString(),
    notes: index % 4 === 0 ? "Prioritaskan pelanggan ambil sore" : "",
    createdAt: created.toISOString(),
    updatedAt: created.toISOString()
  };
}

export const transactions: Transaction[] = Array.from({ length: 34 }, (_, i) => makeTransaction(i, i % customers.length));

export const expenses: Expense[] = [
  { id: "exp-1", date: new Date(now.getFullYear(), now.getMonth(), 2).toISOString(), category: "Gaji karyawan", description: "Gaji kasir dan operator", amount: 4500000, paymentMethod: "BANK_TRANSFER", createdBy: "usr-owner" },
  { id: "exp-2", date: new Date(now.getFullYear(), now.getMonth(), 4).toISOString(), category: "Deterjen", description: "Stok deterjen 25 kg", amount: 950000, paymentMethod: "CASH", createdBy: "usr-owner" },
  { id: "exp-3", date: new Date(now.getFullYear(), now.getMonth(), 8).toISOString(), category: "Listrik", description: "Token listrik bulan berjalan", amount: 1200000, paymentMethod: "EWALLET", createdBy: "usr-owner" },
  { id: "exp-4", date: new Date(now.getFullYear(), now.getMonth(), 12).toISOString(), category: "Maintenance mesin", description: "Servis pengering", amount: 650000, paymentMethod: "CASH", createdBy: "usr-owner" }
];

export const settings: StoreSettings = {
  storeName: "LaundryPro Makassar",
  address: "Jl. Boulevard Raya No. 17, Makassar",
  whatsapp: "0812-3456-7890",
  receiptWidth: 58,
  taxRate: 0,
  qrisUrl: "/qris-demo.svg"
};
