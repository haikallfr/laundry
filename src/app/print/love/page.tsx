"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { writeEscposReceipt } from "@/components/receipt/ReceiptPrintLayout";
import type { BluetoothNavigator } from "@/components/receipt/ReceiptPrintLayout";

export default function PrintLovePage() {
  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState(false);
  const [customText, setCustomText] = useState("I LOVE U");

  async function printBluetooth() {
    const bluetooth = (navigator as BluetoothNavigator).bluetooth;
    if (!bluetooth) {
      alert("Browser ini belum mendukung Web Bluetooth.");
      return;
    }

    setIsBluetoothPrinting(true);
    try {
      // ESC/POS Commands:
      // \x1b\x61\x01 -> Rata Tengah (Center)
      // \x1b\x56\x01 -> Rotasi 90 derajat (Landscape mode on thermal)
      // \x1d\x21\x22 -> Ukuran 3x
      
      const text = `\x1b\x61\x01\x1b\x56\x01\x1d\x21\x22\n\n${customText}\n\n\n\n\n\n\x1b\x56\x00\x1d\x21\x00`;
      await writeEscposReceipt(bluetooth, text);
    } catch (error) {
      alert("Gagal: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsBluetoothPrinting(false);
    }
  }

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center p-4">
      <div className="no-print mt-12 w-full max-w-2xl flex flex-col items-center gap-6 z-10">
        <input 
          type="text" 
          value={customText} 
          onChange={(e) => setCustomText(e.target.value)} 
          className="w-full text-center text-3xl font-bold py-4 px-6 rounded-2xl border-4 border-pink-300 focus:border-pink-500 focus:outline-none shadow-xl text-pink-600 bg-white"
          placeholder="Ketik sesuatu di sini..."
          maxLength={50}
        />
        
        <div className="flex flex-wrap justify-center gap-4">
          <Button onClick={() => window.print()} className="bg-pink-500 hover:bg-pink-600 text-white font-bold px-6 py-3 rounded-full shadow-lg text-lg">
            🖨️ Print Biasa (Kertas/PDF)
          </Button>
          <Button onClick={printBluetooth} disabled={isBluetoothPrinting} className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 py-3 rounded-full shadow-lg text-lg">
            {isBluetoothPrinting ? "Mencetak..." : "🦷 Print Bluetooth (Kasir)"}
          </Button>
        </div>
      </div>

      <div className="print-area absolute inset-0 w-full h-full flex items-center justify-center text-center pointer-events-none">
        <h1 className="love-text font-black text-pink-500">{customText}</h1>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .love-text {
          font-size: 15vw;
          line-height: 1;
        }
        
        @media print {
          @page {
            size: landscape;
            margin: 0;
          }
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-area {
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            page-break-after: avoid;
          }
          .love-text {
            font-size: 25vw;
            color: black !important; /* Thermal printer or B&W */
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />
    </div>
  );
}
