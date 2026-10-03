import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Eye, ZoomIn, Shapes, Box, Sparkles, Paintbrush, Maximize, Minimize } from 'lucide-react';

interface HeaderProps {
  activeTab: 'hexagon' | 'cube' | 'sandbox' | 'studio';
  setActiveTab: (tab: 'hexagon' | 'cube' | 'sandbox' | 'studio') => void;
  highContrast: boolean;
  setHighContrast: (val: boolean | ((prev: boolean) => boolean)) => void;
  largeText: boolean;
  setLargeText: (val: boolean | ((prev: boolean) => boolean)) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  highContrast,
  setHighContrast,
  largeText,
  setLargeText,
  soundEnabled,
  setSoundEnabled,
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-icon" aria-hidden="true">
          🎨
        </div>
        <div className="brand-title">
          <span>Paint Mester</span>
          <span className="brand-subtitle">Alakzatok, forgatás és térbeli látás egyszerűen</span>
        </div>
      </div>

      {/* SNI Akadálymentesítési sáv */}
      <div className="accessibility-bar" role="toolbar" aria-label="Kisegítő lehetőségek">
        {/* Teljes képernyős nézet gomb */}
        <button
          type="button"
          className={`toggle-chip ${isFullscreen ? 'active' : ''}`}
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Kilépés a teljes képernyőből (Esc)' : 'Teljes képernyős nézet megnyitása'}
          aria-pressed={isFullscreen}
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          <span>{isFullscreen ? 'Ablakos mód' : 'Teljes képernyő'}</span>
        </button>

        <button
          type="button"
          className={`toggle-chip ${soundEnabled ? 'active' : ''}`}
          onClick={() => setSoundEnabled(prev => !prev)}
          title="Hangos felolvasás be/ki"
          aria-pressed={soundEnabled}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          <span>{soundEnabled ? 'Hang: Be' : 'Hang: Ki'}</span>
        </button>

        <button
          type="button"
          className={`toggle-chip ${largeText ? 'active' : ''}`}
          onClick={() => setLargeText(prev => !prev)}
          title="Betűméret növelése"
          aria-pressed={largeText}
        >
          <ZoomIn size={18} />
          <span>{largeText ? 'Normál betű' : 'Nagyobb betű'}</span>
        </button>

        <button
          type="button"
          className={`toggle-chip ${highContrast ? 'active' : ''}`}
          onClick={() => setHighContrast(prev => !prev)}
          title="Magas kontrasztú nézet váltása"
          aria-pressed={highContrast}
        >
          <Eye size={18} />
          <span>{highContrast ? 'Világos mód' : 'Nagy kontraszt'}</span>
        </button>
      </div>

      {/* Fő navigáció a 4 mód között */}
      <nav className="mode-navigation" style={{ width: '100%', marginTop: '6px' }} aria-label="Tananyag témakörök">
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'hexagon' ? 'active' : ''}`}
          onClick={() => setActiveTab('hexagon')}
        >
          <span className="nav-tab-title">
            <Shapes size={22} color="#2563eb" />
            1. Háromszögből Hatszög
          </span>
          <span className="nav-tab-desc">Lépésről lépésre a Windows 11 Paintben</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'cube' ? 'active' : ''}`}
          onClick={() => setActiveTab('cube')}
        >
          <span className="nav-tab-title">
            <Box size={22} color="#8b5cf6" />
            2. Térbeli Kocka Varázslat
          </span>
          <span className="nav-tab-desc">Hogyan lesz a síkból 3D test árnyékolással?</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'sandbox' ? 'active' : ''}`}
          onClick={() => setActiveTab('sandbox')}
        >
          <span className="nav-tab-title">
            <Sparkles size={22} color="#f59e0b" />
            3. Próbáld ki Te is!
          </span>
          <span className="nav-tab-desc">Interaktív illesztő játék és forgatás</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'studio' ? 'active' : ''}`}
          onClick={() => setActiveTab('studio')}
        >
          <span className="nav-tab-title">
            <Paintbrush size={22} color="#10b981" />
            4. Alakzat Műhely & BMP
          </span>
          <span className="nav-tab-desc">Rajzolj alakzatokat és mentsd le .BMP-be!</span>
        </button>
      </nav>
    </header>
  );
};
