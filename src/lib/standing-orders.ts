export type StandingTone = "choice" | "return" | "wait" | "home" | "launch";

export type StandingOrder = {
  kicker: string;
  title: string;
  blurb: string;
  tone: StandingTone;
};

export function standingOrder(input: {
  craftName?: string;
  status?: "design" | "inflight" | "complete" | "lost" | "retired";
  pendingChoice?: boolean;
  readyToReturn?: boolean;
}): StandingOrder {
  const name = input.craftName ?? "the probe";
  if (input.pendingChoice) {
    return {
      kicker: "Live question",
      title: `Answer ${name}`,
      blurb: "The intercept channel on the right is waiting. That is the job: the probe asks, you decide.",
      tone: "choice",
    };
  }
  if (input.readyToReturn) {
    return {
      kicker: "Return window",
      title: `Bring ${name} home`,
      blurb: "Call them back. Debrief is where you see what they found and what they became.",
      tone: "return",
    };
  }
  if (input.status === "inflight") {
    return {
      kicker: "On station",
      title: `Watch ${name}`,
      blurb: "You are Mission Control. Stay on this screen. Transmissions appear on the right. Answer them, then bring the probe home.",
      tone: "wait",
    };
  }
  if (input.status === "complete") {
    return {
      kicker: "Berth occupied",
      title: `${name} is home`,
      blurb: "Open Archive to inspect what they brought, or send them — or someone weirder — out again.",
      tone: "home",
    };
  }
  return {
    kicker: "Standing orders",
    title: "Send a probe",
    blurb: "You are Mission Control. Launch a little ship, answer it while it is away, bring it home, catalogue the strange things.",
    tone: "launch",
  };
}
