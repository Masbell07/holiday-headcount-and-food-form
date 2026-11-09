// Shared by the browser and the server so both agree on what counts as "the same dish".

export const DISH_TYPES = [
  "Main",
  "Side",
  "Salad",
  "Bread & rolls",
  "Appetizer",
  "Dessert",
  "Drinks",
  "Plates & supplies",
  "Other",
];

const FILLER = new Set([
  "a", "an", "the", "my", "our", "some", "homemade", "home", "made", "famous",
  "grandmas", "grandma", "moms", "mom", "aunt", "aunts", "classic", "easy", "big",
  "small", "of", "and", "with", "dish", "tray", "pan", "plate", "batch",
]);

// "pies"/"pie", "potatoes"/"potato", "cookies"/"cookie" all reduce to the same stem.
function stem(w) {
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  if (w.length > 3 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}

// Turn "Grandma's Mashed Potatoes!" and "mashed potato" into the same key.
export function dishKey(name) {
  const words = String(name || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !FILLER.has(w))
    .map(stem);
  return words.join(" ");
}

const GENERIC = new Set(["pie", "salad", "bread", "roll", "cake", "dip", "sauce", "casserole", "drink", "soda", "wine", "beer", "cookie", "bar", "tart", "bake"].map(stem));

// Dishes that share a distinctive word ("sweet potato casserole" vs "sweet potato pie")
// get a gentle heads-up, not a block.
export function similarDishes(name, claimed) {
  const key = dishKey(name);
  if (!key) return [];
  const mine = new Set(key.split(" ").filter((w) => w.length > 1 && !GENERIC.has(w)));
  return claimed.filter((d) => {
    const k = dishKey(d.name);
    if (k === key) return false;
    return k.split(" ").some((w) => mine.has(w));
  });
}
