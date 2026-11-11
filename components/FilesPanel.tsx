import { bytes } from "@/lib/format";
import type { Attachment } from "@/lib/types";

/** Pliki zlecenia — pobieranie i otwarcie modelu w kalkulatorze. */
export default function FilesPanel({ files }: { files: Attachment[] }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="mono">Pliki</span>
        <span className="mono dim">{files.length}</span>
      </div>
      <div className="panel-body">
        <ul className="file-list">
          {files.map((f) => (
            <li key={f.url}>
              <span className={`file-kind ${f.kind}`}>{f.name.split(".").pop()}</span>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="ellipsis" download={f.name}>{f.name}</a>
              <span className="dim">{bytes(f.size)}</span>
              {f.kind === "model" && /\.(stl|3mf|step|stp)$/i.test(f.name) ? (
                <a className="btn btn-ghost btn-sm" href={`/slicer?plik=${encodeURIComponent(f.url)}&n=${encodeURIComponent(f.name)}`}>Otwórz w kalkulatorze</a>
              ) : f.kind === "image" ? (
                <a className="btn btn-ghost btn-sm" href={f.url} target="_blank" rel="noopener noreferrer">Podgląd</a>
              ) : <span />}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
