/**
 * Production Job Store.
 * Provides file persistence for ProductionJob entities in data/production/jobs/.
 */

import fs from "fs";
import path from "path";
import type { ProductionJob } from "../types";

export class JobStore {
  private baseDir: string;

  constructor(baseDir = "data/production/jobs") {
    this.baseDir = path.resolve(process.cwd(), baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  public save(job: ProductionJob): void {
    const filePath = path.join(this.baseDir, `${job.job_id}.json`);
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    const payload = JSON.stringify(job, null, 2);

    fs.writeFileSync(tempPath, payload, "utf-8");
    fs.renameSync(tempPath, filePath);
  }

  public get(jobId: string): ProductionJob | null {
    const filePath = path.join(this.baseDir, `${jobId}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as ProductionJob;
    } catch (e) {
      console.error(`[JobStore] Failed to read job ${jobId}:`, e);
      return null;
    }
  }

  public getAll(): ProductionJob[] {
    if (!fs.existsSync(this.baseDir)) return [];
    const files = fs.readdirSync(this.baseDir).filter((f) => f.endsWith(".json"));
    const jobs: ProductionJob[] = [];

    for (const f of files) {
      try {
        const data = fs.readFileSync(path.join(this.baseDir, f), "utf-8");
        jobs.push(JSON.parse(data) as ProductionJob);
      } catch {
        // Skip malformed
      }
    }

    return jobs.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public delete(jobId: string): boolean {
    const filePath = path.join(this.baseDir, `${jobId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }
}

let _defaultStore: JobStore | null = null;

export function getJobStore(): JobStore {
  if (!_defaultStore) {
    _defaultStore = new JobStore();
  }
  return _defaultStore;
}
