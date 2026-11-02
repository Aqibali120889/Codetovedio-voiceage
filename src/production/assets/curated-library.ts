/**
 * Curated Fallback Asset Library.
 *
 * Provides high-resolution, vector-crisp thematic SVG graphics and background
 * compositions for video production when external stock APIs (Pixabay) are
 * unconfigured, rate-limited, or return zero matches.
 *
 * Encoded as optimized Data URIs so Remotion can render them synchronously
 * with zero network dependencies or missing file paths.
 */

export interface CuratedAsset {
  id: string;
  domain: "finance" | "coding" | "health" | "industry" | "news" | "general";
  title: string;
  dataUri: string;
  attribution: string;
  orientation: "portrait" | "landscape" | "square";
  tags: string[];
}

function svgToDataUri(svgContent: string): string {
  const clean = svgContent
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(clean)}`;
}

// 1. Finance & Fintech
const FINANCE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
  <defs>
    <radialGradient id="fbg" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#0F291E" />
      <stop offset="60%" stop-color="#08140E" />
      <stop offset="100%" stop-color="#040A07" />
    </radialGradient>
    <linearGradient id="gridGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#10B981" stop-opacity="0.18" />
      <stop offset="100%" stop-color="#10B981" stop-opacity="0.02" />
    </linearGradient>
    <linearGradient id="chartLine" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="50%" stop-color="#10B981" />
      <stop offset="100%" stop-color="#34D399" />
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#fbg)" />
  <!-- Financial Grid Lines -->
  <g stroke="url(#gridGrad)" stroke-width="1.5">
    <line x1="120" y1="0" x2="120" y2="1920" />
    <line x1="360" y1="0" x2="360" y2="1920" />
    <line x1="600" y1="0" x2="600" y2="1920" />
    <line x1="840" y1="0" x2="840" y2="1920" />
    <line x1="0" y1="400" x2="1080" y2="400" />
    <line x1="0" y1="800" x2="1080" y2="800" />
    <line x1="0" y1="1200" x2="1080" y2="1200" />
    <line x1="0" y1="1600" x2="1080" y2="1600" />
  </g>
  <!-- Candlestick / Settlement Trend -->
  <path d="M 80 1350 L 260 1180 L 440 1280 L 620 920 L 800 990 L 1000 680" fill="none" stroke="url(#chartLine)" stroke-width="6" stroke-linecap="round" filter="drop-shadow(0 0 12px rgba(16,185,129,0.6))" />
  <!-- Area glow under curve -->
  <path d="M 80 1350 L 260 1180 L 440 1280 L 620 920 L 800 990 L 1000 680 L 1000 1700 L 80 1700 Z" fill="url(#chartLine)" opacity="0.08" />
  <!-- Ledger Nodes -->
  <circle cx="260" cy="1180" r="9" fill="#10B981" filter="drop-shadow(0 0 8px #10B981)" />
  <circle cx="620" cy="920" r="9" fill="#34D399" filter="drop-shadow(0 0 8px #34D399)" />
  <circle cx="1000" cy="680" r="12" fill="#FFFFFF" filter="drop-shadow(0 0 14px #10B981)" />
</svg>`;

// 2. Coding & Software Architecture
const CODING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
  <defs>
    <radialGradient id="cbg" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#121824" />
      <stop offset="60%" stop-color="#0A0E17" />
      <stop offset="100%" stop-color="#05070B" />
    </radialGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#cbg)" />
  <!-- Code editor line numbers and gutter -->
  <g opacity="0.15" fill="#6B7280" font-family="monospace" font-size="28">
    <text x="60" y="320">01</text>
    <text x="60" y="380">02</text>
    <text x="60" y="440">03</text>
    <text x="60" y="500">04</text>
    <text x="60" y="560">05</text>
    <text x="60" y="620">06</text>
    <text x="60" y="680">07</text>
    <text x="60" y="740">08</text>
  </g>
  <!-- Stylized AST / Git branching graph -->
  <g stroke="#F59E0B" stroke-width="4" fill="none" opacity="0.75">
    <path d="M 240 850 C 240 700, 480 700, 480 550 C 480 400, 720 400, 720 250" />
    <path d="M 240 850 L 240 1350" />
    <path d="M 240 1100 C 240 1200, 560 1200, 560 1350" stroke="#0EA5E9" />
  </g>
  <circle cx="240" cy="850" r="10" fill="#F59E0B" filter="drop-shadow(0 0 10px #F59E0B)" />
  <circle cx="480" cy="550" r="10" fill="#F59E0B" filter="drop-shadow(0 0 10px #F59E0B)" />
  <circle cx="720" cy="250" r="14" fill="#FFFFFF" filter="drop-shadow(0 0 14px #F59E0B)" />
  <circle cx="560" cy="1350" r="10" fill="#0EA5E9" filter="drop-shadow(0 0 10px #0EA5E9)" />
</svg>`;

// 3. Healthcare & Biotechnology
const HEALTH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
  <defs>
    <radialGradient id="hbg" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#082A3A" />
      <stop offset="60%" stop-color="#04151E" />
      <stop offset="100%" stop-color="#020A0F" />
    </radialGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#hbg)" />
  <!-- Molecular / Clinical Grid -->
  <g stroke="#06B6D4" stroke-width="2" opacity="0.4" fill="none">
    <polygon points="540,500 660,570 660,710 540,780 420,710 420,570" />
    <polygon points="660,710 780,780 780,920 660,990 540,920 540,780" />
    <polygon points="420,710 540,780 540,920 420,990 300,920 300,780" />
  </g>
  <circle cx="540" cy="500" r="8" fill="#06B6D4" filter="drop-shadow(0 0 8px #06B6D4)" />
  <circle cx="660" cy="710" r="10" fill="#FFFFFF" filter="drop-shadow(0 0 12px #06B6D4)" />
  <circle cx="420" cy="710" r="8" fill="#06B6D4" />
</svg>`;

// 4. Industry, Robotics & Supply Chain
const INDUSTRY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
  <defs>
    <radialGradient id="ibg" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#241408" />
      <stop offset="60%" stop-color="#140A04" />
      <stop offset="100%" stop-color="#080402" />
    </radialGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#ibg)" />
  <!-- Mechanical blueprint lines -->
  <g stroke="#EA580C" stroke-width="2" opacity="0.35" fill="none">
    <circle cx="540" cy="900" r="280" stroke-dasharray="12 12" />
    <circle cx="540" cy="900" r="180" />
    <circle cx="540" cy="900" r="60" fill="#EA580C" opacity="0.3" />
    <line x1="200" y1="900" x2="880" y2="900" />
    <line x1="540" y1="560" x2="540" y2="1240" />
  </g>
</svg>`;

// 5. News Broadcast & Editorial Montage
const NEWS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
  <defs>
    <radialGradient id="nbg" cx="50%" cy="20%" r="80%">
      <stop offset="0%" stop-color="#1F1A2C" />
      <stop offset="50%" stop-color="#0E0C17" />
      <stop offset="100%" stop-color="#050408" />
    </radialGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#nbg)" />
  <!-- Editorial horizontal layout rules -->
  <g stroke="#A855F7" stroke-width="1.5" opacity="0.25">
    <line x1="80" y1="280" x2="1000" y2="280" />
    <line x1="80" y1="310" x2="1000" y2="310" stroke-width="3" />
    <line x1="80" y1="1400" x2="1000" y2="1400" />
    <line x1="80" y1="1430" x2="1000" y2="1430" />
  </g>
  <!-- World coordinate sphere outline -->
  <ellipse cx="540" cy="850" rx="340" ry="240" stroke="#A855F7" stroke-width="2" fill="none" opacity="0.3" />
  <ellipse cx="540" cy="850" rx="340" ry="120" stroke="#A855F7" stroke-width="1.5" stroke-dasharray="6 6" fill="none" opacity="0.3" />
</svg>`;

// 6. General Technology & Neural Constellation
const GENERAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
  <defs>
    <radialGradient id="gbg" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#1C1410" />
      <stop offset="60%" stop-color="#0E0A08" />
      <stop offset="100%" stop-color="#050302" />
    </radialGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#gbg)" />
  <!-- Constellation Nodes & Signal Pulses -->
  <g stroke="#FF5F00" stroke-width="2" opacity="0.4" fill="none">
    <line x1="200" y1="500" x2="540" y2="700" />
    <line x1="540" y1="700" x2="880" y2="550" />
    <line x1="540" y1="700" x2="420" y2="1100" />
    <line x1="420" y1="1100" x2="760" y2="1250" />
  </g>
  <circle cx="200" cy="500" r="8" fill="#FF5F00" filter="drop-shadow(0 0 10px #FF5F00)" />
  <circle cx="540" cy="700" r="14" fill="#FFFFFF" filter="drop-shadow(0 0 16px #FF5F00)" />
  <circle cx="880" cy="550" r="9" fill="#FF5F00" />
  <circle cx="420" cy="1100" r="10" fill="#FF5F00" />
  <circle cx="760" cy="1250" r="8" fill="#FF5F00" />
</svg>`;

export const CURATED_ASSETS: Record<string, CuratedAsset> = {
  finance_settlement: {
    id: "curated_fin_01",
    domain: "finance",
    title: "Financial Settlement Ledger & Candlestick Flow",
    dataUri: svgToDataUri(FINANCE_SVG),
    attribution: "Voiceage Curated Financial Visual Studio",
    orientation: "portrait",
    tags: ["finance", "money", "banking", "payments", "transactions", "ledger", "stocks"],
  },
  coding_ast: {
    id: "curated_code_01",
    domain: "coding",
    title: "Software Syntax AST & Git Branch Topology",
    dataUri: svgToDataUri(CODING_SVG),
    attribution: "Voiceage Curated Developer Graphics Studio",
    orientation: "portrait",
    tags: ["code", "developer", "syntax", "git", "compiler", "terminal", "algorithm"],
  },
  health_clinical: {
    id: "curated_health_01",
    domain: "health",
    title: "Biotechnology Molecular & Clinical Research Array",
    dataUri: svgToDataUri(HEALTH_SVG),
    attribution: "Voiceage Curated Scientific Visual Studio",
    orientation: "portrait",
    tags: ["health", "medical", "pharma", "biotech", "clinical", "molecular", "trials"],
  },
  industry_robotics: {
    id: "curated_ind_01",
    domain: "industry",
    title: "Precision Industrial Robotics & Manufacturing Blueprint",
    dataUri: svgToDataUri(INDUSTRY_SVG),
    attribution: "Voiceage Curated Engineering Visual Studio",
    orientation: "portrait",
    tags: ["robotics", "automation", "manufacturing", "supply-chain", "logistics"],
  },
  news_broadcast: {
    id: "curated_news_01",
    domain: "news",
    title: "Global Investigative Journalism & Editorial Sphere",
    dataUri: svgToDataUri(NEWS_SVG),
    attribution: "Voiceage Curated Editorial Visual Studio",
    orientation: "portrait",
    tags: ["news", "investigative", "journalism", "broadcast", "press", "media"],
  },
  general_network: {
    id: "curated_gen_01",
    domain: "general",
    title: "Autonomous Neural Telemetry Constellation",
    dataUri: svgToDataUri(GENERAL_SVG),
    attribution: "Voiceage Curated Motion Visual Studio",
    orientation: "portrait",
    tags: ["ai", "network", "technology", "cloud", "telemetry", "autonomous"],
  },
};

/**
 * Finds the best curated fallback asset for a given query or narration context.
 */
export function getCuratedFallbackAsset(query: string, topic?: string): CuratedAsset {
  const combined = `${topic || ""} ${query}`.toLowerCase();

  if (/\b(money|finance|bank|payment|transaction|wealth|invest|fintech|stock|crypto|dollar|fund)\b/.test(combined)) {
    return CURATED_ASSETS.finance_settlement;
  }
  if (/\b(code|coding|developer|compiler|github|repository|software|typescript|python|terminal|diff)\b/.test(combined)) {
    return CURATED_ASSETS.coding_ast;
  }
  if (/\b(health|pharma|clinical|medical|drug|patient|fda|hospital|biology|biotech|disease)\b/.test(combined)) {
    return CURATED_ASSETS.health_clinical;
  }
  if (/\b(robot|manufacturing|industrial|factory|hardware|supply|chain|logistics)\b/.test(combined)) {
    return CURATED_ASSETS.industry_robotics;
  }
  if (/\b(news|report|headline|press|journalism|media|broadcast|investigative)\b/.test(combined)) {
    return CURATED_ASSETS.news_broadcast;
  }

  return CURATED_ASSETS.general_network;
}
