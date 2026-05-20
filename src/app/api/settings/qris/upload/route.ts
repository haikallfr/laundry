import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { hasSupabaseStore, updateStore } from "@/lib/store";
import { requireOwner } from "@/lib/api-guard";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const forbidden = await requireOwner(request);
  if (forbidden) return forbidden;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "File QRIS wajib diupload" }, { status: 422 });
  if (!allowed.has(file.type)) return NextResponse.json({ error: "Format harus JPG, PNG, atau WEBP" }, { status: 422 });
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Ukuran maksimal 2 MB" }, { status: 422 });
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.name.split(".").pop() || "png";
  const fileName = `qris-${Date.now()}.${extension}`;
  let fileUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

  if (!hasSupabaseStore()) {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "qris");
    const target = path.join(uploadDir, fileName);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(target, buffer);
    fileUrl = `/uploads/qris/${fileName}`;
  }

  await updateStore((data) => {
    data.settings.qrisUrl = fileUrl;
  });
  return NextResponse.json({ data: { fileUrl, fileName, mimeType: file.type }, audit: { action: "QRIS_UPLOADED" } }, { status: 201 });
}
