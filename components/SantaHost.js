"use client";

import { useCallback, useEffect, useState } from "react";

async function api(options) {
  const res = await fetch("/api/host/ss", { cache: "no-store", headers: { "content-type": "application/json" }, ...options });
  const data = await res.json().catch(() => ({ error: `The server answered with an error (status ${res.status}).` }));
  return { ok: res.ok, status: res.status, data };
}

const fmt = (ts) => new Date(ts).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });

export default function SantaHost({ onLoggedOut }) {
  const [d, setD] = useState(null);
  const [notice, setNotice] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [confirm, setConfirm] = useState(null); // "draw" | "redo" | "clear" | entry id
  const [showMatches, setShowMatches] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newHouse, setNewHouse] = useState("");
  const [budget, setBudget] = useState("");
  const [resetText, setResetText] = useState("");

  const load = useCallback(async () => {
    const r = await api();
    if (r.status === 401) { onLoggedOut?.(); return; }
    if (!r.ok) { setNotice({ kind: "error", text: r.data.error }); return; }
    setD(r.data);
    setBudget(r.data.budget || "");
  }, [onLoggedOut]);

  useEffect(() => { load(); }, [load]);

  async function act(payload, okText) {
    const r = await api({ method: "POST", body: JSON.stringify(payload) });
    if (r.status === 401) { onLoggedOut?.(); return null; }
    if (!r.ok) { setNotice({ kind: "error", text: r.data.error }); return null; }
    setNotice(okText ? { kind: "ok", text: okText } : null);
    await load();
    return r.data;
  }

  if (!d) return <section className="card host-card"><h2>Secret Santa</h2><p className="muted">Loading…</p></section>;

  const byId = Object.fromEntries(d.entries.map((e) => [e.id, e]));
  const drawn = Boolean(d.matches);
  const status = drawn
    ? `Names drawn ${d.drawnAt ? fmt(d.drawnAt) : ""}. Sign-ups are closed.`
    : d.open
      ? d.mode === "open" ? "Sign-ups are open (you opened them)." : `Sign-ups are open until ${fmt(d.closesAt)} (start of Thanksgiving).`
      : d.mode === "closed" ? "Sign-ups are closed (you closed them)." : "Sign-ups closed at the start of Thanksgiving. Ready to draw.";

  return (
    <section className="card host-card santa-host">
      <div className="row spread">
        <h2>Secret Santa</h2>
        <a className="link" href="/xmas-ss">View the page</a>
      </div>
      <p className="small muted">{status}</p>
      {notice && <p className={`banner ${notice.kind}`} role="status">{notice.text}</p>}

      <div className="santa-controls">
        <div>
          <span className="small"><strong>Sign-ups</strong></span>
          <div className="seg" role="group" aria-label="Sign-ups">
            {[["auto", "Close on Thanksgiving"], ["open", "Keep open"], ["closed", "Close now"]].map(([m, label]) => (
              <button key={m} type="button" className={d.mode === m ? "on" : ""} disabled={drawn} onClick={() => act({ action: "setMode", mode: m }, null)}>{label}</button>
            ))}
          </div>
        </div>
        <form className="budget" onSubmit={(e) => { e.preventDefault(); act({ action: "setBudget", budget }, budget ? `Budget set to ${budget}.` : "Budget removed."); }}>
          <label htmlFor="ss-budget" className="small"><strong>Gift budget</strong> (shown on the page)</label>
          <div className="row">
            <input id="ss-budget" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. $25" style={{ maxWidth: 140 }} />
            <button className="btn" type="submit">Save</button>
          </div>
        </form>
      </div>

      <div className="draw-box">
        {!drawn ? (
          confirm === "draw" ? (
            <span className="confirm">Draw names for all {d.entries.length} people now? Everyone will see their match on their own phone.
              <button className="btn" onClick={async () => { setConfirm(null); await act({ action: "draw" }, "Names are drawn! Send everyone the drawing link below."); }}>Yes, draw</button>
              <button className="link" onClick={() => setConfirm(null)}>Not yet</button>
            </span>
          ) : (
            <button className="btn" disabled={d.entries.length < 3} onClick={() => setConfirm("draw")}>🎁 Draw names ({d.entries.length})</button>
          )
        ) : (
          <>
          <ShareLink />
          <div className="row">
            <button className="link" onClick={() => setShowMatches((s) => !s)}>{showMatches ? "Hide matches" : "Show matches (spoilers!)"}</button>
            {confirm === "redo" ? (
              <span className="confirm">Redo the drawing? Everyone gets a new match. <button className="link danger" onClick={async () => { setConfirm(null); await act({ action: "draw" }, "Names re-drawn."); }}>Yes, redo</button> <button className="link" onClick={() => setConfirm(null)}>No</button></span>
            ) : <button className="link" onClick={() => setConfirm("redo")}>Redo drawing</button>}
            {confirm === "clear" ? (
              <span className="confirm">Undo the drawing and reopen sign-ups? <button className="link danger" onClick={async () => { setConfirm(null); setShowMatches(false); await act({ action: "clearDraw" }, "Drawing cleared."); }}>Yes</button> <button className="link" onClick={() => setConfirm(null)}>No</button></span>
            ) : <button className="link" onClick={() => setConfirm("clear")}>Undo drawing</button>}
          </div>
          </>
        )}
        {d.entries.length < 3 && !drawn && <p className="small muted">You need at least 3 people to draw.</p>}
      </div>

      {drawn && showMatches && (
        <ul className="matches">
          {Object.entries(d.matches).map(([g, r]) => (
            <li key={g}><strong>{byId[g]?.name || "(removed)"}</strong> → {byId[r]?.name || "(removed)"}</li>
          ))}
        </ul>
      )}

      <div className="row spread" style={{ marginTop: 8 }}>
        <h3>Sign-ups ({d.entries.length})</h3>
        {!drawn && !adding && <button className="link" onClick={() => setAdding(true)}>+ Add someone</button>}
      </div>
      {adding && (
        <form className="row" onSubmit={async (e) => { e.preventDefault(); if (await act({ action: "save", entry: { name: newName, household: newHouse } }, `Added ${newName}.`)) { setAdding(false); setNewName(""); setNewHouse(""); } }}>
          <input aria-label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" style={{ maxWidth: 180 }} />
          <input aria-label="Household" value={newHouse} onChange={(e) => setNewHouse(e.target.value)} placeholder="Household (optional)" style={{ maxWidth: 180 }} />
          <button className="btn" type="submit" disabled={!newName.trim()}>Add</button>
          <button type="button" className="link" onClick={() => setAdding(false)}>Cancel</button>
        </form>
      )}
      {d.entries.length === 0 ? <p className="muted">Nobody has signed up yet.</p> : (
        <ul className="host-list">
          {d.entries.map((e) => (
            <li key={e.id}>
              <div className="host-row">
                <div>
                  <strong>{e.name}</strong>{e.household && <span className="small muted"> · {e.household} household</span>}
                  {openId === e.id && (
                    <div className="small" style={{ marginTop: 6 }}>
                      <p><strong>Wish list:</strong> {e.wishlist || <span className="muted">none</span>}</p>
                      {e.sizes && <p><strong>Sizes:</strong> {e.sizes}</p>}
                      {e.avoid && <p><strong>Avoid:</strong> {e.avoid}</p>}
                    </div>
                  )}
                </div>
                <div className="row">
                  <button className="link" onClick={() => setOpenId(openId === e.id ? null : e.id)}>{openId === e.id ? "Less" : "Details"}</button>
                  {confirm === e.id ? (
                    <span className="confirm">Remove{drawn ? " (redraw after)" : ""}? <button className="link danger" onClick={async () => { setConfirm(null); await act({ action: "delete", id: e.id }, `Removed ${e.name}.`); }}>Yes</button> <button className="link" onClick={() => setConfirm(null)}>No</button></span>
                  ) : <button className="link" onClick={() => setConfirm(e.id)}>Remove</button>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="row" style={{ marginTop: 10 }}>
        <label htmlFor="ss-reset" className="small">Start Secret Santa over: type RESET</label>
        <input id="ss-reset" value={resetText} onChange={(e) => setResetText(e.target.value)} style={{ maxWidth: 120 }} autoComplete="off" />
        <button className="btn danger-btn" disabled={resetText !== "RESET"} onClick={async () => { if (await act({ action: "reset", confirm: "RESET" }, "Secret Santa cleared.")) setResetText(""); }}>Clear sign-ups</button>
      </div>
    </section>
  );
}

function ShareLink() {
  const [url, setUrl] = useState("/xmas-ss-drawing");
  const [copied, setCopied] = useState(false);
  useEffect(() => { setUrl(`${window.location.origin}/xmas-ss-drawing`); }, []);
  return (
    <div className="share">
      <span className="small"><strong>Send everyone this link</strong> to see who they got:</span>
      <div className="row">
        <code className="share-url">{url}</code>
        <button type="button" className="btn" onClick={async () => {
          try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setCopied(false); }
        }}>{copied ? "Copied!" : "Copy link"}</button>
      </div>
    </div>
  );
}
