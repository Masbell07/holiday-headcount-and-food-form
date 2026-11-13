import HostDashboard from "@/components/HostDashboard";

export const metadata = { title: "Host · Thanksgiving 2026", robots: { index: false } };

export default function Page() {
  return <HostDashboard eventId="thanksgiving" />;
}
