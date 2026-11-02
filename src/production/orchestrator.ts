/**
 * Production Orchestrator.
 * Coordinates the full 14-stage end-to-end video production workflow:
 * Brief -> Grounded Script -> Scene Plan -> Speech & Timing -> Captions -> Mix -> Remotion Render -> QA
 */

import fs from "fs";
import path from "path";
import { getConfig, checkCredentials } from "../pipeline/config";
import { getBrief } from "../research/storage/brief-storage";
import { ResearchOrchestrator } from "../research/orchestration/research-orchestrator";
import type { ResearchBrief } from "../research/types";
import type {
  ProductionInput,
  ProductionJobConfig,
  ProductionExecutionResult,
  ScriptDocument,
  AudioMixPlan,
} from "./types";
import type { StoryboardDocument } from "./storyboard/storyboard-types";
import { ProductionJobManager } from "./state-machine/production-job";
import { generateGroundedScript } from "./scriptwriting/grounded-scriptwriter";
import { validateScriptClaims } from "./scriptwriting/claim-validator";
import { evaluateEditorialConsistency } from "./editorial/editorial-consistency-gate";
import { planStoryboardFromScript } from "./storyboard/storyboard-planner";
import { planScenesFromScript } from "./scene-planning/scene-planner";
import { validateAndRepairScenePlan } from "./scene-planning/plan-validator";
import { generateNarrationForBlueprint } from "./audio/narration-service";
import { generateCaptionsForBlueprint } from "./audio/caption-service";
import { mixAudioTracks } from "./audio/audio-mixer";
import { getBrandManager } from "./branding/brand-manager";
import { AssetManager } from "./assets/asset-manager";
import { renderProductionVideo } from "./rendering/production-renderer";
import { inspectRenderQuality } from "./qa/quality-inspector";
import { getDailyNewsMonitor } from "./news/daily-news-monitor";
import { getGenerationHistoryManager } from "./history/generation-history";
import { determineVisualDirection } from "./editorial/visual-art-director";
import type { VisualDirection } from "./editorial/visual-art-director";
import { validateVisualDiversity } from "./qa/visual-diversity-validator";
import { getGlobalProfiler } from "./telemetry/stage-profiler";
import { PostProductionDirector } from "./post-production";
import type { PostProductionPlan } from "./post-production/post-production-types";

export class ProductionOrchestrator {
  private config = getConfig();

  public async runProduction(
    input: ProductionInput,
    options: Partial<ProductionJobConfig> = {}
  ): Promise<ProductionExecutionResult> {
    const jobConfig: ProductionJobConfig = {
      ...options,
      brief_id: input.mode === "brief_id" ? input.briefId : options.brief_id,
      topic: input.mode === "topic" ? input.topic : options.topic,
    };

    const manager = new ProductionJobManager(jobConfig);
    const job = manager.getJob();
    const projectId = (options.resume && options.resume_project_id) ? options.resume_project_id : job.project_id;
    const projectDir = path.join(this.config.outputBaseDir, projectId);
    const profiler = getGlobalProfiler(projectDir);

    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    let storyboard: StoryboardDocument | undefined;
    let visualDirection: VisualDirection | undefined;
    let editingPlan: PostProductionPlan | undefined;

    console.log(`\n══════════════════════════════════════════════════════════════════`);
    console.log(`  Voiceage Systems — Video Production Pipeline`);
    console.log(`  Job ID:     ${job.job_id}`);
    console.log(`  Project ID: ${projectId}`);
    console.log(`══════════════════════════════════════════════════════════════════\n`);

    try {
      // ── Stage 1: Loading Research ─────────────────────────────
      manager.transitionTo("loading_research");
      console.log(`[Production] Stage: loading_research`);
      profiler.startStage("loading_research");

      let brief: ResearchBrief | undefined;
      const briefPath = path.join(projectDir, "research_brief.json");

      if (options.resume && fs.existsSync(briefPath)) {
        console.log(`[Production] Resuming from existing research brief at ${briefPath}`);
        brief = JSON.parse(fs.readFileSync(briefPath, "utf-8"));
      } else if (input.mode === "brief_id") {
        const loaded = getBrief(input.briefId);
        if (!loaded) {
          throw new Error(`Research brief "${input.briefId}" not found in storage.`);
        }
        brief = loaded;
      } else if (input.mode === "topic") {
        console.log(`[Production] Synthesizing research brief for topic: "${input.topic}"...`);
        const researchOrchestrator = new ResearchOrchestrator();
        const researchRes = await researchOrchestrator.executeResearch({
          mode: "topic_deep_dive",
          topic: input.topic,
          audience: input.audience || options.audience || "Engineers & Founders",
          depth: "standard",
        });
        if (!researchRes.success || !researchRes.brief) {
          throw new Error(`Deep research failed: ${researchRes.job.error?.message}`);
        }
        brief = researchRes.brief;
      }

      if (brief) {
        fs.writeFileSync(briefPath, JSON.stringify(brief, null, 2), "utf-8");
        manager.updateArtifacts({ brief_path: briefPath });
        manager.updateLineage({ research_brief_id: brief.metadata.brief_id });

        // Optional freshness check
        const newsMonitor = getDailyNewsMonitor();
        const freshness = newsMonitor.checkBriefFreshness(brief);
        if (!freshness.isFresh) {
          manager.addWarning(
            `Topic has ${freshness.newDevelopmentsCount} fresh development(s) in last 24h: ${freshness.recentHeadlines.join("; ")}`
          );
        }
      }
      profiler.completeStage("loading_research", {
        objectsGenerated: { claims: Object.keys(brief?.evidence_store || {}).length || brief?.facts_and_statistics?.length || 0 },
        notes: brief?.metadata.research_topic,
      });

      // ── Stage 2: Generating Script ────────────────────────────
      manager.transitionTo("generating_script");
      console.log(`[Production] Stage: generating_script`);
      profiler.startStage("generating_script", { model: this.config.textModel });

      let script: ScriptDocument;
      const scriptPath = path.join(projectDir, "script.json");

      if (options.resume && fs.existsSync(scriptPath)) {
        console.log(`[Production] Resuming from existing script at ${scriptPath}`);
        script = JSON.parse(fs.readFileSync(scriptPath, "utf-8"));
      } else if (input.mode === "script") {
        script = input.script;
      } else if (brief) {
        script = await generateGroundedScript(brief, {
          targetDurationSeconds: options.target_duration_seconds || 45,
          callToAction: options.topic ? undefined : undefined,
          forceDeterministic: options.force_deterministic || (options.skip_render && !!checkCredentials()),
        });
      } else {
        throw new Error("Cannot generate script: no research brief or user script provided.");
      }

      fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2), "utf-8");
      manager.updateArtifacts({ script_path: scriptPath });
      manager.updateLineage({ script_id: script.script_id });
      profiler.completeStage("generating_script", {
        objectsGenerated: { scenes: script.scenes.length, claims: script.scenes.length },
      });

      // ── Stage 3: Validating Script ────────────────────────────
      manager.transitionTo("validating_script");
      console.log(`[Production] Stage: validating_script`);
      profiler.startStage("validating_script");

      const claimVal = validateScriptClaims(script, brief);
      if (!claimVal.valid) {
        manager.addWarning(`Script claim warnings: ${claimVal.errors.join("; ")}`);
      }
      console.log(
        `[Production] Script Claims: ${claimVal.claimsSummary.verified}/${claimVal.claimsSummary.total} verified, ${claimVal.claimsSummary.unverified} unverified.`
      );
      profiler.completeStage("validating_script", {
        objectsGenerated: { claims: claimVal.claimsSummary.total },
      });

      const brandManager = getBrandManager();
      const brandProfile = brandManager.getProfile(options.brand_profile_id);

      // ── Stage 3b: Validating Editorial Consistency ───────────
      storyboard = script.storyboard;

      if (brief) {
        manager.transitionTo("validating_editorial");
        console.log(`[Production] Stage: validating_editorial`);
        profiler.startStage("validating_editorial");

        const editorialGate = evaluateEditorialConsistency(brief, script);
        const editorialReportPath = path.join(projectDir, "editorial_report.json");
        fs.writeFileSync(editorialReportPath, JSON.stringify(editorialGate, null, 2), "utf-8");
        manager.updateArtifacts({ editorial_report_path: editorialReportPath });

        if (editorialGate.requiresRejection) {
          throw new Error(
            `Editorial Consistency Gate rejected script:\n${editorialGate.errors.join("\n")}`
          );
        }

        if (editorialGate.warnings.length > 0) {
          for (const w of editorialGate.warnings) {
            manager.addWarning(`Editorial: ${w}`);
          }
        }
        profiler.completeStage("validating_editorial");

        // ── Stage 3c: Determining Visual Direction ───────────────
        console.log(`[Production] Stage: determining_visual_direction`);
        profiler.startStage("determining_visual_direction", { model: this.config.textModel });
        visualDirection = await determineVisualDirection(brief, script, {
          forceDeterministic: options.force_deterministic || (options.skip_render && !!checkCredentials()),
        });
        const visualDirectionPath = path.join(projectDir, "visual_direction.json");
        fs.writeFileSync(visualDirectionPath, JSON.stringify(visualDirection, null, 2), "utf-8");
        profiler.completeStage("determining_visual_direction", {
          notes: visualDirection.editorial_concept,
        });

        // ── Stage 3d: Planning Storyboard ────────────────────────
        manager.transitionTo("planning_storyboard");
        console.log(`[Production] Stage: planning_storyboard`);
        profiler.startStage("planning_storyboard", {
          model: this.config.textModel,
          timeoutDurationMs: 40000,
        });

        const storyboardPath = path.join(projectDir, "storyboard.json");
        if (options.resume && fs.existsSync(storyboardPath)) {
          console.log(`[Production] Resuming from existing storyboard at ${storyboardPath}`);
          storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf-8"));
        } else {
          storyboard = await planStoryboardFromScript(script, brief, {
            aspectRatio: options.aspect_ratio || brandProfile.aspect_ratio,
            themePreset: options.theme_preset || brandProfile.theme_preset,
            forceDeterministic: options.force_deterministic || (options.skip_render && !!checkCredentials()),
            visualDirection,
          });
          fs.writeFileSync(storyboardPath, JSON.stringify(storyboard, null, 2), "utf-8");
        }
        if (storyboard) {
          manager.updateArtifacts({ storyboard_path: storyboardPath });
          manager.updateLineage({ storyboard_id: storyboard.storyboard_id });
          script.storyboard = storyboard;
          profiler.completeStage("planning_storyboard", {
            objectsGenerated: {
              scenes: storyboard.scenes.length,
              artifacts: storyboard.scenes.reduce((acc, s) => acc + (s.artifacts?.length || 0), 0),
              beats: storyboard.scenes.reduce((acc, s) => acc + (s.beats?.length || 0), 0),
            },
          });
        }
      }

      // ── Stage 4: Planning Scenes ──────────────────────────────
      manager.transitionTo("planning_scenes");
      console.log(`[Production] Stage: planning_scenes`);
      profiler.startStage("planning_scenes", {
        model: this.config.textModel,
        timeoutDurationMs: 90000,
      });

      const blueprintPath = path.join(projectDir, "blueprint.json");
      let rawBlueprint: any;
      if (options.resume && fs.existsSync(blueprintPath)) {
        const loaded = JSON.parse(fs.readFileSync(blueprintPath, "utf-8"));
        rawBlueprint = loaded.blueprint || loaded;
      } else {
        rawBlueprint = await planScenesFromScript(script, {
          themePreset: options.theme_preset || brandProfile.theme_preset,
          aspectRatio: options.aspect_ratio || brandProfile.aspect_ratio,
          forceDeterministic: options.force_deterministic || (options.skip_render && !!checkCredentials()),
          storyboard,
          visualDirection,
        });
      }
      profiler.completeStage("planning_scenes", {
        objectsGenerated: { scenes: rawBlueprint.scenes.length },
      });

      // ── Stage 5: Validating Scene Plan ────────────────────────
      manager.transitionTo("validating_scene_plan");
      console.log(`[Production] Stage: validating_scene_plan`);
      profiler.startStage("validating_scene_plan");

      const planVal = validateAndRepairScenePlan(rawBlueprint);
      const blueprint = planVal.blueprint;

      if (planVal.repaired) {
        manager.addWarning(`Scene blueprint auto-repaired: ${planVal.warnings.join("; ")}`);
      }

      // ── Visual Diversity Validation Pass ───────────────────────
      const diversityReport = validateVisualDiversity(blueprint);
      const diversityPath = path.join(projectDir, "visual_diversity_report.json");
      fs.writeFileSync(diversityPath, JSON.stringify(diversityReport, null, 2), "utf-8");
      if (diversityReport.warnings.length > 0) {
        for (const w of diversityReport.warnings) {
          manager.addWarning(`Diversity: ${w}`);
        }
      }
      console.log(`[Production] ${diversityReport.summary}`);
      profiler.completeStage("validating_scene_plan", {
        notes: diversityReport.summary,
      });

      fs.writeFileSync(blueprintPath, JSON.stringify(blueprint, null, 2), "utf-8");
      manager.updateArtifacts({ blueprint_path: blueprintPath });
      manager.updateLineage({ scene_plan_id: blueprint.title });

      // ── Stage 6: Generating Narration & Measuring Audio ───────
      manager.transitionTo("generating_narration");
      console.log(`[Production] Stage: generating_narration`);
      profiler.startStage("generating_narration", { model: "gemini-3.8-flash-tts" });

      const narrationResult = await generateNarrationForBlueprint(
        blueprint,
        projectDir,
        {
          forceMock: options.force_mock_audio || (options.skip_render && !!checkCredentials()),
        }
      );
      profiler.completeStage("generating_narration");

      manager.transitionTo("measuring_audio");
      console.log(`[Production] Stage: measuring_audio (${narrationResult.totalDurationSeconds.toFixed(2)}s)`);
      profiler.startStage("measuring_audio");

      manager.updateArtifacts({
        narration_dir: path.join(projectDir, "narration"),
        narration_audio_path: narrationResult.fullAudioPath,
      });
      profiler.completeStage("measuring_audio", {
        notes: `Total measured duration: ${narrationResult.totalDurationSeconds.toFixed(2)}s`,
      });

      // ── Stage 7: Generating Captions ──────────────────────────
      manager.transitionTo("generating_captions");
      console.log(`[Production] Stage: generating_captions`);
      profiler.startStage("generating_captions");

      const captionsResult = generateCaptionsForBlueprint(
        blueprint,
        narrationResult.audioMap,
        blueprint.fps || 30,
        projectDir
      );

      manager.updateArtifacts({
        srt_path: captionsResult.srtPath,
        vtt_path: captionsResult.vttPath,
      });

      // Attach subtitle segments to blueprint so Remotion burns captions into video
      (blueprint as unknown as Record<string, unknown>).subtitles = captionsResult.segments;
      profiler.completeStage("generating_captions", {
        notes: `Generated ${captionsResult.segments?.length || 0} subtitle segments`,
      });

      // ── Stage 8: Preparing Visual Assets ──────────────────────
      manager.transitionTo("preparing_visual_assets");
      console.log(`[Production] Stage: preparing_visual_assets`);
      profiler.startStage("preparing_visual_assets");

      const assetManager = new AssetManager();
      const enrichment = await assetManager.enrichBlueprintWithAssets(
        blueprint,
        path.join(this.config.outputBaseDir, ".asset_cache")
      );
      if (enrichment.enrichedCount > 0) {
        console.log(`[Production] Enriched ${enrichment.enrichedCount} scene(s) with visual assets`);
      }
      if (enrichment.warnings.length > 0) {
        for (const w of enrichment.warnings) {
          manager.addWarning(w);
        }
      }

      const manifest = assetManager.getManifest();
      fs.writeFileSync(
        path.join(projectDir, "asset_manifest.json"),
        JSON.stringify(manifest, null, 2),
        "utf-8"
      );
      profiler.completeStage("preparing_visual_assets", {
        objectsGenerated: { assets: enrichment.enrichedCount },
        notes: `${enrichment.enrichedCount} visual assets resolved`,
      });

      // ── Stage 8b: Directing Post-Production ───────────────────
      manager.transitionTo("directing_post_production");
      console.log(`[Production] Stage: directing_post_production`);
      profiler.startStage("directing_post_production");

      const director = new PostProductionDirector();
      editingPlan = director.directPostProduction(
        blueprint,
        script,
        projectDir,
        {
          forceDeterministic: options.force_deterministic,
          projectId,
          jobId: job.job_id,
        }
      );

      const editingPlanPath = path.join(projectDir, "editing_plan.json");
      fs.writeFileSync(editingPlanPath, JSON.stringify(editingPlan, null, 2), "utf-8");
      manager.updateArtifacts({ editing_plan_path: editingPlanPath });

      // Attach editing plan to blueprint for Remotion compositions
      blueprint.editing_plan = editingPlan;

      profiler.completeStage("directing_post_production", {
        objectsGenerated: {
          beats: editingPlan.events.length,
        },
        notes: `${editingPlan.events.length} motion beats, ${editingPlan.sound_cues.length} SFX cues (interval: ${editingPlan.pacing.average_beat_interval_seconds.toFixed(2)}s)`,
      });

      // ── Stage 9: Assembling Composition & Audio Mix ───────────
      manager.transitionTo("assembling_composition");
      console.log(`[Production] Stage: assembling_composition`);
      profiler.startStage("assembling_composition");

      const defaultBgm = path.resolve(
        process.cwd(),
        "assets",
        "audio",
        "music",
        "cyber_ambient_pulse.wav"
      );
      const audioMixPlan: AudioMixPlan = {
        narration_audio_path: narrationResult.fullAudioPath,
        background_music_path: options.background_music ? defaultBgm : undefined,
        music_volume: 0.20,
        ducking_enabled: true,
        ducking_attenuation_db: -16,
        fade_in_seconds: 1,
        fade_out_seconds: 2,
        voice_only: !options.background_music,
        sfx_cues: editingPlan?.sound_cues,
      };

      const mixResult = await mixAudioTracks(audioMixPlan, path.join(projectDir, "narration"));
      console.log(`[Production] Master audio ready: ${mixResult.mixedAudioPath}`);

      // Overwrite blueprint with final measured audio timings and editing plan
      fs.writeFileSync(blueprintPath, JSON.stringify(blueprint, null, 2), "utf-8");
      profiler.completeStage("assembling_composition");

      // ── Stage 10: Rendering Video ─────────────────────────────
      let renderPath: string | undefined;

      if (!options.skip_render) {
        manager.transitionTo("rendering_video");
        console.log(`[Production] Stage: rendering_video`);
        profiler.startStage("rendering_video");

        const renderRes = await renderProductionVideo(
          blueprint,
          projectDir,
          mixResult.mixedAudioPath,
          {
            compositionId: "ProductionVideo",
          }
        );

        renderPath = renderRes.renderPath;
        manager.updateArtifacts({ render_path: renderPath });
        manager.updateLineage({ render_id: path.basename(renderPath) });
        profiler.completeStage("rendering_video", { notes: renderPath });

        // ── Stage 11: Validating Render (Automated QA) ────────────
        manager.transitionTo("validating_render");
        console.log(`[Production] Stage: validating_render`);
        profiler.startStage("validating_render");

        const qaReport = await inspectRenderQuality(renderPath, {
          jobId: job.job_id,
          projectId,
          blueprint,
        });

        manager.updateArtifacts({
          quality_report_path: path.join(path.dirname(renderPath), "quality_report.json"),
        });

        manager.complete(qaReport.status === "failed" ? "failed" : "completed");
        console.log(`\n✓ Production Complete! Final MP4: ${renderPath}`);
        profiler.completeStage("validating_render", {
          notes: `Status: ${qaReport.status}`,
        });

        // Record generation in persistent history for anti-repetition & audit
        getGenerationHistoryManager().recordGeneration({
          generation_id: job.job_id,
          project_id: projectId,
          topic: jobConfig.topic || blueprint.topic || "Autonomous Video",
          title: blueprint.title,
          timestamp: new Date().toISOString(),
          theme_preset: blueprint.theme_preset || "cyber_editorial",
          aspect_ratio: blueprint.aspect_ratio,
          generation_seed: blueprint.generation_seed || 0,
          scene_sequence: blueprint.scenes.map((s) => s.scene_type),
          total_duration_seconds: blueprint.target_duration_seconds,
          scenes_count: blueprint.scenes.length,
        });

        return {
          job: manager.getJob(),
          success: qaReport.status !== "failed",
          storyboard,
          blueprint,
          editingPlan,
          qualityReport: qaReport,
        };
      } else {
        // Skip render flag (e.g. for rapid pipeline validation)
        console.log("[Production] Skipping Remotion render as requested by config.");
        manager.complete("completed");

        // Record generation in persistent history even when render is skipped
        getGenerationHistoryManager().recordGeneration({
          generation_id: job.job_id,
          project_id: projectId,
          topic: jobConfig.topic || blueprint.topic || "Autonomous Video",
          title: blueprint.title,
          timestamp: new Date().toISOString(),
          theme_preset: blueprint.theme_preset || "cyber_editorial",
          aspect_ratio: blueprint.aspect_ratio,
          generation_seed: blueprint.generation_seed || 0,
          scene_sequence: blueprint.scenes.map((s) => s.scene_type),
          total_duration_seconds: blueprint.target_duration_seconds,
          scenes_count: blueprint.scenes.length,
        });

        return {
          job: manager.getJob(),
          success: true,
          storyboard,
          blueprint,
          editingPlan,
        };
      }
    } catch (err) {
      const activeStage = manager.getJob().current_stage;
      const errMsg = (err as Error).message || String(err);
      const isTimeout =
        errMsg.toLowerCase().includes("timed out") || errMsg.toLowerCase().includes("timeout");
      profiler.failStage(activeStage, isTimeout ? "timeout" : "api_error", errMsg);
      console.error(`[Production] Error during stage ${activeStage}:`, err);
      manager.fail(activeStage, errMsg);
      return {
        job: manager.getJob(),
        success: false,
        storyboard,
      };
    }
  }
}
