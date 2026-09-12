import type { Craft } from "@/lib/types";
import { getSkin } from "@/lib/cosmetics";

type Props = {
  craft: Craft;
  size?: "small" | "large";
  launching?: boolean;
};

export function ProbeVisual({ craft, size = "large", launching = false }: Props) {
  const skin = getSkin(craft.skinId);
  const scars = new Set(craft.scarIds ?? []);
  const veteran = (craft.voyagesCompleted ?? 0) >= 4;
  const cursed = (craft.cargoLootIds ?? []).includes("friend_shaped_void");
  const label = `${craft.name}, ${scars.size} scars, ${craft.voyagesCompleted ?? 0} voyages`;

  return (
    <svg
      viewBox="0 0 320 260"
      role="img"
      aria-label={label}
      className={`${size === "small" ? "h-16 w-20" : "h-full min-h-56 w-full"} overflow-visible ${launching ? "probe-launching" : "probe-floating"}`}
    >
      <defs>
        <linearGradient id={`body-${craft.id}`} x1="0" x2="1" y1="0" y2="1">
          <stop stopColor={skin.color} />
          <stop offset="1" stopColor="#334155" />
        </linearGradient>
        <filter id={`glow-${craft.id}`}><feGaussianBlur stdDeviation="7" /></filter>
      </defs>
      {cursed && <circle cx="160" cy="125" r="92" fill="none" stroke="#d946ef" strokeDasharray="4 11" opacity=".45" className="probe-cursed" />}
      {launching && <path d="M144 194 L160 250 L176 194 Z" fill="#67e8f9" opacity=".8" filter={`url(#glow-${craft.id})`} />}
      <g transform={scars.has("limps") ? "rotate(2 160 130)" : undefined}>
        <path d="M99 114 L25 88 L25 143 L99 137 Z" fill="#153b5a" stroke="#38bdf8" strokeWidth="3" />
        <path d="M221 114 L295 88 L295 143 L221 137 Z" fill={scars.has("scorched") ? "#291b25" : "#153b5a"} stroke="#38bdf8" strokeWidth="3" transform={scars.has("limps") ? "rotate(7 221 125)" : undefined} />
        {[42, 65, 88, 232, 255, 278].map((x) => <line key={x} x1={x} y1="96" x2={x} y2="138" stroke="#67e8f9" opacity=".35" />)}
        <rect x="99" y="82" width="122" height="112" rx="28" fill={`url(#body-${craft.id})`} stroke="#e2e8f0" strokeWidth="4" />
        <rect x="117" y="103" width="86" height="53" rx="9" fill="#07111f" stroke="#94a3b8" />
        <circle cx="160" cy="129" r="18" fill="#082f49" stroke="#67e8f9" strokeWidth="5" />
        <circle cx="154" cy="123" r="5" fill="#ecfeff" />
        <path d="M160 82 L160 48 L181 28" fill="none" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="185" cy="25" rx="18" ry="8" fill="#64748b" stroke="#e2e8f0" strokeWidth="3" transform={scars.has("afraid_of_dark") ? "rotate(14 185 25)" : undefined} />
        <rect x="123" y="169" width="74" height="18" rx="4" fill="#0f172a" />
        <text x="160" y="182" textAnchor="middle" fill="#f8fafc" fontSize="11" fontFamily="monospace">CF-{craft.id.slice(0, 5).toUpperCase()}</text>
        {veteran && <path d="M112 92 L127 86 L134 97 L119 103 Z" fill="#fbbf24" stroke="#111827" />}
        {scars.has("scorched") && <path d="M205 91 C184 110 215 121 188 143" fill="none" stroke="#171717" strokeWidth="7" opacity=".65" />}
        {scars.has("rattles") && <path d="M106 157 l14 -7 l8 10 l12 -6" fill="none" stroke="#fda4af" strokeWidth="3" />}
        {scars.has("quiet_now") && <path d="M143 146 Q160 137 177 146" fill="none" stroke="#a78bfa" strokeWidth="2" />}
        {scars.has("lucky") && <circle cx="209" cy="164" r="8" fill="#fbbf24" stroke="#fef3c7" strokeWidth="2" />}
      </g>
    </svg>
  );
}
