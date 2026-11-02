/**
 * Production Job State Machine.
 * Manages stage progression, checkpointing, resume capability,
 * and provenance tracking for an end-to-end video production run.
 */

import { v4 as uuidv4 } from "uuid";
import type {
  ProductionJob,
  ProductionJobStage,
  ProductionJobStatus,
  ProductionJobConfig,
} from "../types";
import { getJobStore, JobStore } from "./job-store";

export type StageTransitionListener = (job: ProductionJob, stage: ProductionJobStage) => void;

export class ProductionJobManager {
  private job: ProductionJob;
  private store: JobStore;
  private listeners: StageTransitionListener[] = [];

  constructor(jobOrConfig?: ProductionJob | ProductionJobConfig, store?: JobStore) {
    this.store = store || getJobStore();

    if (jobOrConfig && "job_id" in jobOrConfig) {
      // Resume existing job
      this.job = jobOrConfig as ProductionJob;
    } else {
      // Initialize new job
      const config = (jobOrConfig as ProductionJobConfig) || {};
      const jobId = `job_${uuidv4().slice(0, 8)}`;
      const projectId = `proj_${uuidv4()}`;
      const now = new Date().toISOString();

      this.job = {
        job_id: jobId,
        project_id: projectId,
        created_at: now,
        updated_at: now,
        status: "queued",
        current_stage: "queued",
        completed_stages: [],
        lineage: {
          research_brief_id: config.brief_id,
        },
        checkpoints: {},
        config,
        artifacts: {},
        warnings: [],
      };

      this.store.save(this.job);
    }
  }

  public getJob(): Readonly<ProductionJob> {
    return this.job;
  }

  public addListener(listener: StageTransitionListener): void {
    this.listeners.push(listener);
  }

  public removeListener(listener: StageTransitionListener): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  /**
   * Checks whether a stage has already completed with valid output.
   */
  public hasCompletedStage(stage: ProductionJobStage): boolean {
    return this.job.completed_stages.includes(stage) && !!this.job.checkpoints[stage];
  }

  /**
   * Retrieves stored checkpoint data for a stage if available.
   */
  public getCheckpoint(stage: ProductionJobStage): Record<string, unknown> | undefined {
    return this.job.checkpoints[stage]?.data;
  }

  /**
   * Transition to a new stage, recording duration, checkpoints, and updating disk.
   */
  public transitionTo(
    stage: ProductionJobStage,
    outputArtifactPath?: string,
    checkpointData?: Record<string, unknown>
  ): void {
    const now = new Date().toISOString();
    this.job.current_stage = stage;
    this.job.status = "running";
    this.job.updated_at = now;

    if (!this.job.completed_stages.includes(stage)) {
      this.job.completed_stages.push(stage);
    }

    this.job.checkpoints[stage] = {
      stage,
      completed_at: now,
      output_artifact_path: outputArtifactPath,
      data: checkpointData,
    };

    this.store.save(this.job);

    for (const listener of this.listeners) {
      try {
        listener(this.job, stage);
      } catch (e) {
        console.error(`[ProductionJobManager] Listener error on stage ${stage}:`, e);
      }
    }
  }

  /**
   * Update specific artifact paths on the job.
   */
  public updateArtifacts(artifacts: Partial<ProductionJob["artifacts"]>): void {
    this.job.artifacts = {
      ...this.job.artifacts,
      ...artifacts,
    };
    this.job.updated_at = new Date().toISOString();
    this.store.save(this.job);
  }

  /**
   * Update lineage mappings as artifacts are produced.
   */
  public updateLineage(lineage: Partial<ProductionJob["lineage"]>): void {
    this.job.lineage = {
      ...this.job.lineage,
      ...lineage,
    };
    this.job.updated_at = new Date().toISOString();
    this.store.save(this.job);
  }

  public addWarning(warning: string): void {
    this.job.warnings.push(warning);
    this.job.updated_at = new Date().toISOString();
    this.store.save(this.job);
  }

  public fail(stage: ProductionJobStage, message: string, recoverable = true): void {
    const now = new Date().toISOString();
    this.job.status = "failed";
    this.job.current_stage = stage;
    this.job.updated_at = now;
    this.job.error = {
      stage,
      message,
      timestamp: now,
      recoverable,
    };
    this.store.save(this.job);

    for (const listener of this.listeners) {
      try {
        listener(this.job, stage);
      } catch {
        // Ignore listener error
      }
    }
  }

  public complete(status: ProductionJobStatus = "completed"): void {
    const now = new Date().toISOString();
    this.job.status = status;
    this.job.current_stage = "completed";
    this.job.updated_at = now;
    if (!this.job.completed_stages.includes("completed")) {
      this.job.completed_stages.push("completed");
    }
    this.store.save(this.job);

    for (const listener of this.listeners) {
      try {
        listener(this.job, "completed");
      } catch {
        // Ignore listener error
      }
    }
  }
}
