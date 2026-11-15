"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TripScene from "@/components/TripScene";

const CATS = ["Clothes", "Outdoor", "Fishing", "Car", "Fun", "Health"];
const PERSONAL = ["Clothes", "Outdoor", "Health"];
const WHO = { "": "Who's bringing it?", m: "Mel's bringing", k: "Nick's bringing", b: "We both are" };
const NEXT_WHO = { "": "m", m: "k", k: "b", b: "" };
const TRIP_START = new Date("2026-11-19T00:00:00-06:00");
const isP = (it) => PERSONAL.includes(it.cat);

async function api(path, options) {
  const res = await fetch(path, { cache: "no-store", headers: { "content-type": "application/json" }, ...options });
  const data = await res.json().catch(() => ({ error: `Something went wrong (status ${res.status}).` }));
  return { ok: res.ok, status: res.status, data };
}

function cheer(done, total) {
  if (!total) return "Nothing on the list yet.";
  const p = done / total;
  if (p === 1) return "Everything's packed. See you at 9,165 feet.";
  if (p >= 0.75) return "Almost to the summit.";
  if (p >= 0.4) return "Halfway up the trail.";
  if (p > 0) return "Off the trailhead.";
  return "Nothing packed yet. No rush… yet.";
}

function countdown() {
  const days = Math.ceil((TRIP_START - Date.now()) / 864e5);
  if (days > 1) return { n: days, label: "sleeps to go" };
  if (days === 1) return { n: 1, label: "sleep to go" };
  if (days > -4) return { n: 1 - days, label: `day in the mountains` };
  return { n: "✓", label: "trip complete" };
}

function Snow({ burst }) {
  if (!burst) return null;
  return (
    <div className="co-snow" key={burst} aria-hidden="true">
      {Array.from({ length: 60 }, (_, i) => (
        <i key={i} style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i % 12) * 90}ms`, width: 3 + (i % 4) * 2, height: 3 + (i % 4) * 2, "--drift": `${((i % 7) - 3) * 18}px` }} />
      ))}
      <p className="co-snowmsg">All done!</p>
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
      <TripScene />
      <form className="co-loginCard" onSubmit={submit}>
        <p className="co-meta">Divide, CO · 9,165 ft</p>
        <h1>Trailhead</h1>
        <p className="co-soft">Members only. Mel or Nick, sign in.</p>
        <label>Name<input autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p className="co-err" role="alert">{error}</p>}
        <button className="co-btn" disabled={busy}>{busy ? "Checking…" : "Head up the mountain"}</button>
      </form>
    </div>
  );
}

function Progress({ label, done, total, tone }) {
  return (
    <div className={`co-prog ${tone}`}>
      <div className="co-progtop"><span>{label}</span><b>{done}<small>/{total}</small></b></div>
      <div className="co-track"><div style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
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
    setToast({ text: `Removed ${item.name}`, undo: () => send({ op: "add", list, day: dayK, item }) });
  }

  async function logout() { await api("/api/trip/login", { method: "DELETE" }); setAuth("login"); setTrip(null); }

  if (auth === "checking") return <div className="co co-loading"><p>Climbing to 9,165 ft…</p></div>;
  if (auth === "login") return <div className="co"><Login onIn={load} /></div>;
  if (!trip) return null;

  const D = trip.days.find((d) => d.k === day) || trip.days[0];
  const P = trip.pack.filter(isP), SH = trip.pack.filter((x) => !isP(x));
  const mine = (w) => SH.filter((x) => x.who === w || x.who === "b");
  const melDone = P.filter((x) => x.m).length + mine("m").filter((x) => x.done).length;
  const nickDone = P.filter((x) => x.k).length + mine("k").filter((x) => x.done).length;
  const allPackDone = (s) => s.pack.every((x) => (isP(x) ? x.m && x.k : x.done));
  const dayDone = (k) => (s) => s.days.find((d) => d.k === k).stops.every((x) => x.done);
  const camDone = trip.cam.filter((x) => x.done).length;
  const shownCats = cat === "All" ? CATS : [cat];
  const cd = countdown();

  return (
    <div className="co">
      <Snow burst={burst} />
      <header className="co-hero">
        <TripScene />
        <div className="co-heroText">
          <div>
            <p className="co-meta">Teller County · 9,165 ft · “Center of the Known Universe”</p>
            <h1>Divide, Colorado</h1>
            <p className="co-sub">Nov 19–22 · Mel &amp; Nick · Under Pikes Peak</p>
          </div>
          <div className="co-count"><b>{cd.n}</b><span>{cd.label}</span></div>
        </div>
      </header>

      <nav className="co-nav" role="tablist">
        <div className="co-navIn">
          {[["plan", "Itinerary"], ["pack", "Packing"], ["cam", "Camera bag"]].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </nav>

      {!saved && <p className="co-warn">Storage isn&apos;t connected here, so changes won&apos;t be saved.</p>}

      <main className="co-main">
        {tab === "plan" && (
          <section>
            <ol className="co-route">
              {trip.days.map((d, i) => {
                const n = d.stops.filter((x) => x.done).length;
                const complete = d.stops.length && n === d.stops.length;
                return (
                  <li key={d.k}>
                    <button aria-pressed={d.k === day} className={complete ? "complete" : ""} onClick={() => { setDay(d.k); setAdding(false); }}>
                      <span className="co-node">{complete ? "✓" : i + 1}</span>
                      <b>{d.d}</b><small>{d.date}</small>
                      <em>{n}/{d.stops.length}</em>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="co-dayhead">
              <h2>{D.title}</h2>
              <p>{D.d}, {D.date} · {D.sub}</p>
            </div>

            <ol className="co-trail">
              {D.stops.map((s) => (
                <li key={s.id} className={s.done ? "done" : ""}>
                  <span className="co-when">{s.time}</span>
                  <button className="co-way" aria-pressed={s.done} aria-label={`${s.done ? "Undo" : "Mark done"}: ${s.name}`} onClick={() => set("stops", s.id, "done", !s.done, dayDone(D.k))}>
                    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5 L8.5 14 L15 6.5" /></svg>
                  </button>
                  <div className="co-stopBody">
                    <h3>{s.name}</h3>
                    {s.where && <p className="co-where">{s.where}</p>}
                    {s.note && <p className="co-note">{s.note}</p>}
                  </div>
                  <button className="co-x" onClick={() => remove("stops", s, D.k)} aria-label={`Remove ${s.name}`}>×</button>
                </li>
              ))}
              <li className="co-addRow">
                <span className="co-when" />
                <span className="co-way ghost">+</span>
                {adding ? (
                  <form className="co-stopForm" onSubmit={async (e) => {
                    e.preventDefault();
                    if (!stopForm.name.trim()) return;
                    if (await send({ op: "add", list: "stops", day: D.k, item: stopForm })) { setStopForm({ time: "", name: "", where: "", note: "" }); setAdding(false); }
                  }}>
                    <div className="co-two">
                      <label>When<input placeholder="3 PM" value={stopForm.time} onChange={(e) => setStopForm({ ...stopForm, time: e.target.value })} /></label>
                      <label>What<input placeholder="Hot cocoa in Woodland Park" value={stopForm.name} onChange={(e) => setStopForm({ ...stopForm, name: e.target.value })} required /></label>
                    </div>
                    <label>Where<input value={stopForm.where} onChange={(e) => setStopForm({ ...stopForm, where: e.target.value })} /></label>
                    <label>Notes<input value={stopForm.note} onChange={(e) => setStopForm({ ...stopForm, note: e.target.value })} /></label>
                    <div className="co-formBtns"><button className="co-btn">Add to {D.d}</button><button type="button" className="co-link" onClick={() => setAdding(false)}>Cancel</button></div>
                  </form>
                ) : (
                  <button className="co-addStop" onClick={() => setAdding(true)}>Add a stop to {D.d}</button>
                )}
              </li>
            </ol>
          </section>
        )}

        {tab === "pack" && (
          <section className="co-split">
            <aside className="co-side">
              <Progress label="Mel" done={melDone} total={P.length + mine("m").length} tone="mel" />
              <Progress label="Nick" done={nickDone} total={P.length + mine("k").length} tone="nick" />
              <Progress label="Shared gear" done={SH.filter((x) => x.done).length} total={SH.length} tone="shared" />
              <p className="co-cheer">{cheer(trip.pack.filter((x) => (isP(x) ? x.m && x.k : x.done)).length, trip.pack.length)}</p>
              <p className="co-soft co-small">Clothes, outdoor and health: tap your own name. Car, fishing and fun gear is shared: tap the tag to pick Mel, Nick or both.</p>
              <div className="co-chips">
                {["All", ...CATS].map((c) => <button key={c} aria-pressed={c === cat} onClick={() => { setCat(c); if (c !== "All") setPackForm((f) => ({ ...f, cat: c })); }}>{c}</button>)}
              </div>
            </aside>
            <div>
              {shownCats.map((c) => {
                const its = trip.pack.filter((p) => p.cat === c);
                if (!its.length) return null;
                return (
                  <div key={c} className="co-group">
                    <h3>{c}<span>{PERSONAL.includes(c) ? "each of us" : "shared"}</span></h3>
                    <ul className="co-list">
                      {its.map((it) => {
                        const done = isP(it) ? it.m && it.k : it.done;
                        return (
                          <li key={it.id} className={done ? "done" : ""}>
                            <div className="co-nm"><span>{it.name}</span>{it.note && <small>{it.note}</small>}</div>
                            {isP(it) ? (
                              <div className="co-who">
                                {[["m", "Mel"], ["k", "Nick"]].map(([w, lab]) => (
                                  <button key={w} className={`co-tog ${w}`} aria-pressed={it[w]} onClick={() => set("pack", it.id, w, !it[w], allPackDone)}>{lab}</button>
                                ))}
                              </div>
                            ) : (
                              <div className="co-who">
                                <button className={`co-claim ${it.who}`} onClick={() => set("pack", it.id, "who", NEXT_WHO[it.who])}>{WHO[it.who]}</button>
                                <button className="co-tog all" aria-pressed={it.done} aria-label={`Packed ${it.name}`} onClick={() => set("pack", it.id, "done", !it.done, allPackDone)}>Packed</button>
                              </div>
                            )}
                            <button className="co-x" onClick={() => remove("pack", it)} aria-label={`Remove ${it.name}`}>×</button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
              <form className="co-addLine" onSubmit={async (e) => {
                e.preventDefault();
                if (!packForm.name.trim()) return;
                if (await send({ op: "add", list: "pack", item: packForm })) setPackForm((f) => ({ ...f, name: "" }));
              }}>
                <input placeholder="Add something to pack" aria-label="New packing item" value={packForm.name} onChange={(e) => setPackForm({ ...packForm, name: e.target.value })} />
                <select aria-label="Category" value={packForm.cat} onChange={(e) => setPackForm({ ...packForm, cat: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
                <button className="co-btn">Add</button>
              </form>
              <button className="co-link" onClick={() => send({ op: "uncheck", list: "pack" })}>Uncheck everything for the trip home</button>
            </div>
          </section>
        )}

        {tab === "cam" && (
          <section className="co-split">
            <aside className="co-side">
              <Progress label="In the bag" done={camDone} total={trip.cam.length} tone="cam" />
              <p className="co-soft co-small">Cold drains batteries fast at 9,000 feet. Keep spares in an inside pocket, and switch to silent shutter.</p>
            </aside>
            <div>
              <ul className="co-list">
                {trip.cam.map((it) => (
                  <li key={it.id} className={it.done ? "done" : ""}>
                    <div className="co-nm"><span>{it.name}</span>{it.note && <small>{it.note}</small>}</div>
                    <button className="co-tog all" aria-pressed={it.done} aria-label={`Packed ${it.name}`} onClick={() => set("cam", it.id, "done", !it.done, (s) => s.cam.every((x) => x.done))}>Packed</button>
                    <button className="co-x" onClick={() => remove("cam", it)} aria-label={`Remove ${it.name}`}>×</button>
                  </li>
                ))}
              </ul>
              <form className="co-addLine" onSubmit={async (e) => {
                e.preventDefault();
                if (!camName.trim()) return;
                if (await send({ op: "add", list: "cam", item: { name: camName } })) setCamName("");
              }}>
                <input placeholder="Add gear" aria-label="New gear item" value={camName} onChange={(e) => setCamName(e.target.value)} />
                <button className="co-btn">Add</button>
              </form>
              <button className="co-link" onClick={() => send({ op: "uncheck", list: "cam" })}>Uncheck everything</button>
            </div>
          </section>
        )}
      </main>

      <footer className="co-foot">
        <span>38°56′N 105°09′W</span>
        <button className="co-link" onClick={logout}>Log out</button>
      </footer>

      {toast && (
        <div className="co-toast" role="status">
          {toast.text}
          {toast.undo && <button onClick={() => { toast.undo(); setToast(null); }}>Undo</button>}
        </div>
      )}
    </div>
  );
}
