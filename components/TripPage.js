"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TripScene from "@/components/TripScene";
import { DayArt, Greetings } from "@/components/TripPostcards";

const CATS = ["Clothes", "Outdoor", "Fishing", "Car", "Fun", "Health"];
const PERSONAL = ["Clothes", "Outdoor", "Health"];
const TRIP_START = new Date("2026-11-19T00:00:00-06:00");
const DATES = { thu: "2026-11-19", fri: "2026-11-20", sat: "2026-11-21", sun: "2026-11-22" };
const LONG = { thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
const DIVIDE = [38.9419, -105.1578];
const isP = (it) => PERSONAL.includes(it.cat);

async function api(path, options) {
  const res = await fetch(path, { cache: "no-store", headers: { "content-type": "application/json" }, ...options });
  const data = await res.json().catch(() => ({ error: `Something went wrong (status ${res.status}).` }));
  return { ok: res.ok, status: res.status, data };
}

/* ---- Sun times (after SunCalc, Vladimir Agafonkin, BSD) ---- */
const rad = Math.PI / 180, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397, J0 = 0.0009;
const toDays = (d) => d.valueOf() / 864e5 - 0.5 + J1970 - J2000;
const fromJ = (j) => new Date((j + 0.5 - J1970) * 864e5);
function sunTimes(dateStr, lat, lng) {
  const lw = rad * -lng, phi = rad * lat, d = toDays(new Date(`${dateStr}T12:00:00-07:00`));
  const n = Math.round(d - J0 - lw / (2 * Math.PI));
  const ds = J0 + lw / (2 * Math.PI) + n;
  const M = rad * (357.5291 + 0.98560028 * ds);
  const L = M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const noon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const setFor = (h) => {
    const w = Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
    const a = J0 + (w + lw) / (2 * Math.PI) + n;
    return J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  };
  const set = setFor(-0.833 * rad), gold = setFor(6 * rad);
  return { rise: fromJ(noon - (set - noon)), set: fromJ(set), goldPM: fromJ(gold), goldAM: fromJ(noon - (gold - noon)) };
}
const mt = (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Denver" });

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
  if (days > 1) return `${days} sleeps to go`;
  if (days === 1) return "Leaving tomorrow";
  if (days > -4) return `Day ${1 - days} in the mountains`;
  return "Trip complete";
}

const mapsSearch = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const mapsRoute = (a, b) => `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(a)}&destination=${encodeURIComponent(b)}`;
const routable = (w) => w && !/\b(tbd|anytime)\b|→/i.test(w);
const fmtMins = (m) => (m >= 60 ? `${Math.floor(m / 60)} hr ${m % 60 ? `${m % 60} min` : ""}`.trim() : `${m} min`);

const Icon = {
  trip: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 19 L9 7 L13 14 L16 10 L21 19 Z" /></svg>,
  ideas: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18 H15 M10 21 H14 M12 3 a6 6 0 0 1 3.5 10.9 V16 H8.5 V13.9 A6 6 0 0 1 12 3Z" /></svg>,
  pack: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8 a5 5 0 0 1 10 0 V20 H7 Z" /><path d="M10 8 V5 h4 V8 M7 13 H17" /></svg>,
  cam: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8 H8 L9.5 5.5 H14.5 L16 8 H20 V19 H4 Z" /><circle cx="12" cy="13" r="3.5" /></svg>,
  check: <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5 L8.5 14 L15 6.5" /></svg>,
  plus: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5 V19 M5 12 H19" /></svg>,
  pin: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21 C12 21 5 14.5 5 9.5 a7 7 0 0 1 14 0 C19 14.5 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.4" /></svg>,
  house: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 L12 4 L21 11 M5 9.5 V20 H19 V9.5" /><path d="M10 20 V14 H14 V20" /></svg>,
  car: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16 V12 L6 7 H18 L20 12 V16 Z M4 12 H20" /><circle cx="7.5" cy="16.5" r="1.8" /><circle cx="16.5" cy="16.5" r="1.8" /></svg>,
};

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
  async function submit(ev) {
    ev.preventDefault();
    setBusy(true); setError("");
    const r = await api("/api/trip/login", { method: "POST", body: JSON.stringify({ user, password }) });
    setBusy(false);
    if (r.ok) onIn(); else setError(r.data.error || "Couldn't log in.");
  }
  return (
    <div className="co-login">
      <TripScene />
      <div className="co-loginIn">
        <Greetings sub="Colorado · Nov 19–22" />
        <form className="co-loginCard" onSubmit={submit}>
          <p className="co-hand">Wish you were here… oh wait, you are.</p>
          <label>Name<input autoComplete="username" value={user} onChange={(ev) => setUser(ev.target.value)} /></label>
          <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(ev) => setPassword(ev.target.value)} /></label>
          {error && <p className="co-err" role="alert">{error}</p>}
          <button className="co-btn" disabled={busy}>{busy ? "Checking…" : "Open the postcards"}</button>
        </form>
      </div>
    </div>
  );
}

/* ---- Forms ---- */
function useForm(init) {
  const [f, setF] = useState(init);
  return [f, (k) => (ev) => setF((x) => ({ ...x, [k]: ev.target.value })), setF];
}
function useSubmit(f, onSave, onClose) {
  const [busy, setBusy] = useState(false);
  const submit = async (ev) => {
    ev.preventDefault();
    if (!f.name.trim()) return;
    setBusy(true);
    const ok = await onSave(f);
    setBusy(false);
    if (ok) onClose();
  };
  return [busy, submit];
}
function FormShell({ onSubmit, label, children, busy, onRemove, extra }) {
  return (
    <form className="co-form" onSubmit={onSubmit}>
      {children}
      <div className="co-formBtns">
        <button className="co-btn" disabled={busy}>{busy ? "Saving…" : label}</button>
        {onRemove && <button type="button" className="co-remove" onClick={onRemove}>Remove</button>}
      </div>
      {extra}
    </form>
  );
}
function StopForm({ init, label, onSave, onClose, onRemove, days, dayK, extra, owner }) {
  const [f, bind, setF] = useForm({ time: "", name: "", where: "", link: "", note: "", day: dayK, secret: false, ...init });
  const [busy, submit] = useSubmit(f, onSave, onClose);
  return (
    <FormShell label={label} busy={busy} onSubmit={submit} onRemove={onRemove} extra={extra}>
      <label>What<input placeholder="Hot cocoa in Woodland Park" value={f.name} onChange={bind("name")} required /></label>
      <div className="co-two">
        <label>When<input placeholder="3 PM" value={f.time} onChange={bind("time")} /></label>
        <label>Day<select value={f.day} onChange={bind("day")}>{days.map((d) => <option key={d.k} value={d.k}>{d.d} · {d.date}</option>)}</select></label>
      </div>
      <label>Where <span className="co-opt">used for directions and drive times</span><input placeholder="Place or address" value={f.where} onChange={bind("where")} /></label>
      <label>Link <span className="co-opt">reservation, menu, tickets</span><input inputMode="url" placeholder="https://…" value={f.link} onChange={bind("link")} /></label>
      <label>Notes<textarea rows={3} placeholder="Confirmation #, hours, what to order, who's driving…" value={f.note} onChange={bind("note")} /></label>
      {owner && <PrivateBox f={f} setF={setF} />}
    </FormShell>
  );
}
function IdeaForm({ init, label, onSave, onClose, onRemove, owner }) {
  const [f, bind, setF] = useForm({ name: "", where: "", link: "", note: "", secret: false, ...init });
  const [busy, submit] = useSubmit(f, onSave, onClose);
  return (
    <FormShell label={label} busy={busy} onSubmit={submit} onRemove={onRemove}>
      <label>Idea<input placeholder="Cripple Creek gold mine tour" value={f.name} onChange={bind("name")} required /></label>
      <label>Where<input placeholder="Place or address" value={f.where} onChange={bind("where")} /></label>
      <label>Link<input inputMode="url" placeholder="https://…" value={f.link} onChange={bind("link")} /></label>
      <label>Notes<textarea rows={3} placeholder="Why it's worth it, hours, cost…" value={f.note} onChange={bind("note")} /></label>
      {owner && <PrivateBox f={f} setF={setF} />}
    </FormShell>
  );
}
function PackForm({ init, label, onSave, onClose, onRemove, members }) {
  const [f, bind] = useForm({ name: "", cat: "Clothes", qty: "", note: "", ...init });
  const [busy, submit] = useSubmit(f, onSave, onClose);
  return (
    <FormShell label={label} busy={busy} onSubmit={submit} onRemove={onRemove}>
      <label>Item<input placeholder="Hiking poles" value={f.name} onChange={bind("name")} required /></label>
      <div className="co-two">
        <label>How many<input placeholder="2 pairs" value={f.qty} onChange={bind("qty")} /></label>
        <label>Category<select value={f.cat} onChange={bind("cat")}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
      </div>
      {members.length > 1 && <p className="co-opt">{PERSONAL.includes(f.cat) ? `Personal: ${members.map((x) => x.label).join(" and ")} each tap their own name.` : "Shared gear: packed once either of you taps your name."}</p>}
      <label>Notes<textarea rows={2} placeholder="Brand, size, where it is, buy on the way…" value={f.note} onChange={bind("note")} /></label>
    </FormShell>
  );
}
function CamForm({ init, label, onSave, onClose, onRemove }) {
  const [f, bind] = useForm({ name: "", note: "", ...init });
  const [busy, submit] = useSubmit(f, onSave, onClose);
  return (
    <FormShell label={label} busy={busy} onSubmit={submit} onRemove={onRemove}>
      <label>Gear<input placeholder="ND filter" value={f.name} onChange={bind("name")} required /></label>
      <label>Notes<textarea rows={2} placeholder="Which lens, settings, reminders…" value={f.note} onChange={bind("note")} /></label>
    </FormShell>
  );
}

function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const k = (ev) => ev.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <div className="co-sheetBg" onClick={onClose}>
      <div className="co-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(ev) => ev.stopPropagation()}>
        <div className="co-grab" />
        <div className="co-sheetHead"><h2>{title}</h2><button className="co-close" onClick={onClose} aria-label="Close">×</button></div>
        {children}
      </div>
    </div>
  );
}

const CABIN = "413 Lake Drive W, Divide, CO 80814";

function CabinCode({ house, owner, onSave }) {
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(house.code || "");
  useEffect(() => { if (!editing) setCode(house.code || ""); }, [house.code, editing]);
  if (editing) return (
    <form className="co-codeForm" onSubmit={async (ev) => { ev.preventDefault(); if (await onSave(code)) setEditing(false); }}>
      <input value={code} onChange={(ev) => setCode(ev.target.value)} placeholder="e.g. 4821" inputMode="numeric" aria-label="Door code" autoFocus />
      <button className="co-btn">Save</button>
      <button type="button" className="co-linkBtn dim" onClick={() => setEditing(false)}>Cancel</button>
    </form>
  );
  return (
    <div className="co-code">
      <span>Door code</span>
      <b>{house.code || "Coming a few days before"}</b>
      {owner && <button className="co-linkBtn" onClick={() => setEditing(true)}>{house.code ? "Change" : "Add code"}</button>}
    </div>
  );
}

function CabinInfo({ house, owner, onSaveCode }) {
  return (
    <div className="co-cabin">
      <article className="co-welcome">
        <p className="co-script co-scriptDark">Welcome to</p>
        <h2>413 Lake Drive W</h2>
        <p className="co-addr">Divide, CO 80814</p>
        <div className="co-cabinBtns">
          <a className="co-btn" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(CABIN)}`} target="_blank" rel="noopener noreferrer">Directions in Google Maps</a>
        </div>
        <div className="co-alert">
          <b>Don&apos;t use Apple Maps.</b> It takes you past the house to the next street. Use Google Maps or another GPS app.
        </div>
        <div className="co-alert soft">
          <b>No cell service at the house.</b> Turn on Wi-Fi calling before you go so you can make calls once you&apos;re on the Starlink. Download offline maps too.
        </div>
      </article>

      <article className="co-welcome">
        <h3>Check in &amp; out</h3>
        <div className="co-times">
          <div><span>Check in</span><b>4 PM</b></div>
          <div><span>Check out</span><b>11 AM</b></div>
        </div>
        <p>Want to check in early? Ask the host. They&apos;ll do their best if no other guests are there.</p>
        <CabinCode house={house} owner={owner} onSave={onSaveCode} />
        <p>Enter the code to unlock the front door. To lock it, press the lock icon. Before you leave, double check that every door and window is locked.</p>
      </article>

      <article className="co-welcome">
        <h3>Shared driveway &amp; parking</h3>
        <p>The driveway serves two homes. Ours is <b>413: follow the driveway up to the left.</b> Please don&apos;t use the neighbor&apos;s driveway to turn around.</p>
        <p>There&apos;s room for <b>4 vehicles</b> in the parking spaces.</p>
      </article>

      <article className="co-welcome">
        <h3>Snow removal</h3>
        <p>A snow service clears the parking area, deck and hot tub patio, up to twice a day while it&apos;s snowing. No need to move cars; just know they&apos;ll be out plowing and shoveling.</p>
        <p>If there isn&apos;t enough snow for them to come out, shovels are by the entrance.</p>
      </article>

      <article className="co-welcome bear">
        <h3>Trash &amp; bears</h3>
        <p><b>Bears have been around recently.</b> Lock all trash in the bear cans out front: push the lid down hard until it latches, then pull up to test it.</p>
        <p>Don&apos;t leave any food or wrappers in the cars. Bears will damage them trying to get in.</p>
      </article>
    </div>
  );
}

const MEL_NICK = [{ key: "m", label: "Mel" }, { key: "k", label: "Nick" }];

function Toggles({ it, members, onSet }) {
  const solo = members.length === 1;
  return (
    <div className="co-who">
      {members.map(({ key, label }, i) => (
        <button key={key} className={`co-tog t${i}`} aria-pressed={!!it[key]} aria-label={`${label} packed ${it.name}`} onClick={() => onSet(key, !it[key])}>{solo ? "Packed" : label}</button>
      ))}
    </div>
  );
}

function PrivateBox({ f, setF }) {
  return (
    <label className="co-private">
      <input type="checkbox" checked={!!f.secret} onChange={(ev) => setF((x) => ({ ...x, secret: ev.target.checked }))} />
      <span>Private: only Mel &amp; Nick can see this<small>Alex, Casey and Wesley won&apos;t see it at all.</small></span>
    </label>
  );
}

function Tally({ rows, foot }) {
  return (
    <div className="co-tally">
      <div className="co-tallyRows">
        {rows.map(([label, done, total, tone]) => (
          <div key={label} className={`co-t ${tone}`}>
            <span>{label}</span>
            <b>{done}<small>/{total}</small></b>
            <i><em style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></i>
          </div>
        ))}
      </div>
      {foot && <p className="co-tallyFoot">{foot}</p>}
    </div>
  );
}

export default function TripPage() {
  const [auth, setAuth] = useState("checking");
  const [trip, setTrip] = useState(null);
  const [who, setWho] = useState(null);
  const [saved, setSaved] = useState(true);
  const [tab, setTab] = useState("plan");
  const [day, setDay] = useState("thu");
  const [cat, setCat] = useState("All");
  const [toast, setToast] = useState(null);
  const [burst, setBurst] = useState(0);
  const [sheet, setSheet] = useState(null);
  const [reorder, setReorder] = useState(false);
  const [weather, setWeather] = useState(null);
  const [drive, setDrive] = useState({});
  const pending = useRef(0);
  const asked = useRef(new Set());

  const load = useCallback(async () => {
    if (pending.current) return;
    const r = await api("/api/trip");
    if (r.status === 401) { setAuth("login"); return; }
    if (!r.ok) { setToast({ text: r.data.error }); return; }
    setTrip(r.data.trip); setWho(r.data.me); setSaved(r.data.saved); setAuth("in");
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (auth !== "in") return;
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 15000);
    api("/api/trip/weather").then((r) => r.ok && setWeather(r.data));
    return () => clearInterval(t);
  }, [auth, load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.undo ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Drive times between consecutive stops of the open day.
  const D = trip ? trip.days.find((d) => d.k === day) || trip.days[0] : null;
  const legKey = (a, b) => `${a}|${b}`.toLowerCase();
  const legs = D ? D.stops.slice(1).map((s, i) => [D.stops[i].where, s.where]).filter(([a, b]) => routable(a) && routable(b) && a.toLowerCase() !== b.toLowerCase()) : [];
  const legSig = legs.map(([a, b]) => legKey(a, b)).join("~");
  useEffect(() => {
    const need = legs.filter(([a, b]) => !asked.current.has(legKey(a, b)));
    if (!need.length) return;
    need.forEach(([a, b]) => asked.current.add(legKey(a, b)));
    api("/api/trip/drive", { method: "POST", body: JSON.stringify({ pairs: need }) }).then((r) => {
      if (!r.ok) return;
      setDrive((m) => { const n = { ...m }; need.forEach(([a, b], i) => { n[legKey(a, b)] = r.data.minutes[i]; }); return n; });
    });
  }, [legSig]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setSheet(null);
    setToast({ text: `Removed ${item.name}`, undo: () => send({ op: "add", list, day: dayK, item }) });
  }

  const moveStop = (id, dayK, index) => send({ op: "moveStop", id, day: dayK, index }, (s) => {
    let it = null;
    s.days.forEach((d) => { const i = d.stops.findIndex((x) => x.id === id); if (i >= 0) it = d.stops.splice(i, 1)[0]; });
    if (!it) { const i = s.ideas.findIndex((x) => x.id === id); if (i >= 0) { const idea = s.ideas.splice(i, 1)[0]; it = { ...idea, time: "Anytime", done: false }; } }
    if (!it) return s;
    const target = s.days.find((d) => d.k === dayK);
    target.stops.splice(index == null ? target.stops.length : Math.max(0, Math.min(index, target.stops.length)), 0, it);
    return s;
  });

  const edit = (list, id, fields) => send({ op: "edit", list, id, fields }, (s) => { Object.assign(findIn(s, list, id), fields); return s; });
  const add = (list, item, dayK) => send({ op: "add", list, day: dayK, item });
  const closeSheet = useCallback(() => setSheet(null), []);

  async function logout() { await api("/api/trip/login", { method: "DELETE" }); setAuth("login"); setTrip(null); setWho(null); setTab("plan"); }

  if (auth === "checking") return <div className="co co-loading"><p>Sorting the postcards…</p></div>;
  if (auth === "login") return <div className="co"><Login onIn={load} /></div>;
  if (!trip || !who) return null;
  const owner = who.role === "owner";
  const members = who.members;

  const P = trip.pack.filter(isP), SH = trip.pack.filter((x) => !isP(x));
  const packed = (x) => (isP(x) ? members.every((m) => x[m.key]) : members.some((m) => x[m.key]));
  const allPackDone = (s) => s.pack.every(packed);
  const dayDone = (k) => (s) => s.days.find((d) => d.k === k).stops.every((x) => x.done);
  const camDone = owner ? trip.cam.filter((x) => x.m || x.k).length : 0;
  const shownCats = cat === "All" ? CATS : [cat];
  const dayIndex = trip.days.findIndex((d) => d.k === D.k);
  const sun = sunTimes(DATES[D.k], DIVIDE[0], DIVIDE[1]);
  const wx = weather?.days?.[DATES[D.k]];

  const tabs = [["plan", "Trip", Icon.trip], ["ideas", "Ideas", Icon.ideas], ["pack", "Pack", Icon.pack], ["cabin", "Cabin", Icon.house], ...(owner ? [["cam", "Camera", Icon.cam]] : [])];
  const tallyRows = members.length === 1
    ? [[who.name, trip.pack.filter(packed).length, trip.pack.length, "t0"]]
    : [...members.map((m, i) => [m.label, P.filter((x) => x[m.key]).length, P.length, `t${i}`]), ["Shared", SH.filter((x) => members.some((m) => x[m.key])).length, SH.length, "shared"]];
  const fab = {
    plan: [`Add a stop to ${D.d}`, () => setSheet({ kind: "stop" })],
    ideas: ["Add an idea", () => setSheet({ kind: "idea" })],
    pack: ["Add something to pack", () => setSheet({ kind: "pack" })],
    cam: ["Add gear", () => setSheet({ kind: "cam" })],
  }[tab] || [`Add a stop to ${D.d}`, () => setSheet({ kind: "stop" })];

  return (
    <div className="co co-post">
      <Snow burst={burst} />

      <header className="co-hero">
        <TripScene />
        <div className="co-heroIn">
          <Greetings sub="Colorado · Nov 19–22" />
          <span className="co-chip">{countdown()}</span>
        </div>
      </header>

      <nav className={`co-tabs${owner ? " five" : ""}`} aria-label="Sections">
        <div className="co-tabsIn">
          {tabs.map(([k, l, ic]) => (
            <button key={k} aria-current={tab === k ? "page" : undefined} onClick={() => { setTab(k); setReorder(false); }}>{ic}<span>{l}</span></button>
          ))}
        </div>
      </nav>

      <div className="co-body">
        {!saved && <p className="co-warn">Storage isn&apos;t connected here, so changes won&apos;t be saved.</p>}

        {tab === "plan" && (
          <section className="co-pad">
            <div className="co-thumbs" role="tablist" aria-label="Day">
              {trip.days.map((d, i) => {
                const n = d.stops.filter((x) => x.done).length;
                return (
                  <button key={d.k} role="tab" aria-selected={d.k === day} className={`co-thumb r${i}`} onClick={() => { setDay(d.k); setReorder(false); }}>
                    <DayArt k={d.k} className="co-thumbArt" />
                    <span className="co-thumbTxt"><b>{d.d}</b> {d.date.replace("Nov ", "")}<small>{n}/{d.stops.length}</small></span>
                  </button>
                );
              })}
            </div>

            <article className="co-card">
              <div className="co-front">
                <DayArt k={D.k} className="co-frontArt" />
                <div className="co-frontTxt">
                  <p className="co-script">Day {dayIndex + 1} · {LONG[D.k]}, {D.date}</p>
                  <h2>{D.title}</h2>
                  <p className="co-frontSub">{D.sub}</p>
                </div>
                <div className="co-stampBox" aria-label="Forecast for Divide">
                  {wx && (wx.high != null || wx.low != null) ? (
                    <>
                      <b>{wx.high != null ? `${wx.high}°` : "—"}</b><small>{wx.low != null ? `low ${wx.low}°` : ""}</small>
                      <span>{wx.short}</span>
                    </>
                  ) : (
                    <><b className="co-stampQ">?°</b><span>{weather?.unavailable ? "Forecast unavailable" : "Forecast posts about a week out"}</span></>
                  )}
                </div>
              </div>
              <div className="co-sunStrip">
                <span><i>Sunrise</i> {mt(sun.rise)}</span>
                <span><i>Golden hour</i> {mt(sun.goldPM)}</span>
                <span><i>Sunset</i> {mt(sun.set)}</span>
                <span className="co-mt">Mountain time · Divide</span>
              </div>

              <div className="co-back">
                <div className="co-backHead">
                  <h3>The plan</h3>
                  {owner && D.stops.length > 1 && <button className="co-linkBtn" onClick={() => setReorder((r) => !r)}>{reorder ? "Done reordering" : "Reorder"}</button>}
                </div>
                <ol className="co-stops">
                  {D.stops.map((s, i) => {
                    const next = D.stops[i + 1];
                    const showLeg = next && routable(s.where) && routable(next.where) && s.where.toLowerCase() !== next.where.toLowerCase();
                    const mins = showLeg ? drive[legKey(s.where, next.where)] : undefined;
                    return (
                      <li key={s.id} className="co-stopWrap">
                        <div className={`co-stop${s.done ? " done" : ""}`}>
                          <span className="co-time">{s.time}</span>
                          <div className="co-stopBody">
                            <button className="co-stopName" onClick={() => setSheet({ kind: "stop", item: s })}>{s.name}</button>
                            {s.secret && <span className="co-lock">Private · Mel &amp; Nick only</span>}
                            {s.where && <p className="co-where">{s.where}</p>}
                            {s.note && <p className="co-note">{s.note}</p>}
                            {(routable(s.where) || s.link) && (
                              <p className="co-links">
                                {routable(s.where) && <a href={mapsSearch(s.where)} target="_blank" rel="noopener noreferrer">{Icon.pin}Directions</a>}
                                {s.link && <a href={s.link} target="_blank" rel="noopener noreferrer">Open link ↗</a>}
                              </p>
                            )}
                          </div>
                          {reorder ? (
                            <div className="co-order">
                              <button disabled={i === 0} onClick={() => moveStop(s.id, D.k, i - 1)} aria-label={`Move ${s.name} up`}>▲</button>
                              <button disabled={i === D.stops.length - 1} onClick={() => moveStop(s.id, D.k, i + 1)} aria-label={`Move ${s.name} down`}>▼</button>
                            </div>
                          ) : (
                            <div className="co-acts">
                              <button className="co-check" aria-pressed={s.done} aria-label={`${s.done ? "Undo" : "Done"}: ${s.name}`} onClick={() => set("stops", s.id, "done", !s.done, dayDone(D.k))}>{Icon.check}</button>
                              <button className="co-del" onClick={() => remove("stops", s, D.k)} aria-label={`Remove ${s.name}`}>×</button>
                            </div>
                          )}
                          {s.done && <span className="co-visited" aria-hidden="true">Visited</span>}
                        </div>
                        {showLeg && (
                          <div className="co-leg">
                            {Icon.car}
                            {mins ? <span>About {fmtMins(mins)} drive</span> : <span>Drive</span>}
                            <a href={mapsRoute(s.where, next.where)} target="_blank" rel="noopener noreferrer">Route ↗</a>
                          </div>
                        )}
                      </li>
                    );
                  })}
                  {!D.stops.length && <li className="co-emptyBack">A free day. Write something in, or pull from your ideas.</li>}
                </ol>
                <button className="co-writeIn" onClick={() => setSheet({ kind: "stop" })}>+ Write in a stop</button>
              </div>
            </article>
            <p className="co-hint">Tap a stop&apos;s name to edit it or move it to another day.</p>
          </section>
        )}

        {tab === "ideas" && (
          <section className="co-pad">
            <p className="co-boardHead">Places you might want to go. Drop one onto a day when you decide.</p>
            <ul className="co-notes">
              {trip.ideas.map((it, i) => (
                <li key={it.id} className={`co-noteCard r${i % 4}`}>
                  <span className="co-tape" aria-hidden="true" />
                  <button className="co-noteName" onClick={() => setSheet({ kind: "idea", item: it })}>{it.name}</button>
                  {it.secret && <span className="co-lock">Private · Mel &amp; Nick only</span>}
                  {it.where && <p className="co-where">{it.where}</p>}
                  {it.note && <p className="co-hand">{it.note}</p>}
                  {(routable(it.where) || it.link) && (
                    <p className="co-links">
                      {routable(it.where) && <a href={mapsSearch(it.where)} target="_blank" rel="noopener noreferrer">{Icon.pin}Map</a>}
                      {it.link && <a href={it.link} target="_blank" rel="noopener noreferrer">Open link ↗</a>}
                    </p>
                  )}
                  <div className="co-putOn">
                    <span>Put it on</span>
                    {trip.days.map((d) => (
                      <button key={d.k} onClick={() => { moveStop(it.id, d.k); setToast({ text: `Added ${it.name} to ${d.d}` }); }}>{d.d}</button>
                    ))}
                  </div>
                  <button className="co-del co-noteDel" onClick={() => remove("ideas", it)} aria-label={`Remove ${it.name}`}>×</button>
                </li>
              ))}
              {!trip.ideas.length && <li className="co-emptyBoard">No ideas yet. Tap + to pin one.</li>}
            </ul>
          </section>
        )}

        {tab === "pack" && (
          <>
            <section className="co-pad co-padTop">
              <Tally
                rows={tallyRows}
                foot={cheer(trip.pack.filter(packed).length, trip.pack.length)}
              />
            </section>
            <div className="co-stick">
              <div className="co-chips">
                {["All", ...CATS].map((c) => <button key={c} aria-pressed={c === cat} onClick={() => setCat(c)}>{c}</button>)}
              </div>
            </div>
            <section className="co-pad">
              <div className="co-tags">
                {shownCats.map((c) => {
                  const its = trip.pack.filter((p) => p.cat === c);
                  if (!its.length) return null;
                  return (
                    <div key={c} className="co-luggage">
                      <span className="co-grommet" aria-hidden="true" />
                      <div className="co-tagHead"><h3>{c}</h3><span>{members.length > 1 ? `${PERSONAL.includes(c) ? "each of us" : "shared"} · ` : ""}{its.filter(packed).length}/{its.length}</span></div>
                      <ul className="co-rows">
                        {its.map((it) => (
                          <li key={it.id} className={packed(it) ? "done" : ""}>
                            <button className="co-rowMain" onClick={() => setSheet({ kind: "pack", item: it })}>
                              <span className="co-rowName">{it.qty && <em>{it.qty}</em>}{it.name}</span>
                              {it.note && <small>{it.note}</small>}
                            </button>
                            <Toggles it={it} members={members} onSet={(w, v) => set("pack", it.id, w, v, allPackDone)} />
                            <button className="co-del" onClick={() => remove("pack", it)} aria-label={`Remove ${it.name}`}>×</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
              <p className="co-hint">{members.length > 1 ? "Your own stuff needs both names; shared gear needs one. " : ""}Tap an item to edit it. Only you{members.length > 1 ? ` and ${members.find((m) => m.label !== who.name)?.label}` : ""} can see this list.</p>
              <button className="co-linkBtn dim" onClick={() => send({ op: "uncheck", list: "pack" })}>Uncheck everything for the trip home</button>
            </section>
          </>
        )}

        {tab === "cabin" && (
          <section className="co-pad">
            <CabinInfo house={trip.house || { code: "" }} owner={owner} onSaveCode={(code) => send({ op: "house", code }, (s) => { s.house = { ...(s.house || {}), code }; return s; })} />
          </section>
        )}

        {tab === "cam" && owner && (
          <section className="co-pad">
            <Tally rows={[["In the bag", camDone, trip.cam.length, "shared"]]} />
            <div className="co-luggage film">
              <span className="co-grommet" aria-hidden="true" />
              <div className="co-tagHead"><h3>Camera bag</h3><span>{camDone}/{trip.cam.length}</span></div>
              <ul className="co-rows">
                {trip.cam.map((it) => (
                  <li key={it.id} className={it.m || it.k ? "done" : ""}>
                    <button className="co-rowMain" onClick={() => setSheet({ kind: "cam", item: it })}>
                      <span className="co-rowName">{it.name}</span>{it.note && <small>{it.note}</small>}
                    </button>
                    <Toggles it={it} members={MEL_NICK} onSet={(w, v) => set("cam", it.id, w, v, (s) => s.cam.every((x) => x.m || x.k))} />
                    <button className="co-del" onClick={() => remove("cam", it)} aria-label={`Remove ${it.name}`}>×</button>
                  </li>
                ))}
              </ul>
            </div>
            <p className="co-hint">Cold drains batteries fast at 9,000 ft. Keep spares in an inside pocket.</p>
            <button className="co-linkBtn dim" onClick={() => send({ op: "uncheck", list: "cam" })}>Uncheck everything</button>
          </section>
        )}

        <footer className="co-foot"><span>Signed in as {who.name} · Divide, CO 80814 · Center of the Known Universe</span><button className="co-linkBtn dim" onClick={logout}>Log out</button></footer>
      </div>

      {tab !== "cabin" && <button className="co-fab" onClick={fab[1]} aria-label={fab[0]}>{Icon.plus}<span>{fab[0]}</span></button>}

      {sheet?.kind === "stop" && (
        <Sheet title={sheet.item ? "Edit stop" : `New stop · ${D.d}`} onClose={closeSheet}>
          <StopForm owner={owner} init={sheet.item} days={trip.days} dayK={D.k} label={sheet.item ? "Save" : "Add stop"} onClose={closeSheet}
            onSave={async (f) => {
              if (!sheet.item) { const ok = await add("stops", f, f.day); if (ok && f.day !== D.k) setDay(f.day); return ok; }
              const ok = await edit("stops", sheet.item.id, { time: f.time, name: f.name, where: f.where, link: f.link, note: f.note, ...(owner ? { secret: !!f.secret } : {}) });
              if (ok && f.day !== D.k) { await moveStop(sheet.item.id, f.day); setToast({ text: `Moved to ${trip.days.find((d) => d.k === f.day).d}` }); }
              return ok;
            }}
            onRemove={sheet.item ? () => remove("stops", sheet.item, D.k) : null}
            extra={sheet.item ? (
              <button type="button" className="co-linkBtn" onClick={() => { const it = sheet.item; send({ op: "toIdeas", id: it.id }); setSheet(null); setToast({ text: `${it.name} moved to Ideas` }); }}>Not sure yet? Move it to Ideas</button>
            ) : null} />
        </Sheet>
      )}
      {sheet?.kind === "idea" && (
        <Sheet title={sheet.item ? "Edit idea" : "Pin an idea"} onClose={closeSheet}>
          <IdeaForm owner={owner} init={sheet.item} label={sheet.item ? "Save" : "Pin it"} onClose={closeSheet}
            onSave={(f) => sheet.item ? edit("ideas", sheet.item.id, { name: f.name, where: f.where, link: f.link, note: f.note, ...(owner ? { secret: !!f.secret } : {}) }) : add("ideas", f)}
            onRemove={sheet.item ? () => remove("ideas", sheet.item) : null} />
        </Sheet>
      )}
      {sheet?.kind === "pack" && (
        <Sheet title={sheet.item ? "Edit item" : "Pack something"} onClose={closeSheet}>
          <PackForm members={members} init={sheet.item || { cat: cat === "All" ? "Clothes" : cat }} label={sheet.item ? "Save" : "Add to the list"} onClose={closeSheet}
            onSave={(f) => sheet.item ? edit("pack", sheet.item.id, { name: f.name, cat: f.cat, qty: f.qty, note: f.note }) : add("pack", f)}
            onRemove={sheet.item ? () => remove("pack", sheet.item) : null} />
        </Sheet>
      )}
      {sheet?.kind === "cam" && owner && (
        <Sheet title={sheet.item ? "Edit gear" : "Add gear"} onClose={closeSheet}>
          <CamForm init={sheet.item} label={sheet.item ? "Save" : "Add to the bag"} onClose={closeSheet}
            onSave={(f) => sheet.item ? edit("cam", sheet.item.id, { name: f.name, note: f.note }) : add("cam", f)}
            onRemove={sheet.item ? () => remove("cam", sheet.item) : null} />
        </Sheet>
      )}

      {toast && (
        <div className="co-toast" role="status">
          {toast.text}
          {toast.undo && <button onClick={() => { toast.undo(); setToast(null); }}>Undo</button>}
        </div>
      )}
    </div>
  );
}
