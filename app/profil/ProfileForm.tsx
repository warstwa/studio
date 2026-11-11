"use client";
import { useActionState, useState } from "react";
import { saveProfileAction } from "@/app/actions";
import Submit from "@/components/Submit";
import ImageAttach from "@/components/ImageAttach";
import { MATERIALS, type Attachment, type MakerProfile } from "@/lib/types";

export default function ProfileForm({
  user,
  blob,
  userId,
}: {
  user: { name: string; city: string; bio: string; email: string; maker: MakerProfile | null; avatar?: string; portfolio?: Attachment[] };
  blob: boolean;
  userId: string;
}) {
  const [state, action] = useActionState(saveProfileAction, undefined);
  const [isMaker, setIsMaker] = useState(!!user.maker);
  const m = user.maker;
  return (
    <form action={action} className="two-col" key={JSON.stringify(user)}>
      <div className="stack">
        <div className="panel">
          <div className="panel-head"><span className="mono">Dane podstawowe</span><span className="mono dim">{user.email}</span></div>
          <div className="panel-body form">
            <div className="field">
              <span className="label">Zdjęcie profilowe</span>
              <ImageAttach name="avatar" variant="avatar" max={1} blob={blob} userId={userId} label="Dodaj zdjęcie"
                initial={user.avatar ? [{ name: "avatar", url: user.avatar, size: 0, kind: "image" }] : []} />
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="name">Imię i nazwisko</label>
                <input className="input" id="name" name="name" defaultValue={user.name} required />
              </div>
              <div className="field">
                <label htmlFor="city">Miasto</label>
                <input className="input" id="city" name="city" defaultValue={user.city} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="bio">O mnie</label>
              <textarea className="textarea" id="bio" name="bio" defaultValue={user.bio} placeholder="Doświadczenie, specjalizacja, sposób wysyłki…" />
            </div>
            <label className="check">
              <input type="checkbox" name="isMaker" checked={isMaker} onChange={(e) => setIsMaker(e.target.checked)} />
              Przyjmuję zlecenia druku (profil drukarza)
            </label>
          </div>
        </div>

        <div className={`expand${isMaker ? " open" : ""}`}>
          <div>
            <div className="panel">
              <div className="panel-head"><span className="mono">Profil drukarza</span></div>
              <div className="panel-body form">
                <div className="field">
                  <label htmlFor="headline">Nagłówek</label>
                  <input className="input" id="headline" name="headline" defaultValue={m?.headline} placeholder="np. Części techniczne z materiałów inżynieryjnych" />
                </div>
                <div className="field">
                  <span className="label">Zdjęcia realizacji (max 12)</span>
                  <ImageAttach name="portfolio" blob={blob} userId={userId} max={12} initial={user.portfolio ?? []} label="Dodaj zdjęcia wydruków" />
                  <span className="hint">Pierwsze zdjęcie będzie okładką Twojej karty w katalogu drukarzy.</span>
                </div>
                <div className="field">
                  <label htmlFor="printers">Drukarki (każda w nowej linii)</label>
                  <textarea className="textarea" id="printers" name="printers" defaultValue={m?.printers.join("\n")} placeholder={"Bambu Lab P1S\nPrusa MK4S"} style={{ minHeight: 90 }} />
                </div>
                <div className="field">
                  <span className="label">Materiały</span>
                  <div className="check-grid">
                    {MATERIALS.map((x) => (
                      <label className="check" key={x}>
                        <input type="checkbox" name="materials" value={x} defaultChecked={m?.materials.includes(x)} />
                        {x}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-grid three">
                  <div className="field">
                    <label htmlFor="buildVolume">Pole robocze</label>
                    <input className="input" id="buildVolume" name="buildVolume" defaultValue={m?.buildVolume} placeholder="256 × 256 × 256 mm" />
                  </div>
                  <div className="field">
                    <label htmlFor="hourlyRate">Stawka (zł/h)</label>
                    <input className="input" id="hourlyRate" name="hourlyRate" type="number" min={1} defaultValue={m?.hourlyRate ?? 15} />
                  </div>
                  <div className="field">
                    <label htmlFor="leadDays">Realizacja (dni)</label>
                    <input className="input" id="leadDays" name="leadDays" type="number" min={1} defaultValue={m?.leadDays ?? 3} />
                  </div>
                </div>
                <label className="check">
                  <input type="checkbox" name="available" defaultChecked={m?.available ?? true} />
                  Przyjmuję teraz nowe zlecenia
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
      <aside className="panel sticky">
        <div className="panel-head"><span className="mono">Zapis</span></div>
        <div className="panel-body decide">
          {state?.ok && <div className="alert ok" role="status">{state.ok}</div>}
          {state?.error && <div className="alert" role="alert">{state.error}</div>}
          <Submit className="btn btn-primary btn-lg" pendingText="Zapisywanie…">Zapisz profil</Submit>
        </div>
      </aside>
    </form>
  );
}
