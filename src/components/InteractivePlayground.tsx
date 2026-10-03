import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  RotateCw, 
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  Box, 
  Download,
  Shapes,
  Magnet,
  ArrowRight
} from 'lucide-react';
import { speakText } from '../utils/speech';
import { downloadSvgAsBmp } from '../utils/bmpEncoder';

interface TrianglePiece {
  id: number;
  color: string;
  name: string;
  slotIndex: number | null;
  rotation: number;
}

const initialPuzzlePieces: TrianglePiece[] = [
  { id: 1, color: '#3b82f6', name: 'Kék szelet', slotIndex: null, rotation: 0 },
  { id: 2, color: '#10b981', name: 'Zöld szelet', slotIndex: null, rotation: 60 },
  { id: 3, color: '#f59e0b', name: 'Sárga szelet', slotIndex: null, rotation: 120 },
  { id: 4, color: '#ef4444', name: 'Piros szelet', slotIndex: null, rotation: 180 },
  { id: 5, color: '#8b5cf6', name: 'Lila szelet', slotIndex: null, rotation: 240 },
  { id: 6, color: '#06b6d4', name: 'Cián szelet', slotIndex: null, rotation: 300 },
];

export const InteractivePlayground: React.FC<{ soundEnabled: boolean }> = ({ soundEnabled }) => {
  const [subMode, setSubMode] = useState<'guided' | 'puzzle'>('guided');
  const [activeExercise, setActiveExercise] = useState<'hexagon' | 'cube'>('hexagon');

  // --- 1. VEZETETT ÉPÍTŐ ÁLLAPOTOK (Hatszög & Kocka tükrözéssel/forgatással) ---
  // Hatszög szeletek építése
  const [placedHexSlices, setPlacedHexSlices] = useState<number[]>([0]); // kezdetben az 1. szelet kész
  const [currentSliceRotation, setCurrentSliceRotation] = useState<number>(60);
  const [currentSliceFlipH, setCurrentSliceFlipH] = useState<boolean>(false);
  const [currentSliceFlipV, setCurrentSliceFlipV] = useState<boolean>(false);
  const [currentSliceColor, setCurrentSliceColor] = useState<string>('#10b981');
  const [hexBuiltCompleted, setHexBuiltCompleted] = useState<boolean>(false);

  // Kocka építő lépések
  // 0: Nincs semmi, 1: Első négyzet, 2: Második négyzet másolva és eltolva, 3: Élek összekötve, 4: Árnyékolva és kész
  const [cubeBuildStep, setCubeBuildStep] = useState<number>(1);
  const [cubeBuiltCompleted, setCubeBuiltCompleted] = useState<boolean>(false);

  // --- 2. PUZZLE ÁLLAPOTOK ---
  const [puzzlePieces, setPuzzlePieces] = useState<TrianglePiece[]>(initialPuzzlePieces);
  const [selectedPieceId, setSelectedPieceId] = useState<number | null>(1);
  const [isCubeModePuzzle, setIsCubeModePuzzle] = useState<boolean>(false);
  const [puzzleCompleted, setPuzzleCompleted] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Geometria
  const cx = 250;
  const cy = 180;
  const r = 110;

  const sliceColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const getSlotPoints = (index: number) => {
    const angle1 = (index * 60 - 30) * (Math.PI / 180);
    const angle2 = ((index + 1) * 60 - 30) * (Math.PI / 180);

    const x1 = cx + r * Math.cos(angle1);
    const y1 = cy + r * Math.sin(angle1);

    const x2 = cx + r * Math.cos(angle2);
    const y2 = cy + r * Math.sin(angle2);

    return `${cx},${cy} ${x1},${y1} ${x2},${y2}`;
  };

  // --- VEZETETT HATSZÖG ÉPÍTŐ MŰVELETEK ---
  const handleHexRotate = (deg: number) => {
    const next = (currentSliceRotation + deg + 360) % 360;
    setCurrentSliceRotation(next);
    if (soundEnabled) speakText(`Forgatás: ${next} fok`);
  };

  const handleHexFlipH = () => {
    const next = !currentSliceFlipH;
    setCurrentSliceFlipH(next);
    if (soundEnabled) speakText('Vízszintes tükrözés');
  };

  const handleHexFlipV = () => {
    const next = !currentSliceFlipV;
    setCurrentSliceFlipV(next);
    if (soundEnabled) speakText('Függőleges tükrözés');
  };

  const handleSnapHexSlice = () => {
    // Kiszámítjuk, melyik slotIndex felel meg a forgatásnak
    // 0: 0°, 1: 60°, 2: 120°, 3: 180°, 4: 240°, 5: 300°
    const slotIdx = Math.round(currentSliceRotation / 60) % 6;

    if (placedHexSlices.includes(slotIdx)) {
      if (soundEnabled) speakText('Ez a hely már foglalt! Forgasd tovább 60 fokkal a következő üres szelethez!');
      return;
    }

    const updated = [...placedHexSlices, slotIdx];
    setPlacedHexSlices(updated);

    // Következő szelet előkészítése
    const nextSlot = (slotIdx + 1) % 6;
    setCurrentSliceRotation(nextSlot * 60);
    setCurrentSliceColor(sliceColors[nextSlot]);

    if (updated.length === 6) {
      setHexBuiltCompleted(true);
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      if (soundEnabled) {
        speakText('Zseniális! Egyetlen háromszögből, forgatással és tükrözéssel felépítetted a teljes hatszöget!');
      }
    } else {
      if (soundEnabled) {
        speakText(`Helyére illesztve! Már ${updated.length} szelet van a hatszögben. Még ${6 - updated.length} hiányzik!`);
      }
    }
  };

  const handleResetHexBuilder = () => {
    setPlacedHexSlices([0]);
    setCurrentSliceRotation(60);
    setCurrentSliceFlipH(false);
    setCurrentSliceFlipV(false);
    setCurrentSliceColor(sliceColors[1]);
    setHexBuiltCompleted(false);
    if (soundEnabled) speakText('Hatszög építő újraindítva');
  };

  // --- VEZETETT KOCKA ÉPÍTŐ MŰVELETEK ---
  const handleNextCubeStep = () => {
    if (cubeBuildStep === 1) {
      setCubeBuildStep(2);
      if (soundEnabled) speakText('2. Lépés: Másold le a négyzetet és told el átlósan!');
    } else if (cubeBuildStep === 2) {
      setCubeBuildStep(3);
      if (soundEnabled) speakText('3. Lépés: Kösdd össze a 4 sarok élét a vonal eszközzel!');
    } else if (cubeBuildStep === 3) {
      setCubeBuildStep(4);
      setCubeBuiltCompleted(true);
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      if (soundEnabled) {
        speakText('Gratulálok! Kiszíneztük a lapokat fény-árnyék hatással, kész a 3D kocka!');
      }
    }
  };

  const handleResetCubeBuilder = () => {
    setCubeBuildStep(1);
    setCubeBuiltCompleted(false);
    if (soundEnabled) speakText('Kocka építő újraindítva');
  };

  // --- PUZZLE MŰVELETEK ---
  const handlePuzzleRotate = () => {
    if (!selectedPieceId) return;
    setPuzzlePieces(prev =>
      prev.map(p => (p.id === selectedPieceId ? { ...p, rotation: (p.rotation + 60) % 360 } : p))
    );
  };

  const handlePuzzleSlotClick = (targetSlot: number) => {
    if (!selectedPieceId) return;
    const existing = puzzlePieces.find(p => p.slotIndex === targetSlot);

    setPuzzlePieces(prev => {
      const updated = prev.map(p => {
        if (p.id === existing?.id) return { ...p, slotIndex: null };
        if (p.id === selectedPieceId) return { ...p, slotIndex: targetSlot, rotation: targetSlot * 60 };
        return p;
      });

      if (updated.every(p => p.slotIndex !== null)) {
        setPuzzleCompleted(true);
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        if (soundEnabled) speakText('Sikeresen kiraktad a hatszöget!');
      }
      return updated;
    });

    const nextUnplaced = puzzlePieces.find(p => p.slotIndex === null && p.id !== selectedPieceId);
    if (nextUnplaced) setSelectedPieceId(nextUnplaced.id);
  };

  const handleResetPuzzle = () => {
    setPuzzlePieces(initialPuzzlePieces);
    setSelectedPieceId(1);
    setPuzzleCompleted(false);
    setIsCubeModePuzzle(false);
  };

  const handleAutoSolvePuzzle = () => {
    setPuzzlePieces(prev => prev.map((p, idx) => ({ ...p, slotIndex: idx, rotation: idx * 60 })));
    setPuzzleCompleted(true);
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    if (soundEnabled) speakText('Minden szelet a helyére került!');
  };

  const handleSaveSvgBmp = (filename: string) => {
    if (svgRef.current) {
      downloadSvgAsBmp(svgRef.current, filename);
      if (soundEnabled) speakText('Sikeres mentés BMP formátumban!');
    }
  };

  return (
    <div className="content-card">
      {/* Fejléc és Módválasztó gombok */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>Próbáld ki Te is! – Tükrözés, Forgatás & Építés</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Készíts szabályos hatszöget egyetlen háromszögből, vagy építs 3D kockát négyzetekből!
          </p>
        </div>

        {/* Módváltó: Vezetett Építő VS Szelet Puzzle */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-surface)', padding: '6px', borderRadius: '12px', border: '1px solid var(--bg-card-border)' }}>
          <button
            type="button"
            className={subMode === 'guided' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setSubMode('guided')}
            style={{ padding: '8px 16px', fontSize: '0.92rem' }}
          >
            <Sparkles size={18} />
            <span>Építés Forgatással & Tükrözéssel</span>
          </button>

          <button
            type="button"
            className={subMode === 'puzzle' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setSubMode('puzzle')}
            style={{ padding: '8px 16px', fontSize: '0.92rem' }}
          >
            <Shapes size={18} />
            <span>Szelet-illesztő Puzzle</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. MÓD: VEZETETT ÉPÍTŐ (TÜKRÖZÉS & FORGATÁS GYAKORLÁS)   */}
      {/* ======================================================== */}
      {subMode === 'guided' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
          {/* Gyakorlat választó fülek: Hatszög vagy Kocka */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className={activeExercise === 'hexagon' ? 'btn-accent' : 'btn-secondary'}
              onClick={() => setActiveExercise('hexagon')}
              style={{ fontWeight: 800 }}
            >
              <Shapes size={20} />
              <span>1. Hatszög Építése (1 Háromszögből)</span>
            </button>

            <button
              type="button"
              className={activeExercise === 'cube' ? 'btn-accent' : 'btn-secondary'}
              onClick={() => setActiveExercise('cube')}
              style={{ fontWeight: 800 }}
            >
              <Box size={20} />
              <span>2. 3D Kocka Építése (Négyzetekből)</span>
            </button>
          </div>

          {/* --- HATSZÖG ÉPÍTŐ GYAKORLAT --- */}
          {activeExercise === 'hexagon' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Sikerüzenet */}
              {hexBuiltCompleted && (
                <div className="success-banner">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CheckCircle2 size={32} />
                    <div>
                      <strong style={{ fontSize: '1.2rem' }}>Fantasztikus! Egyetlen háromszögből felépült a Hatszög!</strong>
                      <div style={{ fontSize: '0.95rem' }}>
                        Megfigyelted, hogyan adta ki a 6 db 60°-os forgatás a teljes 360°-os kört?
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-success"
                      onClick={() => handleSaveSvgBmp('kesz_hatszog_forgatassal.bmp')}
                    >
                      <Download size={18} />
                      <span>Mentés BMP-be</span>
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleResetHexBuilder}
                    >
                      <RefreshCw size={18} />
                      <span>Újra</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Vezérlő és forgató panel */}
              <div style={{ 
                background: 'linear-gradient(135deg, var(--primary-light) 0%, #ffffff 100%)', 
                padding: '14px 18px', 
                borderRadius: '14px', 
                border: '2px solid var(--primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>
                    Aktuális szelet állása:
                  </span>
                  <span style={{ background: 'white', padding: '6px 12px', borderRadius: '8px', fontWeight: 800, border: '1px solid #bfdbfe' }}>
                    Szög: {currentSliceRotation}° | Tükrözés: {currentSliceFlipH ? '↔ Vízszintes ' : ''}{currentSliceFlipV ? '↕ Függőleges' : ''}{!currentSliceFlipH && !currentSliceFlipV ? 'Normál' : ''}
                  </span>
                  <span style={{ fontSize: '0.92rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    ({placedHexSlices.length}/6 szelet a helyén)
                  </span>
                </div>

                {/* Forgató és tükröző gombok */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleHexFlipH}
                    title="Vízszintes tükrözés"
                    style={{ padding: '8px 12px' }}
                  >
                    <FlipHorizontal size={18} />
                    <span>↔ Tükrözés V</span>
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleHexFlipV}
                    title="Függőleges tükrözés (Fejjel lefelé)"
                    style={{ padding: '8px 12px' }}
                  >
                    <FlipVertical size={18} />
                    <span>↕ Tükrözés F</span>
                  </button>

                  <button
                    type="button"
                    className="btn-accent"
                    onClick={() => handleHexRotate(-60)}
                    title="Forgatás vissza 60 fokkal"
                    style={{ padding: '8px 12px' }}
                  >
                    <RotateCcw size={18} />
                    <span>-60°</span>
                  </button>

                  <button
                    type="button"
                    className="btn-accent"
                    onClick={() => handleHexRotate(60)}
                    title="Forgatás előre 60 fokkal"
                    style={{ padding: '8px 12px' }}
                  >
                    <RotateCw size={18} />
                    <span>+60°</span>
                  </button>

                  {/* Illesztés a hatszögbe gomb */}
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSnapHexSlice}
                    disabled={hexBuiltCompleted}
                    style={{ padding: '8px 16px', fontWeight: 800 }}
                  >
                    <Magnet size={18} />
                    <span>Illesztés a helyére!</span>
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleResetHexBuilder}
                    title="Alaphelyzet"
                    style={{ padding: '8px 12px' }}
                  >
                    <RefreshCw size={18} />
                    <span>Újrakezdés</span>
                  </button>
                </div>
              </div>

              {/* Hatszög Építő Vászon (SVG) */}
              <div className="paint-window-frame" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>
                <svg ref={svgRef} width="520" height="360" viewBox="0 0 520 360" style={{ maxWidth: '100%', height: 'auto', background: '#ffffff', borderRadius: '8px' }}>
                  {/* Belső rácsvonalak */}
                  <line x1="0" y1={cy} x2="520" y2={cy} stroke="#f1f5f9" strokeWidth="1" />
                  <line x1={cx} y1="0" x2={cx} y2="360" stroke="#f1f5f9" strokeWidth="1" />

                  {/* 6 lehetséges slot helyének kirajzolása */}
                  {[0, 1, 2, 3, 4, 5].map(idx => {
                    const isPlaced = placedHexSlices.includes(idx);
                    return (
                      <polygon
                        key={idx}
                        points={getSlotPoints(idx)}
                        fill={isPlaced ? sliceColors[idx] : '#f8fafc'}
                        stroke={isPlaced ? '#ffffff' : '#cbd5e1'}
                        strokeWidth={isPlaced ? '2.5' : '1.5'}
                        strokeDasharray={isPlaced ? 'none' : '4,4'}
                      />
                    );
                  })}

                  {/* Éppen kézben lévő, forgatott és tükrözött háromszög előnézete lent balra */}
                  {!hexBuiltCompleted && (
                    <g transform={`translate(100, 290)`}>
                      <text x="0" y="-55" textAnchor="middle" fontSize="12" fontWeight="700" fill="#475569">
                        Kézben lévő háromszög:
                      </text>
                      <g transform={`rotate(${currentSliceRotation}) scale(${currentSliceFlipH ? -1 : 1}, ${currentSliceFlipV ? -1 : 1})`}>
                        <polygon
                          points={`0,0 ${r * 0.5 * Math.cos(-Math.PI / 6)},${r * 0.5 * Math.sin(-Math.PI / 6)} ${r * 0.5 * Math.cos(Math.PI / 6)},${r * 0.5 * Math.sin(Math.PI / 6)}`}
                          fill={currentSliceColor}
                          stroke="#0f172a"
                          strokeWidth="2"
                        />
                        <circle cx="0" cy="0" r="3" fill="#ffffff" />
                      </g>
                    </g>
                  )}

                  {/* Középpont */}
                  <circle cx={cx} cy={cy} r="5" fill="#0f172a" />
                </svg>

                <div style={{ marginTop: '10px', fontSize: '0.92rem', color: 'var(--text-muted)' }}>
                  💡 <strong>Útmutató:</strong> Nyomd meg a <strong>+60°</strong> gombot a háromszög elforgatásához, majd kattints az <strong>Illesztés a helyére</strong> gombra!
                </div>
              </div>
            </div>
          )}

          {/* --- 3D KOCKA ÉPÍTŐ GYAKORLAT --- */}
          {activeExercise === 'cube' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Sikerüzenet */}
              {cubeBuiltCompleted && (
                <div className="success-banner">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CheckCircle2 size={32} />
                    <div>
                      <strong style={{ fontSize: '1.2rem' }}>Kész a Térbeli Kocka!</strong>
                      <div style={{ fontSize: '0.95rem' }}>
                        Láttad? Két négyzet másolásával és 4 él összekötésével valódi 3D test jött létre!
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-success"
                      onClick={() => handleSaveSvgBmp('kesz_kocka_lepesekbol.bmp')}
                    >
                      <Download size={18} />
                      <span>Mentés BMP-be</span>
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleResetCubeBuilder}
                    >
                      <RefreshCw size={18} />
                      <span>Újra</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Lépések gomsora */}
              <div style={{ 
                background: 'var(--bg-surface)', 
                padding: '14px 18px', 
                borderRadius: '14px', 
                border: '1px solid var(--bg-card-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 800, color: 'var(--primary)' }}>Aktuális lépés ({cubeBuildStep}/4):</span>
                  <span style={{ fontWeight: 700 }}>
                    {cubeBuildStep === 1 && '1. Lépés: Előlap négyzet megrajzolása'}
                    {cubeBuildStep === 2 && '2. Lépés: Másolás és átlós eltolás (Hátsó lap)'}
                    {cubeBuildStep === 3 && '3. Lépés: A 4 csúcs összekötése élekkel'}
                    {cubeBuildStep === 4 && '4. Lépés: Fény-árnyék kitöltés színezéssel (Kész a 3D Kocka!)'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {cubeBuildStep < 4 ? (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleNextCubeStep}
                      style={{ fontWeight: 800 }}
                    >
                      <span>Következő lépés végrehajtása</span>
                      <ArrowRight size={18} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleResetCubeBuilder}
                    >
                      <RefreshCw size={18} />
                      <span>Kezdd elölről</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Kocka Építő Vászon (SVG) */}
              <div className="paint-window-frame" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>
                <svg ref={svgRef} width="520" height="360" viewBox="0 0 520 360" style={{ maxWidth: '100%', height: 'auto', background: '#ffffff', borderRadius: '8px' }}>
                  {/* Koordináták a két négyzethez */}
                  {/* Első négyzet (elöl balra lent): (180, 160), méret: 110 */}
                  {/* Második négyzet (hátul jobbra fent eltolva): (240, 100), méret: 110 */}
                  
                  {/* 4. Lépésnél árnyékolt felső és oldalsó kitöltések */}
                  {cubeBuildStep >= 4 && (
                    <>
                      {/* Felső lap (Világos) */}
                      <polygon
                        points="180,160 240,100 350,100 290,160"
                        fill="#93c5fd"
                        stroke="#0f172a"
                        strokeWidth="2.5"
                      />
                      {/* Jobb oldalsó lap (Sötét) */}
                      <polygon
                        points="290,160 350,100 350,210 290,270"
                        fill="#1d4ed8"
                        stroke="#0f172a"
                        strokeWidth="2.5"
                      />
                    </>
                  )}

                  {/* 2. Lépés: Második négyzet (hátsó négyzet) */}
                  {cubeBuildStep >= 2 && (
                    <rect
                      x="240"
                      y="100"
                      width="110"
                      height="110"
                      fill={cubeBuildStep >= 4 ? 'transparent' : '#f1f5f9'}
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      strokeDasharray={cubeBuildStep === 2 ? '4,4' : 'none'}
                    />
                  )}

                  {/* 3. Lépés: Összekötő élek a 4 sarok között */}
                  {cubeBuildStep >= 3 && (
                    <>
                      {/* Bal felső él */}
                      <line x1="180" y1="160" x2="240" y2="100" stroke="#0f172a" strokeWidth="2.5" />
                      {/* Jobb felső él */}
                      <line x1="290" y1="160" x2="350" y2="100" stroke="#0f172a" strokeWidth="2.5" />
                      {/* Jobb alsó él */}
                      <line x1="290" y1="270" x2="350" y2="210" stroke="#0f172a" strokeWidth="2.5" />
                      {/* Bal alsó él (takart szaggatott) */}
                      <line x1="180" y1="270" x2="240" y2="210" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,4" />
                    </>
                  )}

                  {/* 1. Lépés: Első négyzet (előlap) */}
                  {cubeBuildStep >= 1 && (
                    <rect
                      x="180"
                      y="160"
                      width="110"
                      height="110"
                      fill={cubeBuildStep >= 4 ? '#3b82f6' : 'rgba(59, 130, 246, 0.15)'}
                      stroke="#0f172a"
                      strokeWidth="2.5"
                    />
                  )}

                  {/* Sarokpontok jelölése az SNI érthetőségért */}
                  {cubeBuildStep === 2 && (
                    <>
                      <circle cx="180" cy="160" r="4" fill="#ef4444" />
                      <circle cx="240" cy="100" r="4" fill="#ef4444" />
                      <circle cx="290" cy="160" r="4" fill="#ef4444" />
                      <circle cx="350" cy="100" r="4" fill="#ef4444" />
                    </>
                  )}
                </svg>

                <div style={{ marginTop: '10px', fontSize: '0.92rem', color: 'var(--text-muted)' }}>
                  💡 <strong>Kocka trükk a Paintben:</strong> Rajzolj egy négyzetet ➔ Jelöld ki ➔ Másold le (Ctrl+C, Ctrl+V) ➔ Told el átlósan ➔ Kösdd össze a csúcsokat vonallal!
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MÓD: SZELET-ILLESZTŐ PUZZLE JÁTÉK                    */}
      {/* ======================================================== */}
      {subMode === 'puzzle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
              Válassz ki egy háromszöget lent, és kattints a hatszög egyik üres szeletére!
            </span>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn-secondary" onClick={handleResetPuzzle}>
                <RefreshCw size={17} />
                <span>Újrakezdés</span>
              </button>
              <button type="button" className="btn-secondary" onClick={handleAutoSolvePuzzle}>
                <Sparkles size={17} />
                <span>Segíts nekem! (Megoldás)</span>
              </button>
            </div>
          </div>

          {/* Sikerüzenet */}
          {puzzleCompleted && (
            <div className="success-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={32} />
                <div>
                  <strong style={{ fontSize: '1.2rem' }}>Szuper vagy! Kiraktad a hatszöget!</strong>
                  <div style={{ fontSize: '0.95rem' }}>Nézd meg a 3D kocka nézetet is!</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-accent"
                  onClick={() => setIsCubeModePuzzle(prev => !prev)}
                >
                  <Box size={18} />
                  <span>{isCubeModePuzzle ? 'Hatszög nézet' : '3D Kocka nézet'}</span>
                </button>
                <button
                  type="button"
                  className="btn-success"
                  onClick={() => handleSaveSvgBmp('kirakott_hatszog.bmp')}
                >
                  <Download size={18} />
                  <span>Mentés BMP-be</span>
                </button>
              </div>
            </div>
          )}

          {/* Puzzle Rajzvászon */}
          <div className="paint-window-frame" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>
            <svg ref={svgRef} width="460" height="340" viewBox="0 0 500 360" style={{ maxWidth: '100%', height: 'auto', background: '#ffffff', borderRadius: '8px' }}>
              {[0, 1, 2, 3, 4, 5].map(slotIdx => {
                const placed = puzzlePieces.find(p => p.slotIndex === slotIdx);
                const isFilled = !!placed;
                let fill = '#f8fafc';
                if (isFilled) {
                  if (isCubeModePuzzle) {
                    fill = slotIdx === 0 || slotIdx === 5 ? '#93c5fd' : (slotIdx === 1 || slotIdx === 2 ? '#1d4ed8' : '#3b82f6');
                  } else {
                    fill = placed.color;
                  }
                }

                return (
                  <g key={slotIdx} onClick={() => handlePuzzleSlotClick(slotIdx)} style={{ cursor: 'pointer' }}>
                    <polygon
                      points={getSlotPoints(slotIdx)}
                      fill={fill}
                      stroke={isFilled ? '#ffffff' : '#94a3b8'}
                      strokeWidth="3"
                      strokeDasharray={isFilled ? 'none' : '4,4'}
                    />
                    {!isFilled && (
                      <text
                        x={cx + (r * 0.55) * Math.cos((slotIdx * 60) * (Math.PI / 180))}
                        y={cy + (r * 0.55) * Math.sin((slotIdx * 60) * (Math.PI / 180))}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="12"
                        fontWeight="700"
                        fill="#94a3b8"
                      >
                        Hely {slotIdx + 1}
                      </text>
                    )}
                  </g>
                );
              })}
              <circle cx={cx} cy={cy} r="5" fill="#0f172a" />
            </svg>

            {/* Kiválasztott szelet forgatása */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn-accent"
                onClick={handlePuzzleRotate}
                title="Forgatás 60 fokkal"
              >
                <RotateCw size={18} />
                <span>Kiválasztott szelet forgatása (+60°)</span>
              </button>
            </div>
          </div>

          {/* Szelet-választó chipek */}
          <div className="sandbox-controls">
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Háromszög készlet:</div>
            <div className="triangle-selector">
              {puzzlePieces.map(piece => {
                const isSelected = piece.id === selectedPieceId;
                const isPlaced = piece.slotIndex !== null;
                return (
                  <button
                    key={piece.id}
                    type="button"
                    className={`triangle-chip ${isSelected ? 'selected' : ''}`}
                    style={{
                      background: piece.color,
                      opacity: isPlaced ? 0.45 : 1,
                      border: isSelected ? '3px solid #0f172a' : '2px solid transparent'
                    }}
                    onClick={() => setSelectedPieceId(piece.id)}
                  >
                    <span>▲</span>
                    <span>{piece.name}</span>
                    {isPlaced && <span style={{ fontSize: '0.75rem' }}>(Helyén ✔️)</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
