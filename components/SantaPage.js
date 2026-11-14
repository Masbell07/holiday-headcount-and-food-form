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

export default function SantaPage({ variant = "signup" }) {
  const isDrawing = variant === "drawing";
  const [info, setInfo] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [mine, setMine] = useState([]);          // [{ id, token }] for everyone signed up on this device
  const [views, setViews] = useState({});        // id -> { entry, match }
  const [form, setForm] = useState(blank);
  const [formFor, setFormFor] = useState(null);  // null = closed, "new" = adding someone, or an id being edited
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [revealed, setRevealed] = useState(null); // id whose match is showing
  const [confirmLeave, setConfirmLeave] = useState(null);
  const [isHostUser, setIsHostUser] = useState(false);

  const readMine = () => {
    const list = store.get(MINE);
    if (Array.isArray(list)) return list.filter((m) => m && m.id && m.token);
    if (list && list.id) return [list]; // older single sign-up format
    return [];
  };

  const load = useCallback(async (list) => {
    try {
      const res = await fetch("/api/ss", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setInfo(await res.json());
      setLoadError("");
    } catch {
      setLoadError("Couldn't load Secret Santa. Check your connection and refresh.");
    }
    const ms = list || readMine();
    const kept = [];
    const v = {};
    for (const m of ms) {
      const r = await call({ action: "me", ...m });
      if (r.ok) { kept.push(m); v[m.id] = r.data; }
      else if (r.status !== 404) kept.push(m); // keep on network trouble
    }
    store.set(MINE, kept);
    setMine(kept);
    setViews(v);
    return kept;
  }, []);

  useEffect(() => {
    load().then((kept) => { if (!kept.length && !isDrawing) setFormFor("new"); });
    fetch("/api/host/login", { cache: "no-store" }).then((r) => r.json()).then((d) => setIsHostUser(Boolean(d.host))).catch(() => {});
    const t = setInterval(() => load(), 30000);
    return () => clearInterval(t);
  }, [load]);

  const update = (patch) => { setForm((f) => ({ ...f, ...patch })); setMessage(null); };
  const scrollToCard = () => setTimeout(() => document.getElementById("santa-card")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  const people = mine.map((m) => views[m.id]).filter(Boolean);

  function startAdd() {
    const house = people.find((p) => p.entry.household)?.entry.household || "";
    setForm({ ...blank(), household: house });
    setFormFor("new"); setMessage(null); scrollToCard();
  }
  function startEdit(id) {
    setForm({ ...blank(), ...pick(views[id].entry) });
    setFormFor(id); setMessage(null); scrollToCard();
  }

  async function submit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true); setMessage(null);
    const editing = formFor && formFor !== "new" ? mine.find((m) => m.id === formFor) : null;
    const r = await call({ ...form, id: editing?.id, token: editing?.token });
    setSaving(false);
    if (!r.ok) { setMessage({ kind: "error", text: r.data.error || "Something went wrong. Try again." }); return; }
    const next = editing ? mine : [...mine, { id: r.data.id, token: r.data.token }];
    store.set(MINE, next);
    setMessage({ kind: "ok", text: editing ? `Saved changes for ${r.data.entry.name}.` : `${r.data.entry.name} is in! Ho ho ho.` });
    setFormFor(null);
    await load(next);
    scrollToCard();
  }

  async function leave(id) {
    const m = mine.find((x) => x.id === id);
    const name = views[id]?.entry.name || "They";
    const r = await call({ action: "delete", ...m });
    setConfirmLeave(null);
    if (!r.ok) { setMessage({ kind: "error", text: r.data.error }); return; }
    const next = mine.filter((x) => x.id !== id);
    store.set(MINE, next);
    setMessage({ kind: "ok", text: `${name} left Secret Santa.` });
    const kept = await load(next);
    if (!kept.length) { setForm(blank()); setFormFor("new"); }
  }

  const open = info?.open;
  const drawn = info?.drawn;
  const left = info && daysLeft(info.closesAt);
  const statusLine = isDrawing
    ? (drawn ? "Names have been drawn! Tap your name to see who you got." : info ? "Names haven't been drawn yet. Check back after Thanksgiving dinner." : "")
    : drawn
    ? "Names have been drawn!"
    : open
      ? info?.mode === "open" ? "Sign-ups are open" : `Sign-ups close Thanksgiving Day, Thu Nov 26${left ? ` · ${left}` : ""}`
      : info ? "Sign-ups are closed. We'll draw names on Thanksgiving." : "";
  const showForm = !isDrawing && open && formFor;
  const anyMatch = people.some((p) => p.match);

  return (
    <main className="theme-xmas santa">
      <header className="hero">
        <Snow />
        <div className="hero-inner">
          <p className="eyebrow">Our family gift exchange</p>
          <h1>Secret Santa <span>{isDrawing ? "Drawing" : "2026"}</span></h1>
          <p className="when">{statusLine}</p>
          {info?.budget && <p className="where">Gift budget: <strong>{info.budget}</strong></p>}
          {!isDrawing && <p className="where">Join if you want to take part. We'll draw names on Thanksgiving.</p>}
          {(!isDrawing || (drawn && people.length > 0)) && <a href="#santa-card" className="cta" onClick={(e) => { e.preventDefault(); scrollToCard(); }}>
            {anyMatch ? "See who you got" : people.length ? "See my sign-ups" : open ? "Join Secret Santa" : "See details"}
          </a>}
        </div>
      </header>

      <section className="stats santa-stats" aria-label="Sign-ups">
        <div className="stat"><span className="n">{info ? info.people.length : "–"}</span><span className="l">{info?.people.length === 1 ? "person in" : "people in"}</span></div>
        <div className="stat"><span className="n">{drawn ? "✓" : open ? (left ? left.split(" ")[0] : "–") : "0"}</span><span className="l">{drawn ? "names drawn" : open ? (left ? (isDrawing ? "days to go" : "days to join") : "open") : "sign-ups closed"}</span></div>
      </section>

      {loadError && <p className="banner error">{loadError}</p>}

      <section className="santa-main" id="santa-card">
        {people.length > 0 && (
          <div className="card done">
            <p className="eyebrow">{isDrawing && drawn ? "Who did you get?" : "Signed up on this device"}</p>
            {message && !showForm && <p className={`banner ${message.kind}`} role="status">{message.text}</p>}
            {drawn && people.length > 1 && <p className="small muted">Pass the phone so each person can tap their own name in private.</p>}
            <ul className="device-people">
              {people.map(({ entry, match }) => (
                <li key={entry.id}>
                  {match ? (
                    revealed === entry.id ? (
                      <div className="reveal">
                        <p className="eyebrow">{entry.name}, you're Secret Santa for</p>
                        <h2 className="reveal-name">{match.name}</h2>
                        {info?.budget && <p className="muted">Budget: {info.budget}</p>}
                        <Detail label="Wish list" text={match.wishlist} empty="No wish list yet. Ask around for ideas!" />
                        {match.sizes && <Detail label="Sizes" text={match.sizes} />}
                        {match.avoid && <Detail label="Please avoid" text={match.avoid} />}
                        <p className="small muted">Keep it secret!</p>
                        <button type="button" className="btn" onClick={() => setRevealed(null)}>Hide</button>
                      </div>
                    ) : (
                      <div className="person-row">
                        <strong>{entry.name}</strong>
                        <button type="button" className="btn" onClick={() => setRevealed(entry.id)}>Reveal {entry.name}'s match</button>
                      </div>
                    )
                  ) : (
                    <div className="person-row">
                      <div>
                        <strong>{entry.name}</strong>
                        {entry.household && <span className="small muted"> · {entry.household}</span>}
                        <p className="small muted">{drawn ? "Not in this drawing. Ask the host." : isDrawing ? "Waiting for the drawing" : entry.wishlist ? "Wish list added" : "No wish list yet"}</p>
                      </div>
                      {open && !isDrawing && (
                        confirmLeave === entry.id ? (
                          <span className="confirm">Take {entry.name} out? <button type="button" className="link danger" onClick={() => leave(entry.id)}>Yes</button> <button type="button" className="link" onClick={() => setConfirmLeave(null)}>No</button></span>
                        ) : (
                          <span className="row">
                            <button type="button" className="link" onClick={() => startEdit(entry.id)}>Edit</button>
                            <button type="button" className="link" onClick={() => setConfirmLeave(entry.id)}>Remove</button>
                          </span>
                        )
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {!drawn && <p className="small muted">{isDrawing ? "Names haven't been drawn yet. This page updates on its own, so keep it open or check back after dinner." : "We'll draw names on Thanksgiving. Come back here on this device to see who each person got."}</p>}
            {open && !isDrawing && formFor !== "new" && (
              <button type="button" className="btn add-person" onClick={startAdd}>+ Add another person</button>
            )}
          </div>
        )}

        {showForm ? (
          <form className="card" onSubmit={submit} noValidate>
            <h2>{formFor !== "new" ? `Edit ${views[formFor]?.entry.name || "sign-up"}` : people.length ? "Add another person" : "Join Secret Santa"}</h2>
            <p className="muted small">
              {people.length && formFor === "new"
                ? "Each person is entered and drawn separately."
                : "Signing up with family? Add yourself first, then tap \"Add another person\". Only names show on this page; wish lists go to whoever draws that person."}
            </p>
            <label htmlFor="ss-name">Name</label>
            <input id="ss-name" value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. Aunt Linda" autoComplete={people.length ? "off" : "name"} required />
            <label htmlFor="ss-house">Household <span className="opt">(optional)</span></label>
            <input id="ss-house" value={form.household} onChange={(e) => update({ household: e.target.value })} placeholder="e.g. Rhodes" />
            <p className="hint">People with the same household won't draw each other. Leave it blank if you don't mind.</p>
            <label htmlFor="ss-wish">Wish list <span className="opt">(optional)</span></label>
            <textarea id="ss-wish" rows={4} value={form.wishlist} onChange={(e) => update({ wishlist: e.target.value })} placeholder="Gift ideas, favorite stores, hobbies, links…" />
            <label htmlFor="ss-sizes">Sizes <span className="opt">(optional)</span></label>
            <input id="ss-sizes" value={form.sizes} onChange={(e) => update({ sizes: e.target.value })} placeholder="e.g. Shirt M, socks 9" />
            <label htmlFor="ss-avoid">Please avoid <span className="opt">(optional)</span></label>
            <input id="ss-avoid" value={form.avoid} onChange={(e) => update({ avoid: e.target.value })} placeholder="e.g. Nut allergy, no candles" />
            {message && <p className={`banner ${message.kind}`} role="status">{message.text}</p>}
            <div className="row">
              <button className="btn" type="submit" disabled={saving || !form.name.trim()}>
                {saving ? "Saving…" : formFor !== "new" ? "Save changes" : people.length ? "Add to Secret Santa" : "Count me in"}
              </button>
              {people.length > 0 && <button type="button" className="link" onClick={() => { setFormFor(null); setMessage(null); }}>Cancel</button>}
            </div>
          </form>
        ) : isDrawing && !people.length && info ? (
          <div className="card">
            <h2>{drawn ? "We couldn't find your sign-up here" : "Not drawn yet"}</h2>
            <p className="muted">
              {drawn
                ? "Your match is saved on the phone and browser you used to sign up. Open this link on that device. Still stuck? Ask the host, who can look it up for you."
                : "Names will be drawn after Thanksgiving dinner. This page will show who you got."}
            </p>
            {!drawn && open && <a className="btn" href="/xmas-ss">Join Secret Santa</a>}
          </div>
        ) : !people.length && info && !open ? (
          <div className="card">
            <h2>{drawn ? "Names have been drawn" : "Sign-ups are closed"}</h2>
            <p className="muted">
              {drawn
                ? "If you signed up, open this page on the phone or tablet you used to sign up to see who you got."
                : "Sign-ups ended on Thanksgiving. Missed it? Ask the host. They can still add you before the drawing."}
            </p>
          </div>
        ) : !info && !loadError ? (
          <p className="muted">Loading…</p>
        ) : null}
      </section>

      <section className="guests">
        <div className="section-head"><h2>Who's in</h2></div>
        {!info ? null : info.people.length === 0 ? (
          <p className="muted">Nobody yet. Be the first!</p>
        ) : (
          <ul className="name-chips">
            {info.people.map((p) => { const here = mine.some((m) => m.id === p.id); return <li key={p.id} className={here ? "mine" : ""}>{p.name}{here ? " ✓" : ""}</li>; })}
          </ul>
        )}
      </section>

      {!isDrawing && <section className="guests how">
        <div className="section-head"><h2>How it works</h2></div>
        <ol>
          <li>Join by Thanksgiving. You can sign up your partner or kids from the same phone; everyone is drawn separately.</li>
          <li>We draw names on Thanksgiving Day. Nobody gets themselves or someone from their household.</li>
          <li>Come back to this page on the same phone to secretly see who you're shopping for. Signed up a few people on one phone? Each person taps their own name to reveal their match.</li>
        </ol>
        <p><a className="link" href="/xmas">Christmas dinner RSVP →</a></p>
      </section>}

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
