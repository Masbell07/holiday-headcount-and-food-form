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

export const metadata = {
  title: "Greetings from Divide · Nov 19–22",
  robots: { index: false },
};
export const viewport = { themeColor: "#0f1424" };

export default function Page() {
  return <TripPage />;
}
