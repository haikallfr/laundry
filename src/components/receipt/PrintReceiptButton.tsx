"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { buildEscposReceipt, writeEscposReceipt } from "@/components/receipt/ReceiptPrintLayout";
import type { BluetoothNavigator } from "@/components/receipt/ReceiptPrintLayout";
import type { StoreSettings, Transaction } from "@/types";

type PrintReceiptButtonProps = {
  transaction: Transaction;
  settings: StoreSettings;
  label?: string;
  printingLabel?: string;
  className?: string;
  iconClassName?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  onError?: (message: string) => void;
};

export function PrintReceiptButton({
  transaction,
  settings,
  label = "Print nota",
  printingLabel = "Print...",
  className,
  iconClassName = "h-4 w-4",
  variant = "primary",
  size = "md",
  onError,
}: PrintReceiptButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  async function printReceipt() {
    onError?.("");

    const bluetooth = (navigator as BluetoothNavigator).bluetooth;
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (!bluetooth) {
      // Fallback ke cetak biasa via browser
      window.open(`/print/receipt/${transaction.id}`, '_blank');
      return;
    }

    setIsPrinting(true);

    try {
      await writeEscposReceipt(bluetooth, buildEscposReceipt(transaction, settings));
    } catch (error) {
      const msg = error instanceof Error ? error.message : (error as any)?.message || String(error);
      handleError(`Gagal: ${msg}`);
    } finally {
      setIsPrinting(false);
    }
  }

  function handleError(message: string) {
    if (onError) onError(message);
    else window.alert(message);
  }

  return (
    <Button type="button" className={className} variant={variant} size={size} disabled={isPrinting} onClick={printReceipt}>
      <Printer className={iconClassName} />
      {isPrinting ? printingLabel : label}
    </Button>
  );
}
