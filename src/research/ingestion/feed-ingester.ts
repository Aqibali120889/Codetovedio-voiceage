/**
 * Feed Ingestion Service.
 * Fetches RSS/Atom feeds defensively, normalizes URLs, enforces deduplication and timeouts.
 */

import fs from "fs";
import path from "path";
import { getSourceRegistry, SourceRegistry } from "../registry/source-registry";
import { parseFeedXml } from "./rss-parser";
import { isSafeUrl, normalizeUrl, computeContentHash } from "./url-normalizer";
import type { IngestedArticle, SourceConfig } from "../types";

const ARTICLES_CACHE_PATH = path.resolve(process.cwd(), "data/research/topics/articles_cache.json");

export interface IngestionResult {
  totalSourcesChecked: number;
  sourcesSucceeded: number;
  sourcesFailed: number;
  newArticlesIngested: number;
  totalArticlesCached: number;
  articles: IngestedArticle[];
  errors: Array<{ sourceId: string; error: string }>;
}

export class FeedIngester {
  private registry: SourceRegistry;
  private cachedArticles: Map<string, IngestedArticle> = new Map();

  constructor(registry?: SourceRegistry) {
    this.registry = registry ?? getSourceRegistry();
    this.loadCache();
  }

  private loadCache(): void {
    try {
      if (fs.existsSync(ARTICLES_CACHE_PATH)) {
        const raw = fs.readFileSync(ARTICLES_CACHE_PATH, "utf-8");
        const list = JSON.parse(raw) as IngestedArticle[];
        this.cachedArticles.clear();
        for (const a of list) {
          this.cachedArticles.set(a.canonicalUrl || a.url, a);
        }
      }
    } catch (err) {
      console.warn(`[FeedIngester] Cache load warning: ${(err as Error).message}`);
    }
  }

  public saveCache(): void {
    try {
      const dir = path.dirname(ARTICLES_CACHE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const list = Array.from(this.cachedArticles.values());
      fs.writeFileSync(ARTICLES_CACHE_PATH, JSON.stringify(list, null, 2), "utf-8");
    } catch (err) {
      console.error(`[FeedIngester] Cache save error: ${(err as Error).message}`);
    }
  }

  /**
   * Fetch a single feed with timeout and SSRF check.
   */
  public async fetchSingleFeed(
    source: SourceConfig,
    timeoutMs = 15000
  ): Promise<{ articles: IngestedArticle[]; error?: string }> {
    const feedUrl = source.feedUrl || source.url;
    const safety = isSafeUrl(feedUrl);
    if (!safety.safe) {
      const err = `SSRF safety check failed: ${safety.reason}`;
      this.registry.recordFetchResult(source.id, false, err);
      return { articles: [], error: err };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(feedUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "VoiceageResearchBot/2.0 (+https://voiceage.systems/research)",
          Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        },
      });

      clearTimeout(timer);

      if (!resp.ok) {
        throw new Error(`HTTP error ${resp.status} ${resp.statusText}`);
      }

      const xml = await resp.text();
      const parsed = parseFeedXml(xml);

      const articles: IngestedArticle[] = [];
      const retrievedAt = new Date().toISOString();

      for (const item of parsed.items) {
        const canonicalUrl = normalizeUrl(item.link, source.url);
        const contentHash = computeContentHash(item.title, item.description);

        const article: IngestedArticle = {
          id: `art_${source.id}_${contentHash.slice(0, 10)}`,
          sourceId: source.id,
          sourceName: source.name,
          title: item.title,
          url: item.link,
          canonicalUrl,
          publishedAt: item.publishedAt,
          retrievedAt,
          author: item.author,
          contentSnippet: item.description.slice(0, 500),
          fullContent: item.content || item.description,
          categories: Array.from(new Set([...source.categories, ...item.categories])),
          contentHash,
          trustLevel: source.trustLevel,
        };

        articles.push(article);
      }

      this.registry.recordFetchResult(source.id, true);
      return { articles };
    } catch (err) {
      clearTimeout(timer);
      const errMsg = (err as Error).message;
      this.registry.recordFetchResult(source.id, false, errMsg);
      return { articles: [], error: errMsg };
    }
  }

  /**
   * Ingest articles from all enabled sources or specified sources.
   */
  public async ingestAll(sourceIds?: string[]): Promise<IngestionResult> {
    const allEnabled = this.registry.getEnabledSources();
    const targetSources = sourceIds
      ? allEnabled.filter((s) => sourceIds.includes(s.id))
      : allEnabled;

    let newCount = 0;
    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ sourceId: string; error: string }> = [];

    for (const src of targetSources) {
      console.log(`[FeedIngester] Polling source: ${src.name} (${src.id})...`);
      const res = await this.fetchSingleFeed(src);

      if (res.error) {
        failed++;
        errors.push({ sourceId: src.id, error: res.error });
        console.warn(`[FeedIngester] Failed polling ${src.name}: ${res.error}`);
      } else {
        succeeded++;
        for (const art of res.articles) {
          const key = art.canonicalUrl || art.url;
          if (!this.cachedArticles.has(key)) {
            this.cachedArticles.set(key, art);
            newCount++;
          }
        }
      }
    }

    this.saveCache();

    return {
      totalSourcesChecked: targetSources.length,
      sourcesSucceeded: succeeded,
      sourcesFailed: failed,
      newArticlesIngested: newCount,
      totalArticlesCached: this.cachedArticles.size,
      articles: Array.from(this.cachedArticles.values()),
      errors,
    };
  }

  public getCachedArticles(): IngestedArticle[] {
    return Array.from(this.cachedArticles.values());
  }

  public addManualArticles(articles: IngestedArticle[]): void {
    for (const a of articles) {
      const key = a.canonicalUrl || a.url;
      this.cachedArticles.set(key, a);
    }
    this.saveCache();
  }
}
