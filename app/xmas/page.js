import EventPage from "@/components/EventPage";

export const metadata = {
  title: "Christmas 2026",
  description: "RSVP, vote for the day and claim a dish so nobody brings the same thing.",
  openGraph: { title: "Christmas 2026 🎄", description: "RSVP, vote for the day and tell us what you're bringing." },
};

export const viewport = { themeColor: "#123524" };

export default function Page() {
  return <EventPage eventId="xmas" />;
}
