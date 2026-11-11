import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DEMO_IDS, currentUser } from "@/lib/auth";
import { blobEnabled } from "@/lib/files";
import SecurityPanel from "./SecurityPanel";
import ProfileForm from "./ProfileForm";

export const metadata: Metadata = { title: "Profil" };
export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ nowy?: string }> }) {
  const me = await currentUser();
  if (!me) redirect("/logowanie?next=/profil");
  const { nowy } = await searchParams;
  return (
    <div className="page">
      <div className="wrap">
        <div className="page-head">
          <div>
            <div className="crumbs mono"><Link href="/panel">Panel</Link> / Profil</div>
            <h1>{nowy ? "Uzupełnij profil drukarza" : "Twój profil"}</h1>
            <p>
              {nowy
                ? "Dodaj maszyny i materiały — po zapisaniu Twój profil pojawi się w katalogu drukarzy."
                : "Informacje widoczne dla zamawiających i innych drukarzy."}
            </p>
          </div>
          {me.maker && <Link href={`/drukarze/${me.id}`} className="btn">Podgląd profilu</Link>}
        </div>
        <ProfileForm
          user={{ name: me.name, city: me.city, bio: me.bio, email: me.email, maker: me.maker ?? null, avatar: me.avatar, portfolio: me.portfolio }}
          blob={blobEnabled()}
          userId={me.id}
        />
        <div className="two-col" style={{ marginTop: 24 }}>
          <SecurityPanel isDemo={DEMO_IDS.includes(me.id)} />
        </div>
      </div>
    </div>
  );
}
