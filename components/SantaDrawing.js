"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The reveal page. Anyone can open it on any phone; each person picks their own name and
// enters their secret PIN, so passing a phone around never shows someone else's match.
const MINE = "ss2026-mine";
const deviceToken = (id) => {
  try {
    const list = JSON.parse(localStorage.getItem(MINE));
    const arr = Array.isArray(list) ? list : list ? [list] : [];
    return arr.find((m) => m.id === id)?.token;
  } catch { return undefined; }
};

export default function SantaDrawing() {
  const [info, setInfo] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [who, setWho] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { name, match }
  const pinRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ss", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setInfo(await res.json());
      setLoadError("");
    } catch {
      setLoadError("Couldn't load Secret Santa. Check your connection and refresh.");
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  async function show(e) {
    e.preventDefault();
    if (!who || busy) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/ss", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reveal", id: who, pin, token: deviceToken(who) }),
      });
      const data = await res.json().catch(() => ({ error: "Something went wrong. Try again." }));
      if (!res.ok) { setError(data.error || "Something went wrong. Try again."); setPin(""); pinRef.current?.focus(); return; }
      setResult(data);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function done() {
    setResult(null); setWho(""); setPin(""); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const drawn = info?.drawn;
  const names = [...(info?.people || [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="theme-xmas santa">
      <header className="hero">
        <Snow />
        <div className="hero-inner">
          <p className="eyebrow">Our family gift exchange</p>
          <h1>Secret Santa <span>Drawing</span></h1>
          <p className="when">
            {!info ? "" : drawn ? "Names have been drawn! Find your name and enter your PIN." : "Names haven't been drawn yet. Check back after Thanksgiving dinner."}
          </p>
          {info?.budget && <p className="where">Gift budget: <strong>{info.budget}</strong></p>}
        </div>
      </header>

      {loadError && <p className="banner error">{loadError}</p>}

      <section className="santa-main">
        {!info && !loadError ? (
          <p className="muted">Loading…</p>
        ) : !drawn ? (
          <div className="card">
            <h2>Not drawn yet</h2>
            <p className="muted">We'll draw names after Thanksgiving dinner. This page checks for you every few seconds, so you can leave it open.</p>
            {info?.open && <a className="btn" href="/xmas-ss">Not signed up? Join Secret Santa</a>}
          </div>
        ) : result ? (
          <div className="card reveal">
            <p className="eyebrow">{result.name}, you're Secret Santa for</p>
            <h2 className="reveal-name">{result.match.name}</h2>
            {info?.budget && <p className="muted">Budget: {info.budget}</p>}
            <Detail label="Wish list" text={result.match.wishlist} empty="No wish list yet. Ask around (quietly!) for ideas." />
            {result.match.sizes && <Detail label="Sizes" text={result.match.sizes} />}
            {result.match.avoid && <Detail label="Please avoid" text={result.match.avoid} />}
            <p className="small muted">Keep it secret! Screenshot this if you want to remember the wish list.</p>
            <button type="button" className="btn wide" onClick={done}>Done, hide this</button>
          </div>
        ) : (
          <form className="card" onSubmit={show} noValidate>
            <h2>Who did you get?</h2>
            <p className="muted small">Passing the phone around? Each person enters their own PIN, then taps "Done" before handing it on.</p>
            <label htmlFor="who">Your name</label>
            <select id="who" value={who} onChange={(e) => { setWho(e.target.value); setError(""); setTimeout(() => pinRef.current?.focus(), 0); }}>
              <option value="">Choose your name</option>
              {names.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <label htmlFor="pin">Your secret PIN</label>
            <input id="pin" ref={pinRef} type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} autoComplete="off"
              className="pin-input" placeholder="••••" value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }} />
            {error && <p className="banner error" role="alert">{error}</p>}
            <button className="btn wide" type="submit" disabled={!who || busy || (pin.length > 0 && pin.length < 4)}>
              {busy ? "Checking…" : "Show my match"}
            </button>
            <p className="small muted">Forgot your PIN? Ask the host to reset it.</p>
          </form>
        )}
      </section>

      <footer className="foot">
        Ho ho ho · Merry Christmas
        <a className="host-link" href="/host-xmas">Host login</a>
      </footer>
    </main>
  );
}

function Detail({ label, text, empty }) {
  return (
    <div className="detail">
      <span className="detail-label">{label}</span>
      <p className={text ? "detail-text" : "detail-text muted"}>{text || empty}</p>
    </div>
  );
}

function Snow() {
  const flakes = [[6, 20, 30], [15, 70, 18], [27, 35, 14], [40, 85, 20], [60, 15, 16], [72, 60, 26], [84, 28, 22], [93, 75, 16], [52, 50, 12], [33, 10, 10]];
  return (
    <svg className="leaves" viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {flakes.map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x * 12} ${y * 4.2}) scale(${s / 20})`} stroke="#F6EFE4" strokeWidth="2.2" strokeLinecap="round" opacity="0.75" fill="none">
          {[0, 60, 120].map((r) => (
            <g key={r} transform={`rotate(${r})`}>
              <path d="M0,-20 L0,20" />
              <path d="M0,-13 L-5,-18 M0,-13 L5,-18 M0,13 L-5,18 M0,13 L5,18" />
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}
