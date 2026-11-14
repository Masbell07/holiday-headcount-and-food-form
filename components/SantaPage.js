"use client";

import { useCallback, useEffect, useState } from "react";

const MINE = "ss2026-mine";
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
const blank = () => ({ name: "", household: "", wishlist: "", sizes: "", avoid: "" });

async function call(body) {
  const res = await fetch("/api/ss", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ error: `The server answered with an error (status ${res.status}). Try again in a minute.` }));
  return { ok: res.ok, status: res.status, data };
}

function daysLeft(ts) {
  const ms = ts - Date.now();
  if (ms <= 0) return null;
  const d = Math.ceil(ms / 864e5);
  return d === 1 ? "1 day left" : `${d} days left`;
}

export default function SantaPage() {
  const [info, setInfo] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [mine, setMine] = useState(null);       // { id, token }
  const [me, setMe] = useState(null);           // { entry, match }
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [isHostUser, setIsHostUser] = useState(false);

  const load = useCallback(async (who) => {
    try {
      const res = await fetch("/api/ss", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setInfo(await res.json());
      setLoadError("");
    } catch {
      setLoadError("Couldn't load Secret Santa. Check your connection and refresh.");
    }
    const m = who === undefined ? store.get(MINE) : who;
    if (m) {
      const r = await call({ action: "me", ...m });
      if (r.ok) {
        setMine(m); setMe(r.data);
        setForm({ ...blank(), ...pick(r.data.entry) });
        setEditing(false);
      } else if (r.status === 404) {
        store.del(MINE); setMine(null); setMe(null);
      }
    }
  }, []);

  useEffect(() => {
    load();
    fetch("/api/host/login", { cache: "no-store" }).then((r) => r.json()).then((d) => setIsHostUser(Boolean(d.host))).catch(() => {});
    const t = setInterval(() => load(), 30000);
    return () => clearInterval(t);
  }, [load]);

  const update = (patch) => { setForm((f) => ({ ...f, ...patch })); setMessage(null); };
  const scrollToCard = () => setTimeout(() => document.getElementById("santa-card")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

  async function submit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true); setMessage(null);
    const r = await call({ ...form, id: mine?.id, token: mine?.token });
    setSaving(false);
    if (!r.ok) { setMessage({ kind: "error", text: r.data.error || "Something went wrong. Try again." }); return; }
    const m = { id: r.data.id, token: r.data.token };
    store.set(MINE, m);
    setMessage({ kind: "ok", text: mine ? "Saved your changes." : "You're in! Ho ho ho." });
    await load(m);
    scrollToCard();
  }

  async function leave() {
    const r = await call({ action: "delete", ...mine });
    setConfirmLeave(false);
    if (!r.ok) { setMessage({ kind: "error", text: r.data.error }); return; }
    store.del(MINE); setMine(null); setMe(null); setForm(blank()); setEditing(true);
    setMessage({ kind: "ok", text: "You've left Secret Santa." });
    load(null);
  }

  const open = info?.open;
  const drawn = info?.drawn;
  const left = info && daysLeft(info.closesAt);
  const statusLine = drawn
    ? "Names have been drawn!"
    : open
      ? info?.mode === "open" ? "Sign-ups are open" : `Sign-ups close Thanksgiving Day, Thu Nov 26${left ? ` · ${left}` : ""}`
      : info ? "Sign-ups are closed. We'll draw names on Thanksgiving." : "";

  return (
    <main className="theme-xmas santa">
      <header className="hero">
        <Snow />
        <div className="hero-inner">
          <p className="eyebrow">Our family gift exchange</p>
          <h1>Secret Santa <span>2026</span></h1>
          <p className="when">{statusLine}</p>
          {info?.budget && <p className="where">Gift budget: <strong>{info.budget}</strong></p>}
          <p className="where">Join if you want to take part. We'll draw names on Thanksgiving.</p>
          <a href="#santa-card" className="cta" onClick={(e) => { e.preventDefault(); scrollToCard(); }}>
            {me?.match ? "See who you got" : me ? "See my sign-up" : open ? "Join Secret Santa" : "See details"}
          </a>
        </div>
      </header>

      <section className="stats santa-stats" aria-label="Sign-ups">
        <div className="stat"><span className="n">{info ? info.people.length : "–"}</span><span className="l">{info?.people.length === 1 ? "person in" : "people in"}</span></div>
        <div className="stat"><span className="n">{drawn ? "✓" : open ? (left ? left.split(" ")[0] : "–") : "0"}</span><span className="l">{drawn ? "names drawn" : open ? (left ? "days to join" : "open") : "sign-ups closed"}</span></div>
      </section>

      {loadError && <p className="banner error">{loadError}</p>}

      <section className="santa-main" id="santa-card">
        {me?.match ? (
          <div className="card reveal">
            <p className="eyebrow">You're Secret Santa for</p>
            {revealed ? (
              <>
                <h2 className="reveal-name">{me.match.name}</h2>
                {info?.budget && <p className="muted">Budget: {info.budget}</p>}
                <Detail label="Wish list" text={me.match.wishlist} empty="No wish list yet. Ask around for ideas!" />
                {me.match.sizes && <Detail label="Sizes" text={me.match.sizes} />}
                {me.match.avoid && <Detail label="Please avoid" text={me.match.avoid} />}
                <p className="small muted">Keep it secret! Only you can see this, on the device you signed up with.</p>
                <button type="button" className="link" onClick={() => setRevealed(false)}>Hide</button>
              </>
            ) : (
              <>
                <p className="muted">Make sure nobody's looking over your shoulder.</p>
                <button type="button" className="btn wide" onClick={() => setRevealed(true)}>Tap to reveal</button>
              </>
            )}
          </div>
        ) : me && !editing ? (
          <div className="card done">
            <p className="eyebrow">You're in</p>
            <h2>{me.entry.name}</h2>
            {drawn ? (
              <p className="muted">Names have been drawn. Reload this page if you don't see your match.</p>
            ) : (
              <p className="muted">We'll draw names on Thanksgiving. Come back here afterwards to see who you got.</p>
            )}
            {me.entry.wishlist && <Detail label="Your wish list" text={me.entry.wishlist} />}
            {me.entry.sizes && <Detail label="Sizes" text={me.entry.sizes} />}
            {me.entry.avoid && <Detail label="Avoid" text={me.entry.avoid} />}
            {message && <p className={`banner ${message.kind}`} role="status">{message.text}</p>}
            {open && (
              <div className="row">
                <button type="button" className="btn" onClick={() => { setEditing(true); setMessage(null); }}>Edit my sign-up</button>
                {confirmLeave ? (
                  <span className="confirm">Leave Secret Santa? <button type="button" className="link danger" onClick={leave}>Yes, leave</button> <button type="button" className="link" onClick={() => setConfirmLeave(false)}>Stay in</button></span>
                ) : (
                  <button type="button" className="link" onClick={() => setConfirmLeave(true)}>Leave</button>
                )}
              </div>
            )}
          </div>
        ) : open ? (
          <form className="card" onSubmit={submit} noValidate>
            <h2>{mine ? "Edit your sign-up" : "Join Secret Santa"}</h2>
            <p className="muted small">Only your name shows on this page. Your wish list goes to whoever draws you.</p>
            <label htmlFor="ss-name">Your name</label>
            <input id="ss-name" value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. Aunt Linda" autoComplete="name" required />
            <label htmlFor="ss-house">Household <span className="opt">(optional)</span></label>
            <input id="ss-house" value={form.household} onChange={(e) => update({ household: e.target.value })} placeholder="e.g. Rhodes" />
            <p className="hint">People with the same household won't draw each other.</p>
            <label htmlFor="ss-wish">Wish list <span className="opt">(optional)</span></label>
            <textarea id="ss-wish" rows={4} value={form.wishlist} onChange={(e) => update({ wishlist: e.target.value })} placeholder="Gift ideas, favorite stores, hobbies, links…" />
            <label htmlFor="ss-sizes">Sizes <span className="opt">(optional)</span></label>
            <input id="ss-sizes" value={form.sizes} onChange={(e) => update({ sizes: e.target.value })} placeholder="e.g. Shirt M, socks 9" />
            <label htmlFor="ss-avoid">Please avoid <span className="opt">(optional)</span></label>
            <input id="ss-avoid" value={form.avoid} onChange={(e) => update({ avoid: e.target.value })} placeholder="e.g. Nut allergy, no candles" />
            {message && <p className={`banner ${message.kind}`} role="status">{message.text}</p>}
            <div className="row">
              <button className="btn" type="submit" disabled={saving || !form.name.trim()}>{saving ? "Saving…" : mine ? "Save changes" : "Count me in"}</button>
              {mine && <button type="button" className="link" onClick={() => { setForm({ ...blank(), ...pick(me.entry) }); setEditing(false); setMessage(null); }}>Cancel</button>}
            </div>
          </form>
        ) : info ? (
          <div className="card">
            <h2>{drawn ? "Names have been drawn" : "Sign-ups are closed"}</h2>
            <p className="muted">
              {drawn
                ? "If you signed up, open this page on the phone or tablet you used to sign up to see who you got."
                : "Sign-ups ended on Thanksgiving. Missed it? Ask the host. They can still add you before the drawing."}
            </p>
            {message && <p className={`banner ${message.kind}`} role="status">{message.text}</p>}
          </div>
        ) : (
          <p className="muted">Loading…</p>
        )}
      </section>

      <section className="guests">
        <div className="section-head"><h2>Who's in</h2></div>
        {!info ? null : info.people.length === 0 ? (
          <p className="muted">Nobody yet. Be the first!</p>
        ) : (
          <ul className="name-chips">
            {info.people.map((p) => <li key={p.id} className={p.id === mine?.id ? "mine" : ""}>{p.name}{p.id === mine?.id ? " (you)" : ""}</li>)}
          </ul>
        )}
      </section>

      <section className="guests how">
        <div className="section-head"><h2>How it works</h2></div>
        <ol>
          <li>Join by Thanksgiving. Add a wish list if you'd like to help your Santa.</li>
          <li>We draw names on Thanksgiving Day. Nobody gets themselves or someone from their household.</li>
          <li>Come back to this page on the same phone to secretly see who you're shopping for.</li>
        </ol>
        <p><a className="link" href="/xmas">Christmas dinner RSVP →</a></p>
      </section>

      <footer className="foot">
        Ho ho ho · Merry Christmas
        <a className="host-link" href="/host-xmas">{isHostUser ? "Host dashboard" : "Host login"}</a>
      </footer>
    </main>
  );
}

function pick(e) {
  return { name: e.name || "", household: e.household || "", wishlist: e.wishlist || "", sizes: e.sizes || "", avoid: e.avoid || "" };
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
