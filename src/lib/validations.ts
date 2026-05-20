import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const customerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().trim().optional().default(""),
  address: z.string().optional(),
  notes: z.string().optional()
});

export const transactionItemSchema = z.object({
  serviceId: z.string(),
  serviceName: z.string(),
  unit: z.enum(["KG", "PCS", "PACKAGE", "METER"]),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  cost: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
  notes: z.string().optional()
});

export const transactionSchema = z.object({
  customer: customerSchema,
  items: z.array(transactionItemSchema).min(1),
  discount: z.number().nonnegative().default(0),
  additionalFee: z.number().nonnegative().default(0),
  tax: z.number().nonnegative().default(0),
  paidAmount: z.number().nonnegative().default(0),
  paymentMethod: z.enum(["CASH", "QRIS", "BANK_TRANSFER", "EWALLET", "SPLIT"]),
  notes: z.string().optional()
});
