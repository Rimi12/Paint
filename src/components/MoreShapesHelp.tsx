import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface BodyGuide {
  title: string;
  icon: string;
  steps: string[];
  secretTip: string;
}

const guides: BodyGuide[] = [
  {
    title: 'Térbeli Gúla (Piramis) a Paintben',
    icon: '🔺',
    steps: [
      '1. Rajzolj egy szélesebb háromszöget alapnak!',
      '2. Húzz egy egyenes vonalat a felső csúcstól az alap alsó harmadához (ez lesz az elülső él).',
      '3. Az egyik oldalát fesd világosra, a másik oldalát sötétebbre a festékes vödörrel!'
    ],
    secretTip: '💡 A térhatás titka itt is a két oldal különböző árnyalata: a napos oldal világos, az árnyékos oldal sötét.'
  },
  {
    title: 'Térbeli Henger a Paintben',
    icon: '🛢️',
    steps: [
      '1. Válassz egy lapos Ovális (Ellipszis) alakzatot a tetőnek.',
      '2. Másold le (Ctrl+C, Ctrl+V), és húzd lejjebb az aljának.',
      '3. Kösd össze a két ovális széleit két egyenes, függőleges vonallal!',
      '4. Radírozd ki az alsó ovális felső, takart ívét, hogy ne látszódjon át.'
    ],
    secretTip: '💡 Trükk: Használj puha ecsetet vagy spray eszközt a henger oldalán a hengeres fénycsíkhoz!'
  },
  {
    title: 'Gömb készítése a Paintben',
    icon: '🔮',
    steps: [
      '1. Rajzolj egy tökéletes kört a Shift billentyű nyomva tartásával!',
      '2. Töltsd ki egy tetszőleges alapszínnel (pl. kék).',
      '3. Válassz egy világosabb színt és a szórófej (Spray) eszközt a felső fénycsillanáshoz.',
      '4. Válassz egy sötétebb színt az alsó árnyékhoz.'
    ],
    secretTip: '💡 Egyetlen lapos körből a fényfolt (fehér pötty) teszi azonnal gömbbé a formát!'
  }
];

export const MoreShapesHelp: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(prev => prev === idx ? null : idx);
  };

  return (
    <div className="content-card" style={{ marginTop: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <HelpCircle size={26} color="#2563eb" />
        <div>
          <h3>Segítség más térbeli testekhez a Paintben</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Kattints a testekre, ha szeretnéd megtudni, hogyan rajzolhatsz gúlát, hengert vagy gömböt!
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
        {guides.map((g, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              style={{
                border: '1px solid var(--bg-card-border)',
                borderRadius: '12px',
                overflow: 'hidden',
                background: 'var(--bg-surface)'
              }}
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                style={{
                  width: '100%',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: isOpen ? 'var(--primary-light)' : 'transparent',
                  color: 'var(--text-main)',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.05rem', fontWeight: 700 }}>
                  <span style={{ fontSize: '1.4rem' }}>{g.icon}</span>
                  <span>{g.title}</span>
                </div>
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {isOpen && (
                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--bg-card-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {g.steps.map((st, sIdx) => (
                      <li key={sIdx} style={{ fontSize: '0.98rem' }}>{st}</li>
                    ))}
                  </ul>
                  <div style={{ background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid var(--accent)', fontSize: '0.92rem' }}>
                    {g.secretTip}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
