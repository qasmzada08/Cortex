export function buildSafeExportFilename(
  title: string,
  languageCode: string,
  ext: 'pdf' | 'pptx' | 'json'
): string {
  const safeTitle =
    title
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 48) || 'presentation';
  const safeLang =
    languageCode
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .trim()
      .toLowerCase() || 'en';
  return `${safeTitle}-${safeLang}.${ext}`;
}

export function wrapParagraphLines(
  text: string,
  maxWidth: number,
  measureWidth: (str: string) => number
): string[] {
  const cleaned = text.replace(/\r\n/g, '\n');
  if (!cleaned.trim()) return [];

  const paragraphs = cleaned.split('\n');
  const allLines: string[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      allLines.push('');
      continue;
    }

    const tokens = para.includes(' ') ? para.split(/\s+/) : Array.from(para);
    const joiner = para.includes(' ') ? ' ' : '';
    let currentLine = '';

    for (const token of tokens) {
      if (!token) continue;
      const candidate = currentLine ? `${currentLine}${joiner}${token}` : token;
      if (measureWidth(candidate) <= maxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) {
          allLines.push(currentLine);
        }
        // Handle single oversized token by splitting characters if needed
        if (measureWidth(token) > maxWidth && token.length > 1) {
          let chunk = '';
          for (const ch of Array.from(token)) {
            const nextChunk = chunk + ch;
            if (chunk && measureWidth(nextChunk) > maxWidth) {
              allLines.push(chunk);
              chunk = ch;
            } else {
              chunk = nextChunk;
            }
          }
          currentLine = chunk;
        } else {
          currentLine = token;
        }
      }
    }

    if (currentLine) {
      allLines.push(currentLine);
    }
  }

  return allLines;
}

export function computeCoverCrop(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number
): { sx: number; sy: number; sw: number; sh: number } {
  if (imgW <= 0 || imgH <= 0 || boxW <= 0 || boxH <= 0) {
    return { sx: 0, sy: 0, sw: Math.max(imgW, 1), sh: Math.max(imgH, 1) };
  }
  const imgRatio = imgW / imgH;
  const boxRatio = boxW / boxH;

  if (imgRatio > boxRatio) {
    const sw = imgH * boxRatio;
    const sx = (imgW - sw) / 2;
    return { sx, sy: 0, sw, sh: imgH };
  }
  const sh = imgW / boxRatio;
  const sy = (imgH - sh) / 2;
  return { sx: 0, sy, sw: imgW, sh };
}

export function computeContainBox(
  imgW: number,
  imgH: number,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number
): { dx: number; dy: number; dw: number; dh: number } {
  if (imgW <= 0 || imgH <= 0 || boxW <= 0 || boxH <= 0) {
    return { dx: boxX, dy: boxY, dw: boxW, dh: boxH };
  }
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const dw = imgW * scale;
  const dh = imgH * scale;
  return {
    dx: boxX + (boxW - dw) / 2,
    dy: boxY + (boxH - dh) / 2,
    dw,
    dh,
  };
}
