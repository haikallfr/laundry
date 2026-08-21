import { NextResponse } from "next/server";
import { updateStore } from "@/lib/store";
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
  // Filesystem Vercel is read-only/ephemeral. Store the validated image with
  // the application data so the QRIS remains available after every deployment.
  const fileUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

  await updateStore((data) => {
    data.settings.qrisUrl = fileUrl;
  });
  return NextResponse.json({ data: { fileUrl, fileName, mimeType: file.type }, audit: { action: "QRIS_UPLOADED" } }, { status: 201 });
}
