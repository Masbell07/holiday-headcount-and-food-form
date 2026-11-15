// Dusk over Pikes Peak from Divide: layered ranges, granite domes, bare aspens and a dark spruce line.
// Trees and stars come from a seeded generator so server and browser draw the same picture.

function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function conifer(x, base, h, r) {
  const w = h * (0.2 + r() * 0.08);
  const tiers = 7 + Math.floor(r() * 4);
  const left = [], right = [];
  for (let i = 0; i <= tiers; i++) {
    const t = i / tiers;
    const y = base - h * 0.08 - t * h * 0.92;
    const half = w * (1 - t) * (0.75 + r() * 0.35);
    left.push(`${(x - half).toFixed(1)},${y.toFixed(1)}`, `${(x - half * 0.35).toFixed(1)},${(y - h * 0.05).toFixed(1)}`);
    right.unshift(`${(x + half * 0.35).toFixed(1)},${(y - h * 0.05).toFixed(1)}`, `${(x + half).toFixed(1)},${y.toFixed(1)}`);
  }
  return `M${x - 2},${base} L${left.join(" L")} L${x},${base - h} L${right.join(" L")} L${x + 2},${base}Z`;
}

function forest(seed, from, to, base, minH, maxH, step) {
  const r = rng(seed);
  const out = [];
  for (let x = from; x < to; x += step * (0.5 + r())) out.push(conifer(x, base + r() * 14, minH + r() * (maxH - minH), r));
  return out.join(" ");
}

const STARS = (() => {
  const r = rng(7);
  return Array.from({ length: 90 }, () => [r() * 1600, r() * 300, r() * 1.3 + 0.3, 0.25 + r() * 0.6]);
})();
const FAR_TREES = forest(11, -20, 1640, 470, 26, 46, 14);
const NEAR_TREES = forest(23, -40, 1660, 600, 70, 170, 34);

export default function TripScene({ className = "" }) {
  return (
    <svg className={`co-scene ${className}`} viewBox="0 0 1600 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="cs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#070c16" /><stop offset=".45" stopColor="#18233a" />
          <stop offset=".72" stopColor="#3d4560" /><stop offset=".9" stopColor="#7a6672" /><stop offset="1" stopColor="#a9787a" />
        </linearGradient>
        <linearGradient id="cs-peak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4c5672" /><stop offset="1" stopColor="#2d3549" />
        </linearGradient>
        <linearGradient id="cs-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9ecf2" stopOpacity=".95" /><stop offset="1" stopColor="#c7ccd8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="cs-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b7d8a" stopOpacity="0" /><stop offset="1" stopColor="#8b7d8a" stopOpacity=".35" />
        </linearGradient>
        <linearGradient id="cs-granite" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8a7570" /><stop offset=".5" stopColor="#5a4b49" /><stop offset="1" stopColor="#2f2827" />
        </linearGradient>
        <linearGradient id="cs-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d1512" /><stop offset="1" stopColor="#060a08" />
        </linearGradient>
        <filter id="cs-grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch" /><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .05 0" /></filter>
      </defs>

      <rect width="1600" height="600" fill="url(#cs-sky)" />
      <g className="co-stars">{STARS.map(([x, y, r, o], i) => <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={r.toFixed(2)} fill="#fff" opacity={o.toFixed(2)} />)}</g>
      <path d="M1290 92 a20 20 0 1 0 14 34 a16 16 0 1 1 -14 -34Z" fill="#f1e9d6" opacity=".9" />

      {/* Far front range */}
      <path d="M0 360 L120 330 L230 345 L340 300 L450 330 L560 310 L640 335 L760 320 V600 H0Z" fill="#323b55" />
      {/* Pikes Peak from the west: broad massif, summit plateau, sub-peaks and snow-filled gullies */}
      <path d="M470 420 L560 392 L620 374 L680 352 L720 334 L752 316 L776 306 L800 284 L826 272 L846 252 L870 232 L892 214 L912 204 L932 199 L954 192 L978 194 L998 188 L1022 195 L1046 206 L1070 222 L1092 228 L1116 246 L1146 256 L1176 270 L1206 286 L1250 298 L1320 318 L1420 338 L1600 352 V600 H470Z" fill="url(#cs-peak)" />
      <g fill="#262d40" opacity=".55">
        <path d="M912 204 L884 300 L862 372 L900 360 L932 260 L932 199Z" />
        <path d="M998 188 L1004 262 L1020 350 L1050 344 L1030 250 L1022 195Z" />
        <path d="M846 252 L800 340 L790 390 L826 380 L852 300Z" />
        <path d="M1092 228 L1120 300 L1160 352 L1180 340 L1140 280 L1116 246Z" />
      </g>
      <path d="M870 232 L892 214 L912 204 L932 199 L954 192 L978 194 L998 188 L1022 195 L1046 206 L1070 222 L1060 230 L1042 222 L1030 238 L1016 214 L1000 226 L986 210 L966 230 L952 212 L938 236 L922 220 L906 246 L894 232 L880 250Z" fill="url(#cs-snow)" />
      <g fill="#dfe3ea" opacity=".5">
        <path d="M938 236 L944 262 L936 300 L930 330 L926 300 L932 262Z" />
        <path d="M986 210 L992 250 L1000 300 L992 290 L984 250Z" />
        <path d="M1030 238 L1046 270 L1064 316 L1054 312 L1036 274Z" />
        <path d="M906 246 L896 280 L880 318 L886 282Z" />
        <path d="M1116 246 L1134 270 L1128 268Z" />
      </g>
      <path d="M752 316 L776 306 L800 284 L826 272 L846 252 L870 232 L892 214 L912 204 L932 199 L954 192 L978 194 L998 188 L1022 195 L1046 206 L1070 222 L1092 228 L1116 246 L1146 256 L1176 270 L1206 286" stroke="#b6a6b4" strokeWidth="1.5" fill="none" opacity=".45" />
      <rect x="0" y="300" width="1600" height="160" fill="url(#cs-haze)" />

      {/* Middle ridge */}
      <path d="M0 440 Q160 400 300 420 T600 410 Q760 380 900 420 T1200 412 Q1380 392 1600 430 V600 H0Z" fill="#1b2430" />
      <path d={FAR_TREES} fill="#121a1d" />

      {/* Pikes Peak granite domes */}
      <path d="M1080 520 Q1090 452 1150 446 Q1196 444 1214 486 Q1240 470 1268 492 Q1290 512 1292 540 H1080Z" fill="url(#cs-granite)" />
      <path d="M1150 446 Q1196 444 1214 486" stroke="#b49a90" strokeWidth="2" fill="none" opacity=".5" />
      <path d="M180 540 Q196 492 244 488 Q286 488 300 530 V560 H180Z" fill="url(#cs-granite)" opacity=".9" />

      {/* Two cabin lights far off in the trees */}
      <circle cx="702" cy="478" r="2.2" fill="#f2b45a" className="co-lamp" /><circle cx="710" cy="479" r="1.6" fill="#f2b45a" className="co-lamp" />

      {/* Ground, snow and near forest */}
      <path d="M0 540 Q400 510 800 530 T1600 520 V600 H0Z" fill="url(#cs-ground)" />
      <path d="M0 548 Q300 532 620 546 Q900 556 1180 538 Q1420 526 1600 540" stroke="#cfd6dc" strokeWidth="3" fill="none" opacity=".18" />
      <path d={NEAR_TREES} fill="#050907" />

      {/* Bare aspens */}
      <g stroke="#d9d4c8" strokeLinecap="round">
        <path d="M1452 600 L1458 300" strokeWidth="7" /><path d="M1492 600 L1489 340" strokeWidth="5" /><path d="M1530 600 L1536 280" strokeWidth="6" />
        <g strokeWidth="1.6" opacity=".8"><path d="M1457 360 L1430 330" /><path d="M1489 400 L1512 372" /><path d="M1535 330 L1562 300" /><path d="M1458 420 L1440 404" /></g>
      </g>
      <g fill="#1b1d1c" opacity=".75"><rect x="1454" y="440" width="7" height="3" /><rect x="1486" y="470" width="5" height="3" /><rect x="1532" y="400" width="7" height="3" /><rect x="1455" y="520" width="7" height="2" /></g>

      <rect width="1600" height="600" filter="url(#cs-grain)" />
    </svg>
  );
}
