import { getPersonality, type PersonalityId } from "@/lib/probe-personality";

const OPTIONS: { id: PersonalityId; line: string; reaction: string }[] = [
  { id: "anxious", line: "Could I perhaps stay here?", reaction: "Excellent. You've selected anxiety." },
  { id: "dramatic", line: "Space has waited long enough for me.", reaction: "I knew you would recognise greatness." },
  { id: "chaotic", line: "What's this button do?", reaction: "Perfect. I have already touched three things." },
];

export function PersonalityChoice({ selected, onSelect }: { selected: PersonalityId | null; onSelect: (id: PersonalityId) => void }) {
  return <div className="personality-calibration"><div className="grid gap-3 sm:grid-cols-3">{OPTIONS.map((option) => { const personality = getPersonality(option.id); return <button key={option.id} type="button" onClick={() => onSelect(option.id)} className={selected === option.id ? "selected" : ""}><strong>{personality.label}</strong><span>“{option.line}”</span><small>{personality.vibe}</small></button>; })}</div>{selected && <blockquote>“{OPTIONS.find((option) => option.id === selected)?.reaction}”</blockquote>}</div>;
}
