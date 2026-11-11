import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { blobEnabled } from "@/lib/files";
import StartOrder from "./StartOrder";

export const metadata: Metadata = { title: "Złóż zamówienie" };
export const dynamic = "force-dynamic";

export default async function OrderStart() {
  const me = await currentUser();
  if (!me) redirect("/logowanie?next=/zamow");
  return (
    <div className="page">
      <div className="wrap">
        <div className="page-head">
          <div>
            <div className="crumbs mono">Zamówienie / Start</div>
            <h1>Złóż zamówienie</h1>
            <p>
              Nie musisz szukać drukarza. Opisz, co chcesz wydrukować — dopasujemy najlepszych drukarzy z sieci, a oni
              przyślą Ci oferty z ceną i terminem.
            </p>
          </div>
        </div>
        <StartOrder blob={blobEnabled()} userId={me.id} />
      </div>
    </div>
  );
}
