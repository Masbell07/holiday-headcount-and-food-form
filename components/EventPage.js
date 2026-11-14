"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DISH_TYPES, dishKey, similarDishes } from "@/lib/dish";
import { getEvent } from "@/lib/events";

const EVENT = {
  place: process.env.NEXT_PUBLIC_EVENT_PLACE || "",
  host: process.env.NEXT_PUBLIC_HOST_NAME || "",
};
const STATUS_LABEL = { yes: "Coming", maybe: "Maybe", no: "Can't make it" };
const emptyDish = () => ({ name: "", type: "Side" });
const blankForm = () => ({ name: "", status: "yes", day: "", adults: 1, kids: 0, bringing: true, dishes: [emptyDish()], notes: "" });

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

export default function EventPage({ eventId }) {
  const EV = getEvent(eventId);
  const DAY_OPTIONS = EV.days;
  const MUST_HAVES = EV.mustHaves;
  const MINE = `${EV.prefix}-mine`;
  const API = `/api/rsvps?event=${EV.id}`;
  const dayLabel = (id) => { const d = DAY_OPTIONS.find((x) => x.id === id); return d ? `${d.day}, ${d.date} at ${d.time}` : ""; };
  const [rsvps, setRsvps] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [noDb, setNoDb] = useState(false);
  const [mine, setMine] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [editing, setEditing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [isHostUser, setIsHostUser] = useState(false);
  const [chosenId, setChosenId] = useState(null);
  const CHOSEN = DAY_OPTIONS.find((d) => d.id === chosenId);
  const eventDate = CHOSEN ? `${CHOSEN.day}, ${CHOSEN.date.replace(EV.month[0], EV.month[1])} · ${CHOSEN.time}` : EV.range;
  const [confirmId, setConfirmId] = useState(null);
  const formRef = useRef(null);
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    const el = formRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setFormVisible(e.isIntersecting), { rootMargin: "0px 0px -30% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const goToForm = (focusName) => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (focusName) setTimeout(() => document.getElementById("name")?.focus({ preventScroll: true }), 400);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch(API, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRsvps(data.rsvps);
      setNoDb(data.saved === false);
      setChosenId(data.chosenDay || null);
      setLoadError("");
      return data.rsvps;
    } catch {
      setLoadError("Couldn't load the guest list. Check your connection and refresh.");
      return null;
    }
  }, []);

  useEffect(() => {
    fetch("/api/host/login", { cache: "no-store" }).then((r) => r.json()).then((d) => setIsHostUser(Boolean(d.host))).catch(() => {});
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

  const votes = useMemo(() => {
    const voters = list.filter((r) => r.status !== "no" && r.day);
    const rows = DAY_OPTIONS.map((d) => {
      const vs = voters.filter((r) => r.day === d.id);
      return { ...d, households: vs.length, people: vs.reduce((s, r) => s + (r.adults || 0) + (r.kids || 0), 0), names: vs.map((r) => r.name) };
    });
    const top = Math.max(0, ...rows.map((r) => r.households));
    return { rows, total: voters.length, top };
  }, [list]);
  const myDay = myRsvp?.day;

  function voteFor(id) {
    setEditing(true);
    setMessage(null);
    setForm((f) => ({ ...f, day: id, status: f.status === "no" ? "yes" : f.status }));
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("name")?.focus({ preventScroll: true });
    }, 50);
  }

  const byType = useMemo(() => {
    const m = Object.fromEntries(DISH_TYPES.map((t) => [t, []]));
    list.forEach((r) => (r.dishes || []).forEach((d) => m[d.type]?.push({ ...d, by: r.name, mine: r.id === mine?.id })));
    return m;
  }, [list, mine]);

  const mustHaves = useMemo(() => MUST_HAVES.map((m) => {
    const key = dishKey(m.name);
    const owner = list.find((r) => r.dishes?.some((d) => d.key === key));
    return { ...m, key, by: owner ? (owner.id === mine?.id ? "you" : owner.name) : null };
  }), [list, mine]);
  const covered = mustHaves.filter((m) => m.by).length;
  const openMust = mustHaves.filter((m) => !m.by);

  // Live duplicate check for each dish row in the form.
  const checks = form.dishes.map((d, i) => {
    const key = dishKey(d.name);
    if (!key) return {};
    const taken = claimedByOthers.find((c) => c.key === key);
    if (taken) return { block: `${taken.by} is already bringing ${taken.name.toLowerCase()}.` };
    if (form.dishes.some((o, j) => j < i && dishKey(o.name) === key)) return { block: "You already listed this one." };
    if (openMust.some((m) => m.key === key)) return { ok: true, must: true };
    const near = similarDishes(d.name, claimedByOthers);
    if (near.length) return { warn: `Heads up: ${near.map((n) => `${n.by} is bringing ${n.name.toLowerCase()}`).join(", ")}.` };
    const nearMust = similarDishes(d.name, openMust);
    if (nearMust.length) return { warn: `"${nearMust[0].name}" is on the must-have list. If that's what this is, type it exactly that way so it gets checked off.` };
    return { ok: true };
  });
  const blocked = form.status !== "no" && form.bringing && checks.some((c) => c.block);

  const update = (patch) => { setForm((f) => ({ ...f, ...patch })); setMessage(null); };
  const updateDish = (i, patch) => update({ dishes: form.dishes.map((d, j) => (j === i ? { ...d, ...patch } : d)) });

  function bringFrom(type) {
    setEditing(true);
    setForm((f) => {
      const idx = f.dishes.findIndex((d) => !d.name.trim());
      const dishes = idx >= 0 ? f.dishes.map((d, j) => (j === idx ? { ...d, type } : d)) : [...f.dishes, { name: "", type }];
      return { ...f, status: f.status === "no" ? "yes" : f.status, bringing: true, dishes };
    });
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      const inputs = formRef.current?.querySelectorAll("input[data-dish]");
      const empty = [...(inputs || [])].find((el) => !el.value);
      empty?.focus({ preventScroll: true });
    }, 50);
  }

  function bringItem(item) {
    setEditing(true);
    setMessage(null);
    setForm((f) => {
      const idx = f.dishes.findIndex((d) => !d.name.trim());
      const dish = { name: item.name, type: item.type };
      const dishes = idx >= 0 ? f.dishes.map((d, j) => (j === idx ? dish : d)) : [...f.dishes, dish];
      return { ...f, status: f.status === "no" ? "yes" : f.status, bringing: true, dishes };
    });
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("name")?.focus({ preventScroll: true });
    }, 50);
  }

  async function submit(e) {
    e.preventDefault();
    if (blocked || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, dishes: form.bringing ? form.dishes : [], id: mine?.id, token: mine?.token }),
      });
      const data = await res.json().catch(() => ({ error: `The server answered with an error (status ${res.status}). Try again in a minute.` }));
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
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch {
      setMessage({ kind: "error", text: "Couldn't reach the server. Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    const headers = { "content-type": "application/json" };
    const res = await fetch(API, {
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
    <main className={`theme-${EV.theme}`}>
      <header className="hero">
        {EV.theme === "xmas" ? <Snow /> : <Leaves />}
        <div className="hero-inner">
          <p className="eyebrow">You're invited</p>
          <h1>{EV.name} <span>{EV.year}</span></h1>
          <p className="when">
            {eventDate}
          </p>
          {!CHOSEN && <p className="where">{EV.timesLine}</p>}
          {EVENT.place && <p className="where">{EVENT.place}</p>}
          {EVENT.host && <p className="where">Hosted by {EVENT.host}</p>}
          {EV.id === "xmas" && <p className="where"><a className="hero-link" href="/xmas-ss">🎁 Join our Secret Santa →</a></p>}
          <a href="#rsvp" className="cta" onClick={(e) => { e.preventDefault(); goToForm(true); }}>{myRsvp ? "See my RSVP" : CHOSEN ? "RSVP" : "RSVP & vote"}</a>
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

      <section className="musts vote" aria-labelledby="vote-h">
        <div className="musts-head">
          <div>
            <h2 id="vote-h">{CHOSEN ? "The day is set" : "Pick the day"}</h2>
            <p>{CHOSEN ? "Save the date! See you there." : `One vote per household. ${EV.timesShort}`}</p>
          </div>
          {!CHOSEN && <span className="progress-n"><strong>{votes.total}</strong> {votes.total === 1 ? "vote" : "votes"} so far</span>}
        </div>
        {CHOSEN ? (
          <div className="chosen-day">
            <span className="chosen-name">{CHOSEN.day}</span>
            <span className="chosen-date">{CHOSEN.date.replace(EV.month[0], EV.month[1])}{CHOSEN.note ? ` · ${CHOSEN.note}` : ""}</span>
            <span className="chosen-time">{CHOSEN.time}</span>
          </div>
        ) : (
          <ul className="day-list">
          {votes.rows.map((d) => {
            const leading = votes.top > 0 && d.households === votes.top;
            return (
              <li key={d.id} className={leading ? "lead" : ""}>
                <div className="day-top">
                  <span className="day-name">{d.day}</span>
                  {leading && <span className="tag ok">{votes.rows.filter((r) => r.households === votes.top).length > 1 ? "Tied" : "Leading"}</span>}
                </div>
                <span className="day-date">{d.date}{d.note ? ` · ${d.note}` : ""} · <strong>{d.time}</strong></span>
                <span className="bar"><span style={{ width: votes.total ? `${(d.households / votes.total) * 100}%` : "0%" }} /></span>
                <span className="day-count">
                  {d.households} {d.households === 1 ? "vote" : "votes"}{d.people ? ` · ${d.people} ${d.people === 1 ? "person" : "people"}` : ""}
                </span>
                {d.names.length > 0 && <span className="day-names">{d.names.join(", ")}</span>}
                {myDay === d.id
                  ? <span className="your-vote">Your vote</span>
                  : <button type="button" className="grab" onClick={() => voteFor(d.id)} aria-label={`Vote for ${d.day}`}>Vote {d.day.slice(0, 3)}</button>}
              </li>
            );
          })}
        </ul>
        )}
      </section>

      <section className="musts" aria-labelledby="must-h">
        <div className="musts-head">
          <div>
            <h2 id="must-h">Must-haves</h2>
            <p>The dishes we can't do without. Grab one if it's still open.</p>
          </div>
          <div className="progress" aria-label={`${covered} of ${mustHaves.length} covered`}>
            <span className="progress-n"><strong>{covered}</strong> of {mustHaves.length} covered</span>
            <span className="bar"><span style={{ width: `${(covered / mustHaves.length) * 100}%` }} /></span>
          </div>
        </div>
        <ul className="must-list">
          {mustHaves.map((m) => (
            <li key={m.key} className={m.by ? "got" : "open"}>
              {m.by ? (
                <div className="must-item">
                  <span className="check" aria-hidden="true">✓</span>
                  <span className="must-text">
                    <span className="must-name">{m.name}</span>
                    <span className="must-by">{m.by === "you" ? "You're bringing it" : m.by}</span>
                  </span>
                </div>
              ) : (
                <button type="button" className="must-item" onClick={() => bringItem(m)} aria-label={`I'll bring ${m.name}`}>
                  <span className="check" aria-hidden="true">+</span>
                  <span className="must-text">
                    <span className="must-name">{m.name}</span>
                    <span className="must-by">Tap to bring it</span>
                  </span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid">
        <section className="table-board" aria-labelledby="menu-h">
          <div className="section-head">
            <h2 id="menu-h">On the table</h2>
            <p>Everything people are bringing, must-haves and extras.</p>
          </div>
          {DISH_TYPES.some((t) => byType[t].length) ? (
            <div className="types">
              {DISH_TYPES.filter((t) => byType[t].length).map((t) => (
                <article key={t} className="type">
                  <header>
                    <h3>{t}</h3>
                    <span className="count">{byType[t].length}</span>
                  </header>
                  <ul>
                    {byType[t].map((d) => (
                      <li key={d.key} className={d.mine ? "mine" : ""}>
                        <span className="dish">{d.name}</span>
                        <span className="by">{d.mine ? "you" : d.by}</span>
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="link" onClick={() => bringFrom(t)}>+ I'll bring another</button>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">Nothing claimed yet.</p>
          )}
          {DISH_TYPES.some((t) => !byType[t].length) && (
            <div className="empty-types">
              <span className="small muted">Nobody's bringing yet:</span>
              {DISH_TYPES.filter((t) => !byType[t].length).map((t) => (
                <button key={t} type="button" className="chip" onClick={() => bringFrom(t)}>+ {t}</button>
              ))}
            </div>
          )}
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
              {!CHOSEN && myRsvp.status !== "no" && <p className="muted">{myRsvp.day ? `Voted for ${dayLabel(myRsvp.day)}` : "Hasn't voted on a day yet"}</p>}
              {myRsvp.status !== "no" && !myRsvp.dishes?.length && <p className="muted">Not bringing a dish</p>}
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
                  {!CHOSEN && (
                    <fieldset>
                      <legend>Which day works best?</legend>
                      <div className="choices days">
                        {DAY_OPTIONS.map((d) => (
                          <label key={d.id} className={`choice ${form.day === d.id ? "on" : ""}`}>
                            <input type="radio" name="day" value={d.id} checked={form.day === d.id} onChange={() => update({ day: d.id })} />
                            <span className="choice-day">{d.day.slice(0, 3)}</span>
                            <span className="choice-date">{d.time}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}
                  <div className="counts">
                    <Counter id="adults" label="Adults" value={form.adults} onChange={(v) => update({ adults: v })} />
                    <Counter id="kids" label="Kids" value={form.kids} onChange={(v) => update({ kids: v })} />
                  </div>

                  <fieldset>
                    <legend>Are you bringing food?</legend>
                    <div className="choices two">
                      <label className={`choice ${form.bringing ? "on" : ""}`}>
                        <input type="radio" name="bringing" checked={form.bringing} onChange={() => update({ bringing: true })} />
                        Yes, I'll bring something
                      </label>
                      <label className={`choice ${!form.bringing ? "on" : ""}`}>
                        <input type="radio" name="bringing" checked={!form.bringing} onChange={() => update({ bringing: false })} />
                        Just bringing myself
                      </label>
                    </div>
                  </fieldset>

                  {form.bringing && (
                  <fieldset>
                    <legend>What are you bringing?</legend>
                    {form.dishes.map((d, i) => (
                      <div key={i} className={`dish-row ${checks[i].block ? "bad" : checks[i].warn ? "warn" : ""}`}>
                        <div className="dish-inputs">
                          <input
                            id={`dish-${i}`} data-dish aria-label={`Dish ${i + 1}`}
                            value={d.name} onChange={(e) => updateDish(i, { name: e.target.value })}
                            placeholder={i === 0 ? EV.dishExample : "Another dish"}
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
                          {checks[i].block || checks[i].warn || (checks[i].must ? "That's a must-have. Thank you!" : checks[i].ok ? "Nobody has this yet." : "")}
                        </p>
                      </div>
                    ))}
                    {form.dishes.length < 6 && (
                      <button type="button" className="link" onClick={() => update({ dishes: [...form.dishes, emptyDish()] })}>+ Add another dish</button>
                    )}
                  </fieldset>
                  )}
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
                  {!CHOSEN && r.status !== "no" && r.day && <p className="small">Votes {dayLabel(r.day)}</p>}
                  {r.dishes?.length > 0 ? <p className="small">Bringing {r.dishes.map((d) => d.name).join(", ")}</p> : r.status !== "no" && <p className="small muted">Not bringing a dish</p>}
                  {r.notes && <p className="small muted">{r.notes}</p>}
                </div>
                {isHostUser && r.id !== mine?.id && (
                  confirmId === r.id ? (
                    <span className="confirm">Remove? <button className="link danger" onClick={() => remove(r.id)}>Yes</button> <button className="link" onClick={() => setConfirmId(null)}>No</button></span>
                  ) : (
                    <button className="link" onClick={() => setConfirmId(r.id)}>Remove</button>
                  )
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!formVisible && (
        <div className="sticky-bar">
          {myRsvp && !editing ? (
            <>
              <span className="sticky-text">
                <strong>{myRsvp.name}</strong>
                <span>{STATUS_LABEL[myRsvp.status]}{myRsvp.day && !CHOSEN ? ` · ${DAY_OPTIONS.find((d) => d.id === myRsvp.day)?.day.slice(0, 3)}` : ""}{myRsvp.dishes?.length ? ` · ${myRsvp.dishes.length} dish${myRsvp.dishes.length === 1 ? "" : "es"}` : ""}</span>
              </span>
              <button type="button" className="btn" onClick={() => goToForm(false)}>View my RSVP</button>
            </>
          ) : (
            <button type="button" className="btn wide" onClick={() => goToForm(true)}>{mine ? "Finish updating my RSVP" : CHOSEN ? "RSVP" : "RSVP & vote"}</button>
          )}
        </div>
      )}

      <footer className="foot">
        {EV.footer}
        <a className="host-link" href={EV.hostPath}>{isHostUser ? "Host dashboard" : "Host login"}</a>
      </footer>
    </main>
  );
}

function toForm(r) {
  return {
    name: r.name, status: r.status, day: r.day || "", adults: r.adults ?? 1, kids: r.kids ?? 0,
    bringing: Boolean(r.dishes?.length) || r.status === "no",
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

function Snow() {
  const flakes = [
    [6, 20, 30], [15, 70, 18], [27, 35, 14], [40, 85, 20], [60, 15, 16], [72, 60, 26],
    [84, 28, 22], [93, 75, 16], [52, 50, 12], [33, 10, 10], [88, 92, 12], [10, 45, 12],
  ];
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
