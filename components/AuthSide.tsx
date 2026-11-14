import Logo from "./Logo";

export default function AuthSide({ title }: { title: string }) {
  return (
    <aside className="auth-side grid-bg">
      <div className="logo"><Logo /> WARSTWA</div>
      <div>
        <h2>{title}</h2>
        <div className="spec" style={{ marginTop: 40, maxWidth: 420 }}>
          <div className="spec-row"><span>01</span><span>Wgraj model, opisz pomysł albo policz go w kalkulatorze</span></div>
          <div className="spec-row"><span>02</span><span>Drukarze przysyłają oferty — wybierasz najlepszą</span></div>
          <div className="spec-row"><span>03</span><span>Akceptujesz każdy krok aż do odbioru</span></div>
        </div>
      </div>
      <div className="mono dim">X 000.00 · Y 000.00 · Z 0.20</div>
    </aside>
  );
}
