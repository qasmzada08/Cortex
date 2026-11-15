import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Globe,
  Image as ImageIcon,
  Loader2,
  Search,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import type {
  CustomThemeDefinition,
  DeckThemeId,
  SlideImage,
  SlideImagePlacement,
  WebPhotoResult,
} from '../types/presentation';
import {
  type PhotoSourceKind,
  type PhotoWizardStep,
  validatePhotoStep,
} from '../utils/wizardLogic';
import { StepProgress } from './StepProgress';

interface SlidePhotoModalProps {
  open: boolean;
  slideTitle: string;
  language: string;
  themeId: DeckThemeId;
  customTheme?: CustomThemeDefinition;
  currentImage?: SlideImage;
  onClose: () => void;
  onAttachImage: (image: SlideImage) => void;
}

interface DraftImage {
  url: string;
  alt: string;
  caption?: string;
  source: NonNullable<SlideImage['source']>;
}

const PHOTO_STEPS = [
  { number: 1, label: 'Source' },
  { number: 2, label: 'Select' },
  { number: 3, label: 'Place' },
];

const SOURCE_OPTIONS: {
  id: PhotoSourceKind;
  title: string;
  description: string;
  icon: typeof Globe;
}[] = [
  {
    id: 'web',
    title: 'Web Photos',
    description: 'Search online photography or paste an image link.',
    icon: Globe,
  },
  {
    id: 'camera',
    title: 'Take Photo',
    description: 'Snap a live photo directly from your camera.',
    icon: Camera,
  },
  {
    id: 'upload',
    title: 'Upload File',
    description: 'Choose a JPG, PNG, WebP, or SVG from your device.',
    icon: Upload,
  },
  {
    id: 'graphic',
    title: 'Make Diagram',
    description: 'Create a custom vector diagram matched to your theme.',
    icon: Wand2,
  },
];

const PLACEMENT_OPTIONS: {
  id: SlideImagePlacement;
  label: string;
  hint: string;
}[] = [
  { id: 'right', label: 'Right Split', hint: 'Text left · Photo right' },
  { id: 'left', label: 'Left Split', hint: 'Photo left · Text right' },
  { id: 'frame', label: 'Showcase Frame', hint: 'Framed below heading' },
  { id: 'background', label: 'Full Backdrop', hint: 'Full slide background' },
];

export function SlidePhotoModal({
  open,
  slideTitle,
  language,
  themeId,
  customTheme,
  currentImage,
  onClose,
  onAttachImage,
}: SlidePhotoModalProps) {
  const [step, setStep] = useState<PhotoWizardStep>(1);
  const [source, setSource] = useState<PhotoSourceKind | null>(null);
  const [draftImage, setDraftImage] = useState<DraftImage | null>(null);
  const [placement, setPlacement] = useState<SlideImagePlacement>(
    currentImage?.placement ?? 'right'
  );
  const [caption, setCaption] = useState('');
  const [stepError, setStepError] = useState<string | null>(null);

  // Web search & URL state
  const [searchQuery, setSearchQuery] = useState(slideTitle);
  const [isSearching, setIsSearching] = useState(false);
  const [webPhotos, setWebPhotos] = useState<WebPhotoResult[]>([]);
  const [webError, setWebError] = useState<string | null>(null);
  const [directUrl, setDirectUrl] = useState('');

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Graphic generation state
  const [graphicPrompt, setGraphicPrompt] = useState(slideTitle);
  const [isGeneratingGraphic, setIsGeneratingGraphic] = useState(false);
  const [graphicError, setGraphicError] = useState<string | null>(null);

  // Upload state
  const [uploadError, setUploadError] = useState<string | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (open) {
      setStep(1);
      setSource(null);
      setDraftImage(null);
      setSearchQuery(slideTitle);
      setGraphicPrompt(slideTitle);
      setPlacement(currentImage?.placement ?? 'right');
      setCaption(currentImage?.caption ?? '');
      setStepError(null);
      setWebError(null);
      setCameraError(null);
      setGraphicError(null);
      setUploadError(null);
    } else {
      stopCamera();
    }
  }, [open, slideTitle, currentImage?.placement, currentImage?.caption]);

  useEffect(() => {
    if (step !== 2 || source !== 'camera') {
      stopCamera();
    }
  }, [step, source]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!open) return null;

  const chooseSource = (nextSource: PhotoSourceKind) => {
    setSource(nextSource);
    setStepError(null);
    setWebError(null);
    setCameraError(null);
    setUploadError(null);
    setGraphicError(null);
    setStep(2);
  };

  const selectDraftAndAdvance = (nextDraft: DraftImage) => {
    setDraftImage(nextDraft);
    setCaption(nextDraft.caption ?? '');
    setStepError(null);
    setStep(3);
  };

  const handleWebSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setWebError('Please enter search keywords.');
      return;
    }
    setIsSearching(true);
    setWebError(null);
    try {
      const res = await fetch(`/api/photos/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not search web photos.');
      }
      setWebPhotos(Array.isArray(data.photos) ? data.photos : []);
      if (!data.photos || data.photos.length === 0) {
        setWebError(`No photos found for "${q}". Try broader keywords.`);
      }
    } catch (err) {
      setWebError(err instanceof Error ? err.message : 'Photo search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAttachDirectUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = directUrl.trim();
    if (!trimmed.startsWith('https://') && !trimmed.startsWith('http://')) {
      setWebError('Please enter a valid http:// or https:// image URL.');
      return;
    }
    selectDraftAndAdvance({
      url: trimmed,
      alt: slideTitle || 'Slide photo',
      source: 'web',
    });
  };

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Camera capture is not supported in this browser context. Go back to upload a photo or search web photos.'
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access or go back to upload a photo file.'
          : 'No active camera device was detected. Go back to upload a photo or search web photos.';
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError('Camera video frame is not ready yet.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    selectDraftAndAdvance({
      url: dataUrl,
      alt: slideTitle || 'Captured slide photo',
      source: 'camera',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP, or SVG).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Please choose an image smaller than 10 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      const cleanName = file.name.replace(/\.[^.]+$/, '');
      if (file.type === 'image/svg+xml') {
        selectDraftAndAdvance({
          url: result,
          alt: cleanName,
          source: 'upload',
        });
        return;
      }
      const img = new window.Image();
      img.onload = () => {
        const maxWidth = 1600;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const optimized = canvas.toDataURL('image/jpeg', 0.88);
          selectDraftAndAdvance({
            url: optimized,
            alt: cleanName,
            source: 'upload',
          });
        }
      };
      img.onerror = () => setUploadError('Could not read the selected image.');
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateGraphic = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = graphicPrompt.trim();
    if (prompt.length < 3) {
      setGraphicError('Please describe the visual or diagram you want to create.');
      return;
    }
    setIsGeneratingGraphic(true);
    setGraphicError(null);
    try {
      const res = await fetch('/api/presentations/generate-visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, language, themeId, customTheme }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not create slide visual.');
      }
      setDraftImage({
        url: data.dataUrl,
        alt: data.alt || prompt,
        caption: data.caption,
        source: 'ai-graphic',
      });
      setCaption(data.caption ?? '');
    } catch (err) {
      setGraphicError(err instanceof Error ? err.message : 'Visual generation failed.');
    } finally {
      setIsGeneratingGraphic(false);
    }
  };

  const handleInsert = () => {
    const check = validatePhotoStep(3, {
      source,
      imageUrl: draftImage?.url ?? null,
      placement,
    });
    if (!check.valid || !draftImage) {
      setStepError(check.error ?? 'Please select a visual before inserting.');
      return;
    }
    onAttachImage({
      url: draftImage.url,
      alt: draftImage.alt,
      caption: caption.trim() || undefined,
      source: draftImage.source,
      placement,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="slide-photo-modal-title"
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-[#08110C] border border-emerald-800/80 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-emerald-50">
        <div className="px-6 py-4 border-b border-emerald-900/70 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 id="slide-photo-modal-title" className="font-display text-lg font-bold text-emerald-50">
              Add Slide Photo or Visual
            </h2>
            <p className="text-xs text-emerald-200/70 mt-0.5">
              Choose a source, pick or capture your image, then place it on the slide.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close photo studio dialog"
            className="p-2 text-emerald-300/70 hover:text-emerald-50 rounded-lg hover:bg-emerald-950/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <StepProgress
          steps={PHOTO_STEPS}
          currentStep={step}
          onSelectStep={(n) => {
            setStepError(null);
            setStep(n as PhotoWizardStep);
          }}
        />

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {stepError && (
            <div
              role="alert"
              className="px-4 py-2.5 text-xs text-red-200 bg-red-950/70 border border-red-700/70 rounded-lg"
            >
              {stepError}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-emerald-50">
                How would you like to add a visual?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SOURCE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => chooseSource(option.id)}
                      className="text-left p-4 rounded-xl border border-emerald-900/70 bg-[#0A160E] hover:border-emerald-400 hover:bg-emerald-950/50 transition-colors flex items-start gap-3.5 cursor-pointer"
                    >
                      <span className="p-2.5 rounded-lg bg-emerald-500/15 text-emerald-300 shrink-0">
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <span className="space-y-1">
                        <span className="block text-sm font-semibold text-emerald-50">
                          {option.title}
                        </span>
                        <span className="block text-xs text-emerald-200/70 leading-relaxed">
                          {option.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && source === 'web' && (
            <div className="space-y-5">
              <form onSubmit={handleWebSearch} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search
                    className="w-4 h-4 text-emerald-400/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    aria-label="Search web photos"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search real web photos in any language..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-[#030805] border border-emerald-800/80 rounded-lg text-emerald-50 placeholder:text-emerald-300/35 focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-[#020A05] bg-emerald-500 rounded-lg hover:bg-emerald-400 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <span>Search Web Photos</span>
                  )}
                </button>
              </form>

              {webError && (
                <div
                  role="alert"
                  className="px-4 py-2.5 text-xs text-red-200 bg-red-950/70 border border-red-700/70 rounded-lg"
                >
                  {webError}
                </div>
              )}

              {webPhotos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {webPhotos.map((photo) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() =>
                        selectDraftAndAdvance({
                          url: photo.url,
                          alt: photo.title,
                          caption: photo.attribution,
                          source: 'web',
                        })
                      }
                      className="group text-left bg-[#0A160E] border border-emerald-900/70 hover:border-emerald-400 rounded-lg overflow-hidden transition-colors cursor-pointer"
                    >
                      <div className="aspect-video bg-[#030805] overflow-hidden">
                        <img
                          src={photo.thumbUrl}
                          alt={photo.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                        />
                      </div>
                      <div className="p-2 space-y-0.5">
                        <p className="text-xs font-medium text-emerald-50 truncate">
                          {photo.title}
                        </p>
                        <p className="text-[11px] text-emerald-300/70 truncate">
                          {photo.attribution}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                !isSearching && (
                  <div className="border border-dashed border-emerald-800/80 rounded-xl p-8 text-center space-y-2 bg-[#040B07]">
                    <ImageIcon className="w-7 h-7 text-emerald-400/60 mx-auto" aria-hidden="true" />
                    <p className="text-sm font-medium text-emerald-50">
                      Search real photography from Wikimedia Commons
                    </p>
                    <p className="text-xs text-emerald-200/70 max-w-md mx-auto">
                      Enter keywords above, then click any result to place it on your slide.
                    </p>
                  </div>
                )
              )}

              <form onSubmit={handleAttachDirectUrl} className="pt-4 border-t border-emerald-900/70 space-y-2">
                <label htmlFor="direct-photo-url" className="block text-xs font-medium text-emerald-200/85">
                  Or paste an existing image URL
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="direct-photo-url"
                    type="url"
                    value={directUrl}
                    onChange={(e) => setDirectUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="flex-1 px-3 py-2 text-sm bg-[#030805] border border-emerald-800/80 rounded-lg text-emerald-50 placeholder:text-emerald-300/35 focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-emerald-100 bg-[#0E1E15] border border-emerald-800/60 hover:bg-[#142A1E] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Use URL
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 2 && source === 'camera' && (
            <div className="space-y-4">
              {cameraError && (
                <div
                  role="alert"
                  className="px-4 py-3 text-xs text-red-200 bg-red-950/70 border border-red-700/70 rounded-lg"
                >
                  {cameraError}
                </div>
              )}

              <div className="aspect-video w-full bg-[#020604] rounded-xl overflow-hidden border border-emerald-900/70 flex items-center justify-center relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                />

                {!cameraActive && (
                  <div className="text-center p-6 space-y-3">
                    <Camera className="w-9 h-9 text-emerald-400/70 mx-auto" aria-hidden="true" />
                    <p className="text-sm font-medium text-emerald-100">
                      Turn on your camera to take a photo
                    </p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#020A05] bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Enable Camera</span>
                    </button>
                  </div>
                )}
              </div>

              {cameraActive && (
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 rounded-lg hover:bg-[#112317] cursor-pointer"
                  >
                    Stop Camera
                  </button>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-[#020A05] bg-emerald-500 hover:bg-emerald-400 rounded-lg cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Take Photo</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 2 && source === 'upload' && (
            <div className="space-y-4">
              {uploadError && (
                <div
                  role="alert"
                  className="px-4 py-2.5 text-xs text-red-200 bg-red-950/70 border border-red-700/70 rounded-lg"
                >
                  {uploadError}
                </div>
              )}

              <label
                htmlFor="slide-photo-file-input"
                className="block border-2 border-dashed border-emerald-800/80 hover:border-emerald-400 rounded-xl p-10 text-center bg-[#040B07] cursor-pointer transition-colors"
              >
                <Upload className="w-8 h-8 text-emerald-400/70 mx-auto mb-3" aria-hidden="true" />
                <span className="block text-sm font-semibold text-emerald-50">
                  Choose a photo from your device
                </span>
                <span className="block text-xs text-emerald-200/70 mt-1">
                  Supports JPG, PNG, WebP, and SVG up to 10 MB
                </span>
                <input
                  id="slide-photo-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
            </div>
          )}

          {step === 2 && source === 'graphic' && (
            <div className="space-y-4">
              <form onSubmit={handleGenerateGraphic} className="space-y-3">
                <label htmlFor="graphic-prompt-input" className="block text-xs font-semibold text-emerald-200/90">
                  Describe the diagram or visual graphic to build in {language}
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="graphic-prompt-input"
                    type="text"
                    value={graphicPrompt}
                    onChange={(e) => setGraphicPrompt(e.target.value)}
                    placeholder="e.g., 3-stage solar battery dispatch flow diagram"
                    className="flex-1 px-3.5 py-2 text-sm bg-[#030805] border border-emerald-800/80 rounded-lg text-emerald-50 placeholder:text-emerald-300/35 focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="submit"
                    disabled={isGeneratingGraphic}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-[#020A05] bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isGeneratingGraphic ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        <span>Creating Graphic...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Make Visual</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {graphicError && (
                <div
                  role="alert"
                  className="px-4 py-2.5 text-xs text-red-200 bg-red-950/70 border border-red-700/70 rounded-lg"
                >
                  {graphicError}
                </div>
              )}

              {draftImage?.source === 'ai-graphic' && (
                <div className="space-y-3">
                  <div className="aspect-[16/10] rounded-xl overflow-hidden border border-emerald-800/80 bg-[#040B07]">
                    <img
                      src={draftImage.url}
                      alt={draftImage.alt}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#020A05] bg-emerald-500 hover:bg-emerald-400 rounded-lg cursor-pointer"
                    >
                      <span>Next: Place on Slide</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && draftImage && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row gap-4 items-center p-3 bg-[#040B07] border border-emerald-900/70 rounded-xl">
                <div className="w-full sm:w-44 aspect-video rounded-lg overflow-hidden border border-emerald-800/80 bg-[#030805] shrink-0">
                  <img
                    src={draftImage.url}
                    alt={draftImage.alt}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 w-full space-y-1">
                  <p className="text-sm font-semibold text-emerald-50 truncate">
                    {draftImage.alt}
                  </p>
                  <p className="text-xs text-emerald-300/70 capitalize">
                    Ready to place on your slide
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-sm font-semibold text-emerald-50">
                  Choose slide placement
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {PLACEMENT_OPTIONS.map((opt) => {
                    const active = placement === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPlacement(opt.id)}
                        className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                          active
                            ? 'border-emerald-400 bg-emerald-500/10'
                            : 'border-emerald-900/70 bg-[#0A160E] hover:border-emerald-700'
                        }`}
                      >
                        <span className="block text-xs font-semibold text-emerald-50">
                          {opt.label}
                        </span>
                        <span className="block text-[11px] text-emerald-300/70 mt-0.5">
                          {opt.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="wizard-photo-caption" className="block text-xs font-semibold text-emerald-200/85 mb-1.5">
                  Caption (Optional)
                </label>
                <input
                  id="wizard-photo-caption"
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Photo credit or description..."
                  className="w-full px-3 py-2 text-sm bg-[#030805] border border-emerald-800/80 rounded-lg text-emerald-50 placeholder:text-emerald-300/35 focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-emerald-900/70 flex items-center justify-between gap-3 bg-[#060E09] shrink-0">
          {step === 1 ? (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 rounded-lg hover:bg-[#112317] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setStepError(null);
                setStep(step === 3 ? 2 : 1);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 rounded-lg hover:bg-[#112317] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{step === 2 ? 'Back to Sources' : 'Back'}</span>
            </button>
          )}

          {step === 3 && draftImage && (
            <button
              type="button"
              onClick={handleInsert}
              className="px-5 py-2 text-xs font-semibold text-[#020A05] bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors cursor-pointer"
            >
              Insert on Slide
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
