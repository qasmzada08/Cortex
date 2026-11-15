import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  DECK_THEMES,
  ensureReferencesSlide,
  normalizeGeneratedDeck,
  normalizeSlide,
  sanitizeSvgMarkup,
  validateDeckInput,
} from './src/utils/deckLogic.ts';
import {
  extractThoughtText,
  normalizeCustomTheme,
  resolveDeckTheme,
} from './src/utils/themeLogic.ts';
import { resolveLanguageMeta } from './src/utils/languages.ts';
import type {
  CustomThemeDefinition,
  DeckThemeId,
  PresentationDeck,
  Slide,
  ThinkingDepth,
} from './src/types/presentation.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
const GEMINI_MODELS = Array.from(
  new Set([
    DEFAULT_GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ])
).filter(Boolean);

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please check the Settings > Secrets panel.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function callGeminiWithFallback<T>(
  requestBuilder: (model: string) => Promise<T>,
  fallbackModels: string[] = GEMINI_MODELS
): Promise<T> {
  let lastError: unknown;

  for (const model of fallbackModels) {
    try {
      return await requestBuilder(model);
    } catch (error) {
      lastError = error;
      const raw = error instanceof Error ? error.message : String(error);
      const isModelIssue =
        raw.includes('model') ||
        raw.includes('not found') ||
        raw.includes('not supported') ||
        raw.includes('404') ||
        raw.includes('invalid model');
      if (!isModelIssue) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gemini model request failed.');
}

const SLIDE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    layout: {
      type: Type.STRING,
      description:
        'Must be one of: title, bullets, two-column, metric, quote, closing.',
    },
    kicker: { type: Type.STRING },
    title: { type: Type.STRING },
    subtitle: { type: Type.STRING },
    bullets: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    leftColumn: {
      type: Type.OBJECT,
      properties: {
        heading: { type: Type.STRING },
        points: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    },
    rightColumn: {
      type: Type.OBJECT,
      properties: {
        heading: { type: Type.STRING },
        points: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    },
    metrics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          label: { type: Type.STRING },
        },
      },
    },
    quote: { type: Type.STRING },
    quoteAuthor: { type: Type.STRING },
    speakerNotes: { type: Type.STRING },
  },
  required: ['layout', 'title'],
};

const DECK_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    subtitle: { type: Type.STRING },
    language: { type: Type.STRING },
    reasoningSummary: {
      type: Type.STRING,
      description: 'Concise 2-4 sentence architectural reasoning explaining narrative arc, audience framing, and slide pacing.',
    },
    slides: {
      type: Type.ARRAY,
      items: SLIDE_SCHEMA,
    },
  },
  required: ['title', 'slides'],
};

function resolveThinkingLevel(depth: unknown): ThinkingLevel {
  const mode = String(depth || 'deep').toLowerCase() as ThinkingDepth;
  if (mode === 'fast') return ThinkingLevel.LOW;
  if (mode === 'max') return 'XHIGH' as ThinkingLevel;
  return ThinkingLevel.HIGH;
}

function mapGeminiError(error: unknown): { status: number; message: string } {
  const raw = error instanceof Error ? error.message : String(error);
  const statusMatch = raw.match(/\b(400|401|403|404|429|500|502|503)\b/);
  const status = statusMatch ? Number(statusMatch[1]) : 500;

  if (raw.includes('GEMINI_API_KEY') || raw.includes('API_KEY_INVALID') || status === 403) {
    return {
      status: status === 403 ? 403 : 500,
      message:
        'Gemini API key is missing or unauthorized. Please verify your key in Settings > Secrets.',
    };
  }
  if (status === 429 || raw.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'Rate limit reached. Please wait a moment and try again.',
    };
  }
  if (raw.includes('model') || raw.includes('not found') || raw.includes('not supported')) {
    return {
      status: 400,
      message:
        'This Gemini model is unavailable in the current environment. Please check the configured model or use the default model configuration.',
    };
  }
  return {
    status: status >= 400 && status < 600 ? status : 500,
    message: raw || 'Presentation generation failed.',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/presentations/think', async (req, res) => {
    try {
      const { topic, language, slideCount, tone } = req.body ?? {};
      const cleanTopic = String(topic ?? '').trim();
      if (cleanTopic.length < 3) {
        res.status(400).json({ error: 'Please enter a topic (at least 3 characters) to think through.' });
        return;
      }

      const langMeta = resolveLanguageMeta(String(language || 'English'));
      const count = Math.min(15, Math.max(3, Number(slideCount ?? 6)));
      const toneStr = String(tone || 'Executive');
      const ai = getAiClient();

      const response = await callGeminiWithFallback(async (model) => {
        return await ai.models.generateContent({
          model,
          contents: `Think deeply and plan an editorial outline for a ${count}-slide presentation in ${langMeta.name} (${toneStr} tone) about: "${cleanTopic}".
Produce:
1. "thesis": One sharp central thesis in ${langMeta.name}.
2. "audienceAngle": Who this deck persuades and what decision it drives (in ${langMeta.name}).
3. "outline": Concise bullet-by-bullet slide plan (${count} numbered points, with the final point dedicated to a "References" / sources slide in ${langMeta.name}) ready to paste as source notes (one bullet per slide, brief and actionable).
4. "narrativeStrategy": One sentence on the rhetorical arc in ${langMeta.name}.`,
          config: {
            systemInstruction:
              'You are Cortex, an analytical presentation strategist. Reason step by step about story arc, evidence, and audience clarity before delivering the structured plan.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                thesis: { type: Type.STRING },
                audienceAngle: { type: Type.STRING },
                outline: { type: Type.STRING },
              },
              required: ['thesis', 'audienceAngle', 'outline'],
            },
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.HIGH,
              includeThoughts: true,
            },
          },
        });
      });

      const parsed = JSON.parse(response.text?.trim() || '{}') as {
        thesis?: string;
        audienceAngle?: string;
        outline?: string;
      };
      const thoughts = extractThoughtText(
        response.candidates,
        [parsed.thesis, parsed.audienceAngle].filter(Boolean).join('\n\n')
      );

      res.json({
        thesis: parsed.thesis?.trim() || '',
        audienceAngle: parsed.audienceAngle?.trim() || '',
        outline: parsed.outline?.trim() || '',
        thinkingSummary: thoughts,
      });
    } catch (error) {
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  app.post('/api/themes/generate', async (req, res) => {
    try {
      const { prompt, topic, tone, language, currentTheme, thinkingDepth } = req.body ?? {};
      const cleanPrompt = String(prompt ?? '').trim();
      const cleanTopic = String(topic ?? '').trim();
      if (cleanPrompt.length < 3 && cleanTopic.length < 3) {
        res.status(400).json({ error: 'Describe the PPTX theme style or provide a presentation topic.' });
        return;
      }

      const contextLines: string[] = [];
      if (cleanTopic) {
        contextLines.push(`Presentation Topic: "${cleanTopic}"`);
      }
      if (tone) {
        contextLines.push(`Editorial Tone: ${String(tone)}`);
      }
      if (language) {
        contextLines.push(`Presentation Language: ${String(language)}`);
      }
      if (currentTheme && typeof currentTheme === 'object') {
        const cur = normalizeCustomTheme(currentTheme as Partial<CustomThemeDefinition>);
        contextLines.push(
          `Existing Draft Theme to refine based on user feedback: ${JSON.stringify({
            name: cur.name,
            hexBg: cur.hexBg,
            hexSurface: cur.hexSurface,
            hexInk: cur.hexInk,
            hexMuted: cur.hexMuted,
            hexAccent: cur.hexAccent,
            displayFont: cur.displayFont,
            bodyFont: cur.bodyFont,
            accentStyle: cur.accentStyle,
            cornerStyle: cur.cornerStyle,
          })}`
        );
      }

      const directive = cleanPrompt
        ? `User direction / visual brief: "${cleanPrompt}"`
        : `Design a bespoke visual theme that fits the topic "${cleanTopic}" authentically.`;

      const thinkingLevel = resolveThinkingLevel(thinkingDepth || 'deep');
      const ai = getAiClient();
      const response = await callGeminiWithFallback(async (model) => {
        return await ai.models.generateContent({
          model,
          contents: `Design a complete, high-contrast PowerPoint (.pptx) and presentation slide theme.
${directive}
${contextLines.length > 0 ? contextLines.join('\n') : ''}

Reason carefully about WCAG readability (>= 7:1 contrast between hexBg and hexInk), card surface separation (hexSurface distinct from hexBg), harmonious muted text (hexMuted), typography pairing,[...]

Allowed displayFont / bodyFont values (choose exact strings):
"Plus Jakarta Sans", "DM Sans", "JetBrains Mono", "Georgia", "Arial", "Trebuchet MS", "Calibri"

Allowed accentStyle values: "top-bar", "left-rail", "framed", "minimal"
Allowed cornerStyle values: "rounded", "sharp"
All hex colors MUST be 6-character uppercase hex without '#' (e.g. "040A06", "ECFDF5", "10B981").`,
          config: {
            systemInstruction:
              'You are a world-class presentation art director and PowerPoint theme architect. Produce a balanced, crisp, accessible PPTX theme.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                hexBg: { type: Type.STRING },
                hexSurface: { type: Type.STRING },
                hexInk: { type: Type.STRING },
                hexMuted: { type: Type.STRING },
                hexAccent: { type: Type.STRING },
                displayFont: { type: Type.STRING },
                bodyFont: { type: Type.STRING },
                accentStyle: { type: Type.STRING },
                cornerStyle: { type: Type.STRING },
                designRationale: { type: Type.STRING },
              },
              required: [
                'name',
                'description',
                'hexBg',
                'hexSurface',
                'hexInk',
                'hexMuted',
                'hexAccent',
                'displayFont',
                'bodyFont',
                'accentStyle',
                'cornerStyle',
              ],
            },
            thinkingConfig: {
              thinkingLevel,
              includeThoughts: thinkingLevel !== ThinkingLevel.LOW,
            },
          },
        });
      });

      const parsed = JSON.parse(response.text?.trim() || '{}') as Partial<CustomThemeDefinition> & {
        designRationale?: string;
      };
      const thoughts = extractThoughtText(response.candidates, parsed.designRationale);
      const existingId =
        currentTheme && typeof (currentTheme as CustomThemeDefinition).id === 'string'
          ? (currentTheme as CustomThemeDefinition).id
          : undefined;
      const customTheme = normalizeCustomTheme(
        {
          ...parsed,
          thinkingSummary: thoughts,
        },
        existingId
      );

      res.json({ theme: customTheme });
    } catch (error) {
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  app.post('/api/presentations/generate', async (req, res) => {
    try {
      const { topic, language, slideCount, tone, theme, customTheme, thinkingDepth, sourceNotes } =
        req.body ?? {};
      const parsedCount = Number(slideCount ?? 6);
      const validation = validateDeckInput({
        topic: String(topic ?? ''),
        language: String(language ?? ''),
        slideCount: parsedCount,
      });

      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const langMeta = resolveLanguageMeta(String(language));
      const normalizedCustom = customTheme
        ? normalizeCustomTheme(customTheme as Partial<CustomThemeDefinition>, String(theme || ''))
        : undefined;
      const validTheme: DeckThemeId =
        typeof theme === 'string' && (theme in DECK_THEMES || normalizedCustom)
          ? theme
          : 'neon-aurora';
      const toneStr = String(tone || 'Executive');
      const thinkingLevel = resolveThinkingLevel(thinkingDepth);
      const notesClause =
        typeof sourceNotes === 'string' && sourceNotes.trim()
          ? `\nIncorporate these source notes/facts:\n${sourceNotes.trim().slice(0, 3000)}`
          : '';

      const ai = getAiClient();
      const response = await callGeminiWithFallback(async (model) => {
        return await ai.models.generateContent({
          model,
          contents: `Create a ${parsedCount}-slide presentation about: "${String(topic).trim()}"
Target language: ${langMeta.name} (write EVERY visible field—kicker, title, subtitle, bullets, column headings, column points, metrics labels, quote, quoteAuthor, and speakerNotes—natively and naturally in ${langMeta.name}).
Tone: ${toneStr}.${notesClause}

Structure rules:
1. Slide 1 must use layout "title".
2. When slide count >= 4, the second-to-last slide must use layout "closing" with 2–3 concrete next-step bullets.
3. The FINAL slide of the presentation MUST ALWAYS be a localized References section (layout "bullets", title translated naturally into ${langMeta.name} such as "References", "المراجع والمصادر", etc.).
4. Vary the middle slides thoughtfully across "bullets", "two-column", "metric" (exactly 3 concise metric items with crisp numbers/units), and "quote" (at most 1 quote slide).
5. Keep slide titles sharp (6–11 words max) and bullets scannable (10–18 words max per bullet, 3–4 bullets per slide).
6. Write practical, spoken-style speakerNotes for each slide in ${langMeta.name}.
7. Include a brief "reasoningSummary" explaining your strategic slide progression.`,
          config: {
            systemInstruction: `You are Cortex, an expert multilingual presentation architect and deep thinker. Reason carefully about narrative flow, evidence hierarchy, and executive impact before delivering the final JSON.`,
            responseMimeType: 'application/json',
            responseSchema: DECK_RESPONSE_SCHEMA,
            thinkingConfig: {
              thinkingLevel,
              includeThoughts: thinkingLevel !== ThinkingLevel.LOW,
            },
          },
        });
      });

      const rawText = response.text?.trim() || '{}';
      const parsed = JSON.parse(rawText) as Partial<PresentationDeck> & {
        reasoningSummary?: string;
      };
      const thinkingSummary = extractThoughtText(response.candidates, parsed.reasoningSummary);
      const rawTopic = String(topic).trim();
      const deck = ensureReferencesSlide(
        normalizeGeneratedDeck(
          {
            ...parsed,
            language: langMeta.name,
            languageCode: langMeta.code,
            rtl: langMeta.rtl,
            tone: toneStr,
            theme: validTheme,
            customTheme: normalizedCustom,
            thinkingSummary,
          },
          validTheme,
          langMeta.name,
          toneStr
        ),
        rawTopic
      );

      res.json({ deck });
    } catch (error) {
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  app.post('/api/presentations/translate', async (req, res) => {
    try {
      const { deck, targetLanguage } = req.body ?? {};
      if (!deck || !Array.isArray(deck.slides) || deck.slides.length === 0) {
        res.status(400).json({ error: 'Valid deck data is required for translation.' });
        return;
      }
      if (!targetLanguage || !String(targetLanguage).trim()) {
        res.status(400).json({ error: 'Please specify a target language.' });
        return;
      }

      const langMeta = resolveLanguageMeta(String(targetLanguage));
      const ai = getAiClient();

      const response = await callGeminiWithFallback(async (model) => {
        return await ai.models.generateContent({
          model,
          contents: `Translate this entire presentation deck accurately and idiomatically into ${langMeta.name}.
Preserve the exact number of slides, slide IDs, layout types, metric values (translate metric labels, keep numeric figures accurate), and overall structure.
Translate title, subtitle, every kicker, slide title, subtitle, bullets, leftColumn, rightColumn, metric labels, quote, quoteAuthor, and speakerNotes into natural ${langMeta.name}.

Input deck JSON:
${JSON.stringify({
  title: deck.title,
  subtitle: deck.subtitle,
  slides: deck.slides,
})}`,
          config: {
            systemInstruction: `You are a native-level localization and presentation translation specialist. Translate content naturally for live presentation delivery in ${langMeta.name} without altering the deck's structure or key metrics.`,
            responseMimeType: 'application/json',
            responseSchema: DECK_RESPONSE_SCHEMA,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });
      });

      const rawText = response.text?.trim() || '{}';
      const parsed = JSON.parse(rawText) as Partial<PresentationDeck>;
      const translatedDeck = normalizeGeneratedDeck(
        {
          ...parsed,
          id: deck.id,
          language: langMeta.name,
          languageCode: langMeta.code,
          rtl: langMeta.rtl,
          tone: deck.tone,
          theme: deck.theme,
          customTheme: deck.customTheme,
          thinkingSummary: deck.thinkingSummary,
        },
        deck.theme || 'neon-aurora',
        langMeta.name,
        deck.tone || 'Executive'
      );

      res.json({ deck: translatedDeck });
    } catch (error) {
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  app.post('/api/presentations/refine-slide', async (req, res) => {
    try {
      const { slide, deckTitle, language, instruction, thinkingDepth } = req.body ?? {};
      if (!slide || !slide.title) {
        res.status(400).json({ error: 'Valid slide data is required.' });
        return;
      }
      if (!instruction || !String(instruction).trim()) {
        res.status(400).json({ error: 'Please provide an edit instruction.' });
        return;
      }

      const langMeta = resolveLanguageMeta(String(language || 'English'));
      const thinkingLevel = resolveThinkingLevel(thinkingDepth);
      const ai = getAiClient();

      const response = await callGeminiWithFallback(async (model) => {
        return await ai.models.generateContent({
          model,
          contents: `Refine the following presentation slide from the deck "${String(deckTitle || '')}".
Output language MUST remain: ${langMeta.name}.
User instruction: "${String(instruction).trim()}"

Current slide JSON:
${JSON.stringify(slide)}`,
          config: {
            systemInstruction: `You are Cortex, an analytical presentation editor. Think through clarity, pacing, and persuasion before returning the improved slide JSON in ${langMeta.name}.`,
            responseMimeType: 'application/json',
            responseSchema: SLIDE_SCHEMA,
            thinkingConfig: {
              thinkingLevel,
              includeThoughts: thinkingLevel !== ThinkingLevel.LOW,
            },
          },
        });
      });

      const rawText = response.text?.trim() || '{}';
      const parsed = JSON.parse(rawText) as Partial<Slide>;
      const updatedSlide = normalizeSlide(
        {
          ...parsed,
          id: slide.id,
          image: parsed.image ?? slide.image,
        },
        0
      );
      const thinkingSummary = extractThoughtText(response.candidates);

      res.json({ slide: updatedSlide, thinkingSummary });
    } catch (error) {
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  app.get('/api/photos/search', async (req, res) => {
    try {
      const rawQuery = String(req.query.q ?? '').trim();
      if (!rawQuery) {
        res.status(400).json({ error: 'Please enter a photo search query.' });
        return;
      }

      let searchTerms = rawQuery;
      // If non-ASCII (e.g. Arabic, Japanese, Korean), translate to concise English image search terms via Gemini if available
      if (/[^-]/.test(rawQuery) && process.env.GEMINI_API_KEY) {
        try {
          const ai = getAiClient();
          const tr = await callGeminiWithFallback(async (model) => {
            return await ai.models.generateContent({
              model,
              contents: `Convert this presentation photo search query into 2-4 concise English keywords suitable for searching stock photography: "${rawQuery}". Reply with only the keywords.`,
              config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
            });
          });
          if (tr.text?.trim()) {
            searchTerms = tr.text.trim().replace(/["\n]/g, ' ').slice(0, 80);
          }
        } catch {
          // Fall back to original query if translation fails
        }
      }

      const apiUrl = new URL('https://commons.wikimedia.org/w/api.php');
      apiUrl.searchParams.set('action', 'query');
      apiUrl.searchParams.set('generator', 'search');
      apiUrl.searchParams.set('gsrnamespace', '6');
      apiUrl.searchParams.set('gsrsearch', `${searchTerms} filetype:bitmap`);
      apiUrl.searchParams.set('gsrlimit', '18');
      apiUrl.searchParams.set('prop', 'imageinfo');
      apiUrl.searchParams.set('iiprop', 'url|mime|extmetadata');
      apiUrl.searchParams.set('iiurlwidth', '960');
      apiUrl.searchParams.set('format', 'json');
      apiUrl.searchParams.set('origin', '*');

      const upstream = await fetch(apiUrl.toString(), {
        headers: {
          'User-Agent': 'Cortex/1.0 (multilingual presentation builder)',
        },
      });

      if (!upstream.ok) {
        res.status(502).json({ error: 'Web photo search service returned an error.' });
        return;
      }

      const json = (await upstream.json()) as {
        query?: {
          pages?: Record<
            string,
            {
              pageid: number;
              title: string;
              imageinfo?: Array<{
                url?: string;
                thumburl?: string;
                mime?: string;
                extmetadata?: {
                  Artist?: { value?: string };
                  LicenseShortName?: { value?: string };
                };
              }>;
            }
          >;
        };
      };

      const pages = Object.values(json.query?.pages ?? {});
      const photos = pages
        .flatMap((page) => {
          const info = page.imageinfo?.[0];
          if (!info?.url || !info.mime?.startsWith('image/')) return [];
          if (info.mime === 'image/svg+xml' || info.mime === 'image/tiff') return [];
          const cleanTitle = page.title
            .replace(/^File:/i, '')
            .replace(/\.[^.]+$/, '')
            .replace(/_/g, ' ');
          const rawArtist = info.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, '').trim();
          const license = info.extmetadata?.LicenseShortName?.value?.trim();
          const attribution = [rawArtist, license].filter(Boolean).join(' · ').slice(0, 90);
          return [
            {
              id: String(page.pageid),
              title: cleanTitle,
              url: info.thumburl || info.url,
              thumbUrl: info.thumburl || info.url,
              attribution: attribution || 'Wikimedia Commons',
            },
          ];
        })
        .slice(0, 12);

      res.json({ photos, resolvedQuery: searchTerms });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to search web photos.',
      });
    }
  });

  app.get('/api/photos/proxy', async (req, res) => {
    try {
      const targetUrl = String(req.query.url ?? '').trim();
      if (!targetUrl.startsWith('https://')) {
        res.status(400).json({ error: 'Only HTTPS image URLs can be proxied.' });
        return;
      }

      const upstream = await fetch(targetUrl, {
        headers: { 'User-Agent': 'Cortex/1.0' },
      });
      if (!upstream.ok) {
        res.status(502).json({ error: 'Could not fetch remote image.' });
        return;
      }
      const contentType = upstream.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        res.status(400).json({ error: 'URL did not return a valid image.' });
        return;
      }
      const buf = Buffer.from(await upstream.arrayBuffer());
      if (buf.byteLength > 8 * 1024 * 1024) {
        res.status(413).json({ error: 'Image exceeds 8MB limit.' });
        return;
      }
      const mimeType = contentType.split(';')[0].trim();
      res.json({
        dataUrl: `data:${mimeType};base64,${buf.toString('base64')}`,
        mimeType,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Image proxy failed.',
      });
    }
  });

  app.post('/api/presentations/generate-visual', async (req, res) => {
    try {
      const { prompt, language, themeId, customTheme } = req.body ?? {};
      const cleanPrompt = String(prompt ?? '').trim();
      if (cleanPrompt.length < 3) {
        res.status(400).json({ error: 'Please describe the visual or diagram to create.' });
        return;
      }

      const langMeta = resolveLanguageMeta(String(language || 'English'));
      const resolvedTheme = resolveDeckTheme(
        themeId || 'neon-aurora',
        [],
        customTheme as CustomThemeDefinition | undefined
      );

      const ai = getAiClient();
      const response = await callGeminiWithFallback(async (model) => {
        return await ai.models.generateContent({
          model,
          contents: `Design a clean, executive presentation vector diagram/illustration (SVG) for: "${cleanPrompt}".
Language for any labels inside the graphic: ${langMeta.name} (${langMeta.rtl ? 'Right-to-Left' : 'Left-to-Right'}).
Use these harmonious colors:
- Background: #${resolvedTheme.hexSurface}
- Ink / strokes / text: #${resolvedTheme.hexInk}
- Muted secondary shapes: #${resolvedTheme.hexMuted}
- Accent highlight: #${resolvedTheme.hexAccent}

Strict SVG requirements:
1. Root element: <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
2. Crisp geometric shapes, clean rounded containers, arrows, charts, or architectural diagrams — NO embedded <script>, NO foreignObject, NO external image hrefs.
3. Keep labels short and legible (font-family="sans-serif", font-size 16–24px) with generous padding so text never overlaps shapes.`,
          config: {
            systemInstruction:
              'You are a presentation graphics designer. Return JSON containing a crisp, valid, self-contained SVG string plus a short alt text and caption.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                svg: { type: Type.STRING },
                alt: { type: Type.STRING },
                caption: { type: Type.STRING },
              },
              required: ['svg', 'alt'],
            },
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });
      });

      const parsed = JSON.parse(response.text?.trim() || '{}') as {
        svg?: string;
        alt?: string;
        caption?: string;
      };
      const cleanSvg = sanitizeSvgMarkup(parsed.svg || '');
      if (!cleanSvg) {
        res.status(502).json({ error: 'Generated graphic did not contain valid SVG.' });
        return;
      }

      const base64Svg = Buffer.from(cleanSvg, 'utf-8').toString('base64');
      res.json({
        dataUrl: `data:image/svg+xml;base64,${base64Svg}`,
        alt: parsed.alt?.trim() || cleanPrompt,
        caption: parsed.caption?.trim() || undefined,
      });
    } catch (error) {
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Cortex server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
