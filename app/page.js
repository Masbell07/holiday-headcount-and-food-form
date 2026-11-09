"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DISH_TYPES, dishKey, similarDishes } from "@/lib/dish";

const EVENT = {
  date: "Thursday, November 26",
  time: process.env.NEXT_PUBLIC_EVENT_TIME || "",
  place: process.env.NEXT_PUBLIC_EVENT_PLACE || "",
  host: process.env.NEXT_PUBLIC_HOST_NAME || "",
};
const STATUS_LABEL = { yes: "Coming", maybe: "Maybe", no: "Can't make it" };
const MINE = "tg2026-mine";
const emptyDish = () => ({ name: "", type: "Side" });
const blankForm = () => ({ name: "", status: "yes", adults: 1, kids: 0, dishes: [emptyDish()], notes: "" });

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

export default function Page() {
  const [rsvps, setRsvps] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [noDb, setNoDb] = useState(false);
  const [mine, setMine] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [editing, setEditing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [adminKey, setAdminKey] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const formRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/rsvps", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRsvps(data.rsvps);
      setNoDb(data.saved === false);
      setLoadError("");
      return data.rsvps;
    } catch {
      setLoadError("Couldn't load the guest list. Check your connection and refresh.");
      return null;
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const a = params.get("admin");
    if (a) { store.set("tg2026-admin", a); window.history.replaceState({}, "", window.location.pathname); }
    setAdminKey(a || store.get("tg2026-admin") || "");
    const saved = store.get(MINE);
    load().then((list) => {
      const me = saved && list?.find((r) => r.id === saved.id);
      if (me) {
        setMine(saved);
        setForm(toForm(me));
        setEditing(false);
      } else if (saved) store.del(MINE);
    });
    const t = setInterval(load, 15000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, [load]);

  const list = rsvps || [];
  const others = list.filter((r) => r.id !== mine?.id);
  const myRsvp = list.find((r) => r.id === mine?.id);
  const claimedByOthers = useMemo(
    () => others.flatMap((r) => (r.dishes || []).map((d) => ({ ...d, by: r.name }))),
    [others]
  );

  const stats = useMemo(() => {
    const yes = list.filter((r) => r.status === "yes");
    return {
      adults: yes.reduce((s, r) => s + (r.adults || 0), 0),
      kids: yes.reduce((s, r) => s + (r.kids || 0), 0),
      maybe: list.filter((r) => r.status === "maybe").reduce((s, r) => s + (r.adults || 0) + (r.kids || 0), 0),
      households: list.filter((r) => r.status !== "no").length,
      dishes: list.reduce((s, r) => s + (r.dishes?.length || 0), 0),
    };
  }, [list]);

  const byType = useMemo(() => {
    const m = Object.fromEntries(DISH_TYPES.map((t) => [t, []]));
    list.forEach((r) => (r.dishes || []).forEach((d) => m[d.type]?.push({ ...d, by: r.name, mine: r.id === mine?.id })));
    return m;
  }, [list, mine]);

  // Live duplicate check for each dish row in the form.
  const checks = form.dishes.map((d, i) => {
    const key = dishKey(d.name);
    if (!key) return {};
    const taken = claimedByOthers.find((c) => c.key === key);
    if (taken) return { block: `${taken.by} is already bringing ${taken.name.toLowerCase()}.` };
    if (form.dishes.some((o, j) => j < i && dishKey(o.name) === key)) return { block: "You already listed this one." };
    const near = similarDishes(d.name, claimedByOthers);
    if (near.length) return { warn: `Heads up: ${near.map((n) => `${n.by} is bringing ${n.name.toLowerCase()}`).join(", ")}.` };
    return { ok: true };
  });
  const blocked = form.status !== "no" && checks.some((c) => c.block);

  const update = (patch) => { setForm((f) => ({ ...f, ...patch })); setMessage(null); };
  const updateDish = (i, patch) => update({ dishes: form.dishes.map((d, j) => (j === i ? { ...d, ...patch } : d)) });

  function bringFrom(type) {
    setEditing(true);
    setForm((f) => {
      const idx = f.dishes.findIndex((d) => !d.name.trim());
      const dishes = idx >= 0 ? f.dishes.map((d, j) => (j === idx ? { ...d, type } : d)) : [...f.dishes, { name: "", type }];
      return { ...f, status: f.status === "no" ? "yes" : f.status, dishes };
    });
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      const inputs = formRef.current?.querySelectorAll("input[data-dish]");
      const empty = [...(inputs || [])].find((el) => !el.value);
      empty?.focus({ preventScroll: true });
    }, 50);
  }

  async function submit(e) {
    e.preventDefault();
    if (blocked || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/rsvps", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, id: mine?.id, token: mine?.token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ kind: "error", text: data.error || "Something went wrong. Try again." });
        await load();
        return;
      }
      const me = { id: data.id, token: data.token };
      store.set(MINE, me);
      setMine(me);
      setForm(toForm(data.rsvp));
      setEditing(false);
      setMessage({ kind: "ok", text: mine ? "Your RSVP is updated." : "You're on the list. Thank you!" });
      await load();
    } catch {
      setMessage({ kind: "error", text: "Couldn't reach the server. Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id, asAdmin) {
    const headers = { "content-type": "application/json" };
    if (asAdmin) headers["x-admin-key"] = adminKey;
    const res = await fetch("/api/rsvps", {
      method: "DELETE", headers,
      body: JSON.stringify({ id, token: id === mine?.id ? mine.token : undefined }),
    });
    setConfirmId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage({ kind: "error", text: data.error || "Couldn't remove that RSVP." });
      return;
    }
    if (id === mine?.id) {
      store.del(MINE); setMine(null); setForm(blankForm()); setEditing(true);
      setMessage({ kind: "ok", text: "Your RSVP was removed." });
    }
    load();
  }

  return (
    <main>
      <header className="hero">
        <Leaves />
        <div className="hero-inner">
          <p className="eyebrow">You're invited</p>
          <h1>Thanksgiving <span>2026</span></h1>
          <p className="when">
            {EVENT.date}
            {EVENT.time && <> · {EVENT.time}</>}
          </p>
          {EVENT.place && <p className="where">{EVENT.place}</p>}
          {EVENT.host && <p className="where">Hosted by {EVENT.host}</p>}
          <a href="#rsvp" className="cta">RSVP &amp; pick a dish</a>
        </div>
      </header>

      <section className="stats" aria-label="Headcount">
        <Stat n={stats.adults + stats.kids} label="coming" sub={`${stats.adults} adult${stats.adults === 1 ? "" : "s"}, ${stats.kids} kid${stats.kids === 1 ? "" : "s"}`} />
        <Stat n={stats.maybe} label="maybe" />
        <Stat n={stats.households} label={stats.households === 1 ? "household" : "households"} />
        <Stat n={stats.dishes} label={stats.dishes === 1 ? "dish claimed" : "dishes claimed"} />
      </section>

      {loadError && <p className="banner error">{loadError}</p>}
      {noDb && <p className="banner error">Setup needed: storage isn't connected yet, so RSVPs will disappear. Add Upstash Redis to this Vercel project (see README).</p>}

      <div className="grid">
        <section className="table-board" aria-labelledby="menu-h">
          <div className="section-head">
            <h2 id="menu-h">On the table</h2>
            <p>What everyone's bringing so far. Gold cards still need someone.</p>
          </div>
          <div className="types">
            {DISH_TYPES.map((t) => {
              const items = byType[t];
              return (
                <article key={t} className={`type ${items.length ? "" : "needed"}`}>
                  <header>
                    <h3>{t}</h3>
                    {items.length ? <span className="count">{items.length}</span> : <span className="tag">Still needed</span>}
                  </header>
                  {items.length > 0 && (
                    <ul>
                      {items.map((d) => (
                        <li key={d.key} className={d.mine ? "mine" : ""}>
                          <span className="dish">{d.name}</span>
                          <span className="by">{d.mine ? "you" : d.by}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button type="button" className="link" onClick={() => bringFrom(t)}>
                    + I'll bring {items.length ? "another" : "one"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="rsvp" id="rsvp" ref={formRef}>
          {!editing && myRsvp ? (
            <div className="card done">
              <p className="eyebrow">Your RSVP</p>
              <h2>{myRsvp.name}</h2>
              <p className={`pill ${myRsvp.status}`}>{STATUS_LABEL[myRsvp.status]}</p>
              {myRsvp.status !== "no" && (
                <p className="muted">{myRsvp.adults} adult{myRsvp.adults === 1 ? "" : "s"}{myRsvp.kids ? `, ${myRsvp.kids} kid${myRsvp.kids === 1 ? "" : "s"}` : ""}</p>
              )}
              {myRsvp.dishes?.length > 0 && (
                <ul className="mine-list">
                  {myRsvp.dishes.map((d) => <li key={d.key}><strong>{d.name}</strong> <span>{d.type}</span></li>)}
                </ul>
              )}
              {message && <p className={`banner ${message.kind}`} role="status">{message.text}</p>}
              <div className="row">
                <button type="button" className="btn" onClick={() => { setEditing(true); setMessage(null); }}>Change my RSVP</button>
                {confirmId === myRsvp.id ? (
                  <span className="confirm">Remove it? <button type="button" className="link danger" onClick={() => remove(myRsvp.id)}>Yes, remove</button> <button type="button" className="link" onClick={() => setConfirmId(null)}>Keep</button></span>
                ) : (
                  <button type="button" className="link" onClick={() => setConfirmId(myRsvp.id)}>Remove</button>
                )}
              </div>
            </div>
          ) : (
            <form className="card" onSubmit={submit} noValidate>
              <h2>{mine ? "Update your RSVP" : "RSVP"}</h2>
              <label htmlFor="name">Your name or household</label>
              <input id="name" value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. The Johnsons" autoComplete="name" required />

              <fieldset>
                <legend>Are you coming?</legend>
                <div className="choices">
                  {["yes", "maybe", "no"].map((s) => (
                    <label key={s} className={`choice ${form.status === s ? "on" : ""}`}>
                      <input type="radio" name="status" value={s} checked={form.status === s} onChange={() => update({ status: s })} />
                      {s === "yes" ? "Yes!" : s === "maybe" ? "Maybe" : "Can't go"}
                    </label>
                  ))}
                </div>
              </fieldset>

              {form.status !== "no" && (
                <>
                  <div className="counts">
                    <Counter id="adults" label="Adults" value={form.adults} onChange={(v) => update({ adults: v })} />
                    <Counter id="kids" label="Kids" value={form.kids} onChange={(v) => update({ kids: v })} />
                  </div>

                  <fieldset>
                    <legend>What are you bringing?</legend>
                    {form.dishes.map((d, i) => (
                      <div key={i} className={`dish-row ${checks[i].block ? "bad" : checks[i].warn ? "warn" : ""}`}>
                        <div className="dish-inputs">
                          <input
                            id={`dish-${i}`} data-dish aria-label={`Dish ${i + 1}`}
                            value={d.name} onChange={(e) => updateDish(i, { name: e.target.value })}
                            placeholder={i === 0 ? "e.g. Green bean casserole" : "Another dish"}
                            aria-invalid={Boolean(checks[i].block)}
                            aria-describedby={`dish-${i}-msg`}
                          />
                          <select id={`dish-type-${i}`} aria-label={`Type of dish ${i + 1}`} value={d.type} onChange={(e) => updateDish(i, { type: e.target.value })}>
                            {DISH_TYPES.map((t) => <option key={t}>{t}</option>)}
                          </select>
                          {form.dishes.length > 1 && (
                            <button type="button" className="x" aria-label={`Remove dish ${i + 1}`} onClick={() => update({ dishes: form.dishes.filter((_, j) => j !== i) })}>×</button>
                          )}
                        </div>
                        <p id={`dish-${i}-msg`} className="hint" aria-live="polite">
                          {checks[i].block || checks[i].warn || (checks[i].ok ? "Nobody has this yet." : "")}
                        </p>
                      </div>
                    ))}
                    {form.dishes.length < 6 && (
                      <button type="button" className="link" onClick={() => update({ dishes: [...form.dishes, emptyDish()] })}>+ Add another dish</button>
                    )}
                  </fieldset>
                </>
              )}

              <label htmlFor="notes">Allergies or notes <span className="opt">(optional)</span></label>
              <textarea id="notes" rows={2} value={form.notes} onChange={(e) => update({ notes: e.target.value })} placeholder="e.g. Nut allergy, arriving late" />

              {message && <p className={`banner ${message.kind}`} role="status">{message.text}</p>}
              <div className="row">
                <button className="btn" type="submit" disabled={blocked || saving || !form.name.trim()}>
                  {saving ? "Saving…" : mine ? "Save changes" : "Send RSVP"}
                </button>
                {mine && myRsvp && <button type="button" className="link" onClick={() => { setForm(toForm(myRsvp)); setEditing(false); setMessage(null); }}>Cancel</button>}
              </div>
              {blocked && <p className="hint bad-text">Change the dish marked in red to send your RSVP.</p>}
            </form>
          )}
        </aside>
      </div>

      <section className="guests" aria-labelledby="guests-h">
        <div className="section-head">
          <h2 id="guests-h">Who's coming</h2>
        </div>
        {rsvps === null && !loadError ? (
          <p className="muted">Loading the guest list…</p>
        ) : list.length === 0 ? (
          <p className="muted">No RSVPs yet. Be the first!</p>
        ) : (
          <ul className="guest-list">
            {list.map((r) => (
              <li key={r.id} className={r.status}>
                <div>
                  <strong>{r.name}</strong>{r.id === mine?.id && <span className="you"> (you)</span>}
                  <span className={`pill ${r.status}`}>{STATUS_LABEL[r.status]}</span>
                  {r.status !== "no" && <span className="muted small"> {r.adults + r.kids} {r.adults + r.kids === 1 ? "person" : "people"}</span>}
                  {r.dishes?.length > 0 && <p className="small">Bringing {r.dishes.map((d) => d.name).join(", ")}</p>}
                  {r.notes && <p className="small muted">{r.notes}</p>}
                </div>
                {adminKey && r.id !== mine?.id && (
                  confirmId === r.id ? (
                    <span className="confirm">Remove? <button className="link danger" onClick={() => remove(r.id, true)}>Yes</button> <button className="link" onClick={() => setConfirmId(null)}>No</button></span>
                  ) : (
                    <button className="link" onClick={() => setConfirmId(r.id)}>Remove</button>
                  )
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="foot">Made with gratitude · Happy Thanksgiving</footer>
    </main>
  );
}

function toForm(r) {
  return {
    name: r.name, status: r.status, adults: r.adults ?? 1, kids: r.kids ?? 0,
    dishes: r.dishes?.length ? r.dishes.map(({ name, type }) => ({ name, type })) : [emptyDish()],
    notes: r.notes || "",
  };
}

function Stat({ n, label, sub }) {
  return (
    <div className="stat">
      <span className="n">{n}</span>
      <span className="l">{label}</span>
      {sub && <span className="s">{sub}</span>}
    </div>
  );
}

function Counter({ id, label, value, onChange }) {
  return (
    <div className="counter">
      <label htmlFor={id}>{label}</label>
      <div>
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} onClick={() => onChange(Math.max(0, value - 1))}>−</button>
        <input id={id} inputMode="numeric" value={value} onChange={(e) => onChange(Math.max(0, Math.min(30, parseInt(e.target.value, 10) || 0)))} />
        <button type="button" aria-label={`More ${label.toLowerCase()}`} onClick={() => onChange(Math.min(30, value + 1))}>+</button>
      </div>
    </div>
  );
}

function Leaves() {
  const leaves = [
    [6, 18, 38, -20, "#D97A2B"], [16, 62, 26, 35, "#E3A83B"], [84, 14, 34, 25, "#8E2B1F"],
    [92, 58, 24, -40, "#D97A2B"], [72, 80, 20, 60, "#E3A83B"], [28, 86, 18, -10, "#8E2B1F"],
  ];
  return (
    <svg className="leaves" viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {leaves.map(([x, y, s, r, c], i) => (
        <g key={i} transform={`translate(${x * 12} ${y * 4.2}) rotate(${r}) scale(${s / 22})`} opacity="0.85">
          <path d="M0,-40 C10,-30 22,-34 20,-20 C34,-18 30,-6 38,0 C28,6 32,16 20,16 C22,30 10,26 0,40 C-10,26 -22,30 -20,16 C-32,16 -28,6 -38,0 C-30,-6 -34,-18 -20,-20 C-22,-34 -10,-30 0,-40 Z" fill={c} />
          <path d="M0,-34 L0,46" stroke="#3B2414" strokeWidth="1.5" opacity="0.4" />
        </g>
      ))}
    </svg>
  );
}
