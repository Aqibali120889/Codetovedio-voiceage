import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Easing, AbsoluteFill } from 'remotion';

// =============================================================================
// COMPOSITION CONFIG (30-Sec Tech-Noir Terminal Whistleblower Blueprint)
// =============================================================================
export const compositionConfig = {
  id: 'ComputeIndependenceReel',
  durationInSeconds: 30,
  fps: 60,
  width: 1080,
  height: 1920,
};

// Sovereign Brand Design Tokens
const OBSIDIAN_BLACK = '#0B0B0B';
const NEON_ORANGE = '#FF5F00';
const MATRIX_GRAY = '#222222';
const CRIT_RED = '#FF3B30';
const PURE_WHITE = '#FFFFFF';
const ETHICAL_GREEN = '#00C853';
const MUTED_TELEMETRY = '#555555';

// Mock code arrays for continuous terminal simulation streams
const MOCK_SYSTEM_LOGS = [
  'SET INGESTION_SOURCE = LOCAL_HARDWARE',
  'LOAD WHISPER_LOCAL_VOICE_CORE... OK',
  'DECOUPLING PLATFORM MIDDLEWARE... PROCEED',
  'ERROR: 504_CLOUD_MIDDLEMAN_TIMEOUT',
  'CRITICAL: THIRD_PARTY_API_MARKUP_DETECTED',
  'STATUS: ROTATING_WEBHOOK_PAYLOADS',
  'INJECTING SUPABASE_VAULT_SCHEMAS... SUCCESS',
  'CONNECTING LIVEKIT_WEBRTC_AUDIO_STREAM',
  'OPTIMIZING VLLM_CONCURRENT_WORKER_POOL',
  'EXECUTING N8N_AUTONOMOUS_DATA_LOOPS',
];



// =============================================================================
// MAIN COMPONENT
// =============================================================================
const ComputeIndependenceReel: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Gen-Z Time Tracking & Variable Pace Triggers
  const currentSecond = Math.floor(frame / 60);
  const microFlicker = Math.floor(frame / 6) % 2 === 0;
  const terminalCharCount = Math.floor(frame * 2.5);

  const snapEase = Easing.bezier(0.16, 1, 0.3, 1);
  const rapidPulse = (frame % 30) / 30;
  const popScale = interpolate(rapidPulse, [0, 0.1, 1], [0.93, 1.02, 1], { easing: snapEase });

  // Terminal Jitter Camera Calculations (Triggered on errors and phase shifts)
  const isJitterActive = (currentSecond >= 10 && currentSecond < 15) || currentSecond === 2 || currentSecond === 16;
  const cameraShakeX = isJitterActive ? Math.sin(frame * 2.3) * 4 : 0;
  const cameraShakeY = isJitterActive ? Math.cos(frame * 1.9) * 4 : 0;

  // Master Scanning Laser Horizon Logic (Runs 0-30s continuously across the vertical matrix)
  const masterScannerY = interpolate(frame, [0, 1800], [-50, height + 50], { easing: Easing.linear });

  // ---------------------------------------------------------------------------
  // INTERPOLATION PATH CALCULATIONS (Bulletproof Bounds Management)
  // ---------------------------------------------------------------------------
  // Scene 2: Raw Cloud Billing Ledger Counter Calculations
  const cloudMarkupCounter = interpolate(frame, [300, 600], [0.01, 0.28], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Scene 4: Countdown Collapse Tracking Vectors
  const pipelineClock = interpolate(frame, [900, 1200], [5.00, 0.00], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const conversionCollapse = interpolate(frame, [960, 1200], [100, 20], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: snapEase });

  // Scene 5: Sovereign Architecture Node Loading Parameters
  const path1Progress = interpolate(frame, [1200, 1320], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: snapEase });
  const path2Progress = interpolate(frame, [1320, 1440], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: snapEase });
  const node1Active = frame >= 1200;
  const node2Active = frame >= 1320;
  const node3Active = frame >= 1440;

  return (
    <AbsoluteFill style={{ backgroundColor: OBSIDIAN_BLACK, fontFamily: 'monospace', overflow: 'hidden' }}>

      {/* 1. CRT SCREEN SCANLINE OVERLAY EFFECT */}
      <div style={{
        position: 'absolute', width: '100%', height: '100%', zIndex: 999, pointerEvents: 'none',
        background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
        backgroundSize: '100% 4px, 6px 100%', opacity: 0.85
      }} />

      {/* 2. BACKGROUND BLUEPRINT GRID SYSTEM (Jitters during network breaks) */}
      <svg width={width} height={height} style={{ position: 'absolute', top: cameraShakeY, left: cameraShakeX, opacity: 0.15 }}>
        {Array.from({ length: 45 }).map((_, i) => (
          <line key={`h-${i}`} x1="0" y1={i * 45} x2={width} y2={i * 45} stroke={MATRIX_GRAY} strokeWidth="1" />
        ))}
        {Array.from({ length: 25 }).map((_, i) => (
          <line key={`v-${i}`} x1={i * 45} y1="0" x2={i * 45} y2={height} stroke={MATRIX_GRAY} strokeWidth="1" />
        ))}
      </svg>

      {/* =======================================================================
          3. WHISTLEBLOWER TIMELINE ROUTER ENGINE (Changes layout every second)
          ======================================================================= */}
      <div style={{ transform: `scale(${popScale}) translate(${cameraShakeX}px, ${cameraShakeY}px)`, width: '100%', height: '100%', position: 'relative' }}>

        {/* --- SCENE 00 (0-2s): SYSTEM CORRUPTION WARNING --- */}
        {currentSecond >= 0 && currentSecond < 2 && (
          <AbsoluteFill style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px' }}>
            <div style={{ border: `2px solid ${NEON_ORANGE}`, padding: '40px', backgroundColor: '#0D0D0D', boxShadow: `0 0 30px ${NEON_ORANGE}22` }}>
              <div style={{ color: NEON_ORANGE, fontSize: 24, fontWeight: 900, marginBottom: 15, letterSpacing: 4 }}>[WARNING: EXPOSURE_LOG]</div>
              <h1 style={{ color: PURE_WHITE, fontSize: 80, fontWeight: 900, lineHeight: 1.0, margin: 0, textTransform: 'uppercase' }}>
                THEY ARE <br />OVERCHARGING <br />YOU <span style={{ color: NEON_ORANGE }}>1,000%</span>
              </h1>
            </div>
          </AbsoluteFill>
        )}

        {/* --- SCENE 01 (2-5s): INITIAL WHISTLEBLOWER INGEST --- */}
        {currentSecond >= 2 && currentSecond < 5 && (
          <AbsoluteFill style={{ padding: '80px 60px' }}>
            <span style={{ color: NEON_ORANGE, fontSize: 24, letterSpacing: 2 }}>root@voiceage:~# cat secret_infrastructure_costs.sh</span>
            <div style={{ color: '#A0A0A0', fontSize: 28, lineHeight: 1.5, marginTop: 40, fontFamily: 'monospace' }}>
              {`{
  "industry_secret": "Autonomous voice data costs pennies,",
  "cloud_monopoly": "But third-party wrappers hide the margins",
  "status": "Exposing truth to infrastructure owners..."
}`.substring(0, terminalCharCount)}
              <span style={{ color: NEON_ORANGE, opacity: microFlicker ? 1 : 0 }}>▉</span>
            </div>
          </AbsoluteFill>
        )}

        {/* --- SCENE 02 (5-10s): THE CLOSED API MONOPOLY LEDGER --- */}
        {currentSecond >= 5 && currentSecond < 10 && (
          <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px' }}>
            <h2 style={{ color: PURE_WHITE, fontSize: 44, fontWeight: 900, marginBottom: 40, letterSpacing: 1 }}>THE CLOSED-SOURCE API TAX</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              <div style={{ backgroundColor: '#0E0E0E', border: `1px solid ${MATRIX_GRAY}`, padding: '30px', borderRadius: '4px' }}>
                <span style={{ color: MUTED_TELEMETRY, fontSize: 20 }}>RAW CORE COMPUTE</span>
                <h3 style={{ color: ETHICAL_GREEN, fontSize: 64, margin: '15px 0 0 0' }}>$0.01<span style={{ fontSize: 20 }}>/min</span></h3>
              </div>
              <div style={{ backgroundColor: '#0E0E0E', border: `1px solid ${CRIT_RED}`, padding: '30px', borderRadius: '4px' }}>
                <span style={{ color: CRIT_RED, fontSize: 20 }}>MIDDLEMAN WRAPPER</span>
                <h3 style={{ color: CRIT_RED, fontSize: 64, margin: '15px 0 0 0' }}>${cloudMarkupCounter.toFixed(2)}<span style={{ fontSize: 20 }}>/min</span></h3>
              </div>
            </div>
            <p style={{ color: MUTED_TELEMETRY, fontSize: 24, marginTop: 30, lineHeight: 1.4 }}>They trap your enterprise inside closed systems to collect a 10x rent markup.</p>
          </AbsoluteFill>
        )}

        {/* --- SCENE 03 (10-15s): THE TRENDING TECH HOLE / THROTTLING BREAK --- */}
        {currentSecond >= 10 && currentSecond < 15 && (
          <AbsoluteFill style={{ padding: '60px' }}>
            <div style={{ backgroundColor: 'rgba(255, 59, 48, 0.05)', borderLeft: `6px solid ${CRIT_RED}`, padding: '20px 30px', marginBottom: 30 }}>
              <span style={{ color: CRIT_RED, fontSize: 24, fontWeight: 800 }}>TECH NEWS WIRE // 2026_CRASH</span>
            </div>
            <h2 style={{ color: PURE_WHITE, fontSize: 52, fontWeight: 900, marginBottom: 30 }}>PROPRIETARY PROMISE CRASH</h2>

            {/* Rapidly scrolling error waterfall log mock terminal */}
            <div style={{ backgroundColor: '#050505', border: '1px solid #222', padding: '25px', height: '400px', overflow: 'hidden' }}>
              {Array.from({ length: 8 }).map((_, idx) => {
                const logLine = MOCK_SYSTEM_LOGS[(idx + Math.floor(frame / 20)) % MOCK_SYSTEM_LOGS.length];
                return (
                  <div key={idx} style={{ color: logLine.includes('ERROR') || logLine.includes('CRITICAL') ? CRIT_RED : '#888', fontSize: 20, marginBottom: 12, fontFamily: 'monospace' }}>
                    {`>> ${logLine}`}
                  </div>
                );
              })}
            </div>
            <p style={{ color: PURE_WHITE, fontSize: 24, marginTop: 25 }}>Proprietary cloud backends are bottlenecking. When servers overload, webhooks drop instantly.</p>
          </AbsoluteFill>
        )}

        {/* --- SCENE 04 (15-20s): THE PIPELINE LIQUIDATION MATH --- */}
        {currentSecond >= 15 && currentSecond < 20 && (
          <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '60px' }}>
            <div style={{ width: '100%', backgroundColor: '#0A0A0A', border: `1px solid ${CRIT_RED}`, padding: '30px', textAlign: 'center', marginBottom: 40 }}>
              <span style={{ color: MUTED_TELEMETRY, fontSize: 22, letterSpacing: 3 }}>INBOUND LEAD AGING LATENCY</span>
              <h2 style={{ color: CRIT_RED, fontSize: 110, margin: '10px 0 0 0', fontFamily: 'monospace' }}>0{pipelineClock.toFixed(2).replace('.', ':')}</h2>
            </div>
            <h1 style={{ color: PURE_WHITE, fontSize: 120, fontWeight: 900, margin: 0, letterSpacing: -4 }}>-{Math.round(100 - conversionCollapse)}%</h1>
            <p style={{ color: NEON_ORANGE, fontSize: 32, fontWeight: 800, textTransform: 'uppercase', marginTop: 10 }}>Pipeline Collapse</p>
            <p style={{ color: MUTED_TELEMETRY, fontSize: 24, textAlign: 'center', marginTop: 15, maxWidth: '800px' }}>A 5-minute routing delay completely wipes out your customer conversion value.</p>
          </AbsoluteFill>
        )}

        {/* --- SCENE 05 (20-25s): THE SOVEREIGN ARCHITECTURE REVOLUTION --- */}
        {currentSecond >= 20 && currentSecond < 25 && (
          <AbsoluteFill style={{ padding: '80px 60px' }}>
            <span style={{ color: ETHICAL_GREEN, fontSize: 22, fontWeight: 800, letterSpacing: 4, display: 'block', marginBottom: 10 }}>[INFRASTRUCTURE RECOVERY ACTIVE]</span>
            <h2 style={{ color: PURE_WHITE, fontSize: 50, fontWeight: 900, margin: 0 }}>SOVEREIGN SYSTEM ARCHITECTURE</h2>

            {/* Interactive Neural Pipeline Network Map Overlay */}
            <svg width="100%" height="400" style={{ marginTop: 40, overflow: 'visible' }}>
              <path d={pathData1} fill="none" stroke="#222" strokeWidth="4" />
              <path d={pathData1} fill="none" stroke={NEON_ORANGE} strokeWidth="5" strokeDasharray="400" strokeDashoffset={400 * (1 - path1Progress)} />

              <path d={pathData2} fill="none" stroke="#222" strokeWidth="4" />
              <path d={pathData2} fill="none" stroke={NEON_ORANGE} strokeWidth="5" strokeDasharray="400" strokeDashoffset={400 * (1 - path2Progress)} />
            </svg>

            {/* Distributed System Hardware Components */}
            <div style={{ position: 'absolute', left: '22%', top: '48%', transform: 'translate(-50%, -50%)', backgroundColor: node1Active ? NEON_ORANGE : '#0E0E0E', padding: '15px', border: '1px solid #333', borderRadius: '4px', textAlign: 'center', width: '160px' }}>
              <span style={{ color: node1Active ? OBSIDIAN_BLACK : PURE_WHITE, fontSize: 16, fontWeight: 900 }}>LIVEKIT LOCAL</span>
            </div>
            <div style={{ position: 'absolute', left: '50%', top: '43%', transform: 'translate(-50%, -50%)', backgroundColor: node2Active ? PURE_WHITE : '#0E0E0E', padding: '15px', border: '1px solid #333', borderRadius: '4px', textAlign: 'center', width: '160px' }}>
              <span style={{ color: OBSIDIAN_BLACK, fontSize: 16, fontWeight: 900 }}>n8n PIPELINE</span>
            </div>
            <div style={{ position: 'absolute', left: '78%', top: '48%', transform: 'translate(-50%, -50%)', backgroundColor: node3Active ? ETHICAL_GREEN : '#0E0E0E', padding: '15px', border: '1px solid #333', borderRadius: '4px', textAlign: 'center', width: '160px' }}>
              <span style={{ color: node3Active ? PURE_WHITE : MUTED_TELEMETRY, fontSize: 16, fontWeight: 900 }}>SUPABASE CORE</span>
            </div>
          </AbsoluteFill>
        )}

        {/* --- SCENE 06 (25-30s): THE GHOST EXECUTIVE CALL TO ACTION --- */}
        {currentSecond >= 25 && (
          <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '60px' }}>
            <span style={{ color: NEON_ORANGE, fontSize: 24, letterSpacing: 6, fontWeight: 900, marginBottom: 15 }}>TAKE BACK COMPLETE DATA OWNERSHIP</span>

            {/* Premium Frosted Glass Panel Container */}
            <div style={{
              backgroundColor: 'rgba(20, 20, 20, 0.75)', border: `1px solid ${NEON_ORANGE}`,
              padding: '50px 40px', width: '100%', borderRadius: '8px', textAlign: 'center',
              boxShadow: `0 0 40px ${NEON_ORANGE}15`, backdropFilter: 'blur(20px)'
            }}>
              <h2 style={{ color: PURE_WHITE, fontSize: 44, fontWeight: 900, margin: '0 0 35px 0', lineHeight: 1.2 }}>STOP PAYING RENT FOR YOUR INFRASTRUCTURE</h2>

              <div style={{ backgroundColor: PURE_WHITE, padding: '25px 0', borderRadius: '2px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: OBSIDIAN_BLACK, fontSize: 36, fontWeight: 900 }}>COMMENT "AUDIT"</span>
                <span style={{ color: NEON_ORANGE, fontSize: 36, opacity: microFlicker ? 1 : 0 }}>▉</span>
              </div>
            </div>
            <p style={{ color: MUTED_TELEMETRY, fontSize: 20, marginTop: 30, letterSpacing: 1 }}>WE WILL CONSTRUCT YOUR NETWORK TEMPLATE ARCHITECTURE FOR FREE.</p>
          </AbsoluteFill>
        )}

      </div>

      {/* =======================================================================
          4. PERSISTENT TELEMETRY OVERLAYS & PROGRESS BAR
          ======================================================================= */}
      {/* Top Header Hardware Feed Indicators */}
      <div style={{ position: 'absolute', top: '5%', left: '60px', right: '60px', zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1A1A1A', paddingBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: currentSecond < 20 ? CRIT_RED : ETHICAL_GREEN }} />
          <span style={{ color: PURE_WHITE, fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>
            {currentSecond < 20 ? 'SECURE_NODE_EXPOSE_RUNNING' : 'VOICEAGE_SOVEREIGN_SYSTEM'}
          </span>
        </div>
        <span style={{ color: MUTED_TELEMETRY, fontSize: 18, fontFamily: 'monospace' }}>COMPUTE_CORE_v1.0.8</span>
      </div>

      {/* Bottom Continuous Progress Timeline Gauge */}
      <div style={{ position: 'absolute', bottom: '8%', left: '60px', right: '60px', height: '4px', backgroundColor: '#161616', zIndex: 100 }}>
        <div style={{
          width: `${(frame / 1800) * 100}%`, height: '100%',
          backgroundColor: currentSecond < 20 ? CRIT_RED : NEON_ORANGE,
          boxShadow: `0 0 15px ${currentSecond < 20 ? CRIT_RED : NEON_ORANGE}`
        }} />
      </div>

      {/* The Master Laser Scanning Beam Overlay */}
      <div style={{
        position: 'absolute', top: masterScannerY, left: 0, width: '100%', height: '3px',
        backgroundColor: NEON_ORANGE, boxShadow: `0 0 18px 4px ${NEON_ORANGE}`, zIndex: 500, pointerEvents: 'none'
      }} />

      {/* Persistent Anchored Brand Mark */}
      <div style={{ position: 'absolute', bottom: '4%', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
        <p style={{ color: PURE_WHITE, fontSize: 20, fontWeight: 900, margin: 0, letterSpacing: 6, opacity: 0.8 }}>
          VOICEAGE <span style={{ color: NEON_ORANGE }}>SYSTEMS</span>
        </p>
      </div>

    </AbsoluteFill>
  );
};

// Layout geometric coordinates for the custom vector tracks
const pathData1 = `M 237 250 Q 380 180, 540 220`;
const pathData2 = `M 540 220 Q 690 260, 842 200`;

export default ComputeIndependenceReel;