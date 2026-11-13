import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  Link2,
  Upload,
  Image as ImageIcon,
  Check,
  Plus,
  Trash2,
  Globe,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export interface ManualPostSubmissionPayload {
  title: string;
  photographer: string;
  publication: string;
  stylist?: string;
  notes?: string;
  caption?: string;
  hashtags?: string;
  sourceUrl?: string;
  imageUrls: string[];
  candidateImages: string[];
  targetStatus: 'candidate' | 'selected' | 'approved';
}

interface AiResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ManualPostSubmissionPayload) => Promise<void>;
  isProcessing?: boolean;
}

export const AiResearchModal: React.FC<AiResearchModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isProcessing,
}) => {
  const { tx } = useLanguage();
  const [activeMode, setActiveMode] = useState<'url' | 'manual'>('url');

  // URL Import State
  const [articleUrl, setArticleUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [scrapedGallery, setScrapedGallery] = useState<string[]>([]);

  // Shared Metadata & Carousel State
  const [title, setTitle] = useState('');
  const [photographer, setPhotographer] = useState('');
  const [publication, setPublication] = useState('');
  const [stylist, setStylist] = useState('');
  const [notes, setNotes] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [manualImageInput, setManualImageInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [targetStatus, setTargetStatus] = useState<'candidate' | 'selected' | 'approved'>('candidate');
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetAll = () => {
    setArticleUrl('');
    setUrlError(null);
    setScrapedGallery([]);
    setTitle('');
    setPhotographer('');
    setPublication('');
    setStylist('');
    setNotes('');
    setCaption('');
    setHashtags('');
    setSelectedImages([]);
    setManualImageInput('');
    setFormError(null);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const handleFetchArticleUrl = async () => {
    const trimmed = articleUrl.trim();
    if (!trimmed || !/^https?:\/\/\S+/i.test(trimmed)) {
      setUrlError(tx('Lütfen geçerli bir http/https blog veya dergi URL adresi girin.', 'Please enter a valid http/https blog or magazine URL.'));
      return;
    }

    setIsFetchingUrl(true);
    setUrlError(null);
    try {
      const res = await fetch('/api/ai/scrape-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUrlError(data.error || tx('Makale ayrıntıları çıkarılamadı.', 'Could not extract article details.'));
      } else {
        if (data.title) setTitle(data.title);
        if (data.author) setPhotographer(data.author);
        if (data.publication) setPublication(data.publication);
        if (data.description) setNotes(data.description);
        const imgs: string[] = Array.isArray(data.images) ? data.images : [];
        setScrapedGallery(imgs);
        if (imgs.length > 0) {
          setSelectedImages(imgs.slice(0, Math.min(3, imgs.length)));
        } else {
          setUrlError(
            tx(
              'Makale alındı ancak standart galeri görseli algılanamadı. Aşağıdan görsel URL yapıştırabilir veya dosya yükleyebilirsiniz.',
              'Article fetched, but no standard gallery images were detected. You can paste image URLs or upload files below.'
            )
          );
        }
      }
    } catch (e: any) {
      setUrlError(e?.message || tx('Makale alınırken ağ hatası oluştu.', 'Network error while fetching article.'));
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleToggleFrame = (url: string) => {
    setSelectedImages((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  };

  const handleMakeCover = (url: string) => {
    setSelectedImages((prev) => [url, ...prev.filter((u) => u !== url)]);
  };

  const handleAddExternalImageUrl = () => {
    const clean = manualImageInput.trim();
    if (!clean || (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('/uploads/'))) {
      setFormError(tx('https:// veya http:// ile başlayan geçerli bir görsel URL girin', 'Enter a valid image URL starting with https:// or http://'));
      return;
    }
    setFormError(null);
    if (!scrapedGallery.includes(clean)) {
      setScrapedGallery((prev) => [...prev, clean]);
    }
    if (!selectedImages.includes(clean)) {
      setSelectedImages((prev) => [...prev, clean]);
    }
    setManualImageInput('');
  };

  const uploadLocalFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);
    setFormError(null);

    try {
      const filesToUpload: { name: string; dataUrl: string }[] = [];
      const arr = Array.from(fileList).slice(0, 10);

      for (const file of arr) {
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error(`${file.name} okunamadı`));
          reader.readAsDataURL(file);
        });
        filesToUpload.push({ name: file.name, dataUrl });
      }

      if (filesToUpload.length === 0) {
        setFormError(tx('Lütfen geçerli görsel dosyaları seçin (PNG, JPG, WEBP).', 'Please select valid image files (PNG, JPG, WEBP).'));
        return;
      }

      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filesToUpload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || tx('Görsel(ler) yüklenemedi.', 'Failed to upload image(s).'));
      } else if (Array.isArray(data.urls)) {
        setScrapedGallery((prev) => [...prev, ...data.urls]);
        setSelectedImages((prev) => [...prev, ...data.urls]);
      }
    } catch (e: any) {
      setFormError(e?.message || tx('Dosya yükleme hatası.', 'Error uploading files.'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    uploadLocalFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim() || !photographer.trim() || !publication.trim()) {
      setFormError(tx('Başlık, Fotoğrafçı/Yazar ve Yayın/Kaynak alanları zorunludur.', 'Title, Photographer/Author, and Publication/Source are required.'));
      return;
    }
    if (selectedImages.length === 0) {
      setFormError(tx('Lütfen bu gönderi için en az 1 fotoğraf seçin, çekin veya yükleyin.', 'Please select, fetch, or upload at least 1 photograph for this post.'));
      return;
    }

    await onSubmit({
      title: title.trim(),
      photographer: photographer.trim(),
      publication: publication.trim(),
      stylist: stylist.trim() || undefined,
      notes: notes.trim() || undefined,
      caption: caption.trim() || undefined,
      hashtags: hashtags.trim() || undefined,
      sourceUrl: activeMode === 'url' && articleUrl.trim() ? articleUrl.trim() : undefined,
      imageUrls: selectedImages,
      candidateImages: Array.from(new Set([...selectedImages, ...scrapedGallery])),
      targetStatus,
    });
    handleClose();
  };

  const combinedGallery = Array.from(new Set([...scrapedGallery, ...selectedImages]));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#222222] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#c5a880] shrink-0" />
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#c5a880] block">
                {tx('Manuel & Bağlantı Odaklı Kürasyon Stüdyosu', 'Manual & Link-Driven Curation Studio')}
              </span>
              <h3 className="font-editorial text-2xl text-[#f4f3ef] font-normal">
                {tx('Editoryal Gönderi Ekle veya URL ile İçe Aktar', 'Add Editorial Post or Import from URL')}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-[#8e8d8a] hover:text-[#f4f3ef] p-1.5 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="px-6 pt-4 pb-2 border-b border-[#1e1e1e] bg-[#0e0e0e] flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveMode('url')}
            className={`px-4 py-2 rounded text-xs font-mono uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
              activeMode === 'url'
                ? 'bg-[#c5a880] text-[#0a0a0a] font-semibold'
                : 'bg-[#181818] text-[#8e8d8a] hover:text-[#f4f3ef] border border-[#262626]'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>{tx('Blog / Dergi URL’sinden İçe Aktar', 'Import from Blog / Magazine URL')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('manual')}
            className={`px-4 py-2 rounded text-xs font-mono uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
              activeMode === 'manual'
                ? 'bg-[#c5a880] text-[#0a0a0a] font-semibold'
                : 'bg-[#181818] text-[#8e8d8a] hover:text-[#f4f3ef] border border-[#262626]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{tx('Manuel Giriş & Fotoğraf Yükle', 'Manual Entry & Upload Photos')}</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {formError && (
            <div className="p-3 bg-[#291717] border border-[#5c2323] rounded text-xs font-mono text-[#fca5a5] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#ef4444]" />
              <span>{formError}</span>
            </div>
          )}

          {/* MODE A: URL SCRAPER BAR */}
          {activeMode === 'url' && (
            <div className="p-4 bg-[#161616] border border-[#262626] rounded space-y-3">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#c5a880]">
                {tx('Blog, Dergi veya Moda Makalesi URL’sini Yapıştır', 'Paste Blog, Magazine, or Fashion Article URL')}
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Globe className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    placeholder={tx(
                      'https://numero.com/en/fashion/... veya herhangi bir moda makalesi URL’si',
                      'https://numero.com/en/fashion/... or any fashion blog article URL'
                    )}
                    value={articleUrl}
                    onChange={(e) => setArticleUrl(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded pl-9 pr-3 py-2 text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleFetchArticleUrl}
                  disabled={isFetchingUrl}
                  className="px-4 py-2 bg-[#f4f3ef] hover:bg-white disabled:opacity-50 text-[#0a0a0a] text-xs font-mono font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center justify-center gap-2 shrink-0"
                >
                  {isFetchingUrl ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{tx('Çekiliyor...', 'Fetching...')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{tx('Makaleyi & Görselleri Çek', 'Fetch Article & Images')}</span>
                    </>
                  )}
                </button>
              </div>
              {urlError && (
                <p className="text-xs font-mono text-[#f87171]">{urlError}</p>
              )}
              <p className="text-[11px] text-[#8e8d8a] font-sans">
                {tx(
                  'Karusel karelerinizi seçebilmeniz için makale başlığını, yazar/fotoğrafçı künyesini, özeti ve makale gövdesindeki tüm fotoğrafları otomatik olarak çıkarır.',
                  'Automatically extracts article title, author/photographer credit, summary, and all photographs from the article body so you can pick your Carousel frames.'
                )}
              </p>
            </div>
          )}

          {/* MODE B (AND FALLBACK/EXTRA IN URL MODE): DRAG & DROP FILE UPLOAD + EXTERNAL IMAGE URL */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#8e8d8a]">
                {tx(
                  `Fotoğraflar & Karusel Kareleri (${selectedImages.length} Seçili)`,
                  `Photographs & Carousel Frames (${selectedImages.length} Selected)`
                )}
              </span>
              {combinedGallery.length > 0 && (
                <span className="text-[10px] font-mono text-[#c5a880]">
                  {tx('Seçmek için küçültmelere tıklayın · İlk kare #1 Kapaktır', 'Click thumbnails to toggle · First frame is #1 Cover')}
                </span>
              )}
            </div>

            {/* Drag & Drop Computer Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-5 border border-dashed rounded text-center cursor-pointer transition ${
                isDragging
                  ? 'border-[#c5a880] bg-[#c5a880]/10'
                  : 'border-[#333333] bg-[#161616] hover:border-[#c5a880]/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => uploadLocalFiles(e.target.files)}
                className="hidden"
              />
              {isUploading ? (
                <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#c5a880]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{tx('Fotoğraflar yükleniyor...', 'Uploading photographs...')}</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-5 h-5 text-[#c5a880] mx-auto" />
                  <p className="text-xs font-mono text-[#f4f3ef]">
                    {tx(
                      'Bilgisayarınızdan fotoğrafları buraya sürükleyip bırakın veya seçmek için tıklayın',
                      'Drag & drop photos from your computer here, or click to browse'
                    )}
                  </p>
                  <p className="text-[11px] text-[#71717a] font-sans">
                    {tx(
                      'Çoklu görsel Karusel yüklemeyi destekler (JPG, PNG, WEBP)',
                      'Supports multi-image Carousel upload (JPG, PNG, WEBP)'
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Add Direct Image URL Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ImageIcon className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={tx(
                    'Veya doğrudan görsel URL’si yapıştırın (https://.../photo.jpg)',
                    'Or paste direct image URL (https://.../photo.jpg)'
                  )}
                  value={manualImageInput}
                  onChange={(e) => setManualImageInput(e.target.value)}
                  className="w-full bg-[#181818] border border-[#2a2a2a] rounded pl-9 pr-3 py-2 text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
                />
              </div>
              <button
                type="button"
                onClick={handleAddExternalImageUrl}
                className="px-3.5 py-2 bg-[#1e1e1e] hover:bg-[#2a2a2a] border border-[#333333] text-xs font-mono text-[#f4f3ef] rounded transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-[#c5a880]" />
                <span>{tx('Görsel Ekle', 'Add Image')}</span>
              </button>
            </div>

            {/* Selectable Gallery Grid */}
            {combinedGallery.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 max-h-[220px] overflow-y-auto p-2 bg-[#0d0d0d] border border-[#222222] rounded">
                {combinedGallery.map((imgUrl, idx) => {
                  const orderIdx = selectedImages.indexOf(imgUrl);
                  const isSelected = orderIdx !== -1;
                  return (
                    <div
                      key={`${imgUrl}-${idx}`}
                      className={`relative aspect-[3/4] rounded overflow-hidden border transition ${
                        isSelected
                          ? 'border-[#c5a880] ring-2 ring-[#c5a880]/40'
                          : 'border-[#262626] opacity-55 hover:opacity-90'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleFrame(imgUrl)}
                        className="w-full h-full block cursor-pointer"
                      >
                        <img
                          src={imgUrl}
                          alt={tx(`Kare ${idx + 1}`, `Frame ${idx + 1}`)}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-top"
                        />
                      </button>

                      <span
                        className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase pointer-events-none ${
                          orderIdx === 0
                            ? 'bg-[#c5a880] text-[#0a0a0a] font-bold'
                            : isSelected
                            ? 'bg-[#a3e635] text-[#0a0a0a] font-bold'
                            : 'bg-[#0a0a0a]/85 text-[#a1a1aa]'
                        }`}
                      >
                        {orderIdx === 0
                          ? tx('1. Kapak', '1. Cover')
                          : isSelected
                          ? `${orderIdx + 1}. ${tx('Kare', 'Frame')}`
                          : tx('+ Seç', '+ Select')}
                      </span>

                      {isSelected && orderIdx > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMakeCover(imgUrl);
                          }}
                          className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-[#0a0a0a]/90 border border-[#c5a880]/50 text-[8px] font-mono text-[#c5a880] hover:bg-[#c5a880] hover:text-[#0a0a0a] cursor-pointer"
                        >
                          {tx('#1 Yap', 'Make #1')}
                        </button>
                      )}

                      {!isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setScrapedGallery((prev) => prev.filter((u) => u !== imgUrl));
                          }}
                          className="absolute top-1 right-1 p-0.5 rounded bg-[#0a0a0a]/80 text-[#71717a] hover:text-[#ef4444] cursor-pointer"
                          title={tx('Listeden kaldır', 'Remove from list')}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* METADATA FIELDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-[#8e8d8a] uppercase mb-1">
                {tx('Editoryal Başlık *', 'Editorial Title *')}
              </label>
              <input
                type="text"
                required
                placeholder={tx('örn. Silhouettes in Brutalist Fog', 'e.g. Silhouettes in Brutalist Fog')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#181818] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-[#f4f3ef] font-sans focus:outline-none focus:border-[#c5a880]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#8e8d8a] uppercase mb-1">
                {tx('Fotoğrafçı / Yazar *', 'Photographer / Author *')}
              </label>
              <input
                type="text"
                required
                placeholder={tx('örn. Txema Yeste veya @kullanıcı', 'e.g. Txema Yeste or @username')}
                value={photographer}
                onChange={(e) => setPhotographer(e.target.value)}
                className="w-full bg-[#181818] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-[#f4f3ef] font-sans focus:outline-none focus:border-[#c5a880]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-[#8e8d8a] uppercase mb-1">
                {tx('Yayın / Blog Kaynağı *', 'Publication / Blog Source *')}
              </label>
              <input
                type="text"
                required
                placeholder={tx('örn. Numéro Magazine, Kişisel Stüdyo', 'e.g. Numéro Magazine, Personal Studio')}
                value={publication}
                onChange={(e) => setPublication(e.target.value)}
                className="w-full bg-[#181818] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-[#f4f3ef] font-sans focus:outline-none focus:border-[#c5a880]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#8e8d8a] uppercase mb-1">
                {tx('Stilist / Kreatif Direktör (Opsiyonel)', 'Stylist / Creative Direction (Optional)')}
              </label>
              <input
                type="text"
                placeholder={tx('örn. Robbie Spencer', 'e.g. Robbie Spencer')}
                value={stylist}
                onChange={(e) => setStylist(e.target.value)}
                className="w-full bg-[#181818] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-[#f4f3ef] font-sans focus:outline-none focus:border-[#c5a880]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[#8e8d8a] uppercase mb-1">
              {tx('Makale Özeti / Çekim Bağlamı', 'Article Summary / Shoot Context')}
            </label>
            <textarea
              rows={2}
              placeholder={tx('Görsel notlar, styling bağlamı, çekim lokasyonu...', 'Visual notes, styling context, shoot location...')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#181818] border border-[#2a2a2a] rounded p-3 text-xs text-[#f4f3ef] font-sans focus:outline-none focus:border-[#c5a880]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-[#8e8d8a] uppercase mb-1">
                {tx('Instagram Açıklaması (EN · AI taslağı için boş bırakın)', 'Instagram Caption (Leave blank for AI draft)')}
              </label>
              <textarea
                rows={2}
                placeholder={tx(
                  'İngilizce özel açıklama yazın veya Gemini’nin oluşturması için boş bırakın...',
                  'Write custom caption or leave empty to let Gemini craft one...'
                )}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full bg-[#181818] border border-[#2a2a2a] rounded p-2.5 text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#8e8d8a] uppercase mb-1">
                {tx('Etiketler / Hashtags (Opsiyonel · EN)', 'Hashtags (Optional, space/comma separated)')}
              </label>
              <textarea
                rows={2}
                placeholder="#editorial #fashionphotography #couture"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                className="w-full bg-[#181818] border border-[#2a2a2a] rounded p-2.5 text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
              />
            </div>
          </div>

          {/* TARGET DESTINATION SELECTOR */}
          <div className="p-4 bg-[#161616] border border-[#262626] rounded space-y-2.5">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#c5a880]">
              <Layers className="w-3.5 h-3.5" />
              <span>{tx('Hedef İş Akışı Konumu', 'Target Workflow Destination')}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: 'candidate' as const,
                  label: tx('Günlük Seçki', 'Daily Selection'),
                  desc: tx('Keşif Havuzu ve İlk 5’e ekle', 'Add to Discovery Pool & Top 5'),
                },
                {
                  id: 'selected' as const,
                  label: tx('Onay Kuyruğu', 'Approval Queue'),
                  desc: tx('Doğrudan inceleme kuyruğuna gönder', 'Send straight to review queue'),
                },
                {
                  id: 'approved' as const,
                  label: tx('Gönderi Paketleri', 'Post Packages'),
                  desc: tx('Yayın için hemen onayla', 'Approve immediately for release'),
                },
              ].map((dest) => {
                const active = targetStatus === dest.id;
                return (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => setTargetStatus(dest.id)}
                    className={`p-3 rounded border text-left transition cursor-pointer ${
                      active
                        ? 'bg-[#221f18] border-[#c5a880] text-[#f4f3ef]'
                        : 'bg-[#101010] border-[#262626] text-[#8e8d8a] hover:border-[#3a3a3a]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono font-semibold">
                      <span>{dest.label}</span>
                      {active && <Check className="w-3.5 h-3.5 text-[#c5a880]" />}
                    </div>
                    <span className="text-[10px] font-sans text-[#71717a] block mt-0.5">
                      {dest.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#222222] flex items-center justify-between gap-3">
            <span className="text-[11px] font-mono text-[#71717a]">
              {tx(
                `Karusel için ${selectedImages.length} kare sıraya alındı`,
                `${selectedImages.length} frame(s) queued for Carousel`
              )}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#8e8d8a] hover:text-[#f4f3ef] transition cursor-pointer"
              >
                {tx('İptal', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isProcessing || isUploading}
                className="px-5 py-2 bg-[#c5a880] hover:bg-[#d4b992] disabled:opacity-50 text-[#0a0a0a] text-xs font-mono font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{tx('Kaydediliyor & Puanlanıyor...', 'Saving & Scoring...')}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>
                      {tx('Oluştur ve Şuraya Gönder: ', 'Create & Send to ')}
                      {targetStatus === 'approved'
                        ? tx('Gönderi Paketleri', 'Post Packages')
                        : targetStatus === 'selected'
                        ? tx('Onay Kuyruğu', 'Approval Queue')
                        : tx('Günlük Seçki', 'Daily Selection')}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
