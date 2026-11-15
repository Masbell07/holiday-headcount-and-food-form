// Postcard art for the Colorado trip: one scene per day, drawn at 800×300,
// and the large-letter "Greetings from DIVIDE" header that is filled with them.
import { rng, forest } from "@/components/TripScene";

const STARS = (() => { const r = rng(41); return Array.from({ length: 60 }, () => [r() * 800, r() * 150, r() * 1.2 + 0.3, 0.3 + r() * 0.6]); })();
const NIGHT_TREES_L = forest(5, -20, 250, 300, 50, 120, 22);
const NIGHT_TREES_R = forest(9, 560, 830, 300, 50, 120, 22);
const ASPEN_PINES = forest(17, -20, 820, 175, 20, 40, 12);
const ROCK_PINES = forest(29, -20, 820, 262, 10, 22, 16);

function NightDrive() {
  return (
    <g>
      <defs>
        <linearGradient id="pc-n-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#070b1c" /><stop offset=".7" stopColor="#202a55" /><stop offset="1" stopColor="#3b3f72" /></linearGradient>
        <linearGradient id="pc-n-beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ffe3a0" stopOpacity=".55" /><stop offset="1" stopColor="#ffe3a0" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width="800" height="300" fill="url(#pc-n-sky)" />
      {STARS.map(([x, y, r, o], i) => <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={r.toFixed(2)} fill="#fff" opacity={o.toFixed(2)} />)}
      <circle cx="640" cy="60" r="16" fill="#f3ead6" /><circle cx="648" cy="54" r="15" fill="#151c3d" />
      <path d="M0 200 L120 150 L230 175 L340 110 L420 95 L470 120 L560 140 L680 120 L800 160 V300 H0Z" fill="#2c3462" />
      <path d="M420 95 L436 106 L428 108 L446 118 L470 120 Z" fill="#d9dceb" opacity=".8" />
      <path d="M0 230 Q200 195 400 215 T800 205 V300 H0Z" fill="#161b38" />
      <path d="M330 300 L392 212 Q400 202 408 212 L470 300Z" fill="#2a2e40" />
      <path d="M400 300 L400 284 M400 270 L400 258 M400 246 L401 238 M401 229 L402 223" stroke="#f2c86b" strokeWidth="3" />
      <path d="M352 300 L398 214 L404 214 L452 300Z" fill="url(#pc-n-beam)" />
      <circle cx="398" cy="218" r="2" fill="#ff5a4a" /><circle cx="405" cy="218" r="2" fill="#ff5a4a" />
      <path d={NIGHT_TREES_L} fill="#060914" /><path d={NIGHT_TREES_R} fill="#060914" />
    </g>
  );
}

function RedRocks() {
  return (
    <g>
      <defs>
        <linearGradient id="pc-r-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5d6aa8" /><stop offset=".5" stopColor="#e7907c" /><stop offset="1" stopColor="#f8d08a" /></linearGradient>
        <linearGradient id="pc-r-rock" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f19a68" /><stop offset=".35" stopColor="#c9532f" /><stop offset="1" stopColor="#7e2c18" /></linearGradient>
      </defs>
      <rect width="800" height="300" fill="url(#pc-r-sky)" />
      <circle cx="140" cy="200" r="38" fill="#ffe7a8" /><circle cx="140" cy="200" r="70" fill="#ffe7a8" opacity=".25" />
      <path d="M300 230 L400 150 L460 112 L500 98 L540 102 L580 120 L650 160 L760 210 V300 H300Z" fill="#9a86ad" />
      <path d="M460 112 L500 98 L540 102 L556 112 L536 120 L520 110 L500 124 L484 112 L470 124Z" fill="#f6eef2" />
      <path d="M0 250 Q200 230 400 245 T800 240 V300 H0Z" fill="#7a5848" />
      <path d="M150 300 L172 180 Q182 120 196 150 L206 200 L214 120 Q224 70 238 110 L250 190 L262 300Z" fill="url(#pc-r-rock)" />
      <path d="M520 300 L536 210 Q548 160 562 190 L570 230 L582 170 Q594 140 604 176 L616 300Z" fill="url(#pc-r-rock)" />
      <path d="M300 300 L312 236 Q322 210 334 232 L344 300Z" fill="#a8401f" />
      <path d={ROCK_PINES} fill="#2f3a33" />
      <path d="M0 278 Q400 262 800 276 V300 H0Z" fill="#5a3c30" />
    </g>
  );
}

function AspenTrout() {
  const trunks = [[70, 2.6], [120, 2], [165, 3], [640, 2.4], [690, 3], [745, 2.2]];
  return (
    <g>
      <defs>
        <linearGradient id="pc-a-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fb7d8" /><stop offset="1" stopColor="#eef0ec" /></linearGradient>
        <linearGradient id="pc-a-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6d9cbf" /><stop offset="1" stopColor="#3f6c8f" /></linearGradient>
      </defs>
      <rect width="800" height="300" fill="url(#pc-a-sky)" />
      <path d="M0 170 Q150 120 300 150 T600 130 Q700 120 800 150 V300 H0Z" fill="#9b929b" />
      <path d={ASPEN_PINES} fill="#3a4a52" />
      <path d="M0 190 Q400 170 800 190 V300 H0Z" fill="#c9b994" />
      <path d="M260 300 Q300 250 380 232 Q470 214 540 220 Q620 226 660 210 L800 205 V232 Q700 236 640 250 Q560 268 470 262 Q380 258 340 300Z" fill="url(#pc-a-water)" />
      <path d="M390 246 Q430 238 470 244 M520 240 Q560 236 600 242" stroke="#d8ebf7" strokeWidth="2" fill="none" opacity=".7" />
      <path d="M200 300 Q210 268 250 262 Q290 262 296 300Z" fill="#8e8380" />
      {trunks.map(([x, w], i) => (
        <g key={i}>
          <rect x={x} y={40 + (i % 3) * 14} width={w * 4} height={260} fill="#ece8df" />
          {[90, 130, 175, 220].map((y, j) => <rect key={j} x={x} y={y + i * 3} width={w * 4} height="3" fill="#2b2b2b" opacity=".7" />)}
        </g>
      ))}
      {[[80, 50], [100, 70], [130, 44], [175, 62], [650, 56], [700, 40], [735, 70], [755, 52]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={7 + (i % 3) * 3} fill="#e6b54a" opacity=".9" />)}
      <g transform="translate(470 218) rotate(-28)">
        <path d="M-34 0 Q-10 -14 22 -4 L34 -12 L32 4 L22 2 Q-10 12 -34 0Z" fill="#c9cfd6" />
        <path d="M-26 0 Q0 -4 22 -1" stroke="#e08a9a" strokeWidth="4" fill="none" />
        <circle cx="-26" cy="-2" r="1.6" fill="#222" />
      </g>
      <g stroke="#e9f4fb" strokeWidth="2" fill="none" opacity=".9"><path d="M440 236 Q446 226 452 234" /><path d="M496 232 Q502 222 508 230" /></g>
    </g>
  );
}

function RoadHome() {
  return (
    <g>
      <defs>
        <linearGradient id="pc-h-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fa9d6" /><stop offset=".75" stopColor="#efd8b4" /><stop offset="1" stopColor="#f6e2bf" /></linearGradient>
        <linearGradient id="pc-h-field" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d7b46c" /><stop offset="1" stopColor="#a8803e" /></linearGradient>
      </defs>
      <rect width="800" height="300" fill="url(#pc-h-sky)" />
      <circle cx="660" cy="150" r="26" fill="#fff1c9" />
      <path d="M0 175 L60 150 L120 160 L180 130 L230 150 L300 140 L360 165 L400 170 V200 H0Z" fill="#8d9bbc" />
      <path d="M180 130 L196 140 L186 142 L204 150 L230 150Z" fill="#f2f2f4" opacity=".85" />
      <g fill="#6c7898">
        {[[520, 22], [534, 34], [548, 16], [560, 46], [574, 28], [588, 38], [602, 20], [614, 30]].map(([x, h], i) => <rect key={i} x={x} y={182 - h} width="12" height={h} />)}
      </g>
      <rect x="0" y="182" width="800" height="118" fill="url(#pc-h-field)" />
      <path d="M170 300 L297 184 L303 184 L470 300Z" fill="#3c3f4a" />
      <path d="M320 300 L300 186" stroke="#f3d27a" strokeWidth="3" strokeDasharray="14 14" />
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={560 + i * 40} y={200 + i * 14} width="3" height={10 + i * 4} fill="#5b4630" />)}
    </g>
  );
}

export const SCENES = { thu: NightDrive, fri: RedRocks, sat: AspenTrout, sun: RoadHome };

export function DayArt({ k, className = "" }) {
  const Scene = SCENES[k] || NightDrive;
  return (
    <svg className={className} viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <Scene />
    </svg>
  );
}

// "Greetings from DIVIDE": big block letters filled with the four day scenes, with a 3D drop.
export function Greetings({ sub }) {
  const order = ["thu", "fri", "sat", "sun"];
  const letters = (props) => (
    <text x="500" y="268" textAnchor="middle" textLength="880" lengthAdjust="spacingAndGlyphs" fontFamily="'Alfa Slab One', Rockwell, serif" fontSize="230" {...props}>DIVIDE</text>
  );
  return (
    <svg className="co-greet" viewBox="0 0 1000 380" role="img" aria-label="Greetings from Divide, Colorado">
      <defs>
        <clipPath id="co-letters">{letters({})}</clipPath>
      </defs>
      {[12, 10, 8, 6, 4, 2].map((d) => <g key={d} transform={`translate(${d} ${d})`}>{letters({ fill: "#151a2c" })}</g>)}
      <g clipPath="url(#co-letters)">
        {order.map((k, i) => {
          const Scene = SCENES[k];
          return (
            <svg key={k} x={60 + i * 220} y="70" width="220" height="210" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice">
              <Scene />
            </svg>
          );
        })}
        <svg x="0" y="70" width="60" height="210" viewBox="0 0 800 300" preserveAspectRatio="xMaxYMid slice"><RoadHome /></svg>
        <svg x="940" y="70" width="60" height="210" viewBox="0 0 800 300" preserveAspectRatio="xMinYMid slice"><NightDrive /></svg>
      </g>
      {letters({ fill: "none", stroke: "#f6efe2", strokeWidth: 5, strokeLinejoin: "round" })}
      <text x="70" y="70" fontFamily="'Yellowtail', 'Brush Script MT', cursive" fontSize="64" fill="#f3c47e" transform="rotate(-6 70 70)">Greetings from</text>
      <g transform="translate(500 330)">
        <rect x="-250" y="-26" width="500" height="44" rx="6" fill="#b4462e" />
        <path d="M-250 -26 L-276 -4 L-250 18 Z M250 -26 L276 -4 L250 18 Z" fill="#8e3420" />
        <text x="0" y="6" textAnchor="middle" fontFamily="'Barlow Condensed', 'Arial Narrow', sans-serif" fontWeight="700" fontSize="26" fill="#fbf2e3" letterSpacing="1">{sub}</text>
      </g>
    </svg>
  );
}
