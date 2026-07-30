import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  // Removed bypass
  return <LoginForm />;
}
