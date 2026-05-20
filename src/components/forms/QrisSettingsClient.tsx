"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { StoreSettings } from "@/types";

export function QrisSettingsClient({ settings }: { settings: StoreSettings }) {
  const router = useRouter();
  const [preview, setPreview] = useState(settings.qrisUrl);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Format harus JPG, PNG, atau WEBP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage("Ukuran maksimal 2 MB.");
      return;
    }
    setFile(file);
    setPreview(URL.createObjectURL(file));
    setMessage("Preview QRIS siap. Tombol simpan akan mengunggah ke storage aplikasi.");
  }

  async function upload() {
    if (!file) {
      setMessage("Pilih file QRIS terlebih dahulu.");
      return;
    }
    setSaving(true);
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/settings/qris/upload", { method: "POST", body: form });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setMessage(json.error ?? "Gagal upload QRIS.");
      return;
    }
    setPreview(json.data.fileUrl);
    setFile(null);
    setMessage("QRIS berhasil disimpan dan akan tampil di pembayaran kasir.");
    router.refresh();
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <div className="rounded-lg border border-line bg-white p-4 shadow-subtle">
        <img src={preview} alt="Preview QRIS" className="h-80 w-full rounded-lg border border-line object-contain p-3" />
        <label className="mt-4 block text-sm font-semibold">Upload QRIS JPG, PNG, WEBP<input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} className="mt-1 block w-full rounded-lg border border-line px-3 py-2 text-sm" /></label>
        {message ? <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm font-semibold text-blue-700">{message}</p> : null}
        <Button className="mt-4 w-full" onClick={upload} disabled={saving}>{saving ? "Mengupload..." : "Ganti QRIS"}</Button>
      </div>
      <div className="rounded-lg border border-line bg-white p-4 shadow-subtle">
        <h2 className="text-base font-bold">Keamanan Upload</h2>
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-muted">Format MIME JPG, PNG, WEBP. Maksimal 2 MB.</p>
      </div>
    </div>
  );
}
