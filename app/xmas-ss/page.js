import SantaPage from "@/components/SantaPage";

export const metadata = {
  title: "Secret Santa 2026",
  description: "Join our family Secret Santa. Names are drawn on Thanksgiving.",
  openGraph: { title: "Secret Santa 2026 🎁", description: "Join our family Secret Santa. Names are drawn on Thanksgiving." },
};
export const viewport = { themeColor: "#123524" };

export default function Page() {
  return <SantaPage />;
}
