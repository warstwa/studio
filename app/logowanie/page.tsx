import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DEMO_IDS, currentUser, demoLoginEnabled, safeNext } from "@/lib/auth";
import { listUsers } from "@/lib/data";
import { demoLoginAction } from "@/app/actions";
import { Avatar } from "@/components/ui";
import LoginForm from "./LoginForm";
import AuthSide from "@/components/AuthSide";

export const metadata: Metadata = { title: "Logowanie" };
export const dynamic = "force-dynamic";

const DEMO = ["u_jan", "u_kuba", "u_tomek", "u_marta"].filter((id) => DEMO_IDS.includes(id));

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; wylogowano?: string }> }) {
  const { next: rawNext, wylogowano } = await searchParams;
  const next = safeNext(rawNext);
  if (await currentUser()) redirect(next);
  const demo = !demoLoginEnabled() ? [] : (await listUsers()).filter((u) => DEMO.includes(u.id)).sort((a, b) => DEMO.indexOf(a.id) - DEMO.indexOf(b.id));

  return (
    <div className="auth">
      <AuthSide title="Wracaj do swoich zleceń." />
      <div className="auth-main">
        <div className="auth-box">
          <h1>Zaloguj się</h1>
          <p className="muted" style={{ marginBottom: 28 }}>
            Nie masz konta? <Link href="/rejestracja" className="accent">Załóż je</Link>
          </p>
          {wylogowano && <div className="alert info" style={{ marginBottom: 20 }}>Wylogowano ze wszystkich urządzeń.</div>}
          <LoginForm next={next} />
          {demo.length > 0 && (<>
          <div className="divider mono">lub konto demo</div>
          <div className="demo-list">
            {demo.map((u) => (
              <form action={demoLoginAction} key={u.id}>
                <input type="hidden" name="id" value={u.id} />
                <button className="demo-btn" type="submit">
                  <Avatar name={u.name} size="sm" />
                  <span>{u.name}</span>
                  <small>{u.role === "maker" ? "Drukarz" : "Zamawiający"}</small>
                </button>
              </form>
            ))}
          </div>
          <p className="mono dim" style={{ marginTop: 14 }}>Konta demo są wspólne — nie wpisuj w nich prawdziwych danych.</p>
          </>)}
        </div>
      </div>
    </div>
  );
}
