import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import RegisterForm from "./RegisterForm";
import AuthSide from "@/components/AuthSide";

export const metadata: Metadata = { title: "Rejestracja" };
export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ rola?: string }> }) {
  const { rola } = await searchParams;
  if (await currentUser()) redirect("/panel");
  return (
    <div className="auth">
      <AuthSide title="Dołącz do sieci ludzi, którzy drukują." />
      <div className="auth-main">
        <div className="auth-box">
          <h1>Załóż konto</h1>
          <p className="muted" style={{ marginBottom: 28 }}>
            Masz już konto? <Link href="/logowanie" className="accent">Zaloguj się</Link>
          </p>
          <RegisterForm defaultRole={rola === "drukarz" ? "maker" : "client"} />
        </div>
      </div>
    </div>
  );
}
