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
  ArrowRight,
  Maximize2,
  Minimize2,
  Trash2,
  Copy,
  Circle as CircleIcon,
  Square as SquareIcon,
  Triangle as TriangleIcon,
  Star as StarIcon,
  Hexagon as HexagonIcon,
  Layers
} from 'lucide-react';
import { speakText } from '../utils/speech';
import { downloadSvgAsBmp } from '../utils/bmpEncoder';

interface PuzzleTrianglePiece {
  id: number;
  color: string;
  name: string;
  slotIndex: number | null;
  rotation: number;
  trayX: number;
  trayY: number;
}

export type FreeShapeType = 'circle' | 'triangle' | 'square' | 'rectangle' | 'hexagon' | 'rhombus' | 'trapezoid' | 'star';

export interface FreeShapeItem {
  id: string;
  type: FreeShapeType;
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
  flipH?: boolean;
  flipV?: boolean;
}

const initialPuzzlePieces: PuzzleTrianglePiece[] = [
  { id: 1, color: '#3b82f6', name: 'Kék szelet', slotIndex: null, rotation: 0, trayX: 55, trayY: 310 },
  { id: 2, color: '#10b981', name: 'Zöld szelet', slotIndex: null, rotation: 60, trayX: 135, trayY: 310 },
  { id: 3, color: '#f59e0b', name: 'Sárga szelet', slotIndex: null, rotation: 120, trayX: 215, trayY: 310 },
  { id: 4, color: '#ef4444', name: 'Piros szelet', slotIndex: null, rotation: 180, trayX: 295, trayY: 310 },
  { id: 5, color: '#8b5cf6', name: 'Lila szelet', slotIndex: null, rotation: 240, trayX: 375, trayY: 310 },
  { id: 6, color: '#06b6d4', name: 'Cián szelet', slotIndex: null, rotation: 300, trayX: 455, trayY: 310 },
];

export const InteractivePlayground: React.FC<{ soundEnabled: boolean }> = ({ soundEnabled }) => {
  // 3 Fő mód: 'guided' (Vezetett építő), 'puzzle' (Szelet puzzle), 'free' (Szabad illesztő & mozaik)
  const [subMode, setSubMode] = useState<'guided' | 'puzzle' | 'free'>('guided');
  const [activeExercise, setActiveExercise] = useState<'hexagon' | 'cube'>('hexagon');

  // --- 1. VEZETETT ÉPÍTŐ ÁLLAPOTOK (Hatszög & Kocka) ---
  const [hexRadius, setHexRadius] = useState<number>(105);
  const [placedHexSlices, setPlacedHexSlices] = useState<number[]>([0]);
  const [currentSliceRotation, setCurrentSliceRotation] = useState<number>(60);
  const [currentSliceFlipH, setCurrentSliceFlipH] = useState<boolean>(false);
  const [currentSliceFlipV, setCurrentSliceFlipV] = useState<boolean>(false);
  const [currentSliceColor, setCurrentSliceColor] = useState<string>('#10b981');
  const [hexBuiltCompleted, setHexBuiltCompleted] = useState<boolean>(false);

  // Egérrel húzás állapota a hatszög szelethez
  const [isDraggingHexSlice, setIsDraggingHexSlice] = useState<boolean>(false);
  const [hexSliceDragPos, setHexSliceDragPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredHexSlot, setHoveredHexSlot] = useState<number | null>(null);

  // Kocka építő lépések és méret
  const [cubeSize, setCubeSize] = useState<number>(100);
  const [cubeBuildStep, setCubeBuildStep] = useState<number>(1);
  const [cubeBuiltCompleted, setCubeBuiltCompleted] = useState<boolean>(false);
  const [isDraggingCubeSquare, setIsDraggingCubeSquare] = useState<boolean>(false);
  const [cubeSquareDragOffset, setCubeSquareDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // --- 2. PUZZLE ÁLLAPOTOK ---
  const [puzzlePieces, setPuzzlePieces] = useState<PuzzleTrianglePiece[]>(initialPuzzlePieces);
  const [selectedPieceId, setSelectedPieceId] = useState<number | null>(1);
  const [isCubeModePuzzle, setIsCubeModePuzzle] = useState<boolean>(false);
  const [puzzleCompleted, setPuzzleCompleted] = useState<boolean>(false);
  const [draggedPuzzlePieceId, setDraggedPuzzlePieceId] = useState<number | null>(null);
  const [puzzlePieceDragPos, setPuzzlePieceDragPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredPuzzleSlot, setHoveredPuzzleSlot] = useState<number | null>(null);

  // --- 3. SZABAD ALAKZAT-ILLESZTŐ ÁLLAPOTOK (Kör, háromszög, négyszög, hatszög, csillag...) ---
  const [freeShapes, setFreeShapes] = useState<FreeShapeItem[]>([
    { id: 'f1', type: 'triangle', x: 160, y: 140, size: 70, rotation: 0, color: '#3b82f6' },
    { id: 'f2', type: 'square', x: 260, y: 140, size: 65, rotation: 0, color: '#10b981' },
    { id: 'f3', type: 'circle', x: 370, y: 140, size: 45, rotation: 0, color: '#f59e0b' },
  ]);
  const [selectedFreeShapeId, setSelectedFreeShapeId] = useState<string | null>('f1');
  const [isDraggingFreeShape, setIsDraggingFreeShape] = useState<boolean>(false);
  const [isRotatingFreeShape, setIsRotatingFreeShape] = useState<boolean>(false);
  const [isShiftActive, setIsShiftActive] = useState<boolean>(false);
  const [freeDragOffset, setFreeDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [freeActiveColor, setFreeActiveColor] = useState<string>('#3b82f6');
  const [freeSnapGuides, setFreeSnapGuides] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

  // Shift billentyű figyelése nevezetes szögekhez
  React.useEffect(() => {
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

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Geometria a hatszöghöz
  const cx = 260;
  const cy = 165;
  const sliceColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  // Segédfüggvény SVG koordináták lekérésére egér és érintés esetén
  const getSvgCoordinates = (e: React.MouseEvent<SVGSVGElement> | React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 520 / rect.width;
    const scaleY = 360 / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const getSlotPoints = (index: number, r: number = hexRadius, centerX: number = cx, centerY: number = cy) => {
    const angle1 = (index * 60 - 30) * (Math.PI / 180);
    const angle2 = ((index + 1) * 60 - 30) * (Math.PI / 180);

    const x1 = centerX + r * Math.cos(angle1);
    const y1 = centerY + r * Math.sin(angle1);

    const x2 = centerX + r * Math.cos(angle2);
    const y2 = centerY + r * Math.sin(angle2);

    return `${centerX},${centerY} ${x1},${y1} ${x2},${y2}`;
  };

  // ========================================================
  // 1. VEZETETT HATSZÖG ÉPÍTŐ MŰVELETEK (EGÉRREL & GOMBOKKAL)
  // ========================================================
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

  const snapSliceToSlot = (targetSlot: number) => {
    if (placedHexSlices.includes(targetSlot)) {
      if (soundEnabled) speakText('Ez a szelethely már foglalt!');
      return;
    }

    const updated = [...placedHexSlices, targetSlot];
    setPlacedHexSlices(updated);

    // Következő szelet előkészítése
    const nextSlot = (targetSlot + 1) % 6;
    setCurrentSliceRotation(nextSlot * 60);
    setCurrentSliceColor(sliceColors[nextSlot]);

    if (updated.length === 6) {
      setHexBuiltCompleted(true);
      confetti({ particleCount: 110, spread: 85, origin: { y: 0.6 } });
      if (soundEnabled) {
        speakText('Zseniális! Egérrel a helyére illesztetted mind a 6 szeletet, kész a hatszög!');
      }
    } else {
      if (soundEnabled) {
        speakText(`Helyére illesztve! Már ${updated.length} szelet kész a 6-ból.`);
      }
    }
  };

  const handleSnapHexSliceButton = () => {
    const slotIdx = Math.round(currentSliceRotation / 60) % 6;
    snapSliceToSlot(slotIdx);
  };

  const handleResetHexBuilder = () => {
    setPlacedHexSlices([0]);
    setCurrentSliceRotation(60);
    setCurrentSliceFlipH(false);
    setCurrentSliceFlipV(false);
    setCurrentSliceColor(sliceColors[1]);
    setHexBuiltCompleted(false);
    setHexSliceDragPos(null);
    setHoveredHexSlot(null);
    if (soundEnabled) speakText('Hatszög építő újraindítva');
  };

  // ========================================================
  // VEZETETT KOCKA ÉPÍTŐ MŰVELETEK (EGÉRREL ÉS LÉPÉSEKKEL)
  // ========================================================
  const handleNextCubeStep = () => {
    if (cubeBuildStep === 1) {
      setCubeBuildStep(2);
      setCubeSquareDragOffset({ x: 0, y: 0 });
      if (soundEnabled) speakText('2. Lépés: Másold le a négyzetet és told el átlósan az egérrel!');
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
    setCubeSquareDragOffset({ x: 0, y: 0 });
    if (soundEnabled) speakText('Kocka építő újraindítva');
  };

  // ========================================================
  // PUZZLE MŰVELETEK (EGÉRREL DRAG & DROP & FORGATÁS)
  // ========================================================
  const handlePuzzleRotate = () => {
    if (!selectedPieceId) return;
    setPuzzlePieces(prev =>
      prev.map(p => (p.id === selectedPieceId ? { ...p, rotation: (p.rotation + 60) % 360 } : p))
    );
    if (soundEnabled) speakText('Szelet elforgatva 60 fokkal');
  };

  const handleResetPuzzle = () => {
    setPuzzlePieces(initialPuzzlePieces);
    setSelectedPieceId(1);
    setPuzzleCompleted(false);
    setIsCubeModePuzzle(false);
    setDraggedPuzzlePieceId(null);
    setPuzzlePieceDragPos(null);
  };

  const handleAutoSolvePuzzle = () => {
    setPuzzlePieces(prev => prev.map((p, idx) => ({ ...p, slotIndex: idx, rotation: idx * 60 })));
    setPuzzleCompleted(true);
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    if (soundEnabled) speakText('Minden szelet a helyére került!');
  };

  // ========================================================
  // SZABAD ALAKZAT-ILLESZTŐ MŰVELETEK (TETSZŐLEGES ALAKZATOK)
  // ========================================================
  const addFreeShape = (type: FreeShapeType) => {
    const newShape: FreeShapeItem = {
      id: Date.now().toString(),
      type,
      x: 180 + Math.floor(Math.random() * 160),
      y: 120 + Math.floor(Math.random() * 100),
      size: type === 'circle' ? 50 : 65,
      rotation: 0,
      color: freeActiveColor,
    };
    setFreeShapes(prev => [...prev, newShape]);
    setSelectedFreeShapeId(newShape.id);
    if (soundEnabled) {
      const names: Record<FreeShapeType, string> = {
        circle: 'Kör hozzáadva',
        triangle: 'Háromszög hozzáadva',
        square: 'Négyzet hozzáadva',
        rectangle: 'Téglalap hozzáadva',
        hexagon: 'Hatszög hozzáadva',
        rhombus: 'Rombusz hozzáadva',
        trapezoid: 'Trapéz hozzáadva',
        star: 'Csillag hozzáadva',
      };
      speakText(names[type]);
    }
  };

  const selectedFreeShape = freeShapes.find(s => s.id === selectedFreeShapeId);

  const changeFreeShapeSize = (delta: number) => {
    if (!selectedFreeShapeId) return;
    setFreeShapes(prev =>
      prev.map(s => (s.id === selectedFreeShapeId ? { ...s, size: Math.max(25, Math.min(180, s.size + delta)) } : s))
    );
  };

  const setFreeShapeSizeDirect = (val: number) => {
    if (!selectedFreeShapeId) return;
    setFreeShapes(prev =>
      prev.map(s => (s.id === selectedFreeShapeId ? { ...s, size: Math.max(25, Math.min(180, val)) } : s))
    );
  };

  const rotateFreeShape = (deg: number) => {
    if (!selectedFreeShapeId) return;
    setFreeShapes(prev =>
      prev.map(s => (s.id === selectedFreeShapeId ? { ...s, rotation: (s.rotation + deg + 360) % 360 } : s))
    );
  };

  const flipFreeShapeH = () => {
    if (!selectedFreeShapeId) return;
    setFreeShapes(prev =>
      prev.map(s => (s.id === selectedFreeShapeId ? { ...s, flipH: !s.flipH } : s))
    );
  };

  const flipFreeShapeV = () => {
    if (!selectedFreeShapeId) return;
    setFreeShapes(prev =>
      prev.map(s => (s.id === selectedFreeShapeId ? { ...s, flipV: !s.flipV } : s))
    );
  };

  const duplicateFreeShape = () => {
    if (!selectedFreeShape) return;
    const newShape: FreeShapeItem = {
      ...selectedFreeShape,
      id: Date.now().toString(),
      x: Math.min(480, selectedFreeShape.x + 35),
      y: Math.min(320, selectedFreeShape.y + 35),
    };
    setFreeShapes(prev => [...prev, newShape]);
    setSelectedFreeShapeId(newShape.id);
    if (soundEnabled) speakText('Alakzat lemásolva');
  };

  const deleteFreeShape = () => {
    if (!selectedFreeShapeId) return;
    setFreeShapes(prev => prev.filter(s => s.id !== selectedFreeShapeId));
    setSelectedFreeShapeId(null);
    if (soundEnabled) speakText('Alakzat törölve');
  };

  // Sablonok betöltése a szabad építőhöz
  const loadFreeTemplate = (template: 'house' | 'tree' | 'flower' | 'robot' | 'clear') => {
    if (template === 'clear') {
      setFreeShapes([]);
      setSelectedFreeShapeId(null);
      if (soundEnabled) speakText('Vászon kiürítve');
      return;
    }

    if (template === 'house') {
      // Házikó: Négyzet fal, Háromszög tető, Téglalap kémény & ajtó
      setFreeShapes([
        { id: '1', type: 'square', x: 260, y: 220, size: 75, rotation: 0, color: '#f59e0b' },
        { id: '2', type: 'triangle', x: 260, y: 115, size: 85, rotation: 0, color: '#ef4444' },
        { id: '3', type: 'rectangle', x: 260, y: 245, size: 35, rotation: 0, color: '#3b82f6' },
        { id: '4', type: 'circle', x: 260, y: 135, size: 16, rotation: 0, color: '#ffffff' },
      ]);
      setSelectedFreeShapeId('1');
      if (soundEnabled) speakText('Házikó sablon betöltve! Négyzet és háromszög illesztése.');
    } else if (template === 'tree') {
      // Fenyőfa: 3 háromszög egymás felett, téglalap törzs
      setFreeShapes([
        { id: '1', type: 'rectangle', x: 260, y: 270, size: 35, rotation: 0, color: '#78350f' },
        { id: '2', type: 'triangle', x: 260, y: 220, size: 70, rotation: 0, color: '#047857' },
        { id: '3', type: 'triangle', x: 260, y: 165, size: 55, rotation: 0, color: '#059669' },
        { id: '4', type: 'triangle', x: 260, y: 115, size: 40, rotation: 0, color: '#10b981' },
        { id: '5', type: 'star', x: 260, y: 70, size: 24, rotation: 0, color: '#facc15' },
      ]);
      setSelectedFreeShapeId('5');
      if (soundEnabled) speakText('Fenyőfa sablon betöltve!');
    } else if (template === 'flower') {
      // Hatszög virág: 6 színes háromszög összeillesztve
      const flowerSlices: FreeShapeItem[] = [0, 1, 2, 3, 4, 5].map(idx => ({
        id: `fl_${idx}`,
        type: 'triangle',
        x: cx + 45 * Math.cos((idx * 60 + 30) * Math.PI / 180),
        y: cy + 45 * Math.sin((idx * 60 + 30) * Math.PI / 180),
        size: 55,
        rotation: idx * 60 + 180,
        color: sliceColors[idx],
      }));
      setFreeShapes(flowerSlices);
      setSelectedFreeShapeId('fl_0');
      if (soundEnabled) speakText('Hatszög virág sablon betöltve!');
    } else if (template === 'robot') {
      // Robot
      setFreeShapes([
        { id: '1', type: 'square', x: 260, y: 110, size: 45, rotation: 0, color: '#64748b' },
        { id: '2', type: 'circle', x: 242, y: 105, size: 10, rotation: 0, color: '#38bdf8' },
        { id: '3', type: 'circle', x: 278, y: 105, size: 10, rotation: 0, color: '#38bdf8' },
        { id: '4', type: 'rectangle', x: 260, y: 200, size: 75, rotation: 0, color: '#2563eb' },
        { id: '5', type: 'rectangle', x: 235, y: 290, size: 30, rotation: 0, color: '#1e293b' },
        { id: '6', type: 'rectangle', x: 285, y: 290, size: 30, rotation: 0, color: '#1e293b' },
      ]);
      setSelectedFreeShapeId('1');
      if (soundEnabled) speakText('Robot sablon betöltve!');
    }
  };

  // Mentés BMP formátumban
  const handleSaveSvgBmp = (filename: string) => {
    if (svgRef.current) {
      downloadSvgAsBmp(svgRef.current, filename);
      if (soundEnabled) speakText('Sikeres mentés BMP formátumban!');
    }
  };

  // ========================================================
  // EGÉRESEMÉNYEK KEZELÉSE A RAJZVÁSZNON (POINTER EVENTS)
  // ========================================================
  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const coords = getSvgCoordinates(e);

    if (subMode === 'guided') {
      if (activeExercise === 'hexagon') {
        // Ellenőrizzük, hogy a felkészítő háromszögre kattintott-e lent balra
        const prepX = 90;
        const prepY = 290;
        const dist = Math.hypot(coords.x - prepX, coords.y - prepY);
        if (dist <= 45 && !hexBuiltCompleted) {
          setIsDraggingHexSlice(true);
          setHexSliceDragPos(coords);
          (e.target as Element).setPointerCapture?.(e.pointerId);
        }
      } else if (activeExercise === 'cube') {
        // Kocka 2. lépés: hátsó négyzet eltolása egérrel
        if (cubeBuildStep === 2) {
          const frontX = 180;
          const frontY = 160;
          const currentSquareX = frontX + cubeSquareDragOffset.x;
          const currentSquareY = frontY + cubeSquareDragOffset.y;
          if (
            coords.x >= currentSquareX &&
            coords.x <= currentSquareX + cubeSize &&
            coords.y >= currentSquareY &&
            coords.y <= currentSquareY + cubeSize
          ) {
            setIsDraggingCubeSquare(true);
            (e.target as Element).setPointerCapture?.(e.pointerId);
          }
        }
      }
    } else if (subMode === 'puzzle') {
      // Megkeressük, melyik puzzle darabra kattintott a diák
      for (let i = puzzlePieces.length - 1; i >= 0; i--) {
        const piece = puzzlePieces[i];
        let px = piece.trayX;
        let py = piece.trayY;

        if (piece.slotIndex !== null) {
          // Ha már a hatszögben van
          const angle = (piece.slotIndex * 60) * (Math.PI / 180);
          px = cx + hexRadius * 0.55 * Math.cos(angle);
          py = cy + hexRadius * 0.55 * Math.sin(angle);
        }

        const dist = Math.hypot(coords.x - px, coords.y - py);
        if (dist <= 35) {
          setSelectedPieceId(piece.id);
          setDraggedPuzzlePieceId(piece.id);
          setPuzzlePieceDragPos(coords);
          (e.target as Element).setPointerCapture?.(e.pointerId);
          break;
        }
      }
    } else if (subMode === 'free') {
      // 1. Megvizsgáljuk, hogy a kiválasztott alakzat forgatási fogantyújára kattintott-e a tanuló
      if (selectedFreeShape) {
        const sz = selectedFreeShape.size;
        const rotRad = (selectedFreeShape.rotation * Math.PI) / 180;
        const dx = coords.x - selectedFreeShape.x;
        const dy = coords.y - selectedFreeShape.y;
        const localX = dx * Math.cos(-rotRad) - dy * Math.sin(-rotRad);
        const localY = dx * Math.sin(-rotRad) + dy * Math.cos(-rotRad);

        // Forgatási fogantyú felső pontja: (0, -sz - 24)
        if (Math.hypot(localX - 0, localY - (-sz - 24)) <= 18) {
          setIsRotatingFreeShape(true);
          (e.target as Element).setPointerCapture?.(e.pointerId);
          if (soundEnabled) {
            speakText('Forgatás egérrel. 2 fokonként forog, a Shift gombbal 15 fokos nevezetes szögekre ugrik!');
          }
          return;
        }
      }

      // 2. Szabad alakzat kijelölése és mozgatása
      let found: FreeShapeItem | null = null;
      for (let i = freeShapes.length - 1; i >= 0; i--) {
        const s = freeShapes[i];
        const dist = Math.hypot(coords.x - s.x, coords.y - s.y);
        if (dist <= s.size + 10) {
          found = s;
          break;
        }
      }

      if (found) {
        setSelectedFreeShapeId(found.id);
        setIsDraggingFreeShape(true);
        setFreeDragOffset({ x: coords.x - found.x, y: coords.y - found.y });
        (e.target as Element).setPointerCapture?.(e.pointerId);
      } else {
        setSelectedFreeShapeId(null);
      }
    }
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const coords = getSvgCoordinates(e);

    if (subMode === 'guided') {
      if (activeExercise === 'hexagon' && isDraggingHexSlice) {
        setHexSliceDragPos(coords);

        // Kiszámítjuk, hogy a hatszög közepe közelében van-e
        const distToCenter = Math.hypot(coords.x - cx, coords.y - cy);
        if (distToCenter <= hexRadius * 1.35) {
          const angle = ((Math.atan2(coords.y - cy, coords.x - cx) * 180 / Math.PI) + 360) % 360;
          const slot = Math.floor(((angle + 30) % 360) / 60);
          setHoveredHexSlot(slot);
        } else {
          setHoveredHexSlot(null);
        }
      } else if (activeExercise === 'cube' && isDraggingCubeSquare) {
        // Eltolás számítása az egérmozgás alapján
        const targetOffsetX = 60;
        const targetOffsetY = -60;
        const newX = coords.x - 180 - cubeSize / 2;
        const newY = coords.y - 160 - cubeSize / 2;

        setCubeSquareDragOffset({
          x: Math.max(0, Math.min(100, newX)),
          y: Math.max(-100, Math.min(0, newY)),
        });

        // Ha közel van a célhoz, mágneses segítség
        if (Math.hypot(newX - targetOffsetX, newY - targetOffsetY) < 18) {
          setCubeSquareDragOffset({ x: targetOffsetX, y: targetOffsetY });
        }
      }
    } else if (subMode === 'puzzle' && draggedPuzzlePieceId !== null) {
      setPuzzlePieceDragPos(coords);

      const distToCenter = Math.hypot(coords.x - cx, coords.y - cy);
      if (distToCenter <= hexRadius * 1.3) {
        const angle = ((Math.atan2(coords.y - cy, coords.x - cx) * 180 / Math.PI) + 360) % 360;
        const slot = Math.floor(((angle + 30) % 360) / 60);
        setHoveredPuzzleSlot(slot);
      } else {
        setHoveredPuzzleSlot(null);
      }
    } else if (subMode === 'free') {
      // 1. FORGATÁS VÉGREHAJTÁSA EGÉRREL (Paint stílus)
      if (isRotatingFreeShape && selectedFreeShape) {
        const dx = coords.x - selectedFreeShape.x;
        const dy = coords.y - selectedFreeShape.y;
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

        setFreeShapes(prev =>
          prev.map(s => (s.id === selectedFreeShape.id ? { ...s, rotation: newRot } : s))
        );
        return;
      }

      // 2. MOZGATÁS VÉGREHAJTÁSA MÁGNESES ILLESZTÉSSEL
      if (isDraggingFreeShape && selectedFreeShapeId) {
        let nextX = coords.x - freeDragOffset.x;
        let nextY = coords.y - freeDragOffset.y;

        const guides: { x1: number; y1: number; x2: number; y2: number }[] = [];
        const snapThreshold = 18;

        // Mágneses alakzat-illesztés a többi szabad alakzathoz
        freeShapes.forEach(other => {
          if (other.id === selectedFreeShapeId) return;

          // X igazítás
          if (Math.abs(nextX - other.x) < snapThreshold) {
            nextX = other.x;
            guides.push({ x1: other.x, y1: 0, x2: other.x, y2: 360 });
          }
          // Y igazítás
          if (Math.abs(nextY - other.y) < snapThreshold) {
            nextY = other.y;
            guides.push({ x1: 0, y1: other.y, x2: 520, y2: other.y });
          }

          // Érintkező illesztés (pl. négyzet a négyzethez, háromszög a négyzethez)
          const touchDist = other.size + (selectedFreeShape?.size || 0);
          if (Math.abs(nextX - (other.x + touchDist)) < snapThreshold) {
            nextX = other.x + touchDist;
          } else if (Math.abs(nextX - (other.x - touchDist)) < snapThreshold) {
            nextX = other.x - touchDist;
          }
        });

        setFreeSnapGuides(guides);

        setFreeShapes(prev =>
          prev.map(s =>
            s.id === selectedFreeShapeId
              ? { ...s, x: Math.max(30, Math.min(490, nextX)), y: Math.max(30, Math.min(330, nextY)) }
              : s
          )
        );
      }
    }
  };

  const handleSvgPointerUp = () => {
    // 1. Hatszög szelet felengedése
    if (subMode === 'guided' && activeExercise === 'hexagon' && isDraggingHexSlice) {
      if (hoveredHexSlot !== null) {
        snapSliceToSlot(hoveredHexSlot);
      }
      setIsDraggingHexSlice(false);
      setHexSliceDragPos(null);
      setHoveredHexSlot(null);
    }

    // 2. Kocka négyzet felengedése
    if (subMode === 'guided' && activeExercise === 'cube' && isDraggingCubeSquare) {
      setIsDraggingCubeSquare(false);
      // Ha közel van a célhoz (60, -60), automatikusan illesztjük és lépünk
      if (Math.hypot(cubeSquareDragOffset.x - 60, cubeSquareDragOffset.y - (-60)) < 25) {
        setCubeSquareDragOffset({ x: 60, y: -60 });
        handleNextCubeStep();
      }
    }

    // 3. Puzzle darab felengedése
    if (subMode === 'puzzle' && draggedPuzzlePieceId !== null) {
      if (hoveredPuzzleSlot !== null) {
        const targetSlot = hoveredPuzzleSlot;
        const existing = puzzlePieces.find(p => p.slotIndex === targetSlot);

        setPuzzlePieces(prev => {
          const updated = prev.map(p => {
            if (p.id === existing?.id) return { ...p, slotIndex: null };
            if (p.id === draggedPuzzlePieceId) return { ...p, slotIndex: targetSlot, rotation: targetSlot * 60 };
            return p;
          });

          if (updated.every(p => p.slotIndex !== null)) {
            setPuzzleCompleted(true);
            confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
            if (soundEnabled) speakText('Bravó! Egérrel a helyére illesztetted a teljes puzzle-t!');
          } else {
            if (soundEnabled) speakText(`Szelet a helyére húzva a ${targetSlot + 1}. helyre!`);
          }
          return updated;
        });
      } else {
        setPuzzlePieces(prev =>
          prev.map(p => (p.id === draggedPuzzlePieceId ? { ...p, slotIndex: null } : p))
        );
      }

      setDraggedPuzzlePieceId(null);
      setPuzzlePieceDragPos(null);
      setHoveredPuzzleSlot(null);
    }

    // 4. Szabad alakzat felengedése
    if (subMode === 'free') {
      setIsDraggingFreeShape(false);
      setIsRotatingFreeShape(false);
      setFreeSnapGuides([]);
    }
  };

  return (
    <div className="content-card">
      {/* Fejléc és Fő Módválasztó gombok */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>Próbáld ki Te is! – Alakzat-illesztés & Méretezés</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Húzd az alakzatokat egérrel, változtasd a méretüket, vagy alkoss szabadon tetszőleges idomokból!
          </p>
        </div>

        {/* 3 Mód fülei */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-surface)', padding: '6px', borderRadius: '12px', border: '1px solid var(--bg-card-border)', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={subMode === 'guided' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setSubMode('guided')}
            style={{ padding: '8px 14px', fontSize: '0.9rem' }}
          >
            <Sparkles size={17} />
            <span>1. Vezetett Építő</span>
          </button>

          <button
            type="button"
            className={subMode === 'puzzle' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setSubMode('puzzle')}
            style={{ padding: '8px 14px', fontSize: '0.9rem' }}
          >
            <Shapes size={17} />
            <span>2. Szelet-Puzzle</span>
          </button>

          <button
            type="button"
            className={subMode === 'free' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setSubMode('free')}
            style={{ padding: '8px 14px', fontSize: '0.9rem' }}
          >
            <Layers size={17} />
            <span>3. Szabad Alakzat-illesztő</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. MÓD: VEZETETT ÉPÍTŐ (HATSZÖG & KOCKA EGÉRREL)        */}
      {/* ======================================================== */}
      {subMode === 'guided' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
          {/* Gyakorlat választó fülek */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className={activeExercise === 'hexagon' ? 'btn-accent' : 'btn-secondary'}
              onClick={() => setActiveExercise('hexagon')}
              style={{ fontWeight: 800 }}
            >
              <Shapes size={20} />
              <span>Hatszög Építése (Egérrel a helyére húzva)</span>
            </button>

            <button
              type="button"
              className={activeExercise === 'cube' ? 'btn-accent' : 'btn-secondary'}
              onClick={() => setActiveExercise('cube')}
              style={{ fontWeight: 800 }}
            >
              <Box size={20} />
              <span>3D Kocka Építése (Másolás & Átlós Húzás)</span>
            </button>
          </div>

          {/* --- HATSZÖG ÉPÍTŐ --- */}
          {activeExercise === 'hexagon' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {hexBuiltCompleted && (
                <div className="success-banner">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CheckCircle2 size={32} />
                    <div>
                      <strong style={{ fontSize: '1.2rem' }}>Fantasztikus! Egérrel felépítetted a teljes hatszöget!</strong>
                      <div style={{ fontSize: '0.95rem' }}>
                        6 db 60°-os háromszögből összeállt a 360°-os teljes szabályos alakzat!
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-success"
                      onClick={() => handleSaveSvgBmp('kesz_hatszog_illesztes.bmp')}
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

              {/* Vezérlő és Méret panel */}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>
                    Alakzat állása:
                  </span>
                  <span style={{ background: 'white', padding: '6px 12px', borderRadius: '8px', fontWeight: 800, border: '1px solid #bfdbfe' }}>
                    Szög: {currentSliceRotation}° | Tükrözés: {currentSliceFlipH ? '↔' : ''}{currentSliceFlipV ? '↕' : ''}{!currentSliceFlipH && !currentSliceFlipV ? 'Normál' : ''}
                  </span>

                  {/* Méret csúszka a hatszöghöz */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '4px 10px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Méret:</span>
                    <button type="button" className="btn-secondary" onClick={() => setHexRadius(r => Math.max(60, r - 10))} style={{ padding: '2px 8px', minHeight: '30px' }}>
                      <Minimize2 size={14} />
                    </button>
                    <input
                      type="range"
                      min="60"
                      max="140"
                      value={hexRadius}
                      onChange={e => setHexRadius(Number(e.target.value))}
                      className="custom-slider"
                      style={{ width: '90px' }}
                      title={`Hatszög mérete: ${hexRadius}px`}
                    />
                    <button type="button" className="btn-secondary" onClick={() => setHexRadius(r => Math.min(140, r + 10))} style={{ padding: '2px 8px', minHeight: '30px' }}>
                      <Maximize2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Forgató és tükröző gombok */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button type="button" className="btn-secondary" onClick={handleHexFlipH} title="Vízszintes tükrözés" style={{ padding: '8px 12px' }}>
                    <FlipHorizontal size={18} />
                    <span>↔ Tükrözés</span>
                  </button>

                  <button type="button" className="btn-secondary" onClick={handleHexFlipV} title="Függőleges tükrözés" style={{ padding: '8px 12px' }}>
                    <FlipVertical size={18} />
                    <span>↕ Tükrözés</span>
                  </button>

                  <button type="button" className="btn-accent" onClick={() => handleHexRotate(-60)} style={{ padding: '8px 12px' }}>
                    <RotateCcw size={18} />
                    <span>-60°</span>
                  </button>

                  <button type="button" className="btn-accent" onClick={() => handleHexRotate(60)} style={{ padding: '8px 12px' }}>
                    <RotateCw size={18} />
                    <span>+60°</span>
                  </button>

                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSnapHexSliceButton}
                    disabled={hexBuiltCompleted}
                    style={{ padding: '8px 16px', fontWeight: 800 }}
                  >
                    <Magnet size={18} />
                    <span>Illesztés gombbal</span>
                  </button>
                </div>
              </div>

              {/* Hatszög Építő Rajzvászon (SVG egérvezérléssel) */}
              <div className="paint-window-frame" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>
                <svg
                  ref={svgRef}
                  width="520"
                  height="360"
                  viewBox="0 0 520 360"
                  onPointerDown={handleSvgPointerDown}
                  onPointerMove={handleSvgPointerMove}
                  onPointerUp={handleSvgPointerUp}
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    background: '#ffffff',
                    borderRadius: '8px',
                    touchAction: 'none',
                    cursor: isDraggingHexSlice ? 'grabbing' : 'default',
                  }}
                >
                  {/* Belső rácsvonalak */}
                  <line x1="0" y1={cy} x2="520" y2={cy} stroke="#f1f5f9" strokeWidth="1" />
                  <line x1={cx} y1="0" x2={cx} y2="360" stroke="#f1f5f9" strokeWidth="1" />

                  {/* 6 lehetséges slot kirajzolása */}
                  {[0, 1, 2, 3, 4, 5].map(idx => {
                    const isPlaced = placedHexSlices.includes(idx);
                    const isHovered = hoveredHexSlot === idx && !isPlaced;

                    return (
                      <polygon
                        key={idx}
                        points={getSlotPoints(idx, hexRadius, cx, cy)}
                        fill={isPlaced ? sliceColors[idx] : (isHovered ? 'rgba(16, 185, 129, 0.25)' : '#f8fafc')}
                        stroke={isPlaced ? '#ffffff' : (isHovered ? '#10b981' : '#cbd5e1')}
                        strokeWidth={isPlaced ? '2.5' : (isHovered ? '3.5' : '1.5')}
                        strokeDasharray={isPlaced ? 'none' : '4,4'}
                      />
                    );
                  })}

                  {/* Mágneses körvonal */}
                  <circle cx={cx} cy={cy} r={hexRadius} fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2,4" />

                  {/* Felkészítő talapzat lent balra (ahol a háromszög egérrel megfogható) */}
                  {!hexBuiltCompleted && (
                    <g transform="translate(90, 290)">
                      <circle cx="0" cy="0" r="42" fill="#eff6ff" stroke="#93c5fd" strokeWidth="2" strokeDasharray="3,3" />
                      <text x="0" y="-48" textAnchor="middle" fontSize="11" fontWeight="800" fill="#1e40af">
                        🖱️ Fogd meg és húzd a helyére!
                      </text>

                      {/* Statikus nézet, ha épp nem húzzuk */}
                      {!isDraggingHexSlice && (
                        <g 
                          className="draggable-hover"
                          transform={`rotate(${currentSliceRotation}) scale(${currentSliceFlipH ? -1 : 1}, ${currentSliceFlipV ? -1 : 1})`}
                          style={{ cursor: 'grab' }}
                        >
                          <polygon
                            points={`0,0 ${hexRadius * 0.5 * Math.cos(-Math.PI / 6)},${hexRadius * 0.5 * Math.sin(-Math.PI / 6)} ${hexRadius * 0.5 * Math.cos(Math.PI / 6)},${hexRadius * 0.5 * Math.sin(Math.PI / 6)}`}
                            fill={currentSliceColor}
                            stroke="#0f172a"
                            strokeWidth="2.5"
                          />
                          <circle cx="0" cy="0" r="4" fill="#ffffff" />
                        </g>
                      )}
                    </g>
                  )}

                  {/* Éppen egérrel húzott háromszög */}
                  {isDraggingHexSlice && hexSliceDragPos && (
                    <g 
                      transform={`translate(${hexSliceDragPos.x}, ${hexSliceDragPos.y}) rotate(${currentSliceRotation}) scale(${currentSliceFlipH ? -1 : 1}, ${currentSliceFlipV ? -1 : 1})`}
                      style={{ pointerEvents: 'none', filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.3))' }}
                    >
                      <polygon
                        points={`0,0 ${hexRadius * 0.5 * Math.cos(-Math.PI / 6)},${hexRadius * 0.5 * Math.sin(-Math.PI / 6)} ${hexRadius * 0.5 * Math.cos(Math.PI / 6)},${hexRadius * 0.5 * Math.sin(Math.PI / 6)}`}
                        fill={currentSliceColor}
                        stroke="#0f172a"
                        strokeWidth="3"
                      />
                      <circle cx="0" cy="0" r="5" fill="#ffffff" />
                    </g>
                  )}

                  {/* Középpont */}
                  <circle cx={cx} cy={cy} r="6" fill="#0f172a" />
                </svg>

                <div style={{ marginTop: '10px', fontSize: '0.92rem', color: 'var(--text-muted)' }}>
                  💡 <strong>Egérrel való illesztés:</strong> Fogd meg bal gombbal a bal alsó háromszöget, húzd a hatszög egyik szeletére, és engedd fel az egeret! A <strong>Méret</strong> csúszkával bármikor átméretezheted!
                </div>
              </div>
            </div>
          )}

          {/* --- 3D KOCKA ÉPÍTŐ --- */}
          {activeExercise === 'cube' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cubeBuiltCompleted && (
                <div className="success-banner">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CheckCircle2 size={32} />
                    <div>
                      <strong style={{ fontSize: '1.2rem' }}>Kész a Térbeli Kocka!</strong>
                      <div style={{ fontSize: '0.95rem' }}>
                        Két négyzet átlós eltolásával és az élek összekötésével megalkottad a 3D kockát!
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn-success" onClick={() => handleSaveSvgBmp('kesz_kocka.bmp')}>
                      <Download size={18} />
                      <span>Mentés BMP-be</span>
                    </button>
                    <button type="button" className="btn-secondary" onClick={handleResetCubeBuilder}>
                      <RefreshCw size={18} />
                      <span>Újra</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Lépések & Méret csík */}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, color: 'var(--primary)' }}>Aktuális lépés ({cubeBuildStep}/4):</span>
                  <span style={{ fontWeight: 700 }}>
                    {cubeBuildStep === 1 && '1. Lépés: Előlap négyzet megrajzolása'}
                    {cubeBuildStep === 2 && '2. Lépés: Másold le és told el átlósan az egérrel (Hátsó lap)'}
                    {cubeBuildStep === 3 && '3. Lépés: A 4 csúcs összekötése élekkel'}
                    {cubeBuildStep === 4 && '4. Lépés: Fény-árnyék kitöltés színezéssel (Kész!)'}
                  </span>

                  {/* Kocka méret csúszka */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', padding: '4px 10px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Méret:</span>
                    <button type="button" className="btn-secondary" onClick={() => setCubeSize(s => Math.max(60, s - 10))} style={{ padding: '2px 6px', minHeight: '28px' }}>
                      <Minimize2 size={13} />
                    </button>
                    <input
                      type="range"
                      min="60"
                      max="140"
                      value={cubeSize}
                      onChange={e => setCubeSize(Number(e.target.value))}
                      className="custom-slider"
                      style={{ width: '80px' }}
                      title={`Kocka mérete: ${cubeSize}px`}
                    />
                    <button type="button" className="btn-secondary" onClick={() => setCubeSize(s => Math.min(140, s + 10))} style={{ padding: '2px 6px', minHeight: '28px' }}>
                      <Maximize2 size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {cubeBuildStep < 4 ? (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleNextCubeStep}
                      style={{ fontWeight: 800 }}
                    >
                      <span>Következő lépés</span>
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

              {/* Kocka Vászon (SVG) */}
              <div className="paint-window-frame" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>
                <svg
                  ref={svgRef}
                  width="520"
                  height="360"
                  viewBox="0 0 520 360"
                  onPointerDown={handleSvgPointerDown}
                  onPointerMove={handleSvgPointerMove}
                  onPointerUp={handleSvgPointerUp}
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    background: '#ffffff',
                    borderRadius: '8px',
                    touchAction: 'none',
                    cursor: cubeBuildStep === 2 && isDraggingCubeSquare ? 'grabbing' : 'default',
                  }}
                >
                  {/* Koordináták */}
                  {(() => {
                    const frontX = 180;
                    const frontY = 160;
                    const backX = cubeBuildStep === 2 ? frontX + cubeSquareDragOffset.x : frontX + 60;
                    const backY = cubeBuildStep === 2 ? frontY + cubeSquareDragOffset.y : frontY - 60;

                    return (
                      <>
                        {/* 4. Lépés: Árnyékolt lapok */}
                        {cubeBuildStep >= 4 && (
                          <>
                            {/* Felső lap */}
                            <polygon
                              points={`${frontX},${frontY} ${backX},${backY} ${backX + cubeSize},${backY} ${frontX + cubeSize},${frontY}`}
                              fill="#93c5fd"
                              stroke="#0f172a"
                              strokeWidth="2.5"
                            />
                            {/* Jobb oldali lap */}
                            <polygon
                              points={`${frontX + cubeSize},${frontY} ${backX + cubeSize},${backY} ${backX + cubeSize},${backY + cubeSize} ${frontX + cubeSize},${frontY + cubeSize}`}
                              fill="#1d4ed8"
                              stroke="#0f172a"
                              strokeWidth="2.5"
                            />
                          </>
                        )}

                        {/* 2. Lépés: Második négyzet (hátsó lap) */}
                        {cubeBuildStep >= 2 && (
                          <rect
                            x={backX}
                            y={backY}
                            width={cubeSize}
                            height={cubeSize}
                            fill={cubeBuildStep >= 4 ? 'transparent' : 'rgba(37, 99, 235, 0.15)'}
                            stroke="#2563eb"
                            strokeWidth="2.5"
                            strokeDasharray={cubeBuildStep === 2 ? '4,4' : 'none'}
                            style={{ cursor: cubeBuildStep === 2 ? 'grab' : 'default' }}
                          />
                        )}

                        {/* 3. Lépés: Összekötő élek */}
                        {cubeBuildStep >= 3 && (
                          <>
                            <line x1={frontX} y1={frontY} x2={backX} y2={backY} stroke="#0f172a" strokeWidth="2.5" />
                            <line x1={frontX + cubeSize} y1={frontY} x2={backX + cubeSize} y2={backY} stroke="#0f172a" strokeWidth="2.5" />
                            <line x1={frontX + cubeSize} y1={frontY + cubeSize} x2={backX + cubeSize} y2={backY + cubeSize} stroke="#0f172a" strokeWidth="2.5" />
                            <line x1={frontX} y1={frontY + cubeSize} x2={backX} y2={backY + cubeSize} stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,4" />
                          </>
                        )}

                        {/* 1. Lépés: Első négyzet (előlap) */}
                        {cubeBuildStep >= 1 && (
                          <rect
                            x={frontX}
                            y={frontY}
                            width={cubeSize}
                            height={cubeSize}
                            fill={cubeBuildStep >= 4 ? '#3b82f6' : 'rgba(59, 130, 246, 0.2)'}
                            stroke="#0f172a"
                            strokeWidth="2.5"
                          />
                        )}

                        {/* Cél jelölő a 2. lépésnél */}
                        {cubeBuildStep === 2 && (
                          <g>
                            <rect
                              x={frontX + 60}
                              y={frontY - 60}
                              width={cubeSize}
                              height={cubeSize}
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="2"
                              strokeDasharray="4,4"
                            />
                            <text x={frontX + 60 + cubeSize / 2} y={frontY - 70} textAnchor="middle" fontSize="11" fontWeight="800" fill="#059669">
                              🎯 Cél: Ide húzd az eltolt négyzetet!
                            </text>
                          </g>
                        )}
                      </>
                    );
                  })()}
                </svg>

                <div style={{ marginTop: '10px', fontSize: '0.92rem', color: 'var(--text-muted)' }}>
                  💡 <strong>Kocka trükk:</strong> A 2. lépésben ragadd meg a négyzetet az egérrel, és húzd átlósan felfelé a zöld keretbe!
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MÓD: SZELET-ILLESZTŐ PUZZLE (DRAG & DROP EGÉRREL)     */}
      {/* ======================================================== */}
      {subMode === 'puzzle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                Ragadd meg a háromszögeket az egérrel, és húzd őket a hatszög üres helyeire!
              </span>

              {/* Méret csúszka */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', padding: '4px 10px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Méret:</span>
                <button type="button" className="btn-secondary" onClick={() => setHexRadius(r => Math.max(70, r - 10))} style={{ padding: '2px 6px', minHeight: '28px' }}>
                  <Minimize2 size={13} />
                </button>
                <input
                  type="range"
                  min="70"
                  max="135"
                  value={hexRadius}
                  onChange={e => setHexRadius(Number(e.target.value))}
                  className="custom-slider"
                  style={{ width: '80px' }}
                />
                <button type="button" className="btn-secondary" onClick={() => setHexRadius(r => Math.min(135, r + 10))} style={{ padding: '2px 6px', minHeight: '28px' }}>
                  <Maximize2 size={13} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn-secondary" onClick={handleResetPuzzle}>
                <RefreshCw size={17} />
                <span>Újrakezdés</span>
              </button>
              <button type="button" className="btn-secondary" onClick={handleAutoSolvePuzzle}>
                <Sparkles size={17} />
                <span>Megoldás</span>
              </button>
            </div>
          </div>

          {/* Sikerüzenet */}
          {puzzleCompleted && (
            <div className="success-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={32} />
                <div>
                  <strong style={{ fontSize: '1.2rem' }}>Szuper vagy! Sikeresen kiraktad a hatszöget!</strong>
                  <div style={{ fontSize: '0.95rem' }}>Próbáld ki a 3D Kocka nézetet is!</div>
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

          {/* Puzzle Vászon (Drag & Drop) */}
          <div className="paint-window-frame" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>
            <svg
              ref={svgRef}
              width="500"
              height="360"
              viewBox="0 0 520 360"
              onPointerDown={handleSvgPointerDown}
              onPointerMove={handleSvgPointerMove}
              onPointerUp={handleSvgPointerUp}
              style={{
                maxWidth: '100%',
                height: 'auto',
                background: '#ffffff',
                borderRadius: '8px',
                touchAction: 'none',
                cursor: draggedPuzzlePieceId !== null ? 'grabbing' : 'default',
              }}
            >
              {/* 6 Puzzle slot */}
              {[0, 1, 2, 3, 4, 5].map(slotIdx => {
                const placed = puzzlePieces.find(p => p.slotIndex === slotIdx);
                const isFilled = !!placed;
                const isHovered = hoveredPuzzleSlot === slotIdx && !isFilled;

                let fill = '#f8fafc';
                if (isFilled) {
                  if (isCubeModePuzzle) {
                    fill = slotIdx === 0 || slotIdx === 5 ? '#93c5fd' : (slotIdx === 1 || slotIdx === 2 ? '#1d4ed8' : '#3b82f6');
                  } else {
                    fill = placed.color;
                  }
                } else if (isHovered) {
                  fill = 'rgba(16, 185, 129, 0.3)';
                }

                return (
                  <g key={slotIdx} style={{ cursor: isFilled ? 'grab' : 'pointer' }}>
                    <polygon
                      points={getSlotPoints(slotIdx, hexRadius, cx, cy)}
                      fill={fill}
                      stroke={isFilled ? '#ffffff' : (isHovered ? '#10b981' : '#94a3b8')}
                      strokeWidth={isFilled ? '3' : (isHovered ? '3.5' : '1.5')}
                      strokeDasharray={isFilled ? 'none' : '4,4'}
                    />
                    {!isFilled && (
                      <text
                        x={cx + (hexRadius * 0.55) * Math.cos((slotIdx * 60) * (Math.PI / 180))}
                        y={cy + (hexRadius * 0.55) * Math.sin((slotIdx * 60) * (Math.PI / 180))}
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

              {/* Alsó tálca vonala */}
              <line x1="30" y1="260" x2="490" y2="260" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4,4" />
              <text x="260" y="278" textAnchor="middle" fontSize="12" fontWeight="700" fill="#64748b">
                Háromszög készlet (fogd meg az egérrel és húzd a hatszögbe!):
              </text>

              {/* Tálcán lévő háromszögek */}
              {puzzlePieces.map(piece => {
                if (piece.slotIndex !== null && piece.id !== draggedPuzzlePieceId) {
                  return null; // már a hatszögben van kirajzolva
                }

                const isBeingDragged = piece.id === draggedPuzzlePieceId;
                const posX = isBeingDragged && puzzlePieceDragPos ? puzzlePieceDragPos.x : piece.trayX;
                const posY = isBeingDragged && puzzlePieceDragPos ? puzzlePieceDragPos.y : piece.trayY;
                const isSelected = piece.id === selectedPieceId;

                return (
                  <g
                    key={piece.id}
                    className="draggable-hover"
                    transform={`translate(${posX}, ${posY}) rotate(${piece.rotation})`}
                    style={{
                      cursor: isBeingDragged ? 'grabbing' : 'grab',
                      filter: isBeingDragged ? 'drop-shadow(0 6px 14px rgba(0,0,0,0.3))' : 'none',
                    }}
                  >
                    <polygon
                      points={`0,0 ${hexRadius * 0.45 * Math.cos(-Math.PI / 6)},${hexRadius * 0.45 * Math.sin(-Math.PI / 6)} ${hexRadius * 0.45 * Math.cos(Math.PI / 6)},${hexRadius * 0.45 * Math.sin(Math.PI / 6)}`}
                      fill={piece.color}
                      stroke={isSelected ? '#0f172a' : '#ffffff'}
                      strokeWidth={isSelected ? '3' : '1.5'}
                    />
                    <circle cx="0" cy="0" r="3" fill="#ffffff" />
                  </g>
                );
              })}
            </svg>

            {/* Forgatás gomb a kijelölt szelethez */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn-accent"
                onClick={handlePuzzleRotate}
                title="Forgatás 60 fokkal"
              >
                <RotateCw size={18} />
                <span>Kijelölt szelet forgatása (+60°)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MÓD: SZABAD ALAKZAT-ILLESZTŐ (TETSZŐLEGES ALAKZATOK)  */}
      {/* ======================================================== */}
      {subMode === 'free' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
          {/* Sablonok és alakzatválasztó panel */}
          <div style={{ 
            background: 'var(--bg-surface)', 
            padding: '12px 16px', 
            borderRadius: '12px', 
            border: '1px solid var(--bg-card-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem' }}>
                Új alakzat készítése és lerakása:
              </span>

              {/* Sablon gombok */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Ötlet-sablonok:</span>
                <button type="button" className="btn-secondary" onClick={() => loadFreeTemplate('house')} style={{ padding: '4px 10px', fontSize: '0.85rem' }}>
                  🏠 Házikó
                </button>
                <button type="button" className="btn-secondary" onClick={() => loadFreeTemplate('tree')} style={{ padding: '4px 10px', fontSize: '0.85rem' }}>
                  🌲 Fenyőfa
                </button>
                <button type="button" className="btn-secondary" onClick={() => loadFreeTemplate('flower')} style={{ padding: '4px 10px', fontSize: '0.85rem' }}>
                  🌸 Hatszög Virág
                </button>
                <button type="button" className="btn-secondary" onClick={() => loadFreeTemplate('robot')} style={{ padding: '4px 10px', fontSize: '0.85rem' }}>
                  🤖 Robot
                </button>
                <button type="button" className="btn-secondary" onClick={() => loadFreeTemplate('clear')} style={{ padding: '4px 10px', fontSize: '0.85rem', color: '#ef4444' }}>
                  <Trash2 size={14} />
                  <span>Ürítés</span>
                </button>
              </div>
            </div>

            {/* Tetszőleges alakzatok gombjai */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" className="shape-chip-btn" onClick={() => addFreeShape('circle')}>
                <CircleIcon size={18} color="#ef4444" />
                <span>Kör</span>
              </button>
              <button type="button" className="shape-chip-btn" onClick={() => addFreeShape('triangle')}>
                <TriangleIcon size={18} color="#3b82f6" />
                <span>Háromszög</span>
              </button>
              <button type="button" className="shape-chip-btn" onClick={() => addFreeShape('square')}>
                <SquareIcon size={18} color="#10b981" />
                <span>Négyzet</span>
              </button>
              <button type="button" className="shape-chip-btn" onClick={() => addFreeShape('rectangle')}>
                <span>🟩 Téglalap</span>
              </button>
              <button type="button" className="shape-chip-btn" onClick={() => addFreeShape('hexagon')}>
                <HexagonIcon size={18} color="#8b5cf6" />
                <span>Hatszög</span>
              </button>
              <button type="button" className="shape-chip-btn" onClick={() => addFreeShape('rhombus')}>
                <span>🔶 Rombusz</span>
              </button>
              <button type="button" className="shape-chip-btn" onClick={() => addFreeShape('trapezoid')}>
                <span>📐 Trapéz</span>
              </button>
              <button type="button" className="shape-chip-btn" onClick={() => addFreeShape('star')}>
                <StarIcon size={18} color="#f59e0b" />
                <span>Csillag</span>
              </button>

              {/* Színválasztó chipek */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: 'auto' }}>
                {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setFreeActiveColor(c);
                      if (selectedFreeShapeId) {
                        setFreeShapes(prev => prev.map(s => s.id === selectedFreeShapeId ? { ...s, color: c } : s));
                      }
                    }}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: c,
                      border: freeActiveColor === c ? '3px solid #0f172a' : '2px solid white',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Kijelölt alakzat Méret, Forgatás és Tükrözés vezérlői */}
          {selectedFreeShape && (
            <div style={{ 
              background: 'linear-gradient(135deg, var(--primary-light) 0%, #eff6ff 100%)', 
              padding: '12px 18px', 
              borderRadius: '12px', 
              border: '2px solid var(--primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontWeight: 800, color: 'var(--primary)' }}>
                  Kijelölt alakzat beállításai:
                </span>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn-primary" onClick={duplicateFreeShape} style={{ padding: '6px 12px', fontSize: '0.88rem' }}>
                    <Copy size={16} />
                    <span>Másolás</span>
                  </button>
                  <button type="button" className="btn-secondary" onClick={deleteFreeShape} style={{ color: '#ef4444', padding: '6px 12px', fontSize: '0.88rem' }}>
                    <Trash2 size={16} />
                    <span>Törlés</span>
                  </button>
                </div>
              </div>

              {/* Méret csúszka és gombok */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid #bfdbfe', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e3a8a' }}>Méret:</span>
                <button type="button" className="btn-secondary" onClick={() => changeFreeShapeSize(-15)} style={{ padding: '4px 10px' }}>
                  <Minimize2 size={16} />
                  <span>− Kisebb</span>
                </button>
                <input
                  type="range"
                  min="25"
                  max="180"
                  value={selectedFreeShape.size}
                  onChange={e => setFreeShapeSizeDirect(Number(e.target.value))}
                  className="custom-slider"
                  style={{ width: '140px' }}
                />
                <button type="button" className="btn-secondary" onClick={() => changeFreeShapeSize(15)} style={{ padding: '4px 10px' }}>
                  <Maximize2 size={16} />
                  <span>+ Nagyobb</span>
                </button>

                <div style={{ width: '1px', height: '24px', background: '#cbd5e1', margin: '0 4px' }} />

                {/* Forgatás & Tükrözés */}
                <button type="button" className="btn-secondary" onClick={flipFreeShapeH} style={{ padding: '6px 10px', fontSize: '0.85rem' }}>
                  <FlipHorizontal size={16} />
                  <span>↔ Tükrözés</span>
                </button>
                <button type="button" className="btn-secondary" onClick={flipFreeShapeV} style={{ padding: '6px 10px', fontSize: '0.85rem' }}>
                  <FlipVertical size={16} />
                  <span>↕ Tükrözés</span>
                </button>
                <button type="button" className="btn-accent" onClick={() => rotateFreeShape(-45)} style={{ padding: '6px 10px', fontSize: '0.85rem' }}>
                  <RotateCcw size={16} />
                  <span>-45°</span>
                </button>
                <button type="button" className="btn-accent" onClick={() => rotateFreeShape(45)} style={{ padding: '6px 10px', fontSize: '0.85rem' }}>
                  <RotateCw size={16} />
                  <span>+45°</span>
                </button>
                <button type="button" className="btn-accent" onClick={() => rotateFreeShape(60)} style={{ padding: '6px 10px', fontSize: '0.85rem' }}>
                  <RotateCw size={16} />
                  <span>+60°</span>
                </button>
              </div>
            </div>
          )}

          {/* Szabad Rajzvászon (SVG egérvezérléssel & Mágneses illesztéssel) */}
          <div className="paint-window-frame" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>
            <svg
              ref={svgRef}
              width="520"
              height="360"
              viewBox="0 0 520 360"
              onPointerDown={handleSvgPointerDown}
              onPointerMove={handleSvgPointerMove}
              onPointerUp={handleSvgPointerUp}
              style={{
                maxWidth: '100%',
                height: 'auto',
                background: '#ffffff',
                borderRadius: '8px',
                touchAction: 'none',
                cursor: isDraggingFreeShape ? 'grabbing' : 'default',
              }}
            >
              {/* Halvány rácsvonalak az illesztéshez */}
              {[60, 120, 180, 240, 300, 360, 420, 480].map(x => (
                <line key={`gx_${x}`} x1={x} y1="0" x2={x} y2="360" stroke="#f8fafc" strokeWidth="1" />
              ))}
              {[60, 120, 180, 240, 300].map(y => (
                <line key={`gy_${y}`} x1="0" y1={y} x2="520" y2={y} stroke="#f8fafc" strokeWidth="1" />
              ))}

              {/* Mágneses igazítási segédvonalak */}
              {freeSnapGuides.map((g, idx) => (
                <line key={`sg_${idx}`} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4,4" />
              ))}

              {/* Szabad alakzatok kirajzolása */}
              {freeShapes.map(s => {
                const isSelected = s.id === selectedFreeShapeId;
                const sz = s.size;

                return (
                  <g
                    key={s.id}
                    transform={`translate(${s.x}, ${s.y}) rotate(${s.rotation}) scale(${s.flipH ? -1 : 1}, ${s.flipV ? -1 : 1})`}
                    style={{ cursor: 'grab' }}
                  >
                    {s.type === 'circle' && (
                      <circle cx="0" cy="0" r={sz} fill={s.color} stroke="#0f172a" strokeWidth="2.5" />
                    )}

                    {s.type === 'triangle' && (
                      <polygon
                        points={`0,${-sz} ${sz * 0.866},${sz * 0.5} ${-sz * 0.866},${sz * 0.5}`}
                        fill={s.color}
                        stroke="#0f172a"
                        strokeWidth="2.5"
                      />
                    )}

                    {s.type === 'square' && (
                      <rect
                        x={-sz * 0.72}
                        y={-sz * 0.72}
                        width={sz * 1.44}
                        height={sz * 1.44}
                        fill={s.color}
                        stroke="#0f172a"
                        strokeWidth="2.5"
                      />
                    )}

                    {s.type === 'rectangle' && (
                      <rect
                        x={-sz * 0.95}
                        y={-sz * 0.5}
                        width={sz * 1.9}
                        height={sz}
                        fill={s.color}
                        stroke="#0f172a"
                        strokeWidth="2.5"
                      />
                    )}

                    {s.type === 'hexagon' && (
                      <polygon
                        points={[0, 1, 2, 3, 4, 5].map(i => {
                          const a = (i * 60 - 30) * Math.PI / 180;
                          return `${sz * Math.cos(a)},${sz * Math.sin(a)}`;
                        }).join(' ')}
                        fill={s.color}
                        stroke="#0f172a"
                        strokeWidth="2.5"
                      />
                    )}

                    {s.type === 'rhombus' && (
                      <polygon
                        points={`0,${-sz} ${sz * 0.75},0 0,${sz} ${-sz * 0.75},0`}
                        fill={s.color}
                        stroke="#0f172a"
                        strokeWidth="2.5"
                      />
                    )}

                    {s.type === 'trapezoid' && (
                      <polygon
                        points={`${-sz * 0.5},${-sz * 0.55} ${sz * 0.5},${-sz * 0.55} ${sz * 0.9},${sz * 0.55} ${-sz * 0.9},${sz * 0.55}`}
                        fill={s.color}
                        stroke="#0f172a"
                        strokeWidth="2.5"
                      />
                    )}

                    {s.type === 'star' && (
                      <polygon
                        points={(() => {
                          const pts: string[] = [];
                          for (let i = 0; i < 10; i++) {
                            const r = i % 2 === 0 ? sz : sz * 0.45;
                            const a = (i * 36 - 90) * Math.PI / 180;
                            pts.push(`${r * Math.cos(a)},${r * Math.sin(a)}`);
                          }
                          return pts.join(' ');
                        })()}
                        fill={s.color}
                        stroke="#0f172a"
                        strokeWidth="2.5"
                      />
                    )}

                    {/* Kijelölő keret */}
                    {isSelected && (
                      <g>
                        <rect
                          x={-sz - 8}
                          y={-sz - 8}
                          width={(sz + 8) * 2}
                          height={(sz + 8) * 2}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="2"
                          strokeDasharray="4,4"
                        />
                        {/* 4 Sarok méretező fogantyú */}
                        <circle cx={-sz - 8} cy={-sz - 8} r="5.5" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
                        <circle cx={sz + 8} cy={-sz - 8} r="5.5" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
                        <circle cx={sz + 8} cy={sz + 8} r="5.5" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
                        <circle cx={-sz - 8} cy={sz + 8} r="5.5" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />

                        {/* Forgatási fogantyú szára */}
                        <line x1="0" y1={-sz - 8} x2="0" y2={-sz - 24} stroke="#2563eb" strokeWidth="2" />

                        {/* Forgatási fogantyú gomb (Paint stílusú forgatás ikon 🔄) */}
                        <g style={{ cursor: isRotatingFreeShape ? 'grabbing' : 'crosshair' }}>
                          <circle
                            cx="0"
                            cy={-sz - 24}
                            r="12"
                            fill={isRotatingFreeShape ? '#eff6ff' : '#ffffff'}
                            stroke="#2563eb"
                            strokeWidth="2.5"
                          />
                          <path
                            d={`M -5.5 ${-sz - 24} A 5.5 5.5 0 1 1 5.5 ${-sz - 24}`}
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <polygon
                            points={`3.5,${-sz - 28} 7.5,${-sz - 24} 3.5,${-sz - 20}`}
                            fill="#2563eb"
                          />
                        </g>

                        {/* Szög kijelző címke */}
                        <g transform={`translate(0, ${sz + 24})`}>
                          <rect x="-85" y="-12" width="170" height="24" rx="6" fill="rgba(15, 23, 42, 0.9)" />
                          <text x="0" y="4" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#ffffff">
                            🔄 {s.rotation}° {isRotatingFreeShape ? (isShiftActive ? '[Shift: 15°]' : '[2°-os finom]') : `| Méret: ${Math.round(sz)}px`}
                          </text>
                        </g>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>
                💡 <strong>Szabad Illesztés:</strong> Fogd meg és mozgasd az alakzatokat az egérrel! Amikor egymás közelébe érnek, a sarkaik és éleik mágnesesen összetapadnak!
              </div>

              <button
                type="button"
                className="btn-success"
                onClick={() => handleSaveSvgBmp('szabad_mozaik_epites.bmp')}
              >
                <Download size={18} />
                <span>Mentés BMP-be</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
