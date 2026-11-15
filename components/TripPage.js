"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TripScene from "@/components/TripScene";

const CATS = ["Clothes", "Outdoor", "Fishing", "Car", "Fun", "Health"];
const PERSONAL = ["Clothes", "Outdoor", "Health"];
const WHO = { "": "Who's bringing?", m: "Mel", k: "Nick", b: "Both" };
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
  if (days > 1) return `${days} sleeps to go`;
  if (days === 1) return "Leaving tomorrow";
  if (days > -4) return `Day ${1 - days} in the mountains`;
  return "Trip complete";
}

const Icon = {
  trip: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 19 L9 7 L13 14 L16 10 L21 19 Z" /><circle cx="17" cy="5" r="1.6" /></svg>,
  pack: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8 a5 5 0 0 1 10 0 V20 H7 Z" /><path d="M10 8 V5 h4 V8" /><path d="M7 13 H17" /></svg>,
  cam: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8 H8 L9.5 5.5 H14.5 L16 8 H20 V19 H4 Z" /><circle cx="12" cy="13" r="3.5" /></svg>,
  check: <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5 L8.5 14 L15 6.5" /></svg>,
  plus: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5 V19 M5 12 H19" /></svg>,
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

function useForm(init) {
  const [f, setF] = useState(init);
  return [f, (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))];
}

function useSubmit(f, onSave, onClose) {
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    setBusy(true);
    const ok = await onSave(f);
    setBusy(false);
    if (ok) onClose();
  };
  return [busy, submit];
}

function FormShell({ onSubmit, label, children, busy, onRemove }) {
  return (
    <form className="co-form" onSubmit={onSubmit}>
      {children}
      <div className="co-formBtns">
        <button className="co-btn" disabled={busy}>{busy ? "Saving…" : label}</button>
        {onRemove && <button type="button" className="co-remove" onClick={onRemove}>Remove</button>}
      </div>
    </form>
  );
}

function StopForm({ init, label, onSave, onClose, onRemove }) {
  const [f, bind] = useForm({ time: "", name: "", where: "", link: "", note: "", ...init });
  const [busy, submit] = useSubmit(f, onSave, onClose);
  return (
    <FormShell label={label} busy={busy} onSubmit={submit} onRemove={onRemove}>
      <label>What<input placeholder="Hot cocoa in Woodland Park" value={f.name} onChange={bind("name")} required /></label>
      <div className="co-two">
        <label>When<input placeholder="3 PM" value={f.time} onChange={bind("time")} /></label>
        <label>Where<input placeholder="Place or address" value={f.where} onChange={bind("where")} /></label>
      </div>
      <label>Link <span className="co-opt">reservation, menu, map, tickets</span><input inputMode="url" placeholder="https://…" value={f.link} onChange={bind("link")} /></label>
      <label>Notes<textarea rows={3} placeholder="Confirmation #, hours, what to order, who's driving…" value={f.note} onChange={bind("note")} /></label>
    </FormShell>
  );
}

function PackForm({ init, label, onSave, onClose, onRemove }) {
  const [f, bind] = useForm({ name: "", cat: "Clothes", qty: "", note: "", who: "", ...init });
  const [busy, submit] = useSubmit(f, onSave, onClose);
  const shared = !PERSONAL.includes(f.cat);
  return (
    <FormShell label={label} busy={busy} onSubmit={submit} onRemove={onRemove}>
      <label>Item<input placeholder="Hiking poles" value={f.name} onChange={bind("name")} required /></label>
      <div className="co-two">
        <label>How many<input placeholder="2 pairs" value={f.qty} onChange={bind("qty")} /></label>
        <label>Category<select value={f.cat} onChange={bind("cat")}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
      </div>
      {shared ? (
        <label>Who&apos;s bringing it<select value={f.who} onChange={bind("who")}><option value="">Not decided</option><option value="m">Mel</option><option value="k">Nick</option><option value="b">Both of us</option></select></label>
      ) : <p className="co-opt">Clothes, outdoor and health items: Mel and Nick each check it off for themselves.</p>}
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
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <div className="co-sheetBg" onClick={onClose}>
      <div className="co-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="co-grab" />
        <div className="co-sheetHead"><h2>{title}</h2><button className="co-close" onClick={onClose} aria-label="Close">×</button></div>
        {children}
      </div>
    </div>
  );
}

function Ring({ done, total, tone, label }) {
  const p = total ? done / total : 0;
  const C = 2 * Math.PI * 22;
  return (
    <div className={`co-ring ${tone}`}>
      <svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="22" className="bg" /><circle cx="26" cy="26" r="22" className="fg" strokeDasharray={C} strokeDashoffset={C * (1 - p)} /></svg>
      <div><b>{done}<small>/{total}</small></b><span>{label}</span></div>
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
  const [sheet, setSheet] = useState(null); // { kind: "stop"|"pack"|"cam", item?: {...} }
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
  useEffect(() => { window.scrollTo({ top: 0 }); }, [tab]);

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

  const edit = (list, id, fields) => send({ op: "edit", list, id, fields }, (s) => { Object.assign(findIn(s, list, id), fields); return s; });
  const add = (list, item, dayK) => send({ op: "add", list, day: dayK, item });
  const closeSheet = useCallback(() => setSheet(null), []);

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

  const tabs = [["plan", "Trip", Icon.trip], ["pack", "Pack", Icon.pack], ["cam", "Camera", Icon.cam]];
  const fab = {
    plan: [`Add a stop to ${D.d}`, () => setSheet({ kind: "stop" })],
    pack: ["Add something to pack", () => setSheet({ kind: "pack" })],
    cam: ["Add gear", () => setSheet({ kind: "cam" })],
  }[tab];

  return (
    <div className="co co-app">
      <Snow burst={burst} />

      <nav className="co-tabbar" aria-label="Sections">
        <div className="co-brand"><b>Divide</b><span>Nov 19–22</span></div>
        {tabs.map(([k, l, ic]) => (
          <button key={k} aria-current={tab === k ? "page" : undefined} onClick={() => setTab(k)}>{ic}<span>{l}</span></button>
        ))}
        <button className="co-out" onClick={logout}>Log out</button>
      </nav>

      <div className="co-body">
        <header className="co-top">
          <TripScene />
          <div className="co-topText">
            <span className="co-chip">{countdown()}</span>
            <h1>Divide, CO</h1>
            <p>Nov 19–22 · Mel &amp; Nick · 9,165 ft</p>
          </div>
        </header>

        {!saved && <p className="co-warn">Storage isn&apos;t connected here, so changes won&apos;t be saved.</p>}

        {tab === "plan" && (
          <>
            <div className="co-stick">
              <div className="co-seg" role="tablist" aria-label="Day">
                {trip.days.map((d) => {
                  const n = d.stops.filter((x) => x.done).length;
                  return (
                    <button key={d.k} role="tab" aria-selected={d.k === day} onClick={() => setDay(d.k)}>
                      <b>{d.d}</b><small>{d.date}</small>
                      <span className="co-pips">{d.stops.map((x) => <i key={x.id} className={x.done ? "on" : ""} />)}</span>
                      <span className="co-sr">{n} of {d.stops.length} done</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <section className="co-pad">
              <div className="co-dayhead"><h2>{D.title}</h2><p>{D.sub}</p></div>
              <ul className="co-cards">
                {D.stops.map((s) => (
                  <li key={s.id} className={`co-card${s.done ? " done" : ""}`}>
                    <button className="co-cardMain" onClick={() => setSheet({ kind: "stop", item: s })} aria-label={`Edit ${s.name}`}>
                      <span className="co-time">{s.time}</span>
                      <span className="co-title">{s.name}</span>
                      {s.where && <span className="co-where">{s.where}</span>}
                      {s.note && <span className="co-note">{s.note}</span>}
                    </button>
                    <button className="co-check" aria-pressed={s.done} aria-label={`${s.done ? "Undo" : "Done"}: ${s.name}`} onClick={() => set("stops", s.id, "done", !s.done, dayDone(D.k))}>{Icon.check}</button>
                    {s.link && <a className="co-ext" href={s.link} target="_blank" rel="noopener noreferrer">Open link ↗</a>}
                  </li>
                ))}
                {!D.stops.length && <li className="co-emptyCard">Nothing planned yet. Tap + to add a stop.</li>}
              </ul>
              <p className="co-hintline">Tap a card to edit it.</p>
            </section>
          </>
        )}

        {tab === "pack" && (
          <>
            <div className="co-stick">
              <div className="co-rings">
                <Ring label="Mel" done={melDone} total={P.length + mine("m").length} tone="mel" />
                <Ring label="Nick" done={nickDone} total={P.length + mine("k").length} tone="nick" />
                <Ring label="Shared" done={SH.filter((x) => x.done).length} total={SH.length} tone="shared" />
              </div>
              <div className="co-chips">
                {["All", ...CATS].map((c) => <button key={c} aria-pressed={c === cat} onClick={() => setCat(c)}>{c}</button>)}
              </div>
            </div>
            <section className="co-pad">
              <p className="co-cheer">{cheer(trip.pack.filter((x) => (isP(x) ? x.m && x.k : x.done)).length, trip.pack.length)}</p>
              {shownCats.map((c) => {
                const its = trip.pack.filter((p) => p.cat === c);
                if (!its.length) return null;
                return (
                  <div key={c} className="co-group">
                    <h3>{c}<span>{PERSONAL.includes(c) ? "each of us" : "shared"}</span></h3>
                    <ul className="co-rows">
                      {its.map((it) => {
                        const done = isP(it) ? it.m && it.k : it.done;
                        return (
                          <li key={it.id} className={done ? "done" : ""}>
                            <button className="co-rowMain" onClick={() => setSheet({ kind: "pack", item: it })} aria-label={`Edit ${it.name}`}>
                              <span className="co-rowName">{it.qty && <em>{it.qty}</em>}{it.name}</span>
                              {it.note && <small>{it.note}</small>}
                            </button>
                            {isP(it) ? (
                              <div className="co-who">
                                {[["m", "Mel"], ["k", "Nick"]].map(([w, lab]) => (
                                  <button key={w} className={`co-tog ${w}`} aria-pressed={it[w]} onClick={() => set("pack", it.id, w, !it[w], allPackDone)}>{lab}</button>
                                ))}
                              </div>
                            ) : (
                              <div className="co-who">
                                <button className={`co-claim ${it.who}`} onClick={() => set("pack", it.id, "who", NEXT_WHO[it.who])}>{WHO[it.who]}</button>
                                <button className="co-check sm" aria-pressed={it.done} aria-label={`Packed ${it.name}`} onClick={() => set("pack", it.id, "done", !it.done, allPackDone)}>{Icon.check}</button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
              <p className="co-hintline">Tap an item to edit it. Shared gear: tap the tag to pick Mel, Nick or both.</p>
              <button className="co-link" onClick={() => send({ op: "uncheck", list: "pack" })}>Uncheck everything for the trip home</button>
            </section>
          </>
        )}

        {tab === "cam" && (
          <>
            <div className="co-stick">
              <div className="co-rings one"><Ring label="In the bag" done={camDone} total={trip.cam.length} tone="cam" /></div>
            </div>
            <section className="co-pad">
              <ul className="co-rows">
                {trip.cam.map((it) => (
                  <li key={it.id} className={it.done ? "done" : ""}>
                    <button className="co-rowMain" onClick={() => setSheet({ kind: "cam", item: it })} aria-label={`Edit ${it.name}`}>
                      <span className="co-rowName">{it.name}</span>{it.note && <small>{it.note}</small>}
                    </button>
                    <button className="co-check sm" aria-pressed={it.done} aria-label={`Packed ${it.name}`} onClick={() => set("cam", it.id, "done", !it.done, (s) => s.cam.every((x) => x.done))}>{Icon.check}</button>
                  </li>
                ))}
              </ul>
              <p className="co-hintline">Cold drains batteries fast up here. Keep spares in an inside pocket, and use silent shutter.</p>
              <button className="co-link" onClick={() => send({ op: "uncheck", list: "cam" })}>Uncheck everything</button>
            </section>
          </>
        )}
      </div>

      <button className="co-fab" onClick={fab[1]} aria-label={fab[0]}>{Icon.plus}<span>{fab[0]}</span></button>

      {sheet?.kind === "stop" && (
        <Sheet title={sheet.item ? "Edit stop" : `New stop · ${D.d}`} onClose={closeSheet}>
          <StopForm init={sheet.item} label={sheet.item ? "Save" : `Add to ${D.d}`} onClose={closeSheet}
            onSave={(f) => sheet.item ? edit("stops", sheet.item.id, { time: f.time, name: f.name, where: f.where, link: f.link, note: f.note }) : add("stops", f, D.k)}
            onRemove={sheet.item ? () => remove("stops", sheet.item, D.k) : null} />
        </Sheet>
      )}
      {sheet?.kind === "pack" && (
        <Sheet title={sheet.item ? "Edit item" : "Pack something"} onClose={closeSheet}>
          <PackForm init={sheet.item || { cat: cat === "All" ? "Clothes" : cat }} label={sheet.item ? "Save" : "Add to the list"} onClose={closeSheet}
            onSave={(f) => sheet.item ? edit("pack", sheet.item.id, { name: f.name, cat: f.cat, qty: f.qty, note: f.note, who: f.who }) : add("pack", f)}
            onRemove={sheet.item ? () => remove("pack", sheet.item) : null} />
        </Sheet>
      )}
      {sheet?.kind === "cam" && (
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
