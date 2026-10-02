import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { RotateCw, RefreshCw, Sparkles, CheckCircle2, Box, Download } from 'lucide-react';
import { speakText } from '../utils/speech';
import { downloadSvgAsBmp } from '../utils/bmpEncoder';

interface TrianglePiece {
  id: number;
  color: string;
  name: string;
  slotIndex: number | null; // null ha még lent van a készletben, 0..5 ha már a hatszögben van
  rotation: number; // 0, 60, 120, 180, 240, 300
}

const initialPieces: TrianglePiece[] = [
  { id: 1, color: '#3b82f6', name: 'Kék szelet', slotIndex: null, rotation: 0 },
  { id: 2, color: '#10b981', name: 'Zöld szelet', slotIndex: null, rotation: 60 },
  { id: 3, color: '#f59e0b', name: 'Sárga szelet', slotIndex: null, rotation: 120 },
  { id: 4, color: '#ef4444', name: 'Piros szelet', slotIndex: null, rotation: 180 },
  { id: 5, color: '#8b5cf6', name: 'Lila szelet', slotIndex: null, rotation: 240 },
  { id: 6, color: '#06b6d4', name: 'Cián szelet', slotIndex: null, rotation: 300 },
];

export const InteractivePlayground: React.FC<{ soundEnabled: boolean }> = ({ soundEnabled }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [pieces, setPieces] = useState<TrianglePiece[]>(initialPieces);
  const [selectedPieceId, setSelectedPieceId] = useState<number | null>(1);
  const [isCubeMode, setIsCubeMode] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);

  // Kiválasztott elem
  const selectedPiece = pieces.find(p => p.id === selectedPieceId);

  // Középpont és méret
  const cx = 250;
  const cy = 180;
  const r = 110;

  // Hatszög 6 szeletének koordinátái
  const getSlotPoints = (index: number) => {
    const angle1 = (index * 60 - 30) * (Math.PI / 180);
    const angle2 = ((index + 1) * 60 - 30) * (Math.PI / 180);

    const x1 = cx + r * Math.cos(angle1);
    const y1 = cy + r * Math.sin(angle1);

    const x2 = cx + r * Math.cos(angle2);
    const y2 = cy + r * Math.sin(angle2);

    return `${cx},${cy} ${x1},${y1} ${x2},${y2}`;
  };

  // Forgatás 60 fokkal
  const handleRotate = () => {
    if (!selectedPieceId) return;
    setPieces(prev =>
      prev.map(p => {
        if (p.id === selectedPieceId) {
          return { ...p, rotation: (p.rotation + 60) % 360 };
        }
        return p;
      })
    );
  };

  // Rekeszbe illesztés
  const handleSlotClick = (targetSlot: number) => {
    if (!selectedPieceId) return;

    // Megnézzük, van-e már valami ebben a rekeszben
    const existingInSlot = pieces.find(p => p.slotIndex === targetSlot);

    setPieces(prev => {
      const updated = prev.map(p => {
        if (p.id === existingInSlot?.id) {
          return { ...p, slotIndex: null };
        }
        if (p.id === selectedPieceId) {
          return { ...p, slotIndex: targetSlot, rotation: targetSlot * 60 };
        }
        return p;
      });

      // Ellenőrizzük, hogy mind a 6 a helyén van-e
      const allPlaced = updated.every(p => p.slotIndex !== null);
      if (allPlaced) {
        setCompleted(true);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        if (soundEnabled) {
          speakText('Gratulálok! Sikeresen összeraktad a teljes hatszöget!');
        }
      }

      return updated;
    });

    // Következő szabad elem automatikus kijelölése a kényelemért
    const nextUnplaced = pieces.find(p => p.slotIndex === null && p.id !== selectedPieceId);
    if (nextUnplaced) {
      setSelectedPieceId(nextUnplaced.id);
    }
  };

  // Újrakezdés
  const handleReset = () => {
    setPieces(initialPieces);
    setSelectedPieceId(1);
    setCompleted(false);
    setIsCubeMode(false);
  };

  // Gyors automata kitöltés (SNI tanulóknak segítségként)
  const handleAutoSolve = () => {
    setPieces(prev =>
      prev.map((p, idx) => ({
        ...p,
        slotIndex: idx,
        rotation: idx * 60
      }))
    );
    setCompleted(true);
    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.6 }
    });
    if (soundEnabled) {
      speakText('Nézd, a helyére kerültek a háromszögek!');
    }
  };

  // 3D Kocka színek kiszámítása az adott slotIndexhez
  const getCubeColorForSlot = (slotIdx: number) => {
    // 0 és 5 slot: Felső lap (Tető) -> világoskék
    if (slotIdx === 0 || slotIdx === 5) return '#93c5fd';
    // 1 és 2 slot: Jobb lap -> sötétkék
    if (slotIdx === 1 || slotIdx === 2) return '#1d4ed8';
    // 3 és 4 slot: Bal lap -> középkék
    return '#3b82f6';
  };

  return (
    <div className="content-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>Próbáld ki Te is! – Hatszög Játszótér</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Válassz ki egy háromszöget lent, és kattints a felső hatszög egyik üres helyére!
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn-secondary" onClick={handleReset}>
            <RefreshCw size={18} />
            <span>Újrakezdés</span>
          </button>
          <button type="button" className="btn-secondary" onClick={handleAutoSolve}>
            <Sparkles size={18} />
            <span>Segíts nekem! (Megoldás)</span>
          </button>
        </div>
      </div>

      {/* Sikerüzenet ha kész van */}
      {completed && (
        <div className="success-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 size={32} />
            <div>
              <strong style={{ fontSize: '1.2rem' }}>Fantasztikus vagy! Sikeresen kiraktad a hatszöget!</strong>
              <div style={{ fontSize: '0.95rem', opacity: 0.95 }}>
                Próbáld ki a "3D Kocka nézet" gombot, és nézd meg, mi történik az árnyékokkal!
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-accent"
              onClick={() => setIsCubeMode(prev => !prev)}
              style={{ whiteSpace: 'nowrap' }}
            >
              <Box size={20} />
              <span>{isCubeMode ? 'Vissza Hatszögre' : '3D Kocka nézet!'}</span>
            </button>

            <button
              type="button"
              className="btn-success"
              onClick={() => {
                if (svgRef.current) {
                  downloadSvgAsBmp(svgRef.current, isCubeMode ? 'kirakott_kocka.bmp' : 'kirakott_hatszog.bmp');
                }
              }}
              style={{ whiteSpace: 'nowrap' }}
              title="Letöltés Paint formátumban (.bmp)"
            >
              <Download size={20} />
              <span>Mentés .BMP-be</span>
            </button>
          </div>
        </div>
      )}

      {/* Interaktív Canvas Keret */}
      <div className="paint-window-frame" style={{ minHeight: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>
        <svg ref={svgRef} width="460" height="340" viewBox="0 0 500 360" style={{ maxWidth: '100%', height: 'auto' }}>
          <defs>
            <filter id="slot-glow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* 6 Receptív üres rekesz / beillesztett szelet */}
          {[0, 1, 2, 3, 4, 5].map((slotIdx) => {
            const placedPiece = pieces.find(p => p.slotIndex === slotIdx);
            const isFilled = !!placedPiece;

            let fillColor = '#f8fafc';
            let strokeColor = '#94a3b8';
            let strokeDash = '4,4';

            if (isFilled) {
              fillColor = isCubeMode ? getCubeColorForSlot(slotIdx) : placedPiece.color;
              strokeColor = '#ffffff';
              strokeDash = 'none';
            }

            return (
              <g 
                key={slotIdx}
                onClick={() => handleSlotClick(slotIdx)}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <polygon
                  points={getSlotPoints(slotIdx)}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth="3"
                  strokeDasharray={strokeDash}
                  filter={isFilled ? 'url(#slot-glow)' : 'none'}
                />
                {!isFilled && (
                  <text
                    x={cx + (r * 0.55) * Math.cos((slotIdx * 60) * (Math.PI / 180))}
                    y={cy + (r * 0.55) * Math.sin((slotIdx * 60) * (Math.PI / 180))}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="13"
                    fontWeight="700"
                    fill="#94a3b8"
                  >
                    Hely {slotIdx + 1}
                  </text>
                )}
              </g>
            );
          })}

          {/* Középpont */}
          <circle cx={cx} cy={cy} r="5" fill="#0f172a" />
        </svg>

        {/* Vezérlő sáv az aktív háromszöghöz */}
        {selectedPiece && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700 }}>
              Kiválasztva: <span style={{ color: selectedPiece.color }}>{selectedPiece.name}</span>
            </span>

            <button
              type="button"
              className="btn-accent"
              onClick={handleRotate}
              title="Forgatás 60 fokkal"
            >
              <RotateCw size={18} />
              <span>Forgatás +60°</span>
            </button>
          </div>
        )}
      </div>

      {/* Háromszög készlet (SNI-barát nagyméretű kártyák a választáshoz) */}
      <div className="sandbox-controls">
        <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>
          Háromszög készlet (Kattints rá a kiválasztáshoz):
        </div>

        <div className="triangle-selector">
          {pieces.map(piece => {
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
                {isPlaced && <span style={{ fontSize: '0.78rem' }}>(Helyén ✔️)</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
