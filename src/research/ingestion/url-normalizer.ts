/**
 * URL Normalization, Security & Deduplication Utility.
 * Enforces SSRF defense, tracking removal, and content hashing.
 */

import crypto from "crypto";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "mc_eid",
  "_hsenc",
  "_hsmi",
  "ref",
  "source",
]);

// Private / restricted IP patterns for SSRF prevention
const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "169.254.169.254", // AWS/GCP/Azure link-local metadata
  "metadata.google.internal",
  "instance-data",
]);

/**
 * Checks whether a URL is safe to retrieve (SSRF defense).
 */
export function isSafeUrl(urlStr: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(urlStr);

    // Protocol check
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { safe: false, reason: `Disallowed protocol: ${parsed.protocol}` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check blocked hostnames
    if (BLOCKED_HOSTS.has(hostname)) {
      return { safe: false, reason: `Blocked hostname: ${hostname}` };
    }

    // Check private IPv4 ranges (10.x, 172.16-31.x, 192.168.x, 127.x)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const b1 = parseInt(match[1], 10);
      const b2 = parseInt(match[2], 10);
      if (b1 === 127 || b1 === 10 || b1 === 0) {
        return { safe: false, reason: `Private IPv4 range: ${hostname}` };
      }
      if (b1 === 192 && b2 === 168) {
        return { safe: false, reason: `Private IPv4 range: ${hostname}` };
      }
      if (b1 === 172 && b2 >= 16 && b2 <= 31) {
        return { safe: false, reason: `Private IPv4 range: ${hostname}` };
      }
      if (b1 === 169 && b2 === 254) {
        return { safe: false, reason: `Link-local IPv4 range: ${hostname}` };
      }
    }

    // Check IPv6 loopback / unique local
    if (hostname.startsWith("[::1]") || hostname.startsWith("[fc") || hostname.startsWith("[fd")) {
      return { safe: false, reason: `Private IPv6 range: ${hostname}` };
    }

    return { safe: true };
  } catch (err) {
    return { safe: false, reason: `Invalid URL format: ${(err as Error).message}` };
  }
}

/**
 * Strips tracking query parameters and standardizes the URL.
 */
export function normalizeUrl(urlStr: string, baseUrl?: string): string {
  try {
    const parsed = baseUrl ? new URL(urlStr, baseUrl) : new URL(urlStr);

    // Clean tracking search params
    const keysToRemove: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) {
        keysToRemove.push(key);
      }
    });
    for (const key of keysToRemove) {
      parsed.searchParams.delete(key);
    }

    // Remove hash/fragment
    parsed.hash = "";

    // Normalize protocol to lowercase
    let result = parsed.toString();

    // Strip trailing slash on path root if no pathname
    if (parsed.pathname === "/" && !parsed.search) {
      result = `${parsed.protocol}//${parsed.host}`;
    }

    return result;
  } catch {
    return urlStr.trim();
  }
}

/**
 * Generate deterministic content hash for duplicate detection.
 */
export function computeContentHash(title: string, content: string): string {
  const normalized = `${title.toLowerCase().trim()}|${content.toLowerCase().trim().slice(0, 500)}`;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}
