"use client";

import { useState } from "react";
import { Lock, Mail, Shirt } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("owner@laundrypro.test");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    if (!response.ok) {
      setError("Email atau password tidak valid.");
      return;
    }
    const data = await response.json();
    window.location.href = data.user.role === "OWNER" ? "/dashboard-owner" : "/cashier";
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb]">
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>
      <section className="flex min-h-screen items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-soft">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Shirt className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-brand-700">LaundryPro POS</p>
              <h2 className="text-2xl font-black text-ink">Masuk</h2>
            </div>
          </div>
          <label className="text-sm font-semibold text-ink">Email</label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 w-full rounded-lg border border-line pl-10 pr-3 outline-none focus:border-brand-500" />
          </div>
          <label className="mt-4 block text-sm font-semibold text-ink">Password</label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 w-full rounded-lg border border-line pl-10 pr-3 outline-none focus:border-brand-500" />
          </div>
          {error ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
          <Button className="mt-5 w-full">Masuk ke aplikasi</Button>
        </form>
      </section>
    </main>
  );
}
