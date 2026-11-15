import TripPage from "@/components/TripPage";
import "./colorado.css";

export const metadata = {
  title: "Divide, CO · Nov 19–22",
  robots: { index: false },
};
export const viewport = { themeColor: "#0c0f14" };

export default function Page() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" precedence="default" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&display=swap" />
      <TripPage />
    </>
  );
}
