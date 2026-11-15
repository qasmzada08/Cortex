import { useEffect, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import type { CustomThemeDefinition, DeckThemeId, Slide } from '../types/presentation';
import { resolveDeckTheme } from '../utils/themeLogic';

interface SlideRendererProps {
  slide: Slide;
  deckTitle: string;
  slideIndex: number;
  totalSlides: number;
  themeId: DeckThemeId;
  customTheme?: CustomThemeDefinition;
  customThemes?: CustomThemeDefinition[];
  rtl: boolean;
  compact?: boolean;
}

function SlideImageBox({
  url,
  alt,
  caption,
  compact,
  borderColor,
  surfaceColor,
  mutedColor,
  radiusClass,
}: {
  url: string;
  alt: string;
  caption?: string;
  compact: boolean;
  borderColor: string;
  surfaceColor: string;
  mutedColor: string;
  radiusClass: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  return (
    <figure className="flex flex-col h-full min-h-0">
      <div
        style={{ backgroundColor: surfaceColor, borderColor }}
        className={`relative flex-1 min-h-0 ${radiusClass} overflow-hidden border flex items-center justify-center`}
      >
        {failed ? (
          <div className="flex flex-col items-center justify-center p-3 text-center gap-1.5">
            <ImageIcon
              style={{ color: mutedColor }}
              className={compact ? 'w-3 h-3' : 'w-6 h-6'}
              aria-hidden="true"
            />
            {!compact && (
              <span style={{ color: mutedColor }} className="text-xs line-clamp-2 max-w-[14rem]">
                {alt}
              </span>
            )}
          </div>
        ) : (
          <img
            src={url}
            alt={alt}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      {caption && !compact && (
        <figcaption style={{ color: mutedColor }} className="mt-1.5 text-[11px] truncate">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export function SlideRenderer({
  slide,
  deckTitle,
  slideIndex,
  totalSlides,
  themeId,
  customTheme,
  customThemes,
  rtl,
  compact = false,
}: SlideRendererProps) {
  const theme = resolveDeckTheme(themeId, customThemes, customTheme);
  const dir = rtl ? 'rtl' : 'ltr';
  const padClass = compact ? 'p-2.5' : 'p-4 sm:p-8 md:p-12';

  const hasImage = Boolean(slide.image?.url);
  const placement = slide.image?.placement ?? 'right';
  const isBackdrop = hasImage && placement === 'background';
  const isSplitSide =
    hasImage &&
    (placement === 'right' || placement === 'left') &&
    slide.layout !== 'image-focus';

  const primaryInk = isBackdrop ? '#FFFFFF' : `#${theme.hexInk}`;
  const mutedInk = isBackdrop ? '#E2E8F0' : `#${theme.hexMuted}`;
  const accentColor = isBackdrop ? '#38BDF8' : `#${theme.hexAccent}`;
  const surfaceBg = isBackdrop ? 'rgba(0, 0, 0, 0.35)' : `#${theme.hexSurface}`;
  const borderSubtle = isBackdrop ? 'rgba(255, 255, 255, 0.25)' : theme.borderRgba;
  const radiusClass = theme.cornerStyle === 'sharp' ? 'rounded-none' : 'rounded-lg';

  const textBlock = (
    <div className="flex-1 flex flex-col justify-center min-h-0 overflow-hidden">
      {(slide.layout === 'title' || slide.layout === 'closing') && (
        <div className={compact ? 'space-y-1' : 'space-y-3 sm:space-y-4 max-w-4xl'}>
          {slide.kicker && (
            <p
              style={{ color: accentColor, fontFamily: theme.displayCssFont }}
              className={`font-semibold tracking-wide ${
                compact ? 'text-[7px] leading-tight truncate' : 'text-xs md:text-sm'
              }`}
            >
              {slide.kicker}
            </p>
          )}
          <h2
            style={{ fontFamily: theme.displayCssFont }}
            className={`font-bold tracking-tight text-balance ${
              compact
                ? 'text-[11px] leading-snug line-clamp-2'
                : isSplitSide
                  ? 'text-xl sm:text-2xl md:text-3xl leading-[1.15]'
                  : 'text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] leading-[1.15]'
            }`}
          >
            {slide.title}
          </h2>
          {slide.subtitle && (
            <p
              style={{ color: mutedInk, fontFamily: theme.bodyCssFont }}
              className={
                compact
                  ? 'text-[8px] leading-tight line-clamp-2'
                  : 'text-sm sm:text-base md:text-lg leading-relaxed max-w-3xl'
              }
            >
              {slide.subtitle}
            </p>
          )}
          {slide.bullets && slide.bullets.length > 0 && (
            <ul
              style={{ fontFamily: theme.bodyCssFont }}
              className={`${compact ? 'pt-1 space-y-0.5' : 'pt-2 sm:pt-3 space-y-2'} list-none`}
            >
              {slide.bullets.slice(0, compact ? 2 : 5).map((item, idx) => (
                <li
                  key={idx}
                  className={`flex items-baseline gap-2.5 ${
                    compact ? 'text-[7px] leading-tight truncate' : 'text-sm md:text-base'
                  }`}
                >
                  <span
                    style={{ backgroundColor: accentColor }}
                    className={`inline-block shrink-0 rounded-full ${
                      compact ? 'w-1 h-1' : 'w-1.5 h-1.5 translate-y-[-1px]'
                    }`}
                    aria-hidden="true"
                  />
                  <span className={compact ? 'truncate' : ''}>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {slide.layout === 'bullets' && (
        <div className={compact ? 'space-y-1.5' : 'space-y-2.5 sm:space-y-5'}>
          <div className={compact ? 'space-y-0.5' : 'space-y-1 sm:space-y-2'}>
            {slide.kicker && (
              <p
                style={{ color: accentColor, fontFamily: theme.displayCssFont }}
                className={`font-semibold ${
                  compact ? 'text-[6px] truncate' : 'text-[10px] sm:text-xs md:text-sm'
                }`}
              >
                {slide.kicker}
              </p>
            )}
            <h2
              style={{ fontFamily: theme.displayCssFont }}
              className={`font-bold tracking-tight text-balance ${
                compact
                  ? 'text-[10px] leading-tight line-clamp-2'
                  : isSplitSide
                    ? 'text-base sm:text-xl md:text-2xl leading-tight'
                    : 'text-base sm:text-2xl md:text-3xl leading-tight'
              }`}
            >
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p
                style={{ color: mutedInk, fontFamily: theme.bodyCssFont }}
                className={
                  compact ? 'text-[7px] truncate' : 'text-xs sm:text-sm md:text-base'
                }
              >
                {slide.subtitle}
              </p>
            )}
          </div>

          <ul
            style={{ fontFamily: theme.bodyCssFont }}
            className={compact ? 'space-y-1' : 'space-y-1.5 sm:space-y-3 pt-0.5 sm:pt-1'}
          >
            {(slide.bullets ?? []).slice(0, compact ? 3 : 6).map((bullet, idx) => (
              <li
                key={idx}
                className={`flex items-baseline gap-2 sm:gap-3 ${
                  compact
                    ? 'text-[7px] leading-tight'
                    : isSplitSide
                      ? 'text-xs sm:text-sm md:text-base leading-snug'
                      : 'text-xs sm:text-sm md:text-base lg:text-lg leading-snug sm:leading-relaxed'
                }`}
              >
                <span
                  style={{ color: accentColor }}
                  className={`font-mono font-semibold shrink-0 tabular-nums ${
                    compact ? 'text-[6px]' : 'text-[10px] sm:text-xs md:text-sm'
                  }`}
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className={compact ? 'line-clamp-1' : ''}>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {slide.layout === 'two-column' && (
        <div className={compact ? 'space-y-1.5' : 'space-y-5'}>
          <div className={compact ? 'space-y-0.5' : 'space-y-1.5'}>
            {slide.kicker && (
              <p
                style={{ color: accentColor, fontFamily: theme.displayCssFont }}
                className={`font-semibold ${
                  compact ? 'text-[6px] truncate' : 'text-xs md:text-sm'
                }`}
              >
                {slide.kicker}
              </p>
            )}
            <h2
              style={{ fontFamily: theme.displayCssFont }}
              className={`font-bold tracking-tight text-balance ${
                compact
                  ? 'text-[10px] leading-tight line-clamp-1'
                  : 'text-xl sm:text-2xl md:text-3xl leading-tight'
              }`}
            >
              {slide.title}
            </h2>
          </div>

          <div className={`grid grid-cols-2 ${compact ? 'gap-1.5' : 'gap-5 md:gap-6'}`}>
            {[slide.leftColumn, slide.rightColumn].map((col, cIdx) => (
              <div
                key={cIdx}
                style={{ backgroundColor: surfaceBg, borderColor: borderSubtle }}
                className={`border ${radiusClass} ${
                  compact ? 'p-1.5 space-y-0.5' : 'p-4 md:p-5 space-y-3'
                }`}
              >
                <h3
                  style={{ fontFamily: theme.displayCssFont }}
                  className={`font-semibold ${
                    compact ? 'text-[7px] truncate' : 'text-sm md:text-base'
                  }`}
                >
                  {col?.heading || (cIdx === 0 ? 'Column A' : 'Column B')}
                </h3>
                <ul
                  style={{ fontFamily: theme.bodyCssFont }}
                  className={compact ? 'space-y-0.5' : 'space-y-2'}
                >
                  {(col?.points ?? []).slice(0, compact ? 2 : 5).map((pt, pIdx) => (
                    <li
                      key={pIdx}
                      style={{ color: mutedInk }}
                      className={`flex items-baseline gap-2 ${
                        compact ? 'text-[6px] leading-tight' : 'text-xs md:text-sm leading-relaxed'
                      }`}
                    >
                      <span
                        style={{ backgroundColor: accentColor }}
                        className={`inline-block shrink-0 rounded-full ${
                          compact ? 'w-1 h-1' : 'w-1.5 h-1.5'
                        }`}
                        aria-hidden="true"
                      />
                      <span className={compact ? 'line-clamp-1' : ''}>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {slide.layout === 'metric' && (
        <div className={compact ? 'space-y-1.5' : 'space-y-6'}>
          <div className={compact ? 'space-y-0.5' : 'space-y-1.5'}>
            {slide.kicker && (
              <p
                style={{ color: accentColor, fontFamily: theme.displayCssFont }}
                className={`font-semibold ${
                  compact ? 'text-[6px] truncate' : 'text-xs md:text-sm'
                }`}
              >
                {slide.kicker}
              </p>
            )}
            <h2
              style={{ fontFamily: theme.displayCssFont }}
              className={`font-bold tracking-tight text-balance ${
                compact
                  ? 'text-[9px] leading-tight line-clamp-1'
                  : 'text-xl sm:text-2xl md:text-3xl leading-tight'
              }`}
            >
              {slide.title}
            </h2>
          </div>

          <div
            className={`grid ${
              (slide.metrics?.length ?? 3) <= 2
                ? 'grid-cols-2'
                : (slide.metrics?.length ?? 3) === 4
                  ? 'grid-cols-4'
                  : 'grid-cols-3'
            } ${compact ? 'gap-1' : 'gap-4 md:gap-5'}`}
          >
            {(slide.metrics ?? []).slice(0, 4).map((metric, mIdx) => (
              <div
                key={mIdx}
                style={{ backgroundColor: surfaceBg, borderColor: borderSubtle }}
                className={`border ${radiusClass} ${
                  compact ? 'p-1 space-y-0.5' : 'p-4 md:p-6 space-y-2'
                }`}
              >
                <div
                  style={{ color: accentColor, fontFamily: theme.displayCssFont }}
                  className={`font-bold tabular-nums tracking-tight ${
                    compact ? 'text-[10px] leading-none truncate' : 'text-2xl sm:text-3xl md:text-4xl'
                  }`}
                >
                  {metric.value}
                </div>
                <p
                  style={{ color: mutedInk, fontFamily: theme.bodyCssFont }}
                  className={
                    compact ? 'text-[5.5px] leading-tight line-clamp-1' : 'text-xs md:text-sm leading-snug'
                  }
                >
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {slide.layout === 'quote' && (
        <div className={compact ? 'space-y-1.5' : 'space-y-5 max-w-4xl'}>
          {slide.kicker && (
            <p
              style={{ color: accentColor, fontFamily: theme.displayCssFont }}
              className={`font-semibold ${
                compact ? 'text-[6px] truncate' : 'text-xs md:text-sm'
              }`}
            >
              {slide.kicker}
            </p>
          )}
          <blockquote
            style={{ fontFamily: theme.displayCssFont }}
            className={`font-medium tracking-tight text-balance ${
              compact
                ? 'text-[9px] leading-snug line-clamp-3'
                : 'text-xl sm:text-2xl md:text-3xl leading-snug'
            }`}
          >
            “{slide.quote || slide.title}”
          </blockquote>
          {slide.quoteAuthor && (
            <p
              style={{ color: mutedInk, fontFamily: theme.bodyCssFont }}
              className={`font-medium ${
                compact ? 'text-[6px] truncate' : 'text-sm md:text-base'
              }`}
            >
              — {slide.quoteAuthor}
            </p>
          )}
        </div>
      )}

      {slide.layout === 'image-focus' && (
        <div
          className={`h-full grid ${hasImage && !isBackdrop ? 'grid-cols-12' : 'grid-cols-1'} ${
            compact ? 'gap-2' : 'gap-5 sm:gap-8'
          } items-center min-h-0`}
        >
          <div
            className={`${hasImage && !isBackdrop ? 'col-span-5' : 'col-span-1 max-w-3xl'} ${
              compact ? 'space-y-0.5' : 'space-y-3'
            }`}
          >
            {slide.kicker && (
              <p
                style={{ color: accentColor, fontFamily: theme.displayCssFont }}
                className={`font-semibold ${
                  compact ? 'text-[6px] truncate' : 'text-xs md:text-sm'
                }`}
              >
                {slide.kicker}
              </p>
            )}
            <h2
              style={{ fontFamily: theme.displayCssFont }}
              className={`font-bold tracking-tight text-balance ${
                compact
                  ? 'text-[9px] leading-tight line-clamp-2'
                  : 'text-lg sm:text-2xl md:text-3xl leading-tight'
              }`}
            >
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p
                style={{ color: mutedInk, fontFamily: theme.bodyCssFont }}
                className={
                  compact ? 'text-[6.5px] line-clamp-2' : 'text-xs sm:text-sm md:text-base leading-relaxed'
                }
              >
                {slide.subtitle}
              </p>
            )}
          </div>
          {hasImage && !isBackdrop && slide.image ? (
            <div className="col-span-7 h-full min-h-0 py-1">
              <SlideImageBox
                url={slide.image.url}
                alt={slide.image.alt}
                caption={slide.image.caption}
                compact={compact}
                borderColor={borderSubtle}
                surfaceColor={surfaceBg}
                mutedColor={mutedInk}
                radiusClass={radiusClass}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );

  return (
    <div
      dir={dir}
      style={{
        backgroundColor: `#${theme.hexBg}`,
        color: primaryInk,
        fontFamily: theme.bodyCssFont,
      }}
      className="relative w-full aspect-video overflow-hidden select-none"
    >
      {/* Background image with measured contrast scrim */}
      {isBackdrop && slide.image && (
        <>
          <img
            src={slide.image.url}
            alt={slide.image.alt}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/55 to-black/45"
            aria-hidden="true"
          />
        </>
      )}

      {/* Theme Architectural Accent Geometry */}
      {theme.accentStyle === 'top-bar' && (
        <div
          style={{ backgroundColor: `#${theme.hexAccent}` }}
          className={`absolute top-0 inset-x-0 z-20 ${compact ? 'h-0.5' : 'h-1'}`}
          aria-hidden="true"
        />
      )}
      {theme.accentStyle === 'left-rail' && (
        <div
          style={{ backgroundColor: `#${theme.hexAccent}` }}
          className={`absolute inset-y-0 z-20 ${rtl ? 'right-0' : 'left-0'} ${compact ? 'w-1' : 'w-2'}`}
          aria-hidden="true"
        />
      )}
      {theme.accentStyle === 'framed' && (
        <div
          style={{ borderColor: `#${theme.hexAccent}` }}
          className={`absolute z-20 pointer-events-none border ${
            compact ? 'inset-1 border' : 'inset-2.5 sm:inset-3.5 border-2'
          } ${radiusClass}`}
          aria-hidden="true"
        />
      )}
      {theme.accentStyle === 'minimal' && (
        <div
          style={{ backgroundColor: borderSubtle }}
          className="absolute top-0 inset-x-0 z-20 h-px"
          aria-hidden="true"
        />
      )}

      {/* Locked 16:9 Inner Stage */}
      <div className={`absolute inset-0 z-10 flex flex-col justify-between ${padClass}`}>
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {isSplitSide && slide.image ? (
            <div
              className={`w-full h-full grid grid-cols-12 ${
                compact ? 'gap-2' : 'gap-5 sm:gap-8'
              } items-stretch min-h-0`}
            >
              {placement === 'left' ? (
                <>
                  <div className="col-span-5 h-full min-h-0 py-1">
                    <SlideImageBox
                      url={slide.image.url}
                      alt={slide.image.alt}
                      caption={slide.image.caption}
                      compact={compact}
                      borderColor={borderSubtle}
                      surfaceColor={surfaceBg}
                      mutedColor={mutedInk}
                      radiusClass={radiusClass}
                    />
                  </div>
                  <div className="col-span-7 flex flex-col justify-center min-h-0 overflow-hidden">
                    {textBlock}
                  </div>
                </>
              ) : (
                <>
                  <div className="col-span-7 flex flex-col justify-center min-h-0 overflow-hidden">
                    {textBlock}
                  </div>
                  <div className="col-span-5 h-full min-h-0 py-1">
                    <SlideImageBox
                      url={slide.image.url}
                      alt={slide.image.alt}
                      caption={slide.image.caption}
                      compact={compact}
                      borderColor={borderSubtle}
                      surfaceColor={surfaceBg}
                      mutedColor={mutedInk}
                      radiusClass={radiusClass}
                    />
                  </div>
                </>
              )}
            </div>
          ) : hasImage && placement === 'frame' && slide.layout !== 'image-focus' && slide.image ? (
            <div className={`w-full h-full flex flex-col ${compact ? 'gap-1.5' : 'gap-4'} min-h-0`}>
              <div className="shrink-0">{textBlock}</div>
              <div className="flex-1 min-h-0">
                <SlideImageBox
                  url={slide.image.url}
                  alt={slide.image.alt}
                  caption={slide.image.caption}
                  compact={compact}
                  borderColor={borderSubtle}
                  surfaceColor={surfaceBg}
                  mutedColor={mutedInk}
                  radiusClass={radiusClass}
                />
              </div>
            </div>
          ) : (
            textBlock
          )}
        </div>

        {/* Footer Metadata Line */}
        <div
          style={{ borderColor: borderSubtle, color: mutedInk }}
          className={`flex items-center justify-between ${compact ? 'pt-1 mt-1' : 'pt-2'} border-t ${
            compact ? 'text-[6px]' : 'text-[11px] md:text-xs'
          } shrink-0`}
        >
          <span className="truncate max-w-[70%]">{deckTitle}</span>
          <span className="font-mono tabular-nums shrink-0" dir="ltr">
            {String(slideIndex + 1).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
}
