"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CATS = ["Clothes", "Outdoor", "Fishing", "Car", "Fun", "Health"];
const PERSONAL = ["Clothes", "Outdoor", "Health"];
const WHO = { "": "Who's bringing?", m: "Mel's got it", k: "Nick's got it" };
const NEXT_WHO = { "": "m", m: "k", k: "" };
const TRIP_START = new Date("2026-11-19T00:00:00-06:00");
const isP = (it) => PERSONAL.includes(it.cat);

async function api(path, options) {
  const res = await fetch(path, { cache: "no-store", headers: { "content-type": "application/json" }, ...options });
  const data = await res.json().catch(() => ({ error: `Something went wrong (status ${res.status}).` }));
  return { ok: res.ok, status: res.status, data };
}

function cheer(done, total) {
  if (!total) return "Nothing on the list yet";
  const p = done / total;
  if (p === 1) return "All packed. Mountains, here we come!";
  if (p >= 0.75) return "So close you can smell the pine";
  if (p >= 0.4) return "Halfway up the trail";
  if (p > 0) return "Off to a great start";
  return "Let's get packing!";
}

function countdown() {
  const days = Math.ceil((TRIP_START - Date.now()) / 864e5);
  if (days > 1) return `${days} sleeps till Colorado`;
  if (days === 1) return "Tomorrow we drive!";
  if (days > -4) return "We're in Colorado!";
  return "What a trip it was";
}

function Scene() {
  return (
    <svg className="co-scene" viewBox="0 0 1200 330" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="co-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b5482d" /><stop offset=".6" stopColor="#e9895a" /><stop offset="1" stopColor="#f8cd7a" /></linearGradient>
        <linearGradient id="co-peak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a6680" /><stop offset="1" stopColor="#5f4660" /></linearGradient>
        <linearGradient id="co-rock" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#9c3a22" /><stop offset=".55" stopColor="#d0603f" /><stop offset="1" stopColor="#8a3019" /></linearGradient>
        <path id="co-tree" d="M0 0 L-11 26 L-5 26 L-14 46 L-6 46 L-16 68 L16 68 L6 46 L14 46 L5 26 L11 26Z" />
      </defs>
      <rect width="1200" height="330" fill="url(#co-sky)" />
      <g className="co-sun"><circle cx="930" cy="200" r="46" fill="#ffe3a0" /><circle cx="930" cy="200" r="64" fill="#ffe3a0" opacity=".25" /></g>
      <g fill="#fff" opacity=".85" className="co-clouds">
        <ellipse cx="180" cy="70" rx="46" ry="14" /><ellipse cx="215" cy="60" rx="30" ry="14" />
        <ellipse cx="700" cy="50" rx="40" ry="12" /><ellipse cx="728" cy="42" rx="24" ry="12" />
      </g>
      <path d="M0 250 L180 170 L300 205 L470 90 L560 140 L640 110 L800 200 L960 150 L1200 230 V330 H0Z" fill="url(#co-peak)" />
      <path d="M470 90 L500 112 L485 112 L520 132 L560 140 L540 118 Z" fill="#fbf4f1" />
      <path d="M640 110 L660 124 L650 126 L670 138 L690 140 Z" fill="#fbf4f1" opacity=".8" />
      <path d="M610 330 L640 210 Q660 160 690 190 L705 230 Q720 150 760 175 L790 250 L800 330Z" fill="url(#co-rock)" />
      <path d="M820 330 L840 250 Q860 215 880 245 L900 330Z" fill="#a8442a" />
      <path d="M0 290 Q300 240 600 285 T1200 270 V330 H0Z" fill="#1f3a2e" />
      <g fill="#163024">
        <use href="#co-tree" x="80" y="232" /><use href="#co-tree" x="120" y="246" /><use href="#co-tree" x="520" y="250" />
        <use href="#co-tree" x="1010" y="226" /><use href="#co-tree" x="1050" y="240" /><use href="#co-tree" x="1100" y="230" />
      </g>
      <g transform="translate(300 262)">
        <path d="M0 22 L28 2 L56 22 V44 H0Z" fill="#3b2a21" />
        <path d="M-4 24 L28 0 L60 24" stroke="#2a1c15" strokeWidth="5" fill="none" />
        <rect x="10" y="26" width="12" height="11" fill="#ffd27a" className="co-window" /><rect x="34" y="26" width="12" height="11" fill="#ffd27a" className="co-window" />
        <rect x="42" y="-2" width="7" height="14" fill="#2a1c15" />
      </g>
      <g transform="translate(400 300)">
        <rect x="0" y="-16" width="54" height="16" rx="5" fill="#f2b544" /><path d="M10 -16 L16 -28 H38 L46 -16Z" fill="#f2b544" />
        <path d="M18 -18 L21 -25 H35 L40 -18Z" fill="#cfe8f2" />
        <circle cx="13" cy="0" r="6" fill="#222" /><circle cx="42" cy="0" r="6" fill="#222" />
      </g>
    </svg>
  );
}

function Confetti({ burst }) {
  if (!burst) return null;
  const colors = ["#b5482d", "#f2b544", "#1f3a2e", "#e9895a", "#7aa6c2", "#d36f9c"];
  return (
    <div className="co-confetti" key={burst} aria-hidden="true">
      {Array.from({ length: 36 }, (_, i) => (
        <i key={i} style={{ left: `${(i * 37) % 100}%`, background: colors[i % colors.length], animationDelay: `${(i % 9) * 40}ms`, transform: `rotate(${i * 23}deg)` }} />
      ))}
    </div>
  );
}

function Login({ onIn }) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError("");
    const r = await api("/api/trip/login", { method: "POST", body: JSON.stringify({ user, password }) });
    setBusy(false);
    if (r.ok) onIn(); else setError(r.data.error || "Couldn't log in.");
  }
  return (
    <div className="co-login">
      <Scene />
      <form className="co-loginCard" onSubmit={submit}>
        <h1>Colorado, ho!</h1>
        <p>This trip is members only. Say the secret words.</p>
        <label>Username<input autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p className="co-err" role="alert">{error}</p>}
        <button className="co-btn" disabled={busy}>{busy ? "Checking…" : "Let me in"}</button>
      </form>
    </div>
  );
}

function Check({ checked, onChange, label, className = "" }) {
  return <input type="checkbox" className={`co-chk ${className}`} checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />;
}

function Meter({ label, done, total, tone }) {
  return (
    <div className={`co-meter ${tone || ""}`}>
      <div className="co-big">{done}/{total}</div>
      <small>{label}</small>
      <div className="co-bar"><div className="co-fill" style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
    </div>
  );
}

export default function TripPage() {
  const [auth, setAuth] = useState("checking");
  const [trip, setTrip] = useState(null);
  const [saved, setSaved] = useState(true);
  const [tab, setTab] = useState("plan");
  const [day, setDay] = useState("thu");
  const [cat, setCat] = useState("All");
  const [toast, setToast] = useState(null);
  const [burst, setBurst] = useState(0);
  const [adding, setAdding] = useState(false);
  const [stopForm, setStopForm] = useState({ time: "", name: "", where: "", note: "" });
  const [packForm, setPackForm] = useState({ name: "", cat: "Clothes" });
  const [camName, setCamName] = useState("");
  const pending = useRef(0);

  const load = useCallback(async () => {
    if (pending.current) return;
    const r = await api("/api/trip");
    if (r.status === 401) { setAuth("login"); return; }
    if (!r.ok) { setToast({ text: r.data.error }); return; }
    setTrip(r.data.trip); setSaved(r.data.saved); setAuth("in");
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (auth !== "in") return;
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 15000);
    return () => clearInterval(t);
  }, [auth, load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.undo ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function send(op, optimistic) {
    if (optimistic) setTrip((s) => optimistic(structuredClone(s)));
    pending.current++;
    const r = await api("/api/trip", { method: "POST", body: JSON.stringify(op) });
    pending.current--;
    if (r.status === 401) { setAuth("login"); return false; }
    if (!r.ok) { setToast({ text: r.data.error }); load(); return false; }
    if (!pending.current) setTrip(r.data.trip);
    return true;
  }

  const findIn = (s, list, id) => (list === "stops" ? s.days.flatMap((d) => d.stops) : s[list]).find((x) => x.id === id);

  function set(list, id, field, value, celebrate) {
    if (celebrate && value) {
      const next = structuredClone(trip);
      findIn(next, list, id)[field] = value;
      if (celebrate(next)) setBurst(Date.now());
    }
    send({ op: "set", list, id, field, value }, (s) => { findIn(s, list, id)[field] = value; return s; });
  }

  function remove(list, item, dayK) {
    send({ op: "remove", list, id: item.id }, (s) => {
      if (list === "stops") s.days.forEach((d) => { d.stops = d.stops.filter((x) => x.id !== item.id); });
      else s[list] = s[list].filter((x) => x.id !== item.id);
      return s;
    });
    setToast({ text: `Removed "${item.name}"`, undo: () => send({ op: "add", list, day: dayK, item }) });
  }

  async function logout() { await api("/api/trip/login", { method: "DELETE" }); setAuth("login"); setTrip(null); }

  if (auth === "checking") return <div className="co co-loading"><p>Loading the trip…</p></div>;
  if (auth === "login") return <div className="co"><Login onIn={load} /></div>;
  if (!trip) return null;

  const D = trip.days.find((d) => d.k === day) || trip.days[0];
  const P = trip.pack.filter(isP), SH = trip.pack.filter((x) => !isP(x));
  const mine = (w) => SH.filter((x) => x.who === w);
  const melDone = P.filter((x) => x.m).length + mine("m").filter((x) => x.done).length;
  const melTotal = P.length + mine("m").length;
  const nickDone = P.filter((x) => x.k).length + mine("k").filter((x) => x.done).length;
  const nickTotal = P.length + mine("k").length;
  const allPackDone = (s) => s.pack.every((x) => (isP(x) ? x.m && x.k : x.done));
  const dayDone = (k) => (s) => s.days.find((d) => d.k === k).stops.every((x) => x.done);
  const camDone = trip.cam.filter((x) => x.done).length;
  const shownCats = cat === "All" ? CATS : [cat];

  return (
    <div className="co">
      <Confetti burst={burst} />
      <header className="co-hero">
        <Scene />
        <div className="co-title">
          <p className="co-count">{countdown()}</p>
          <h1>Divide, Colorado</h1>
          <p>Nov 19–22 · Mel &amp; Nick · 413 Lake Dr W</p>
        </div>
      </header>

      {!saved && <p className="co-warn">Heads up: storage isn't connected, so changes won't be saved.</p>}

      <div className="co-wrap">
        <nav className="co-tabs" role="tablist">
          {[["plan", "Itinerary"], ["pack", "Packing"], ["cam", "Camera bag"]].map(([k, l]) => (
            <button key={k} role="tab" className="co-tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
          ))}
        </nav>

        {tab === "plan" && (
          <section>
            <div className="co-days">
              {trip.days.map((d) => {
                const n = d.stops.filter((x) => x.done).length;
                return (
                  <button key={d.k} className={`co-day co-day-${d.k}`} aria-pressed={d.k === day} onClick={() => { setDay(d.k); setAdding(false); }}>
                    <b>{d.d}</b>{d.date}<span className="co-dots">{d.stops.map((x) => <i key={x.id} className={x.done ? "on" : ""} />)}</span>
                    <span className="co-sr">{n} of {d.stops.length} done</span>
                  </button>
                );
              })}
            </div>
            <div className="co-dayhead"><h2>{D.title}</h2><span>{D.date} · {D.sub}</span></div>
            <ol className="co-stops">
              {D.stops.map((s) => (
                <li key={s.id} className={`co-stop${s.done ? " done" : ""}`}>
                  <div className="co-time">{s.time}</div>
                  <div>
                    <h3>{s.name}</h3>
                    {s.where && <div className="co-where">{s.where}</div>}
                    {s.note && <div className="co-note">{s.note}</div>}
                  </div>
                  <div className="co-acts">
                    <Check checked={s.done} label={`Done: ${s.name}`} onChange={(v) => set("stops", s.id, "done", v, dayDone(D.k))} />
                    <button className="co-del" onClick={() => remove("stops", s, D.k)} aria-label={`Remove ${s.name}`}>×</button>
                  </div>
                </li>
              ))}
              {!D.stops.length && <li className="co-empty">A totally free day. Add something fun!</li>}
            </ol>
            {adding ? (
              <form className="co-addstop" onSubmit={async (e) => {
                e.preventDefault();
                if (!stopForm.name.trim()) return;
                if (await send({ op: "add", list: "stops", day: D.k, item: stopForm })) { setStopForm({ time: "", name: "", where: "", note: "" }); setAdding(false); }
              }}>
                <div className="co-row2">
                  <label>When<input placeholder="e.g. 3 PM" value={stopForm.time} onChange={(e) => setStopForm({ ...stopForm, time: e.target.value })} /></label>
                  <label>What<input placeholder="e.g. Hot springs" value={stopForm.name} onChange={(e) => setStopForm({ ...stopForm, name: e.target.value })} required /></label>
                </div>
                <label>Where<input value={stopForm.where} onChange={(e) => setStopForm({ ...stopForm, where: e.target.value })} /></label>
                <label>Notes<input value={stopForm.note} onChange={(e) => setStopForm({ ...stopForm, note: e.target.value })} /></label>
                <div className="co-formbtns"><button className="co-btn">Add to {D.d}</button><button type="button" className="co-ghost" onClick={() => setAdding(false)}>Cancel</button></div>
              </form>
            ) : (
              <button className="co-addbtn" onClick={() => setAdding(true)}>+ Add a stop to {D.d}</button>
            )}
          </section>
        )}

        {tab === "pack" && (
          <section>
            <div className="co-meters">
              <Meter label="Mel" done={melDone} total={melTotal} />
              <Meter label="Nick" done={nickDone} total={nickTotal} tone="nick" />
              <Meter label="Shared" done={SH.filter((x) => x.done).length} total={SH.length} tone="shared" />
            </div>
            <p className="co-cheer">{cheer(trip.pack.filter((x) => (isP(x) ? x.m && x.k : x.done)).length, trip.pack.length)}</p>
            <p className="co-hint">Clothes, outdoor and health: you each tap your own name. Car, fishing and fun stuff is shared: tap the tag to pick who&apos;s bringing it.</p>
            <div className="co-chips">
              {["All", ...CATS].map((c) => <button key={c} className="co-chip" aria-pressed={c === cat} onClick={() => { setCat(c); if (c !== "All") setPackForm((f) => ({ ...f, cat: c })); }}>{c}</button>)}
            </div>
            {shownCats.map((c) => {
              const its = trip.pack.filter((p) => p.cat === c);
              if (!its.length) return null;
              return (
                <div key={c} className="co-group">
                  <h3>{c}{PERSONAL.includes(c) ? "" : <span> · shared</span>}</h3>
                  <ul className="co-items">
                    {its.map((it) => {
                      const done = isP(it) ? it.m && it.k : it.done;
                      return (
                        <li key={it.id} className={`co-item${done ? " done" : ""}`}>
                          <div className="co-nm"><span className="co-name">{it.name}</span>{it.note && <small>{it.note}</small>}</div>
                          {isP(it) ? (
                            <div className="co-who">
                              {[["m", "Mel"], ["k", "Nick"]].map(([w, lab]) => (
                                <label key={w} className={`co-pill ${w}${it[w] ? " on" : ""}`}>
                                  <input type="checkbox" checked={it[w]} onChange={(e) => set("pack", it.id, w, e.target.checked, allPackDone)} aria-label={`${lab} packed ${it.name}`} />{lab}
                                </label>
                              ))}
                            </div>
                          ) : (
                            <div className="co-who">
                              <button className={`co-tag ${it.who}`} onClick={() => set("pack", it.id, "who", NEXT_WHO[it.who])}>{WHO[it.who]}</button>
                              <Check checked={it.done} label={`Packed ${it.name}`} onChange={(v) => set("pack", it.id, "done", v, allPackDone)} />
                            </div>
                          )}
                          <button className="co-del" onClick={() => remove("pack", it)} aria-label={`Remove ${it.name}`}>×</button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            <form className="co-add" onSubmit={async (e) => {
              e.preventDefault();
              if (!packForm.name.trim()) return;
              if (await send({ op: "add", list: "pack", item: packForm })) setPackForm((f) => ({ ...f, name: "" }));
            }}>
              <input placeholder="Add something to pack…" aria-label="New packing item" value={packForm.name} onChange={(e) => setPackForm({ ...packForm, name: e.target.value })} />
              <select aria-label="Category" value={packForm.cat} onChange={(e) => setPackForm({ ...packForm, cat: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
              <button className="co-btn">Add</button>
            </form>
            <button className="co-ghost" onClick={() => send({ op: "uncheck", list: "pack" })}>Uncheck everything (for the trip home)</button>
          </section>
        )}

        {tab === "cam" && (
          <section>
            <div className="co-meters one"><Meter label="in the bag" done={camDone} total={trip.cam.length} tone="cam" /></div>
            <ul className="co-items">
              {trip.cam.map((it) => (
                <li key={it.id} className={`co-item${it.done ? " done" : ""}`}>
                  <div className="co-nm"><span className="co-name">{it.name}</span>{it.note && <small>{it.note}</small>}</div>
                  <Check checked={it.done} label={`Packed ${it.name}`} onChange={(v) => set("cam", it.id, "done", v, (s) => s.cam.every((x) => x.done))} />
                  <button className="co-del" onClick={() => remove("cam", it)} aria-label={`Remove ${it.name}`}>×</button>
                </li>
              ))}
            </ul>
            <form className="co-add" onSubmit={async (e) => {
              e.preventDefault();
              if (!camName.trim()) return;
              if (await send({ op: "add", list: "cam", item: { name: camName } })) setCamName("");
            }}>
              <input placeholder="Add gear…" aria-label="New gear item" value={camName} onChange={(e) => setCamName(e.target.value)} />
              <button className="co-btn">Add</button>
            </form>
            <p className="co-tip">Batteries die fast in the cold. Keep spares in an inside pocket, and use silent shutter.</p>
            <button className="co-ghost" onClick={() => send({ op: "uncheck", list: "cam" })}>Uncheck everything</button>
          </section>
        )}

        <footer className="co-foot"><button className="co-ghost" onClick={logout}>Log out</button></footer>
      </div>

      {toast && (
        <div className="co-toast" role="status">
          {toast.text}
          {toast.undo && <button onClick={() => { toast.undo(); setToast(null); }}>Undo</button>}
        </div>
      )}
    </div>
  );
}
