"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { LaundryStatus } from "@/types";

const statuses: Array<{ value: LaundryStatus; label: string }> = [
  { value: "NEW", label: "Baru masuk" },
  { value: "PROCESSING", label: "Diproses" },
  { value: "DONE", label: "Selesai" },
  { value: "READY_FOR_PICKUP", label: "Siap diambil" },
  { value: "PICKED_UP", label: "Sudah diambil" },
  { value: "CANCELLED", label: "Dibatalkan" }
];

export function TransactionStatusActions({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState("");

  async function updateStatus(status: LaundryStatus) {
    setSaving(status);
    await fetch(`/api/transactions/${transactionId}/laundry-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ laundryStatus: status })
    });
    setSaving("");
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {statuses.map((status) => (
        <Button key={status.value} variant="secondary" size="sm" disabled={saving === status.value} onClick={() => updateStatus(status.value)}>
          {saving === status.value ? "Menyimpan..." : status.label}
        </Button>
      ))}
    </div>
  );
}
