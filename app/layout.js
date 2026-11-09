import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/fraunces/full-italic.css";
import "@fontsource-variable/dm-sans";
import "./globals.css";

export const metadata = {
  title: "Thanksgiving 2026",
  description: "RSVP and claim a dish so nobody brings the same thing.",
  openGraph: { title: "Thanksgiving 2026 🦃", description: "RSVP and tell us what you're bringing." },
};

export const viewport = { themeColor: "#3B2414", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
