export type PartCategory =
  | "bus"
  | "power"
  | "propulsion"
  | "tank"
  | "payload"
  | "comms";

export interface PartDef {
  id: string;
  name: string;
  category: PartCategory;
  description: string;
  /** Dry mass kg */
  massKg: number;
  /** Power generation W (positive) or draw W (negative when active) */
  powerW: number;
  /** Propellant capacity kg (tanks) */
  propellantKg: number;
  /** Isp seconds (engines) */
  ispSec: number;
  /** Thrust N (engines) — flavor only in alpha */
  thrustN: number;
  /** Max one of this category if exclusive */
  exclusiveCategory?: boolean;
  costCredits: number;
  color: string;
}

export const PARTS: PartDef[] = [
  {
    id: "bus_cubesat",
    name: "CubeSat Bus",
    category: "bus",
    description: "3U structure — light and cheap.",
    massKg: 4,
    powerW: 0,
    propellantKg: 0,
    ispSec: 0,
    thrustN: 0,
    exclusiveCategory: true,
    costCredits: 50,
    color: "#64748b",
  },
  {
    id: "bus_probe",
    name: "Probe Bus",
    category: "bus",
    description: "Robust deep-space chassis.",
    massKg: 120,
    powerW: 0,
    propellantKg: 0,
    ispSec: 0,
    thrustN: 0,
    exclusiveCategory: true,
    costCredits: 400,
    color: "#94a3b8",
  },
  {
    id: "bus_hauler",
    name: "Hauler Bus",
    category: "bus",
    description: "Heavy structure for serious delta-v stacks.",
    massKg: 450,
    powerW: 0,
    propellantKg: 0,
    ispSec: 0,
    thrustN: 0,
    exclusiveCategory: true,
    costCredits: 1200,
    color: "#475569",
  },
  {
    id: "solar_small",
    name: "Solar Array S",
    category: "power",
    description: "Compact panels for near-Earth ops.",
    massKg: 2,
    powerW: 40,
    propellantKg: 0,
    ispSec: 0,
    thrustN: 0,
    costCredits: 40,
    color: "#1d4ed8",
  },
  {
    id: "solar_large",
    name: "Solar Array L",
    category: "power",
    description: "Wide wings — power hungry payloads love these.",
    massKg: 18,
    powerW: 220,
    propellantKg: 0,
    ispSec: 0,
    thrustN: 0,
    costCredits: 180,
    color: "#2563eb",
  },
  {
    id: "rtg",
    name: "RTG Pack",
    category: "power",
    description: "Nuclear trickle power for outer missions.",
    massKg: 45,
    powerW: 110,
    propellantKg: 0,
    ispSec: 0,
    thrustN: 0,
    costCredits: 900,
    color: "#eab308",
  },
  {
    id: "chem_small",
    name: "Chem Thruster",
    category: "propulsion",
    description: "Monoprop kick stage. Solid Isp for its mass.",
    massKg: 8,
    powerW: -5,
    propellantKg: 0,
    ispSec: 220,
    thrustN: 50,
    costCredits: 120,
    color: "#f97316",
  },
  {
    id: "chem_main",
    name: "Main Engine",
    category: "propulsion",
    description: "Biprop main — the workhorse for transfers.",
    massKg: 85,
    powerW: -25,
    propellantKg: 0,
    ispSec: 310,
    thrustN: 450,
    costCredits: 650,
    color: "#ea580c",
  },
  {
    id: "ion_drive",
    name: "Ion Drive",
    category: "propulsion",
    description: "Sip fuel forever. Needs serious power.",
    massKg: 30,
    powerW: -180,
    propellantKg: 0,
    ispSec: 3000,
    thrustN: 0.09,
    costCredits: 1100,
    color: "#a855f7",
  },
  {
    id: "tank_s",
    name: "Fuel Tank S",
    category: "tank",
    description: "40 kg propellant capacity.",
    massKg: 6,
    powerW: 0,
    propellantKg: 40,
    ispSec: 0,
    thrustN: 0,
    costCredits: 60,
    color: "#14b8a6",
  },
  {
    id: "tank_m",
    name: "Fuel Tank M",
    category: "tank",
    description: "180 kg propellant capacity.",
    massKg: 22,
    powerW: 0,
    propellantKg: 180,
    ispSec: 0,
    thrustN: 0,
    costCredits: 200,
    color: "#0d9488",
  },
  {
    id: "tank_l",
    name: "Fuel Tank L",
    category: "tank",
    description: "500 kg propellant capacity.",
    massKg: 55,
    powerW: 0,
    propellantKg: 500,
    ispSec: 0,
    thrustN: 0,
    costCredits: 480,
    color: "#0f766e",
  },
  {
    id: "camera",
    name: "Imager Suite",
    category: "payload",
    description: "Wide-angle + narrow-angle cameras.",
    massKg: 5,
    powerW: -12,
    propellantKg: 0,
    ispSec: 0,
    thrustN: 0,
    costCredits: 90,
    color: "#22c55e",
  },
  {
    id: "spectrometer",
    name: "Spectrometer",
    category: "payload",
    description: "Science package for POI scans.",
    massKg: 14,
    powerW: -30,
    propellantKg: 0,
    ispSec: 0,
    thrustN: 0,
    costCredits: 220,
    color: "#16a34a",
  },
  {
    id: "antenna_s",
    name: "Antenna S",
    category: "comms",
    description: "Near-Earth telemetry.",
    massKg: 1.5,
    powerW: -8,
    propellantKg: 0,
    ispSec: 0,
    thrustN: 0,
    costCredits: 35,
    color: "#38bdf8",
  },
  {
    id: "hga",
    name: "High-Gain Dish",
    category: "comms",
    description: "Deep-space DSN-class link.",
    massKg: 12,
    powerW: -40,
    propellantKg: 0,
    ispSec: 0,
    thrustN: 0,
    costCredits: 280,
    color: "#0ea5e9",
  },
];

export interface ShipDesign {
  id: string;
  name: string;
  partIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ShipStats {
  dryMassKg: number;
  propellantKg: number;
  wetMassKg: number;
  powerGenW: number;
  powerDrawW: number;
  powerNetW: number;
  ispSec: number;
  /** Rocket equation delta-v m/s (best engine Isp × tanks) */
  deltaVms: number;
  thrustN: number;
  costCredits: number;
  hasBus: boolean;
  hasPropulsion: boolean;
  hasPower: boolean;
  hasComms: boolean;
  launchReady: boolean;
  issues: string[];
}

const G0 = 9.80665;

export function getPart(id: string): PartDef | undefined {
  return PARTS.find((p) => p.id === id);
}

export function computeStats(partIds: string[]): ShipStats {
  const parts = partIds
    .map(getPart)
    .filter((p): p is PartDef => Boolean(p));

  let dryMassKg = 0;
  let propellantKg = 0;
  let powerGenW = 0;
  let powerDrawW = 0;
  let maxIsp = 0;
  let thrustN = 0;
  let costCredits = 0;
  let hasBus = false;
  let hasPropulsion = false;
  let hasPower = false;
  let hasComms = false;

  for (const p of parts) {
    dryMassKg += p.massKg;
    propellantKg += p.propellantKg;
    costCredits += p.costCredits;
    if (p.powerW > 0) powerGenW += p.powerW;
    if (p.powerW < 0) powerDrawW += -p.powerW;
    if (p.ispSec > maxIsp) maxIsp = p.ispSec;
    thrustN += p.thrustN;
    if (p.category === "bus") hasBus = true;
    if (p.category === "propulsion") hasPropulsion = true;
    if (p.category === "power") hasPower = true;
    if (p.category === "comms") hasComms = true;
  }

  const wetMassKg = dryMassKg + propellantKg;
  const powerNetW = powerGenW - powerDrawW;

  // Rocket equation: dv = Isp * g0 * ln(m0/mf)
  let deltaVms = 0;
  if (maxIsp > 0 && propellantKg > 0 && dryMassKg > 0) {
    deltaVms = maxIsp * G0 * Math.log(wetMassKg / dryMassKg);
  }

  const issues: string[] = [];
  if (!hasBus) issues.push("Add a bus/structure.");
  if (!hasPropulsion) issues.push("Add a thruster or engine.");
  if (!hasPower) issues.push("Add a power source.");
  if (propellantKg <= 0) issues.push("Add at least one fuel tank.");
  if (hasPropulsion && maxIsp >= 1000 && powerNetW < 0) {
    issues.push("Ion drive needs more power generation.");
  }
  if (!hasComms) issues.push("No comms — you’ll fly blind (allowed).");

  const launchReady =
    hasBus &&
    hasPropulsion &&
    hasPower &&
    propellantKg > 0 &&
    !(maxIsp >= 1000 && powerNetW < 0) &&
    deltaVms > 100;

  return {
    dryMassKg,
    propellantKg,
    wetMassKg,
    powerGenW,
    powerDrawW,
    powerNetW,
    ispSec: maxIsp,
    deltaVms,
    thrustN,
    costCredits,
    hasBus,
    hasPropulsion,
    hasPower,
    hasComms,
    launchReady,
    issues,
  };
}

export function defaultStarterParts(): string[] {
  // ~2 km/s class starter — enough for LEO + lunar with room to upgrade
  return [
    "bus_probe",
    "solar_large",
    "chem_main",
    "tank_m",
    "tank_s",
    "camera",
    "antenna_s",
  ];
}

export function canAddPart(current: string[], partId: string): boolean {
  const part = getPart(partId);
  if (!part) return false;
  if (part.exclusiveCategory) {
    const has = current.some((id) => getPart(id)?.category === part.category);
    if (has) return false;
  }
  // Soft cap for alpha
  if (current.length >= 16) return false;
  return true;
}

export function formatDeltaV(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} km/s`;
  return `${ms.toFixed(0)} m/s`;
}

export function formatMass(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${kg.toFixed(1)} kg`;
}
