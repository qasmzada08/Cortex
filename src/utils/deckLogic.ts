import type {
  DeckThemeId,
  PresentationDeck,
  Slide,
  SlideImage,
  SlideImagePlacement,
  SlideLayout,
} from '../types/presentation.ts';
import { resolveLanguageMeta } from './languages.ts';

export interface ThemeTokens {
  id: DeckThemeId;
  name: string;
  description: string;
  canvasBg: string;
  surfaceBg: string;
  inkPrimary: string;
  inkMuted: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  borderSubtle: string;
  hexBg: string;
  hexSurface: string;
  hexInk: string;
  hexMuted: string;
  hexAccent: string;
}

export const DECK_THEMES: Record<DeckThemeId, ThemeTokens> = {
  matrix: {
    id: 'matrix',
    name: 'Matrix Phosphor',
    description: 'Deep obsidian terminal stage with crisp phosphor-emerald hierarchy',
    canvasBg: 'bg-[#040A06]',
    surfaceBg: 'bg-[#0B1911]',
    inkPrimary: 'text-emerald-50',
    inkMuted: 'text-emerald-200/80',
    accentBg: 'bg-emerald-400',
    accentText: 'text-emerald-400',
    accentBorder: 'border-emerald-400/35',
    borderSubtle: 'border-emerald-800/70',
    hexBg: '040A06',
    hexSurface: '0B1911',
    hexInk: 'ECFDF5',
    hexMuted: 'A7F3D0',
    hexAccent: '34D399',
  },
  'editorial-ivory': {
    id: 'editorial-ivory',
    name: 'Editorial Ivory',
    description: 'Warm paper canvas with crisp obsidian ink and cobalt focus',
    canvasBg: 'bg-[#FAF9F6]',
    surfaceBg: 'bg-[#F1EFEA]',
    inkPrimary: 'text-slate-900',
    inkMuted: 'text-slate-600',
    accentBg: 'bg-blue-700',
    accentText: 'text-blue-700',
    accentBorder: 'border-blue-700/25',
    borderSubtle: 'border-slate-900/10',
    hexBg: 'FAF9F6',
    hexSurface: 'F1EFEA',
    hexInk: '0F172A',
    hexMuted: '475569',
    hexAccent: '1D4ED8',
  },
  'cobalt-executive': {
    id: 'cobalt-executive',
    name: 'Cobalt Executive',
    description: 'Bright studio white with architectural slate lines',
    canvasBg: 'bg-white',
    surfaceBg: 'bg-slate-50',
    inkPrimary: 'text-slate-950',
    inkMuted: 'text-slate-600',
    accentBg: 'bg-blue-600',
    accentText: 'text-blue-600',
    accentBorder: 'border-blue-600/25',
    borderSubtle: 'border-slate-200',
    hexBg: 'FFFFFF',
    hexSurface: 'F8FAFC',
    hexInk: '020617',
    hexMuted: '475569',
    hexAccent: '2563EB',
  },
  'midnight-slate': {
    id: 'midnight-slate',
    name: 'Midnight Slate',
    description: 'Deep navy-slate stage with high-contrast ivory type',
    canvasBg: 'bg-[#0F172A]',
    surfaceBg: 'bg-[#1E293B]',
    inkPrimary: 'text-slate-50',
    inkMuted: 'text-slate-300',
    accentBg: 'bg-sky-400',
    accentText: 'text-sky-400',
    accentBorder: 'border-sky-400/30',
    borderSubtle: 'border-slate-700/80',
    hexBg: '0F172A',
    hexSurface: '1E293B',
    hexInk: 'F8FAFC',
    hexMuted: 'CBD5E1',
    hexAccent: '38BDF8',
  },
  'nordic-sage': {
    id: 'nordic-sage',
    name: 'Nordic Sage',
    description: 'Soft mineral canvas with forest-emerald emphasis',
    canvasBg: 'bg-[#F4F7F5]',
    surfaceBg: 'bg-[#E7EFEA]',
    inkPrimary: 'text-emerald-950',
    inkMuted: 'text-slate-600',
    accentBg: 'bg-emerald-700',
    accentText: 'text-emerald-700',
    accentBorder: 'border-emerald-700/25',
    borderSubtle: 'border-emerald-950/10',
    hexBg: 'F4F7F5',
    hexSurface: 'E7EFEA',
    hexInk: '022C22',
    hexMuted: '475569',
    hexAccent: '047857',
  },
};

const VALID_LAYOUTS: ReadonlySet<SlideLayout> = new Set([
  'title',
  'bullets',
  'two-column',
  'metric',
  'quote',
  'image-focus',
  'closing',
]);

const VALID_IMAGE_PLACEMENTS: ReadonlySet<SlideImagePlacement> = new Set([
  'right',
  'left',
  'background',
  'frame',
]);

export function makeSlideId(prefix = 'slide'): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function reorderSlides(
  slides: Slide[],
  fromIndex: number,
  toIndex: number
): Slide[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= slides.length ||
    toIndex >= slides.length ||
    fromIndex === toIndex
  ) {
    return slides;
  }
  const next = [...slides];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function duplicateSlide(slides: Slide[], index: number): Slide[] {
  if (index < 0 || index >= slides.length) return slides;
  const source = slides[index];
  const copy: Slide = {
    ...source,
    id: makeSlideId('slide'),
    bullets: source.bullets ? [...source.bullets] : undefined,
    leftColumn: source.leftColumn
      ? { heading: source.leftColumn.heading, points: [...source.leftColumn.points] }
      : undefined,
    rightColumn: source.rightColumn
      ? { heading: source.rightColumn.heading, points: [...source.rightColumn.points] }
      : undefined,
    metrics: source.metrics ? source.metrics.map((m) => ({ ...m })) : undefined,
  };
  const next = [...slides];
  next.splice(index + 1, 0, copy);
  return next;
}

export function deleteSlide(slides: Slide[], index: number): Slide[] {
  if (slides.length <= 1 || index < 0 || index >= slides.length) {
    return slides;
  }
  return slides.filter((_, i) => i !== index);
}

export function createBlankSlide(layout: SlideLayout, rtl: boolean): Slide {
  const id = makeSlideId('slide');
  if (layout === 'title') {
    return {
      id,
      layout: 'title',
      kicker: rtl ? 'عنوان القسم' : 'Section Title',
      title: rtl ? 'شريحة عنوان جديدة' : 'New Title Slide',
      subtitle: rtl ? 'أضف عنواناً فرعياً موجزاً هنا' : 'Add a concise subtitle here',
      speakerNotes: '',
    };
  }
  if (layout === 'two-column') {
    return {
      id,
      layout: 'two-column',
      kicker: rtl ? 'مقارنة' : 'Comparison',
      title: rtl ? 'مقارنة بين مسارين' : 'Two-Column Overview',
      leftColumn: {
        heading: rtl ? 'الركيزة الأولى' : 'Primary Track',
        points: [
          rtl ? 'النقطة الأساسية الأولى' : 'First key point',
          rtl ? 'النقطة الأساسية الثانية' : 'Second key point',
        ],
      },
      rightColumn: {
        heading: rtl ? 'الركيزة الثانية' : 'Secondary Track',
        points: [
          rtl ? 'النقطة المقابلة الأولى' : 'Corresponding point one',
          rtl ? 'النقطة المقابلة الثانية' : 'Corresponding point two',
        ],
      },
      speakerNotes: '',
    };
  }
  if (layout === 'metric') {
    return {
      id,
      layout: 'metric',
      kicker: rtl ? 'مؤشرات رئيسية' : 'Key Metrics',
      title: rtl ? 'الأثر بالأرقام' : 'Measured Impact',
      metrics: [
        { value: '42%', label: rtl ? 'نمو سنوي' : 'Year-over-year growth' },
        { value: '3.4x', label: rtl ? 'تسريع الإنجاز' : 'Faster delivery' },
        { value: '18', label: rtl ? 'دولة مستفيدة' : 'Markets covered' },
      ],
      speakerNotes: '',
    };
  }
  if (layout === 'quote') {
    return {
      id,
      layout: 'quote',
      kicker: rtl ? 'رؤية محورية' : 'Perspective',
      title: rtl ? 'اقتباس ملهم' : 'Key Perspective',
      quote: rtl
        ? 'الوضوح في الفكرة هو أساس الإقناع عبر كل الثقافات واللغات.'
        : 'Clarity of thought travels across every language and culture.',
      quoteAuthor: rtl ? 'فريق الإستراتيجية' : 'Strategy Editorial Team',
      speakerNotes: '',
    };
  }
  if (layout === 'image-focus') {
    return {
      id,
      layout: 'image-focus',
      kicker: rtl ? 'عرض مرئي' : 'Visual Showcase',
      title: rtl ? 'شريحة صورة وعرض بصري' : 'Visual Focus Slide',
      subtitle: rtl ? 'أضف صورة من الويب أو التقط صورة بالكاميرا أو أنشئ رسماً توضيحياً' : 'Attach a web photo, capture from camera, or create a visual diagram',
      speakerNotes: '',
    };
  }
  if (layout === 'closing') {
    return {
      id,
      layout: 'closing',
      kicker: rtl ? 'الخطوات التالية' : 'Next Steps',
      title: rtl ? 'شكراً لحسن استماعكم' : 'Thank You & Next Steps',
      subtitle: rtl ? 'نرحب بأسئلتكم وملاحظاتكم' : 'Questions, discussion, and immediate actions',
      bullets: [
        rtl ? 'مراجعة الأولويات المقترحة' : 'Review proposed priorities',
        rtl ? 'تحديد الجدول الزمني للتنفيذ' : 'Confirm rollout timeline',
      ],
      speakerNotes: '',
    };
  }
  return {
    id,
    layout: 'bullets',
    kicker: rtl ? 'نقاط رئيسية' : 'Key Points',
    title: rtl ? 'شريحة محتوى جديدة' : 'New Content Slide',
    subtitle: rtl ? 'ملخص موجز للفكرة الرئيسية' : 'Brief summary of the central idea',
    bullets: [
      rtl ? 'الفكرة الأولى مع تفاصيل واضحة' : 'First key insight with clear supporting context',
      rtl ? 'الفكرة الثانية والنتيجة المتوقعة' : 'Second core takeaway and expected outcome',
      rtl ? 'الفكرة الثالثة وخطوة التنفيذ' : 'Third priority and practical next step',
    ],
    speakerNotes: '',
  };
}

export interface DeckValidationResult {
  valid: boolean;
  error?: string;
}

export function validateDeckInput(input: {
  topic: string;
  language: string;
  slideCount: number;
}): DeckValidationResult {
  const topic = input.topic.trim();
  const language = input.language.trim();
  if (topic.length < 3) {
    return {
      valid: false,
      error: 'Please enter a presentation topic (at least 3 characters).',
    };
  }
  if (!language) {
    return {
      valid: false,
      error: 'Please select or enter a target language.',
    };
  }
  if (!Number.isInteger(input.slideCount) || input.slideCount < 3 || input.slideCount > 15) {
    return {
      valid: false,
      error: 'Slide count must be between 3 and 15.',
    };
  }
  return { valid: true };
}

export function normalizeSlide(raw: Partial<Slide>, fallbackIndex: number): Slide {
  const layout: SlideLayout =
    raw.layout && VALID_LAYOUTS.has(raw.layout) ? raw.layout : 'bullets';

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `slide-${fallbackIndex + 1}`,
    layout,
    kicker: typeof raw.kicker === 'string' ? raw.kicker.trim() : undefined,
    title:
      typeof raw.title === 'string' && raw.title.trim()
        ? raw.title.trim()
        : `Slide ${fallbackIndex + 1}`,
    subtitle: typeof raw.subtitle === 'string' ? raw.subtitle.trim() : undefined,
    bullets: Array.isArray(raw.bullets)
      ? raw.bullets.filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
      : undefined,
    leftColumn:
      raw.leftColumn && typeof raw.leftColumn.heading === 'string'
        ? {
            heading: raw.leftColumn.heading.trim(),
            points: Array.isArray(raw.leftColumn.points)
              ? raw.leftColumn.points.filter(
                  (p): p is string => typeof p === 'string' && p.trim().length > 0
                )
              : [],
          }
        : undefined,
    rightColumn:
      raw.rightColumn && typeof raw.rightColumn.heading === 'string'
        ? {
            heading: raw.rightColumn.heading.trim(),
            points: Array.isArray(raw.rightColumn.points)
              ? raw.rightColumn.points.filter(
                  (p): p is string => typeof p === 'string' && p.trim().length > 0
                )
              : [],
          }
        : undefined,
    metrics: Array.isArray(raw.metrics)
      ? raw.metrics
          .filter(
            (m): m is { value: string; label: string } =>
              Boolean(m) && typeof m.value === 'string' && typeof m.label === 'string'
          )
          .slice(0, 4)
      : undefined,
    quote: typeof raw.quote === 'string' ? raw.quote.trim() : undefined,
    quoteAuthor: typeof raw.quoteAuthor === 'string' ? raw.quoteAuthor.trim() : undefined,
    image: normalizeSlideImage(raw.image),
    speakerNotes: typeof raw.speakerNotes === 'string' ? raw.speakerNotes.trim() : '',
  };
}

export function normalizeSlideImage(raw: Partial<SlideImage> | undefined): SlideImage | undefined {
  if (!raw || typeof raw.url !== 'string' || !raw.url.trim()) {
    return undefined;
  }
  const placement: SlideImagePlacement =
    raw.placement && VALID_IMAGE_PLACEMENTS.has(raw.placement) ? raw.placement : 'right';
  const source =
    raw.source === 'camera' ||
    raw.source === 'upload' ||
    raw.source === 'web' ||
    raw.source === 'ai-graphic'
      ? raw.source
      : 'web';

  return {
    url: raw.url.trim(),
    alt: typeof raw.alt === 'string' && raw.alt.trim() ? raw.alt.trim() : 'Slide visual',
    caption: typeof raw.caption === 'string' && raw.caption.trim() ? raw.caption.trim() : undefined,
    source,
    placement,
  };
}

export function sanitizeSvgMarkup(rawSvg: string): string | null {
  const match = rawSvg.match(/<svg[\s\S]*?<\/svg>/i);
  if (!match) return null;
  let cleaned = match[0]
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"])[\s\S]*?\1/gi, '')
    .replace(/javascript:/gi, '');
  if (!/xmlns=/.test(cleaned)) {
    cleaned = cleaned.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return cleaned;
}

export function normalizeGeneratedDeck(
  raw: Partial<PresentationDeck>,
  fallbackTheme: DeckThemeId,
  fallbackLanguage: string,
  fallbackTone = 'Executive'
): PresentationDeck {
  const langMeta = resolveLanguageMeta(raw.language || fallbackLanguage);
  const rawSlides = Array.isArray(raw.slides) ? raw.slides : [];
  const slides =
    rawSlides.length > 0
      ? rawSlides.map((s, idx) => normalizeSlide(s, idx))
      : [createBlankSlide('title', langMeta.rtl)];

  const theme: DeckThemeId =
    typeof raw.theme === 'string' && raw.theme.trim() ? raw.theme.trim() : fallbackTheme;

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : makeSlideId('deck'),
    title:
      typeof raw.title === 'string' && raw.title.trim()
        ? raw.title.trim()
        : slides[0]?.title || 'Untitled Presentation',
    subtitle: typeof raw.subtitle === 'string' ? raw.subtitle.trim() : '',
    language: langMeta.name,
    languageCode: raw.languageCode || langMeta.code,
    rtl: typeof raw.rtl === 'boolean' ? raw.rtl : langMeta.rtl,
    tone: raw.tone || fallbackTone,
    theme,
    customTheme: raw.customTheme,
    thinkingSummary:
      typeof raw.thinkingSummary === 'string' && raw.thinkingSummary.trim()
        ? raw.thinkingSummary.trim()
        : undefined,
    slides,
    updatedAt: new Date().toISOString(),
  };
}

const REFERENCES_LABELS: Record<
  string,
  { kicker: string; title: string; subtitle: string; notes: string; fallbackBullets: (topic: string) => string[] }
> = {
  ar: {
    kicker: 'المصادر والتوثيق',
    title: 'المراجع والمصادر',
    subtitle: 'الوثائق والتقارير المرجعية المعتمدة في هذا الموضوع',
    notes: 'استعرض المراجع والمصادر الرئيسية التي تدعم البيانات والتوصيات الواردة في العرض.',
    fallbackBullets: (topic) => [
      `أدبيات وتقارير بحثية محكمة حول: ${topic}`,
      'إحصاءات ومعايير منشورة من جهات تنظيمية ودولية متخصصة',
      'دراسات حالة وبيانات قطاعية مرجعية محدثة',
    ],
  },
  ja: {
    kicker: '出典・引用資料',
    title: '参考文献',
    subtitle: '本プレゼンテーションで参照した主要資料とデータ出典',
    notes: '各スライドのデータや提言を裏付ける参考文献・一次資料を案内します。',
    fallbackBullets: (topic) => [
      `${topic}に関する査読付き研究論文および技術報告書`,
      '公的機関・国際エネルギー／産業統計データおよび標準規格',
      '最新の業界ベンチマーク・導入事例レポート',
    ],
  },
  es: {
    kicker: 'Fuentes y Documentación',
    title: 'Referencias',
    subtitle: 'Estudios, informes y fuentes que respaldan este análisis',
    notes: 'Comparta las referencias y fuentes técnicas clave que sustentan los datos presentados.',
    fallbackBullets: (topic) => [
      `Informes sectoriales y literatura técnica sobre: ${topic}`,
      'Estadísticas oficiales y marcos regulatorios de organismos internacionales',
      'Estudios de caso comparativos y puntos de referencia de la industria',
    ],
  },
  fr: {
    kicker: 'Sources et Bibliographie',
    title: 'Références',
    subtitle: 'Études, rapports officiels et sources cités dans cette présentation',
    notes: 'Présentez les sources clés et références documentaires appuyant l’analyse.',
    fallbackBullets: (topic) => [
      `Publications scientifiques et rapports de référence sur : ${topic}`,
      'Données statistiques et standards publiés par les institutions officielles',
      'Études de cas comparatives et analyses sectorielles récentes',
    ],
  },
  de: {
    kicker: 'Quellenverzeichnis',
    title: 'Referenzen & Quellen',
    subtitle: 'Zitierte Fachliteratur, Studien und offizielle Datengrundlagen',
    notes: 'Verweisen Sie abschließend auf die wichtigsten Quellen und Datengrundlagen.',
    fallbackBullets: (topic) => [
      `Aktuelle Fachstudien und Forschungsberichte zum Thema: ${topic}`,
      'Offizielle Statistiken und Richtlinien zuständiger Fachbehörden',
      'Branchen-Benchmarks und dokumentierte Praxisbeispiele',
    ],
  },
  az: {
    kicker: 'Mənbələr və İstinadlar',
    title: 'İstinadlar və Ədəbiyyat',
    subtitle: 'Təqdimatda istifadə olunan əsas araşdırma və məlumat mənbələri',
    notes: 'Təqdimatdakı fakt və göstəriciləri dəstəkləyən əsas mənbələri qeyd edin.',
    fallbackBullets: (topic) => [
      `${topic} üzrə akademik tədqiqatlar və sahə hesabatları`,
      'Rəsmi statistika qurumlarının və beynəlxalq təşkilatların məlumatları',
      'Müqayisəli təcrübə və standartlar üzrə texniki sənədlər',
    ],
  },
};

const REFERENCE_HEADING_PATTERN =
  /referenc|source|cit|bibliograph|further reading|مراجع|مصادر|参考|文献|출전|참고|fuentes|referencias|références|quellen|istinad|mənbə|источник|литератур/i;

export function ensureReferencesSlide(deck: PresentationDeck, topicHint?: string): PresentationDeck {
  if (!deck.slides || deck.slides.length === 0) return deck;

  const lastSlide = deck.slides[deck.slides.length - 1];
  const lastHeading = `${lastSlide.kicker || ''} ${lastSlide.title || ''}`.trim();
  if (REFERENCE_HEADING_PATTERN.test(lastHeading)) {
    return deck;
  }

  const langCode = (deck.languageCode || 'en').toLowerCase().split('-')[0];
  const copy = REFERENCES_LABELS[langCode] ?? {
    kicker: 'Sources & Further Reading',
    title: 'References',
    subtitle: 'Key studies, datasets, and authoritative sources referenced in this deck',
    notes: 'Highlight the authoritative sources and reference materials backing the deck findings.',
    fallbackBullets: (topic: string) => [
      `Peer-reviewed literature & industry reports on: ${topic}`,
      'Official institutional datasets, standards, and regulatory filings',
      'Empirical case studies and comparative benchmark analyses',
    ],
  };

  const topicLabel = (topicHint || deck.title || 'this topic').trim();
  const refSlide: Slide = {
    id: makeSlideId('ref'),
    layout: 'bullets',
    kicker: copy.kicker,
    title: copy.title,
    subtitle: copy.subtitle,
    bullets: copy.fallbackBullets(topicLabel),
    speakerNotes: copy.notes,
  };

  return {
    ...deck,
    slides: [...deck.slides, refSlide],
  };
}

