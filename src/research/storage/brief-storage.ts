/**
 * Brief Storage Manager.
 * Persists ResearchBrief objects as structured JSON and readable Markdown.
 */

import fs from "fs";
import path from "path";
import type { ResearchBrief } from "../types";
import { formatBriefAsMarkdown } from "../agents/brief-editor";

const BRIEFS_DIR = path.resolve(process.cwd(), "data/research/briefs");

export function ensureBriefsDir(): void {
  if (!fs.existsSync(BRIEFS_DIR)) {
    fs.mkdirSync(BRIEFS_DIR, { recursive: true });
  }
}

export function saveBrief(brief: ResearchBrief): { jsonPath: string; mdPath: string } {
  ensureBriefsDir();
  const id = brief.metadata.brief_id;
  const jsonPath = path.join(BRIEFS_DIR, `${id}.json`);
  const mdPath = path.join(BRIEFS_DIR, `${id}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(brief, null, 2), "utf-8");
  fs.writeFileSync(mdPath, formatBriefAsMarkdown(brief), "utf-8");

  return { jsonPath, mdPath };
}

export function getBrief(briefId: string): ResearchBrief | null {
  ensureBriefsDir();
  const jsonPath = path.join(BRIEFS_DIR, `${briefId}.json`);
  if (!fs.existsSync(jsonPath)) return null;

  try {
    const raw = fs.readFileSync(jsonPath, "utf-8");
    return JSON.parse(raw) as ResearchBrief;
  } catch (err) {
    console.error(`[brief-storage] Error loading brief ${briefId}: ${(err as Error).message}`);
    return null;
  }
}

export function getAllBriefs(): ResearchBrief[] {
  ensureBriefsDir();
  const results: ResearchBrief[] = [];
  try {
    const files = fs.readdirSync(BRIEFS_DIR);
    for (const f of files) {
      if (f.endsWith(".json")) {
        const raw = fs.readFileSync(path.join(BRIEFS_DIR, f), "utf-8");
        results.push(JSON.parse(raw) as ResearchBrief);
      }
    }
  } catch (err) {
    console.warn(`[brief-storage] Error reading briefs: ${(err as Error).message}`);
  }

  return results.sort(
    (a, b) => new Date(b.metadata.created_at).getTime() - new Date(a.metadata.created_at).getTime()
  );
}
