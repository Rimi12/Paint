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
  Magnet,
  Maximize2,
  Minimize2,
  Square,
  Circle as CircleIcon,
  Triangle as TriangleIcon,
  Star as StarIcon,
  Hexagon as HexagonIcon,
  PenTool,
  Check,
  X,
  Undo2,
  Redo2,
  Maximize,
  Minimize
} from 'lucide-react';
import { downloadCanvasAsBmp } from '../utils/bmpEncoder';
import { speakText } from '../utils/speech';

export interface StudioHistoryState {
  shapes: PlacedShape[];
  lines: DrawnLine[];
  canvasWidth: number;
  canvasHeight: number;
  drawingDataUrl: string;
}

export type ShapeType = 
  | 'triangle' 
  | 'rightTriangle'
  | 'square' 
  | 'rectangle'
  | 'circle' 
  | 'rhombus' 
  | 'trapezoid' 
  | 'pentagon' 
  | 'hexagon' 
  | 'star'
  | 'heart'
  | 'custom'
  | 'cube' 
  | 'pyramid' 
  | 'cylinder' 
  | 'sphere';

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
  customPoints?: { x: number; y: number }[]; // relatív koordináták (0,0) középponthoz képest -1 és 1 között
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
  const renderCanvasRef = useRef<() => void>(() => {});

  // Eszközök: select (mozgatás/méretezés), line (vonal), brush (ecset), eraser (radír), drawShape (húzással rajzolás), customPoly (saját sokszög)
  const [tool, setTool] = useState<'select' | 'line' | 'brush' | 'eraser' | 'drawShape' | 'customPoly'>('select');
  const [activeDrawShapeType, setActiveDrawShapeType] = useState<ShapeType>('circle');
  const [activeColor, setActiveColor] = useState<string>('#3b82f6');
  const [brushSize] = useState<number>(5);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  // Lapméret (szélesség és magasság képpontban)
  const [canvasWidth, setCanvasWidth] = useState<number>(700);
  const [canvasHeight, setCanvasHeight] = useState<number>(440);
  const [isResizingSheet, setIsResizingSheet] = useState<'e' | 's' | 'se' | null>(null);
  const sheetResizeStartRef = useRef<{ startX: number; startY: number; startW: number; startH: number }>({
    startX: 0,
    startY: 0,
    startW: 700,
    startH: 440,
  });

  // Teljes képernyős állapot
  const [isStudioFullscreen, setIsStudioFullscreen] = useState<boolean>(false);

  // Kezdő alakzatok a vásznon: háromszög, négyzet és hatszög
  const [shapes, setShapes] = useState<PlacedShape[]>([
    { id: '1', type: 'triangle', x: 140, y: 170, size: 70, rotation: 0, color: '#3b82f6', flipH: false, flipV: false },
    { id: '2', type: 'square', x: 290, y: 170, size: 65, rotation: 0, color: '#10b981', flipH: false, flipV: false },
    { id: '3', type: 'hexagon', x: 450, y: 170, size: 70, rotation: 0, color: '#8b5cf6', flipH: false, flipV: false },
  ]);

  const [lines, setLines] = useState<DrawnLine[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>('1');

  // Előzmények (Undo / Redo) állapotok
  const [history, setHistory] = useState<StudioHistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const historyRef = useRef<StudioHistoryState[]>([]);
  const historyIndexRef = useRef<number>(-1);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  // Mozgatási és méretezési állapotok
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [resizeHandle, setResizeHandle] = useState<'nw' | 'ne' | 'se' | 'sw' | null>(null);
  const [initialResizeDist, setInitialResizeDist] = useState<number>(0);
  const [initialShapeSize, setInitialShapeSize] = useState<number>(0);

  // Forgatási állapotok egérrel történő forgatáshoz
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [isShiftActive, setIsShiftActive] = useState<boolean>(false);
  const [hoverHandle, setHoverHandle] = useState<'rotate' | 'nw' | 'ne' | 'se' | 'sw' | 'body' | null>(null);

  // Shift billentyű figyelése nevezetes szögekhez
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftActive(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftActive(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Vonal és szabadkézi rajz állapotok
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [lastDrawPos, setLastDrawPos] = useState<{ x: number; y: number } | null>(null);
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);
  const [linePreview, setLinePreview] = useState<{ x: number; y: number } | null>(null);

  // Húzással alakzatkészítés állapota (drag to draw)
  const [shapeDragStart, setShapeDragStart] = useState<{ x: number; y: number } | null>(null);
  const [shapeDragCurrent, setShapeDragCurrent] = useState<{ x: number; y: number } | null>(null);

  // Saját sokszög készítő pontjai
  const [polyPoints, setPolyPoints] = useState<{ x: number; y: number }[]>([]);
  const [polyCursor, setPolyCursor] = useState<{ x: number; y: number } | null>(null);

  // Mágneses igazítási vonalak visszajelzése
  const [snapLines, setSnapLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

  // Szabadkézi ecset réteg
  const drawingLayerRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!drawingLayerRef.current) {
      const offscreen = document.createElement('canvas');
      offscreen.width = 700;
      offscreen.height = 440;
      drawingLayerRef.current = offscreen;

      // Kezdeti állapot pillanatkép
      const initialSnapshot: StudioHistoryState = {
        shapes: JSON.parse(JSON.stringify(shapes)),
        lines: JSON.parse(JSON.stringify(lines)),
        canvasWidth: 700,
        canvasHeight: 440,
        drawingDataUrl: offscreen.toDataURL(),
      };
      setHistory([initialSnapshot]);
      setHistoryIndex(0);
      historyRef.current = [initialSnapshot];
      historyIndexRef.current = 0;
    }
  }, []);

  // --- ELŐZMÉNYEK (UNDO / REDO) KEZELÉSE ---
  const pushSnapshot = (
    customShapes?: PlacedShape[],
    customLines?: DrawnLine[],
    customW?: number,
    customH?: number,
    customDrawingUrl?: string
  ) => {
    const currentUrl = customDrawingUrl ?? (drawingLayerRef.current ? drawingLayerRef.current.toDataURL() : '');
    const snapshot: StudioHistoryState = {
      shapes: JSON.parse(JSON.stringify(customShapes ?? shapes)),
      lines: JSON.parse(JSON.stringify(customLines ?? lines)),
      canvasWidth: customW ?? canvasWidth,
      canvasHeight: customH ?? canvasHeight,
      drawingDataUrl: currentUrl,
    };

    const currIdx = historyIndexRef.current;
    const currHist = historyRef.current;

    const trimmed = currHist.slice(0, currIdx + 1);
    trimmed.push(snapshot);
    if (trimmed.length > 30) {
      trimmed.shift();
    }
    const newIdx = trimmed.length - 1;

    historyRef.current = trimmed;
    historyIndexRef.current = newIdx;
    setHistory(trimmed);
    setHistoryIndex(newIdx);
  };

  const applySnapshot = (snapshot: StudioHistoryState) => {
    setShapes(JSON.parse(JSON.stringify(snapshot.shapes)));
    setLines(JSON.parse(JSON.stringify(snapshot.lines)));
    setCanvasWidth(snapshot.canvasWidth);
    setCanvasHeight(snapshot.canvasHeight);

    if (drawingLayerRef.current) {
      const offscreen = drawingLayerRef.current;
      if (offscreen.width !== snapshot.canvasWidth || offscreen.height !== snapshot.canvasHeight) {
        offscreen.width = snapshot.canvasWidth;
        offscreen.height = snapshot.canvasHeight;
      }
      const offCtx = offscreen.getContext('2d');
      if (offCtx) {
        offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
        if (snapshot.drawingDataUrl) {
          const img = new Image();
          img.onload = () => {
            offCtx.drawImage(img, 0, 0);
            renderCanvasRef.current?.();
          };
          img.src = snapshot.drawingDataUrl;
        } else {
          renderCanvasRef.current?.();
        }
      }
    }
  };

  const handleUndo = () => {
    const currIdx = historyIndexRef.current;
    const currHist = historyRef.current;
    if (currIdx > 0) {
      const prevIdx = currIdx - 1;
      const target = currHist[prevIdx];
      if (target) {
        applySnapshot(target);
        historyIndexRef.current = prevIdx;
        setHistoryIndex(prevIdx);
        if (soundEnabled) speakText('Visszavonás');
      }
    }
  };

  const handleRedo = () => {
    const currIdx = historyIndexRef.current;
    const currHist = historyRef.current;
    if (currIdx < currHist.length - 1) {
      const nextIdx = currIdx + 1;
      const target = currHist[nextIdx];
      if (target) {
        applySnapshot(target);
        historyIndexRef.current = nextIdx;
        setHistoryIndex(nextIdx);
        if (soundEnabled) speakText('Előre vonás');
      }
    }
  };

  // Visszavonás és újra billentyűparancsok (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- LAPMÉRET VÁLTOZTATÁSA ÉS FOGANTYÚK ---
  const resizeCanvas = (newW: number, newH: number) => {
    const targetW = Math.max(400, Math.min(1150, Math.round(newW)));
    const targetH = Math.max(300, Math.min(750, Math.round(newH)));

    if (drawingLayerRef.current) {
      const oldCanvas = drawingLayerRef.current;
      if (oldCanvas.width !== targetW || oldCanvas.height !== targetH) {
        const newOffscreen = document.createElement('canvas');
        newOffscreen.width = targetW;
        newOffscreen.height = targetH;
        const newCtx = newOffscreen.getContext('2d');
        if (newCtx) {
          newCtx.drawImage(oldCanvas, 0, 0);
        }
        drawingLayerRef.current = newOffscreen;
      }
    }
    setCanvasWidth(targetW);
    setCanvasHeight(targetH);
  };

  const applyCanvasPreset = (w: number, h: number, name: string) => {
    resizeCanvas(w, h);
    pushSnapshot(undefined, undefined, w, h);
    if (soundEnabled) speakText(`Lapméret beállítva: ${name}`);
  };

  const handleSheetResizeMouseDown = (dir: 'e' | 's' | 'se', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingSheet(dir);
    sheetResizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: canvasWidth,
      startH: canvasHeight,
    };
  };

  useEffect(() => {
    if (!isResizingSheet) return;

    const onWindowMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - sheetResizeStartRef.current.startX;
      const deltaY = e.clientY - sheetResizeStartRef.current.startY;

      let newW = sheetResizeStartRef.current.startW;
      let newH = sheetResizeStartRef.current.startH;

      if (isResizingSheet === 'e' || isResizingSheet === 'se') {
        newW = Math.max(400, Math.min(1150, Math.round(sheetResizeStartRef.current.startW + deltaX)));
      }
      if (isResizingSheet === 's' || isResizingSheet === 'se') {
        newH = Math.max(300, Math.min(750, Math.round(sheetResizeStartRef.current.startH + deltaY)));
      }

      resizeCanvas(newW, newH);
    };

    const onWindowMouseUp = () => {
      setIsResizingSheet(null);
      pushSnapshot();
      if (soundEnabled) {
        speakText(`Rajzlap átméretezve: ${canvasWidth} szor ${canvasHeight} képpont`);
      }
    };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [isResizingSheet, canvasWidth, canvasHeight, soundEnabled]);

  // --- TELJES KÉPERNYŐS NÉZET ---
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsStudioFullscreen(true);
      if (soundEnabled) speakText('Teljes képernyős nézet bekapcsolva');
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsStudioFullscreen(false);
      if (soundEnabled) speakText('Kilépés a teljes képernyőből');
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsStudioFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const selectedShape = shapes.find(s => s.id === selectedShapeId);

  // --- ALAKZAT HOZZÁADÁSA KATTINTÁSSAL ---
  const addShape = (type: ShapeType) => {
    const newShape: PlacedShape = {
      id: Date.now().toString(),
      type,
      x: 200 + Math.floor(Math.random() * 200),
      y: 150 + Math.floor(Math.random() * 120),
      size: type === 'square' || type === 'rectangle' ? 65 : 70,
      rotation: 0,
      color: activeColor,
      flipH: false,
      flipV: false,
    };
    const nextShapes = [...shapes, newShape];
    setShapes(nextShapes);
    setSelectedShapeId(newShape.id);
    setTool('select');
    pushSnapshot(nextShapes);

    if (soundEnabled) {
      const names: Record<ShapeType, string> = {
        triangle: 'Egyenlő oldalú háromszög hozzáadva',
        rightTriangle: 'Derékszögű háromszög hozzáadva',
        square: 'Négyzet hozzáadva',
        rectangle: 'Téglalap hozzáadva',
        circle: 'Kör hozzáadva',
        rhombus: 'Rombusz hozzáadva',
        trapezoid: 'Trapéz hozzáadva',
        pentagon: 'Ötszög hozzáadva',
        hexagon: 'Hatszög hozzáadva',
        star: 'Csillag hozzáadva',
        heart: 'Szív alakzat hozzáadva',
        custom: 'Egyedi sokszög hozzáadva',
        cube: '3D Kocka hozzáadva',
        pyramid: '3D Gúla hozzáadva',
        cylinder: '3D Henger hozzáadva',
        sphere: '3D Gömb hozzáadva',
      };
      speakText(names[type] || 'Alakzat hozzáadva');
    }
  };

  // --- MÉRET VÁLTOZTATÁSA ---
  const changeSelectedSize = (delta: number) => {
    if (!selectedShapeId) return;
    const nextShapes = shapes.map(s => {
      if (s.id === selectedShapeId) {
        const next = Math.max(25, Math.min(240, s.size + delta));
        if (soundEnabled) speakText(`Méret: ${Math.round(next)} képpont`);
        return { ...s, size: next };
      }
      return s;
    });
    setShapes(nextShapes);
    pushSnapshot(nextShapes);
  };

  const setSelectedSizeDirect = (newSize: number) => {
    if (!selectedShapeId) return;
    setShapes(prev =>
      prev.map(s => (s.id === selectedShapeId ? { ...s, size: Math.max(25, Math.min(240, newSize)) } : s))
    );
  };

  // --- MÁSOLÁS / KLÓNOZÁS ---
  const duplicateSelected = () => {
    if (!selectedShape) return;
    const newShape: PlacedShape = {
      ...selectedShape,
      id: Date.now().toString(),
      x: Math.min(canvasWidth - 50, selectedShape.x + 35),
      y: Math.min(canvasHeight - 50, selectedShape.y + 35),
    };
    const nextShapes = [...shapes, newShape];
    setShapes(nextShapes);
    setSelectedShapeId(newShape.id);
    pushSnapshot(nextShapes);

    if (soundEnabled) {
      speakText('Alakzat lemásolva! Mozgasd el egérrel a helyére!');
    }
  };

  // --- TÜKRÖZÉS ÉS FORGATÁS ---
  const flipSelectedH = () => {
    if (!selectedShapeId) return;
    const nextShapes = shapes.map(s => {
      if (s.id === selectedShapeId) {
        const next = !s.flipH;
        if (soundEnabled) speakText('Vízszintes tükrözés');
        return { ...s, flipH: next };
      }
      return s;
    });
    setShapes(nextShapes);
    pushSnapshot(nextShapes);
  };

  const flipSelectedV = () => {
    if (!selectedShapeId) return;
    const nextShapes = shapes.map(s => {
      if (s.id === selectedShapeId) {
        const next = !s.flipV;
        if (soundEnabled) speakText('Függőleges tükrözés');
        return { ...s, flipV: next };
      }
      return s;
    });
    setShapes(nextShapes);
    pushSnapshot(nextShapes);
  };

  const rotateSelected = (degrees: number) => {
    if (!selectedShapeId) return;
    let newRot = 0;
    const nextShapes = shapes.map(s => {
      if (s.id === selectedShapeId) {
        newRot = (s.rotation + degrees + 360) % 360;
        return { ...s, rotation: newRot };
      }
      return s;
    });
    if (soundEnabled) speakText(`Forgatás: ${newRot} fok`);
    setShapes(nextShapes);
    pushSnapshot(nextShapes);
  };

  const setRotationDirect = (deg: number) => {
    if (!selectedShapeId) return;
    setShapes(prev =>
      prev.map(s => (s.id === selectedShapeId ? { ...s, rotation: deg } : s))
    );
  };

  // --- TÖRLÉS ---
  const deleteSelected = () => {
    if (!selectedShapeId) return;
    const nextShapes = shapes.filter(s => s.id !== selectedShapeId);
    setShapes(nextShapes);
    setSelectedShapeId(null);
    pushSnapshot(nextShapes);
    if (soundEnabled) speakText('Alakzat törölve');
  };

  // --- SAJÁT SOKSZÖG LEZÁRÁSA ÉS LÉTREHOZÁSA ---
  const finishCustomPolygon = () => {
    if (polyPoints.length < 3) {
      if (soundEnabled) speakText('Legalább 3 pont szükséges egy zárt alakzathoz!');
      return;
    }

    // Centroid számítása
    const avgX = polyPoints.reduce((sum, p) => sum + p.x, 0) / polyPoints.length;
    const avgY = polyPoints.reduce((sum, p) => sum + p.y, 0) / polyPoints.length;

    // Maximális távolság a középponttól (ez lesz a size)
    let maxDist = 0;
    polyPoints.forEach(p => {
      const d = Math.hypot(p.x - avgX, p.y - avgY);
      if (d > maxDist) maxDist = d;
    });
    maxDist = Math.max(30, maxDist);

    // Relatív normált pontok (-1 és 1 között)
    const normalizedPoints = polyPoints.map(p => ({
      x: (p.x - avgX) / maxDist,
      y: (p.y - avgY) / maxDist,
    }));

    const newShape: PlacedShape = {
      id: Date.now().toString(),
      type: 'custom',
      x: Math.round(avgX),
      y: Math.round(avgY),
      size: Math.round(maxDist),
      rotation: 0,
      color: activeColor,
      flipH: false,
      flipV: false,
      customPoints: normalizedPoints,
    };

    const nextShapes = [...shapes, newShape];
    setShapes(nextShapes);
    setSelectedShapeId(newShape.id);
    setPolyPoints([]);
    setPolyCursor(null);
    setTool('select');
    pushSnapshot(nextShapes);

    if (soundEnabled) {
      speakText('Saját alakzat elkészült! Most már szabadon mozgathatod, méretezheted és forgathatod!');
    }
  };

  const cancelCustomPolygon = () => {
    setPolyPoints([]);
    setPolyCursor(null);
    setTool('select');
    if (soundEnabled) speakText('Sokszög készítés megszakítva');
  };

  // --- CANVAS TELJES ÚJRARAJZOLÁSA ---
  const renderCanvas = () => {
    renderCanvasRef.current = renderCanvas;
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

    // 3. Mágneses igazítási segédvonalak (Snap lines)
    if (snapLines.length > 0) {
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      snapLines.forEach(l => {
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    // 4. Szabadkézi ecsetréteg
    if (drawingLayerRef.current) {
      ctx.drawImage(drawingLayerRef.current, 0, 0);
    }

    // 5. Húzott egyenes élek / vonalak (kocka élek)
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

    // 6. Alakzatok kirajzolása forgatással, tükrözéssel és méretezéssel
    shapes.forEach(shape => {
      ctx.save();
      ctx.translate(shape.x, shape.y);
      ctx.rotate((shape.rotation * Math.PI) / 180);
      ctx.scale(shape.flipH ? -1 : 1, shape.flipV ? -1 : 1);

      const isSelected = shape.id === selectedShapeId && tool === 'select';

      drawShapeOnCtx(ctx, shape);

      // Kijelölő keret, fogantyúk és forgatás ikon (Paint stílus!)
      if (isSelected) {
        ctx.restore();
        ctx.save();
        ctx.translate(shape.x, shape.y);
        ctx.rotate((shape.rotation * Math.PI) / 180);

        const s = shape.size + 10;

        // Kijelölő szaggatott keret
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(-s, -s, s * 2, s * 2);
        ctx.setLineDash([]);

        // 4 Sarok méretező fogantyú (Resize Handles: NW, NE, SE, SW)
        const handleCorners: { x: number; y: number; handle: 'nw' | 'ne' | 'se' | 'sw' }[] = [
          { x: -s, y: -s, handle: 'nw' },
          { x: s, y: -s, handle: 'ne' },
          { x: s, y: s, handle: 'se' },
          { x: -s, y: s, handle: 'sw' }
        ];

        handleCorners.forEach(hc => {
          const isHandleActive = hoverHandle === hc.handle || (isResizing && resizeHandle === hc.handle);
          ctx.fillStyle = isHandleActive ? '#dbeafe' : '#ffffff';
          ctx.strokeStyle = isHandleActive ? '#1d4ed8' : '#2563eb';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(hc.x, hc.y, isHandleActive ? 8 : 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });

        // 1. Forgatási fogantyú szára (Connecting stem line a keret felső élétől)
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(0, -s - 24);
        ctx.stroke();

        // 2. Forgatási fogantyú gomb (Circle Handle - Paint stílus)
        ctx.fillStyle = isRotating || hoverHandle === 'rotate' ? '#eff6ff' : '#ffffff';
        ctx.strokeStyle = isRotating || hoverHandle === 'rotate' ? '#1d4ed8' : '#2563eb';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, -s - 24, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 3. Forgatási ikon (nyíl körívvel a gomb belsejében 🔄)
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -s - 24, 6.5, -Math.PI * 0.75, Math.PI * 0.85);
        ctx.stroke();

        const arrowAngle = Math.PI * 0.85;
        const ax = 6.5 * Math.cos(arrowAngle);
        const ay = -s - 24 + 6.5 * Math.sin(arrowAngle);
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - 3, ay - 4);
        ctx.lineTo(ax + 4, ay - 3);
        ctx.closePath();
        ctx.fill();

        // Információs címke: szög és méret
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(-110, s + 8, 220, 26);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        const shiftNote = isShiftActive ? '[Shift: 15°-os lépés]' : '[2°-os finom lépés]';
        ctx.fillText(`🔄 ${shape.rotation}° ${isRotating ? shiftNote : `| Méret: ${Math.round(shape.size)}px`}`, 0, s + 25);
      }

      ctx.restore();
    });

    // 7. Húzással alakzatkészítés előnézete (Rubber band)
    if (tool === 'drawShape' && shapeDragStart && shapeDragCurrent) {
      const dx = shapeDragCurrent.x - shapeDragStart.x;
      const dy = shapeDragCurrent.y - shapeDragStart.y;
      const dist = Math.hypot(dx, dy);

      ctx.save();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      // Bounding box előnézet
      const minX = Math.min(shapeDragStart.x, shapeDragCurrent.x);
      const minY = Math.min(shapeDragStart.y, shapeDragCurrent.y);
      const w = Math.abs(dx);
      const h = Math.abs(dy);
      ctx.strokeRect(minX, minY, w, h);

      // Ideiglenes alakzat előnézete a középpontban
      const cx = (shapeDragStart.x + shapeDragCurrent.x) / 2;
      const cy = (shapeDragStart.y + shapeDragCurrent.y) / 2;
      ctx.translate(cx, cy);

      const previewShape: PlacedShape = {
        id: 'preview',
        type: activeDrawShapeType,
        x: 0,
        y: 0,
        size: Math.max(15, dist / 2),
        rotation: 0,
        color: activeColor,
      };

      ctx.globalAlpha = 0.65;
      drawShapeOnCtx(ctx, previewShape);
      ctx.restore();
    }

    // 8. Saját sokszög készítő folyamatban lévő pontjai és vonalai
    if (tool === 'customPoly') {
      if (polyPoints.length > 0) {
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(polyPoints[0].x, polyPoints[0].y);
        for (let i = 1; i < polyPoints.length; i++) {
          ctx.lineTo(polyPoints[i].x, polyPoints[i].y);
        }
        if (polyCursor) {
          ctx.lineTo(polyCursor.x, polyCursor.y);
        }
        ctx.stroke();

        // Pontok kirajzolása sorszámmal
        polyPoints.forEach((p, idx) => {
          ctx.fillStyle = idx === 0 ? '#10b981' : '#2563eb';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText((idx + 1).toString(), p.x, p.y);
        });

        // Ha a kurzor a kezdőpont közelében van, jelezzük a lezárást
        if (polyCursor && polyPoints.length >= 3) {
          const dToStart = Math.hypot(polyCursor.x - polyPoints[0].x, polyCursor.y - polyPoints[0].y);
          if (dToStart < 20) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
            ctx.beginPath();
            ctx.arc(polyPoints[0].x, polyPoints[0].y, 22, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  };

  // --- ALAKZATOK GRAFIKUS KIRAJZOLÁSA ---
  const drawShapeOnCtx = (ctx: CanvasRenderingContext2D, shape: PlacedShape) => {
    const s = shape.size;
    const color = shape.color;

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (shape.type) {
      case 'circle': {
        // Szabályos kör
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Középpont jelölő
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

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

        // Középpont jelölő az illesztéshez
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'rightTriangle': {
        // Derékszögű háromszög
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-s * 0.8, s * 0.8);
        ctx.lineTo(s * 0.8, s * 0.8);
        ctx.lineTo(-s * 0.8, -s * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'square': {
        // Szabályos négyzet
        const half = s * 0.72;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.rect(-half, -half, half * 2, half * 2);
        ctx.fill();
        ctx.stroke();

        // Sarokpontok a vonalillesztéshez
        ctx.fillStyle = '#ffffff';
        [[-half, -half], [half, -half], [half, half], [-half, half]].forEach(([px, py]) => {
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        });
        break;
      }

      case 'rectangle': {
        // Téglalap
        const w = s * 0.95;
        const h = s * 0.55;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.rect(-w, -h, w * 2, h * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'rhombus': {
        // Rombusz (Gyémánt)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.75, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.75, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'trapezoid': {
        // Szimmetrikus trapéz
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-s * 0.5, -s * 0.6);
        ctx.lineTo(s * 0.5, -s * 0.6);
        ctx.lineTo(s * 0.9, s * 0.6);
        ctx.lineTo(-s * 0.9, s * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'pentagon': {
        // Szabályos ötszög
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 72 - 90) * (Math.PI / 180);
          const x = s * Math.cos(angle);
          const y = s * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.stroke();
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

        // Belső 6 háromszög találkozási vonalai
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

      case 'star': {
        // 5 ágú csillag
        ctx.fillStyle = color;
        ctx.beginPath();
        const spikes = 5;
        const outerRadius = s;
        const innerRadius = s * 0.45;
        let rot = (Math.PI / 2) * 3;
        const step = Math.PI / spikes;

        ctx.moveTo(0, -outerRadius);
        for (let i = 0; i < spikes; i++) {
          let x = Math.cos(rot) * outerRadius;
          let y = Math.sin(rot) * outerRadius;
          ctx.lineTo(x, y);
          rot += step;

          x = Math.cos(rot) * innerRadius;
          y = Math.sin(rot) * innerRadius;
          ctx.lineTo(x, y);
          rot += step;
        }
        ctx.lineTo(0, -outerRadius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'heart': {
        // Szív alakzat
        ctx.fillStyle = color;
        ctx.beginPath();
        const topCurveHeight = s * 0.3;
        ctx.moveTo(0, topCurveHeight);
        ctx.bezierCurveTo(0, 0, -s * 0.8, -s * 0.5, -s * 0.8, -s * 0.1);
        ctx.bezierCurveTo(-s * 0.8, s * 0.3, -s * 0.3, s * 0.6, 0, s * 0.9);
        ctx.bezierCurveTo(s * 0.3, s * 0.6, s * 0.8, s * 0.3, s * 0.8, -s * 0.1);
        ctx.bezierCurveTo(s * 0.8, -s * 0.5, 0, 0, 0, topCurveHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'custom': {
        // Egyedi zárt sokszög
        if (shape.customPoints && shape.customPoints.length > 2) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(shape.customPoints[0].x * s, shape.customPoints[0].y * s);
          for (let i = 1; i < shape.customPoints.length; i++) {
            ctx.lineTo(shape.customPoints[i].x * s, shape.customPoints[i].y * s);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        break;
      }

      case 'cube': {
        // 3D Kocka izometrikus ábrázolása
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

        // Felső lap
        ctx.fillStyle = adjustBrightness(color, 45);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(topLeftX, topLeftY);
        ctx.lineTo(0, topY);
        ctx.lineTo(topRightX, topRightY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Bal lap
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(topLeftX, topLeftY);
        ctx.lineTo(bottomLeftX, bottomLeftY);
        ctx.lineTo(0, bottomY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Jobb lap
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

        // Jobb lap
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
        // 3D Gömb árnyékolással
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

  // Újrarajzolás változáskor
  useEffect(() => {
    renderCanvas();
  }, [shapes, lines, selectedShapeId, tool, linePreview, shapeDragCurrent, polyPoints, polyCursor, snapLines, canvasWidth, canvasHeight]);

  // --- EGÉRKEZELÉS (MOUSE EVENTS) ---
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (tool === 'select') {
      // 1. Megvizsgáljuk, hogy a kijelölt alakzat forgatási vagy méretezési fogantyújára kattintott-e
      if (selectedShape) {
        const s = selectedShape.size + 10;
        const rotRad = (selectedShape.rotation * Math.PI) / 180;
        const dx = mouseX - selectedShape.x;
        const dy = mouseY - selectedShape.y;
        const localX = dx * Math.cos(-rotRad) - dy * Math.sin(-rotRad);
        const localY = dx * Math.sin(-rotRad) + dy * Math.cos(-rotRad);

        // A) FORGATÁSI FOGANTYÚ DETEKTÁLÁSA (Paint stílus: felső szár végén lévő kör (0, -s - 24))
        if (Math.hypot(localX - 0, localY - (-s - 24)) <= 18) {
          setIsRotating(true);
          if (soundEnabled) {
            speakText('Forgatás bekapcsolva. Alapesetben 2 fokonként forog, Shift gombbal 15 fokos nevezetes szögekre ugrik!');
          }
          return;
        }

        // B) MÉRETEZŐ FOGANTYÚK DETEKTÁLÁSA (NW, NE, SE, SW) - Bőséges 20px-es kattintási távolság!
        const cornerDist = 20;
        if (Math.hypot(localX - (-s), localY - (-s)) <= cornerDist) {
          setIsResizing(true);
          setResizeHandle('nw');
          setInitialResizeDist(Math.hypot(dx, dy));
          setInitialShapeSize(selectedShape.size);
          return;
        }
        if (Math.hypot(localX - s, localY - (-s)) <= cornerDist) {
          setIsResizing(true);
          setResizeHandle('ne');
          setInitialResizeDist(Math.hypot(dx, dy));
          setInitialShapeSize(selectedShape.size);
          return;
        }
        if (Math.hypot(localX - s, localY - s) <= cornerDist) {
          setIsResizing(true);
          setResizeHandle('se');
          setInitialResizeDist(Math.hypot(dx, dy));
          setInitialShapeSize(selectedShape.size);
          return;
        }
        if (Math.hypot(localX - (-s), localY - s) <= cornerDist) {
          setIsResizing(true);
          setResizeHandle('sw');
          setInitialResizeDist(Math.hypot(dx, dy));
          setInitialShapeSize(selectedShape.size);
          return;
        }
      }

      // 2. Alakzat kijelölése és mozgatásának kezdete
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
    } else if (tool === 'drawShape') {
      // Húzással alakzatkészítés indul
      const snapX = snapToGrid ? Math.round(mouseX / 20) * 20 : mouseX;
      const snapY = snapToGrid ? Math.round(mouseY / 20) * 20 : mouseY;
      setShapeDragStart({ x: snapX, y: snapY });
      setShapeDragCurrent({ x: snapX, y: snapY });
    } else if (tool === 'customPoly') {
      // Pont lerakása a saját sokszöghöz
      const snapX = snapToGrid ? Math.round(mouseX / 20) * 20 : mouseX;
      const snapY = snapToGrid ? Math.round(mouseY / 20) * 20 : mouseY;

      // Ha már van legalább 3 pont és a kezdőpont közelébe kattintunk: lezárás!
      if (polyPoints.length >= 3) {
        const dToStart = Math.hypot(snapX - polyPoints[0].x, snapY - polyPoints[0].y);
        if (dToStart < 20) {
          finishCustomPolygon();
          return;
        }
      }

      setPolyPoints(prev => [...prev, { x: snapX, y: snapY }]);
      if (soundEnabled) speakText(`${polyPoints.length + 1}. pont rögzítve`);
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
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (tool === 'select') {
      // 1. FORGATÁS VÉGREHAJTÁSA EGÉRREL (Paint stílus)
      if (isRotating && selectedShape) {
        const dx = mouseX - selectedShape.x;
        const dy = mouseY - selectedShape.y;
        // Szög a függőlegeshez (fent = 0°) képest az óramutató járásával megegyezően
        let rawDeg = (Math.atan2(dy, dx) * 180 / Math.PI) + 90;
        rawDeg = (rawDeg % 360 + 360) % 360;

        let newRot: number;
        if (e.shiftKey) {
          // SHIFT: Nevezetes szögek (15°-os ugrások: 0°, 15°, 30°, 45°, 60°, 75°, 90°, 120°, 135°, 180°, stb.)
          newRot = Math.round(rawDeg / 15) * 15 % 360;
        } else {
          // NORMÁL: 2 fokonkénti finom forgatás!
          newRot = Math.round(rawDeg / 2) * 2 % 360;
        }

        setShapes(prev =>
          prev.map(s => (s.id === selectedShape.id ? { ...s, rotation: newRot } : s))
        );
        return;
      }

      // 2. MÉRETEZÉS VÉGREHAJTÁSA HÚZÁSSAL
      if (isResizing && selectedShape && initialResizeDist > 0) {
        const currentDist = Math.hypot(mouseX - selectedShape.x, mouseY - selectedShape.y);
        const scaleFactor = currentDist / initialResizeDist;
        const newSize = Math.max(25, Math.min(240, Math.round(initialShapeSize * scaleFactor)));

        setShapes(prev =>
          prev.map(s => (s.id === selectedShape.id ? { ...s, size: newSize } : s))
        );
        return;
      }

      // 3. MOZGATÁS VÉGREHAJTÁSA MÁGNESES ILLESZTÉSSEL
      if (isDragging && selectedShapeId) {
        let nextX = mouseX - dragOffset.x;
        let nextY = mouseY - dragOffset.y;

        const newSnapLines: { x1: number; y1: number; x2: number; y2: number }[] = [];

        // Csak akkor illesztünk, ha a mágneses illesztés BE van kapcsolva!
        if (snapToGrid) {
          // Igazítás a többi alakzathoz (Mágneses alakzat-illesztés!)
          const snapThreshold = 18;
          shapes.forEach(other => {
            if (other.id === selectedShapeId) return;

            // X tengely szerinti igazítás (középpontok)
            if (Math.abs(nextX - other.x) < snapThreshold) {
              nextX = other.x;
              newSnapLines.push({ x1: other.x, y1: 0, x2: other.x, y2: canvas.height });
            }

            // Y tengely szerinti igazítás (középpontok)
            if (Math.abs(nextY - other.y) < snapThreshold) {
              nextY = other.y;
              newSnapLines.push({ x1: 0, y1: other.y, x2: canvas.width, y2: other.y });
            }

            // Érintkező illesztés jobbra/balra
            const touchDistX = other.size + (selectedShape?.size || 0);
            if (Math.abs(nextX - (other.x + touchDistX)) < snapThreshold) {
              nextX = other.x + touchDistX;
            } else if (Math.abs(nextX - (other.x - touchDistX)) < snapThreshold) {
              nextX = other.x - touchDistX;
            }
          });

          // Igazítás a 20px-es rácshoz, ha nincs alakzathoz illeszkedve
          if (newSnapLines.length === 0) {
            nextX = Math.round(nextX / 20) * 20;
            nextY = Math.round(nextY / 20) * 20;
          }
        }

        setSnapLines(newSnapLines);

        setShapes(prev =>
          prev.map(s => {
            if (s.id === selectedShapeId) {
              return {
                ...s,
                x: Math.max(30, Math.min(canvas.width - 30, nextX)),
                y: Math.max(30, Math.min(canvas.height - 30, nextY)),
              };
            }
            return s;
          })
        );
        return;
      }

      // 4. HOVER FOGANTYÚ DETEKTÁLÁS (kurzor változtatáshoz)
      if (selectedShape && !isDragging && !isResizing && !isRotating) {
        const s = selectedShape.size + 10;
        const rotRad = (selectedShape.rotation * Math.PI) / 180;
        const dx = mouseX - selectedShape.x;
        const dy = mouseY - selectedShape.y;
        const localX = dx * Math.cos(-rotRad) - dy * Math.sin(-rotRad);
        const localY = dx * Math.sin(-rotRad) + dy * Math.cos(-rotRad);

        if (Math.hypot(localX - 0, localY - (-s - 24)) <= 18) {
          setHoverHandle('rotate');
        } else if (Math.hypot(localX - (-s), localY - (-s)) <= 20) {
          setHoverHandle('nw');
        } else if (Math.hypot(localX - s, localY - (-s)) <= 20) {
          setHoverHandle('ne');
        } else if (Math.hypot(localX - s, localY - s) <= 20) {
          setHoverHandle('se');
        } else if (Math.hypot(localX - (-s), localY - s) <= 20) {
          setHoverHandle('sw');
        } else if (Math.abs(localX) <= s && Math.abs(localY) <= s) {
          setHoverHandle('body');
        } else {
          setHoverHandle(null);
        }
      }
    } else if (tool === 'drawShape' && shapeDragStart) {
      setShapeDragCurrent({ x: mouseX, y: mouseY });
    } else if (tool === 'customPoly') {
      setPolyCursor({ x: mouseX, y: mouseY });
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
    // 1. Alakzat rajzolás húzással befejezése
    if (tool === 'drawShape' && shapeDragStart && shapeDragCurrent) {
      const dx = shapeDragCurrent.x - shapeDragStart.x;
      const dy = shapeDragCurrent.y - shapeDragStart.y;
      const dist = Math.hypot(dx, dy);

      if (dist >= 15) {
        const cx = Math.round((shapeDragStart.x + shapeDragCurrent.x) / 2);
        const cy = Math.round((shapeDragStart.y + shapeDragCurrent.y) / 2);
        const newShapeSize = Math.max(25, Math.min(220, Math.round(dist / 2)));

        const newShape: PlacedShape = {
          id: Date.now().toString(),
          type: activeDrawShapeType,
          x: cx,
          y: cy,
          size: newShapeSize,
          rotation: 0,
          color: activeColor,
          flipH: false,
          flipV: false,
        };

        const nextShapes = [...shapes, newShape];
        setShapes(nextShapes);
        setSelectedShapeId(newShape.id);
        setTool('select');
        pushSnapshot(nextShapes);

        if (soundEnabled) {
          speakText('Új alakzat sikeresen megrajzolva!');
        }
      }

      setShapeDragStart(null);
      setShapeDragCurrent(null);
    }

    // 2. Vonal befejezése
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
        const nextLines = [...lines, newLine];
        setLines(nextLines);
        pushSnapshot(shapes, nextLines);
        if (soundEnabled) speakText('Él összekötve!');
      }
      setLineStart(null);
      setLinePreview(null);
    }

    // Ha alakzatot mozgattunk, méreteztünk, forgattunk vagy szabadkézzel rajzoltunk/radíroztunk:
    if (isDragging || isResizing || isRotating || isDrawing) {
      pushSnapshot();
    }

    setIsDragging(false);
    setIsResizing(false);
    setIsRotating(false);
    setResizeHandle(null);
    setIsDrawing(false);
    setLastDrawPos(null);
    setSnapLines([]);
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
      offCtx?.clearRect(0, 0, canvasWidth, canvasHeight);
    }
    setShapes([]);
    setLines([]);
    setPolyPoints([]);
    setSelectedShapeId(null);
    pushSnapshot([], [], undefined, undefined, '');
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
    <div className={`content-card ${isStudioFullscreen ? 'studio-fullscreen-card' : ''}`}>
      {/* Fejléc és vezérlő gombok */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>Alakzat Műhely: Szabad Alakzatkészítés & Méretezés</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Mozgasd az alakzatokat egérrel, változtasd meg a méretüket, rajzolj szabadon tetszőleges formákat, és szabd testre a rajzlap méretét!
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Teljes képernyős nézet gomb */}
          <button
            type="button"
            className={isStudioFullscreen ? 'btn-primary' : 'btn-secondary'}
            onClick={toggleFullscreen}
            title={isStudioFullscreen ? 'Kilépés a teljes képernyős módból' : 'Teljes képernyős nézet megnyitása'}
            style={{ padding: '10px 16px', fontSize: '0.95rem', fontWeight: 700 }}
          >
            {isStudioFullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
            <span>{isStudioFullscreen ? 'Kis ablak' : 'Teljes képernyő'}</span>
          </button>

          {/* Mentés BMP formátumban */}
          <button
            type="button"
            className="btn-success attention-pulse"
            onClick={handleSaveBmp}
            style={{ padding: '10px 20px', fontSize: '1rem', fontWeight: 800 }}
            title="Letöltés valódi Windows Paint formátumban (.bmp)"
          >
            <Download size={20} />
            <span>Mentés BMP (.bmp)</span>
          </button>
        </div>
      </div>

      {/* 1. SZABAD ALAKZATOK HOZZÁADÁSA TETSZŐLEGES TÍPUSSAL */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '8px', 
        background: 'var(--bg-surface)', 
        padding: '12px', 
        borderRadius: '12px', 
        border: '1px solid var(--bg-card-border)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--primary)' }}>
            ✨ Válassz vagy rajzolj tetszőleges alakzatot:
          </span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Kattints a hozzáadáshoz, vagy válaszd az "Egérrel Húzás" / "Saját Sokszög" eszközt!
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="shape-chip-btn" onClick={() => addShape('circle')}>
            <CircleIcon size={18} color="#ef4444" />
            <span>Kör</span>
          </button>
          <button type="button" className="shape-chip-btn" onClick={() => addShape('triangle')}>
            <TriangleIcon size={18} color="#3b82f6" />
            <span>Háromszög</span>
          </button>
          <button type="button" className="shape-chip-btn" onClick={() => addShape('rightTriangle')}>
            <span>📐 Derékszögű</span>
          </button>
          <button type="button" className="shape-chip-btn" onClick={() => addShape('square')}>
            <Square size={18} color="#10b981" />
            <span>Négyzet</span>
          </button>
          <button type="button" className="shape-chip-btn" onClick={() => addShape('rectangle')}>
            <span>🟩 Téglalap</span>
          </button>
          <button type="button" className="shape-chip-btn" onClick={() => addShape('rhombus')}>
            <span>🔶 Rombusz</span>
          </button>
          <button type="button" className="shape-chip-btn" onClick={() => addShape('trapezoid')}>
            <span>📐 Trapéz</span>
          </button>
          <button type="button" className="shape-chip-btn" onClick={() => addShape('pentagon')}>
            <span>🛑 Ötszög</span>
          </button>
          <button type="button" className="shape-chip-btn" onClick={() => addShape('hexagon')}>
            <HexagonIcon size={18} color="#8b5cf6" />
            <span>Hatszög</span>
          </button>
          <button type="button" className="shape-chip-btn" onClick={() => addShape('star')}>
            <StarIcon size={18} color="#f59e0b" />
            <span>Csillag</span>
          </button>
          <button type="button" className="shape-chip-btn" onClick={() => addShape('cube')}>
            <span>📦 3D Kocka</span>
          </button>
          <button type="button" className="shape-chip-btn" onClick={() => addShape('pyramid')}>
            <span>🔺 3D Gúla</span>
          </button>
          <button type="button" className="shape-chip-btn" onClick={() => addShape('cylinder')}>
            <span>🛢️ 3D Henger</span>
          </button>
          <button type="button" className="shape-chip-btn" onClick={() => addShape('sphere')}>
            <span>🔮 3D Gömb</span>
          </button>
        </div>
      </div>

      {/* 2. KIJELÖLT ALAKZAT VEZÉRLŐI (MÉRETEZÉS, FORGATÁS, TÜKRÖZÉS) */}
      {selectedShape && tool === 'select' && (
        <div style={{ 
          background: 'linear-gradient(135deg, var(--primary-light) 0%, #eff6ff 100%)', 
          padding: '14px 18px', 
          borderRadius: '14px', 
          border: '2px solid var(--primary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Felső sor: Státusz és műveletek */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>
                Kijelölt alakzat beállításai:
              </span>
              <span style={{ 
                background: 'white', 
                padding: '4px 10px', 
                borderRadius: '8px', 
                fontSize: '0.88rem', 
                fontWeight: 700,
                border: '1px solid #bfdbfe'
              }}>
                Méret: {Math.round(selectedShape.size)}px | Szög: {selectedShape.rotation}° | {selectedShape.flipH ? '↔ Vízszintes ' : ''}{selectedShape.flipV ? '↕ Függőleges' : ''}{!selectedShape.flipH && !selectedShape.flipV ? 'Normál' : ''}
              </span>
            </div>

            {/* Másolás és Törlés */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={duplicateSelected}
                title="Pontos másolat készítése"
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

          {/* Középső sor: MÉRETVEZÉRLŐK (Alakzatok méretének változtatása!) */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            background: 'white', 
            padding: '10px 14px', 
            borderRadius: '10px', 
            border: '1px solid #bfdbfe',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Maximize2 size={18} />
              Alakzat Mérete:
            </span>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => changeSelectedSize(-15)}
              style={{ padding: '6px 12px', fontSize: '0.88rem' }}
              title="Kisebb méret"
            >
              <Minimize2 size={16} />
              <span>− Kisebb</span>
            </button>

            {/* Méret csúszka */}
            <input
              type="range"
              min="25"
              max="240"
              step="5"
              value={selectedShape.size}
              onChange={e => setSelectedSizeDirect(Number(e.target.value))}
              onMouseUp={() => pushSnapshot()}
              onTouchEnd={() => pushSnapshot()}
              className="custom-slider"
              style={{ width: '160px' }}
              title={`Méret: ${Math.round(selectedShape.size)}px`}
            />

            <button
              type="button"
              className="btn-secondary"
              onClick={() => changeSelectedSize(15)}
              style={{ padding: '6px 12px', fontSize: '0.88rem' }}
              title="Nagyobb méret"
            >
              <Maximize2 size={16} />
              <span>+ Nagyobb</span>
            </button>

            {/* Gyorsméret chipek */}
            <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gyors:</span>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => {
                  setSelectedSizeDirect(45);
                  pushSnapshot(shapes.map(s => s.id === selectedShapeId ? { ...s, size: 45 } : s));
                }}
                style={{ padding: '4px 8px', fontSize: '0.82rem' }}
              >
                Kicsi (45px)
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => {
                  setSelectedSizeDirect(75);
                  pushSnapshot(shapes.map(s => s.id === selectedShapeId ? { ...s, size: 75 } : s));
                }}
                style={{ padding: '4px 8px', fontSize: '0.82rem' }}
              >
                Közepes (75px)
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => {
                  setSelectedSizeDirect(125);
                  pushSnapshot(shapes.map(s => s.id === selectedShapeId ? { ...s, size: 125 } : s));
                }}
                style={{ padding: '4px 8px', fontSize: '0.82rem' }}
              >
                Nagy (125px)
              </button>
            </div>
          </div>

          {/* Alsó sor: TÜKRÖZÉS ÉS FORGATÁS */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
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

            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)' }}>Forgatás:</span>

            <button
              type="button"
              className="btn-accent"
              onClick={() => rotateSelected(-60)}
              title="Forgatás balra 60 fokkal"
              style={{ padding: '8px 12px', fontSize: '0.9rem' }}
            >
              <RotateCcw size={17} />
              <span>-60°</span>
            </button>

            <button
              type="button"
              className="btn-accent"
              onClick={() => rotateSelected(60)}
              title="Forgatás jobbra 60 fokkal"
              style={{ padding: '8px 12px', fontSize: '0.9rem' }}
            >
              <RotateCw size={17} />
              <span>+60°</span>
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
                onMouseUp={() => pushSnapshot()}
                onTouchEnd={() => pushSnapshot()}
                className="custom-slider"
                style={{ width: '110px' }}
                title={`Forgatás: ${selectedShape.rotation}°`}
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. ESZKÖZTÁR: VISSZAVONÁS/ÚJRA, MOZGATÁS, ALAKZAT HÚZÁS, SAJÁT SOKSZÖG, ECSET ÉS SZÍNEK */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '12px', 
        background: 'var(--bg-surface)', 
        padding: '10px 16px', 
        borderRadius: '12px', 
        border: '1px solid var(--bg-card-border)' 
      }}>
        {/* Visszavonás és Előre / Mégis (Undo / Redo) */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Visszavonás (Ctrl+Z)"
            style={{ 
              padding: '8px 12px', 
              fontSize: '0.88rem', 
              fontWeight: 700, 
              opacity: historyIndex <= 0 ? 0.4 : 1,
              cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <Undo2 size={17} />
            <span>Vissza</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Mégis / Előre vonás (Ctrl+Y vagy Ctrl+Shift+Z)"
            style={{ 
              padding: '8px 12px', 
              fontSize: '0.88rem', 
              fontWeight: 700, 
              opacity: historyIndex >= history.length - 1 ? 0.4 : 1,
              cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer'
            }}
          >
            <Redo2 size={17} />
            <span>Előre</span>
          </button>
        </div>

        <div style={{ width: '1px', height: '26px', background: 'var(--bg-card-border)' }} />

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Mozgatás & Méretezés eszköz */}
          <button
            type="button"
            className={tool === 'select' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTool('select')}
            title="Alakzatok mozgatása egérrel, kijelölése és méretezése a sarkoknál"
          >
            <MousePointer size={18} />
            <span>Egér Mozgatás & Méretezés</span>
          </button>

          {/* Húzással rajzolás eszköz (Paint stílus) */}
          <button
            type="button"
            className={tool === 'drawShape' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTool('drawShape')}
            title="Kattints a vászonra és húzd az egeret a kívánt méretű alakzathoz!"
          >
            <Maximize2 size={18} />
            <span>Alakzat Húzása Egérrel</span>
          </button>

          {/* Saját sokszög eszköz */}
          <button
            type="button"
            className={tool === 'customPoly' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => {
              setTool('customPoly');
              setPolyPoints([]);
            }}
            title="Kattints pontokat a vásznon és hozz létre egyedi sokszöget!"
          >
            <PenTool size={18} />
            <span>Saját Sokszög Készítő</span>
          </button>

          {/* Élösszekötő Vonal */}
          <button
            type="button"
            className={tool === 'line' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTool('line')}
            title="Élek összekötése egyenessel (Kockához!)"
          >
            <Slash size={18} />
            <span>Vonal</span>
          </button>

          {/* Ecset */}
          <button
            type="button"
            className={tool === 'brush' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTool('brush')}
            title="Szabadkézi ecset"
          >
            <Paintbrush size={18} />
            <span>Ecset</span>
          </button>

          {/* Radír */}
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

        {/* Mágneses illesztés és rács (SNI illesztés segítő) */}
        <button
          type="button"
          className={snapToGrid ? 'btn-accent' : 'btn-secondary'}
          onClick={() => {
            const next = !snapToGrid;
            setSnapToGrid(next);
            if (!next) {
              setSnapLines([]);
            }
            if (soundEnabled) speakText(next ? 'Mágneses alakzat-illesztés bekapcsolva' : 'Mágneses illesztés kikapcsolva, szabad mozgatás');
          }}
          title="Mágnesesen összekapcsolja az alakzatok éleit és sarkait egymással"
          style={{ padding: '8px 14px', fontSize: '0.88rem' }}
        >
          <Magnet size={18} />
          <span>{snapToGrid ? 'Mágneses illesztés: BE' : 'Mágneses illesztés: KI'}</span>
        </button>

        {/* Színpaletta */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Szín:</span>
          {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#0f172a'].map(c => (
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

        {/* Ürítés */}
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

      {/* HA ALAKZAT HÚZÁS MÓD VAN: VÁLASZTHATÓ ALAKZATTÍPUS SÁV */}
      {tool === 'drawShape' && (
        <div style={{ 
          background: 'linear-gradient(90deg, #eff6ff 0%, #ffffff 100%)', 
          padding: '10px 16px', 
          borderRadius: '10px', 
          border: '2px dashed var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, color: 'var(--primary)' }}>Rajzolandó alakzat:</span>
            {(['circle', 'triangle', 'square', 'rectangle', 'hexagon', 'star'] as ShapeType[]).map(st => {
              const names: Record<string, string> = {
                circle: 'Kör',
                triangle: 'Háromszög',
                square: 'Négyzet',
                rectangle: 'Téglalap',
                hexagon: 'Hatszög',
                star: 'Csillag'
              };
              return (
                <button
                  key={st}
                  type="button"
                  className={`btn-secondary ${activeDrawShapeType === st ? 'btn-primary' : ''}`}
                  onClick={() => setActiveDrawShapeType(st)}
                  style={{ padding: '6px 12px', fontSize: '0.88rem' }}
                >
                  <span>{names[st]}</span>
                </button>
              );
            })}
          </div>

          <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            🖱️ Kattints a vászonra, és tartsd lenyomva az egeret a kívánt méretig!
          </span>
        </div>
      )}

      {/* HA SAJÁT SOKSZÖG MÓD VAN: PONTVEZÉRLŐ ÉS LEZÁRÓ GOMB */}
      {tool === 'customPoly' && (
        <div style={{ 
          background: 'linear-gradient(90deg, #ecfdf5 0%, #ffffff 100%)', 
          padding: '10px 16px', 
          borderRadius: '10px', 
          border: '2px solid #10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 800, color: '#047857' }}>
              📐 Saját sokszög rajzolása:
            </span>
            <span style={{ background: 'white', padding: '4px 10px', borderRadius: '8px', fontWeight: 700, border: '1px solid #a7f3d0' }}>
              Rögzített pontok száma: {polyPoints.length}
            </span>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              (Kattints a csúcsok lerakásához!)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-success"
              onClick={finishCustomPolygon}
              disabled={polyPoints.length < 3}
              style={{ padding: '8px 16px', fontWeight: 800 }}
            >
              <Check size={18} />
              <span>Alakzat Lezárása & Létrehozása</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={cancelCustomPolygon}
              style={{ padding: '8px 12px' }}
            >
              <X size={18} />
              <span>Mégse</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. RAJZVÁSZON (CANVAS) ÉS LAPMÉRET VEZÉRLÉS */}
      <div className="paint-window-frame" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
        
        {/* Lapméret információs és beállító sáv */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)' }}>
              📄 Rajzlap Mérete:
            </span>
            <span style={{ 
              background: 'white', 
              padding: '4px 10px', 
              borderRadius: '8px', 
              fontWeight: 700, 
              fontSize: '0.88rem', 
              border: '1px solid var(--bg-card-border)' 
            }}>
              {canvasWidth} × {canvasHeight} px
            </span>

            {/* Méret előbeállítások (Presets) */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn-secondary ${canvasWidth === 700 && canvasHeight === 440 ? 'btn-primary' : ''}`}
                onClick={() => applyCanvasPreset(700, 440, 'Normál (700 × 440)')}
                style={{ padding: '4px 10px', fontSize: '0.82rem' }}
                title="Alapértelmezett lapméret"
              >
                Normál (700×440)
              </button>
              <button
                type="button"
                className={`btn-secondary ${canvasWidth === 880 && canvasHeight === 480 ? 'btn-primary' : ''}`}
                onClick={() => applyCanvasPreset(880, 480, 'Szélesvásznú (880 × 480)')}
                style={{ padding: '4px 10px', fontSize: '0.82rem' }}
                title="Szélesvásznú lapméret"
              >
                Széles (880×480)
              </button>
              <button
                type="button"
                className={`btn-secondary ${canvasWidth === 980 && canvasHeight === 580 ? 'btn-primary' : ''}`}
                onClick={() => applyCanvasPreset(980, 580, 'Nagy rajzlap (980 × 580)')}
                style={{ padding: '4px 10px', fontSize: '0.82rem' }}
                title="Nagy rajzlap tágas alkotáshoz"
              >
                Nagy (980×580)
              </button>
              <button
                type="button"
                className={`btn-secondary ${canvasWidth === 580 && canvasHeight === 580 ? 'btn-primary' : ''}`}
                onClick={() => applyCanvasPreset(580, 580, 'Négyzetes (580 × 580)')}
                style={{ padding: '4px 10px', fontSize: '0.82rem' }}
                title="Négyzetes lapméret"
              >
                Négyzet (580×580)
              </button>
            </div>
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            💡 A lap szélén lévő kis fehér négyzetekkel (fogantyúkkal) egérrel is átméretezheted a rajzlapot!
          </div>
        </div>

        {/* Görgethető munkaterület a lap számára */}
        <div className="canvas-workspace">
          <div className="canvas-sheet-wrapper" style={{ width: canvasWidth, height: canvasHeight }}>
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                display: 'block',
                width: `${canvasWidth}px`,
                height: `${canvasHeight}px`,
                cursor: tool === 'select'
                  ? (isRotating
                    ? 'grabbing'
                    : hoverHandle === 'rotate'
                    ? 'crosshair'
                    : (isResizing && (resizeHandle === 'nw' || resizeHandle === 'se')) || hoverHandle === 'nw' || hoverHandle === 'se'
                    ? 'nwse-resize'
                    : (isResizing && (resizeHandle === 'ne' || resizeHandle === 'sw')) || hoverHandle === 'ne' || hoverHandle === 'sw'
                    ? 'nesw-resize'
                    : isDragging
                    ? 'grabbing'
                    : hoverHandle === 'body'
                    ? 'grab'
                    : 'default')
                  : (tool === 'drawShape' || tool === 'customPoly' || tool === 'line' ? 'crosshair' : 'default'),
                background: '#ffffff',
                touchAction: 'none'
              }}
            />

            {/* Paint stílusú lapméretező fogantyúk */}
            {/* Jobb oldali (kelet) fogantyú */}
            <div
              className="sheet-resize-handle sheet-handle-e"
              onMouseDown={e => handleSheetResizeMouseDown('e', e)}
              title="Lap szélességének változtatása (Jobbra-Balra húzás)"
            />

            {/* Alsó (dél) fogantyú */}
            <div
              className="sheet-resize-handle sheet-handle-s"
              onMouseDown={e => handleSheetResizeMouseDown('s', e)}
              title="Lap magasságának változtatása (Le-Fel húzás)"
            />

            {/* Jobb alsó (sarok) fogantyú */}
            <div
              className="sheet-resize-handle sheet-handle-se"
              onMouseDown={e => handleSheetResizeMouseDown('se', e)}
              title="Lap méretének változtatása mindkét irányban (Sarok húzása)"
            />
          </div>
        </div>

        {tool === 'select' && (
          <div style={{ marginTop: '4px', fontSize: '0.88rem', color: 'var(--primary)', fontWeight: 700 }}>
            💡 <strong>Paint stílusú forgatás & méretezés:</strong> Ragadd meg a felső <strong>kék forgatás ikont (🔄)</strong> az elforgatáshoz! Alapesetben <strong>2°-onként</strong> fordul, a <strong>Shift gombot nyomva tartva</strong> pedig nevezetes szögekre (15°-onként) ugrik! A 4 saroknál pedig átméretezheted!
          </div>
        )}

        {tool === 'drawShape' && (
          <div style={{ marginTop: '4px', fontSize: '0.88rem', color: 'var(--primary)', fontWeight: 700 }}>
            📏 <strong>Húzással alakzatkészítés:</strong> Kattints és húzd az egeret, mint az igazi Paintben! Amikor felengeded, kész a választott alakzat!
          </div>
        )}
      </div>

      {/* Segítség és trükkök */}
      <div className="step-subtext" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <span>
          💡 <strong>Hasznos tudnivalók:</strong>
          <br />
          • <strong>Alakzatok illesztése:</strong> A bekapcsolt mágneses illesztéssel az alakzatok automatikusan egymás éleihez és sarkaihoz ugranak.
          <br />
          • <strong>Méretváltoztatás:</strong> Használd a <strong>+ Nagyobb / − Kisebb</strong> gombokat, a csúszkát, vagy húzd közvetlenül a sarok fogantyúkat az egérrel!
          <br />
          • <strong>Saját alakzatok:</strong> Kattints a <strong>Saját Sokszög Készítő</strong> gombra, kattints le tetszőleges számú pontot, és zárd le a formát!
        </span>
      </div>
    </div>
  );
};
