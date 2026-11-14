import SantaDrawing from "@/components/SantaDrawing";

export const metadata = {
  title: "Secret Santa Drawing 2026",
  description: "See who you got for our family Secret Santa.",
  openGraph: { title: "Secret Santa Drawing 🎁", description: "Names are drawn! Tap your name to see who you got." },
  robots: { index: false },
};
export const viewport = { themeColor: "#123524" };

export default function Page() {
  return <SantaDrawing />;
}
