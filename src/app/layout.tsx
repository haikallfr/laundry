import type { Metadata } from "next";
import { ThemeScript } from "@/components/layout/ThemeScript";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaundryPro POS",
  description: "Aplikasi kasir laundry profesional"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <ThemeScript />
        {children}
      </body>
    </html>
  );
}
