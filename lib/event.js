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

// Day vote. Everyone picks the day that works best. Each day has its own dinner time.
export const DAY_OPTIONS = [
  { id: "thu", day: "Thursday", date: "Nov 26", time: "6 PM" },
  { id: "fri", day: "Friday", date: "Nov 27", time: "2 PM" },
  { id: "sat", day: "Saturday", date: "Nov 28", time: "2 PM" },
  { id: "sun", day: "Sunday", date: "Nov 29", time: "2 PM" },
];
// Default for the header before a day is chosen. The host dashboard sets the real day.
export const CHOSEN_DAY = null;
