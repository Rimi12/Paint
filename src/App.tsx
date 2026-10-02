import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PaintHexagonTutorial } from './components/PaintHexagonTutorial';
import { CubeTutorial } from './components/CubeTutorial';
import { InteractivePlayground } from './components/InteractivePlayground';
import { ShapeStudio } from './components/ShapeStudio';
import { MoreShapesHelp } from './components/MoreShapesHelp';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'hexagon' | 'cube' | 'sandbox' | 'studio'>('hexagon');
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [largeText, setLargeText] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  // Body osztályok frissítése az SNI beállításokhoz
  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [highContrast]);

  useEffect(() => {
    if (largeText) {
      document.body.classList.add('large-text');
    } else {
      document.body.classList.remove('large-text');
    }
  }, [largeText]);

  return (
    <div className="app-container">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        highContrast={highContrast}
        setHighContrast={setHighContrast}
        largeText={largeText}
        setLargeText={setLargeText}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
      />

      <main id="main-content" tabIndex={-1}>
        {activeTab === 'hexagon' && (
          <PaintHexagonTutorial soundEnabled={soundEnabled} />
        )}

        {activeTab === 'cube' && (
          <CubeTutorial soundEnabled={soundEnabled} />
        )}

        {activeTab === 'sandbox' && (
          <InteractivePlayground soundEnabled={soundEnabled} />
        )}

        {activeTab === 'studio' && (
          <ShapeStudio soundEnabled={soundEnabled} />
        )}

        {/* Mindegyik fül alatt elérhető a további testek segítség szekció */}
        <MoreShapesHelp />
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '24px 0',
        color: 'var(--text-light)',
        fontSize: '0.88rem'
      }}>
        Paint Mester Oktatóalkalmazás &bull; Készült a digitális kultúra és térbeli látás fejlesztésére SNI tanulóknak &bull; 2026
      </footer>
    </div>
  );
};

export default App;
