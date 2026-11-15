import JSZip from 'jszip';
import type {
  CustomThemeDefinition,
  PresentationDeck,
  Slide,
  SlideImage,
  SlideImagePlacement,
} from '../types/presentation.ts';
import { makeSlideId, normalizeGeneratedDeck } from './deckLogic.ts';
import { resolveLanguageMeta } from './languages.ts';
import { normalizeCustomTheme, normalizeHex } from './themeLogic.ts';

export type ImportedFileResult =
  | { kind: 'deck'; deck: PresentationDeck }
  | { kind: 'theme'; theme: CustomThemeDefinition };

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCodePoint(Number.parseInt(hex, 16)));
}

function extractParagraphsFromBlock(xmlBlock: string): Array<{ text: string; fontSizePt: number; isBullet: boolean }> {
  const paragraphs: Array<{ text: string; fontSizePt: number; isBullet: boolean }> = [];
  const pRegex = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g;
  let pMatch: RegExpExecArray | null;
  while ((pMatch = pRegex.exec(xmlBlock)) !== null) {
    const pInner = pMatch[1];
    const tRegex = /<a:t\b[^>]*>([\s\S]*?)<\/a:t>/g;
    const textChunks: string[] = [];
    let tMatch: RegExpExecArray | null;
    while ((tMatch = tRegex.exec(pInner)) !== null) {
      textChunks.push(decodeXmlEntities(tMatch[1]));
    }
    const text = textChunks.join('').trim();
    if (!text) continue;

    const szMatch = pInner.match(/\bsz="(\d+)"/);
    const fontSizePt = szMatch ? Number(szMatch[1]) / 100 : 16;
    const isBullet = /<a:buChar\b|<a:buAutoNum\b/.test(pInner);
    paragraphs.push({ text, fontSizePt, isBullet });
  }
  return paragraphs;
}

export interface ParsedPptxSlideXml {
  bgHex?: string;
  texts: Array<{ text: string; fontSizePt: number; isBullet: boolean; yEmu: number }>;
  imageRefs: Array<{ rId: string; xEmu: number; yEmu: number; cxEmu: number; cyEmu: number }>;
}

export function parsePptxSlideXml(slideXml: string): ParsedPptxSlideXml {
  const bgMatch = slideXml.match(/<p:bg>[\s\S]*?<a:srgbClr\s+val="([0-9a-fA-F]{6})"/);
  const bgHex = bgMatch ? bgMatch[1].toUpperCase() : undefined;

  const texts: ParsedPptxSlideXml['texts'] = [];
  const spRegex = /<p:sp\b[^>]*>([\s\S]*?)<\/p:sp>/g;
  let spMatch: RegExpExecArray | null;
  while ((spMatch = spRegex.exec(slideXml)) !== null) {
    const spInner = spMatch[1];
    const yMatch = spInner.match(/<a:off\b[^>]*\by="(-?\d+)"/);
    const yEmu = yMatch ? Number(yMatch[1]) : 0;
    const paras = extractParagraphsFromBlock(spInner);
    for (const para of paras) {
      texts.push({ ...para, yEmu });
    }
  }

  const imageRefs: ParsedPptxSlideXml['imageRefs'] = [];
  const picRegex = /<p:pic\b[^>]*>([\s\S]*?)<\/p:pic>/g;
  let picMatch: RegExpExecArray | null;
  while ((picMatch = picRegex.exec(slideXml)) !== null) {
    const picInner = picMatch[1];
    const embedMatch = picInner.match(/\br:embed="([^"]+)"/);
    if (!embedMatch) continue;
    const offMatch = picInner.match(/<a:off\b[^>]*\bx="(-?\d+)"[^>]*\by="(-?\d+)"/);
    const extMatch = picInner.match(/<a:ext\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/);
    imageRefs.push({
      rId: embedMatch[1],
      xEmu: offMatch ? Number(offMatch[1]) : 0,
      yEmu: offMatch ? Number(offMatch[2]) : 0,
      cxEmu: extMatch ? Number(extMatch[1]) : 0,
      cyEmu: extMatch ? Number(extMatch[2]) : 0,
    });
  }

  return { bgHex, texts, imageRefs };
}

function parseRelsMap(relsXml: string): Record<string, { type: string; target: string }> {
  const map: Record<string, { type: string; target: string }> = {};
  const relRegex = /<Relationship\b([^>]+?)\/?>(?:<\/Relationship>)?/g;
  let match: RegExpExecArray | null;
  while ((match = relRegex.exec(relsXml)) !== null) {
    const attrs = match[1];
    const idMatch = attrs.match(/\bId="([^"]+)"/);
    const typeMatch = attrs.match(/\bType="([^"]+)"/);
    const targetMatch = attrs.match(/\bTarget="([^"]+)"/);
    if (idMatch && targetMatch) {
      map[idMatch[1]] = {
        type: typeMatch?.[1] || '',
        target: targetMatch[1],
      };
    }
  }
  return map;
}

function resolveZipTarget(baseDir: string, target: string): string {
  const cleanTarget = target.replace(/^\/+/, '');
  if (cleanTarget.startsWith('ppt/')) return cleanTarget;
  const parts = `${baseDir}/${cleanTarget}`.split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') resolved.pop();
    else resolved.push(part);
  }
  return resolved.join('/');
}

function inferImageMimeType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function containsRtlCharacters(text: string): boolean {
  return /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

function inferPlacement(ref: ParsedPptxSlideXml['imageRefs'][0]): SlideImagePlacement {
  // 16:9 widescreen slide in EMU is roughly 12,192,000 x 6,858,000
  if (ref.cxEmu > 10_500_000 && ref.cyEmu > 5_800_000) return 'background';
  if (ref.cyEmu > 0 && ref.cxEmu / ref.cyEmu > 1.8 && ref.yEmu > 2_500_000) return 'frame';
  if (ref.xEmu < 3_500_000) return 'left';
  return 'right';
}

export function parseDeckOrThemeJson(text: string, fallbackName = 'Imported'): ImportedFileResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Could not parse JSON file. Make sure it is valid Cortex or theme JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('JSON file is empty or invalid.');
  }

  const record = parsed as Record<string, unknown>;
  if (Array.isArray(record.slides) && record.slides.length > 0) {
    const rawDeck = record as Partial<PresentationDeck>;
    const normalizedCustom =
      rawDeck.customTheme && typeof rawDeck.customTheme === 'object'
        ? normalizeCustomTheme(rawDeck.customTheme, rawDeck.customTheme.id)
        : undefined;
    const deck = normalizeGeneratedDeck(
      {
        ...rawDeck,
        id: typeof rawDeck.id === 'string' && rawDeck.id ? rawDeck.id : makeSlideId('deck'),
        customTheme: normalizedCustom,
      },
      normalizedCustom?.id || (typeof rawDeck.theme === 'string' ? rawDeck.theme : 'neon-aurora'),
      typeof rawDeck.language === 'string' ? rawDeck.language : 'English',
      typeof rawDeck.tone === 'string' ? rawDeck.tone : 'Executive'
    );
    return { kind: 'deck', deck };
  }

  if (
    typeof record.hexBg === 'string' ||
    typeof record.hexAccent === 'string' ||
    typeof record.hexInk === 'string'
  ) {
    const theme = normalizeCustomTheme(
      {
        ...(record as Partial<CustomThemeDefinition>),
        name:
          typeof record.name === 'string' && record.name.trim()
            ? record.name
            : fallbackName.replace(/\.json$/i, ''),
      },
      typeof record.id === 'string' ? record.id : undefined
    );
    return { kind: 'theme', theme };
  }

  throw new Error('JSON file does not contain presentation slides or PPTX theme colors.');
}

export async function parsePptxBuffer(
  buffer: ArrayBuffer | Uint8Array,
  filename = 'Imported Presentation.pptx'
): Promise<PresentationDeck> {
  const zip = await JSZip.loadAsync(buffer);
  const presXmlFile = zip.file('ppt/presentation.xml');
  if (!presXmlFile) {
    throw new Error('Invalid .pptx archive: missing ppt/presentation.xml.');
  }

  const presXml = await presXmlFile.async('string');
  const presRelsXml = (await zip.file('ppt/_rels/presentation.xml.rels')?.async('string')) || '';
  const presRels = parseRelsMap(presRelsXml);

  // Resolve ordered slide file paths from sldIdLst
  const slidePaths: string[] = [];
  const sldIdRegex = /<p:sldId\b[^>]*\br:id="([^"]+)"/g;
  let sldMatch: RegExpExecArray | null;
  while ((sldMatch = sldIdRegex.exec(presXml)) !== null) {
    const rel = presRels[sldMatch[1]];
    if (rel?.target) {
      slidePaths.push(resolveZipTarget('ppt', rel.target));
    }
  }

  // Fallback if sldIdLst ordering wasn't matched
  if (slidePaths.length === 0) {
    const fallbackSlides = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((a, b) => {
        const na = Number(a.match(/slide(\d+)\.xml/i)?.[1] || 0);
        const nb = Number(b.match(/slide(\d+)\.xml/i)?.[1] || 0);
        return na - nb;
      });
    slidePaths.push(...fallbackSlides);
  }

  if (slidePaths.length === 0) {
    throw new Error('No slides were found inside the .pptx file.');
  }

  // Extract metadata from docProps/core.xml
  const coreXml = (await zip.file('docProps/core.xml')?.async('string')) || '';
  const coreTitle = decodeXmlEntities(
    coreXml.match(/<dc:title>([\s\S]*?)<\/dc:title>/)?.[1]?.trim() || ''
  );
  const coreSubject = decodeXmlEntities(
    coreXml.match(/<dc:subject>([\s\S]*?)<\/dc:subject>/)?.[1]?.trim() || ''
  );

  // Extract theme palette and fonts from ppt/theme/theme1.xml
  const themeXml = (await zip.file('ppt/theme/theme1.xml')?.async('string')) || '';
  const majorFont =
    themeXml.match(/<a:majorFont>[\s\S]*?<a:latin\s+typeface="([^"]+)"/)?.[1] || 'Plus Jakarta Sans';
  const minorFont =
    themeXml.match(/<a:minorFont>[\s\S]*?<a:latin\s+typeface="([^"]+)"/)?.[1] || 'DM Sans';
  const themeAccent1 =
    themeXml.match(/<a:accent1>[\s\S]*?<a:srgbClr\s+val="([0-9a-fA-F]{6})"/)?.[1] || '34D399';
  const themeDk1 =
    themeXml.match(/<a:dk1>[\s\S]*?<a:srgbClr\s+val="([0-9a-fA-F]{6})"/)?.[1] || '0F172A';
  const themeLt1 =
    themeXml.match(/<a:lt1>[\s\S]*?<a:srgbClr\s+val="([0-9a-fA-F]{6})"/)?.[1] || 'FFFFFF';

  const baseName = filename.replace(/\.pptx$/i, '').trim() || 'Imported Presentation';
  const deckTitleCandidate = coreTitle || baseName;

  let detectedBgHex: string | undefined;
  let detectedRtl = /rtl="1"/.test(presXml);
  const slides: Slide[] = [];

  for (let i = 0; i < slidePaths.length; i++) {
    const slidePath = slidePaths[i];
    const slideFile = zip.file(slidePath);
    if (!slideFile) continue;

    const slideXml = await slideFile.async('string');
    const parsed = parsePptxSlideXml(slideXml);
    if (!detectedBgHex && parsed.bgHex) {
      detectedBgHex = parsed.bgHex;
    }

    const slideFileName = slidePath.split('/').pop() || '';
    const slideRelsPath = `ppt/slides/_rels/${slideFileName}.rels`;
    const slideRelsXml = (await zip.file(slideRelsPath)?.async('string')) || '';
    const slideRels = parseRelsMap(slideRelsXml);

    // Speaker Notes
    let speakerNotes = '';
    const notesEntry = Object.values(slideRels).find((r) => r.type.includes('notesSlide'));
    if (notesEntry) {
      const notesPath = resolveZipTarget('ppt/slides', notesEntry.target);
      const notesXml = (await zip.file(notesPath)?.async('string')) || '';
      const noteParas = extractParagraphsFromBlock(notesXml)
        .map((p) => p.text)
        .filter((txt) => !/^\d+$/.test(txt));
      speakerNotes = noteParas.join('\n').trim();
    }

    // First valid image
    let slideImage: SlideImage | undefined;
    for (const ref of parsed.imageRefs) {
      const imgRel = slideRels[ref.rId];
      if (!imgRel?.target) continue;
      const mediaPath = resolveZipTarget('ppt/slides', imgRel.target);
      const mediaFile = zip.file(mediaPath);
      if (!mediaFile) continue;
      const base64 = await mediaFile.async('base64');
      const mime = inferImageMimeType(mediaPath);
      slideImage = {
        url: `data:${mime};base64,${base64}`,
        alt: `Slide ${i + 1} visual`,
        source: 'upload',
        placement: inferPlacement(ref),
      };
      break;
    }

    // Filter out page counter footers like "01 / 05" or exact repeated deck title footer near bottom (y > 6,000,000 EMU)
    const contentTexts = parsed.texts.filter((t) => {
      if (t.yEmu > 5_900_000 && (/^\d{1,2}\s*\/\s*\d{1,2}$/.test(t.text) || t.text === deckTitleCandidate)) {
        return false;
      }
      return true;
    });

    if (contentTexts.some((t) => containsRtlCharacters(t.text))) {
      detectedRtl = true;
    }

    // Identify title (largest font size among first items, fallback first item)
    let titleIdx = 0;
    let maxSize = -1;
    contentTexts.forEach((item, idx) => {
      if (item.fontSizePt > maxSize) {
        maxSize = item.fontSizePt;
        titleIdx = idx;
      }
    });

    const title = contentTexts[titleIdx]?.text || `Slide ${i + 1}`;
    const kicker =
      titleIdx > 0 && contentTexts[0].text.length <= 60 ? contentTexts[0].text : undefined;
    const remaining = contentTexts
      .filter((_, idx) => idx !== titleIdx && !(titleIdx > 0 && idx === 0 && kicker))
      .map((item) => item.text);

    const subtitle =
      remaining.length > 0 && remaining[0].length <= 140 && remaining.length > 1
        ? remaining[0]
        : remaining.length === 1 && (i === 0 || i === slidePaths.length - 1 || Boolean(slideImage))
          ? remaining[0]
          : undefined;
    const bullets = subtitle ? remaining.slice(1) : remaining;

    let layout: Slide['layout'] = 'bullets';
    if (i === 0) layout = 'title';
    else if (i === slidePaths.length - 1 && bullets.length <= 4) layout = 'closing';
    else if (slideImage && slideImage.placement === 'right' && bullets.length === 0) {
      layout = 'image-focus';
    }

    slides.push({
      id: makeSlideId('slide'),
      layout,
      kicker,
      title,
      subtitle,
      bullets: bullets.length > 0 ? bullets.slice(0, 8) : undefined,
      image: slideImage,
      speakerNotes,
    });
  }

  const finalBg = normalizeHex(detectedBgHex, themeLt1);
  const bgNum = Number.parseInt(finalBg, 16);
  const bgR = (bgNum >> 16) & 255;
  const bgG = (bgNum >> 8) & 255;
  const bgB = bgNum & 255;
  const isDarkBg = (0.299 * bgR + 0.587 * bgG + 0.114 * bgB) / 255 < 0.5;

  const importedTheme = normalizeCustomTheme({
    id: makeSlideId('pptx-theme'),
    name: `${deckTitleCandidate.slice(0, 30)} Theme`,
    description: 'Extracted from imported PowerPoint (.pptx) presentation',
    hexBg: finalBg,
    hexSurface: isDarkBg ? '111C16' : 'F1F5F9',
    hexInk: isDarkBg ? (themeLt1 === '000000' ? 'F8FAFC' : themeLt1) : (themeDk1 === 'FFFFFF' ? '0F172A' : themeDk1),
    hexMuted: isDarkBg ? 'CBD5E1' : '475569',
    hexAccent: themeAccent1,
    displayFont: majorFont,
    bodyFont: minorFont,
    accentStyle: 'top-bar',
    cornerStyle: 'rounded',
  });

  const langGuess = detectedRtl ? 'Arabic' : coreSubject || 'English';
  const langMeta = resolveLanguageMeta(langGuess);

  return normalizeGeneratedDeck(
    {
      id: makeSlideId('deck'),
      title: deckTitleCandidate,
      subtitle: coreSubject || `Imported ${slides.length} slides from ${filename}`,
      language: langMeta.name,
      languageCode: langMeta.code,
      rtl: detectedRtl,
      tone: 'Executive',
      theme: importedTheme.id,
      customTheme: importedTheme,
      slides,
    },
    importedTheme.id,
    langMeta.name,
    'Executive'
  );
}

export async function importPresentationOrThemeFile(file: File): Promise<ImportedFileResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.json')) {
    const text = await file.text();
    return parseDeckOrThemeJson(text, file.name);
  }
  if (name.endsWith('.pptx')) {
    const buffer = await file.arrayBuffer();
    const deck = await parsePptxBuffer(buffer, file.name);
    return { kind: 'deck', deck };
  }
  throw new Error('Unsupported file format. Please open a .pptx, .json deck, or .theme.json file.');
}
