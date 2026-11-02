/**
 * Research Job Manager & Persistence.
 * Tracks asynchronous research jobs, stage progression, and persistent state.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { ResearchJob, ResearchRequest, ResearchStage } from "../types";

const JOBS_DIR = path.resolve(process.cwd(), "data/research/jobs");

export class JobManager {
  private jobs: Map<string, ResearchJob> = new Map();

  constructor() {
    this.ensureDir();
    this.loadJobs();
  }

  private ensureDir(): void {
    if (!fs.existsSync(JOBS_DIR)) {
      fs.mkdirSync(JOBS_DIR, { recursive: true });
    }
  }

  private loadJobs(): void {
    try {
      const files = fs.readdirSync(JOBS_DIR);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const raw = fs.readFileSync(path.join(JOBS_DIR, file), "utf-8");
          const job = JSON.parse(raw) as ResearchJob;
          this.jobs.set(job.job_id, job);
        }
      }
    } catch (err) {
      console.warn(`[JobManager] Error loading jobs: ${(err as Error).message}`);
    }
  }

  public saveJob(job: ResearchJob): void {
    try {
      this.ensureDir();
      const filePath = path.join(JOBS_DIR, `${job.job_id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(job, null, 2), "utf-8");
    } catch (err) {
      console.error(`[JobManager] Error saving job ${job.job_id}: ${(err as Error).message}`);
    }
  }

  public createJob(request: ResearchRequest): ResearchJob {
    const jobId = `job_${crypto.randomUUID().slice(0, 8)}`;
    const job: ResearchJob = {
      job_id: jobId,
      request,
      status: "queued",
      stage: "queued",
      progressPercent: 0,
      message: "Job queued for execution",
      started_at: new Date().toISOString(),
    };
    this.jobs.set(jobId, job);
    this.saveJob(job);
    return job;
  }

  public updateJobStage(
    jobId: string,
    stage: ResearchStage,
    progressPercent: number,
    message?: string
  ): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = "in_progress";
    job.stage = stage;
    job.progressPercent = progressPercent;
    if (message) job.message = message;
    this.saveJob(job);
  }

  public completeJob(jobId: string, briefId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = "completed";
    job.stage = "completed";
    job.progressPercent = 100;
    job.completed_at = new Date().toISOString();
    job.brief_id = briefId;
    job.message = `Research complete. Brief generated: ${briefId}`;
    this.saveJob(job);
  }

  public failJob(jobId: string, category: string, message: string, details?: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = "failed";
    job.stage = "failed";
    job.completed_at = new Date().toISOString();
    job.error = { category, message, details };
    job.message = `Job failed: ${message}`;
    this.saveJob(job);
  }

  public getJob(jobId: string): ResearchJob | undefined {
    return this.jobs.get(jobId);
  }

  public getAllJobs(): ResearchJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
  }
}

let _jobManagerInstance: JobManager | null = null;

export function getJobManager(): JobManager {
  if (!_jobManagerInstance) {
    _jobManagerInstance = new JobManager();
  }
  return _jobManagerInstance;
}
