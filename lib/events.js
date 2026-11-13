// Every event the site runs. Each one has its own page, host dashboard, RSVPs and dish claims.
// `prefix` names the event's records in the database: never change it once guests have RSVP'd.

const TG_MUSTS = [
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

const XMAS_MUSTS = [
  { name: "Ham", type: "Main" },
  { name: "Grandma potatoes", type: "Side" },
  { name: "Stuffing", type: "Side" },
  { name: "Green beans", type: "Side" },
  { name: "Cranberry sauce", type: "Side" },
  { name: "Rolls", type: "Bread & rolls" },
  { name: "Veggie tray", type: "Appetizer" },
  { name: "Apple pie", type: "Dessert" },
  { name: "Chocolate pie", type: "Dessert" },
  { name: "Cinnamon rolls", type: "Dessert" },
];

export const EVENTS = {
  thanksgiving: {
    id: "thanksgiving",
    prefix: "tg2026",
    name: "Thanksgiving",
    year: "2026",
    path: "/",
    hostPath: "/host",
    theme: "thanksgiving",
    range: "Thursday to Sunday, Nov 26–29",
    month: ["Nov", "November"],
    timesLine: "Thursday at 6 PM, or Friday to Sunday at 2 PM. Vote for the day that works best.",
    timesShort: "Thursday dinner is at 6 PM; Friday to Sunday it's at 2 PM.",
    footer: "Made with gratitude · Happy Thanksgiving",
    dishExample: "e.g. Green bean casserole",
    days: [
      { id: "thu", day: "Thursday", date: "Nov 26", time: "6 PM" },
      { id: "fri", day: "Friday", date: "Nov 27", time: "2 PM" },
      { id: "sat", day: "Saturday", date: "Nov 28", time: "2 PM" },
      { id: "sun", day: "Sunday", date: "Nov 29", time: "2 PM" },
    ],
    mustHaves: TG_MUSTS,
  },
  xmas: {
    id: "xmas",
    prefix: "xmas2026",
    name: "Christmas",
    year: "2026",
    path: "/xmas",
    hostPath: "/host-xmas",
    theme: "xmas",
    range: "Thursday to Sunday, Dec 24–27",
    month: ["Dec", "December"],
    timesLine: "Christmas Day at 6 PM, or Dec 24, 26 or 27 at 2 PM. Vote for the day that works best.",
    timesShort: "Christmas Day dinner is at 6 PM; the other days it's at 2 PM.",
    footer: "Made with love · Merry Christmas",
    dishExample: "e.g. Scalloped potatoes",
    days: [
      { id: "thu", day: "Thursday", date: "Dec 24", time: "2 PM", note: "Christmas Eve" },
      { id: "fri", day: "Friday", date: "Dec 25", time: "6 PM", note: "Christmas Day" },
      { id: "sat", day: "Saturday", date: "Dec 26", time: "2 PM" },
      { id: "sun", day: "Sunday", date: "Dec 27", time: "2 PM" },
    ],
    mustHaves: XMAS_MUSTS,
  },
};

export const getEvent = (id) => EVENTS[id] || null;
