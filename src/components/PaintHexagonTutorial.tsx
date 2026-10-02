import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  RotateCw, 
  Copy, 
  Volume2, 
  MousePointer, 
  Sparkles
} from 'lucide-react';
import { speakText, stopSpeech } from '../utils/speech';

interface StepData {
  stepNumber: number;
  title: string;
  instruction: string;
  tip: string;
  paintTool: string;
  actionSummary: string;
}

const steps: StepData[] = [
  {
    stepNumber: 1,
    title: '1. Lépés: Egyenlő oldalú háromszög rajzolása',
    instruction: 'Válaszd ki az Alakzatok közül a Háromszöget! Tartsd lenyomva a Shift billentyűt rajzolás közben, hogy minden oldala pontosan egyforma hosszú legyen.',
    tip: '💡 Trükk: A Shift billentyű segít, hogy ne legyen ferde vagy torz a háromszög!',
    paintTool: 'Alakzatok ➔ Háromszög (Shift tartás)',
    actionSummary: 'Megrajzoljuk az első alapelemet.'
  },
  {
    stepNumber: 2,
    title: '2. Lépés: Kijelölés és Átlátszó kijelölés bekapcsolása',
    instruction: 'Kattints a Kijelölés gombra, majd kapcsold be az "Átlátszó kijelölés" opciót! Ez a legfontosabb lépés: így a háromszög körüli fehér háttér nem fogja letakarni a többi alakzatot.',
    tip: '⭐ Nagyon fontos: Ha ezt elfelejted, a fehér négyzet eltakarja a mellette lévő elemeket!',
    paintTool: 'Kijelölés ➔ Átlátszó kijelölés Pipálva ✔️',
    actionSummary: 'A fehér háttér láthatatlanná válik.'
  },
  {
    stepNumber: 3,
    title: '3. Lépés: Másolás és Beillesztés (Sokszorosítás)',
    instruction: 'Jelöld ki a háromszöget, majd használd a Ctrl + C (Másolás) és Ctrl + V (Beillesztés) billentyűparancsot, hogy pontos másolatot kapj!',
    tip: '💡 Tipp: Összesen 6 egyforma háromszögre lesz szükségünk a teljes hatszöghöz.',
    paintTool: 'Vágólap ➔ Másolás & Beillesztés (Ctrl+C, Ctrl+V)',
    actionSummary: 'Létrejön egy új, azonos méretű háromszög.'
  },
  {
    stepNumber: 4,
    title: '4. Lépés: A forgatás geometriája (60 fokonként)',
    instruction: 'A hatszög belső szöge a középpont körül 360 fok. Mivel 6 háromszögünk van: 360 ÷ 6 = 60 fok! Minden új háromszöget 60 fokkal forgatunk tovább a Paint forgatás vagy tükrözés eszközével.',
    tip: '🔄 Térbeli látás: Képzeld el úgy, mint a tortaszeleteket egy kerek tortán!',
    paintTool: 'Kép ➔ Forgatás / Szögbeállítás',
    actionSummary: 'A szeletek körbe fordulnak a középpont felé.'
  },
  {
    stepNumber: 5,
    title: '5. Lépés: Összeillesztés és színezés (Kész a Hatszög!)',
    instruction: 'Illeszd a háromszögek hegyes csúcsait pontosan a középponthoz! Végül a Festékesvödörrel fesd be a szeleteket különböző színekkel, hogy lásd a forgás ritmusát.',
    tip: '🎉 Gratulálunk! Egyetlen háromszögből egy szabályos hatszöget építettél fel!',
    paintTool: 'Eszközök ➔ Kitöltés színnel (Festékesvödör)',
    actionSummary: 'A 6 szelet összeér és kirajzolódik a szabályos hatszög.'
  }
];

// 6 háromszög színei
const sliceColors = [
  '#3b82f6', // Kék
  '#10b981', // Zöld
  '#f59e0b', // Sárga/Narancs
  '#ef4444', // Piros
  '#8b5cf6', // Lila
  '#06b6d4', // Cián
];

export const PaintHexagonTutorial: React.FC<{ soundEnabled: boolean }> = ({ soundEnabled }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(3500); // 3.5 másodperc/lépés normál módban

  const step = steps[currentStep];

  // Automatikus hangfelolvasás lépésváltáskor, ha be van kapcsolva
  useEffect(() => {
    if (soundEnabled) {
      speakText(`${step.title}. ${step.instruction}`);
    }
    return () => {
      stopSpeech();
    };
  }, [currentStep, soundEnabled]);

  // Automatikus lejátszás időzítője
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isPlaying) {
      timer = setTimeout(() => {
        if (currentStep < steps.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, playbackSpeed);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, playbackSpeed]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSpeak = () => {
    speakText(`${step.title}. ${step.instruction} ${step.tip}`);
  };

  // SVG paraméterek a szabályos hatszög kirakásához
  // Egyenlő oldalú háromszög: középpontból kiindulva a 6 szegmens
  const centerX = 260;
  const centerY = 200;
  const radius = 120; // sugár a csúcsig

  // Kiszámítjuk a csúcsokat
  const getSlicePoints = (index: number) => {
    const angle1 = (index * 60 - 30) * (Math.PI / 180);
    const angle2 = ((index + 1) * 60 - 30) * (Math.PI / 180);

    const x1 = centerX + radius * Math.cos(angle1);
    const y1 = centerY + radius * Math.sin(angle1);

    const x2 = centerX + radius * Math.cos(angle2);
    const y2 = centerY + radius * Math.sin(angle2);

    return `${centerX},${centerY} ${x1},${y1} ${x2},${y2}`;
  };

  return (
    <div className="content-card">
      {/* Címsor és gyors összefoglaló */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>Windows 11 Paint Útmutató</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Hogyan készíthetsz egyetlen háromszögből hatszöget másolással és forgatással?
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={handleSpeak}
            title="Lépés felolvasása"
          >
            <Volume2 size={18} />
            <span>Felolvasás</span>
          </button>
        </div>
      </div>

      {/* Windows 11 Paint ablak szimuláció */}
      <div className="paint-window-frame">
        {/* Paint ablak fejléc */}
        <div className="paint-titlebar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎨</span>
            <span>Névtelen - Paint (Windows 11)</span>
          </div>
          <div className="paint-window-dots">
            <div className="window-dot min"></div>
            <div className="window-dot max"></div>
            <div className="window-dot close"></div>
          </div>
        </div>

        {/* Paint menüszalag (Ribbon) */}
        <div className="paint-ribbon">
          {/* Vágólap csoport */}
          <div className="ribbon-group">
            <div className="ribbon-tools">
              <button 
                type="button" 
                className={`ribbon-btn ${currentStep === 2 ? 'highlighted attention-pulse' : ''}`}
                title="Beillesztés (Ctrl+V)"
              >
                <Copy size={16} />
                <span>Beillesztés</span>
              </button>
            </div>
            <span className="ribbon-group-title">Vágólap</span>
          </div>

          {/* Kijelölés és kép csoport */}
          <div className="ribbon-group">
            <div className="ribbon-tools">
              <button 
                type="button" 
                className={`ribbon-btn ${currentStep === 1 ? 'highlighted attention-pulse' : ''}`}
                title="Kijelölés eszköz"
              >
                <MousePointer size={16} />
                <span>Kijelölés</span>
              </button>
              <button 
                type="button" 
                className={`ribbon-btn ${currentStep === 3 ? 'highlighted attention-pulse' : ''}`}
                title="Forgatás"
              >
                <RotateCw size={16} />
                <span>Forgatás (60°)</span>
              </button>
            </div>
            <span className="ribbon-group-title">Kép</span>
          </div>

          {/* Átlátszó kijelölés kiemelő sáv (Nagyon fontos SNI-nek) */}
          <div className="ribbon-group" style={{ background: currentStep === 1 ? 'var(--accent-light)' : 'transparent', borderRadius: '8px', padding: '4px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
              <span style={{ color: currentStep === 1 ? '#d97706' : 'var(--text-main)' }}>
                {currentStep >= 1 ? '☑ Átlátszó kijelölés BE' : '☐ Átlátszó kijelölés'}
              </span>
            </div>
            <span className="ribbon-group-title">Fontos beállítás</span>
          </div>

          {/* Eszközök és Színek csoport */}
          <div className="ribbon-group">
            <div className="ribbon-tools">
              <span className={`ribbon-btn ${currentStep === 0 ? 'highlighted attention-pulse' : ''}`}>
                ▲ Háromszög
              </span>
              <span className={`ribbon-btn ${currentStep === 4 ? 'highlighted attention-pulse' : ''}`}>
                🪣 Kitöltés
              </span>
            </div>
            <span className="ribbon-group-title">Eszközök</span>
          </div>
        </div>

        {/* Paint rajzvászon terület animációval */}
        <div className="paint-canvas-area" style={{ position: 'relative', overflow: 'hidden' }}>
          <svg width="520" height="380" viewBox="0 0 520 380" style={{ maxWidth: '100%', height: 'auto' }}>
            {/* Rács és segédvonalak */}
            <defs>
              <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.25" />
              </filter>
            </defs>

            {/* Középpont jelölő segédkör */}
            <circle cx={centerX} cy={centerY} r="3" fill="#94a3b8" />

            {/* 1. LÉPÉS: Egyetlen háromszög rajzolása a vásznon */}
            {currentStep === 0 && (
              <g>
                <polygon
                  points={getSlicePoints(0)}
                  fill="#93c5fd"
                  stroke="#2563eb"
                  strokeWidth="3"
                  filter="url(#shadow)"
                />
                {/* Rajzoló kurzor illusztráció */}
                <g transform={`translate(${centerX + 80}, ${centerY + 40})`} className="attention-pulse">
                  <path d="M0,0 L18,12 L10,14 L6,22 Z" fill="#0f172a" stroke="#ffffff" strokeWidth="1.5" />
                  <text x="24" y="14" fontSize="14" fontWeight="700" fill="#2563eb">
                    Shift + Húzás 🖱️
                  </text>
                </g>
                <text x={centerX} y={centerY + 95} textAnchor="middle" fontSize="14" fontWeight="600" fill="#475569">
                  Szabályos háromszög (Minden oldal 120 px)
                </text>
              </g>
            )}

            {/* 2. LÉPÉS: Kijelölés szaggatott vonallal + Átlátszó kijelölés magyarázat */}
            {currentStep === 1 && (
              <g>
                {/* Háromszög */}
                <polygon
                  points={getSlicePoints(0)}
                  fill="#93c5fd"
                  stroke="#2563eb"
                  strokeWidth="3"
                />
                {/* Paint szaggatott kijelölő doboz */}
                <rect
                  x={centerX - 5}
                  y={centerY - 70}
                  width="130"
                  height="140"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
                {/* Kijelölő pontok */}
                <rect x={centerX - 8} y={centerY - 73} width="6" height="6" fill="#ffffff" stroke="#2563eb" />
                <rect x={centerX + 122} y={centerY - 73} width="6" height="6" fill="#ffffff" stroke="#2563eb" />
                <rect x={centerX + 122} y={centerY + 67} width="6" height="6" fill="#ffffff" stroke="#2563eb" />
                <rect x={centerX - 8} y={centerY + 67} width="6" height="6" fill="#ffffff" stroke="#2563eb" />

                {/* Figyelmeztető felirat */}
                <rect x="20" y="30" width="220" height="56" rx="8" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
                <text x="32" y="52" fontSize="14" fontWeight="700" fill="#b45309">
                  Átlátszó kijelölés: BE ✔️
                </text>
                <text x="32" y="72" fontSize="12" fill="#78350f">
                  A fehér háttér eltűnik!
                </text>
              </g>
            )}

            {/* 3. LÉPÉS: Másolás és Beillesztés */}
            {currentStep === 2 && (
              <g>
                {/* Első háromszög */}
                <polygon
                  points={getSlicePoints(0)}
                  fill="#93c5fd"
                  stroke="#2563eb"
                  strokeWidth="3"
                />
                {/* Második háromszög beillesztve, kissé eltolva */}
                <g transform="translate(40, -40)" opacity="0.95" filter="url(#shadow)">
                  <polygon
                    points={getSlicePoints(0)}
                    fill="#a7f3d0"
                    stroke="#059669"
                    strokeWidth="3"
                  />
                  <rect
                    x={centerX - 5}
                    y={centerY - 70}
                    width="130"
                    height="140"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                  />
                </g>
                <text x={centerX} y="340" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1e293b">
                  Ctrl + C (Másolás) ➔ Ctrl + V (Beillesztés)
                </text>
              </g>
            )}

            {/* 4. LÉPÉS: Forgatás megértése 60 fokonként */}
            {currentStep === 3 && (
              <g>
                {/* Kirajzoljuk a már elforgatott szeleteket áttetszően */}
                {[0, 1, 2, 3].map(idx => (
                  <polygon
                    key={idx}
                    points={getSlicePoints(idx)}
                    fill={sliceColors[idx]}
                    opacity={idx === 3 ? 1 : 0.45}
                    stroke="#1e293b"
                    strokeWidth="2"
                  />
                ))}

                {/* Forgatási nyíl és szögjelzés */}
                <path
                  d={`M ${centerX + 80} ${centerY - 40} A 90 90 0 0 1 ${centerX + 30} ${centerY + 85}`}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="3"
                  strokeDasharray="4,4"
                  markerEnd="url(#arrow)"
                />
                <circle cx={centerX} cy={centerY} r="28" fill="#ffffff" stroke="#f59e0b" strokeWidth="2" />
                <text x={centerX} y={centerY + 6} textAnchor="middle" fontSize="13" fontWeight="800" fill="#b45309">
                  +60°
                </text>

                <text x={centerX} y="340" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1e293b">
                  360° ÷ 6 = 60° (Minden lépésben 60 fokot forgatunk)
                </text>
              </g>
            )}

            {/* 5. LÉPÉS: Kész hatszög és színes kitöltés */}
            {currentStep === 4 && (
              <g filter="url(#shadow)">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <polygon
                    key={idx}
                    points={getSlicePoints(idx)}
                    fill={sliceColors[idx]}
                    stroke="#ffffff"
                    strokeWidth="3"
                  />
                ))}
                {/* Középponti csillag/díszítés */}
                <circle cx={centerX} cy={centerY} r="5" fill="#ffffff" />
                <text x={centerX} y="350" textAnchor="middle" fontSize="16" fontWeight="800" fill="#059669">
                  ✨ Kész a szabályos hatszög! (6 db háromszög)
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Lépés navigáció és magyarázó doboz (SNI támogatott) */}
      <div className="step-control-card">
        <div className="step-indicator-row">
          <div className="step-badge">
            <Sparkles size={16} />
            <span>{currentStep + 1} / {steps.length} lépés</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Lejátszási sebesség:</span>
            <button
              type="button"
              className={`toggle-chip ${playbackSpeed === 4500 ? 'active' : ''}`}
              onClick={() => setPlaybackSpeed(4500)}
              style={{ padding: '4px 10px', fontSize: '0.82rem' }}
            >
              Lassú (SNI)
            </button>
            <button
              type="button"
              className={`toggle-chip ${playbackSpeed === 2500 ? 'active' : ''}`}
              onClick={() => setPlaybackSpeed(2500)}
              style={{ padding: '4px 10px', fontSize: '0.82rem' }}
            >
              Normál
            </button>
          </div>
        </div>

        {/* Lépés címe és részletes szövege */}
        <div className="step-instructions">
          {step.instruction}
        </div>

        {/* Pedagógiai és Paint tipp */}
        <div className="step-subtext">
          <strong>{step.tip}</strong>
          <div style={{ marginTop: '4px', fontSize: '0.88rem', color: 'var(--text-light)' }}>
            📍 Paint eszköz: <strong>{step.paintTool}</strong>
          </div>
        </div>

        {/* Akció gombok: Előző, Lejátszás, Következő */}
        <div className="step-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            <ChevronLeft size={20} />
            <span>Előző lépés</span>
          </button>

          <button
            type="button"
            className={isPlaying ? 'btn-secondary' : 'btn-accent'}
            onClick={() => setIsPlaying(prev => !prev)}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            <span>{isPlaying ? 'Szüneteltetés' : 'Automatikus bemutató'}</span>
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handleNext}
            disabled={currentStep === steps.length - 1}
          >
            <span>Következő lépés</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
