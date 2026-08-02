"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteTransactionButton({ transactionId }: { transactionId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!window.confirm("Yakin ingin menghapus transaksi ini? Aksi ini tidak dapat dibatalkan.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Gagal menghapus transaksi.");
      }

      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 md:h-auto md:w-auto md:border-0 md:bg-transparent md:p-0 md:font-semibold md:hover:bg-transparent md:hover:underline"
      title="Hapus Transaksi"
    >
      <span className="md:hidden"><Trash2 className="h-4 w-4" /></span>
      <span className="hidden md:inline">{isDeleting ? "Menghapus..." : "Hapus"}</span>
    </button>
  );
}
