"use client";

import React from "react";

export interface LocarneseTopoWatermarkProps {
  className?: string;
  opacity?: number;
}

/**
 * LocarneseTopoWatermark:
 * Layer cartografico vettoriale SVG a tutto schermo ispirato a maptoposter.
 * Presenta le curve di livello reali del Distretto di Locarno:
 * - In basso a sinistra (quadrante aperto): Monte Ghiridone (2188m), Isole di Brissago, Ronco sopra Ascona, Centovalli e scala cartografica.
 * - Centro e Nord: Cimetta (1670m), Cardada (1340m), Delta e Fiume Maggia, Piazza Grande.
 * - Est e Sud-Est: Pizzo Vogorno (2442m), Valle Verzasca, Riviera del Gambarogno e Monte Tamaro (1962m).
 * - Lago Maggiore (Verbano): batimetria con fossa subacquea profonda a -372m.
 */
export function LocarneseTopoWatermark({
  className = "",
  opacity = 0.38,
}: LocarneseTopoWatermarkProps) {
  return (
    <div
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${className}`}
      style={{
        background:
          "radial-gradient(circle at 75% 20%, #e0f2fe 0%, #ebf2f7 50%, #e2eaf1 100%)",
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
          <linearGradient id="ofclLakeWater" x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.14" />
            <stop offset="50%" stopColor="#0284c7" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0.18" />
          </linearGradient>

          <pattern id="ofclTopoGrid" width="100" height="100" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="100" y2="0" stroke="#0284c7" strokeWidth="0.4" strokeOpacity="0.08" />
            <line x1="0" y1="0" x2="0" y2="100" stroke="#0284c7" strokeWidth="0.4" strokeOpacity="0.08" />
          </pattern>
        </defs>

        {/* Reticolo chilometrico discreto di sottofondo */}
        <rect width="1600" height="1000" fill="url(#ofclTopoGrid)" />

        {/* =========================================================================
            1. SPECCHIO D'ACQUA LAGO MAGGIORE (VERBANO) & BATIMETRIA SUBACQUEA
            ========================================================================= */}
        <path
          d="M 120,1000 C 180,840 240,740 380,660 C 490,600 640,610 740,560 C 850,510 920,420 990,370 C 1060,320 1180,300 1340,330 C 1460,350 1540,310 1600,280 L 1600,1000 Z"
          fill="url(#ofclLakeWater)"
          stroke="#0284c7"
          strokeWidth="2.4"
          strokeOpacity="0.42"
        />

        {/* FOSSA SUBACQUEA E BATIMETRIA (-50m, -150m, -250m, -372m) */}
        <g fill="none" stroke="#0284c7" strokeWidth="1.1" strokeOpacity="0.32" strokeDasharray="6 3">
          <path d="M 190,1000 C 250,860 300,770 430,700 C 530,640 680,650 780,600 C 880,550 940,460 1010,410 C 1080,360 1200,340 1360,370 L 1600,345" />
          <text x="440" y="695" fontSize="10" fill="#0284c7" fontWeight="bold" fontFamily="monospace" opacity="0.55">
            -50m
          </text>

          <path d="M 270,1000 C 330,890 380,810 500,740 C 600,680 730,690 830,640 C 930,590 990,510 1060,460 C 1130,410 1250,390 1410,420 L 1600,400" />
          <text x="520" y="735" fontSize="10" fill="#0284c7" fontWeight="bold" fontFamily="monospace" opacity="0.55">
            -150m
          </text>

          <path d="M 360,1000 C 420,920 470,850 580,785 C 680,730 790,730 890,685 C 980,640 1050,570 1120,520 C 1190,470 1310,450 1460,480 L 1600,465" />
          <text x="600" y="780" fontSize="10" fill="#0284c7" fontWeight="bold" fontFamily="monospace" opacity="0.6">
            -250m
          </text>

          <path d="M 460,1000 C 510,935 560,885 660,830 C 750,780 840,780 940,740 C 1030,690 1100,630 1170,580 C 1240,530 1360,510 1500,535 L 1600,525" />
          <text x="680" y="825" fontSize="11" fill="#0284c7" fontWeight="bold" fontFamily="monospace" opacity="0.75">
            -372m (Abisso Verbano · Quota min CH)
          </text>
        </g>

        {/* FIUME MAGGIA & DELTA ALLUVIONALE (LOCARNO / ASCONA) */}
        <path
          d="M 740,560 Q 755,470 715,380 Q 685,300 715,200 Q 735,110 725,0"
          fill="none"
          stroke="#00A3C4"
          strokeWidth="3.6"
          strokeOpacity="0.45"
          strokeLinecap="round"
        />
        <text x="730" y="270" fontSize="11" fill="#00A3C4" fontWeight="bold" fontFamily="monospace" opacity="0.65">
          Fiume Maggia
        </text>

        {/* FIUME VERZASCA E DIGA (EST) */}
        <path
          d="M 1120,430 Q 1110,340 1140,250 Q 1160,160 1135,0"
          fill="none"
          stroke="#0284c7"
          strokeWidth="2.4"
          strokeOpacity="0.38"
          strokeLinecap="round"
        />
        <text x="1145" y="230" fontSize="10" fill="#0284c7" fontWeight="bold" fontFamily="monospace" opacity="0.55">
          Valle Verzasca (Diga 220m)
        </text>

        {/* =========================================================================
            2. FOCUS IN BASSO A SINISTRA (SOUTH-WEST): GHIRIDONE 2188m, ISOLE, CENTOVALLI
            ========================================================================= */}
        {/* ISOLE DI BRISSAGO (NEL LAGO IN BASSO A SINISTRA) */}
        <g id="isole-brissago">
          {/* Isola Grande (San Pancrazio) */}
          <ellipse
            cx="290"
            cy="770"
            rx="32"
            ry="16"
            transform="rotate(-38, 290, 770)"
            fill="#0284c7"
            fillOpacity="0.30"
            stroke="#0284c7"
            strokeWidth="1.8"
            strokeOpacity="0.65"
          />
          {/* Isola Piccola (Sant'Apollinare) */}
          <ellipse
            cx="325"
            cy="745"
            rx="16"
            ry="9"
            transform="rotate(-38, 325, 745)"
            fill="#0284c7"
            fillOpacity="0.30"
            stroke="#0284c7"
            strokeWidth="1.4"
            strokeOpacity="0.65"
          />
          <text x="230" y="740" fontSize="11" fill="#0369a1" fontWeight="bold" fontFamily="monospace" opacity="0.8">
            ✦ Isole di Brissago (197m)
          </text>
        </g>

        {/* FIUME MELEZZA & CANYON DELLE CENTOVALLI (DA OVEST VERSO MAGGIA) */}
        <path
          d="M 0,440 Q 160,430 320,470 Q 450,500 620,535 T 740,560"
          fill="none"
          stroke="#00A3C4"
          strokeWidth="2.8"
          strokeOpacity="0.42"
          strokeLinecap="round"
        />
        <text x="60" y="430" fontSize="11" fill="#00A3C4" fontWeight="bold" fontFamily="monospace" opacity="0.7">
          Centovalli / Fiume Melezza
        </text>

        {/* MASSICCIO DEL MONTE GHIRIDONE / GRIDONE (2188m) - CURVE DENSE A SUD-OVEST */}
        <g fill="none" stroke="#d97706" strokeWidth="1.3" strokeOpacity="0.38">
          {/* Vetta Ghiridone 2188m */}
          <ellipse cx="140" cy="710" rx="38" ry="24" strokeWidth="2.2" strokeOpacity="0.75" />
          <circle cx="140" cy="710" r="3.5" fill="#b45309" fillOpacity="0.8" />
          <text x="140" y="705" fontSize="12" fill="#b45309" fontWeight="extrabold" fontFamily="monospace" textAnchor="middle" opacity="0.9">
            ▲ 2188m (Monte Ghiridone)
          </text>

          {/* 2000m */}
          <ellipse cx="145" cy="715" rx="68" ry="42" strokeWidth="1.6" strokeOpacity="0.55" />
          <text x="200" y="718" fontSize="9" fill="#b45309" fontWeight="bold" fontFamily="monospace" opacity="0.65">
            2000m
          </text>

          {/* 1800m */}
          <ellipse cx="150" cy="720" rx="105" ry="65" />
          <text x="245" y="725" fontSize="9" fill="#b45309" fontWeight="bold" fontFamily="monospace" opacity="0.65">
            1800m
          </text>

          {/* 1600m */}
          <path d="M 0,640 C 70,645 170,650 220,720 C 250,770 240,845 180,885 C 110,920 40,910 0,900" />
          <text x="225" y="805" fontSize="9" fill="#b45309" fontWeight="bold" fontFamily="monospace" opacity="0.6">
            1600m
          </text>

          {/* 1400m */}
          <path d="M 0,590 C 90,600 210,610 270,695 C 310,760 290,870 220,930 C 140,975 50,965 0,950" />

          {/* 1200m */}
          <path d="M 0,540 C 110,555 250,570 320,670 C 370,750 350,890 260,965 C 190,1000 80,995 0,990" />
          <text x="315" y="660" fontSize="10" fill="#b45309" fontWeight="bold" fontFamily="monospace" opacity="0.65">
            1200m
          </text>

          {/* 1000m - Costone Brissago */}
          <path d="M 0,490 C 130,515 290,530 370,645 C 420,735 410,910 300,1000" />

          {/* 800m - Ronco sopra Ascona / Poggio Pioda */}
          <path d="M 0,440 C 160,475 330,495 420,620 C 475,715 465,920 340,1000" />
          <text x="360" y="615" fontSize="10" fill="#b45309" fontWeight="bold" fontFamily="monospace" opacity="0.7">
            800m (Ronco s. Ascona)
          </text>

          {/* 600m */}
          <path d="M 40,390 C 200,435 370,465 470,600 C 530,700 515,920 380,1000" />

          {/* 400m - Pista Belvedere & Brissago Riva */}
          <path d="M 90,350 C 240,400 420,435 520,575 C 585,680 565,910 430,1000" />
          <text x="210" y="880" fontSize="11" fill="#b45309" fontWeight="bold" fontFamily="monospace" opacity="0.8">
            Brissago (Sacro Monte 370m)
          </text>

          {/* 250m - Riva Ascona / Golfo */}
          <path d="M 140,310 C 290,365 470,405 570,550 C 635,660 615,890 480,1000" />
          <text x="440" y="555" fontSize="11" fill="#0284c7" fontWeight="bold" fontFamily="monospace" opacity="0.8">
            Golfo di Ascona (197m)
          </text>
        </g>

        {/* SCALA CARTOGRAFICA & COORDINATE IN BASSO A SINISTRA (ZONA APERTA) */}
        <g transform="translate(45, 930)" id="carto-scale-legend">
          {/* Barra di scala chilometrica */}
          <rect x="0" y="0" width="180" height="4" fill="#0284c7" fillOpacity="0.4" />
          <rect x="0" y="0" width="60" height="4" fill="#0284c7" fillOpacity="0.85" />
          <rect x="120" y="0" width="60" height="4" fill="#0284c7" fillOpacity="0.85" />
          <line x1="0" y1="-3" x2="0" y2="7" stroke="#0284c7" strokeWidth="1" strokeOpacity="0.7" />
          <line x1="60" y1="-3" x2="60" y2="7" stroke="#0284c7" strokeWidth="1" strokeOpacity="0.7" />
          <line x1="120" y1="-3" x2="120" y2="7" stroke="#0284c7" strokeWidth="1" strokeOpacity="0.7" />
          <line x1="180" y1="-3" x2="180" y2="7" stroke="#0284c7" strokeWidth="1" strokeOpacity="0.7" />
          <text x="0" y="18" fontSize="9" fill="#0284c7" fontFamily="monospace" fontWeight="bold">0</text>
          <text x="54" y="18" fontSize="9" fill="#0284c7" fontFamily="monospace" fontWeight="bold">2 km</text>
          <text x="114" y="18" fontSize="9" fill="#0284c7" fontFamily="monospace" fontWeight="bold">4 km</text>
          <text x="172" y="18" fontSize="9" fill="#0284c7" fontFamily="monospace" fontWeight="bold">6 km</text>

          {/* Dicitura geodetica ufficiale svizzera */}
          <text x="0" y="34" fontSize="9" fill="#475569" fontFamily="monospace" fontWeight="bold" opacity="0.8">
            CH1903+ / LV95 · 46°08'40&quot; N · 08°44'25&quot; E
          </text>
          <text x="0" y="46" fontSize="8" fill="#64748b" fontFamily="monospace" opacity="0.7">
            Rilievo Altimetrico Ge.Co.Ti · Equidistanza curve 50m / 100m
          </text>
        </g>

        {/* =========================================================================
            3. QUADRANTE CENTRO E NORD: CARDADA (1340m), CIMETTA (1670m), LOCARNO
            ========================================================================= */}
        <g fill="none" stroke="#d97706" strokeWidth="1.3" strokeOpacity="0.35">
          {/* 1670m Cimetta */}
          <ellipse cx="940" cy="90" rx="95" ry="45" strokeWidth="2.0" strokeOpacity="0.65" />
          <circle cx="940" cy="90" r="3.5" fill="#b45309" fillOpacity="0.7" />
          <text x="940" y="94" fontSize="12" fill="#b45309" fontWeight="bold" fontFamily="monospace" textAnchor="middle" opacity="0.85">
            ▲ 1670m (Cimetta)
          </text>

          {/* 1500m */}
          <ellipse cx="935" cy="95" rx="145" ry="70" />
          <text x="1090" y="98" fontSize="10" fill="#b45309" fontWeight="bold" fontFamily="monospace" opacity="0.6">
            1500m
          </text>

          {/* 1340m Cardada */}
          <ellipse cx="930" cy="100" rx="205" ry="100" strokeWidth="2.0" strokeOpacity="0.65" />
          <circle cx="930" cy="100" r="3.5" fill="#b45309" fillOpacity="0.7" />
          <text x="930" y="195" fontSize="12" fill="#b45309" fontWeight="bold" fontFamily="monospace" textAnchor="middle" opacity="0.85">
            ▲ 1340m (Cardada)
          </text>

          {/* 1200m */}
          <path d="M 680,110 C 740,210 1100,220 1180,110 C 1140,5 720,10 680,110 Z" />

          {/* 1000m */}
          <path d="M 620,130 C 690,260 1160,270 1260,130 C 1220,-20 660,-10 620,130 Z" />
          <text x="1270" y="135" fontSize="10" fill="#b45309" fontWeight="bold" fontFamily="monospace" opacity="0.6">
            1000m
          </text>

          {/* 850m Brione / Orselina */}
          <path d="M 550,160 C 640,320 1220,330 1340,160" />
          <text x="560" y="240" fontSize="11" fill="#b45309" fontWeight="bold" fontFamily="monospace" opacity="0.75">
            850m (Brione s. Minusio)
          </text>

          {/* 700m */}
          <path d="M 500,200 C 600,380 1280,390 1420,200" />

          {/* 550m Monte Brè */}
          <path d="M 440,240 C 560,440 1340,450 1500,240" />
          <text x="450" y="320" fontSize="11" fill="#b45309" fontWeight="bold" fontFamily="monospace" opacity="0.7">
            550m (Monte Brè)
          </text>

          {/* 400m Madonna del Sasso */}
          <path d="M 380,290 C 520,500 1400,510 1560,290" />
          <text x="390" y="390" fontSize="11" fill="#b45309" fontWeight="bold" fontFamily="monospace" opacity="0.75">
            380m (Madonna del Sasso)
          </text>

          {/* 200m Piazza Grande Locarno */}
          <path d="M 320,350 C 480,560 1460,570 1600,350" />
          <text x="330" y="460" fontSize="11" fill="#b45309" fontWeight="bold" fontFamily="monospace" opacity="0.75">
            200m (Piazza Grande Locarno)
          </text>
        </g>

        {/* =========================================================================
            4. QUADRANTE EST E SUD-EST: PIZZO VOGORNO (2442m), GAMBAROGNO, MONTE TAMARO (1962m)
            ========================================================================= */}
        <g fill="none" stroke="#d97706" strokeWidth="1.2" strokeOpacity="0.32">
          {/* Pizzo Vogorno 2442m (Alto a Destra) */}
          <ellipse cx="1380" cy="80" rx="60" ry="32" strokeWidth="1.8" strokeOpacity="0.6" />
          <circle cx="1380" cy="80" r="3" fill="#b45309" fillOpacity="0.7" />
          <text x="1380" y="84" fontSize="11" fill="#b45309" fontWeight="bold" fontFamily="monospace" textAnchor="middle" opacity="0.8">
            ▲ 2442m (Pizzo Vogorno)
          </text>
          <ellipse cx="1375" cy="85" rx="100" ry="55" />
          <path d="M 1220,110 C 1300,180 1480,180 1580,90" />

          {/* Monte Tamaro 1962m (Basso a Destra) */}
          <ellipse cx="1480" cy="820" rx="80" ry="46" strokeWidth="1.8" strokeOpacity="0.6" />
          <circle cx="1480" cy="820" r="3.5" fill="#b45309" fillOpacity="0.7" />
          <text x="1480" y="824" fontSize="12" fill="#b45309" fontWeight="bold" fontFamily="monospace" textAnchor="middle" opacity="0.85">
            ▲ 1962m (Monte Tamaro)
          </text>

          {/* Riviera del Gambarogno (Costone orientale del Lago) */}
          <path d="M 850,750 Q 1100,680 1400,740 T 1600,720" />
          <path d="M 880,790 Q 1130,720 1430,780 T 1600,760" />
          <path d="M 910,830 Q 1160,760 1460,820 T 1600,800" />
          <path d="M 950,880 Q 1200,810 1500,870 T 1600,850" />
          <text x="1180" y="725" fontSize="11" fill="#b45309" fontWeight="bold" fontFamily="monospace" opacity="0.75">
            Riviera del Gambarogno (Vira / San Nazzaro)
          </text>
        </g>

        {/* =========================================================================
            5. ISOLINEE FITTE INTERMEDIE A TUTTO SCHERMO
            ========================================================================= */}
        <g fill="none" stroke="#0284c7" strokeWidth="0.8" strokeOpacity="0.22">
          <path d="M 60,240 Q 320,190 570,250 T 970,210 T 1520,250" />
          <path d="M 80,270 Q 340,220 590,280 T 990,240 T 1540,280" />
          <path d="M 100,300 Q 360,250 610,310 T 1010,270 T 1560,310" />
          <path d="M 120,330 Q 390,280 640,340 T 1040,300 T 1580,340" />
          <path d="M 150,370 Q 420,320 670,380 T 1070,340 T 1600,380" />
          <path d="M 180,410 Q 450,360 700,420 T 1100,380 T 1600,420" />
          <path d="M 210,460 Q 490,410 740,470 T 1140,430 T 1600,470" />
          <path d="M 250,510 Q 530,460 780,520 T 1180,480 T 1600,520" />
        </g>

        {/* =========================================================================
            6. COMPASS ROSA DEI VENTI DI QUOTA (ALTO A DESTRA)
            ========================================================================= */}
        <g transform="translate(1040, 95)" id="topo-compass">
          <circle cx="0" cy="0" r="48" fill="none" stroke="#0284c7" strokeWidth="1.5" strokeOpacity="0.38" strokeDasharray="4 2" />
          <circle cx="0" cy="0" r="36" fill="rgba(255,255,255,0.3)" stroke="#0284c7" strokeWidth="1.1" strokeOpacity="0.32" />
          <circle cx="0" cy="0" r="18" fill="rgba(56,189,248,0.15)" stroke="#0284c7" strokeWidth="1.3" strokeOpacity="0.45" />
          <circle cx="0" cy="0" r="3.5" fill="#0284c7" fillOpacity="0.6" />
          <text x="0" y="-54" fontSize="11" fill="#0284c7" fontWeight="bold" fontFamily="monospace" textAnchor="middle" opacity="0.75">
            N · 46°10'
          </text>
          <line x1="0" y1="-44" x2="0" y2="44" stroke="#0284c7" strokeWidth="0.9" strokeOpacity="0.32" />
          <line x1="-44" y1="0" x2="44" y2="0" stroke="#0284c7" strokeWidth="0.9" strokeOpacity="0.32" />
        </g>
      </svg>
    </div>
  );
}
