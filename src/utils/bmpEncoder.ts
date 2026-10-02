/**
 * Szabványos Windows 24-bites BMP fájl enkódoló és letöltő HTML Canvas-ből.
 * Windows Paint és bármely operációs rendszer azonnal, közvetlenül megnyitja.
 */

export function canvasToBmpBlob(canvas: HTMLCanvasElement): Blob {
  const width = canvas.width;
  const height = canvas.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context nem elérhető');
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data; // RGBA bájtok

  // A BMP sorok méretének 4 bájttal oszthatónak kell lennie (padding)
  const bytesPerPixel = 3; // 24-bit RGB (BGR formátumban)
  const rowSize = Math.floor((bytesPerPixel * width + 3) / 4) * 4;
  const pixelArraySize = rowSize * height;
  const fileHeaderSize = 14;
  const infoHeaderSize = 40;
  const fileSize = fileHeaderSize + infoHeaderSize + pixelArraySize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // --- BITMAPFILEHEADER (14 bytes) ---
  // 0-1: "BM" varázsszó
  view.setUint16(0, 0x424d, false); // 'B', 'M'
  // 2-5: Fájlméret
  view.setUint32(2, fileSize, true);
  // 6-7, 8-9: Fenntartott
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  // 10-13: Pixel adatok eltolása (54 bytes)
  view.setUint32(10, fileHeaderSize + infoHeaderSize, true);

  // --- BITMAPINFOHEADER (40 bytes) ---
  // 14-17: InfoHeader mérete (40)
  view.setUint32(14, infoHeaderSize, true);
  // 18-21: Kép szélessége
  view.setInt32(18, width, true);
  // 22-25: Kép magassága (pozitív = alulról felfelé haladó sorok)
  view.setInt32(22, height, true);
  // 26-27: Síkok száma (mindig 1)
  view.setUint16(26, 1, true);
  // 28-29: Bitek száma képpontonként (24 bit)
  view.setUint16(28, 24, true);
  // 30-33: Tömörítés (0 = BI_RGB, tömörítetlen)
  view.setUint32(30, 0, true);
  // 34-37: Pixel adatok mérete
  view.setUint32(34, pixelArraySize, true);
  // 38-41, 42-45: Vízszintes és függőleges felbontás (pixel / méter, ~72 DPI = 2835)
  view.setInt32(38, 2835, true);
  view.setInt32(42, 2835, true);
  // 46-49, 50-53: Színek száma a palettán
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  // --- Pixel adatok kitöltése (BGR alulról felfelé haladva) ---
  let offset = fileHeaderSize + infoHeaderSize;
  const paddingBytes = rowSize - (width * bytesPerPixel);

  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Fehér háttérrel való keverés ha áttetsző lenne
      const alphaRatio = a / 255;
      const finalR = Math.round(r * alphaRatio + 255 * (1 - alphaRatio));
      const finalG = Math.round(g * alphaRatio + 255 * (1 - alphaRatio));
      const finalB = Math.round(b * alphaRatio + 255 * (1 - alphaRatio));

      // BMP szabvány: B, G, R sorrend!
      view.setUint8(offset++, finalB);
      view.setUint8(offset++, finalG);
      view.setUint8(offset++, finalR);
    }

    // Sorvégi kitöltés 4 bájtra
    for (let p = 0; p < paddingBytes; p++) {
      view.setUint8(offset++, 0);
    }
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

/**
 * Közvetlen letöltés indítása a böngészőben BMP formátumban.
 */
export function downloadCanvasAsBmp(canvas: HTMLCanvasElement, filename = 'paint_rajz.bmp') {
  const blob = canvasToBmpBlob(canvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.bmp') ? filename : `${filename}.bmp`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * SVG elem közvetlen konvertálása és letöltése 24-bites BMP képként
 */
export async function downloadSvgAsBmp(svgElement: SVGSVGElement, filename = 'paint_alakzat.bmp') {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  const rect = svgElement.getBoundingClientRect();
  const width = Math.max(300, Math.round(rect.width)) || 500;
  const height = Math.max(200, Math.round(rect.height)) || 380;

  return new Promise<void>((resolve) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        downloadCanvasAsBmp(canvas, filename);
      }
      URL.revokeObjectURL(url);
      resolve();
    };
    img.src = url;
  });
}

