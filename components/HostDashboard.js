"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DISH_TYPES } from "@/lib/dish";
import { EVENTS, getEvent } from "@/lib/events";
import { dishKey } from "@/lib/dish";

const STATUS_LABEL = { yes: "Coming", maybe: "Maybe", no: "Can't make it" };
const blank = () => ({ name: "", status: "yes", day: "", adults: 1, kids: 0, dishes: [], notes: "" });

async function api(path, options) {
  const res = await fetch(path, { cache: "no-store", headers: { "content-type": "application/json" }, ...options });
  const data = await res.json().catch(() => ({ error: `The server answered with an error (status ${res.status}).` }));
  return { ok: res.ok, status: res.status, data };
}

export default function HostDashboard({ eventId }) {
  const EV = getEvent(eventId);
  const DAY_OPTIONS = EV.days;
  const MUST_HAVES = EV.mustHaves;
  const HOST_API = `/api/host?event=${EV.id}`;
  const dayName = (id) => DAY_OPTIONS.find((d) => d.id === id);
  const [state, setState] = useState("checking"); // checking | login | in
  const [rsvps, setRsvps] = useState([]);
  const [chosenDay, setChosenDay] = useState(null);
  const [editing, setEditing] = useState(null); // rsvp object being edited, or blank() for new
  const [confirmId, setConfirmId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [resetText, setResetText] = useState("");

  const load = useCallback(async () => {
    const r = await api(HOST_API);
    if (r.status === 401) { setState("login"); return; }
    if (!r.ok) { setNotice({ kind: "error", text: r.data.error }); return; }
    setRsvps(r.data.rsvps);
    setChosenDay(r.data.chosenDay);
    setState("in");
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (kind, text) => { setNotice({ kind, text }); if (kind === "ok") setTimeout(() => setNotice(null), 4000); };

  async function action(payload, okText) {
    const r = await api(HOST_API, { method: "POST", body: JSON.stringify(payload) });
    if (r.status === 401) { setState("login"); return null; }
    if (!r.ok) { flash("error", r.data.error); return null; }
    if (okText) flash("ok", okText);
    await load();
    return r.data;
  }

  const totals = useMemo(() => {
    const yes = rsvps.filter((r) => r.status === "yes");
    return {
      adults: yes.reduce((s, r) => s + r.adults, 0),
      kids: yes.reduce((s, r) => s + r.kids, 0),
      maybe: rsvps.filter((r) => r.status === "maybe").reduce((s, r) => s + r.adults + r.kids, 0),
      dishes: rsvps.reduce((s, r) => s + (r.dishes?.length || 0), 0),
    };
  }, [rsvps]);

  const votes = DAY_OPTIONS.map((d) => {
    const vs = rsvps.filter((r) => r.status !== "no" && r.day === d.id);
    return { ...d, n: vs.length, people: vs.reduce((s, r) => s + r.adults + r.kids, 0) };
  });

  const openMust = MUST_HAVES.filter((m) => !rsvps.some((r) => r.dishes?.some((d) => d.key === dishKey(m.name))));

  if (state === "checking") return <main className={`host theme-${EV.theme}`}><p className="muted">Loading…</p></main>;
  if (state === "login") return <Login onDone={load} EV={EV} />;

  return (
    <main className={`host theme-${EV.theme}`}>
      <header className="host-head">
        <div>
          <p className="eyebrow">{EV.name} {EV.year}</p>
          <h1>Host dashboard</h1>
          <p className="small muted">
            Switch to:{" "}
            {Object.values(EVENTS).filter((e) => e.id !== EV.id).map((e) => (
              <a key={e.id} className="link inline" href={e.hostPath}>{e.name} {e.year}</a>
            ))}
          </p>
        </div>
        <div className="row">
          <a className="link" href={EV.path}>View the site</a>
          <button className="link" onClick={async () => { await api("/api/host/login", { method: "DELETE" }); setState("login"); }}>Log out</button>
        </div>
      </header>

      {notice && <p className={`banner ${notice.kind}`} role="status">{notice.text}</p>}

      <section className="host-stats">
        <div><strong>{totals.adults + totals.kids}</strong> coming <span className="muted">({totals.adults} adult{totals.adults === 1 ? "" : "s"}, {totals.kids} kid{totals.kids === 1 ? "" : "s"})</span></div>
        <div><strong>{totals.maybe}</strong> maybe</div>
        <div><strong>{rsvps.length}</strong> RSVPs</div>
        <div><strong>{totals.dishes}</strong> dishes</div>
        <div><strong>{MUST_HAVES.length - openMust.length}/{MUST_HAVES.length}</strong> must-haves</div>
      </section>
      {openMust.length > 0 && <p className="small muted">Still open: {openMust.map((m) => m.name).join(", ")}</p>}

      <section className="card host-card">
        <h2>Dinner day</h2>
        <p className="muted small">
          {chosenDay ? `Set to ${dayName(chosenDay)?.day}, ${dayName(chosenDay)?.date} at ${dayName(chosenDay)?.time}. Voting is closed.` : "Voting is open. Pick a day to close voting and show it at the top of the site."}
        </p>
        <ul className="host-days">
          {votes.map((d) => (
            <li key={d.id} className={chosenDay === d.id ? "on" : ""}>
              <span><strong>{d.day}</strong> <span className="nowrap">{d.date} · {d.time}</span></span>
              <span className="small muted">{d.n} {d.n === 1 ? "vote" : "votes"} · {d.people} people</span>
              {chosenDay === d.id
                ? <span className="tag ok">Chosen</span>
                : <button className="grab" onClick={() => action({ action: "setDay", day: d.id }, `Dinner is set for ${d.day}.`)}>Set as the day</button>}
            </li>
          ))}
        </ul>
        {chosenDay && <button className="link" onClick={() => action({ action: "setDay", day: "" }, "Voting is open again.")}>Reopen voting</button>}
      </section>

      <section className="card host-card">
        <div className="row spread">
          <h2>RSVPs</h2>
          {!editing && <button className="btn" onClick={() => setEditing(blank())}>+ Add an RSVP</button>}
        </div>

        {editing && !editing.id && (
          <Editor days={DAY_OPTIONS} value={editing} onCancel={() => setEditing(null)}
            onSave={async (v) => { if (await action({ action: "save", rsvp: v }, `Added ${v.name}.`)) setEditing(null); }} />
        )}

        {rsvps.length === 0 && !editing && <p className="muted">No RSVPs yet.</p>}
        <ul className="host-list">
          {rsvps.map((r) => (
            <li key={r.id}>
              {editing?.id === r.id ? (
                <Editor days={DAY_OPTIONS} value={editing} onCancel={() => setEditing(null)}
                  onSave={async (v) => { if (await action({ action: "save", rsvp: v }, `Saved ${v.name}.`)) setEditing(null); }} />
              ) : (
                <div className="host-row">
                  <div>
                    <strong>{r.name}</strong> <span className={`pill ${r.status}`}>{STATUS_LABEL[r.status]}</span>
                    {r.status !== "no" && <span className="small muted"> {r.adults} adult{r.adults === 1 ? "" : "s"}, {r.kids} kid{r.kids === 1 ? "" : "s"}</span>}
                    <p className="small">
                      {r.status !== "no" && (r.day ? `Votes ${dayName(r.day)?.day}` : "No day vote")}
                      {r.status !== "no" && " · "}
                      {r.dishes?.length ? r.dishes.map((d) => d.name).join(", ") : r.status !== "no" ? "Not bringing a dish" : ""}
                    </p>
                    {r.notes && <p className="small muted">{r.notes}</p>}
                  </div>
                  <div className="row">
                    <button className="link" onClick={() => { setEditing({ ...r, dishes: r.dishes.map(({ name, type }) => ({ name, type })) }); setConfirmId(null); }}>Edit</button>
                    {confirmId === r.id ? (
                      <span className="confirm">Remove? <button className="link danger" onClick={async () => { setConfirmId(null); await action({ action: "delete", id: r.id }, `Removed ${r.name}.`); }}>Yes</button> <button className="link" onClick={() => setConfirmId(null)}>No</button></span>
                    ) : (
                      <button className="link" onClick={() => setConfirmId(r.id)}>Remove</button>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card host-card danger-zone">
        <h2>Start over</h2>
        <p className="small muted">Deletes every RSVP, vote and dish claim. The chosen day stays as it is. This can't be undone.</p>
        <div className="row">
          <label htmlFor="reset" className="small">Type RESET to confirm</label>
          <input id="reset" value={resetText} onChange={(e) => setResetText(e.target.value)} style={{ maxWidth: 140 }} autoComplete="off" />
          <button className="btn danger-btn" disabled={resetText !== "RESET"}
            onClick={async () => { if (await action({ action: "reset", confirm: "RESET" }, "Everything was cleared.")) setResetText(""); }}>
            Clear all RSVPs
          </button>
        </div>
      </section>
    </main>
  );
}

function Login({ onDone, EV }) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError("");
    const r = await api("/api/host/login", { method: "POST", body: JSON.stringify({ user, password }) });
    setBusy(false);
    if (!r.ok) { setError(r.data.error || "Couldn't log in."); return; }
    onDone();
  }

  return (
    <main className={`host login theme-${EV.theme}`}>
      <form className="card" onSubmit={submit}>
        <p className="eyebrow">{EV.name} {EV.year}</p>
        <h1>Host login</h1>
        <label htmlFor="user">Username</label>
        <input id="user" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" autoCapitalize="none" required />
        <label htmlFor="password">Password</label>
        <div className="pw">
          <input id="password" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          <button type="button" className="link" onClick={() => setShow((s) => !s)}>{show ? "Hide" : "Show"}</button>
        </div>
        {error && <p className="banner error">{error}</p>}
        <button className="btn" type="submit" disabled={busy || !user || !password}>{busy ? "Checking…" : "Log in"}</button>
        <a className="link" href={EV.path}>Back to the site</a>
      </form>
    </main>
  );
}

function Editor({ days, value, onSave, onCancel }) {
  const [v, setV] = useState(value);
  const [busy, setBusy] = useState(false);
  const set = (patch) => setV((x) => ({ ...x, ...patch }));
  const setDish = (i, patch) => set({ dishes: v.dishes.map((d, j) => (j === i ? { ...d, ...patch } : d)) });
  const id = v.id || "new";

  return (
    <form className="editor" onSubmit={async (e) => { e.preventDefault(); setBusy(true); await onSave(v); setBusy(false); }}>
      <div className="editor-grid">
        <div>
          <label htmlFor={`n-${id}`}>Name</label>
          <input id={`n-${id}`} value={v.name} onChange={(e) => set({ name: e.target.value })} required />
        </div>
        <div>
          <label htmlFor={`s-${id}`}>Coming?</label>
          <select id={`s-${id}`} value={v.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="yes">Coming</option><option value="maybe">Maybe</option><option value="no">Can't make it</option>
          </select>
        </div>
        <div>
          <label htmlFor={`d-${id}`}>Day vote</label>
          <select id={`d-${id}`} value={v.day} onChange={(e) => set({ day: e.target.value })} disabled={v.status === "no"}>
            <option value="">No vote</option>
            {days.map((d) => <option key={d.id} value={d.id}>{d.day} {d.date}, {d.time}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`a-${id}`}>Adults</label>
          <input id={`a-${id}`} type="number" min="0" max="30" value={v.adults} onChange={(e) => set({ adults: e.target.value })} disabled={v.status === "no"} />
        </div>
        <div>
          <label htmlFor={`k-${id}`}>Kids</label>
          <input id={`k-${id}`} type="number" min="0" max="30" value={v.kids} onChange={(e) => set({ kids: e.target.value })} disabled={v.status === "no"} />
        </div>
      </div>

      {v.status !== "no" && (
        <fieldset>
          <legend>Dishes</legend>
          {v.dishes.length === 0 && <p className="small muted">Not bringing a dish.</p>}
          {v.dishes.map((d, i) => (
            <div key={i} className="dish-inputs">
              <input aria-label={`Dish ${i + 1}`} value={d.name} onChange={(e) => setDish(i, { name: e.target.value })} />
              <select aria-label={`Type of dish ${i + 1}`} value={d.type} onChange={(e) => setDish(i, { type: e.target.value })}>
                {DISH_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <button type="button" className="x" aria-label={`Remove dish ${i + 1}`} onClick={() => set({ dishes: v.dishes.filter((_, j) => j !== i) })}>×</button>
            </div>
          ))}
          {v.dishes.length < 6 && <button type="button" className="link" onClick={() => set({ dishes: [...v.dishes, { name: "", type: "Side" }] })}>+ Add a dish</button>}
        </fieldset>
      )}

      <label htmlFor={`o-${id}`}>Notes</label>
      <input id={`o-${id}`} value={v.notes} onChange={(e) => set({ notes: e.target.value })} />

      <div className="row">
        <button className="btn" type="submit" disabled={busy || !v.name.trim()}>{busy ? "Saving…" : "Save"}</button>
        <button type="button" className="link" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
