"use client";
import { useRef, useState } from "react";
import { uploadFiles } from "@/lib/upload-client";
import type { Attachment } from "@/lib/types";

const IMG = ".jpg,.jpeg,.png,.webp,.heic,.gif";

/** Kompaktowe dodawanie zdjęć (czat, opinie, avatar, galeria). Wynik w ukrytym polu jako JSON. */
export default function ImageAttach({
  name,
  blob,
  userId,
  max = 8,
  initial = [],
  label = "Dodaj zdjęcia",
  variant = "grid",
  onBusy,
}: {
  name: string;
  blob: boolean;
  userId: string;
  max?: number;
  initial?: Attachment[];
  label?: string;
  variant?: "grid" | "avatar";
  onBusy?: (b: boolean) => void;
}) {
  const [imgs, setImgs] = useState<Attachment[]>(initial);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function add(list: FileList | null) {
    const files = Array.from(list ?? []).filter((f) => /\.(jpe?g|png|webp|heic|gif)$/i.test(f.name));
    if (!files.length) return;
    const room = max - (max === 1 ? 0 : imgs.length);
    if (room <= 0) return setError(`Maksymalnie ${max} zdjęć.`);
    const take = files.slice(0, room);
    setError(null);
    setBusy(take.length);
    onBusy?.(true);
    try {
      const done = await uploadFiles(take, { blob, userId });
      setImgs((x) => (max === 1 ? done.slice(0, 1) : [...x, ...done]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się wysłać zdjęcia.");
    } finally {
      setBusy(0);
      onBusy?.(false);
    }
  }

  const picker = (
    <input ref={input} type="file" accept={IMG} multiple={max > 1} hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
  );

  if (variant === "avatar") {
    const src = imgs[0]?.url;
    return (
      <div className="avatar-edit">
        <input type="hidden" name={name} value={JSON.stringify(imgs)} />
        {picker}
        <button type="button" className="avatar-pick" onClick={() => input.current?.click()} aria-label="Zmień zdjęcie profilowe">
          {src ? <img src={src} alt="" /> : <span>+</span>}
          {busy > 0 && <i className="spinner" />}
        </button>
        <div className="stack-sm">
          <button type="button" className="btn btn-sm" onClick={() => input.current?.click()}>{src ? "Zmień zdjęcie" : label}</button>
          {src && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setImgs([])}>Usuń</button>}
        </div>
        {error && <div className="alert" role="alert">{error}</div>}
      </div>
    );
  }

  return (
    <div
      className="img-attach"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}
    >
      <input type="hidden" name={name} value={JSON.stringify(imgs)} />
      {picker}
      {(imgs.length > 0 || busy > 0) && (
        <div className="thumbs">
          {imgs.map((im, i) => (
            <div key={im.url} className="thumb">
              <img src={im.url} alt={im.name} loading="lazy" />
              <button type="button" onClick={() => setImgs((x) => x.filter((_, j) => j !== i))} aria-label={`Usuń ${im.name}`}>×</button>
            </div>
          ))}
          {Array.from({ length: busy }).map((_, i) => (
            <div key={`b${i}`} className="thumb loading"><span className="spinner" /></div>
          ))}
        </div>
      )}
      {imgs.length < max && (
        <button type="button" className="btn btn-ghost btn-sm attach-btn" onClick={() => input.current?.click()} disabled={busy > 0}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="M21 16l-5-5-8 8" />
          </svg>
          {label}
        </button>
      )}
      {error && <div className="alert" role="alert">{error}</div>}
    </div>
  );
}
