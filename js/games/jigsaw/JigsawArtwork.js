/**
 * ジグソーパズル用の高精細SVGアートワーク（4テーマ）およびカスタム画像変換クラス
 */
export class JigsawArtwork {
  static get THEMES() {
    return [
      { id: 'fuji', label: '富士と紅葉' },
      { id: 'lighthouse', label: '星空の灯台' },
      { id: 'koi', label: '庭園と錦鯉' },
      { id: 'mosaic', label: 'ステンドグラス' },
    ];
  }

  static getSvgDataUrl(themeId = 'fuji') {
    const svg = JigsawArtwork._buildSvg(themeId);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  static _buildSvg(themeId) {
    if (themeId === 'lighthouse') {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0d1b38"/><stop offset="55%" stop-color="#1e3c6b"/><stop offset="100%" stop-color="#3b6e8c"/>
          </linearGradient>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#173a5e"/><stop offset="100%" stop-color="#0a1f36"/>
          </linearGradient>
          <radialGradient id="beam" cx="0%" cy="50%" r="100%">
            <stop offset="0%" stop-color="#fff4b8" stop-opacity="0.82"/><stop offset="100%" stop-color="#fff4b8" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="600" height="390" fill="url(#sky)"/>
        <circle cx="110" cy="105" r="42" fill="#f7e8b5"/>
        <circle cx="126" cy="96" r="36" fill="#132548"/>
        <g fill="#fff8dc" opacity="0.9">
          <circle cx="210" cy="60" r="2.5"/><circle cx="290" cy="95" r="3"/><circle cx="380" cy="52" r="2"/>
          <circle cx="465" cy="84" r="3.2"/><circle cx="530" cy="140" r="2.4"/><circle cx="65" cy="195" r="2.2"/>
          <circle cx="195" cy="155" r="2.6"/><circle cx="505" cy="60" r="2.5"/><circle cx="330" cy="145" r="2"/>
        </g>
        <polygon points="362,185 0,100 0,255" fill="url(#beam)"/>
        <polygon points="396,185 600,120 600,250" fill="url(#beam)"/>
        <rect y="385" width="600" height="215" fill="url(#sea)"/>
        <g stroke="#7db7d9" stroke-width="3" stroke-linecap="round" opacity="0.45">
          <line x1="40" y1="430" x2="180" y2="430"/><line x1="250" y1="470" x2="430" y2="470"/>
          <line x1="80" y1="515" x2="290" y2="515"/><line x1="360" y1="550" x2="540" y2="550"/>
          <line x1="420" y1="425" x2="560" y2="425"/>
        </g>
        <path d="M250,435 Q330,360 440,375 L540,445 L540,480 L235,480 Z" fill="#2c333d"/>
        <path d="M295,435 L335,388 L420,396 L480,442 Z" fill="#3e4754"/>
        <polygon points="354,395 365,205 393,205 404,395" fill="#f7f2e4"/>
        <polygon points="359,340 399,340 401,372 357,372" fill="#b83227"/>
        <polygon points="362,272 396,272 398,302 360,302" fill="#b83227"/>
        <rect x="358" y="175" width="42" height="32" rx="4" fill="#ffe896" stroke="#222" stroke-width="3"/>
        <polygon points="352,175 379,144 406,175" fill="#b83227"/>
        <rect x="424" y="346" width="64" height="44" fill="#d9cab0"/>
        <polygon points="416,346 456,318 496,346" fill="#7d2c24"/>
        <rect x="444" y="360" width="16" height="16" fill="#ffdf7a"/>
        <path d="M85,460 Q140,410 190,460 Z" fill="#f2ead8"/>
        <polygon points="75,460 200,460 182,482 93,482" fill="#734526"/>
      </svg>`;
    }

    if (themeId === 'koi') {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
        <defs>
          <radialGradient id="pond" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stop-color="#22666e"/><stop offset="65%" stop-color="#154752"/><stop offset="100%" stop-color="#0d2c36"/>
          </radialGradient>
        </defs>
        <rect width="600" height="600" fill="url(#pond)"/>
        <g fill="none" stroke="#8ad4d4" stroke-width="2" opacity="0.28">
          <circle cx="210" cy="240" r="65"/><circle cx="210" cy="240" r="105"/>
          <circle cx="410" cy="390" r="55"/><circle cx="410" cy="390" r="95"/>
        </g>
        <!-- Lily pads -->
        <g>
          <path d="M120,120 m-55,0 a55,55 0 1,0 110,0 a55,55 0 1,0 -110,0" fill="#2d7a4f"/>
          <polygon points="120,120 175,95 175,135" fill="#154752"/>
          <path d="M490,150 m-64,0 a64,64 0 1,0 128,0 a64,64 0 1,0 -128,0" fill="#266e46"/>
          <polygon points="490,150 430,125 435,165" fill="#154752"/>
          <path d="M110,485 m-62,0 a62,62 0 1,0 124,0 a62,62 0 1,0 -124,0" fill="#338557"/>
          <polygon points="110,485 170,470 165,510" fill="#0d2c36"/>
          <path d="M495,500 m-52,0 a52,52 0 1,0 104,0 a52,52 0 1,0 -104,0" fill="#2b754c"/>
        </g>
        <!-- Lotus flowers -->
        <g transform="translate(125,112)">
          <circle r="24" fill="#f5a7b8"/><circle r="15" fill="#ffd2dc"/><circle r="6" fill="#f2c44e"/>
        </g>
        <g transform="translate(495,495)">
          <circle r="22" fill="#f5a7b8"/><circle r="13" fill="#ffd2dc"/><circle r="5" fill="#f2c44e"/>
        </g>
        <!-- Koi 1 (Red & White) -->
        <g transform="translate(230,275) rotate(-32)">
          <ellipse cx="0" cy="0" rx="95" ry="34" fill="#faf6ee"/>
          <ellipse cx="-20" cy="-6" rx="34" ry="22" fill="#d9442b"/>
          <ellipse cx="36" cy="4" rx="26" ry="18" fill="#d9442b"/>
          <polygon points="-90,0 -138,-32 -124,0 -138,32" fill="#f2ece0"/>
          <ellipse cx="18" cy="-36" rx="22" ry="11" fill="#f2ece0" transform="rotate(-25 18 -36)"/>
          <ellipse cx="18" cy="36" rx="22" ry="11" fill="#f2ece0" transform="rotate(25 18 36)"/>
          <circle cx="72" cy="-12" r="4" fill="#1b1815"/><circle cx="72" cy="12" r="4" fill="#1b1815"/>
        </g>
        <!-- Koi 2 (Gold) -->
        <g transform="translate(385,360) rotate(140)">
          <ellipse cx="0" cy="0" rx="88" ry="30" fill="#f2b83a"/>
          <ellipse cx="-14" cy="4" rx="30" ry="18" fill="#d6781f"/>
          <ellipse cx="32" cy="-5" rx="20" ry="14" fill="#221e1a"/>
          <polygon points="-84,0 -126,-28 -112,0 -126,28" fill="#f7d274"/>
          <ellipse cx="15" cy="-32" rx="20" ry="10" fill="#f7d274" transform="rotate(-22 15 -32)"/>
          <ellipse cx="15" cy="32" rx="20" ry="10" fill="#f7d274" transform="rotate(22 15 32)"/>
          <circle cx="65" cy="-10" r="3.8" fill="#1b1815"/><circle cx="65" cy="10" r="3.8" fill="#1b1815"/>
        </g>
        <!-- Stepping stones -->
        <ellipse cx="305" cy="82" rx="52" ry="30" fill="#8b8880" stroke="#5b5852" stroke-width="4"/>
        <ellipse cx="305" cy="535" rx="56" ry="30" fill="#7c7972" stroke="#52504a" stroke-width="4"/>
      </svg>`;
    }

    if (themeId === 'mosaic') {
      const palette = ['#b83b2d', '#d98a2b', '#2b6e57', '#2b5984', '#e8c468', '#7d4568', '#d45d42', '#3d8b85'];
      let polys = '';
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          const x = c * 100;
          const y = r * 100;
          const c1 = palette[(r * 3 + c * 2) % palette.length];
          const c2 = palette[(r * 5 + c + 3) % palette.length];
          const c3 = palette[(r + c * 4 + 1) % palette.length];
          const c4 = palette[(r * 2 + c * 3 + 5) % palette.length];
          polys += `<polygon points="${x},${y} ${x + 100},${y} ${x + 50},${y + 50}" fill="${c1}" stroke="#1c1917" stroke-width="4"/>`;
          polys += `<polygon points="${x + 100},${y} ${x + 100},${y + 100} ${x + 50},${y + 50}" fill="${c2}" stroke="#1c1917" stroke-width="4"/>`;
          polys += `<polygon points="${x + 100},${y + 100} ${x},${y + 100} ${x + 50},${y + 50}" fill="${c3}" stroke="#1c1917" stroke-width="4"/>`;
          polys += `<polygon points="${x},${y + 100} ${x},${y} ${x + 50},${y + 50}" fill="${c4}" stroke="#1c1917" stroke-width="4"/>`;
        }
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
        ${polys}
        <circle cx="300" cy="300" r="110" fill="#f7e3a1" stroke="#1c1917" stroke-width="6"/>
        <polygon points="300,205 326,274 395,300 326,326 300,395 274,326 205,300 274,274" fill="#c2362b" stroke="#1c1917" stroke-width="5"/>
        <circle cx="300" cy="300" r="28" fill="#2b5984" stroke="#1c1917" stroke-width="4"/>
      </svg>`;
    }

    // Default: Mt. Fuji & Autumn Leaves
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
      <defs>
        <linearGradient id="fsky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f2b872"/><stop offset="52%" stop-color="#f5d9a6"/><stop offset="100%" stop-color="#fcecc9"/>
        </linearGradient>
        <linearGradient id="flake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4e7999"/><stop offset="100%" stop-color="#274661"/>
        </linearGradient>
      </defs>
      <rect width="600" height="390" fill="url(#fsky)"/>
      <circle cx="455" cy="128" r="56" fill="#d94c38"/>
      <!-- Clouds -->
      <g fill="#fff8eb" opacity="0.72">
        <rect x="45" y="95" width="145" height="22" rx="11"/>
        <rect x="85" y="128" width="110" height="16" rx="8"/>
        <rect x="375" y="198" width="170" height="20" rx="10"/>
      </g>
      <!-- Mt Fuji -->
      <polygon points="55,390 250,158 350,158 545,390" fill="#3a5275"/>
      <polygon points="250,158 350,158 395,222 356,210 330,234 300,206 270,235 242,208 205,222" fill="#fbf9f4"/>
      <!-- Lake & Reflection -->
      <rect y="390" width="600" height="210" fill="url(#flake)"/>
      <polygon points="105,390 258,530 342,530 495,390" fill="#2d4363" opacity="0.65"/>
      <polygon points="242,502 358,502 342,530 258,530" fill="#eef2f5" opacity="0.5"/>
      <!-- Torii gate -->
      <g fill="#b82920">
        <rect x="408" y="346" width="10" height="72"/><rect x="466" y="346" width="10" height="72"/>
        <rect x="392" y="340" width="100" height="11" rx="3"/><rect x="402" y="362" width="80" height="8"/>
      </g>
      <!-- Foreground Hills & Autumn Trees -->
      <path d="M0,445 Q130,395 255,465 L255,600 L0,600 Z" fill="#26402f"/>
      <circle cx="72" cy="415" r="52" fill="#c93b2b"/><circle cx="132" cy="435" r="46" fill="#e0742b"/>
      <circle cx="42" cy="465" r="42" fill="#d9542b"/><circle cx="178" cy="472" r="38" fill="#e8a135"/>
      <!-- Pagoda silhouette -->
      <g fill="#1c1916">
        <rect x="495" y="455" width="44" height="145"/>
        <polygon points="472,462 517,438 562,462"/><polygon points="478,494 517,474 556,494"/>
        <polygon points="474,528 517,506 560,528"/><rect x="515" y="410" width="4" height="32"/>
      </g>
    </svg>`;
  }
}
