import { jsPDF } from 'jspdf';
import type { CustomThemeDefinition, PresentationDeck, Slide } from '../types/presentation';
import { type ExportArtifact, triggerBlobDownload } from './exportPptx';
import {
  buildSafeExportFilename,
  computeContainBox,
  computeCoverCrop,
  wrapParagraphLines,
} from './pdfLayout';
import { resolveDeckTheme } from './themeLogic';

const SLIDE_W = 1600;
const SLIDE_H = 900;
const PDF_PT_W = 960;
const PDF_PT_H = 540;
const IMAGE_TIMEOUT_MS = 8000;

async function resolveImageElement(url: string): Promise<HTMLImageElement | null> {
  if (!url) return null;

  let loadableUrl = url.trim();
  if (loadableUrl.startsWith('http://')) {
    loadableUrl = `https://${loadableUrl.slice('http://'.length)}`;
  }

  if (loadableUrl.startsWith('https://')) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
    try {
      const res = await fetch(`/api/photos/proxy?url=${encodeURIComponent(loadableUrl)}`, {
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { dataUrl?: string };
      if (!data.dataUrl) return null;
      loadableUrl = data.dataUrl;
    } catch {
      return null;
    } finally {
      window.clearTimeout(timer);
    }
  }

  return new Promise((resolve) => {
    const img = new window.Image();
    let settled = false;
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, IMAGE_TIMEOUT_MS);

    img.onload = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = loadableUrl;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string
) {
  ctx.beginPath();
  if (r > 0) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawWrappedBlock(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
  rtl: boolean
): number {
  const lines = wrapParagraphLines(text, maxWidth, (s) => ctx.measureText(s).width);
  const clipped = lines.slice(0, maxLines);
  ctx.textAlign = rtl ? 'right' : 'left';
  ctx.direction = rtl ? 'rtl' : 'ltr';
  const anchorX = rtl ? x + maxWidth : x;

  clipped.forEach((line, idx) => {
    const isLastClipped = idx === maxLines - 1 && lines.length > maxLines;
    const output = isLastClipped ? `${line.slice(0, Math.max(0, line.length - 1))}…` : line;
    ctx.fillText(output, anchorX, y + idx * lineHeight);
  });

  return clipped.length * lineHeight;
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 16
) {
  const natW = img.naturalWidth || img.width || 1200;
  const natH = img.naturalHeight || img.height || 750;
  const crop = computeCoverCrop(natW, natH, w, h);
  ctx.save();
  ctx.beginPath();
  if (radius > 0) {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.clip();
  ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, x, y, w, h);
  ctx.restore();
}

function drawContainImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  bgColor: string,
  borderColor: string
) {
  drawRoundedRect(ctx, x, y, w, h, radius, bgColor, borderColor);
  const natW = img.naturalWidth || img.width || 1200;
  const natH = img.naturalHeight || img.height || 750;
  const box = computeContainBox(natW, natH, x + 12, y + 12, w - 24, h - 24);
  ctx.drawImage(img, box.dx, box.dy, box.dw, box.dh);
}

async function renderSlideToJpegDataUrl(
  slide: Slide,
  deck: PresentationDeck,
  slideIndex: number,
  customThemes: CustomThemeDefinition[] = []
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = SLIDE_W;
  canvas.height = SLIDE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize canvas 2D context for PDF export.');
  }

  const theme = resolveDeckTheme(deck.theme, customThemes, deck.customTheme);
  const bgHex = `#${theme.hexBg}`;
  const surfaceHex = `#${theme.hexSurface}`;
  const defaultInk = `#${theme.hexInk}`;
  const defaultMuted = `#${theme.hexMuted}`;
  const defaultAccent = `#${theme.hexAccent}`;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);

  const img = slide.image?.url ? await resolveImageElement(slide.image.url) : null;
  const placement = slide.image?.placement ?? 'right';
  const isBackdrop = Boolean(img && placement === 'background');
  const isFrame = Boolean(img && placement === 'frame' && slide.layout !== 'image-focus');
  const isSplit = Boolean(
    img && (placement === 'right' || placement === 'left') && slide.layout !== 'image-focus'
  );

  if (isBackdrop && img) {
    drawCoverImage(ctx, img, 0, 0, SLIDE_W, SLIDE_H, 0);
    const scrim = ctx.createLinearGradient(0, 0, 0, SLIDE_H);
    scrim.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    scrim.addColorStop(0.5, 'rgba(0, 0, 0, 0.58)');
    scrim.addColorStop(1, 'rgba(0, 0, 0, 0.82)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);
  }

  const inkColor = isBackdrop ? '#FFFFFF' : defaultInk;
  const mutedColor = isBackdrop ? '#E2E8F0' : defaultMuted;
  const accentColor = isBackdrop ? '#38BDF8' : defaultAccent;
  const cardBg = isBackdrop ? 'rgba(0, 0, 0, 0.35)' : surfaceHex;
  const cardBorder = isBackdrop ? 'rgba(255, 255, 255, 0.28)' : theme.borderRgba;
  const cardRadius = theme.cornerStyle === 'sharp' ? 0 : 14;
  const mediaRadius = theme.cornerStyle === 'sharp' ? 0 : 16;

  // Theme Architectural Accent Geometry
  ctx.fillStyle = `#${theme.hexAccent}`;
  if (theme.accentStyle === 'top-bar') {
    ctx.fillRect(0, 0, SLIDE_W, 8);
  } else if (theme.accentStyle === 'left-rail') {
    ctx.fillRect(deck.rtl ? SLIDE_W - 14 : 0, 0, 14, SLIDE_H);
  } else if (theme.accentStyle === 'framed') {
    ctx.strokeStyle = `#${theme.hexAccent}`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (cardRadius > 0) {
      ctx.roundRect(28, 28, SLIDE_W - 56, SLIDE_H - 56, cardRadius);
    } else {
      ctx.rect(28, 28, SLIDE_W - 56, SLIDE_H - 56);
    }
    ctx.stroke();
  } else {
    ctx.fillStyle = theme.borderRgba;
    ctx.fillRect(0, 0, SLIDE_W, 2);
  }

  const rtl = deck.rtl;
  const displayFont = theme.displayCssFont;
  const bodyFont = theme.bodyCssFont;
  const monoFont = '"JetBrains Mono", monospace';

  ctx.textBaseline = 'top';

  // Split-side image (when layout !== image-focus)
  const splitLeft = placement === 'left';
  if (isSplit && img) {
    const imgX = splitLeft ? 96 : 968;
    drawCoverImage(ctx, img, imgX, 110, 536, 650, mediaRadius);
  }

  const contentX = isSplit ? (splitLeft ? 684 : 96) : 96;
  const contentW = isSplit ? 820 : 1408;

  if (slide.layout === 'image-focus') {
    const textX = 96;
    const textW = img && !isBackdrop ? 580 : 1408;
    let cursorY = 170;

    if (slide.kicker) {
      ctx.font = `600 22px ${displayFont}`;
      ctx.fillStyle = accentColor;
      cursorY += drawWrappedBlock(ctx, slide.kicker, textX, cursorY, textW, 30, 2, rtl) + 14;
    }
    ctx.font = `700 46px ${displayFont}`;
    ctx.fillStyle = inkColor;
    cursorY += drawWrappedBlock(ctx, slide.title, textX, cursorY, textW, 56, 3, rtl) + 18;

    if (slide.subtitle) {
      ctx.font = `400 26px ${bodyFont}`;
      ctx.fillStyle = mutedColor;
      drawWrappedBlock(ctx, slide.subtitle, textX, cursorY, textW, 36, 4, rtl);
    }

    if (img && !isBackdrop) {
      drawCoverImage(ctx, img, 720, 100, 784, 670, mediaRadius);
    }
  } else if (slide.layout === 'title' || slide.layout === 'closing') {
    let cursorY = isFrame ? 90 : slide.bullets && slide.bullets.length > 0 ? 150 : 230;
    if (slide.kicker) {
      ctx.font = `600 22px ${displayFont}`;
      ctx.fillStyle = accentColor;
      cursorY += drawWrappedBlock(ctx, slide.kicker, contentX, cursorY, contentW, 30, 2, rtl) + 18;
    }

    ctx.font = `700 ${isSplit || isFrame ? 46 : 60}px ${displayFont}`;
    ctx.fillStyle = inkColor;
    cursorY +=
      drawWrappedBlock(
        ctx,
        slide.title,
        contentX,
        cursorY,
        contentW,
        isSplit || isFrame ? 56 : 72,
        isFrame ? 2 : 3,
        rtl
      ) + 18;

    if (slide.subtitle) {
      ctx.font = `400 26px ${bodyFont}`;
      ctx.fillStyle = mutedColor;
      cursorY +=
        drawWrappedBlock(
          ctx,
          slide.subtitle,
          contentX,
          cursorY,
          contentW,
          36,
          isFrame ? 2 : 3,
          rtl
        ) + 20;
    }

    if (slide.bullets && slide.bullets.length > 0 && !isFrame) {
      ctx.font = `400 24px ${bodyFont}`;
      for (const b of slide.bullets.slice(0, 5)) {
        if (cursorY > 740) break;
        ctx.fillStyle = accentColor;
        const dotX = rtl ? contentX + contentW - 8 : contentX + 8;
        ctx.beginPath();
        ctx.arc(dotX, cursorY + 14, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = inkColor;
        const textX = rtl ? contentX : contentX + 30;
        cursorY += drawWrappedBlock(ctx, b, textX, cursorY, contentW - 30, 34, 2, rtl) + 12;
      }
    }
  } else if (slide.layout === 'two-column') {
    let cursorY = 88;
    if (slide.kicker) {
      ctx.font = `600 20px ${displayFont}`;
      ctx.fillStyle = accentColor;
      cursorY += drawWrappedBlock(ctx, slide.kicker, contentX, cursorY, contentW, 28, 1, rtl) + 12;
    }
    ctx.font = `700 42px ${displayFont}`;
    ctx.fillStyle = inkColor;
    cursorY += drawWrappedBlock(ctx, slide.title, contentX, cursorY, contentW, 50, 2, rtl) + 28;

    const colGap = 36;
    const colW = (contentW - colGap) / 2;
    const colH = Math.max(360, 760 - cursorY);
    const cols = rtl ? [slide.rightColumn, slide.leftColumn] : [slide.leftColumn, slide.rightColumn];

    cols.forEach((col, cIdx) => {
      const cx = contentX + cIdx * (colW + colGap);
      drawRoundedRect(ctx, cx, cursorY, colW, colH, cardRadius, cardBg, cardBorder);
      let innerY = cursorY + 32;
      ctx.font = `700 26px ${displayFont}`;
      ctx.fillStyle = inkColor;
      innerY +=
        drawWrappedBlock(
          ctx,
          col?.heading || (cIdx === 0 ? 'Column A' : 'Column B'),
          cx + 32,
          innerY,
          colW - 64,
          34,
          2,
          rtl
        ) + 20;

      ctx.font = `400 22px ${bodyFont}`;
      for (const pt of (col?.points ?? []).slice(0, 5)) {
        if (innerY > cursorY + colH - 40) break;
        ctx.fillStyle = accentColor;
        const dotX = rtl ? cx + colW - 38 : cx + 38;
        ctx.beginPath();
        ctx.arc(dotX, innerY + 13, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = mutedColor;
        const textX = rtl ? cx + 32 : cx + 56;
        innerY += drawWrappedBlock(ctx, pt, textX, innerY, colW - 88, 30, 2, rtl) + 12;
      }
    });
  } else if (slide.layout === 'metric') {
    let cursorY = 92;
    if (slide.kicker) {
      ctx.font = `600 20px ${displayFont}`;
      ctx.fillStyle = accentColor;
      cursorY += drawWrappedBlock(ctx, slide.kicker, contentX, cursorY, contentW, 28, 1, rtl) + 12;
    }
    ctx.font = `700 42px ${displayFont}`;
    ctx.fillStyle = inkColor;
    cursorY += drawWrappedBlock(ctx, slide.title, contentX, cursorY, contentW, 50, 2, rtl) + 42;

    const metrics = (slide.metrics ?? []).slice(0, 4);
    if (metrics.length > 0) {
      const count = metrics.length;
      const gap = 32;
      const cardW = (contentW - (count - 1) * gap) / count;
      const cardH = 340;

      metrics.forEach((metric, mIdx) => {
        const posIndex = rtl ? count - 1 - mIdx : mIdx;
        const mx = contentX + posIndex * (cardW + gap);
        drawRoundedRect(ctx, mx, cursorY, cardW, cardH, cardRadius, cardBg, cardBorder);

        ctx.font = `700 58px ${displayFont}`;
        ctx.fillStyle = accentColor;
        drawWrappedBlock(ctx, metric.value, mx + 32, cursorY + 48, cardW - 64, 66, 1, rtl);

        ctx.font = `400 23px ${bodyFont}`;
        ctx.fillStyle = mutedColor;
        drawWrappedBlock(ctx, metric.label, mx + 32, cursorY + 148, cardW - 64, 32, 3, rtl);
      });
    }
  } else if (slide.layout === 'quote') {
    let cursorY = isFrame ? 110 : 210;
    if (slide.kicker) {
      ctx.font = `600 22px ${displayFont}`;
      ctx.fillStyle = accentColor;
      cursorY += drawWrappedBlock(ctx, slide.kicker, contentX, cursorY, contentW, 30, 1, rtl) + 22;
    }

    ctx.font = `500 ${isSplit || isFrame ? 36 : 46}px ${displayFont}`;
    ctx.fillStyle = inkColor;
    cursorY +=
      drawWrappedBlock(
        ctx,
        `“${slide.quote || slide.title}”`,
        contentX,
        cursorY,
        contentW,
        isSplit || isFrame ? 48 : 60,
        isFrame ? 3 : 4,
        rtl
      ) + 24;

    if (slide.quoteAuthor) {
      ctx.font = `500 24px ${bodyFont}`;
      ctx.fillStyle = mutedColor;
      drawWrappedBlock(ctx, `— ${slide.quoteAuthor}`, contentX, cursorY, contentW, 34, 1, rtl);
    }
  } else {
    // Bullets layout
    let cursorY = 92;
    if (slide.kicker) {
      ctx.font = `600 20px ${displayFont}`;
      ctx.fillStyle = accentColor;
      cursorY += drawWrappedBlock(ctx, slide.kicker, contentX, cursorY, contentW, 28, 1, rtl) + 12;
    }
    ctx.font = `700 ${isSplit ? 38 : 44}px ${displayFont}`;
    ctx.fillStyle = inkColor;
    cursorY += drawWrappedBlock(ctx, slide.title, contentX, cursorY, contentW, 52, 2, rtl) + 14;

    if (slide.subtitle) {
      ctx.font = `400 24px ${bodyFont}`;
      ctx.fillStyle = mutedColor;
      cursorY += drawWrappedBlock(ctx, slide.subtitle, contentX, cursorY, contentW, 32, 2, rtl) + 20;
    } else {
      cursorY += 12;
    }

    const bullets = (slide.bullets ?? []).slice(0, isFrame ? 3 : 6);
    const maxY = isFrame ? 385 : 750;
    for (let bIdx = 0; bIdx < bullets.length; bIdx++) {
      if (cursorY > maxY) break;
      const bullet = bullets[bIdx];
      const numLabel = String(bIdx + 1).padStart(2, '0');
      ctx.font = `600 20px ${monoFont}`;
      ctx.fillStyle = accentColor;
      ctx.direction = 'ltr';
      ctx.textAlign = rtl ? 'right' : 'left';
      ctx.fillText(numLabel, rtl ? contentX + contentW : contentX, cursorY + 4);

      ctx.font = `400 ${isSplit || isFrame ? 23 : 26}px ${bodyFont}`;
      ctx.fillStyle = inkColor;
      const textX = rtl ? contentX : contentX + 48;
      cursorY += drawWrappedBlock(ctx, bullet, textX, cursorY, contentW - 48, 34, 2, rtl) + 14;
    }
  }

  // Frame image below top copy when placement === 'frame'
  if (img && isFrame) {
    drawContainImage(ctx, img, 340, 415, 920, 360, cardRadius, surfaceHex, cardBorder);
  }

  // Footer hairline & slide metadata
  ctx.strokeStyle = isBackdrop ? 'rgba(255, 255, 255, 0.25)' : 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(96, 808);
  ctx.lineTo(SLIDE_W - 96, 808);
  ctx.stroke();

  ctx.font = `400 20px ${bodyFont}`;
  ctx.fillStyle = mutedColor;
  drawWrappedBlock(ctx, deck.title, 96, 826, 1100, 28, 1, rtl);

  ctx.font = `500 20px ${monoFont}`;
  ctx.direction = 'ltr';
  ctx.textAlign = rtl ? 'left' : 'right';
  const pageCounter = `${String(slideIndex + 1).padStart(2, '0')} / ${String(deck.slides.length).padStart(2, '0')}`;
  ctx.fillText(pageCounter, rtl ? 96 : SLIDE_W - 96, 826);

  return canvas.toDataURL('image/jpeg', 0.92);
}

export async function exportDeckToPdf(
  deck: PresentationDeck,
  customThemes: CustomThemeDefinition[] = []
): Promise<ExportArtifact> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed even if webfont loading check rejects
    }
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [PDF_PT_W, PDF_PT_H],
    compress: true,
  });

  doc.setProperties({
    title: deck.title || 'Presentation',
    subject: deck.subtitle || deck.language || 'Presentation',
    creator: 'Cortex',
  });

  for (let idx = 0; idx < deck.slides.length; idx++) {
    if (idx > 0) {
      doc.addPage([PDF_PT_W, PDF_PT_H], 'landscape');
    }
    const slideDataUrl = await renderSlideToJpegDataUrl(deck.slides[idx], deck, idx, customThemes);
    doc.addImage(slideDataUrl, 'JPEG', 0, 0, PDF_PT_W, PDF_PT_H);
  }

  const filename = buildSafeExportFilename(deck.title, deck.languageCode, 'pdf');
  const blob = doc.output('blob');
  return triggerBlobDownload(blob, filename);
}
