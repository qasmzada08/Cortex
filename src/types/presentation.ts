export type SlideLayout =
  | 'title'
  | 'bullets'
  | 'two-column'
  | 'metric'
  | 'quote'
  | 'image-focus'
  | 'closing';

export type SlideImagePlacement = 'right' | 'left' | 'background' | 'frame';

export interface SlideImage {
  url: string;
  alt: string;
  caption?: string;
  source?: 'camera' | 'upload' | 'web' | 'ai-graphic';
  placement: SlideImagePlacement;
}

export interface WebPhotoResult {
  id: string;
  title: string;
  url: string;
  thumbUrl: string;
  attribution?: string;
}

export type BuiltInThemeId =
  | 'matrix'
  | 'editorial-ivory'
  | 'cobalt-executive'
  | 'midnight-slate'
  | 'nordic-sage'
  | 'neon-aurora';

export type DeckThemeId = BuiltInThemeId | (string & {});

export type ThinkingDepth = 'fast' | 'deep' | 'max';

export type ThemeAccentStyle = 'top-bar' | 'left-rail' | 'framed' | 'minimal';
export type ThemeCornerStyle = 'rounded' | 'sharp';

export interface CustomThemeDefinition {
  id: string;
  name: string;
  description: string;
  hexBg: string;
  hexSurface: string;
  hexInk: string;
  hexMuted: string;
  hexAccent: string;
  displayFont: string;
  bodyFont: string;
  accentStyle: ThemeAccentStyle;
  cornerStyle: ThemeCornerStyle;
  thinkingSummary?: string;
}

export type DeckTone =
  | 'Executive'
  | 'Academic'
  | 'Storytelling'
  | 'Technical'
  | 'Persuasive';

export interface SlideMetric {
  value: string;
  label: string;
}

export interface SlideColumn {
  heading: string;
  points: string[];
}

export interface Slide {
  id: string;
  layout: SlideLayout;
  kicker?: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  leftColumn?: SlideColumn;
  rightColumn?: SlideColumn;
  metrics?: SlideMetric[];
  quote?: string;
  quoteAuthor?: string;
  image?: SlideImage;
  speakerNotes?: string;
}

export interface PresentationDeck {
  id: string;
  title: string;
  subtitle: string;
  language: string;
  languageCode: string;
  rtl: boolean;
  tone: DeckTone | string;
  theme: DeckThemeId;
  customTheme?: CustomThemeDefinition;
  thinkingSummary?: string;
  slides: Slide[];
  updatedAt: string;
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  script: string;
  sampleTopic: string;
}

export interface GenerateDeckPayload {
  topic: string;
  language: string;
  slideCount: number;
  tone: string;
  theme: DeckThemeId;
  customTheme?: CustomThemeDefinition;
  thinkingDepth?: ThinkingDepth;
  sourceNotes?: string;
}

export interface TranslateDeckPayload {
  deck: PresentationDeck;
  targetLanguage: string;
}

export interface RefineSlidePayload {
  slide: Slide;
  deckTitle: string;
  language: string;
  rtl: boolean;
  instruction: string;
  thinkingDepth?: ThinkingDepth;
}
