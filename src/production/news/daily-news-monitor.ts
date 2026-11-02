/**
 * Daily Technology News Monitor & Freshness Inspector.
 * Ingests 24-hour rolling technology & AI developments across Google News RSS
 * and curated industry feeds. Provides pre-production freshness validation.
 */

import fs from "fs";
import path from "path";
import { parseFeedXml } from "../../research/ingestion/rss-parser";
import { normalizeUrl, isSafeUrl } from "../../research/ingestion/url-normalizer";
import type { ResearchBrief } from "../../research/types";

export interface DailyNewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  published_at: string;
  summary: string;
  category: string;
  age_hours: number;
}

export interface FreshnessCheckResult {
  isFresh: boolean;
  hoursOld: number;
  newDevelopmentsCount: number;
  recentHeadlines: string[];
}

export const TECH_NEWS_FEEDS = [
  {
    name: "Google News — AI Agents & Autonomous Systems",
    url: "https://news.google.com/rss/search?q=AI+Agents+OR+autonomous+AI+when:24h&hl=en-US&gl=US&ceid=US:en",
    category: "AI Agents",
  },
  {
    name: "Google News — LLMs & Generative AI",
    url: "https://news.google.com/rss/search?q=LLM+OR+Generative+AI+when:24h&hl=en-US&gl=US&ceid=US:en",
    category: "LLMs",
  },
  {
    name: "TechCrunch AI",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    category: "Industry News",
  },
  {
    name: "The Verge AI",
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    category: "Industry News",
  },
  {
    name: "Ars Technica AI",
    url: "https://arstechnica.com/tag/ai/feed/",
    category: "Enterprise AI",
  },
  {
    name: "VentureBeat AI",
    url: "https://venturebeat.com/category/ai/feed/",
    category: "Enterprise AI",
  },
];

export class DailyNewsMonitor {
  private cachePath: string;

  constructor(cachePath = "data/research/topics/daily_tech_news.json") {
    this.cachePath = path.resolve(process.cwd(), cachePath);
    const dir = path.dirname(this.cachePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Fetch a single feed with retry and browser-grade headers.
   */
  private async fetchFeedWithRetry(
    feed: (typeof TECH_NEWS_FEEDS)[number],
    maxRetries = 1,
    timeoutMs = 12000
  ): Promise<string | null> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(feed.url, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (VoiceageBot/2.0)",
            Accept:
              "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });
        clearTimeout(timeout);

        if (!response.ok) {
          if (attempt === maxRetries) {
            console.warn(`[DailyNewsMonitor] Skipping feed ${feed.name}: HTTP ${response.status} ${response.statusText}`);
            return null;
          }
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }

        return await response.text();
      } catch (err) {
        if (attempt === maxRetries) {
          console.warn(`[DailyNewsMonitor] Skipping feed ${feed.name}: ${(err as Error).message}`);
          return null;
        }
        await new Promise((r) => setTimeout(r, 600));
      }
    }
    return null;
  }

  /**
   * Discovers and aggregates news items published within the last 24 hours.
   * Runs feed requests concurrently with timeout tolerance, retries, and cache preservation.
   */
  public async discoverDailyNews(maxAgeHours = 24): Promise<DailyNewsItem[]> {
    const items: DailyNewsItem[] = [];
    const seenUrls = new Set<string>();
    const now = Date.now();
    const cutoffTime = now - maxAgeHours * 60 * 60 * 1000;

    // Load existing cached items to merge and avoid losing history
    const existingCache = this.getCachedDailyNews();
    for (const item of existingCache) {
      if (item.url) seenUrls.add(item.url);
    }

    // Fetch all feeds concurrently
    const feedPromises = TECH_NEWS_FEEDS.map(async (feed) => {
      if (!isSafeUrl(feed.url).safe) return [];

      const xmlText = await this.fetchFeedWithRetry(feed, 1, 12000);
      if (!xmlText) return [];

      try {
        const parsed = parseFeedXml(xmlText);
        const feedItems: DailyNewsItem[] = [];

        for (const entry of parsed.items) {
          const normUrl = normalizeUrl(entry.link);
          if (!normUrl || seenUrls.has(normUrl)) continue;
          seenUrls.add(normUrl);

          const pubTimestamp = entry.publishedAt ? new Date(entry.publishedAt).getTime() : now;
          if (pubTimestamp < cutoffTime && !feed.url.includes("news.google.com")) {
            continue;
          }

          const ageHours = Math.max(0, Math.round((now - pubTimestamp) / (1000 * 60 * 60)));

          feedItems.push({
            id: `news_${Buffer.from(normUrl).toString("base64").slice(0, 12)}`,
            title: entry.title.replace(/\s+-\s+.*$/, "").trim(),
            url: normUrl,
            source: feed.name,
            published_at: entry.publishedAt || new Date().toISOString(),
            summary: entry.description || entry.title,
            category: feed.category,
            age_hours: ageHours,
          });
        }
        return feedItems;
      } catch (parseErr) {
        console.warn(`[DailyNewsMonitor] XML parse error for ${feed.name}: ${(parseErr as Error).message}`);
        return [];
      }
    });

    const feedResults = await Promise.allSettled(feedPromises);
    for (const res of feedResults) {
      if (res.status === "fulfilled" && Array.isArray(res.value)) {
        items.push(...res.value);
      }
    }

    // Merge with existing cached items
    const mergedMap = new Map<string, DailyNewsItem>();
    for (const item of items) {
      mergedMap.set(item.url || item.id, item);
    }
    for (const item of existingCache) {
      if (!mergedMap.has(item.url || item.id)) {
        // Recalculate age hours relative to now
        const pubTimestamp = new Date(item.published_at).getTime();
        const ageHours = Math.max(0, Math.round((now - pubTimestamp) / (1000 * 60 * 60)));
        mergedMap.set(item.url || item.id, { ...item, age_hours: ageHours });
      }
    }

    const mergedList = Array.from(mergedMap.values());
    mergedList.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

    // Only update cache if we have valid items
    if (mergedList.length > 0) {
      fs.writeFileSync(this.cachePath, JSON.stringify(mergedList, null, 2), "utf-8");
      return mergedList;
    }

    // If completely offline and cache was empty, fall back to cached list
    if (existingCache.length > 0) {
      console.warn(`[DailyNewsMonitor] Live fetch yielded 0 items; retaining ${existingCache.length} cached news items.`);
      return existingCache;
    }

    return items;
  }

  public getCachedDailyNews(): DailyNewsItem[] {
    if (fs.existsSync(this.cachePath)) {
      try {
        return JSON.parse(fs.readFileSync(this.cachePath, "utf-8")) as DailyNewsItem[];
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * Pre-production freshness check: determines whether breaking news has occurred
   * on the brief's topic since the brief was originally compiled.
   */
  public checkBriefFreshness(brief: ResearchBrief): FreshnessCheckResult {
    const briefCreatedTime = new Date(brief.metadata.created_at).getTime();
    const now = Date.now();
    const hoursOld = Math.round((now - briefCreatedTime) / (1000 * 60 * 60));

    const newsItems = this.getCachedDailyNews();
    const topicKeywords = brief.metadata.research_topic
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3);

    const relevantBreaking: string[] = [];

    for (const item of newsItems) {
      const pubTime = new Date(item.published_at).getTime();
      // Only examine news published AFTER the brief
      if (pubTime > briefCreatedTime) {
        const titleLower = item.title.toLowerCase();
        const matches = topicKeywords.filter((k) => titleLower.includes(k));
        if (matches.length >= 2) {
          relevantBreaking.push(`"${item.title}" (${item.source})`);
        }
      }
    }

    return {
      isFresh: relevantBreaking.length === 0,
      hoursOld,
      newDevelopmentsCount: relevantBreaking.length,
      recentHeadlines: relevantBreaking.slice(0, 3),
    };
  }
}

let _defaultMonitor: DailyNewsMonitor | null = null;

export function getDailyNewsMonitor(): DailyNewsMonitor {
  if (!_defaultMonitor) {
    _defaultMonitor = new DailyNewsMonitor();
  }
  return _defaultMonitor;
}
