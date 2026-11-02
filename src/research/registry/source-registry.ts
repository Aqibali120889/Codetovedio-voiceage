/**
 * Configurable Source Registry.
 * Persists to data/research/sources.json with validated default sources.
 */

import fs from "fs";
import path from "path";
import type { SourceConfig } from "../types";
import { SourceConfigSchema } from "../schemas";

const DEFAULT_SOURCES_PATH = path.resolve(process.cwd(), "data/research/sources.json");

export const DEFAULT_VERIFIED_SOURCES: SourceConfig[] = [
  {
    id: "src_deepmind",
    name: "Google DeepMind Research",
    url: "https://deepmind.google/discover/blog/",
    feedUrl: "https://deepmind.google/blog/rss.xml",
    type: "rss",
    categories: ["ai_research", "frontier_models", "algorithms", "robotics"],
    trustLevel: "tier_1_primary",
    enabled: true,
    pollingFrequencyMinutes: 60,
    description: "Official research announcements, breakthroughs, and technical disclosures from DeepMind.",
  },
  {
    id: "src_mit_tech_review",
    name: "MIT Technology Review — AI",
    url: "https://www.technologyreview.com/topic/artificial-intelligence/",
    feedUrl: "https://www.technologyreview.com/topic/artificial-intelligence/feed",
    type: "rss",
    categories: ["ai_policy", "enterprise_ai", "ethics", "editorial"],
    trustLevel: "tier_2_editorial",
    enabled: true,
    pollingFrequencyMinutes: 120,
    description: "Rigorous academic and technology journalism on societal and enterprise impacts of AI.",
  },
  {
    id: "src_ars_technica",
    name: "Ars Technica — AI & Software",
    url: "https://arstechnica.com/ai/",
    feedUrl: "https://feeds.arstechnica.com/arstechnica/features",
    type: "rss",
    categories: ["software_engineering", "ai_tooling", "enterprise", "hardware"],
    trustLevel: "tier_2_editorial",
    enabled: true,
    pollingFrequencyMinutes: 120,
    description: "In-depth engineering reviews, hardware analysis, and technical reporting.",
  },
  {
    id: "src_techcrunch_ai",
    name: "TechCrunch AI",
    url: "https://techcrunch.com/category/artificial-intelligence/",
    feedUrl: "https://techcrunch.com/category/artificial-intelligence/feed/",
    type: "rss",
    categories: ["startups", "venture_capital", "product_launches", "business_adoption"],
    trustLevel: "tier_2_editorial",
    enabled: true,
    pollingFrequencyMinutes: 60,
    description: "Startup funding, product releases, enterprise software adoption, and market movements.",
  },
  {
    id: "src_hackernews",
    name: "Hacker News — Top Discussions",
    url: "https://news.ycombinator.com/",
    feedUrl: "https://news.ycombinator.com/rss",
    type: "rss",
    categories: ["developer_sentiment", "community_problems", "open_source", "pain_points"],
    trustLevel: "tier_3_community",
    enabled: true,
    pollingFrequencyMinutes: 30,
    description: "Real-world developer reactions, production debugging stories, and skepticism on new tools.",
  },
  {
    id: "src_csiro_australia",
    name: "CSIRO Data61 & Australian AI",
    url: "https://data61.csiro.au/",
    feedUrl: "https://data61.csiro.au/en/News/RSS",
    type: "rss",
    categories: ["australia_business", "applied_ai", "local_sme", "robotics"],
    trustLevel: "tier_1_primary",
    enabled: true,
    pollingFrequencyMinutes: 240,
    geographicFocus: "Australia",
    description: "National Australian scientific research organization reports on industry and SME AI adoption.",
  },
];

export class SourceRegistry {
  private sourcesFilePath: string;
  private sources: Map<string, SourceConfig> = new Map();

  constructor(customPath?: string) {
    this.sourcesFilePath = customPath ?? DEFAULT_SOURCES_PATH;
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.sourcesFilePath)) {
        const raw = fs.readFileSync(this.sourcesFilePath, "utf-8");
        const list = JSON.parse(raw) as SourceConfig[];
        this.sources.clear();
        for (const s of list) {
          const parsed = SourceConfigSchema.safeParse(s);
          if (parsed.success) {
            this.sources.set(parsed.data.id, parsed.data);
          }
        }
      } else {
        // Seed defaults
        this.sources.clear();
        for (const s of DEFAULT_VERIFIED_SOURCES) {
          this.sources.set(s.id, s);
        }
        this.save();
      }
    } catch (err) {
      console.warn(`[SourceRegistry] Error loading sources, using defaults: ${(err as Error).message}`);
      for (const s of DEFAULT_VERIFIED_SOURCES) {
        this.sources.set(s.id, s);
      }
    }
  }

  public save(): void {
    try {
      const dir = path.dirname(this.sourcesFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const list = Array.from(this.sources.values());
      fs.writeFileSync(this.sourcesFilePath, JSON.stringify(list, null, 2), "utf-8");
    } catch (err) {
      console.error(`[SourceRegistry] Error saving sources: ${(err as Error).message}`);
    }
  }

  public getAllSources(): SourceConfig[] {
    return Array.from(this.sources.values());
  }

  public getEnabledSources(): SourceConfig[] {
    return Array.from(this.sources.values()).filter((s) => s.enabled);
  }

  public getSource(id: string): SourceConfig | undefined {
    return this.sources.get(id);
  }

  public addSource(config: SourceConfig): { success: boolean; error?: string } {
    const val = SourceConfigSchema.safeParse(config);
    if (!val.success) {
      return { success: false, error: val.error.issues.map((e) => e.message).join("; ") };
    }
    if (this.sources.has(config.id)) {
      return { success: false, error: `Source ID "${config.id}" already exists.` };
    }
    this.sources.set(config.id, val.data);
    this.save();
    return { success: true };
  }

  public updateSource(id: string, updates: Partial<SourceConfig>): boolean {
    const existing = this.sources.get(id);
    if (!existing) return false;
    const merged = { ...existing, ...updates };
    const val = SourceConfigSchema.safeParse(merged);
    if (!val.success) return false;
    this.sources.set(id, val.data);
    this.save();
    return true;
  }

  public toggleSource(id: string, enabled?: boolean): boolean {
    const s = this.sources.get(id);
    if (!s) return false;
    s.enabled = enabled !== undefined ? enabled : !s.enabled;
    this.save();
    return true;
  }

  public recordFetchResult(id: string, success: boolean, error?: string): void {
    const s = this.sources.get(id);
    if (!s) return;
    if (success) {
      s.lastFetchedAt = new Date().toISOString();
      s.lastError = undefined;
    } else {
      s.lastError = error ?? "Fetch failed";
    }
    this.save();
  }
}

let _registryInstance: SourceRegistry | null = null;

export function getSourceRegistry(): SourceRegistry {
  if (!_registryInstance) {
    _registryInstance = new SourceRegistry();
  }
  return _registryInstance;
}
