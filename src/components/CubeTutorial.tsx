import React, { useState, useEffect } from 'react';
import { Box, Layers, Volume2, Eye } from 'lucide-react';
import { speakText, stopSpeech } from '../utils/speech';

export const CubeTutorial: React.FC<{ soundEnabled: boolean }> = ({ soundEnabled }) => {
  const [viewMode, setViewMode] = useState<'flat' | 'cube' | 'exploded'>('cube');
  const [colorTheme, setColorTheme] = useState<'blue' | 'emerald' | 'amber' | 'purple'>('blue');

  // Színtémák a 3D hatáshoz (Világos tető, Közepes bal, Sötét jobb)
  const themes = {
    blue: {
      top: '#93c5fd', // Világoskék (Fényben)
      left: '#3b82f6', // Élénk kék (Félárnyék)
      right: '#1d4ed8', // Mélykék (Árnyék)
      flat: '#60a5fa',
    },
    emerald: {
      top: '#a7f3d0',
      left: '#10b981',
      right: '#047857',
      flat: '#34d399',
    },
    amber: {
      top: '#fde68a',
      left: '#f59e0b',
      right: '#b45309',
      flat: '#fbbf24',
    },
    purple: {
      top: '#ddd6fe',
      left: '#8b5cf6',
      right: '#5b21b6',
      flat: '#a78bfa',
    }
  };

  const currentColors = themes[colorTheme];

  // Magyarázó szöveg
  const explanation = viewMode === 'cube'
    ? 'Nézd meg jól! A 6 háromszög most 3 darab rombusz lapot alkot. Mivel a felső lap világos (fény éri), a jobb oldali pedig sötét (árnyékban van), az agyunk azonnal egy valódi 3D Kockát lát!'
    : viewMode === 'flat'
    ? 'Ha minden lap egyforma színű vagy lapos, akkor a formát csak egy egyszerű 2D sík hatszögnek látjuk. Nincs árnyék, nincs mélységérzet.'
    : 'Itt láthatod a kocka három oldalát kissé széthúzva. Így jól megfigyelhető, hogy a felső, bal és jobb oldali lap pontosan hogyan találkozik a kocka elülső sarkánál.';

  useEffect(() => {
    if (soundEnabled) {
      speakText(explanation);
    }
    return () => {
      stopSpeech();
    };
  }, [viewMode, soundEnabled]);

  const handleSpeak = () => {
    speakText(explanation);
  };

  // Koordináták a hatszögből felépülő kockához
  const cx = 250;
  const cy = 200;
  const r = 120;

  // 6 külső csúcs
  // 0: jobb felül (30°), 1: alsó jobb (90°), 2: alsó bal (150°), 3: bal alsó/oldal (210°), 4: bal felső (270°/teteje?), nézzük a szögeket:
  // Legyen a csúcs fent: 270° vagy 90°
  // Szabványos izometrikus kocka:
  // Középpont: (cx, cy)
  // Felső csúcs: (cx, cy - r)
  // Jobb felső: (cx + r*cos(30°), cy - r*sin(30°)) -> cy - r*0.5
  // Jobb alsó: (cx + r*cos(30°), cy + r*0.5)
  // Alsó csúcs: (cx, cy + r)
  // Bal alsó: (cx - r*cos(30°), cy + r*0.5)
  // Bal felső: (cx - r*cos(30°), cy - r*0.5)

  const cos30 = Math.cos(Math.PI / 6); // ~0.866
  const sin30 = 0.5;

  const topPeak = `${cx},${cy - r}`;
  const topRight = `${cx + r * cos30},${cy - r * sin30}`;
  const bottomRight = `${cx + r * cos30},${cy + r * sin30}`;
  const bottomPeak = `${cx},${cy + r}`;
  const bottomLeft = `${cx - r * cos30},${cy + r * sin30}`;
  const topLeft = `${cx - r * cos30},${cy - r * sin30}`;
  const centerPoint = `${cx},${cy}`;

  // Szétcsúsztatás mértéke 'exploded' módban
  const expOffset = viewMode === 'exploded' ? 22 : 0;

  return (
    <div className="content-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>Térbeli Kocka Varázslat</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Hogyan válik a 2D hatszög térbeli testté a fény és árnyék segítségével?
          </p>
        </div>

        <button 
          type="button" 
          className="btn-secondary" 
          onClick={handleSpeak}
          title="Magyarázat felolvasása"
        >
          <Volume2 size={18} />
          <span>Felolvasás</span>
        </button>
      </div>

      {/* Interaktív Kocka bemutató doboz */}
      <div className="cube-perspective-card">
        {/* Bal oldal: SVG Megjelenítő */}
        <div className="paint-window-frame" style={{ minHeight: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="480" height="380" viewBox="0 0 500 400" style={{ maxWidth: '100%', height: 'auto' }}>
            <defs>
              <filter id="cube-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="12" stdDeviation="10" floodOpacity="0.2" />
              </filter>
            </defs>

            {/* Árnyék a talajon */}
            <ellipse
              cx={cx}
              cy={cy + r + 20}
              rx={r * 1.1}
              ry="24"
              fill="rgba(15, 23, 42, 0.12)"
            />

            {/* Felső Lap (Tető) */}
            <g transform={`translate(0, ${-expOffset})`}>
              <polygon
                points={`${centerPoint} ${topLeft} ${topPeak} ${topRight}`}
                fill={viewMode === 'flat' ? currentColors.flat : currentColors.top}
                stroke="#ffffff"
                strokeWidth="3"
                filter="url(#cube-shadow)"
              />
              {viewMode === 'cube' && (
                <text x={cx} y={cy - r * 0.45} textAnchor="middle" fontSize="13" fontWeight="700" fill="#1e3a8a">
                  Felső lap (FÉNY ☀️)
                </text>
              )}
            </g>

            {/* Bal Oldali Lap */}
            <g transform={`translate(${-expOffset * cos30}, ${expOffset * sin30})`}>
              <polygon
                points={`${centerPoint} ${topLeft} ${bottomLeft} ${bottomPeak}`}
                fill={viewMode === 'flat' ? currentColors.flat : currentColors.left}
                stroke="#ffffff"
                strokeWidth="3"
                filter="url(#cube-shadow)"
              />
              {viewMode === 'cube' && (
                <text x={cx - r * 0.45} y={cy + r * 0.35} textAnchor="middle" fontSize="13" fontWeight="700" fill="#ffffff">
                  Bal lap
                </text>
              )}
            </g>

            {/* Jobb Oldali Lap */}
            <g transform={`translate(${expOffset * cos30}, ${expOffset * sin30})`}>
              <polygon
                points={`${centerPoint} ${topRight} ${bottomRight} ${bottomPeak}`}
                fill={viewMode === 'flat' ? currentColors.flat : currentColors.right}
                stroke="#ffffff"
                strokeWidth="3"
                filter="url(#cube-shadow)"
              />
              {viewMode === 'cube' && (
                <text x={cx + r * 0.45} y={cy + r * 0.35} textAnchor="middle" fontSize="13" fontWeight="700" fill="#ffffff">
                  Jobb lap (ÁRNYÉK 🌑)
                </text>
              )}
            </g>

            {/* Középpont jelölés */}
            {viewMode === 'exploded' && (
              <circle cx={cx} cy={cy} r="6" fill="#f59e0b" />
            )}
          </svg>
        </div>

        {/* Jobb oldal: Magyarázat és Vezérlők */}
        <div className="cube-explanation-box">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={viewMode === 'cube' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setViewMode('cube')}
            >
              <Box size={18} />
              <span>3D Kocka nézet</span>
            </button>

            <button
              type="button"
              className={viewMode === 'flat' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setViewMode('flat')}
            >
              <Eye size={18} />
              <span>Lapos 2D Hatszög</span>
            </button>

            <button
              type="button"
              className={viewMode === 'exploded' ? 'btn-accent' : 'btn-secondary'}
              onClick={() => setViewMode('exploded')}
            >
              <Layers size={18} />
              <span>Széthúzott lapok</span>
            </button>
          </div>

          {/* Magyarázó szöveg doboz */}
          <div className="step-subtext" style={{ fontSize: '1.05rem', lineHeight: '1.6' }}>
            {explanation}
          </div>

          {/* 3D Színskála bemutató laponként */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              A 3 lap fényviszonyai a Paintben:
            </span>

            <div className="face-indicator">
              <div className="face-color-sample" style={{ background: currentColors.top }}></div>
              <div>
                <strong>Tető (Felső lap):</strong> Legvilágosabb árnyalat (Közvetlen fény)
              </div>
            </div>

            <div className="face-indicator">
              <div className="face-color-sample" style={{ background: currentColors.left }}></div>
              <div>
                <strong>Bal oldal:</strong> Közepes tónus (Oldalsó fény)
              </div>
            </div>

            <div className="face-indicator">
              <div className="face-color-sample" style={{ background: currentColors.right }}></div>
              <div>
                <strong>Jobb oldal:</strong> Legsötétebb tónus (Saját árnyék)
              </div>
            </div>
          </div>

          {/* Színtéma választó */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Kocka színe:</span>
            <button
              type="button"
              onClick={() => setColorTheme('blue')}
              style={{ width: '32px', height: '32px', background: '#3b82f6', borderRadius: '50%', border: colorTheme === 'blue' ? '3px solid #0f172a' : 'none' }}
              title="Kék téma"
            />
            <button
              type="button"
              onClick={() => setColorTheme('emerald')}
              style={{ width: '32px', height: '32px', background: '#10b981', borderRadius: '50%', border: colorTheme === 'emerald' ? '3px solid #0f172a' : 'none' }}
              title="Zöld téma"
            />
            <button
              type="button"
              onClick={() => setColorTheme('amber')}
              style={{ width: '32px', height: '32px', background: '#f59e0b', borderRadius: '50%', border: colorTheme === 'amber' ? '3px solid #0f172a' : 'none' }}
              title="Sárga téma"
            />
            <button
              type="button"
              onClick={() => setColorTheme('purple')}
              style={{ width: '32px', height: '32px', background: '#8b5cf6', borderRadius: '50%', border: colorTheme === 'purple' ? '3px solid #0f172a' : 'none' }}
              title="Lila téma"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
