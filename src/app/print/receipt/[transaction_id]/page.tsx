export const dynamic = 'force-dynamic';

import { ReceiptPrintLayout } from "@/components/receipt/ReceiptPrintLayout";
import { readSettings, readTransactionById } from "@/lib/store";

export default async function PrintReceiptPage({ params }: { params: Promise<{ transaction_id: string }> }) {
  const { transaction_id } = await params;
  const [settings, transaction] = await Promise.all([readSettings(), readTransactionById(transaction_id)]);
  if (!transaction) return null;
  return <ReceiptPrintLayout transaction={transaction} settings={settings} />;
}
