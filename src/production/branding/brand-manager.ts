/**
 * Brand Profile Manager.
 * Persists and resolves BrandProfile specifications from data/production/branding/.
 */

import fs from "fs";
import path from "path";
import type { BrandProfile } from "../types";

export const DEFAULT_BRAND_PROFILE: BrandProfile = {
  id: "default_voiceage",
  name: "Voiceage Systems Official",
  colors: {
    primary: "#FF5F00",
    secondary: "#0EA5E9",
    accent: "#00C853",
    background: "#0B0B0B",
    text_primary: "#F3F4F6",
    text_secondary: "#9CA3AF",
  },
  typography: {
    font_heading: "Inter",
    font_body: "Inter",
    font_code: "JetBrains Mono",
  },
  theme_preset: "cyberpunk_dark",
  watermark_text: "VOICEAGE SYSTEMS",
  intro_title: "VOICEAGE SYSTEMS",
  outro_cta: "Follow Voiceage Systems for practical AI engineering.",
  safe_area_padding: 48,
  aspect_ratio: "9:16",
};

export class BrandManager {
  private baseDir: string;

  constructor(baseDir = "data/production/branding") {
    this.baseDir = path.resolve(process.cwd(), baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    // Ensure default profile exists on disk
    const defaultPath = path.join(this.baseDir, "default_voiceage.json");
    if (!fs.existsSync(defaultPath)) {
      fs.writeFileSync(defaultPath, JSON.stringify(DEFAULT_BRAND_PROFILE, null, 2), "utf-8");
    }
  }

  public getProfile(id?: string): BrandProfile {
    if (!id || id === "default" || id === "default_voiceage") {
      const defaultPath = path.join(this.baseDir, "default_voiceage.json");
      if (fs.existsSync(defaultPath)) {
        try {
          return JSON.parse(fs.readFileSync(defaultPath, "utf-8")) as BrandProfile;
        } catch {
          return DEFAULT_BRAND_PROFILE;
        }
      }
      return DEFAULT_BRAND_PROFILE;
    }

    const profilePath = path.join(this.baseDir, `${id}.json`);
    if (fs.existsSync(profilePath)) {
      try {
        return JSON.parse(fs.readFileSync(profilePath, "utf-8")) as BrandProfile;
      } catch {
        return DEFAULT_BRAND_PROFILE;
      }
    }

    return DEFAULT_BRAND_PROFILE;
  }

  public saveProfile(profile: BrandProfile): void {
    const profilePath = path.join(this.baseDir, `${profile.id}.json`);
    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2), "utf-8");
  }

  public listProfiles(): BrandProfile[] {
    const files = fs.readdirSync(this.baseDir).filter((f) => f.endsWith(".json"));
    const profiles: BrandProfile[] = [];

    for (const file of files) {
      try {
        const data = fs.readFileSync(path.join(this.baseDir, file), "utf-8");
        profiles.push(JSON.parse(data) as BrandProfile);
      } catch {
        // Skip
      }
    }

    return profiles;
  }
}

let _defaultBrandManager: BrandManager | null = null;

export function getBrandManager(): BrandManager {
  if (!_defaultBrandManager) {
    _defaultBrandManager = new BrandManager();
  }
  return _defaultBrandManager;
}
