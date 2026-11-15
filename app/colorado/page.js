import TripPage from "@/components/TripPage";
import "./colorado.css";

export const metadata = {
  title: "Colorado Trip · Nov 19–22",
  robots: { index: false },
};
export const viewport = { themeColor: "#b5482d" };

export default function Page() {
  return <TripPage />;
}
