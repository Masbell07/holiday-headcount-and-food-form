import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/fraunces/full-italic.css";
import "@fontsource-variable/dm-sans";
import "./globals.css";

export const metadata = {
  title: "Holiday RSVP",
  description: "RSVP, vote for the day and claim a dish.",
};

export const viewport = { themeColor: "#3B2414", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
