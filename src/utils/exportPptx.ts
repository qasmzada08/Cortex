import PptxGenJS from 'pptxgenjs';
import type { CustomThemeDefinition, PresentationDeck, Slide } from '../types/presentation';
import { buildSafeExportFilename } from './pdfLayout';
import { resolveDeckTheme } from './themeLogic';

export interface ExportArtifact {
  filename: string;
  blobUrl: string;
}

const IMAGE_TIMEOUT_MS = 8000;
const SAFE_PPTX_FONTS = ['Arial', 'Calibri', 'Verdana', 'Tahoma', 'Georgia'];

function resolvePptxFont(fontName?: string): string {
  const normalized = (fontName || '').trim();
  if (!normalized) return 'Arial';

  if (SAFE_PPTX_FONTS.includes(normalized)) {
    return normalized;
  }

  const lowercaseMap = new Map(
    SAFE_PPTX_FONTS.map((name) => [name.toLowerCase(), name])
  );
  const matched = lowercaseMap.get(normalized.toLowerCase());
  if (matched) return matched;

  return 'Arial';
}

export function triggerBlobDownload(blob: Blob, filename: string): ExportArtifact {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.rel = 'noopener noreferrer';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (a.parentNode) {
      a.parentNode.removeChild(a);
    }
  }, 500);
  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 60_000);
  return { filename, blobUrl };
}

async function rasterizeImageToPng(dataOrUrl: string): Promise<string | null> {
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
      const naturalW = img.naturalWidth || img.width || 1600;
      const naturalH = img.naturalHeight || img.height || 1000;
      const maxW = 1600;
      const scale = naturalW > maxW ? maxW / naturalW : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(naturalW * scale));
      canvas.height = Math.max(1, Math.round(naturalH * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(null);
    };

    img.src = dataOrUrl;
  });
}

function isPptxNativeDataUrl(url: string): boolean {
  return /^data:image\/(png|jpeg|jpg|gif);base64,/i.test(url);
}

async function resolveSlideImageData(url: string): Promise<string | null> {
  if (!url) return null;

  let resolved = url.trim();
  if (resolved.startsWith('http://')) {
    resolved = `https://${resolved.slice('http://'.length)}`;
  }

  if (resolved.startsWith('https://')) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
    try {
      const res = await fetch(`/api/photos/proxy?url=${encodeURIComponent(resolved)}`, {
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { dataUrl?: string };
      if (!data.dataUrl) return null;
      resolved = data.dataUrl;
    } catch {
      return null;
    } finally {
      window.clearTimeout(timer);
    }
  } else if (resolved.startsWith('/')) {
    return rasterizeImageToPng(resolved);
  }

  if (isPptxNativeDataUrl(resolved)) {
    return resolved;
  }

  // Convert SVG, WebP, AVIF, BMP, or unencoded data URLs into PowerPoint-compatible PNG
  if (resolved.startsWith('data:image/')) {
    return rasterizeImageToPng(resolved);
  }

  return null;
}

export async function exportDeckToPptx(
  deck: PresentationDeck,
  customThemes: CustomThemeDefinition[] = []
): Promise<ExportArtifact> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 in
  pptx.title = deck.title || 'Presentation';
  pptx.subject = deck.subtitle || deck.language || 'Presentation';
  if (deck.rtl) {
    pptx.rtlMode = true;
  }

  const theme = resolveDeckTheme(deck.theme, customThemes, deck.customTheme);
  const align = deck.rtl ? 'right' : 'left';
  const safeDisplayFont = resolvePptxFont(theme.displayFont || 'Arial');
  const safeBodyFont = resolvePptxFont(theme.bodyFont || 'Arial');
  const fontFace = deck.rtl ? 'Arial' : safeDisplayFont;
  const bodyFont = deck.rtl ? 'Arial' : safeBodyFont;
  const cardShape =
    theme.cornerStyle === 'rounded' ? pptx.ShapeType.roundRect : pptx.ShapeType.rect;
  const cardCornerOpt = theme.cornerStyle === 'rounded' ? { rectRadius: 0.08 } : {};

  for (let idx = 0; idx < deck.slides.length; idx++) {
    const slideData: Slide = deck.slides[idx];
    const slide = pptx.addSlide();
    slide.background = { color: theme.hexBg };

    const resolvedImg = slideData.image?.url
      ? await resolveSlideImageData(slideData.image.url)
      : null;
    const placement = slideData.image?.placement ?? 'right';

    const isBackdrop = Boolean(resolvedImg && placement === 'background');
    const isFrame = Boolean(resolvedImg && placement === 'frame' && slideData.layout !== 'image-focus');
    const isSplit = Boolean(
      resolvedImg && (placement === 'right' || placement === 'left') && slideData.layout !== 'image-focus'
    );

    if (isBackdrop && resolvedImg) {
      slide.addImage({
        data: resolvedImg,
        x: 0,
        y: 0,
        w: 13.333,
        h: 7.5,
        sizing: { type: 'cover', w: 13.333, h: 7.5 },
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 13.333,
        h: 7.5,
        fill: { color: '000000', transparency: 42 },
      });
    }

    const inkColor = isBackdrop ? 'FFFFFF' : theme.hexInk;
    const mutedColor = isBackdrop ? 'E2E8F0' : theme.hexMuted;
    const accentColor = isBackdrop ? '38BDF8' : theme.hexAccent;

    // Theme Architectural Accent Geometry
    if (theme.accentStyle === 'top-bar') {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 13.333,
        h: 0.08,
        fill: { color: theme.hexAccent },
      });
    } else if (theme.accentStyle === 'left-rail') {
      slide.addShape(pptx.ShapeType.rect, {
        x: deck.rtl ? 13.193 : 0,
        y: 0,
        w: 0.14,
        h: 7.5,
        fill: { color: theme.hexAccent },
      });
    } else if (theme.accentStyle === 'framed') {
      slide.addShape(cardShape, {
        x: 0.25,
        y: 0.25,
        w: 12.833,
        h: 7.0,
        line: { color: theme.hexAccent, width: 1.5 },
        ...cardCornerOpt,
      });
    } else {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 13.333,
        h: 0.02,
        fill: { color: theme.hexMuted },
      });
    }

    // Slide index footer
    slide.addText(
      `${String(idx + 1).padStart(2, '0')} / ${String(deck.slides.length).padStart(2, '0')}`,
      {
        x: deck.rtl ? 0.8 : 11.2,
        y: 6.95,
        w: 1.3,
        h: 0.3,
        fontSize: 10,
        color: mutedColor,
        fontFace: bodyFont,
        align: deck.rtl ? 'left' : 'right',
      }
    );

    slide.addText(deck.title || 'Presentation', {
      x: deck.rtl ? 2.4 : 0.8,
      y: 6.95,
      w: 10.1,
      h: 0.3,
      fontSize: 10,
      color: mutedColor,
      fontFace: bodyFont,
      align,
      rtlMode: deck.rtl,
    });

    const splitImageOnLeft = placement === 'left';
    const contentX = isSplit ? (splitImageOnLeft ? 5.9 : 0.9) : 0.9;
    const contentW = isSplit ? 6.5 : 11.5;

    if (isSplit && resolvedImg) {
      slide.addImage({
        data: resolvedImg,
        x: splitImageOnLeft ? 0.9 : 7.8,
        y: 1.15,
        w: 4.6,
        h: 5.2,
        sizing: { type: 'cover', w: 4.6, h: 5.2 },
      });
    }

    if (slideData.layout === 'image-focus') {
      if (slideData.kicker) {
        slide.addText(slideData.kicker, {
          x: 0.9,
          y: 1.3,
          w: resolvedImg ? 4.6 : 11.5,
          h: 0.4,
          fontSize: 13,
          bold: true,
          color: accentColor,
          fontFace,
          align,
          rtlMode: deck.rtl,
        });
      }
      slide.addText(slideData.title || '', {
        x: 0.9,
        y: 1.85,
        w: resolvedImg ? 4.6 : 11.5,
        h: 1.5,
        fontSize: 30,
        bold: true,
        color: inkColor,
        fontFace,
        align,
        rtlMode: deck.rtl,
      });
      if (slideData.subtitle) {
        slide.addText(slideData.subtitle, {
          x: 0.9,
          y: 3.45,
          w: resolvedImg ? 4.6 : 11.5,
          h: 1.6,
          fontSize: 15,
          color: mutedColor,
          fontFace: bodyFont,
          align,
          rtlMode: deck.rtl,
        });
      }
      if (resolvedImg) {
        slide.addImage({
          data: resolvedImg,
          x: 5.9,
          y: 0.95,
          w: 6.5,
          h: 5.5,
          sizing: { type: 'cover', w: 6.5, h: 5.5 },
        });
      }
    } else if (slideData.layout === 'title' || slideData.layout === 'closing') {
      if (slideData.kicker) {
        slide.addText(slideData.kicker, {
          x: contentX,
          y: isFrame ? 0.85 : 1.55,
          w: contentW,
          h: 0.4,
          fontSize: 13,
          bold: true,
          color: accentColor,
          fontFace,
          align,
          rtlMode: deck.rtl,
        });
      }

      slide.addText(slideData.title || '', {
        x: contentX,
        y: isFrame ? 1.35 : 2.1,
        w: contentW,
        h: isFrame ? 1.15 : 1.6,
        fontSize: isSplit || isFrame ? 28 : 38,
        bold: true,
        color: inkColor,
        fontFace,
        align,
        valign: 'top',
        rtlMode: deck.rtl,
      });

      if (slideData.subtitle) {
        slide.addText(slideData.subtitle, {
          x: contentX,
          y: isFrame ? 2.6 : 3.85,
          w: contentW,
          h: isFrame ? 0.65 : 0.9,
          fontSize: isFrame ? 15 : 18,
          color: mutedColor,
          fontFace: bodyFont,
          align,
          valign: 'top',
          rtlMode: deck.rtl,
        });
      }

      const titleBullets = (slideData.bullets ?? []).filter((b) => Boolean(b.trim()));
      if (titleBullets.length > 0 && !isFrame) {
        const bulletRows = titleBullets.map((b) => ({
          text: b,
          options: { bullet: true, breakLine: true },
        }));
        slide.addText(bulletRows, {
          x: contentX,
          y: 4.85,
          w: contentW,
          h: 1.8,
          fontSize: 15,
          color: inkColor,
          fontFace: bodyFont,
          align,
          rtlMode: deck.rtl,
        });
      }
    } else if (slideData.layout === 'two-column') {
      if (slideData.kicker) {
        slide.addText(slideData.kicker, {
          x: 0.9,
          y: 0.65,
          w: 11.5,
          h: 0.35,
          fontSize: 12,
          bold: true,
          color: accentColor,
          fontFace,
          align,
          rtlMode: deck.rtl,
        });
      }

      slide.addText(slideData.title || '', {
        x: 0.9,
        y: 1.05,
        w: 11.5,
        h: 0.9,
        fontSize: 28,
        bold: true,
        color: inkColor,
        fontFace,
        align,
        rtlMode: deck.rtl,
      });

      const leftBox = deck.rtl ? slideData.rightColumn : slideData.leftColumn;
      const rightBox = deck.rtl ? slideData.leftColumn : slideData.rightColumn;

      if (leftBox) {
        slide.addShape(cardShape, {
          x: 0.9,
          y: 2.2,
          w: 5.5,
          h: 4.2,
          fill: { color: theme.hexSurface },
          line: { color: theme.hexMuted, width: 0.75 },
          ...cardCornerOpt,
        });
        slide.addText(leftBox.heading || '', {
          x: 1.2,
          y: 2.45,
          w: 4.9,
          h: 0.5,
          fontSize: 18,
          bold: true,
          color: theme.hexInk,
          fontFace,
          align,
          rtlMode: deck.rtl,
        });
        const leftPoints = leftBox.points.filter((p) => Boolean(p.trim()));
        if (leftPoints.length > 0) {
          slide.addText(
            leftPoints.map((p) => ({ text: p, options: { bullet: true, breakLine: true } })),
            {
              x: 1.2,
              y: 3.1,
              w: 4.9,
              h: 3.0,
              fontSize: 14,
              color: theme.hexMuted,
              fontFace: bodyFont,
              align,
              valign: 'top',
              rtlMode: deck.rtl,
            }
          );
        }
      }

      if (rightBox) {
        slide.addShape(cardShape, {
          x: 6.9,
          y: 2.2,
          w: 5.5,
          h: 4.2,
          fill: { color: theme.hexSurface },
          line: { color: theme.hexMuted, width: 0.75 },
          ...cardCornerOpt,
        });
        slide.addText(rightBox.heading || '', {
          x: 7.2,
          y: 2.45,
          w: 4.9,
          h: 0.5,
          fontSize: 18,
          bold: true,
          color: theme.hexInk,
          fontFace,
          align,
          rtlMode: deck.rtl,
        });
        const rightPoints = rightBox.points.filter((p) => Boolean(p.trim()));
        if (rightPoints.length > 0) {
          slide.addText(
            rightPoints.map((p) => ({ text: p, options: { bullet: true, breakLine: true } })),
            {
              x: 7.2,
              y: 3.1,
              w: 4.9,
              h: 3.0,
              fontSize: 14,
              color: theme.hexMuted,
              fontFace: bodyFont,
              align,
              valign: 'top',
              rtlMode: deck.rtl,
            }
          );
        }
      }
    } else if (slideData.layout === 'metric') {
      if (slideData.kicker) {
        slide.addText(slideData.kicker, {
          x: 0.9,
          y: 0.65,
          w: 11.5,
          h: 0.35,
          fontSize: 12,
          bold: true,
          color: accentColor,
          fontFace,
          align,
          rtlMode: deck.rtl,
        });
      }

      slide.addText(slideData.title || '', {
        x: 0.9,
        y: 1.05,
        w: 11.5,
        h: 1.0,
        fontSize: 28,
        bold: true,
        color: inkColor,
        fontFace,
        align,
        rtlMode: deck.rtl,
      });

      const metrics = (slideData.metrics ?? []).slice(0, 4);
      if (metrics.length > 0) {
        const count = metrics.length;
        const cardWidth = (11.5 - (count - 1) * 0.4) / count;
        metrics.forEach((metric, mIdx) => {
          const posIndex = deck.rtl ? count - 1 - mIdx : mIdx;
          const x = 0.9 + posIndex * (cardWidth + 0.4);
          slide.addShape(cardShape, {
            x,
            y: 2.45,
            w: cardWidth,
            h: 3.3,
            fill: { color: theme.hexSurface },
            line: { color: theme.hexMuted, width: 0.75 },
            ...cardCornerOpt,
          });
          slide.addText(metric.value || '—', {
            x: x + 0.25,
            y: 2.85,
            w: cardWidth - 0.5,
            h: 1.1,
            fontSize: 40,
            bold: true,
            color: theme.hexAccent,
            fontFace,
            align,
            rtlMode: deck.rtl,
          });
          slide.addText(metric.label || '', {
            x: x + 0.25,
            y: 4.1,
            w: cardWidth - 0.5,
            h: 1.2,
            fontSize: 15,
            color: theme.hexInk,
            fontFace: bodyFont,
            align,
            valign: 'top',
            rtlMode: deck.rtl,
          });
        });
      }
    } else if (slideData.layout === 'quote') {
      if (slideData.kicker) {
        slide.addText(slideData.kicker, {
          x: contentX,
          y: 1.1,
          w: contentW,
          h: 0.4,
          fontSize: 12,
          bold: true,
          color: accentColor,
          fontFace,
          align,
          rtlMode: deck.rtl,
        });
      }

      slide.addText(`“${slideData.quote || slideData.title || ''}”`, {
        x: contentX,
        y: isFrame ? 1.55 : 1.9,
        w: contentW,
        h: isFrame ? 1.65 : 3.1,
        fontSize: isSplit || isFrame ? 22 : 28,
        italic: true,
        color: inkColor,
        fontFace,
        align,
        valign: 'middle',
        rtlMode: deck.rtl,
      });

      if (slideData.quoteAuthor) {
        slide.addText(`— ${slideData.quoteAuthor}`, {
          x: contentX,
          y: isFrame ? 3.25 : 5.2,
          w: contentW,
          h: 0.45,
          fontSize: 16,
          bold: true,
          color: mutedColor,
          fontFace: bodyFont,
          align,
          rtlMode: deck.rtl,
        });
      }
    } else {
      // Bullets default layout
      if (slideData.kicker) {
        slide.addText(slideData.kicker, {
          x: contentX,
          y: 0.65,
          w: contentW,
          h: 0.35,
          fontSize: 12,
          bold: true,
          color: accentColor,
          fontFace,
          align,
          rtlMode: deck.rtl,
        });
      }

      slide.addText(slideData.title || '', {
        x: contentX,
        y: 1.05,
        w: contentW,
        h: 0.85,
        fontSize: isSplit || isFrame ? 24 : 28,
        bold: true,
        color: inkColor,
        fontFace,
        align,
        rtlMode: deck.rtl,
      });

      if (slideData.subtitle) {
        slide.addText(slideData.subtitle, {
          x: contentX,
          y: 1.9,
          w: contentW,
          h: 0.5,
          fontSize: 15,
          color: mutedColor,
          fontFace: bodyFont,
          align,
          rtlMode: deck.rtl,
        });
      }

      const bullets = (slideData.bullets ?? []).filter((b) => Boolean(b.trim()));
      const visibleBullets = isFrame ? bullets.slice(0, 3) : bullets;
      if (visibleBullets.length > 0) {
        slide.addText(
          visibleBullets.map((b) => ({
            text: b,
            options: { bullet: true, breakLine: true, paraSpaceAfter: isFrame ? 6 : 12 },
          })),
          {
            x: contentX,
            y: slideData.subtitle ? 2.48 : 2.1,
            w: contentW,
            h: isFrame ? 1.3 : 3.9,
            fontSize: isSplit || isFrame ? 14 : 18,
            color: inkColor,
            fontFace: bodyFont,
            align,
            valign: 'top',
            rtlMode: deck.rtl,
          }
        );
      }
    }

    if (isFrame && resolvedImg) {
      slide.addImage({
        data: resolvedImg,
        x: 3.1,
        y: 3.95,
        w: 7.1,
        h: 2.75,
        sizing: { type: 'contain', w: 7.1, h: 2.75 },
      });
    }

    if (slideData.speakerNotes) {
      slide.addNotes(slideData.speakerNotes);
    }
  }

  const filename = buildSafeExportFilename(deck.title, deck.languageCode, 'pptx');
  const blob = (await pptx.write({ outputType: 'blob' })) as Blob;
  return triggerBlobDownload(blob, filename);
}

export function exportDeckJson(deck: PresentationDeck): ExportArtifact {
  const blob = new Blob([JSON.stringify(deck, null, 2)], { type: 'application/json' });
  const filename = buildSafeExportFilename(deck.title, deck.languageCode, 'json');
  return triggerBlobDownload(blob, filename);
}
