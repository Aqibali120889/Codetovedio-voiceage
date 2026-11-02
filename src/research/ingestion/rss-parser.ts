/**
 * Defensive RSS 2.0 & Atom Feed Parser.
 * Pure TypeScript, zero external dependencies, robust CDATA and tag extraction.
 */

export interface ParsedFeedItem {
  title: string;
  link: string;
  publishedAt: string;
  description: string;
  content?: string;
  author?: string;
  categories: string[];
}

export interface ParsedFeed {
  title: string;
  link?: string;
  description?: string;
  items: ParsedFeedItem[];
}

/**
 * Clean text from CDATA and unescape common XML entities.
 */
function cleanXmlText(raw: string): string {
  if (!raw) return "";

  // Extract from CDATA if present
  const cdataMatch = raw.match(/<!\[CDATA\[([\s\S]*?)\]\]>/i);
  let text = cdataMatch ? cdataMatch[1] : raw;

  // Unescape standard entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));

  // Strip residual HTML tags from descriptions
  text = text.replace(/<[^>]+>/g, " ");

  // Collapse whitespace
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Extract value between <tag>...</tag> or self-closing attribute
 */
function extractTagContent(xml: string, tag: string): string | null {
  // Support namespaced tags e.g. dc:creator or content:encoded
  const escapedTag = tag.replace(":", "\\:");
  const regex = new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, "i");
  const match = xml.match(regex);
  return match ? cleanXmlText(match[1]) : null;
}

/**
 * Extract multiple tag occurrences e.g. <category>
 */
function extractAllTags(xml: string, tag: string): string[] {
  const escapedTag = tag.replace(":", "\\:");
  const regex = new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, "gi");
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    const val = cleanXmlText(match[1]);
    if (val) results.push(val);
  }
  return results;
}

/**
 * Parse an ISO or RFC822/RFC2822 date safely, fallback to current ISO string.
 */
function parseDateSafely(rawDate: string | null): string {
  if (!rawDate) return new Date().toISOString();
  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  } catch {
    // fallback
  }
  return new Date().toISOString();
}

/**
 * Main feed parsing function.
 */
export function parseFeedXml(xmlContent: string): ParsedFeed {
  const isAtom = /<feed\b[^>]*>/i.test(xmlContent);

  if (isAtom) {
    return parseAtomFeed(xmlContent);
  } else {
    return parseRssFeed(xmlContent);
  }
}

function parseRssFeed(xml: string): ParsedFeed {
  const feedTitle = extractTagContent(xml, "title") ?? "Untitled Feed";
  const feedLink = extractTagContent(xml, "link") ?? undefined;
  const feedDesc = extractTagContent(xml, "description") ?? undefined;

  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  const items: ParsedFeedItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const title = extractTagContent(itemXml, "title") ?? "Untitled";
    const link = extractTagContent(itemXml, "link") ?? "";
    const pubDate = parseDateSafely(
      extractTagContent(itemXml, "pubDate") || extractTagContent(itemXml, "dc:date")
    );
    const description =
      extractTagContent(itemXml, "description") ||
      extractTagContent(itemXml, "content:encoded") ||
      "";
    const author =
      extractTagContent(itemXml, "dc:creator") ||
      extractTagContent(itemXml, "author") ||
      undefined;
    const categories = extractAllTags(itemXml, "category");

    if (link || title) {
      items.push({
        title,
        link,
        publishedAt: pubDate,
        description,
        author,
        categories,
      });
    }
  }

  return {
    title: feedTitle,
    link: feedLink,
    description: feedDesc,
    items,
  };
}

function parseAtomFeed(xml: string): ParsedFeed {
  const feedTitle = extractTagContent(xml, "title") ?? "Untitled Atom Feed";
  const feedDesc = extractTagContent(xml, "subtitle") ?? undefined;

  const entryRegex = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;
  const items: ParsedFeedItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entryXml = match[1];

    const title = extractTagContent(entryXml, "title") ?? "Untitled";

    // Atom links can be <link href="..."/> or <link rel="alternate" href="..."/>
    let link = "";
    const linkHrefMatch = entryXml.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>(?:<\/link>)?/i);
    if (linkHrefMatch) {
      link = linkHrefMatch[1];
    } else {
      link = extractTagContent(entryXml, "link") ?? "";
    }

    const pubDate = parseDateSafely(
      extractTagContent(entryXml, "published") ||
      extractTagContent(entryXml, "updated")
    );

    const description =
      extractTagContent(entryXml, "summary") ||
      extractTagContent(entryXml, "content") ||
      "";

    const author = extractTagContent(entryXml, "name") || undefined;
    const categories = extractAllTags(entryXml, "category");

    if (link || title) {
      items.push({
        title,
        link,
        publishedAt: pubDate,
        description,
        author,
        categories,
      });
    }
  }

  return {
    title: feedTitle,
    description: feedDesc,
    items,
  };
}
