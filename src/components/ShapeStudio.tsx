import React, { useRef, useState, useEffect } from 'react';
import { 
  Download, 
  Trash2, 
  RotateCw, 
  Paintbrush, 
  Eraser, 
  MousePointer
} from 'lucide-react';
import { downloadCanvasAsBmp } from '../utils/bmpEncoder';
import { speakText } from '../utils/speech';

export type ShapeType = 'triangle' | 'hexagon' | 'cube' | 'pyramid' | 'cylinder' | 'sphere';

export interface PlacedShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  size: number;
  rotation: number; // szög fokban
  color: string;
}

export const ShapeStudio: React.FC<{ soundEnabled: boolean }> = ({ soundEnabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tool, setTool] = useState<'select' | 'brush' | 'eraser'>('select');
  const [activeColor, setActiveColor] = useState<string>('#3b82f6');
  const [brushSize] = useState<number>(6);

  const [shapes, setShapes] = useState<PlacedShape[]>([
    { id: '1', type: 'triangle', x: 120, y: 140, size: 70, rotation: 0, color: '#3b82f6' },
    { id: '2', type: 'hexagon', x: 280, y: 140, size: 70, rotation: 0, color: '#10b981' },
    { id: '3', type: 'cube', x: 440, y: 140, size: 70, rotation: 0, color: '#8b5cf6' },
  ]);

  const [selectedShapeId, setSelectedShapeId] = useState<string | null>('3');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [lastDrawPos, setLastDrawPos] = useState<{ x: number; y: number } | null>(null);

  // Szabadkézi rajzréteg tárolása
  const drawingLayerRef = useRef<HTMLCanvasElement | null>(null);

  // Rajzréteg inicializálása
  useEffect(() => {
    if (!drawingLayerRef.current) {
      const offscreen = document.createElement('canvas');
      offscreen.width = 640;
      offscreen.height = 420;
      drawingLayerRef.current = offscreen;
    }
  }, []);

  // Új alakzat hozzáadása
  const addShape = (type: ShapeType) => {
    const newShape: PlacedShape = {
      id: Date.now().toString(),
      type,
      x: 150 + Math.floor(Math.random() * 200),
      y: 150 + Math.floor(Math.random() * 120),
      size: 70,
      rotation: 0,
      color: activeColor,
    };
    setShapes(prev => [...prev, newShape]);
    setSelectedShapeId(newShape.id);

    if (soundEnabled) {
      const names: Record<ShapeType, string> = {
        triangle: 'Háromszög hozzáadva',
        hexagon: 'Hatszög hozzáadva',
        cube: '3D Kocka hozzáadva',
        pyramid: '3D Gúla hozzáadva',
        cylinder: '3D Henger hozzáadva',
        sphere: '3D Gömb hozzáadva',
      };
      speakText(names[type]);
    }
  };

  // Kiválasztott alakzat forgatása
  const rotateSelected = (degrees = 60) => {
    if (!selectedShapeId) return;
    setShapes(prev =>
      prev.map(s => {
        if (s.id === selectedShapeId) {
          return { ...s, rotation: (s.rotation + degrees) % 360 };
        }
        return s;
      })
    );
  };

  // Kiválasztott alakzat törlése
  const deleteSelected = () => {
    if (!selectedShapeId) return;
    setShapes(prev => prev.filter(s => s.id !== selectedShapeId));
    setSelectedShapeId(null);
  };

  // Alakzatok kirajzolása Canvasre
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Fehér tiszta háttér (BMP kompatibilis!)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Halvány segédrács
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // 3. Szabadkézi rajzréteg rámásolása
    if (drawingLayerRef.current) {
      ctx.drawImage(drawingLayerRef.current, 0, 0);
    }

    // 4. Alakzatok kirajzolása
    shapes.forEach(shape => {
      ctx.save();
      ctx.translate(shape.x, shape.y);
      ctx.rotate((shape.rotation * Math.PI) / 180);

      const isSelected = shape.id === selectedShapeId && tool === 'select';

      drawShapeOnCtx(ctx, shape);

      // Kijelölő keret ha ki van választva
      if (isSelected) {
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        const s = shape.size + 14;
        ctx.strokeRect(-s, -s, s * 2, s * 2);
        ctx.setLineDash([]);

        // Forgató fogantyú fent
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(0, -s - 12, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(0, -s - 12);
        ctx.stroke();
      }

      ctx.restore();
    });
  };

  // Alakzatok pontos rajzolása
  const drawShapeOnCtx = (ctx: CanvasRenderingContext2D, shape: PlacedShape) => {
    const s = shape.size;
    const color = shape.color;

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1e293b';

    switch (shape.type) {
      case 'triangle': {
        // Egyenlő oldalú háromszög
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.866, s * 0.5);
        ctx.lineTo(-s * 0.866, s * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'hexagon': {
        // Szabályos hatszög 6 szelettel vagy színes kitöltéssel
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * 60 - 30) * (Math.PI / 180);
          const x = s * Math.cos(angle);
          const y = s * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.stroke();

        // Belső szeletvonalak (háromszögek találkozása)
        for (let i = 0; i < 6; i++) {
          const angle = (i * 60 - 30) * (Math.PI / 180);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(s * Math.cos(angle), s * Math.sin(angle));
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.stroke();
        }
        break;
      }

      case 'cube': {
        // 3D Kocka 3 árnyékolt lapja
        const cos30 = Math.cos(Math.PI / 6);
        const sin30 = 0.5;

        const topY = -s;
        const topRightX = s * cos30;
        const topRightY = -s * sin30;
        const bottomRightX = s * cos30;
        const bottomRightY = s * sin30;
        const bottomY = s;
        const bottomLeftX = -s * cos30;
        const bottomLeftY = s * sin30;
        const topLeftX = -s * cos30;
        const topLeftY = -s * sin30;

        // Felső lap (Legvilágosabb)
        ctx.fillStyle = adjustBrightness(color, 45);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(topLeftX, topLeftY);
        ctx.lineTo(0, topY);
        ctx.lineTo(topRightX, topRightY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Bal lap (Közepes)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(topLeftX, topLeftY);
        ctx.lineTo(bottomLeftX, bottomLeftY);
        ctx.lineTo(0, bottomY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Jobb lap (Sötét / Árnyék)
        ctx.fillStyle = adjustBrightness(color, -40);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(topRightX, topRightY);
        ctx.lineTo(bottomRightX, bottomRightY);
        ctx.lineTo(0, bottomY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'pyramid': {
        // 3D Gúla: egy alap és két árnyékolt háromszöglap
        const h = s * 1.1;
        const w = s * 0.9;

        // Bal lap (Napos)
        ctx.fillStyle = adjustBrightness(color, 25);
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(-w, h * 0.7);
        ctx.lineTo(w * 0.2, h * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Jobb lap (Árnyékos)
        ctx.fillStyle = adjustBrightness(color, -35);
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(w * 0.2, h * 0.7);
        ctx.lineTo(w, h * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'cylinder': {
        // 3D Henger: alsó ív, palást, felső ovális
        const rx = s * 0.8;
        const ry = s * 0.28;
        const h = s * 1.0;

        // Palást
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-rx, -h / 2);
        ctx.lineTo(-rx, h / 2);
        ctx.ellipse(0, h / 2, rx, ry, 0, Math.PI, 0, true);
        ctx.lineTo(rx, -h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Árnyék a jobb szélén
        const grad = ctx.createLinearGradient(-rx, 0, rx, 0);
        grad.addColorStop(0, 'rgba(255,255,255,0.4)');
        grad.addColorStop(0.3, 'rgba(255,255,255,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-rx, -h / 2);
        ctx.lineTo(-rx, h / 2);
        ctx.ellipse(0, h / 2, rx, ry, 0, Math.PI, 0, true);
        ctx.lineTo(rx, -h / 2);
        ctx.closePath();
        ctx.fill();

        // Felső ovális lap (Tető)
        ctx.fillStyle = adjustBrightness(color, 35);
        ctx.beginPath();
        ctx.ellipse(0, -h / 2, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'sphere': {
        // 3D Gömb fényponttal
        const grad = ctx.createRadialGradient(-s * 0.25, -s * 0.25, s * 0.08, 0, 0, s);
        grad.addColorStop(0, '#ffffff'); // Csillanás
        grad.addColorStop(0.2, adjustBrightness(color, 30));
        grad.addColorStop(0.7, color);
        grad.addColorStop(1, adjustBrightness(color, -60)); // Árnyék

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }
    }
  };

  // Segédfüggvény szín világosításra/sötétítésre
  function adjustBrightness(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    let r = (num >> 16) + percent;
    let g = ((num >> 8) & 0x00ff) + percent;
    let b = (num & 0x00ff) + percent;

    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  // Újrarajzolás állapotváltozáskor
  useEffect(() => {
    renderCanvas();
  }, [shapes, selectedShapeId, tool]);

  // Egér kattintás és mozgatás kezelése
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (tool === 'select') {
      // Megkeressük, melyik alakzatra kattintott (hátulról előre)
      let found: PlacedShape | null = null;
      for (let i = shapes.length - 1; i >= 0; i--) {
        const s = shapes[i];
        const dist = Math.hypot(mouseX - s.x, mouseY - s.y);
        if (dist <= s.size + 10) {
          found = s;
          break;
        }
      }

      if (found) {
        setSelectedShapeId(found.id);
        setIsDragging(true);
        setDragOffset({ x: mouseX - found.x, y: mouseY - found.y });
      } else {
        setSelectedShapeId(null);
      }
    } else if (tool === 'brush' || tool === 'eraser') {
      setIsDrawing(true);
      setLastDrawPos({ x: mouseX, y: mouseY });
      drawFreehand(mouseX, mouseY, mouseX, mouseY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (tool === 'select' && isDragging && selectedShapeId) {
      setShapes(prev =>
        prev.map(s => {
          if (s.id === selectedShapeId) {
            return {
              ...s,
              x: Math.max(40, Math.min(canvas.width - 40, mouseX - dragOffset.x)),
              y: Math.max(40, Math.min(canvas.height - 40, mouseY - dragOffset.y)),
            };
          }
          return s;
        })
      );
    } else if (isDrawing && lastDrawPos) {
      drawFreehand(lastDrawPos.x, lastDrawPos.y, mouseX, mouseY);
      setLastDrawPos({ x: mouseX, y: mouseY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDrawing(false);
    setLastDrawPos(null);
  };

  const drawFreehand = (x1: number, y1: number, x2: number, y2: number) => {
    if (!drawingLayerRef.current) return;
    const offCtx = drawingLayerRef.current.getContext('2d');
    if (!offCtx) return;

    offCtx.lineWidth = brushSize;
    offCtx.lineCap = 'round';
    offCtx.lineJoin = 'round';

    if (tool === 'eraser') {
      offCtx.globalCompositeOperation = 'destination-out';
      offCtx.beginPath();
      offCtx.moveTo(x1, y1);
      offCtx.lineTo(x2, y2);
      offCtx.stroke();
      offCtx.globalCompositeOperation = 'source-over';
    } else {
      offCtx.strokeStyle = activeColor;
      offCtx.beginPath();
      offCtx.moveTo(x1, y1);
      offCtx.lineTo(x2, y2);
      offCtx.stroke();
    }

    renderCanvas();
  };

  // Teljes vászon törlése
  const handleClearAll = () => {
    if (drawingLayerRef.current) {
      const offCtx = drawingLayerRef.current.getContext('2d');
      offCtx?.clearRect(0, 0, 640, 420);
    }
    setShapes([]);
    setSelectedShapeId(null);
    renderCanvas();
  };

  // BMP Mentés gomb kattintás
  const handleSaveBmp = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    downloadCanvasAsBmp(canvas, 'paint_alakzatok.bmp');

    if (soundEnabled) {
      speakText('A kép sikeresen letöltve BMP formátumban! Megnyithatod a Windows Paint alkalmazásban.');
    }
  };

  return (
    <div className="content-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>Alakzat Műhely & BMP Mentés</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Állíts össze alakzatokat a vásznon, forgass, színezz, majd mentsd el valódi <strong>.BMP</strong> fájlként!
          </p>
        </div>

        {/* Nagy zöld BMP Mentés gomb */}
        <button
          type="button"
          className="btn-success attention-pulse"
          onClick={handleSaveBmp}
          style={{ padding: '12px 24px', fontSize: '1.05rem', fontWeight: 800 }}
          title="Letöltés valódi Windows Paint formátumban (.bmp)"
        >
          <Download size={22} />
          <span>Mentés BMP formátumban (.bmp)</span>
        </button>
      </div>

      {/* Alakzat hozzáadó gombok sávja */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', background: 'var(--bg-surface)', padding: '12px', borderRadius: '12px', border: '1px solid var(--bg-card-border)' }}>
        <span style={{ fontSize: '0.92rem', fontWeight: 700, alignSelf: 'center', marginRight: '6px' }}>
          Új alakzat:
        </span>

        <button type="button" className="btn-secondary" onClick={() => addShape('triangle')}>
          <span>🔺 Háromszög</span>
        </button>
        <button type="button" className="btn-secondary" onClick={() => addShape('hexagon')}>
          <span>🛑 Hatszög</span>
        </button>
        <button type="button" className="btn-secondary" onClick={() => addShape('cube')}>
          <span>📦 3D Kocka</span>
        </button>
        <button type="button" className="btn-secondary" onClick={() => addShape('pyramid')}>
          <span>🔺 3D Gúla</span>
        </button>
        <button type="button" className="btn-secondary" onClick={() => addShape('cylinder')}>
          <span>🛢️ 3D Henger</span>
        </button>
        <button type="button" className="btn-secondary" onClick={() => addShape('sphere')}>
          <span>🔮 3D Gömb</span>
        </button>
      </div>

      {/* Paint Szerszámok és Színpaletta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--bg-surface)', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--bg-card-border)' }}>
        {/* Eszközök */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className={tool === 'select' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTool('select')}
            title="Mozgatás és Kijelölés"
          >
            <MousePointer size={18} />
            <span>Mozgatás</span>
          </button>

          <button
            type="button"
            className={tool === 'brush' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTool('brush')}
            title="Ecset rajzolás"
          >
            <Paintbrush size={18} />
            <span>Ecset</span>
          </button>

          <button
            type="button"
            className={tool === 'eraser' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTool('eraser')}
            title="Radír"
          >
            <Eraser size={18} />
            <span>Radír</span>
          </button>
        </div>

        {/* Kiválasztott alakzat műveletek */}
        {selectedShapeId && tool === 'select' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-accent"
              onClick={() => rotateSelected(60)}
              title="Forgatás 60 fokkal"
            >
              <RotateCw size={18} />
              <span>Forgatás (+60°)</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={deleteSelected}
              style={{ color: '#ef4444' }}
              title="Kijelölt alakzat törlése"
            >
              <Trash2 size={18} />
              <span>Törlés</span>
            </button>
          </div>
        )}

        {/* Színválasztó paletta */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Szín:</span>
          {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#0f172a'].map(c => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setActiveColor(c);
                if (selectedShapeId) {
                  setShapes(prev => prev.map(s => s.id === selectedShapeId ? { ...s, color: c } : s));
                }
              }}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: c,
                border: activeColor === c ? '3px solid #0f172a' : '2px solid white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                cursor: 'pointer',
                padding: 0
              }}
              title={c}
            />
          ))}
        </div>

        {/* Teljes törlés */}
        <button
          type="button"
          className="btn-secondary"
          onClick={handleClearAll}
          title="Teljes vászon törlése"
          style={{ fontSize: '0.85rem', padding: '8px 12px' }}
        >
          <Trash2 size={16} />
          <span>Vászon ürítése</span>
        </button>
      </div>

      {/* A RAJZVÁSZON (Canvas) */}
      <div className="paint-window-frame" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <canvas
          ref={canvasRef}
          width={640}
          height={420}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            cursor: tool === 'select' ? (isDragging ? 'grabbing' : 'grab') : 'crosshair',
            background: '#ffffff'
          }}
        />
      </div>

      {/* Hasznos segítség SNI tanulóknak */}
      <div className="step-subtext" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <span>
          💡 <strong>Tipp:</strong> Kattints egy alakzatra a vásznon a mozgatáshoz vagy forgatáshoz! Ha elkészült a műved, a fenti zöld gombbal azonnal elmentheted a számítógépedre <strong>.BMP</strong> formátumban, és megnyithatod a valódi Paintben is!
        </span>
      </div>
    </div>
  );
};
