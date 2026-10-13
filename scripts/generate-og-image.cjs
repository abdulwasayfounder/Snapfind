const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const width = 1200;
const height = 630;

const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#121821" />
      <stop offset="60%" stop-color="#0D1117" />
      <stop offset="100%" stop-color="#07090D" />
    </radialGradient>

    <!-- AI Brand Glow -->
    <radialGradient id="aiGlow" cx="25%" cy="35%" r="40%">
      <stop offset="0%" stop-color="#CCFF00" stop-opacity="0.18" />
      <stop offset="60%" stop-color="#00FF66" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#07090D" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="brandLinear" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#CCFF00" />
      <stop offset="100%" stop-color="#00FF66" />
    </linearGradient>

    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1E293B" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0.8" />
    </linearGradient>
  </defs>

  <!-- Deep Dark Canvas -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
  <rect width="${width}" height="${height}" fill="url(#aiGlow)" />

  <!-- Subtle Subtle Grid overlay -->
  <g opacity="0.06" stroke="#FFFFFF" stroke-width="1">
    <line x1="0" y1="105" x2="1200" y2="105" />
    <line x1="0" y1="210" x2="1200" y2="210" />
    <line x1="0" y1="315" x2="1200" y2="315" />
    <line x1="0" y1="420" x2="1200" y2="420" />
    <line x1="0" y1="525" x2="1200" y2="525" />
    <line x1="200" y1="0" x2="200" y2="630" />
    <line x1="400" y1="0" x2="400" y2="630" />
    <line x1="600" y1="0" x2="600" y2="630" />
    <line x1="800" y1="0" x2="800" y2="630" />
    <line x1="1000" y1="0" x2="1000" y2="630" />
  </g>

  <!-- Left: Brand Logo Symbol -->
  <g transform="translate(100, 140)">
    <!-- Brand Icon Container -->
    <rect width="130" height="130" rx="36" fill="#121821" stroke="#334155" stroke-width="2" />
    
    <!-- Camera Aperture / Lens Visual -->
    <path d="M78 40h-26L42 50H30c-4.4 0-8 3.6-8 8v38c0 4.4 3.6 8 8 8h70c4.4 0 8-3.6 8-8V58c0-4.4-3.6-8-8-8H88l-10-10z" fill="none" stroke="#CCFF00" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="65" cy="74" r="16" fill="none" stroke="#00FF66" stroke-width="5" />
    <circle cx="90" cy="58" r="4" fill="#CCFF00" />
  </g>

  <!-- Right: Search Preview Illustration Card -->
  <g transform="translate(740, 110)">
    <!-- Card Frame -->
    <rect width="360" height="410" rx="28" fill="url(#cardGrad)" stroke="#334155" stroke-width="1.5" />
    
    <!-- Search Bar in mockup -->
    <rect x="24" y="28" width="312" height="48" rx="14" fill="#090D14" stroke="#CCFF00" stroke-width="1.5" />
    <text x="56" y="58" fill="#F8FAFC" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600">
      &quot;Show flight ticket to Tokyo&quot;
    </text>
    <circle cx="40" cy="52" r="5" fill="#CCFF00" />

    <!-- Mockup Result Item 1 -->
    <rect x="24" y="96" width="312" height="88" rx="16" fill="#121821" stroke="#334155" stroke-width="1" />
    <rect x="38" y="112" width="56" height="56" rx="10" fill="#1E293B" stroke="#475569" stroke-width="1" />
    <text x="108" y="132" fill="#F8FAFC" font-family="system-ui, sans-serif" font-size="14" font-weight="700">Flight Confirmation NH105</text>
    <text x="108" y="152" fill="#00FF66" font-family="system-ui, sans-serif" font-size="12" font-weight="600">99.4% OCR Match • Ticket &amp; Travel</text>
    <text x="108" y="168" fill="#64748B" font-family="system-ui, sans-serif" font-size="11">Gate 42B • Seat 14A • Oct 24</text>

    <!-- Mockup Result Item 2 -->
    <rect x="24" y="200" width="312" height="88" rx="16" fill="#121821" stroke="#334155" stroke-width="1" />
    <rect x="38" y="216" width="56" height="56" rx="10" fill="#1E293B" stroke="#475569" stroke-width="1" />
    <text x="108" y="236" fill="#F8FAFC" font-family="system-ui, sans-serif" font-size="14" font-weight="700">Passport Photo ID Page</text>
    <text x="108" y="256" fill="#CCFF00" font-family="system-ui, sans-serif" font-size="12" font-weight="600">Personal Vault • Protected</text>
    <text x="108" y="272" fill="#64748B" font-family="system-ui, sans-serif" font-size="11">Encrypted on device • Local cache</text>

    <!-- Mockup Result Item 3 (partial) -->
    <rect x="24" y="304" width="312" height="80" rx="16" fill="#121821" stroke="#334155" stroke-width="1" opacity="0.6" />
    <rect x="38" y="318" width="56" height="52" rx="10" fill="#1E293B" opacity="0.6" />
    <text x="108" y="338" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="13" font-weight="600">Hotel Booking Voucher</text>
    <text x="108" y="356" fill="#64748B" font-family="system-ui, sans-serif" font-size="11">Shinjuku Prince Hotel</text>
  </g>

  <!-- Typography Content (Left Center) -->
  <g transform="translate(100, 310)">
    <!-- Brand Title -->
    <text x="0" y="30" fill="#F8FAFC" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="900" letter-spacing="-0.03em">
      SnapFind <tspan fill="url(#brandLinear)">AI</tspan>
    </text>

    <!-- Tagline -->
    <text x="0" y="80" fill="#F8FAFC" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="700" letter-spacing="-0.01em">
      The Visual Memory &amp; Search Engine
    </text>

    <!-- Description -->
    <text x="0" y="125" fill="#94A3B8" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="400">
      Instant natural-language search across screenshots, recipes, bills,
    </text>
    <text x="0" y="152" fill="#94A3B8" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="400">
      code, and identity documents with zero-knowledge privacy.
    </text>

    <!-- Pills / Feature Badges -->
    <g transform="translate(0, 195)">
      <!-- Badge 1 -->
      <rect x="0" y="0" width="160" height="36" rx="18" fill="#1E293B" stroke="#334155" stroke-width="1" />
      <circle cx="16" cy="18" r="4" fill="#00FF66" />
      <text x="28" y="23" fill="#F8FAFC" font-family="system-ui, sans-serif" font-size="13" font-weight="700">Gemini Vision OCR</text>

      <!-- Badge 2 -->
      <rect x="175" y="0" width="170" height="36" rx="18" fill="#1E293B" stroke="#334155" stroke-width="1" />
      <circle cx="191" cy="18" r="4" fill="#CCFF00" />
      <text x="203" y="23" fill="#F8FAFC" font-family="system-ui, sans-serif" font-size="13" font-weight="700">Zero-PII Storage</text>

      <!-- Badge 3 -->
      <rect x="360" y="0" width="165" height="36" rx="18" fill="#1E293B" stroke="#334155" stroke-width="1" />
      <circle cx="376" cy="18" r="4" fill="#FF6600" />
      <text x="388" y="23" fill="#F8FAFC" font-family="system-ui, sans-serif" font-size="13" font-weight="700">Offline &amp; Fast</text>
    </g>
  </g>
</svg>
`;

async function main() {
  const outputPath = path.join(__dirname, "../public/og-image.png");
  await sharp(Buffer.from(svg))
    .png({ quality: 95 })
    .toFile(outputPath);
  console.log(`Successfully generated 1200x630 social card at: ${outputPath}`);
}

main().catch((err) => {
  console.error("Failed to generate OG image:", err);
  process.exit(1);
});
