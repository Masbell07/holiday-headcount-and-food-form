import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "Greetings from Divide, Colorado · Nov 19–22";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const font = (pkg, file) => readFile(path.join(process.cwd(), "node_modules", "@fontsource", pkg, "files", file));

export default async function Image() {
  const [alfa, tail, cond] = await Promise.all([
    font("alfa-slab-one", "alfa-slab-one-latin-400-normal.woff"),
    font("yellowtail", "yellowtail-latin-400-normal.woff"),
    font("barlow-condensed", "barlow-condensed-latin-700-normal.woff"),
  ]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg, #070b1c 0%, #202a55 50%, #7a6672 82%, #a9787a 100%)", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 150, background: "#0b0f1a", display: "flex" }} />
        <div style={{ fontFamily: "Yellowtail", fontSize: 92, color: "#f3c47e", transform: "rotate(-5deg)", marginBottom: -20, marginLeft: -520, display: "flex" }}>Greetings from</div>
        <div style={{ fontFamily: "Alfa", fontSize: 250, lineHeight: 1, color: "#f6efe2", textShadow: "12px 12px 0 #151a2c", display: "flex" }}>DIVIDE</div>
        <div style={{ marginTop: 24, padding: "8px 44px", background: "#b4462e", color: "#fbf2e3", fontFamily: "Cond", fontSize: 46, borderRadius: 8, display: "flex" }}>Colorado · Nov 19–22</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Alfa", data: alfa, weight: 400 }, { name: "Yellowtail", data: tail, weight: 400 }, { name: "Cond", data: cond, weight: 700 }] },
  );
}
