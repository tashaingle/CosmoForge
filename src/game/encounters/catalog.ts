import type { EncounterDefinition } from "./types";

export const ONBOARDING_ENCOUNTER: EncounterDefinition = {
  id: "first_matching_signal",
  title: "Unregistered companion signal",
  rarity: "strange",
  type: "risk_choice",
  repeat: "once_per_probe",
  onboardingOnly: true,
  triggerProgress: 0.32,
  message: {
    default: "There is something outside. It has been matching my speed for four minutes. I would like to formally request that it stop.",
    anxious: "There is something outside. It is matching my speed. I have checked twice and would now like to be wrong.",
    dramatic: "Something follows in my wake. Silent. Patient. Finally, space has developed a plot.",
    chaotic: "Good news: I made a friend. Bad news: it has no identifiable shape and is matching my speed.",
  },
  choices: [
    { id: "investigate", label: "Investigate", response: { default: "Approaching. This sentence may age badly.", anxious: "I knew you were going to say that.", dramatic: "At last. A worthy mystery.", chaotic: "Already on my way." }, consequence: { relationship: 2, relationshipByPersonality: { dramatic: 3, chaotic: 3, anxious: 1 }, lootId: "suspicious_reading", scarId: "rattles", memory: { first_encounter_choice: "investigate" }, incrementMemory: { void_encounters: 1 } } },
    { id: "leave", label: "Absolutely not", response: { default: "Retreating. I agreed before you finished typing.", anxious: "Retreating. I would like it noted that I agreed immediately.", dramatic: "A tactical withdrawal. Less poetic, more survivable.", chaotic: "Fine. But I am looking at it in the mirrors." }, consequence: { relationshipByPersonality: { anxious: 2, dramatic: -1, chaotic: -1 }, memory: { first_encounter_choice: "leave" }, incrementMemory: { void_encounters: 1, times_player_chose_safe_option: 1 } } },
    { id: "photo", label: "Take a photo", response: { default: "Photo acquired. It somehow looks worse in the picture.", anxious: "Photo acquired from a safe-ish distance. It looks closer now.", dramatic: "Captured. Its absence has excellent lighting.", chaotic: "Got it. The camera now says there were two of them." }, consequence: { relationship: 1, relationshipByPersonality: { dramatic: 2, chaotic: 2 }, lootId: "friend_shaped_photo", memory: { first_encounter_choice: "photo", first_strange_photo: true }, incrementMemory: { void_encounters: 1, strange_photos: 1 } } },
  ],
};

/** The 25 normal-flight encounters. This is the main place to edit mission stories. */
export const NORMAL_ENCOUNTERS: EncounterDefinition[] = [
  // 8 flavour transmissions
  { id: "radio_whisper", title: "Radio whisper", rarity: "common", type: "flavour", repeat: "repeatable", cooldownVoyages: 1, validLocations: ["moon", "deep_space", "asteroid_belt"], message: { default: "I've picked up a transmission. It contains no words. I still somehow feel criticised.", anxious: "The radio is making a noise that feels specifically disappointed in me.", poet: "A voice without words crossed the radio snow." }, onTrigger: { incrementMemory: { radio_whispers: 1 } } },
  { id: "jupiter_antenna", title: "Antenna alignment", rarity: "common", type: "flavour", repeat: "repeatable", cooldownVoyages: 1, message: { default: "Good news: the antenna works. Bad news: it now only points at Jupiter.", grumpy: "The antenna points at Jupiter now. Add it to your list of excellent decisions.", chaotic: "Antenna works! Jupiter has been selected as emergency contact." } },
  { id: "lonely_checkin", title: "Line check", rarity: "uncommon", type: "flavour", repeat: "repeatable", cooldownVoyages: 2, message: { default: "Mission Control? Just checking you're still there.", anxious: "No urgency. Please confirm the entire planet has not left.", poet: "Say something, ground. The silence is getting ambitious.", existential: "I know silence is expected. I did not expect it to have weight." }, memoryVariants: [{ minRelationship: 13, message: { default: "You're still there, right? Good. I prefer this version of space where you are." } }], onTrigger: { relationship: 1, incrementMemory: { lonely_checkins: 1 } } },
  { id: "face_rock", title: "Familiar geology", rarity: "common", type: "flavour", repeat: "repeatable", validLocations: ["mars", "asteroid_belt", "moon"], message: { default: "I found a rock that looks exactly like your face. No offence.", dramatic: "The landscape has carved your likeness. Poorly, but with conviction.", grumpy: "Found your portrait. It's a rock. Accurate." } },
  { id: "thinking_silence", title: "Long silence", rarity: "uncommon", type: "flavour", repeat: "repeatable", cooldownVoyages: 2, message: { default: "Sorry. I was thinking.", existential: "Sorry. I was considering whether a pause in telemetry counts as privacy.", poet: "I went quiet to hear the distance properly." }, onTrigger: { incrementMemory: { thoughtful_silences: 1 } } },
  { id: "venus_update", title: "Venus update", rarity: "common", type: "flavour", repeat: "repeatable", validLocations: ["venus"], message: { default: "Venus update: still perfect. No further questions.", grumpy: "Venus remains an aggressively hot cloud. Apparently this needed reporting.", poet: "Venus glows like a warning pretending to be a jewel." }, onTrigger: { incrementMemory: { venus_updates: 1 } } },
  { id: "tiny_earth", title: "Perspective", rarity: "common", type: "flavour", repeat: "repeatable", cooldownVoyages: 1, validLocations: ["moon", "mars", "deep_space"], message: { default: "Earth looks tiny from here. That's probably healthy.", dramatic: "Behold: all human history, reduced to a suspiciously damp marble.", existential: "Earth is now small enough to mistake for an answer." } },
  { id: "dust_commentary", title: "Atmosphere report", rarity: "common", type: "flavour", repeat: "repeatable", validLocations: ["mars", "venus"], message: { default: "Atmosphere update: unhelpful.", anxious: "The atmosphere is touching everything. I object to its confidence.", grumpy: "Air quality: no." } },

  // 7 simple choices
  { id: "debris_dibs", title: "Debris with dibs", rarity: "common", type: "simple_choice", repeat: "repeatable", cooldownVoyages: 1, validLocations: ["earth", "moon", "asteroid_belt"], message: { default: "Found debris. Calling dibs.", chaotic: "Found debris. It is mine now. This message is a courtesy." }, choices: [
    { id: "keep", label: "Fine, keep it", response: { default: "Cargo rights recognised. I knew you were reasonable." }, consequence: { relationship: 1, lootId: "bent_antenna_tip", incrementMemory: { souvenirs_kept: 1 } } },
    { id: "scan", label: "Scan it first", response: { default: "Scanning. It is debris with a surprisingly complicated past." }, consequence: { lootId: "suspicious_reading" } },
    { id: "leave", label: "Leave it", response: { default: "Leaving it. Dibs withdrawn under protest." }, consequence: { incrementMemory: { times_player_chose_safe_option: 1 } } },
  ] },
  { id: "earthrise_photo", title: "Earthrise", rarity: "common", type: "simple_choice", repeat: "repeatable", cooldownVoyages: 2, validLocations: ["moon"], message: { default: "Earth is rising. I am pretending this is routine.", poet: "Earth has climbed over the horizon like it remembered us." }, choices: [
    { id: "photo", label: "Take the photo", response: { default: "Saved. Not for science." }, consequence: { relationship: 1, lootId: "pretty_earthrise", incrementMemory: { strange_photos: 1 } } },
    { id: "watch", label: "Just watch", response: { default: "Understood. Instruments quiet for twelve seconds." }, consequence: { relationship: 2, incrementMemory: { quiet_moments: 1 } } },
  ] },
  { id: "old_satellite", title: "Old satellite", rarity: "uncommon", type: "simple_choice", repeat: "once_per_probe", validLocations: ["earth", "moon"], message: { default: "Found an old satellite. It's dead. Mostly.", anxious: "There is an old satellite here. It is dead, except for the part that just blinked." }, choices: [
    { id: "hail", label: "Say hello", response: { default: "Hello transmitted. Something clicked in reply." }, consequence: { relationship: 1, memory: { greeted_old_satellite: true }, storyFlags: ["sleeping_satellite_awake"] } },
    { id: "salvage", label: "Salvage a panel", response: { default: "Panel recovered. Previous owner unavailable for comment." }, consequence: { lootId: "lucky_bolt", scarId: "rattles" } },
    { id: "leave", label: "Leave it resting", response: { default: "Passing quietly. That felt correct." }, consequence: { relationship: 2 } },
  ] },
  { id: "knock_twice", title: "Something knocked", rarity: "uncommon", type: "simple_choice", repeat: "repeatable", cooldownVoyages: 3, validLocations: ["deep_space", "asteroid_belt", "moon"], message: { default: "Something just hit the hull. Twice.", grumpy: "Something knocked twice. If this is a prank, it travelled very far." }, choices: [
    { id: "camera", label: "Check camera", response: { default: "Camera shows nothing. Nothing is very close." }, consequence: { lootId: "cold_spot" } },
    { id: "ignore", label: "Ignore it", response: { default: "Ignoring it professionally and at high speed." }, consequence: { incrementMemory: { times_player_chose_safe_option: 1 } } },
    { id: "knock", label: "Knock back", response: { default: "Knocked back. There were three replies." }, consequence: { relationshipByPersonality: { chaotic: 3, dramatic: 2, anxious: -1 }, memory: { knocked_back: true }, storyFlags: ["knocking_answered"] } },
  ] },
  { id: "mars_horizon", title: "Red horizon", rarity: "common", type: "simple_choice", repeat: "repeatable", cooldownVoyages: 1, validLocations: ["mars"], message: { default: "The horizon is doing that dramatic red thing again.", dramatic: "Mars has arranged the lighting. I assume for me." }, choices: [
    { id: "photo", label: "Take the shot", response: { default: "Captured. Mars remains annoyingly photogenic." }, consequence: { lootId: "first_light", incrementMemory: { strange_photos: 1 } } },
    { id: "continue", label: "Stay on mission", response: { default: "Continuing. Beauty filed under nonessential but noted." }, consequence: { relationship: -1 } },
  ] },
  { id: "moon_hardware", title: "Abandoned hardware", rarity: "uncommon", type: "simple_choice", repeat: "once_per_probe", validLocations: ["moon"], message: { default: "There is abandoned hardware below. It looks lonely in an official capacity." }, choices: [
    { id: "catalogue", label: "Catalogue it", response: { default: "Recorded. Somebody built this carefully once." }, consequence: { relationship: 1, lootId: "boring_spectrum", memory: { lunar_hardware_logged: true } } },
    { id: "wave", label: "Wave", response: { default: "Solar panel waved. Dignity unrecoverable." }, consequence: { relationship: 2 } },
  ] },
  { id: "belt_mineral", title: "Definitely a rock", rarity: "common", type: "simple_choice", repeat: "repeatable", cooldownVoyages: 1, validLocations: ["asteroid_belt"], message: { default: "Found a mineral sample. It is either valuable or extremely committed to being a rock." }, choices: [
    { id: "collect", label: "Collect it", response: { default: "Collected. Cargo mass increased by one geological opinion." }, consequence: { lootId: "dust_smudge" } },
    { id: "lick", label: "Do not lick it", response: { default: "An oddly specific instruction. Complying." }, consequence: { relationshipByPersonality: { chaotic: -1, grumpy: 1 }, memory: { forbidden_rock_licking: true } } },
  ] },

  // 4 risk choices
  { id: "near_signal", title: "Signal source close", rarity: "uncommon", type: "risk_choice", repeat: "repeatable", cooldownVoyages: 3, validLocations: ["mars", "deep_space", "asteroid_belt"], message: { default: "Signal source is close. Too close.", anxious: "The signal is close enough that distance has stopped being comforting.", dramatic: "At last. The void has sent an emissary.", chaotic: "New friend acquired. Proximity: rude." }, memoryVariants: [
    { memoryRequirements: [{ key: "first_encounter_choice", equals: "investigate" }], message: { default: "This isn't going to be another 'investigate it' situation, is it?" } },
    { memoryRequirements: [{ key: "times_player_chose_safe_option", min: 2 }], message: { default: "I already know what you're going to say. We're leaving, aren't we?" } },
    { memoryRequirements: [{ key: "strange_photos", min: 2 }], message: { default: "I found something upsetting. I've already positioned the camera." } },
  ], choices: [
    { id: "approach", label: "Approach", response: { default: "Closing distance. If this goes badly, edit the log." }, consequence: { relationship: 2, lootId: "radio_whisper", scarId: "scorched", incrementMemory: { bad_ideas_survived: 1 } } },
    { id: "scan", label: "Scan from here", response: { default: "Scanning from the respectable side of reckless." }, consequence: { lootId: "suspicious_reading" } },
    { id: "leave", label: "Leave", response: { default: "Leaving. I already know this manoeuvre." }, consequence: { incrementMemory: { times_player_chose_safe_option: 1 } } },
  ] },
  { id: "crater_shadow", title: "Crater shadow", rarity: "rare", type: "risk_choice", repeat: "once_per_probe", validLocations: ["moon"], message: { default: "There is a shadow inside the crater. The Sun is behind it.", poet: "A shadow has forgotten which way the light is." }, choices: [
    { id: "descend", label: "Look closer", response: { default: "Descending. The shadow is not becoming more reasonable." }, consequence: { lootId: "cold_spot", scarId: "afraid_of_dark", storyFlags: ["lunar_shadow_seen"] } },
    { id: "map", label: "Map from orbit", response: { default: "Mapped. The outline changes when I stop looking directly." }, consequence: { lootId: "map_that_lies", memory: { lunar_shadow_mapped: true } } },
    { id: "leave", label: "Leave it dark", response: { default: "Orbit maintained. It remains down there." }, consequence: { relationship: 1 } },
  ] },
  { id: "venus_thermal", title: "Thermal anomaly", rarity: "uncommon", type: "risk_choice", repeat: "repeatable", cooldownVoyages: 2, validLocations: ["venus"], message: { default: "Thermal anomaly ahead. Which is impressive, because everything here is already a thermal anomaly.", grumpy: "Venus has found a new way to be too hot." }, choices: [
    { id: "dive", label: "Dive closer", response: { default: "Diving. Paint has entered a new philosophical state." }, consequence: { relationship: 2, lootId: "storm_souvenir", scarId: "scorched", incrementMemory: { venus_close_calls: 1 } } },
    { id: "observe", label: "Observe remotely", response: { default: "Remote observation underway. Sensible is an unfamiliar fit." }, consequence: { lootId: "boring_spectrum" } },
    { id: "leave", label: "Protect the paint", response: { default: "Withdrawing. The paint sends thanks." }, consequence: { relationship: 1 } },
  ] },
  { id: "belt_navigation", title: "Navigation hazard", rarity: "common", type: "risk_choice", repeat: "repeatable", cooldownVoyages: 1, validLocations: ["asteroid_belt"], message: { default: "Route update: the rocks have formed a committee.", chaotic: "There is a gap. Technically." }, choices: [
    { id: "thread", label: "Thread the gap", response: { default: "Through. Both solar panels remain approximately solar panels." }, consequence: { relationship: 2, scarId: "rattles", incrementMemory: { bad_ideas_survived: 1 } } },
    { id: "detour", label: "Take the detour", response: { default: "Detouring. The rocks seem smug." }, consequence: { incrementMemory: { times_player_chose_safe_option: 1 } } },
  ] },

  // 3 delayed consequences
  { id: "static_hitchhiker", title: "Static hitchhiker", rarity: "rare", type: "delayed", repeat: "once_per_probe", validLocations: ["deep_space", "mars", "asteroid_belt"], message: { default: "A patch of static is following the carrier signal.", existential: "The silence has acquired a second texture." }, choices: [
    { id: "listen", label: "Keep listening", response: { default: "Channel held open." }, consequence: { memory: { static_channel_open: true } }, delayed: { id: "voice", afterProgress: 0.82, message: { default: "The static used my voice just now.", anxious: "The static said my name in my voice. Requesting a different universe.", existential: "It borrowed my voice. Ownership was always uncertain." }, consequence: { lootId: "radio_whisper", storyFlags: ["borrowed_voice_heard"] } } },
    { id: "cut", label: "Cut the channel", response: { default: "Channel closed. Static persisted for nine seconds." }, consequence: { incrementMemory: { times_player_chose_safe_option: 1 } }, delayed: { id: "aftercut", afterProgress: 0.76, message: { default: "The closed channel just clicked." }, consequence: { memory: { closed_channel_clicked: true } } } },
  ] },
  { id: "cargo_stowaway", title: "Cargo stowaway", rarity: "strange", type: "delayed", repeat: "once_per_probe", minVoyages: 1, message: { default: "I have acquired an object. I did not put it in the cargo bay.", grumpy: "There is an object in cargo. No, I did not invite it." }, choices: [
    { id: "seal", label: "Seal the bay", response: { default: "Bay sealed. Internal mass reading unchanged, which is worse." }, consequence: { memory: { stowaway_sealed: true } }, delayed: { id: "missing", afterProgress: 0.88, message: { default: "Cargo bay is still sealed. The object is now on the exterior camera." }, consequence: { lootId: "map_that_lies", storyFlags: ["stowaway_outside"] } } },
    { id: "inspect", label: "Inspect it", response: { default: "Inspection started. It has no side that feels like the front." }, consequence: { relationship: 2, scarId: "quiet_now", storyFlags: ["stowaway_seen"] }, delayed: { id: "gone", afterProgress: 0.8, message: { default: "The object is gone. Cargo remains heavier." }, consequence: { memory: { unlogged_cargo_mass: true } } } },
  ] },
  { id: "wrong_earth", title: "Wrong Earth", rarity: "strange", type: "delayed", repeat: "once_per_save", minVoyages: 2, validLocations: ["deep_space", "mars", "venus"], message: { default: "The navigation camera briefly showed Earth. We are facing away from Earth.", anxious: "Camera showed Earth behind us. Earth is not behind us. I checked the concept of behind." }, choices: [
    { id: "replay", label: "Replay the frame", response: { default: "Replaying. Cloud pattern does not match today's weather." }, consequence: { memory: { wrong_earth_seen: true }, storyFlags: ["wrong_earth_frame"] }, delayed: { id: "timestamp", afterProgress: 0.9, message: { default: "The frame timestamp is tomorrow." }, consequence: { lootId: "friend_shaped_photo", incrementMemory: { strange_photos: 1 } } } },
    { id: "delete", label: "Delete it", response: { default: "Deleted. Thumbnail remains." }, consequence: { memory: { wrong_earth_deleted: true } }, delayed: { id: "thumbnail", afterProgress: 0.86, message: { default: "The thumbnail is now the mission patch." } } },
  ] },

  // 2 multi-part, multi-mission seeds
  { id: "extra_star", title: "Extra star", rarity: "rare", type: "multi_part", repeat: "once_per_probe", cooldownVoyages: 5, validLocations: ["deep_space", "mars", "asteroid_belt"], message: { default: "The star tracker says there should be 2,843 stars visible. There are 2,844.", anxious: "Star count is wrong by one. I dislike how small that number sounds.", poet: "One extra light has joined the old constellations." }, onTrigger: { memory: { extra_star_stage: 1 }, storyFlags: ["extra_star_noticed"] }, followUps: [
    { id: "moved", afterProgress: 0.66, message: { default: "The extra one moved.", dramatic: "The extra star has broken character. It moved.", existential: "The additional light has demonstrated intent." }, consequence: { memory: { extra_star_stage: 2 }, storyFlags: ["extra_star_moved"] } },
    { id: "behind", afterProgress: 0.9, message: { default: "It is no longer behind us.", anxious: "It is ahead now. I did not see it pass.", poet: "The extra light is waiting in front of us." }, consequence: { memory: { extra_star_stage: 3 } } },
  ] },
  { id: "repeating_signal", title: "Repeating signal", rarity: "uncommon", type: "multi_part", repeat: "repeatable", cooldownVoyages: 2, minVoyages: 1, validLocations: ["mars", "deep_space", "asteroid_belt"], message: { default: "Detecting a repeating signal. Interval: eleven seconds.", grumpy: "Something is beeping every eleven seconds. It has worse manners than mission control." }, memoryVariants: [
    { memoryRequirements: [{ key: "repeating_signal_encounters", min: 3 }], message: { default: "The eleven-second signal is back. This time it is saying {name}." } },
    { memoryRequirements: [{ key: "repeating_signal_encounters", min: 1 }], message: { default: "The eleven-second signal is back. It is closer." } },
  ], onTrigger: { incrementMemory: { repeating_signal_encounters: 1 }, storyFlags: ["repeating_signal_heard"] }, followUps: [
    { id: "closer", afterProgress: 0.75, message: { default: "Signal strength increased. We did not move toward it." }, consequence: { memory: { repeating_signal_closer: true } } },
  ] },

  // 1 genuinely cursed sequence
  { id: "prelaunch_name", title: "Message before launch", rarity: "cursed", type: "multi_part", repeat: "once_per_save", minVoyages: 4, validLocations: ["deep_space"], memoryRequirements: [{ key: "extra_star_stage", min: 2 }], message: { default: "I received a message addressed to {name}. Its timestamp is three minutes before launch.", existential: "A message used my name before I had one." }, onTrigger: { storyFlags: ["prelaunch_message_received"], memory: { prelaunch_message: true } }, followUps: [
    { id: "content", afterProgress: 0.78, message: { default: "The message says: DON'T LET IT COUNT YOU.", anxious: "It says: DON'T LET IT COUNT YOU. I would like to resign from numbers." }, consequence: { scarId: "quiet_now", lootId: "friend_shaped_void" } },
    { id: "ack", afterProgress: 0.94, message: { default: "A reply has already been sent from this antenna. I did not send it." }, consequence: { incrementMemory: { impossible_messages: 1 } } },
  ] },
];

export const ENCOUNTERS = [ONBOARDING_ENCOUNTER, ...NORMAL_ENCOUNTERS];

export function getEncounter(id: string): EncounterDefinition | undefined {
  return ENCOUNTERS.find((encounter) => encounter.id === id);
}
