export const dynamic = 'force-dynamic';

import { ReceiptPrintLayout } from "@/components/receipt/ReceiptPrintLayout";
import { readStore } from "@/lib/store";

export default async function PrintReceiptPage({ params }: { params: Promise<{ transaction_id: string }> }) {
  const { transaction_id } = await params;
  const { settings, transactions } = await readStore();
  const transaction = transactions.find((trx) => trx.id === transaction_id) ?? transactions[0];
  return <ReceiptPrintLayout transaction={transaction} settings={settings} />;
}
