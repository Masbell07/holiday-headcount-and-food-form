import { allRsvps, getRsvp, saveRsvp, removeRsvp, claimDish, releaseDishes } from "@/lib/store";
import { dishKey, DISH_TYPES } from "@/lib/dish";
import { DAY_OPTIONS } from "@/lib/event";

const STATUSES = ["yes", "maybe", "no"];
const clean = (s, max) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const count = (n) => Math.max(0, Math.min(30, parseInt(n, 10) || 0));
export const publicView = ({ token, ...rest }) => rest;

// Shared by guests (who need their device token to edit) and the host (who can edit anyone).
// Returns { status, body } for the route to send back.
export async function saveFromBody(body, { asHost = false } = {}) {
  const name = clean(body.name, 60);
  const status = STATUSES.includes(body.status) ? body.status : null;
  if (!name) return fail(asHost ? "Add a name for this RSVP." : "Add your name so everyone knows who's coming.");
  if (!status) return fail(asHost ? "Choose whether they're coming." : "Let us know if you're coming.");

  let existing = null;
  if (body.id) {
    existing = await getRsvp(body.id);
    if (!existing) return fail(asHost ? "That RSVP was removed. Reload the page." : "We couldn't find your earlier RSVP on this device. Send it as a new one.", 404);
    if (!asHost && existing.token !== body.token) return fail("We couldn't find your earlier RSVP on this device. Send it as a new one.", 403);
  }

  const dishes = status === "no" ? [] : (Array.isArray(body.dishes) ? body.dishes : [])
    .map((d) => ({ name: clean(d?.name, 60), type: DISH_TYPES.includes(d?.type) ? d.type : "Other" }))
    .filter((d) => d.name && dishKey(d.name))
    .slice(0, 6)
    .map((d) => ({ ...d, key: dishKey(d.name) }));

  const seen = new Set();
  for (const d of dishes) {
    if (seen.has(d.key)) return fail(`"${d.name}" is listed twice.`);
    seen.add(d.key);
  }

  const id = existing?.id || crypto.randomUUID();
  const token = existing?.token || crypto.randomUUID();
  const oldKeys = new Set((existing?.dishes || []).map((d) => d.key));

  // Claim new dishes one at a time; each claim is atomic, so two people can't both win.
  const claimed = [];
  const conflicts = [];
  for (const d of dishes) {
    if (oldKeys.has(d.key)) continue;
    if (await claimDish(d.key, id)) claimed.push(d.key);
    else conflicts.push(d);
  }
  if (conflicts.length) {
    await releaseDishes(claimed);
    const everyone = await allRsvps();
    const describe = (d) => {
      const owner = everyone.find((r) => r.dishes?.some((x) => x.key === d.key));
      const theirs = owner?.dishes.find((x) => x.key === d.key)?.name || d.name;
      return `${owner?.name || "Someone"} is already bringing ${theirs.toLowerCase()}.`;
    };
    return { status: 409, body: { error: conflicts.map(describe).join(" ") + " Pick something else?", conflicts: conflicts.map((d) => d.name) } };
  }

  const newKeys = new Set(dishes.map((d) => d.key));
  await releaseDishes([...oldKeys].filter((k) => !newKeys.has(k)));

  const rsvp = {
    id, token, name, status,
    adults: status === "no" ? 0 : Math.max(count(body.adults), status === "yes" ? 1 : 0),
    kids: status === "no" ? 0 : count(body.kids),
    day: status !== "no" && DAY_OPTIONS.some((d) => d.id === body.day) ? body.day : "",
    dishes,
    notes: clean(body.notes, 200),
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now(),
    ...(asHost ? { editedByHost: true } : {}),
  };
  await saveRsvp(rsvp);
  return { status: 200, body: { id, token, rsvp: publicView(rsvp) } };
}

export async function deleteRsvp(id) {
  const rsvp = id && (await getRsvp(id));
  if (!rsvp) return false;
  await releaseDishes((rsvp.dishes || []).map((d) => d.key));
  await removeRsvp(id);
  return true;
}

function fail(error, status = 400) {
  return { status, body: { error } };
}
