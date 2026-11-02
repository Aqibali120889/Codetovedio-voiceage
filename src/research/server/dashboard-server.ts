/**
 * Research Dashboard Server & Interactive Web UI.
 * Lightweight zero-dependency HTTP server providing full REST API and rich UI.
 */

import http from "http";
import fs from "fs";
import path from "path";
import { getSourceRegistry } from "../registry/source-registry";
import { getJobManager } from "../jobs/job-manager";
import { getAllBriefs, getBrief } from "../storage/brief-storage";
import { ResearchOrchestrator } from "../orchestration/research-orchestrator";
import { sendBriefToScriptwriter } from "../adapter/scriptwriter-adapter";
import type { ResearchRequest } from "../types";
import { getJobStore } from "../../production/state-machine/job-store";
import { ProductionOrchestrator } from "../../production/orchestrator";
import { getDailyNewsMonitor } from "../../production/news/daily-news-monitor";
import { getBrandManager } from "../../production/branding/brand-manager";
import type { ProductionInput, ProductionJobConfig } from "../../production/types";

const DISCOVERED_TRENDS_PATH = path.resolve(process.cwd(), "data/research/topics/discovered_trends.json");

export function createDashboardServer(port = 3333): http.Server {
  const registry = getSourceRegistry();
  const jobManager = getJobManager();
  const orchestrator = new ResearchOrchestrator();

  const handleRequest = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const host = req.headers.host || `localhost:${port}`;
    let reqUrl: URL;
    try {
      reqUrl = new URL(req.url || "/", `http://${host}`);
    } catch {
      reqUrl = new URL("/", `http://${host}`);
    }
    const pathname = reqUrl.pathname || "/";
    const method = req.method || "GET";

    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Helper for JSON response
    const sendJson = (statusCode: number, data: unknown) => {
      res.writeHead(statusCode, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data, null, 2));
    };

    // Helper to read JSON request body
    const readBody = (): Promise<unknown> => {
      return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch (e) {
            reject(e);
          }
        });
        req.on("error", reject);
      });
    };

    try {
      // ── API: Discovered Trends ─────────────────────────────────
      if (pathname === "/api/trends" && method === "GET") {
        let trends = [];
        if (fs.existsSync(DISCOVERED_TRENDS_PATH)) {
          trends = JSON.parse(fs.readFileSync(DISCOVERED_TRENDS_PATH, "utf-8"));
        } else {
          // Run initial quick discovery
          trends = await orchestrator.runTrendDiscovery();
        }
        sendJson(200, { success: true, count: trends.length, trends });
        return;
      }

      if (pathname === "/api/trends/discover" && method === "POST") {
        const body = (await readBody()) as { audience?: string; subject?: string; refreshFeeds?: boolean };
        const trends = await orchestrator.runTrendDiscovery({
          audience: body.audience,
          subject: body.subject,
          refreshFeeds: body.refreshFeeds ?? true,
        });
        sendJson(200, { success: true, count: trends.length, trends });
        return;
      }

      // ── API: Sources ───────────────────────────────────────────
      if (pathname === "/api/sources" && method === "GET") {
        sendJson(200, { success: true, sources: registry.getAllSources() });
        return;
      }

      if (pathname.startsWith("/api/sources/") && pathname.endsWith("/toggle") && method === "POST") {
        const parts = pathname.split("/");
        const sourceId = parts[3];
        const success = registry.toggleSource(sourceId);
        sendJson(200, { success, source: registry.getSource(sourceId) });
        return;
      }

      // ── API: Research Jobs ─────────────────────────────────────
      if (pathname === "/api/jobs" && method === "GET") {
        sendJson(200, { success: true, jobs: jobManager.getAllJobs() });
        return;
      }

      if (pathname.startsWith("/api/jobs/") && method === "GET") {
        const jobId = pathname.replace("/api/jobs/", "");
        const job = jobManager.getJob(jobId);
        if (!job) {
          sendJson(404, { success: false, error: "Job not found" });
          return;
        }
        sendJson(200, { success: true, job });
        return;
      }

      // ── API: Initiate Research ─────────────────────────────────
      if (pathname === "/api/research" && method === "POST") {
        const body = (await readBody()) as ResearchRequest;
        if (!body.topic && !body.question) {
          sendJson(400, { success: false, error: "Topic or question is required." });
          return;
        }

        // Run research asynchronously so HTTP response is instant
        const request: ResearchRequest = {
          mode: body.mode || "topic_deep_dive",
          topic: body.topic,
          question: body.question,
          audience: body.audience,
          subject: body.subject,
          depth: body.depth || "standard",
        };

        // Create job and start background execution
        const initialJob = jobManager.createJob(request);

        // Async execution
        orchestrator.executeResearch(request).catch((err) => {
          console.error(`[dashboard-server] Background research error:`, err);
        });

        sendJson(202, {
          success: true,
          message: "Research job started",
          job_id: initialJob.job_id,
        });
        return;
      }

      // ── API: Saved Briefs ──────────────────────────────────────
      if (pathname === "/api/briefs" && method === "GET") {
        const briefs = getAllBriefs().map((b) => ({
          brief_id: b.metadata.brief_id,
          topic: b.metadata.research_topic,
          created_at: b.metadata.created_at,
          depth: b.metadata.research_depth,
          mode: b.metadata.research_mode,
          audience: b.metadata.target_audience,
          keyFindingsCount: b.key_findings.length,
          factsCount: b.facts_and_statistics.length,
          recommendedAngle: b.scriptwriter_handoff.recommended_angle_title,
        }));
        sendJson(200, { success: true, count: briefs.length, briefs });
        return;
      }

      if (pathname.startsWith("/api/briefs/") && !pathname.endsWith("/send-to-scriptwriter") && method === "GET") {
        const briefId = pathname.replace("/api/briefs/", "");
        const brief = getBrief(briefId);
        if (!brief) {
          sendJson(404, { success: false, error: "Brief not found" });
          return;
        }
        sendJson(200, { success: true, brief });
        return;
      }

      // ── API: Send Brief to Scriptwriter ────────────────────────
      if (pathname.startsWith("/api/briefs/") && pathname.endsWith("/send-to-scriptwriter") && method === "POST") {
        const parts = pathname.split("/");
        const briefId = parts[3];
        const body = (await readBody()) as { platform?: string; target_duration_seconds?: number };

        try {
          console.log(`[dashboard-server] Triggering scriptwriter handoff for brief ${briefId}...`);
          const result = await sendBriefToScriptwriter(briefId, {
            platform: body.platform,
            target_duration_seconds: body.target_duration_seconds,
          });

          sendJson(200, {
            success: true,
            message: "Dispatched to Milestone 1 Video Pipeline",
            pipelineResult: result,
          });
        } catch (err) {
          sendJson(500, { success: false, error: (err as Error).message });
        }
        return;
      }

      // ── API: Production Jobs ───────────────────────────────────
      if (pathname === "/api/production/jobs" && method === "GET") {
        const jobs = getJobStore().getAll();
        sendJson(200, { success: true, count: jobs.length, jobs });
        return;
      }

      if (pathname.startsWith("/api/production/jobs/") && method === "GET") {
        const jobId = pathname.replace("/api/production/jobs/", "");
        const job = getJobStore().get(jobId);
        if (!job) {
          sendJson(404, { success: false, error: "Production job not found" });
          return;
        }
        sendJson(200, { success: true, job });
        return;
      }

      // ── API: Trigger Video Production ──────────────────────────
      if (pathname === "/api/production/produce" && method === "POST") {
        const body = (await readBody()) as {
          mode?: "brief_id" | "topic" | "script";
          brief_id?: string;
          topic?: string;
          aspect_ratio?: "16:9" | "9:16" | "1:1";
          theme_preset?: string;
          background_music?: boolean;
          target_duration_seconds?: number;
          skip_render?: boolean;
        };

        let input: ProductionInput;
        if (body.brief_id) {
          input = { mode: "brief_id", briefId: body.brief_id };
        } else if (body.topic) {
          input = { mode: "topic", topic: body.topic };
        } else {
          sendJson(400, { success: false, error: "Must specify brief_id or topic." });
          return;
        }

        const options: Partial<ProductionJobConfig> = {
          aspect_ratio: body.aspect_ratio || "9:16",
          theme_preset: body.theme_preset || "cyber_editorial",
          background_music: body.background_music ?? false,
          target_duration_seconds: body.target_duration_seconds || 45,
          skip_render: body.skip_render ?? false,
        };

        const prodOrchestrator = new ProductionOrchestrator();
        prodOrchestrator.runProduction(input, options).catch((e) => {
          console.error("[dashboard-server] Background production run failed:", e);
        });

        sendJson(202, {
          success: true,
          message: "Production job launched",
        });
        return;
      }

      // ── API: Daily Tech News ───────────────────────────────────
      if (pathname === "/api/news/daily" && method === "GET") {
        const monitor = getDailyNewsMonitor();
        let items = monitor.getCachedDailyNews();
        if (items.length === 0) {
          items = await monitor.discoverDailyNews(24);
        }
        sendJson(200, { success: true, count: items.length, items });
        return;
      }

      if (pathname === "/api/news/refresh" && method === "POST") {
        const monitor = getDailyNewsMonitor();
        const items = await monitor.discoverDailyNews(24);
        sendJson(200, { success: true, count: items.length, items });
        return;
      }

      // ── API: Brand Profiles ────────────────────────────────────
      if (pathname === "/api/branding" && method === "GET") {
        const bm = getBrandManager();
        sendJson(200, { success: true, profiles: bm.listProfiles() });
        return;
      }

      // ── Media File Streaming ───────────────────────────────────
      if (pathname.startsWith("/media/") && method === "GET") {
        const rel = pathname.replace("/media/", "");
        const filePath = path.resolve(process.cwd(), "data", rel);
        const dataRoot = path.resolve(process.cwd(), "data");

        if (filePath.startsWith(dataRoot) && fs.existsSync(filePath)) {
          const ext = path.extname(filePath).toLowerCase();
          const contentType =
            ext === ".mp4"
              ? "video/mp4"
              : ext === ".png"
              ? "image/png"
              : ext === ".json"
              ? "application/json"
              : ext === ".srt" || ext === ".vtt"
              ? "text/plain"
              : "application/octet-stream";

          res.writeHead(200, { "Content-Type": contentType });
          const stream = fs.createReadStream(filePath);
          stream.on("error", (err) => {
            console.error(`[dashboard-server] Media stream error for ${filePath}:`, err);
            if (!res.headersSent) {
              res.writeHead(500);
            }
            res.end();
          });
          res.on("close", () => {
            stream.destroy();
          });
          stream.pipe(res);
          return;
        } else {
          sendJson(404, { success: false, error: "Media file not found" });
          return;
        }
      }

      // ── Static Web UI Dashboard ────────────────────────────────
      if (pathname === "/" || pathname === "/dashboard") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(renderDashboardHtml());
        return;
      }

      // 404
      sendJson(404, { success: false, error: "Endpoint not found" });
    } catch (err) {
      console.error(`[dashboard-server] Request error:`, err);
      if (!res.headersSent) {
        sendJson(500, { success: false, error: (err as Error).message });
      }
    }
  };

  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      console.error("[dashboard-server] Unhandled request error:", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: (err as Error).message }));
      }
    });
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[dashboard-server] Error: Port ${port} is already in use.`);
    } else {
      console.error(`[dashboard-server] Server error:`, err);
    }
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`\n╔════════════════════════════════════════════════════════╗`);
    console.log(`║   Voiceage Research Dashboard — Live at:               ║`);
    console.log(`║   http://localhost:${port}                                ║`);
    console.log(`╚════════════════════════════════════════════════════════╝\n`);
  });

  return server;
}

/**
 * Embedded Single Page Application HTML for the Research Dashboard.
 */
function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Voiceage Systems — Trend Discovery & Deep Research Studio</title>
  <style>
    :root {
      --bg: #0B0B0B;
      --card-bg: #141414;
      --card-border: #222222;
      --accent: #FF5F00;
      --accent-glow: rgba(255, 95, 0, 0.25);
      --green: #00C853;
      --blue: #0EA5E9;
      --text: #F3F4F6;
      --text-muted: #9CA3AF;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font);
      line-height: 1.5;
      padding-bottom: 60px;
    }
    header {
      background: #111;
      border-bottom: 1px solid var(--card-border);
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 800;
      font-size: 18px;
      letter-spacing: 1px;
    }
    .logo-badge {
      background: var(--accent);
      color: #000;
      font-size: 11px;
      font-weight: 900;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    nav { display: flex; gap: 8px; }
    .nav-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .nav-btn:hover { color: #fff; background: #1a1a1a; }
    .nav-btn.active {
      color: var(--accent);
      background: rgba(255, 95, 0, 0.1);
      border-color: rgba(255, 95, 0, 0.3);
    }
    .container {
      max-width: 1200px;
      margin: 32px auto;
      padding: 0 24px;
    }
    .panel { display: none; }
    .panel.active { display: block; }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 24px;
      margin-bottom: 24px;
      transition: border-color 0.2s;
    }
    .card:hover { border-color: #333; }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
    h2 { font-size: 20px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }
    p.subtitle { color: var(--text-muted); font-size: 14px; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px; }
    .btn {
      background: var(--accent);
      color: #000;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn:hover { filter: brightness(1.1); box-shadow: 0 0 15px var(--accent-glow); }
    .btn-secondary {
      background: #222;
      color: #fff;
      border: 1px solid #333;
    }
    .btn-secondary:hover { background: #2a2a2a; box-shadow: none; }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 13px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    input, select, textarea {
      width: 100%;
      background: #0d0d0d;
      border: 1px solid #282828;
      border-radius: 6px;
      padding: 12px 14px;
      color: #fff;
      font-size: 14px;
      font-family: inherit;
    }
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: var(--accent);
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-primary { background: rgba(0, 200, 83, 0.15); color: var(--green); border: 1px solid rgba(0, 200, 83, 0.3); }
    .badge-editorial { background: rgba(14, 165, 233, 0.15); color: var(--blue); border: 1px solid rgba(14, 165, 233, 0.3); }
    .badge-community { background: rgba(255, 179, 0, 0.15); color: #FFB300; border: 1px solid rgba(255, 179, 0, 0.3); }
    .score-circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: rgba(255, 95, 0, 0.15);
      border: 1px solid var(--accent);
      color: var(--accent);
      font-weight: 800;
      font-size: 14px;
    }
    .progress-bar {
      height: 8px;
      background: #222;
      border-radius: 4px;
      overflow: hidden;
      margin: 12px 0;
    }
    .progress-fill {
      height: 100%;
      background: var(--accent);
      width: 0%;
      transition: width 0.3s;
    }
    .modal {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      z-index: 200;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .modal.active { display: flex; }
    .modal-content {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      max-width: 900px;
      width: 100%;
      max-height: 85vh;
      overflow-y: auto;
      padding: 32px;
      position: relative;
    }
    .close-btn {
      position: absolute;
      top: 20px; right: 20px;
      background: #222; border: none; color: #fff;
      width: 32px; height: 32px; border-radius: 50%;
      cursor: pointer; font-size: 16px; font-weight: bold;
    }
  </style>
</head>
<body>
  <header>
    <div class="logo">
      <span class="logo-badge">STUDIO</span>
      <span>VOICEAGE CONTENT & VIDEO ENGINE</span>
    </div>
    <nav>
      <button class="nav-btn active" onclick="switchTab('trends')">Discover Trends</button>
      <button class="nav-btn" onclick="switchTab('news')">Daily Tech News</button>
      <button class="nav-btn" onclick="switchTab('research')">Research Topic</button>
      <button class="nav-btn" onclick="switchTab('briefs')">Saved Briefs</button>
      <button class="nav-btn" onclick="switchTab('production')">Production Studio</button>
      <button class="nav-btn" onclick="switchTab('renders')">Video Renders & QA</button>
      <button class="nav-btn" onclick="switchTab('sources')">Sources</button>
      <button class="nav-btn" onclick="switchTab('jobs')">Job Telemetry</button>
    </nav>
  </header>

  <div class="container">
    <!-- PANEL: TRENDS -->
    <section id="panel-trends" class="panel active">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
        <div>
          <h1>Discovered Content Trends</h1>
          <p class="subtitle">Clustered developments and evidence-backed signals across verified tech & industry sources.</p>
        </div>
        <button class="btn" onclick="refreshTrends()">🔄 Discover Now</button>
      </div>
      <div id="trends-container" class="grid">
        <p style="color: var(--text-muted)">Loading trending topics...</p>
      </div>
    </section>

    <!-- PANEL: RESEARCH TOPIC -->
    <section id="panel-research" class="panel">
      <h1>Deep Topic Investigation</h1>
      <p class="subtitle">Dispatch Google ADK agents to formulate a plan, retrieve documents, verify claims, and build a sourced brief.</p>

      <div class="card" style="max-width: 760px;">
        <div class="form-group">
          <label>Topic or Research Question</label>
          <input type="text" id="research-topic-input" placeholder="e.g. Why AI Agents Are Replacing Static Dashboards" value="Why AI Agents Are Replacing Static Dashboards">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group">
            <label>Target Audience</label>
            <input type="text" id="research-audience-input" value="engineering leaders, software architects, and founders">
          </div>
          <div class="form-group">
            <label>Research Depth</label>
            <select id="research-depth-select">
              <option value="quick">Quick (2-3 Subquestions, High Speed)</option>
              <option value="standard" selected>Standard (4-5 Subquestions, Balanced)</option>
              <option value="deep">Deep (Comprehensive Cross-checks)</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Research Mode</label>
          <select id="research-mode-select">
            <option value="topic_deep_dive" selected>Topic Deep Dive</option>
            <option value="custom_question">Custom Question</option>
            <option value="compare_alternatives">Compare Alternatives</option>
          </select>
        </div>
        <button class="btn" onclick="startResearch()" style="margin-top: 8px;">🚀 Launch Deep Research Agent</button>
      </div>

      <div id="live-job-status" class="card" style="display: none; max-width: 760px; border-color: var(--accent);">
        <h2>Research Agent Status <span id="job-status-badge" class="badge badge-primary">IN PROGRESS</span></h2>
        <p id="job-status-message" style="color: var(--text-muted); font-size: 14px;">Initializing research planner...</p>
        <div class="progress-bar"><div id="job-progress-fill" class="progress-fill"></div></div>
        <p style="font-size: 12px; color: #777;">Job ID: <span id="current-job-id"></span></p>
      </div>
    </section>

    <!-- PANEL: SAVED BRIEFS -->
    <section id="panel-briefs" class="panel">
      <h1>Saved Research Briefs</h1>
      <p class="subtitle">Audit verified briefs, review citations, and send straight into the video rendering pipeline.</p>
      <div id="briefs-container" class="grid">
        <p style="color: var(--text-muted)">Loading briefs...</p>
      </div>
    </section>

    <!-- PANEL: SOURCES -->
    <section id="panel-sources" class="panel">
      <h1>Configured Ingestion Sources</h1>
      <p class="subtitle">Trust levels, verified RSS/Atom feeds, and polling frequencies.</p>
      <div id="sources-container" class="grid">
        <p style="color: var(--text-muted)">Loading sources...</p>
      </div>
    </section>

    <!-- PANEL: JOBS TELEMETRY -->
    <section id="panel-jobs" class="panel">
      <h1>Research Job Telemetry</h1>
      <p class="subtitle">Execution audit log, stage durations, and error diagnostics.</p>
      <div id="jobs-container">
        <p style="color: var(--text-muted)">Loading job logs...</p>
      </div>
    </section>

    <!-- PANEL: DAILY TECH NEWS -->
    <section id="panel-news" class="panel">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
        <div>
          <h1>Daily Technology & AI News</h1>
          <p class="subtitle">Rolling 24-hour developments across Google News RSS and verified industry sources.</p>
        </div>
        <button class="btn" onclick="refreshDailyNews()">⚡ Refresh 24h News</button>
      </div>
      <div id="news-container" class="grid">
        <p style="color: var(--text-muted)">Loading 24h news...</p>
      </div>
    </section>

    <!-- PANEL: PRODUCTION STUDIO -->
    <section id="panel-production" class="panel">
      <h1>End-to-End Video Production Studio</h1>
      <p class="subtitle">Convert a verified Research Brief or Topic into a professionally branded MP4 video through one integrated workflow.</p>

      <div class="card" style="max-width: 800px;">
        <div class="form-group">
          <label>Select Saved Research Brief</label>
          <select id="prod-brief-select">
            <option value="">-- Choose a Saved Brief --</option>
          </select>
        </div>

        <div style="text-align: center; color: var(--text-muted); margin: 8px 0;">— OR ENTER A NEW TOPIC —</div>

        <div class="form-group">
          <label>Topic to Research & Produce</label>
          <input type="text" id="prod-topic-input" placeholder="e.g. Why AI Voice Agents Are Replacing Static Dashboards">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
          <div class="form-group">
            <label>Aspect Ratio</label>
            <select id="prod-aspect-ratio">
              <option value="9:16" selected>9:16 (Vertical Reel / Short)</option>
              <option value="16:9">16:9 (Landscape YouTube)</option>
              <option value="1:1">1:1 (Square Post)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Theme Preset</label>
            <select id="prod-theme-preset">
              <option value="cyberpunk_dark" selected>Cyberpunk Dark (Amber/Cyan)</option>
              <option value="terminal_matrix">Terminal Matrix (Green/Dark)</option>
              <option value="minimalist_light">Minimalist Light (Clean White)</option>
              <option value="editorial_slate">Editorial Slate (Corporate Blue)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Target Duration</label>
            <select id="prod-duration">
              <option value="30">30 seconds (Short/Punchy)</option>
              <option value="45" selected>45 seconds (Standard)</option>
              <option value="60">60 seconds (Comprehensive)</option>
            </select>
          </div>
        </div>

        <div class="form-group" style="display: flex; gap: 12px; align-items: center; margin-top: 8px;">
          <input type="checkbox" id="prod-bg-music" style="width: auto;">
          <label for="prod-bg-music" style="margin: 0; text-transform: none; cursor: pointer;">Enable Background Music & Audio Ducking</label>
        </div>

        <button class="btn" style="margin-top: 16px;" onclick="triggerProduction()">🎬 Start Full Production Run</button>
      </div>
    </section>

    <!-- PANEL: VIDEO RENDERS & QA -->
    <section id="panel-renders" class="panel">
      <h1>Rendered Videos & Quality Assurance</h1>
      <p class="subtitle">Completed production runs, stream metrics, automated QA reports, and media downloads.</p>
      
      <div id="video-player-container" class="card" style="display: none; max-width: 640px; margin-bottom: 24px;">
        <h3 id="player-title" style="margin-bottom: 12px;">Now Playing</h3>
        <video id="html5-player" controls style="width: 100%; border-radius: 8px; background: #000; max-height: 480px;"></video>
        <div style="display: flex; gap: 12px; margin-top: 12px;">
          <a id="download-mp4-btn" class="btn btn-secondary" href="#" download>⬇ Download MP4</a>
          <a id="download-srt-btn" class="btn btn-secondary" href="#" download>⬇ Download SRT</a>
          <a id="download-vtt-btn" class="btn btn-secondary" href="#" download>⬇ Download VTT</a>
        </div>
      </div>

      <div id="renders-container">
        <p style="color: var(--text-muted)">Loading completed productions...</p>
      </div>
    </section>
  </div>

  <!-- BRIEF MODAL -->
  <div id="brief-modal" class="modal">
    <div class="modal-content">
      <button class="close-btn" onclick="closeModal()">✕</button>
      <div id="brief-modal-body"></div>
    </div>
  </div>

  <script>
    function switchTab(tab) {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById('panel-' + tab).classList.add('active');

      if (tab === 'trends') loadTrends();
      if (tab === 'news') loadDailyNews();
      if (tab === 'briefs') loadBriefs();
      if (tab === 'production') loadProductionStudio();
      if (tab === 'renders') loadRenderedVideos();
      if (tab === 'sources') loadSources();
      if (tab === 'jobs') loadJobs();
    }

    async function loadTrends() {
      const res = await fetch('/api/trends');
      const data = await res.json();
      const container = document.getElementById('trends-container');
      if (!data.trends || data.trends.length === 0) {
        container.innerHTML = '<p style="color:#888;">No trends discovered yet. Click "Discover Now" above.</p>';
        return;
      }
      container.innerHTML = data.trends.map(t => \`
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
            <span class="badge badge-primary">\${t.category}</span>
            <div class="score-circle">\${t.trend_signals.overall_score}</div>
          </div>
          <h3 style="font-size:17px; margin-bottom:8px;">\${t.title}</h3>
          <p style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">\${t.summary.slice(0, 160)}...</p>
          <div style="font-size:12px; color:#888; margin-bottom:16px;">
            • \${t.trend_signals.independent_source_count} Independent Source(s) • Recency: \${t.trend_signals.recency_score}%
          </div>
          <button class="btn" onclick="researchFromTrend('\${encodeURIComponent(t.title)}')">Investigate Topic →</button>
        </div>
      \`).join('');
    }

    async function refreshTrends() {
      const btn = event.target;
      btn.innerText = '⏳ Polling Feeds...';
      await fetch('/api/trends/discover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      btn.innerText = '🔄 Discover Now';
      loadTrends();
    }

    function researchFromTrend(encodedTitle) {
      const title = decodeURIComponent(encodedTitle);
      document.getElementById('research-topic-input').value = title;
      document.querySelectorAll('.nav-btn')[1].click();
    }

    let activeJobPoll = null;

    async function startResearch() {
      const topic = document.getElementById('research-topic-input').value;
      const audience = document.getElementById('research-audience-input').value;
      const depth = document.getElementById('research-depth-select').value;
      const mode = document.getElementById('research-mode-select').value;

      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, audience, depth, mode })
      });
      const data = await res.json();
      if (data.job_id) {
        document.getElementById('live-job-status').style.display = 'block';
        document.getElementById('current-job-id').innerText = data.job_id;
        pollJob(data.job_id);
      }
    }

    function pollJob(jobId) {
      if (activeJobPoll) clearInterval(activeJobPoll);
      activeJobPoll = setInterval(async () => {
        const res = await fetch('/api/jobs/' + jobId);
        const data = await res.json();
        if (data.job) {
          const j = data.job;
          document.getElementById('job-status-message').innerText = j.message || j.stage;
          document.getElementById('job-progress-fill').style.width = j.progressPercent + '%';

          if (j.status === 'completed') {
            clearInterval(activeJobPoll);
            document.getElementById('job-status-badge').className = 'badge badge-primary';
            document.getElementById('job-status-badge').innerText = 'COMPLETED';
            setTimeout(() => {
              viewBrief(j.brief_id);
            }, 800);
          } else if (j.status === 'failed') {
            clearInterval(activeJobPoll);
            document.getElementById('job-status-badge').className = 'badge badge-community';
            document.getElementById('job-status-badge').innerText = 'FAILED';
          }
        }
      }, 1200);
    }

    async function loadBriefs() {
      const res = await fetch('/api/briefs');
      const data = await res.json();
      const container = document.getElementById('briefs-container');
      if (!data.briefs || data.briefs.length === 0) {
        container.innerHTML = '<p style="color:#888;">No research briefs generated yet.</p>';
        return;
      }
      container.innerHTML = data.briefs.map(b => \`
        <div class="card">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span class="badge badge-editorial">\${b.depth.toUpperCase()}</span>
            <span style="font-size:12px; color:#888;">\${b.created_at.split('T')[0]}</span>
          </div>
          <h3 style="font-size:18px; margin-bottom:8px;">\${b.topic}</h3>
          <p style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">\${b.recommendedAngle}</p>
          <div style="font-size:12px; color:#777; margin-bottom:16px;">
            \${b.keyFindingsCount} Findings • \${b.factsCount} Verified Facts
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-secondary" onclick="viewBrief('\${b.brief_id}')">Read Sourced Brief</button>
            <button class="btn" onclick="sendToScriptwriter('\${b.brief_id}')">🎬 Video Scriptwriter</button>
          </div>
        </div>
      \`).join('');
    }

    async function viewBrief(briefId) {
      const res = await fetch('/api/briefs/' + briefId);
      const data = await res.json();
      if (!data.brief) return;
      const b = data.brief;

      const body = document.getElementById('brief-modal-body');
      body.innerHTML = \`
        <span class="badge badge-primary">\${b.metadata.research_mode.toUpperCase()}</span>
        <h1 style="font-size:24px; margin: 12px 0 6px 0;">\${b.metadata.research_topic}</h1>
        <p style="color:var(--text-muted); font-size:13px; margin-bottom:20px;">Brief ID: \${b.metadata.brief_id} | Created: \${b.metadata.created_at}</p>

        <h3 style="color:var(--accent); font-size:16px; margin:16px 0 8px 0;">EXECUTIVE SUMMARY</h3>
        <p style="font-size:14px; line-height:1.6; margin-bottom:16px;">\${b.executive_summary.overview}</p>

        <h3 style="color:var(--accent); font-size:16px; margin:16px 0 8px 0;">KEY FINDINGS & CITATIONS</h3>
        \${b.key_findings.map(f => \`
          <div style="background:#111; padding:12px; border-radius:6px; margin-bottom:10px; border-left:3px solid var(--blue);">
            <strong style="font-size:14px;">\${f.title}</strong>
            <p style="font-size:13px; color:#ccc; margin-top:4px;">\${f.explanation}</p>
            <p style="font-size:11px; color:#777; margin-top:6px;">Evidence: \${f.supporting_evidence_ids.join(', ')} | Strength: \${f.evidence_strength}</p>
          </div>
        \`).join('')}

        <h3 style="color:var(--accent); font-size:16px; margin:16px 0 8px 0;">VERIFIED FACTS & STATISTICS</h3>
        <ul style="font-size:13px; margin-left:20px; margin-bottom:20px;">
          \${b.facts_and_statistics.map(s => \`<li style="margin-bottom:6px;"><strong>[\${s.evidence_id}]</strong> \${s.exact_claim_or_figure} <span style="color:#777;">(\${s.original_source})</span></li>\`).join('')}
        </ul>

        <h3 style="color:var(--accent); font-size:16px; margin:16px 0 8px 0;">RECOMMENDED VIDEO ANGLE</h3>
        <p style="font-size:14px; margin-bottom:8px;"><strong>Thesis:</strong> \${b.recommended_angle.main_thesis}</p>
        <div style="background:#181818; padding:12px; border-radius:6px; margin-bottom:20px;">
          \${b.recommended_angle.suggested_narrative_beats.map(beat => \`
            <div style="font-size:13px; margin-bottom:6px;">\${beat.beat_number}. <strong>\${beat.purpose.toUpperCase()}:</strong> \${beat.key_point} <span style="color:var(--accent);">[\${beat.suggested_visual}]</span></div>
          \`).join('')}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:24px; border-top:1px solid #222; padding-top:16px;">
          <button class="btn btn-secondary" onclick="closeModal()">Close</button>
          <button class="btn" onclick="sendToScriptwriter('\${b.metadata.brief_id}')">🎬 Send to Scriptwriter & Render</button>
        </div>
      \`;

      document.getElementById('brief-modal').classList.add('active');
    }

    function closeModal() {
      document.getElementById('brief-modal').classList.remove('active');
    }

    async function sendToScriptwriter(briefId) {
      if (!confirm('Send this research brief to the Milestone 1 Scriptwriting & Remotion Video Pipeline?')) return;
      alert('Dispatched brief to video pipeline. Progress can be monitored in the CLI or Remotion Studio.');
      const res = await fetch(\`/api/briefs/\${briefId}/send-to-scriptwriter\`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      if (data.success) {
        alert('Video Pipeline Succeeded! Project ID: ' + data.pipelineResult.projectId);
      } else {
        alert('Pipeline Error: ' + data.error);
      }
    }

    async function loadSources() {
      const res = await fetch('/api/sources');
      const data = await res.json();
      const container = document.getElementById('sources-container');
      container.innerHTML = data.sources.map(s => \`
        <div class="card">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span class="badge \${s.trustLevel === 'tier_1_primary' ? 'badge-primary' : s.trustLevel === 'tier_2_editorial' ? 'badge-editorial' : 'badge-community'}">\${s.trustLevel}</span>
            <span style="font-size:12px; color:\${s.enabled ? 'var(--green)' : '#666'};">\${s.enabled ? '● ENABLED' : '○ DISABLED'}</span>
          </div>
          <h3 style="font-size:16px;">\${s.name}</h3>
          <p style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">\${s.description || s.url}</p>
          <p style="font-size:11px; color:#777; margin-bottom:12px;">Poll interval: \${s.pollingFrequencyMinutes}m | Last fetched: \${s.lastFetchedAt ? s.lastFetchedAt.split('T')[1].slice(0, 5) : 'Never'}</p>
          <button class="btn btn-secondary" onclick="toggleSource('\${s.id}')">\${s.enabled ? 'Disable' : 'Enable'}</button>
        </div>
      \`).join('');
    }

    async function toggleSource(sourceId) {
      await fetch(\`/api/sources/\${sourceId}/toggle\`, { method: 'POST' });
      loadSources();
    }

    async function loadJobs() {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      const container = document.getElementById('jobs-container');
      if (!data.jobs || data.jobs.length === 0) {
        container.innerHTML = '<p style="color:#888;">No jobs logged.</p>';
        return;
      }
      container.innerHTML = data.jobs.map(j => \`
        <div class="card" style="margin-bottom:12px; padding:16px;">
          <div style="display:flex; justify-content:space-between;">
            <strong>\${j.job_id}</strong>
            <span class="badge \${j.status === 'completed' ? 'badge-primary' : j.status === 'failed' ? 'badge-community' : 'badge-editorial'}">\${j.status.toUpperCase()}</span>
          </div>
          <p style="font-size:13px; color:#ccc; margin-top:4px;">\${j.message || j.stage} (\${j.progressPercent}%)</p>
          <p style="font-size:11px; color:#777; margin-top:4px;">Started: \${j.started_at}</p>
        </div>
      \`).join('');
    }

    async function loadDailyNews() {
      const res = await fetch('/api/news/daily');
      const data = await res.json();
      const container = document.getElementById('news-container');
      if (!data.items || data.items.length === 0) {
        container.innerHTML = '<p style="color:#888;">No news items collected yet. Click Refresh above.</p>';
        return;
      }
      container.innerHTML = data.items.map(item => \`
        <div class="card">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span class="badge badge-editorial">\${item.category}</span>
            <span style="font-size:12px; color:var(--accent); font-weight:700;">\${item.age_hours}h ago</span>
          </div>
          <h3 style="font-size:16px; margin-bottom:8px;"><a href="\${item.url}" target="_blank" style="color:#fff; text-decoration:none;">\${item.title}</a></h3>
          <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">\${item.source}</p>
          <button class="btn btn-secondary" onclick="researchFromTrend('\${encodeURIComponent(item.title)}')">Investigate Story →</button>
        </div>
      \`).join('');
    }

    async function refreshDailyNews() {
      const btn = event.target;
      btn.innerText = '⏳ Ingesting 24h Feeds...';
      await fetch('/api/news/refresh', { method: 'POST' });
      btn.innerText = '⚡ Refresh 24h News';
      loadDailyNews();
    }

    async function loadProductionStudio() {
      const res = await fetch('/api/briefs');
      const data = await res.json();
      const select = document.getElementById('prod-brief-select');
      select.innerHTML = '<option value="">-- Choose a Saved Brief --</option>' + 
        (data.briefs || []).map(b => \`<option value="\${b.brief_id}">[\${b.brief_id}] \${b.topic}</option>\`).join('');
    }

    async function triggerProduction() {
      const briefId = document.getElementById('prod-brief-select').value;
      const topic = document.getElementById('prod-topic-input').value;
      const aspectRatio = document.getElementById('prod-aspect-ratio').value;
      const themePreset = document.getElementById('prod-theme-preset').value;
      const duration = parseInt(document.getElementById('prod-duration').value, 10);
      const bgMusic = document.getElementById('prod-bg-music').checked;

      if (!briefId && !topic) {
        alert('Please select a saved brief or enter a topic.');
        return;
      }

      const payload = {
        brief_id: briefId || undefined,
        topic: topic || undefined,
        aspect_ratio: aspectRatio,
        theme_preset: themePreset,
        target_duration_seconds: duration,
        background_music: bgMusic,
      };

      const res = await fetch('/api/production/produce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        alert('Production started! Check the "Video Renders & QA" tab for live progress.');
        document.querySelectorAll('.nav-btn')[5].click();
      } else {
        alert('Failed to start production: ' + data.error);
      }
    }

    async function loadRenderedVideos() {
      const res = await fetch('/api/production/jobs');
      const data = await res.json();
      const container = document.getElementById('renders-container');

      if (!data.jobs || data.jobs.length === 0) {
        container.innerHTML = '<p style="color:#888;">No video production jobs executed yet.</p>';
        return;
      }

      container.innerHTML = data.jobs.map(j => {
        const hasMp4 = !!j.artifacts?.render_path;
        const mp4Url = hasMp4 ? '/media/projects/' + j.project_id + '/render/final.mp4' : '';
        const srtUrl = j.artifacts?.srt_path ? '/media/projects/' + j.project_id + '/subtitles/captions.srt' : '';
        const vttUrl = j.artifacts?.vtt_path ? '/media/projects/' + j.project_id + '/subtitles/captions.vtt' : '';

        return \`
          <div class="card" style="margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span class="badge \${j.status === 'completed' ? 'badge-primary' : j.status === 'failed' ? 'badge-community' : 'badge-editorial'}">\${j.status.toUpperCase()}</span>
                <strong style="margin-left:10px; font-size:16px;">\${j.config.topic || j.lineage?.research_brief_id || j.job_id}</strong>
              </div>
              <span style="font-size:12px; color:#888;">Stage: \${j.current_stage}</span>
            </div>

            <div style="display:flex; gap:16px; margin-top:14px; font-size:12px; color:var(--text-muted);">
              <span>Project: <code>\${j.project_id}</code></span>
              <span>Theme: <code>\${j.config.theme_preset || 'cyberpunk_dark'}</code></span>
              <span>Aspect: <code>\${j.config.aspect_ratio || '9:16'}</code></span>
            </div>

            \${j.warnings && j.warnings.length > 0 ? \`
              <div style="margin-top:10px; font-size:12px; color:#f59e0b;">
                ⚠️ \${j.warnings.join(' | ')}
              </div>
            \` : ''}

            <div style="margin-top:16px; display:flex; gap:10px; align-items:center;">
              \${hasMp4 ? \`
                <button class="btn" onclick="playVideo('\${mp4Url}', '\${j.config.topic || j.job_id}', '\${srtUrl}', '\${vttUrl}')">▶ Watch Video</button>
                <a class="btn btn-secondary" href="\${mp4Url}" download>Download MP4</a>
              \` : \`
                <span style="font-size:13px; color:#777;">Rendering in progress or skipped...</span>
              \`}
              \${srtUrl ? \`<a class="btn btn-secondary" href="\${srtUrl}" download>SRT</a>\` : ''}
              \${vttUrl ? \`<a class="btn btn-secondary" href="\${vttUrl}" download>VTT</a>\` : ''}
            </div>
          </div>
        \`;
      }).join('');
    }

    function playVideo(mp4Url, title, srtUrl, vttUrl) {
      const container = document.getElementById('video-player-container');
      const player = document.getElementById('html5-player');
      const playerTitle = document.getElementById('player-title');

      playerTitle.innerText = 'Now Playing: ' + title;
      player.src = mp4Url;

      document.getElementById('download-mp4-btn').href = mp4Url;
      document.getElementById('download-srt-btn').href = srtUrl || '#';
      document.getElementById('download-vtt-btn').href = vttUrl || '#';

      container.style.display = 'block';
      player.play();
      container.scrollIntoView({ behavior: 'smooth' });
    }

    // Initial load
    loadTrends();
  </script>
</body>
</html>`;
}
