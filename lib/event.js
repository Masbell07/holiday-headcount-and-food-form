// Edit this list to change the must-have dishes shown at the top of the page.
export const MUST_HAVES = [
  { name: "Turkey", type: "Main" },
  { name: "Grandma potatoes", type: "Side" },
  { name: "Stuffing", type: "Side" },
  { name: "Green beans", type: "Side" },
  { name: "Cranberry sauce", type: "Side" },
  { name: "Cheese sauce", type: "Side" },
  { name: "Rolls", type: "Bread & rolls" },
  { name: "Veggie tray", type: "Appetizer" },
  { name: "Apple pie", type: "Dessert" },
  { name: "Chocolate pie", type: "Dessert" },
];

// Day vote. Everyone picks the day that works best; dinner is at 5 PM on every option.
export const DINNER_TIME = "5 PM";
export const DAY_OPTIONS = [
  { id: "thu", day: "Thursday", date: "Nov 26" },
  { id: "fri", day: "Friday", date: "Nov 27" },
  { id: "sat", day: "Saturday", date: "Nov 28" },
  { id: "sun", day: "Sunday", date: "Nov 29" },
];
// Once you decide, set this to "thu", "fri", "sat" or "sun". The header then shows that day and voting closes.
export const CHOSEN_DAY = null;
