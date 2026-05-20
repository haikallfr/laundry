"use client";

import { useMemo, useState } from "react";
import { CustomerTable } from "@/components/tables/CustomerTable";
import type { Customer, Transaction } from "@/types";

export function CustomerList({ customers, transactions }: { customers: Customer[]; transactions: Transaction[] }) {
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState("");
  const filtered = useMemo(() => customers.filter((customer) => {
    const rows = transactions.filter((trx) => trx.customerId === customer.id);
    const q = query.toLowerCase();
    const matchesQuery = !q || `${customer.name} ${customer.phone}`.toLowerCase().includes(q);
    const receivable = rows.reduce((sum, trx) => sum + Math.max(0, trx.grandTotal - trx.paidAmount), 0);
    const matchesSegment = !segment || (segment === "repeat" && rows.length > 1) || (segment === "receivable" && receivable > 0);
    return matchesQuery && matchesSegment;
  }), [customers, query, segment, transactions]);

  return (
    <>
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_130px] gap-2 md:mb-4 md:grid-cols-3 md:gap-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 rounded-lg border border-line px-3 text-xs md:col-span-2 md:h-10 md:text-sm" placeholder="Cari nama / HP" />
        <select value={segment} onChange={(e) => setSegment(e.target.value)} className="h-9 rounded-lg border border-line px-2 text-xs md:h-10 md:px-3 md:text-sm">
          <option value="">Semua</option>
          <option value="repeat">Repeat</option>
          <option value="receivable">Piutang</option>
        </select>
      </div>
      <CustomerTable customers={filtered} transactions={transactions} />
    </>
  );
}
