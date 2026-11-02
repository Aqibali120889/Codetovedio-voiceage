/**
 * Safe Web Content Extractor.
 * Enforces SSRF protection, size limits, removes script/style markup, extracts clean text.
 */

import { isSafeUrl } from "../ingestion/url-normalizer";

export interface ExtractedPage {
  url: string;
  title: string;
  text: string;
  author?: string;
  publishedDate?: string;
  byteSize: number;
}

export async function extractWebContent(
  url: string,
  timeoutMs = 12000,
  maxSizeBytes = 500_000
): Promise<ExtractedPage | null> {
  const safety = isSafeUrl(url);
  if (!safety.safe) {
    console.warn(`[web-extractor] Blocked unsafe URL: ${url} (${safety.reason})`);
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "VoiceageResearchBot/2.0 (+https://voiceage.systems/research)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9",
      },
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[web-extractor] HTTP error ${res.status} for ${url}`);
      return null;
    }

    const html = await res.text();
    const clampedHtml = html.slice(0, maxSizeBytes);

    // Extract title
    const titleMatch = clampedHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? cleanText(titleMatch[1]) : "Untitled Page";

    // Extract meta published date
    const dateMatch =
      clampedHtml.match(/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i) ||
      clampedHtml.match(/<meta[^>]+name=["'](?:pubdate|publish_date|date)["'][^>]+content=["']([^"']+)["']/i);
    const publishedDate = dateMatch ? dateMatch[1] : undefined;

    // Extract author
    const authorMatch =
      clampedHtml.match(/<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i) ||
      clampedHtml.match(/<meta[^>]+property=["']article:author["'][^>]+content=["']([^"']+)["']/i);
    const author = authorMatch ? cleanText(authorMatch[1]) : undefined;

    // Remove script, style, noscript, nav, header, footer tags
    const cleanMarkup = clampedHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ");

    // Extract main text by removing remaining tags and unescaping entities
    const text = cleanText(cleanMarkup);

    return {
      url,
      title,
      text: text.slice(0, 15000), // bounded text content
      author,
      publishedDate,
      byteSize: clampedHtml.length,
    };
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[web-extractor] Failed retrieving ${url}: ${(err as Error).message}`);
    return null;
  }
}

function cleanText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
