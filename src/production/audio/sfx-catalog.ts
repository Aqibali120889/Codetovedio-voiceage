/**
 * Sound Effects Asset Catalog & Metadata.
 * Defines curated sound design categories, durations, and procedural CC0 licensing.
 */

export interface SoundEffectMetadata {
  id: string;
  category: string;
  name: string;
  filename: string;
  duration_seconds: number;
  sample_rate: number;
  channels: number;
  license: "CC0-Procedural" | "Public-Domain";
  author: "Voiceage Sound Design Engine";
  description: string;
  recommended_volume: number; // 0.0 - 1.0
  intended_use: string;
}

export const SOUND_EFFECTS_CATALOG: SoundEffectMetadata[] = [
  {
    id: "whoosh_soft",
    category: "transition",
    name: "Soft Cinematic Whoosh",
    filename: "whoosh_soft.wav",
    duration_seconds: 0.45,
    sample_rate: 48000,
    channels: 2,
    license: "CC0-Procedural",
    author: "Voiceage Sound Design Engine",
    description: "Gentle low-frequency air sweep for scene transitions and camera pans.",
    recommended_volume: 0.22,
    intended_use: "Scene cuts and rapid visual reframing.",
  },
  {
    id: "sweep_transition",
    category: "transition",
    name: "Directional Wipe Sweep",
    filename: "sweep_transition.wav",
    duration_seconds: 0.35,
    sample_rate: 48000,
    channels: 2,
    license: "CC0-Procedural",
    author: "Voiceage Sound Design Engine",
    description: "Rising resonant frequency sweep for split callouts and wipes.",
    recommended_volume: 0.20,
    intended_use: "Directional wipes and comparison panel reveals.",
  },
  {
    id: "impact_subtle",
    category: "impact",
    name: "Subtle Evidence Thud",
    filename: "impact_subtle.wav",
    duration_seconds: 0.50,
    sample_rate: 48000,
    channels: 2,
    license: "CC0-Procedural",
    author: "Voiceage Sound Design Engine",
    description: "Low-end sub-bass transient (65Hz decay) for verified evidence cards.",
    recommended_volume: 0.26,
    intended_use: "Document reveals and primary citation card entries.",
  },
  {
    id: "hit_cinematic",
    category: "impact",
    name: "Cinematic Hook Hit",
    filename: "hit_cinematic.wav",
    duration_seconds: 0.75,
    sample_rate: 48000,
    channels: 2,
    license: "CC0-Procedural",
    author: "Voiceage Sound Design Engine",
    description: "Deep cinematic down-hit with subtle harmonic bloom for hook reveals.",
    recommended_volume: 0.28,
    intended_use: "Opening headline impact and major climax discoveries.",
  },
  {
    id: "ui_click",
    category: "interface",
    name: "Tactile Terminal Click",
    filename: "ui_click.wav",
    duration_seconds: 0.12,
    sample_rate: 48000,
    channels: 2,
    license: "CC0-Procedural",
    author: "Voiceage Sound Design Engine",
    description: "Micro-damped transient click simulating tactical keypress or terminal event.",
    recommended_volume: 0.16,
    intended_use: "Code lines, terminal prompt updates, and tab switches.",
  },
  {
    id: "digital_confirm",
    category: "interface",
    name: "Verified Dual-Tone Chime",
    filename: "digital_confirm.wav",
    duration_seconds: 0.40,
    sample_rate: 48000,
    channels: 2,
    license: "CC0-Procedural",
    author: "Voiceage Sound Design Engine",
    description: "Pristine harmonic dual chime (880Hz + 1760Hz) for verified claims.",
    recommended_volume: 0.22,
    intended_use: "Stat counter completion and verified claim badges.",
  },
  {
    id: "riser_short",
    category: "tension",
    name: "Short Cyber Riser",
    filename: "riser_short.wav",
    duration_seconds: 0.85,
    sample_rate: 48000,
    channels: 2,
    license: "CC0-Procedural",
    author: "Voiceage Sound Design Engine",
    description: "Linear pitch acceleration curve for problem-to-breakthrough pivot.",
    recommended_volume: 0.18,
    intended_use: "Building anticipation before architecture and solution reveals.",
  },
  {
    id: "tech_ambient",
    category: "atmosphere",
    name: "Subtle Tech Shimmer",
    filename: "tech_ambient.wav",
    duration_seconds: 1.20,
    sample_rate: 48000,
    channels: 2,
    license: "CC0-Procedural",
    author: "Voiceage Sound Design Engine",
    description: "High-frequency crystalline grain texture for live telemetry backdrops.",
    recommended_volume: 0.14,
    intended_use: "System architecture and live telemetry streams.",
  },
  {
    id: "reverse_swell",
    category: "transition",
    name: "Reverse Reverb Swell",
    filename: "reverse_swell.wav",
    duration_seconds: 0.60,
    sample_rate: 48000,
    channels: 2,
    license: "CC0-Procedural",
    author: "Voiceage Sound Design Engine",
    description: "Exponential crescendo leading tightly into the hook headline or finale.",
    recommended_volume: 0.20,
    intended_use: "Leading directly into scene 1 hook or closing takeaway.",
  },
  {
    id: "accent_clean",
    category: "accent",
    name: "Clean Precision Pop",
    filename: "accent_clean.wav",
    duration_seconds: 0.18,
    sample_rate: 48000,
    channels: 2,
    license: "CC0-Procedural",
    author: "Voiceage Sound Design Engine",
    description: "Clean high-mid pop for badge and pill pops, diagram connectors.",
    recommended_volume: 0.18,
    intended_use: "Node connection lines and metadata badge entries.",
  },
];

export function getSoundEffectMetadata(id: string): SoundEffectMetadata | undefined {
  return SOUND_EFFECTS_CATALOG.find((s) => s.id === id);
}
