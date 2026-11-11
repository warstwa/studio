"use client";
import { useRef, useState } from "react";
import { ACCEPT_ATTACH, uploadFiles } from "@/lib/upload-client";
import type { Attachment } from "@/lib/types";

const fmtSize = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1).replace(".", ",")} MB`);

/**
 * Załączniki zamówienia: przeciągnij i upuść / wybierz, wysyłka z paskiem postępu.
 * Wynik trafia do ukrytego pola `name` jako JSON — formularz wysyła tylko adresy, nie pliki.
 */
export default function FileDrop({
  name = "files",
  initial = [],
  blob,
  userId,
  hint = "STL · 3MF · STEP · OBJ · zdjęcia · PDF — do 200 MB na plik",
  onBusy,
}: {
  name?: string;
  initial?: Attachment[];
  blob: boolean;
  userId: string;
  hint?: string;
  onBusy?: (busy: boolean) => void;
}) {
  const [files, setFiles] = useState<Attachment[]>(initial);
  const [pending, setPending] = useState<Record<string, number>>({});
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function add(list: FileList | null) {
    const picked = Array.from(list ?? []);
    if (!picked.length) return;
    if (files.length + picked.length > 12) return setError("Maksymalnie 12 plików w zamówieniu.");
    setError(null);
    setPending((p) => ({ ...p, ...Object.fromEntries(picked.map((f) => [f.name, 0])) }));
    onBusy?.(true);
    try {
      const done = await uploadFiles(picked, { blob, userId, onProgress: (n, pct) => setPending((p) => ({ ...p, [n]: pct })) });
      setFiles((f) => [...f, ...done]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się wysłać pliku.");
    } finally {
      setPending({});
      onBusy?.(false);
    }
  }

  return (
    <div className="filedrop-wrap">
      <input type="hidden" name={name} value={JSON.stringify(files)} />
      <input ref={input} type="file" multiple hidden accept={ACCEPT_ATTACH} onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      <button
        type="button"
        className={`filedrop${drag ? " drag" : ""}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
      >
        <svg width="28" height="28" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M20 26V8M13 15l7-7 7 7" />
          <path d="M6 26v6h28v-6" />
        </svg>
        <b>Przeciągnij pliki albo kliknij, aby wybrać</b>
        <span>{hint}</span>
      </button>
      {(files.length > 0 || Object.keys(pending).length > 0) && (
        <ul className="file-list">
          {files.map((f, i) => (
            <li key={f.url}>
              <span className={`file-kind ${f.kind}`}>{f.name.split(".").pop()}</span>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="ellipsis">{f.name}</a>
              <span className="dim">{fmtSize(f.size)}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} aria-label={`Usuń ${f.name}`}>
                Usuń
              </button>
            </li>
          ))}
          {Object.entries(pending).map(([n, pct]) => (
            <li key={`p-${n}`} className="uploading">
              <span className="spinner" aria-hidden />
              <span className="ellipsis">{n}</span>
              <span className="dim">{pct}%</span>
              <i className="file-progress" style={{ width: `${pct}%` }} />
            </li>
          ))}
        </ul>
      )}
      {error && <div className="alert" role="alert">{error}</div>}
    </div>
  );
}
