import React, { useRef, useState, useEffect } from 'react';
import { 
  Download, 
  Trash2, 
  RotateCw, 
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Copy,
  Paintbrush, 
  Eraser, 
  MousePointer,
  Slash,
  Magnet
} from 'lucide-react';
import { downloadCanvasAsBmp } from '../utils/bmpEncoder';
import { speakText } from '../utils/speech';

export type ShapeType = 'triangle' | 'square' | 'hexagon' | 'cube' | 'pyramid' | 'cylinder' | 'sphere';

export interface PlacedShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  size: number;
  rotation: number; // szög fokban
  color: string;
  flipH?: boolean;
  flipV?: boolean;
}

export interface DrawnLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
}

export const ShapeStudio: React.FC<{ soundEnabled: boolean }> = ({ soundEnabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tool, setTool] = useState<'select' | 'line' | 'brush' | 'eraser'>('select');
  const [activeColor, setActiveColor] = useState<string>('#3b82f6');
  const [brushSize] = useState<number>(5);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  // Kezdő alakzatok a vásznon: háromszög, négyzet és hatszög
  const [shapes, setShapes] = useState<PlacedShape[]>([
    { id: '1', type: 'triangle', x: 140, y: 160, size: 70, rotation: 0, color: '#3b82f6', flipH: false, flipV: false },
    { id: '2', type: 'square', x: 300, y: 160, size: 60, rotation: 0, color: '#10b981', flipH: false, flipV: false },
    { id: '3', type: 'hexagon', x: 470, y: 160, size: 70, rotation: 0, color: '#8b5cf6', flipH: false, flipV: false },
  ]);

  const [lines, setLines] = useState<DrawnLine[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>('1');

  // Mozgatási és vonalhúzási állapotok
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [lastDrawPos, setLastDrawPos] = useState<{ x: number; y: number } | null>(null);
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);
  const [linePreview, setLinePreview] = useState<{ x: number; y: number } | null>(null);

  // Szabadkézi ecset réteg
  const drawingLayerRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!drawingLayerRef.current) {
      const offscreen = document.createElement('canvas');
      offscreen.width = 680;
      offscreen.height = 430;
      drawingLayerRef.current = offscreen;
    }
  }, []);

  const selectedShape = shapes.find(s => s.id === selectedShapeId);

  // Új alakzat hozzáadása
  const addShape = (type: ShapeType) => {
    const newShape: PlacedShape = {
      id: Date.now().toString(),
      type,
      x: 180 + Math.floor(Math.random() * 220),
      y: 150 + Math.floor(Math.random() * 120),
      size: type === 'square' ? 60 : 70,
      rotation: 0,
      color: activeColor,
      flipH: false,
      flipV: false,
    };
    setShapes(prev => [...prev, newShape]);
    setSelectedShapeId(newShape.id);
    setTool('select');

    if (soundEnabled) {
      const names: Record<ShapeType, string> = {
        triangle: 'Háromszög hozzáadva',
        square: 'Négyzet hozzáadva, a kocka alapja',
        hexagon: 'Hatszög hozzáadva',
        cube: '3D Kocka hozzáadva',
        pyramid: '3D Gúla hozzáadva',
        cylinder: '3D Henger hozzáadva',
        sphere: '3D Gömb hozzáadva',
      };
      speakText(names[type]);
    }
  };

  // Kiválasztott alakzat másolása / duplikálása
  const duplicateSelected = () => {
    if (!selectedShape) return;
    const newShape: PlacedShape = {
      ...selectedShape,
      id: Date.now().toString(),
      x: Math.min(640, selectedShape.x + 35),
      y: Math.min(390, selectedShape.y + 35),
    };
    setShapes(prev => [...prev, newShape]);
    setSelectedShapeId(newShape.id);

    if (soundEnabled) {
      speakText('Alakzat lemásolva! Most forgasd el vagy tükrözd!');
    }
  };

  // Vízszintes tükrözés (Flip H)
  const flipSelectedH = () => {
    if (!selectedShapeId) return;
    setShapes(prev =>
      prev.map(s => {
        if (s.id === selectedShapeId) {
          const next = !s.flipH;
          if (soundEnabled) speakText('Vízszintes tükrözés');
          return { ...s, flipH: next };
        }
        return s;
      })
    );
  };

  // Függőleges tükrözés (Flip V)
  const flipSelectedV = () => {
    if (!selectedShapeId) return;
    setShapes(prev =>
      prev.map(s => {
        if (s.id === selectedShapeId) {
          const next = !s.flipV;
          if (soundEnabled) speakText('Függőleges tükrözés, fejjel lefelé fordítva');
          return { ...s, flipV: next };
        }
        return s;
      })
    );
  };

  // Forgatás fokkal
  const rotateSelected = (degrees: number) => {
    if (!selectedShapeId) return;
    setShapes(prev =>
      prev.map(s => {
        if (s.id === selectedShapeId) {
          const nextRot = (s.rotation + degrees + 360) % 360;
          if (soundEnabled) speakText(`Forgatás: ${nextRot} fok`);
          return { ...s, rotation: nextRot };
        }
        return s;
      })
    );
  };

  // Közvetlen szögbeállítás csúszkával
  const setRotationDirect = (deg: number) => {
    if (!selectedShapeId) return;
    setShapes(prev =>
      prev.map(s => (s.id === selectedShapeId ? { ...s, rotation: deg } : s))
    );
  };

  // Törlés
  const deleteSelected = () => {
    if (!selectedShapeId) return;
    setShapes(prev => prev.filter(s => s.id !== selectedShapeId));
    setSelectedShapeId(null);
    if (soundEnabled) speakText('Alakzat törölve');
  };

  // Canvas teljes újrarajzolása
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Tiszta fehér háttér (BMP natív)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Segédrács (Grid)
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    const step = 20;
    for (let x = 0; x < canvas.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // 3. Szabadkézi ecsetréteg
    if (drawingLayerRef.current) {
      ctx.drawImage(drawingLayerRef.current, 0, 0);
    }

    // 4. Húzott egyenes élek / vonalak (kocka élek)
    lines.forEach(l => {
      ctx.strokeStyle = l.color;
      ctx.lineWidth = l.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
    });

    // Éppen húzott vonal előnézete
    if (tool === 'line' && lineStart && linePreview) {
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(lineStart.x, lineStart.y);
      ctx.lineTo(linePreview.x, linePreview.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 5. Alakzatok kirajzolása forgatással és tükrözéssel
    shapes.forEach(shape => {
      ctx.save();
      ctx.translate(shape.x, shape.y);
      ctx.rotate((shape.rotation * Math.PI) / 180);
      ctx.scale(shape.flipH ? -1 : 1, shape.flipV ? -1 : 1);

      const isSelected = shape.id === selectedShapeId && tool === 'select';

      drawShapeOnCtx(ctx, shape);

      // Kijelölő keret és infó
      if (isSelected) {
        ctx.restore(); // Visszaállunk a normál koordináta-rendszerbe a feliratokhoz
        ctx.save();
        ctx.translate(shape.x, shape.y);

        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        const s = shape.size + 12;
        ctx.strokeRect(-s, -s, s * 2, s * 2);
        ctx.setLineDash([]);

        // Forgatási fogantyú jelölő fent
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(0, -s - 10, 5, 0, Math.PI * 2);
        ctx.fill();

        // Információs címke: fok és tükrözés
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(-65, s + 6, 130, 22);
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        const flipLabel = `${shape.flipH ? '↔' : ''}${shape.flipV ? '↕' : ''}` || 'Normál';
        ctx.fillText(`${shape.rotation}° | ${flipLabel}`, 0, s + 21);
      }

      ctx.restore();
    });
  };

  // Alakzatok pontos renderelése Canvasen
  const drawShapeOnCtx = (ctx: CanvasRenderingContext2D, shape: PlacedShape) => {
    const s = shape.size;
    const color = shape.color;

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a';

    switch (shape.type) {
      case 'triangle': {
        // Szabályos egyenlő oldalú háromszög
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.866, s * 0.5);
        ctx.lineTo(-s * 0.866, s * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Kis középponti csúcs jelölő a pontos illesztéshez
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'square': {
        // Négyzet (a 3D kocka alapeleme)
        const half = s * 0.72;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.rect(-half, -half, half * 2, half * 2);
        ctx.fill();
        ctx.stroke();

        // Átlós segédpontok a sarkokon a vonalillesztéshez
        ctx.fillStyle = '#ffffff';
        [[-half, -half], [half, -half], [half, half], [-half, half]].forEach(([px, py]) => {
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        });
        break;
      }

      case 'hexagon': {
        // Szabályos hatszög
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

        // Belső 6 háromszög találkozása (szeletvonalak)
        for (let i = 0; i < 6; i++) {
          const angle = (i * 60 - 30) * (Math.PI / 180);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(s * Math.cos(angle), s * Math.sin(angle));
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        break;
      }

      case 'cube': {
        // 3D Kocka izometrikus ábrázolása árnyékolással
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

        // Felső lap (Világos)
        ctx.fillStyle = adjustBrightness(color, 45);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(topLeftX, topLeftY);
        ctx.lineTo(0, topY);
        ctx.lineTo(topRightX, topRightY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Bal lap (Alapszín)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(topLeftX, topLeftY);
        ctx.lineTo(bottomLeftX, bottomLeftY);
        ctx.lineTo(0, bottomY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Jobb lap (Árnyékos)
        ctx.fillStyle = adjustBrightness(color, -45);
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
        // 3D Gúla
        const apexY = -s;
        const leftX = -s * 0.8;
        const leftY = s * 0.4;
        const centerX = -s * 0.1;
        const centerY = s * 0.7;
        const rightX = s * 0.8;
        const rightY = s * 0.3;

        // Bal lap
        ctx.fillStyle = adjustBrightness(color, 25);
        ctx.beginPath();
        ctx.moveTo(0, apexY);
        ctx.lineTo(leftX, leftY);
        ctx.lineTo(centerX, centerY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Jobb lap (Sötétebb)
        ctx.fillStyle = adjustBrightness(color, -35);
        ctx.beginPath();
        ctx.moveTo(0, apexY);
        ctx.lineTo(centerX, centerY);
        ctx.lineTo(rightX, rightY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'cylinder': {
        // 3D Henger
        const rx = s * 0.7;
        const ry = s * 0.25;
        const h = s * 1.1;

        // Palást
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, h * 0.5, rx, ry, 0, 0, Math.PI);
        ctx.lineTo(-rx, -h * 0.5);
        ctx.ellipse(0, -h * 0.5, rx, ry, 0, Math.PI, 0, true);
        ctx.lineTo(rx, h * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Felső fedőlap
        ctx.fillStyle = adjustBrightness(color, 40);
        ctx.beginPath();
        ctx.ellipse(0, -h * 0.5, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'sphere': {
        // 3D Gömb árnyékolt színátmenettel
        const grad = ctx.createRadialGradient(-s * 0.3, -s * 0.3, s * 0.08, 0, 0, s);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, adjustBrightness(color, 30));
        grad.addColorStop(0.8, color);
        grad.addColorStop(1, adjustBrightness(color, -60));

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }
    }
  };

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

  // Újrarajzolás
  useEffect(() => {
    renderCanvas();
  }, [shapes, lines, selectedShapeId, tool, linePreview]);

  // Egér kezelése
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (tool === 'select') {
      let found: PlacedShape | null = null;
      for (let i = shapes.length - 1; i >= 0; i--) {
        const s = shapes[i];
        const dist = Math.hypot(mouseX - s.x, mouseY - s.y);
        if (dist <= s.size + 14) {
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
    } else if (tool === 'line') {
      const snapX = snapToGrid ? Math.round(mouseX / 20) * 20 : mouseX;
      const snapY = snapToGrid ? Math.round(mouseY / 20) * 20 : mouseY;
      setLineStart({ x: snapX, y: snapY });
      setLinePreview({ x: snapX, y: snapY });
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
      let nextX = mouseX - dragOffset.x;
      let nextY = mouseY - dragOffset.y;

      if (snapToGrid) {
        nextX = Math.round(nextX / 20) * 20;
        nextY = Math.round(nextY / 20) * 20;
      }

      setShapes(prev =>
        prev.map(s => {
          if (s.id === selectedShapeId) {
            return {
              ...s,
              x: Math.max(40, Math.min(canvas.width - 40, nextX)),
              y: Math.max(40, Math.min(canvas.height - 40, nextY)),
            };
          }
          return s;
        })
      );
    } else if (tool === 'line' && lineStart) {
      const snapX = snapToGrid ? Math.round(mouseX / 20) * 20 : mouseX;
      const snapY = snapToGrid ? Math.round(mouseY / 20) * 20 : mouseY;
      setLinePreview({ x: snapX, y: snapY });
    } else if (isDrawing && lastDrawPos) {
      drawFreehand(lastDrawPos.x, lastDrawPos.y, mouseX, mouseY);
      setLastDrawPos({ x: mouseX, y: mouseY });
    }
  };

  const handleMouseUp = () => {
    if (tool === 'line' && lineStart && linePreview) {
      const dist = Math.hypot(linePreview.x - lineStart.x, linePreview.y - lineStart.y);
      if (dist > 8) {
        const newLine: DrawnLine = {
          id: Date.now().toString(),
          x1: lineStart.x,
          y1: lineStart.y,
          x2: linePreview.x,
          y2: linePreview.y,
          color: activeColor,
          width: 3,
        };
        setLines(prev => [...prev, newLine]);
        if (soundEnabled) speakText('Él összekötve!');
      }
      setLineStart(null);
      setLinePreview(null);
    }

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

  // Teljes vászon ürítése
  const handleClearAll = () => {
    if (drawingLayerRef.current) {
      const offCtx = drawingLayerRef.current.getContext('2d');
      offCtx?.clearRect(0, 0, 680, 430);
    }
    setShapes([]);
    setLines([]);
    setSelectedShapeId(null);
    renderCanvas();
    if (soundEnabled) speakText('Vászon kiürítve');
  };

  // Mentés BMP formátumban
  const handleSaveBmp = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    downloadCanvasAsBmp(canvas, 'paint_mester_alakzatok.bmp');

    if (soundEnabled) {
      speakText('A kép sikeresen letöltve valódi BMP formátumban! Megnyithatod a Windows Paint alkalmazásban.');
    }
  };

  return (
    <div className="content-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>Alakzat Műhely: Tükrözés, Forgatás & BMP Mentés</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Építs hatszöget háromszögekből vagy kockát négyzetekből tükrözéssel és forgatással, majd mentsd el <strong>.BMP</strong> fájlként!
          </p>
        </div>

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

      {/* Alakzat hozzáadó sáv */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', background: 'var(--bg-surface)', padding: '12px', borderRadius: '12px', border: '1px solid var(--bg-card-border)' }}>
        <span style={{ fontSize: '0.92rem', fontWeight: 700, alignSelf: 'center', marginRight: '6px' }}>
          Új alapalakzat:
        </span>

        <button type="button" className="btn-secondary" onClick={() => addShape('triangle')}>
          <span>🔺 Háromszög</span>
        </button>
        <button type="button" className="btn-secondary" onClick={() => addShape('square')}>
          <span>🟦 Négyzet (Kockához)</span>
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

      {/* TÜKRÖZÉS ÉS FORGATÁS MŰVELETI SÁV (Kiemelt SNI vezérlők) */}
      {selectedShape && tool === 'select' && (
        <div style={{ 
          background: 'linear-gradient(135deg, var(--primary-light) 0%, #eff6ff 100%)', 
          padding: '14px 18px', 
          borderRadius: '14px', 
          border: '2px solid var(--primary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>
                Kijelölt alakzat műveletei:
              </span>
              <span style={{ 
                background: 'white', 
                padding: '4px 10px', 
                borderRadius: '8px', 
                fontSize: '0.88rem', 
                fontWeight: 700,
                border: '1px solid #bfdbfe'
              }}>
                Szög: {selectedShape.rotation}° | Tükrözés: {selectedShape.flipH ? '↔ Vízszintes ' : ''}{selectedShape.flipV ? '↕ Függőleges' : ''}{!selectedShape.flipH && !selectedShape.flipV ? 'Nincs' : ''}
              </span>
            </div>

            {/* Másolás és Törlés */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={duplicateSelected}
                title="Pontos másolat készítése (Ctrl+C / Beillesztés)"
                style={{ padding: '8px 14px', fontSize: '0.9rem' }}
              >
                <Copy size={17} />
                <span>Másolás (Klónozás)</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={deleteSelected}
                style={{ color: '#ef4444', padding: '8px 14px', fontSize: '0.9rem' }}
                title="Kijelölt alakzat törlése"
              >
                <Trash2 size={17} />
                <span>Törlés</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Tükrözés gombok */}
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)' }}>Tükrözés:</span>
            
            <button
              type="button"
              className={`btn-secondary ${selectedShape.flipH ? 'btn-primary' : ''}`}
              onClick={flipSelectedH}
              title="Vízszintes tükrözés (Jobb-Bal csere)"
              style={{ padding: '8px 14px', fontSize: '0.9rem' }}
            >
              <FlipHorizontal size={18} />
              <span>↔ Vízszintes</span>
            </button>

            <button
              type="button"
              className={`btn-secondary ${selectedShape.flipV ? 'btn-primary' : ''}`}
              onClick={flipSelectedV}
              title="Függőleges tükrözés (Fejjel lefelé fordítás)"
              style={{ padding: '8px 14px', fontSize: '0.9rem' }}
            >
              <FlipVertical size={18} />
              <span>↕ Függőleges</span>
            </button>

            <div style={{ width: '1px', height: '24px', background: '#cbd5e1', margin: '0 4px' }} />

            {/* Forgatás gombok */}
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)' }}>Forgatás:</span>

            <button
              type="button"
              className="btn-accent"
              onClick={() => rotateSelected(-60)}
              title="Forgatás balra 60 fokkal"
              style={{ padding: '8px 12px', fontSize: '0.9rem' }}
            >
              <RotateCcw size={17} />
              <span>-60° (Hatszög)</span>
            </button>

            <button
              type="button"
              className="btn-accent"
              onClick={() => rotateSelected(60)}
              title="Forgatás jobbra 60 fokkal"
              style={{ padding: '8px 12px', fontSize: '0.9rem' }}
            >
              <RotateCw size={17} />
              <span>+60° (Hatszög)</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => rotateSelected(90)}
              title="Forgatás derékszöggel (+90 fok)"
              style={{ padding: '8px 12px', fontSize: '0.9rem' }}
            >
              <RotateCw size={17} />
              <span>+90°</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => rotateSelected(180)}
              title="Teljes 180 fokos megfordítás"
              style={{ padding: '8px 12px', fontSize: '0.9rem' }}
            >
              <RotateCw size={17} />
              <span>180° Fordítás</span>
            </button>

            {/* Finom forgató csúszka */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Finom szög:</span>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={selectedShape.rotation}
                onChange={e => setRotationDirect(Number(e.target.value))}
                style={{ width: '110px', cursor: 'pointer' }}
                title={`Forgatás: ${selectedShape.rotation}°`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Paint Szerszámok, Vonal eszköz, Színek és Rács */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--bg-surface)', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--bg-card-border)' }}>
        {/* Eszközválasztó */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={tool === 'select' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTool('select')}
            title="Alakzatok mozgatása és kijelölése"
          >
            <MousePointer size={18} />
            <span>Mozgatás</span>
          </button>

          <button
            type="button"
            className={tool === 'line' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTool('line')}
            title="Élek összekötése vonallal (Kockához!)"
          >
            <Slash size={18} />
            <span>Élösszekötő Vonal</span>
          </button>

          <button
            type="button"
            className={tool === 'brush' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTool('brush')}
            title="Szabadkézi ceruza és ecset"
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

        {/* Mágneses rács kapcsoló (SNI finommotorika támogatás) */}
        <button
          type="button"
          className={snapToGrid ? 'btn-accent' : 'btn-secondary'}
          onClick={() => {
            const next = !snapToGrid;
            setSnapToGrid(next);
            if (soundEnabled) speakText(next ? 'Mágneses rácshoz igazítás bekapcsolva' : 'Szabad mozgatás');
          }}
          title="Segít a sarkok és élek pontos illesztésében"
          style={{ padding: '8px 14px', fontSize: '0.88rem' }}
        >
          <Magnet size={18} />
          <span>{snapToGrid ? 'Mágneses rács: BE' : 'Mágneses rács: KI'}</span>
        </button>

        {/* Színpaletta */}
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

        {/* Vászon ürítése */}
        <button
          type="button"
          className="btn-secondary"
          onClick={handleClearAll}
          title="Minden elem törlése a vászonról"
          style={{ fontSize: '0.85rem', padding: '8px 12px' }}
        >
          <Trash2 size={16} />
          <span>Ürítés</span>
        </button>
      </div>

      {/* RAJZVÁSZON (Canvas) */}
      <div className="paint-window-frame" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <canvas
          ref={canvasRef}
          width={680}
          height={430}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            cursor: tool === 'select' ? (isDragging ? 'grabbing' : 'grab') : (tool === 'line' ? 'crosshair' : 'default'),
            background: '#ffffff',
            touchAction: 'none'
          }}
        />

        {tool === 'line' && (
          <div style={{ marginTop: '8px', fontSize: '0.88rem', color: 'var(--primary)', fontWeight: 700 }}>
            📏 <strong>Élösszekötő mód:</strong> Kattints egy sarokra, tartsd nyomva az egeret és húzd át a szemközti sarokra a kocka éleihez!
          </div>
        )}
      </div>

      {/* Hasznos trükkök SNI diákoknak */}
      <div className="step-subtext" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <span>
          💡 <strong>Hogyan készíts Hatszöget és Kockát?</strong>
          <br />
          • <strong>Hatszög:</strong> Kattints a háromszögre ➔ Nyomd meg a <strong>Másolás</strong> gombot ➔ Forgasd el <strong>+60°</strong>-kal ➔ Illeszd a csúcsokat egymás mellé!
          <br />
          • <strong>Kocka:</strong> Helyezz el egy négyzetet ➔ Másold le és told el átlósan ➔ Használd az <strong>Élösszekötő Vonal</strong> eszközt a 4 sarok összekötéséhez!
        </span>
      </div>
    </div>
  );
};
