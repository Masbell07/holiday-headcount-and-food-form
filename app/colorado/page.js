import TripPage from "@/components/TripPage";
import "@fontsource/alfa-slab-one/400.css";
import "@fontsource/yellowtail/400.css";
import "@fontsource/caveat/500.css";
import "@fontsource/caveat/600.css";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./colorado.css";

const DESC = "Our cabin trip to Divide, Colorado, Nov 19–22: the plan, ideas, packing lists and cabin info.";
export const metadata = {
  metadataBase: new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://holiday-headcount-and-food-form-n48.vercel.app"),
  title: "Greetings from Divide · Nov 19–22",
  description: DESC,
  robots: { index: false },
  openGraph: { title: "Greetings from Divide · Nov 19–22", description: DESC, siteName: "Divide, CO trip", type: "website" },
  twitter: { card: "summary_large_image", title: "Greetings from Divide · Nov 19–22", description: DESC },
};
export const viewport = { themeColor: "#0f1424" };

export default function Page() {
  return <TripPage />;
}
