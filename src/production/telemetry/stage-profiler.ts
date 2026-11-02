/**
 * Stage Profiler & Telemetry Tracker.
 * Instruments each stage of the AI video production pipeline with timing,
 * model configurations, token metrics, payload sizes, object counts,
 * retry tracking, and timeout attribution.
 */

import fs from "fs";
import path from "path";

export interface StageTelemetryRecord {
  stage: string;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  payloadSizeBytes?: number;
  objectsGenerated?: {
    scenes?: number;
    artifacts?: number;
    beats?: number;
    claims?: number;
    assets?: number;
  };
  retries?: number;
  cacheHit?: boolean;
  errorCategory?: "timeout" | "schema_validation" | "api_error" | "rate_limit" | "network" | "none";
  timeoutDurationMs?: number;
  status: "running" | "completed" | "timed_out" | "failed" | "skipped";
  notes?: string;
}

export class StageProfiler {
  private records: Map<string, StageTelemetryRecord> = new Map();
  private projectDir?: string;

  constructor(projectDir?: string) {
    this.projectDir = projectDir;
  }

  public setProjectDir(dir: string): void {
    this.projectDir = dir;
  }

  public startStage(
    stage: string,
    metadata: {
      model?: string;
      payloadSizeBytes?: number;
      timeoutDurationMs?: number;
      cacheHit?: boolean;
    } = {}
  ): StageTelemetryRecord {
    const record: StageTelemetryRecord = {
      stage,
      startTime: new Date().toISOString(),
      model: metadata.model,
      payloadSizeBytes: metadata.payloadSizeBytes,
      timeoutDurationMs: metadata.timeoutDurationMs,
      cacheHit: metadata.cacheHit || false,
      retries: 0,
      errorCategory: "none",
      status: "running",
    };

    this.records.set(stage, record);
    return record;
  }

  public recordRetry(stage: string): void {
    const record = this.records.get(stage);
    if (record) {
      record.retries = (record.retries || 0) + 1;
    }
  }

  public completeStage(
    stage: string,
    result: {
      objectsGenerated?: StageTelemetryRecord["objectsGenerated"];
      inputTokens?: number;
      outputTokens?: number;
      notes?: string;
    } = {}
  ): StageTelemetryRecord {
    const record = this.records.get(stage);
    const now = new Date();
    if (record) {
      record.endTime = now.toISOString();
      record.durationMs = now.getTime() - new Date(record.startTime).getTime();
      record.status = "completed";
      if (result.objectsGenerated) record.objectsGenerated = result.objectsGenerated;
      if (result.inputTokens) record.inputTokens = result.inputTokens;
      if (result.outputTokens) record.outputTokens = result.outputTokens;
      if (result.notes) record.notes = result.notes;
    }

    this.persist();
    return record || {
      stage,
      startTime: now.toISOString(),
      endTime: now.toISOString(),
      durationMs: 0,
      status: "completed",
    };
  }

  public failStage(
    stage: string,
    errorCategory: StageTelemetryRecord["errorCategory"],
    errorMessage: string
  ): StageTelemetryRecord {
    const record = this.records.get(stage);
    const now = new Date();
    if (record) {
      record.endTime = now.toISOString();
      record.durationMs = now.getTime() - new Date(record.startTime).getTime();
      record.status = errorCategory === "timeout" ? "timed_out" : "failed";
      record.errorCategory = errorCategory;
      record.notes = errorMessage;
    }

    this.persist();
    return record || {
      stage,
      startTime: now.toISOString(),
      endTime: now.toISOString(),
      durationMs: 0,
      status: "failed",
      errorCategory,
      notes: errorMessage,
    };
  }

  public getSummary(): Record<string, unknown> {
    const summary: Record<string, unknown> = {
      totalStages: this.records.size,
      totalDurationMs: Array.from(this.records.values()).reduce(
        (acc, r) => acc + (r.durationMs || 0),
        0
      ),
      stages: Array.from(this.records.values()),
    };
    return summary;
  }

  public persist(): void {
    if (!this.projectDir) return;
    try {
      const outputPath = path.join(this.projectDir, "pipeline_telemetry.json");
      fs.writeFileSync(outputPath, JSON.stringify(this.getSummary(), null, 2), "utf-8");
    } catch {
      // Non-fatal if telemetry disk write fails
    }
  }
}

let globalProfiler: StageProfiler | undefined;

export function getGlobalProfiler(projectDir?: string): StageProfiler {
  if (!globalProfiler) {
    globalProfiler = new StageProfiler(projectDir);
  } else if (projectDir) {
    globalProfiler.setProjectDir(projectDir);
  }
  return globalProfiler;
}
