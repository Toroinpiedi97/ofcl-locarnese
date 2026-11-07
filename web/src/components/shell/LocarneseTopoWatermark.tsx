"use client";

import React from "react";

export interface LocarneseTopoWatermarkProps {
  className?: string;
  opacity?: number;
}

/**
 * LocarneseTopoWatermark:
 * Layer vettoriale cartografico SVG ispirato a maptoposter con le curve di livello
 * reali del Locarnese (Cimetta 1670m, Cardada 1340m, Brione 850m, Delta Maggia)
 * e la batimetria del Lago Maggiore (-372m punto più profondo).
 * Reso sottile, elegante e sfumato come filigrana d'archivio.
 */
export function LocarneseTopoWatermark({
  className = "",
  opacity = 0.22,
}: LocarneseTopoWatermarkProps) {
  return (
    <div
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${className}`}
      style={{
        background:
          "radial-gradient(circle at 75% 20%, #eaf3fb 0%, #f2f7fb 60%, #e8f0f6 100%)",
      }}
      aria-hidden="true"
    >
      <svg
        className="w-full h-full transition-opacity duration-300"
        style={{ opacity }}
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="ofclLakeWater" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.08" />
            <stop offset="60%" stopColor="#0284c7" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0.10" />
          </linearGradient>
        </defs>

        {/* 1. LAGO MAGGIORE (VERBANO) E DELTA MAGGIA */}
        <path
          d="M 180,1000 C 260,820 310,720 440,640 C 540,580 660,590 760,540 C 860,490 920,410 980,360 C 1040,310 1160,290 1320,320 C 1450,340 1540,300 1600,280 L 1600,1000 Z"
          fill="url(#ofclLakeWater)"
          stroke="#0284c7"
          strokeWidth="1.8"
          strokeOpacity="0.22"
        />

        {/* BATIMETRIA SUBACQUEA LAGO MAGGIORE (-50m, -150m, -372m) */}
        <g fill="none" stroke="#0284c7" strokeWidth="0.9" strokeOpacity="0.18" strokeDasharray="6 3">
          <path d="M 240,1000 C 310,850 360,760 480,680 C 580,620 700,630 800,580 C 890,530 950,450 1010,400 C 1070,350 1190,330 1350,360 L 1600,340" />
          <text x="500" y="675" fontSize="11" fill="#0284c7" fontWeight="bold" fontFamily="monospace" opacity="0.35">
            -50m
          </text>

          <path d="M 320,1000 C 380,880 430,800 550,720 C 650,660 760,670 860,620 C 950,570 1010,500 1070,450 C 1130,400 1250,380 1400,410 L 1600,400" />
          <text x="580" y="715" fontSize="11" fill="#0284c7" fontWeight="bold" fontFamily="monospace" opacity="0.35">
            -150m
          </text>

          <path d="M 420,1000 C 470,910 520,840 640,770 C 740,710 830,710 930,670 C 1020,620 1080,560 1140,510 C 1200,460 1310,440 1460,470 L 1600,460" />
          <text x="670" y="765" fontSize="11" fill="#0284c7" fontWeight="bold" fontFamily="monospace" opacity="0.45">
            -372m (Profondità max Verbano)
          </text>
        </g>

        {/* FIUME MAGGIA E DELTA */}
        <path
          d="M 760,540 Q 770,460 730,370 Q 700,300 730,200 Q 750,110 740,0"
          fill="none"
          stroke="#00A3C4"
          strokeWidth="3.2"
          strokeOpacity="0.22"
          strokeLinecap="round"
        />
        <text x="745" y="270" fontSize="12" fill="#00A3C4" fontWeight="bold" fontFamily="monospace" opacity="0.45">
          Fiume Maggia
        </text>

        {/* 2. CURVE DI LIVELLO TOPOGRAFICHE (Cardada, Cimetta, Brione) */}
        <g fill="none" stroke="#d97706" strokeWidth="1.1" strokeOpacity="0.20">
          {/* 1670m Cimetta */}
          <ellipse cx="940" cy="90" rx="95" ry="45" strokeWidth="1.5" strokeOpacity="0.32" />
          <text x="940" y="94" fontSize="12" fill="#b45309" fontWeight="bold" fontFamily="monospace" textAnchor="middle" opacity="0.45">
            ▲ 1670m (Cimetta)
          </text>

          {/* 1500m */}
          <ellipse cx="935" cy="95" rx="145" ry="70" />
          <text x="1090" y="98" fontSize="10" fill="#b45309" fontWeight="bold" fontFamily="monospace" opacity="0.35">
            1500m
          </text>

          {/* 1340m Cardada */}
          <ellipse cx="930" cy="100" rx="205" ry="100" strokeWidth="1.5" strokeOpacity="0.32" />
          <text x="930" y="195" fontSize="12" fill="#b45309" fontWeight="bold" fontFamily="monospace" textAnchor="middle" opacity="0.45">
            ▲ 1340m (Cardada)
          </text>

          {/* 1200m */}
          <path d="M 680,110 C 740,210 1100,220 1180,110 C 1140,5 720,10 680,110 Z" />

          {/* 1000m */}
          <path d="M 620,130 C 690,260 1160,270 1260,130 C 1220,-20 660,-10 620,130 Z" />
          <text x="1270" y="135" fontSize="10" fill="#b45309" fontWeight="bold" fontFamily="monospace" opacity="0.35">
            1000m
          </text>

          {/* 850m Brione / Orselina */}
          <path d="M 550,160 C 640,320 1220,330 1340,160" />
          <text x="560" y="240" fontSize="11" fill="#b45309" fontWeight="bold" fontFamily="monospace" opacity="0.40">
            850m (Brione s. Minusio)
          </text>

          {/* 700m */}
          <path d="M 500,200 C 600,380 1280,390 1420,200" />

          {/* 550m Monte Brè */}
          <path d="M 440,240 C 560,440 1340,450 1500,240" />
          <text x="450" y="320" fontSize="11" fill="#b45309" fontWeight="bold" fontFamily="monospace" opacity="0.35">
            550m (Monte Brè)
          </text>

          {/* 400m Madonna del Sasso */}
          <path d="M 380,290 C 520,500 1400,510 1560,290" />
          <text x="390" y="390" fontSize="11" fill="#b45309" fontWeight="bold" fontFamily="monospace" opacity="0.35">
            380m (Madonna del Sasso)
          </text>

          {/* 250m Locarno Piano / Ascona */}
          <path d="M 320,350 C 480,560 1460,570 1600,350" />
          <text x="330" y="460" fontSize="11" fill="#b45309" fontWeight="bold" fontFamily="monospace" opacity="0.35">
            200m (Piazza Grande Locarno)
          </text>
        </g>

        {/* 3. ISOLINEE FITTE INTERMEDIE */}
        <g fill="none" stroke="#0284c7" strokeWidth="0.7" strokeOpacity="0.14">
          <path d="M 100,260 Q 320,220 570,280 T 970,240 T 1520,280" />
          <path d="M 120,290 Q 340,250 590,310 T 990,270 T 1540,310" />
          <path d="M 140,320 Q 360,280 610,340 T 1010,300 T 1560,340" />
          <path d="M 160,360 Q 390,320 640,380 T 1040,340 T 1580,380" />
          <path d="M 190,400 Q 420,360 670,420 T 1070,380 T 1600,420" />
          <path d="M 220,440 Q 450,400 700,460 T 1100,420 T 1600,460" />
          <path d="M 250,490 Q 490,450 740,510 T 1140,470 T 1600,510" />
          <path d="M 290,540 Q 530,500 780,560 T 1180,520 T 1600,560" />

          {/* Centovalli / Onsernone */}
          <path d="M 0,380 Q 220,340 440,420" />
          <path d="M 0,420 Q 250,380 480,460" />
          <path d="M 0,460 Q 280,420 520,500" />
          <path d="M 0,510 Q 310,470 560,550" />
          <text x="30" y="445" fontSize="11" fill="#0284c7" fontWeight="bold" fontFamily="monospace" opacity="0.35">
            Centovalli / Onsernone
          </text>

          {/* Gambarogno / M. Tamaro */}
          <path d="M 850,750 Q 1100,680 1400,740 T 1600,720" />
          <path d="M 880,790 Q 1130,720 1430,780 T 1600,760" />
          <path d="M 910,830 Q 1160,760 1460,820 T 1600,800" />
          <path d="M 950,880 Q 1200,810 1500,870 T 1600,850" />
          <text x="1250" y="740" fontSize="12" fill="#b45309" fontWeight="bold" fontFamily="monospace" opacity="0.40">
            Gambarogno / M. Tamaro
          </text>
        </g>

        {/* 4. COMPASS CONCENTRICO DI QUOTA */}
        <g transform="translate(1020, 110)">
          <circle cx="0" cy="0" r="48" fill="none" stroke="#0284c7" strokeWidth="1.2" strokeOpacity="0.22" strokeDasharray="4 2" />
          <circle cx="0" cy="0" r="36" fill="rgba(255,255,255,0.2)" stroke="#0284c7" strokeWidth="1" strokeOpacity="0.18" />
          <circle cx="0" cy="0" r="18" fill="rgba(56,189,248,0.1)" stroke="#0284c7" strokeWidth="1" strokeOpacity="0.25" />
          <circle cx="0" cy="0" r="3.5" fill="#0284c7" fillOpacity="0.35" />
          <text x="0" y="-54" fontSize="11" fill="#0284c7" fontWeight="bold" fontFamily="monospace" textAnchor="middle" opacity="0.40">
            N · 46°10'
          </text>
          <line x1="0" y1="-44" x2="0" y2="44" stroke="#0284c7" strokeWidth="0.8" strokeOpacity="0.18" />
          <line x1="-44" y1="0" x2="44" y2="0" stroke="#0284c7" strokeWidth="0.8" strokeOpacity="0.18" />
        </g>
      </svg>
    </div>
  );
}
