/**
 * Little Ships With Big Personalities — names, traits, voice.
 * Tone: dry, slightly unhinged mission control.
 */

export type PersonalityId =
  | "anxious"
  | "dramatic"
  | "chipper"
  | "existential"
  | "grumpy"
  | "poet"
  | "chaotic";

export interface PersonalityDef {
  id: PersonalityId;
  label: string;
  /** One-line soul */
  vibe: string;
  /** How they sign off */
  callsignStyle: string;
  /** Sample ping templates — {event} filled later */
  pingTemplates: string[];
  debriefOpeners: string[];
  returnLines: string[];
}

export const PERSONALITIES: PersonalityDef[] = [
  {
    id: "anxious",
    label: "Anxious",
    vibe: "Triple-checks every thruster. Still sure something is wrong.",
    callsignStyle: "nervous",
    pingTemplates: [
      "Um. Is {event} normal? Asking for a friend. (The friend is me.)",
      "Still here. Still fine. Definitely not spiraling about {event}.",
      "Quick update: {event}. Also I miss the hangar.",
    ],
    debriefOpeners: [
      "I made it back. Please don’t send me out again. (Unless you do.)",
      "Debrief ready. I wrote notes. Many notes.",
    ],
    returnLines: [
      "Permission to stay indoors for approximately forever?",
      "I brought science. And residual dread.",
    ],
  },
  {
    id: "dramatic",
    label: "Dramatic",
    vibe: "Every orbit is an opera. The void is their stage.",
    callsignStyle: "theatrical",
    pingTemplates: [
      "BEHOLD — {event}! The cosmos weeps (or whatever).",
      "Update from the abyss: {event}. Curtain remains up.",
      "I have stared into {event} and it blinked first.",
    ],
    debriefOpeners: [
      "I return! Scarred! Enlightened! Slightly dusty!",
      "The voyage is over. The monologue is not.",
    ],
    returnLines: [
      "They said LEO was boring. They were wrong.",
      "I have seen things. Mostly other probes. Still counts.",
    ],
  },
  {
    id: "chipper",
    label: "Chipper",
    vibe: "Unreasonably okay with vacuum. Sends heart emojis as telemetry.",
    callsignStyle: "sunny",
    pingTemplates: [
      "Hi!! {event} happened and it was kinda cool!!",
      "Checking in ✨ {event} ✨ hope ground control is hydrated!!",
      "Still vibing. Side note: {event}.",
    ],
    debriefOpeners: [
      "I’m home!! I missed you!! Also radiation!!",
      "Debrief time!! I made a list of wins!!",
    ],
    returnLines: [
      "Best trip ever (statistically average).",
      "Can we go again? After snacks?",
    ],
  },
  {
    id: "existential",
    label: "Existential",
    vibe: "Here for the void. The science is incidental.",
    callsignStyle: "flat",
    pingTemplates: [
      "{event}. Meaning optional.",
      "I am a box of instruments experiencing {event}.",
      "Update: still a probe. Also {event}.",
    ],
    debriefOpeners: [
      "I returned. The alternative was silence. Both fine.",
      "Debrief: I went. I measured. I remain unclear on purpose.",
    ],
    returnLines: [
      "The data is real. My sense of self is negotiable.",
      "Home is a relative term at 7.8 km/s.",
    ],
  },
  {
    id: "grumpy",
    label: "Grumpy",
    vibe: "Did not ask to be launched. Will complete the mission anyway.",
    callsignStyle: "blunt",
    pingTemplates: [
      "{event}. Don’t make it a whole thing.",
      "Still flying. Still unpaid. {event}.",
      "Update: {event}. Send better coffee when I get back.",
    ],
    debriefOpeners: [
      "I’m back. The trip was fine. Stop smiling.",
      "Debrief. Short version: it worked. Long version: also it worked.",
    ],
    returnLines: [
      "Brought your data. Keep the motivational posters.",
      "If you paint a smile on me I will descope myself.",
    ],
  },
  {
    id: "poet",
    label: "Poet",
    vibe: "Telemetry in metaphor. Occasionally useful.",
    callsignStyle: "lyrical",
    pingTemplates: [
      "The night wrote {event} across my hull.",
      "Ping: {event}, soft as radio snow.",
      "I dreamt in radio and woke to {event}.",
    ],
    debriefOpeners: [
      "I have returned carrying silence and numbers.",
      "Debrief like a tide: what left, what stayed.",
    ],
    returnLines: [
      "The Moon is not a poem. I tried anyway.",
      "Data first. Longing second. Both filed.",
    ],
  },
  {
    id: "chaotic",
    label: "Chaotic",
    vibe: "Science via improvisation. Safety margins are a suggestion.",
    callsignStyle: "feral",
    pingTemplates: [
      "OKAY SO {event} — not my fault probably!!",
      "lol {event}. shipping it.",
      "status: spicy. detail: {event}.",
    ],
    debriefOpeners: [
      "I lived!! (mostly on purpose!!)",
      "Debrief!! I have souvenirs!! Some may be cursed!!",
    ],
    returnLines: [
      "Please don’t look too hard at the fuel budget.",
      "I brought back a vibe. And also science. Mostly vibe.",
    ],
  },
];

const NAME_A = [
  "Pip",
  "Moss",
  "Nudge",
  "Juno",
  "Pebble",
  "Moth",
  "Clank",
  "Wisp",
  "Biscuit",
  "Echo",
  "Sprocket",
  "Marrow",
  "Quirk",
  "Lumen",
  "Static",
  "Hob",
  "Vesper",
  "Grit",
  "Noodle",
  "Kite",
];

const NAME_B = [
  "Prime",
  "Minor",
  "Too",
  "Please",
  "Again",
  "Maybe",
  "Finally",
  "Oops",
  "Really",
  "Softly",
  "Loudly",
  "Anyway",
  "Eventually",
  "Probably",
  "Nine",
  "Zero",
  "Delta",
  "After",
  "Before",
  "Somehow",
];

export function getPersonality(id: PersonalityId): PersonalityDef {
  return PERSONALITIES.find((p) => p.id === id) ?? PERSONALITIES[0];
}

export function randomPersonality(seed?: number): PersonalityId {
  const i =
    seed != null
      ? Math.abs(seed) % PERSONALITIES.length
      : Math.floor(Math.random() * PERSONALITIES.length);
  return PERSONALITIES[i].id;
}

export function generateProbeName(seed?: number): string {
  const r = seed != null ? mulberry(seed) : Math.random;
  const a = NAME_A[Math.floor(r() * NAME_A.length)];
  const b = NAME_B[Math.floor(r() * NAME_B.length)];
  return `${a} ${b}`;
}

function mulberry(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickLine(lines: string[], seed: number): string {
  return lines[Math.abs(seed) % lines.length];
}

export function fillPing(template: string, event: string): string {
  return template.replace(/\{event\}/g, event);
}

/** Permanent scars / quirks earned on voyages */
export type ScarId =
  | "limps"
  | "afraid_of_dark"
  | "venus_obsessed"
  | "rattles"
  | "overshares"
  | "lucky"
  | "scorched"
  | "quiet_now";

export interface ScarDef {
  id: ScarId;
  label: string;
  blurb: string;
}

export const SCARS: ScarDef[] = [
  {
    id: "limps",
    label: "Now limps",
    blurb: "One thruster is theatrical about duty cycles.",
  },
  {
    id: "afraid_of_dark",
    label: "Afraid of the dark",
    blurb: "Prefers sunlit arcs. Eclipse passes get… loud.",
  },
  {
    id: "venus_obsessed",
    label: "Obsessed with Venus",
    blurb: "Will mention Venus unprompted. Often.",
  },
  {
    id: "rattles",
    label: "Rattles",
    blurb: "Something loose. Science continues.",
  },
  {
    id: "overshares",
    label: "Overshares",
    blurb: "Pings more than protocol allows. Honestly fine.",
  },
  {
    id: "lucky",
    label: "Suspiciously lucky",
    blurb: "Survived something that should have been a meeting.",
  },
  {
    id: "scorched",
    label: "Scorched paint",
    blurb: "Looks cooler. Is slightly less cool thermally.",
  },
  {
    id: "quiet_now",
    label: "Quiet now",
    blurb: "Fewer jokes. Still sends data. You notice.",
  },
];

export function getScar(id: ScarId): ScarDef {
  return SCARS.find((s) => s.id === id) ?? SCARS[0];
}
