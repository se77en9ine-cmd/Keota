import React, { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCustomerDisplayStore,
  DisplayAdItem,
} from '../../store/useCustomerDisplayStore';
import {
  saveOfflineMedia,
  getOfflineMediaUrl,
  deleteOfflineMedia,
  extractVideoThumbnail,
  extractImageThumbnail,
  useOfflineMediaMap,
} from '../../utils/offlineMediaDB';
import { soundFX } from '../../utils/audio';
import {
  Tv,
  Image as ImageIcon,
  Video,
  Plus,
  Edit2,
  Trash2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  Check,
  X,
  Layers,
  Monitor,
  MoveUp,
  MoveDown,
  Clock,
  RotateCcw,
  Megaphone,
  Repeat,
  Flame,
  Cast,
  HardDrive,
  UploadCloud,
  FileVideo,
  FileImage,
  Globe,
  CheckCircle2,
  Lock,
  Search,
  Filter,
  Grid,
  List,
  CheckSquare,
  Square,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Film,
  Zap,
} from 'lucide-react';
import { CustomCheckbox } from '../common/CustomCheckbox';

export const CustomerDisplayManagerTab: React.FC = () => {
  const { t } = useTranslation();
  const {
    config,
    ads,
    updateConfig,
    addAd,
    updateAd,
    deleteAd,
    batchDelete,
    batchToggleActive,
    reorderAds,
    toggleAdActive,
    resetToDefaults,
  } = useCustomerDisplayStore();

  // Persistent real-time offline media resolver map (survives page refreshes)
  const mediaMap = useOfflineMediaMap(ads);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<DisplayAdItem | null>(null);

  // Large Playlist Management States (Search, Filter, View Mode, Selection, Pagination)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'ACTIVE' | 'PAUSED' | 'VIDEO' | 'IMAGE' | 'OFFLINE'>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [selectedAdIds, setSelectedAdIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(12);

  // Source Type Mode: OFFLINE_FILE vs ONLINE_URL
  const [sourceType, setSourceType] = useState<'OFFLINE_FILE' | 'ONLINE_URL'>('OFFLINE_FILE');

  // Form states for Add/Edit Ad
  const [adTitle, setAdTitle] = useState('');
  const [adSubtitle, setAdSubtitle] = useState('');
  const [adBadge, setAdBadge] = useState('');
  const [adType, setAdType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [adUrl, setAdUrl] = useState('');
  const [adDuration, setAdDuration] = useState(8);
  const [adVideoLoopCount, setAdVideoLoopCount] = useState<number>(1);
  const [adPriceTag, setAdPriceTag] = useState('');
  const [adCta, setAdCta] = useState('');
  const [adIsActive, setAdIsActive] = useState(true);

  // Offline File States
  const [isOfflineFile, setIsOfflineFile] = useState(false);
  const [offlineFileId, setOfflineFileId] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileSizeMB, setSelectedFileSizeMB] = useState<number>(0);
  const [adThumbnailUrl, setAdThumbnailUrl] = useState<string>('');
  const [offlineBlobUrl, setOfflineBlobUrl] = useState<string>('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter & Search computation
  const filteredAds = useMemo(() => {
    return ads.filter((ad) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        ad.title.toLowerCase().includes(q) ||
        (ad.subtitle && ad.subtitle.toLowerCase().includes(q)) ||
        (ad.badgeText && ad.badgeText.toLowerCase().includes(q)) ||
        (ad.fileName && ad.fileName.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filterType === 'ACTIVE') return ad.isActive;
      if (filterType === 'PAUSED') return !ad.isActive;
      if (filterType === 'VIDEO') return ad.type === 'VIDEO';
      if (filterType === 'IMAGE') return ad.type === 'IMAGE';
      if (filterType === 'OFFLINE') return !!ad.isOfflineFile;
      return true;
    });
  }, [ads, searchQuery, filterType]);

  const totalPages = Math.ceil(filteredAds.length / pageSize) || 1;
  const paginatedAds = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAds.slice(start, start + pageSize);
  }, [filteredAds, currentPage, pageSize]);

  // Counts for filter chips
  const activeCount = ads.filter((a) => a.isActive).length;
  const pausedCount = ads.filter((a) => !a.isActive).length;
  const videoCount = ads.filter((a) => a.type === 'VIDEO').length;
  const imageCount = ads.filter((a) => a.type === 'IMAGE').length;
  const offlineCount = ads.filter((a) => a.isOfflineFile).length;

  // Batch Selection Handlers
  const handleToggleSelectAd = (id: string) => {
    setSelectedAdIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedAdIds.length === filteredAds.length) {
      setSelectedAdIds([]);
    } else {
      setSelectedAdIds(filteredAds.map((a) => a.id));
    }
  };

  const handleBatchActivate = (active: boolean) => {
    if (selectedAdIds.length === 0) return;
    batchToggleActive(selectedAdIds, active);
    setSelectedAdIds([]);
    soundFX.playCashSuccess();
  };

  const handleBatchDelete = () => {
    if (selectedAdIds.length === 0) return;
    if (window.confirm(`Delete ${selectedAdIds.length} selected advertisements?`)) {
      batchDelete(selectedAdIds);
      setSelectedAdIds([]);
      soundFX.playCashSuccess();
    }
  };

  // Quick preset sample links
  const PRESET_SAMPLES = [
    {
      title: 'Artisanal Cold Brew Promo',
      subtitle: 'Steeped for 18 hours with organic mountain beans',
      badge: '☕ BARISTA SPECIAL',
      type: 'IMAGE' as const,
      url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1200&q=80',
      duration: 8,
      videoLoopCount: 1,
      price: '35,000 LAK',
      cta: 'Order at Cashier',
    },
    {
      title: 'Gourmet Wagyu Burger Combo',
      subtitle: '100% Grass-fed Wagyu beef patty with truffle dip',
      badge: '🍔 CHEF SELECTION',
      type: 'IMAGE' as const,
      url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
      duration: 8,
      videoLoopCount: 1,
      price: '89,000 LAK',
      cta: 'Special Set',
    },
    {
      title: 'Coffee Roasting Video Reel',
      subtitle: 'Handcrafted espresso and fresh roasts daily',
      badge: '🎬 VIDEO REEL',
      type: 'VIDEO' as const,
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      duration: 15,
      videoLoopCount: 1,
      price: 'FRESH ROAST',
      cta: 'Watch & Enjoy',
    },
  ];

  const handleOpenAddAd = () => {
    setEditingAd(null);
    setSourceType('OFFLINE_FILE');
    setAdTitle('');
    setAdSubtitle('');
    setAdBadge('🔥 SPECIAL OFFER');
    setAdType('IMAGE');
    setAdUrl('');
    setAdDuration(8);
    setAdVideoLoopCount(1);
    setAdPriceTag('');
    setAdCta('Order Now');
    setAdIsActive(true);
    setIsOfflineFile(false);
    setOfflineFileId('');
    setSelectedFileName('');
    setSelectedFileSizeMB(0);
    setAdThumbnailUrl('');
    setOfflineBlobUrl('');
    setModalOpen(true);
  };

  const handleOpenEditAd = async (ad: DisplayAdItem) => {
    setEditingAd(ad);
    setSourceType(ad.isOfflineFile ? 'OFFLINE_FILE' : 'ONLINE_URL');
    setAdTitle(ad.title);
    setAdSubtitle(ad.subtitle || '');
    setAdBadge(ad.badgeText || '');
    setAdType(ad.type);
    setAdUrl(ad.url);
    setAdDuration(ad.durationSeconds || 8);
    setAdVideoLoopCount(ad.videoLoopCount ?? 1);
    setAdPriceTag(ad.priceTag || '');
    setAdCta(ad.callToAction || '');
    setAdIsActive(ad.isActive);
    setIsOfflineFile(!!ad.isOfflineFile);
    setOfflineFileId(ad.offlineFileId || '');
    setSelectedFileName(ad.fileName || '');
    setSelectedFileSizeMB(ad.fileSizeMB || 0);
    setAdThumbnailUrl(ad.thumbnailUrl || '');

    if (ad.isOfflineFile && ad.offlineFileId) {
      const blobUrl = await getOfflineMediaUrl(ad.offlineFileId);
      setOfflineBlobUrl(blobUrl || ad.url);
    } else {
      setOfflineBlobUrl('');
    }

    setModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    await processOfflineFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processOfflineFile(file);
    }
  };

  const processOfflineFile = async (file: File) => {
    setIsProcessingFile(true);
    try {
      const isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|m4v|ogg)$/i);
      const mediaType: 'IMAGE' | 'VIDEO' = isVideo ? 'VIDEO' : 'IMAGE';
      setAdType(mediaType);

      // Extract persistent thumbnail poster
      const thumb = await (isVideo ? extractVideoThumbnail(file) : extractImageThumbnail(file));
      setAdThumbnailUrl(thumb);

      const generatedId = offlineFileId || `offline_${Date.now()}`;
      const blobUrl = await saveOfflineMedia(generatedId, file, mediaType, thumb);

      setIsOfflineFile(true);
      setOfflineFileId(generatedId);
      setSelectedFileName(file.name);
      setSelectedFileSizeMB(Number((file.size / (1024 * 1024)).toFixed(2)));
      setOfflineBlobUrl(blobUrl);
      setAdUrl(blobUrl);

      if (!adTitle.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setAdTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }

      if (isVideo) {
        const tempVideo = document.createElement('video');
        tempVideo.src = blobUrl;
        tempVideo.onloadedmetadata = () => {
          if (tempVideo.duration && !isNaN(tempVideo.duration) && isFinite(tempVideo.duration)) {
            setAdDuration(Math.round(tempVideo.duration));
          }
        };
      }

      soundFX.playCashSuccess();
    } catch (err) {
      console.error('Failed to process offline file:', err);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adTitle.trim()) return;

    const finalUrl = isOfflineFile ? offlineBlobUrl || adUrl : adUrl;
    if (!finalUrl.trim() && !isOfflineFile) return;

    if (editingAd) {
      updateAd(editingAd.id, {
        title: adTitle,
        subtitle: adSubtitle,
        badgeText: adBadge,
        type: adType,
        url: finalUrl,
        durationSeconds: Number(adDuration),
        videoLoopCount: Number(adVideoLoopCount),
        priceTag: adPriceTag,
        callToAction: adCta,
        isActive: adIsActive,
        isOfflineFile,
        offlineFileId: isOfflineFile ? offlineFileId : undefined,
        fileName: isOfflineFile ? selectedFileName : undefined,
        fileSizeMB: isOfflineFile ? selectedFileSizeMB : undefined,
        thumbnailUrl: isOfflineFile ? adThumbnailUrl || editingAd.thumbnailUrl : undefined,
      });
    } else {
      addAd({
        title: adTitle,
        subtitle: adSubtitle,
        badgeText: adBadge,
        type: adType,
        url: finalUrl,
        durationSeconds: Number(adDuration),
        videoLoopCount: Number(adVideoLoopCount),
        priceTag: adPriceTag,
        callToAction: adCta,
        isActive: adIsActive,
        isOfflineFile,
        offlineFileId: isOfflineFile ? offlineFileId : undefined,
        fileName: isOfflineFile ? selectedFileName : undefined,
        fileSizeMB: isOfflineFile ? selectedFileSizeMB : undefined,
        thumbnailUrl: isOfflineFile ? adThumbnailUrl : undefined,
      });
    }

    soundFX.playCashSuccess();
    setModalOpen(false);
  };

  const handleDeleteAd = async (ad: DisplayAdItem) => {
    if (ad.isOfflineFile && ad.offlineFileId) {
      await deleteOfflineMedia(ad.offlineFileId);
    }
    deleteAd(ad.id);
    soundFX.playCashSuccess();
  };

  const handleApplyPreset = (preset: typeof PRESET_SAMPLES[0]) => {
    setSourceType('ONLINE_URL');
    setIsOfflineFile(false);
    setAdTitle(preset.title);
    setAdSubtitle(preset.subtitle);
    setAdBadge(preset.badge);
    setAdType(preset.type);
    setAdUrl(preset.url);
    setAdDuration(preset.duration);
    setAdVideoLoopCount(preset.videoLoopCount || 1);
    setAdPriceTag(preset.price);
    setAdCta(preset.cta);
    setAdThumbnailUrl('');
  };

  const openCustomerDisplayWindow = () => {
    const width = 1280;
    const height = 720;
    const left = window.screen.width;
    const top = 0;
    window.open(
      '/display',
      '39POS_CustomerDisplay',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,status=no,toolbar=no,menubar=no`
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─── 1. Header Command Deck ─── */}
      <div className="p-6 neu-card-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl neu-sunken-sm flex items-center justify-center shrink-0 text-emerald-500">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {t('customerDisplay.title', 'Customer Display & Promotional Ads (VDO/Image)')}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold neu-pill text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>{t('customerDisplay.offlineDualScreenReady', 'OFFLINE MEDIA & DUAL SCREEN READY')}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl font-medium">
              {t(
                'customerDisplay.subtitle',
                'Show interactive promotional videos, seasonal banners from local offline PC disk, real-time itemized checkout slips, and dynamic QR banking payment on the 2nd customer-facing monitor.'
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCustomerDisplayWindow}
          className="px-5 py-2.5 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Cast className="w-4 h-4" />
          <span>{t('customerDisplay.launchScreen', 'Open Customer Screen (2nd Monitor)')}</span>
        </button>
      </div>

      {/* ─── 2. Clean 2-Column Settings Matrix ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Promotional Media Engine */}
        <div className="p-5 neu-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-black text-xs text-slate-900 dark:text-white">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{t('customerDisplay.enableAdsTitle', 'Promotional Media Engine')}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
              {t('customerDisplay.enableAdsDesc', 'Display auto-looping videos and seasonal promotional banners on customer monitor.')}
            </p>
          </div>

          <div className="flex items-center p-1 neu-tab-container shrink-0">
            <button
              type="button"
              onClick={() => updateConfig({ enableAds: true })}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                config.enableAds
                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t('common.active', 'Active')}</span>
            </button>
            <button
              type="button"
              onClick={() => updateConfig({ enableAds: false })}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                !config.enableAds
                  ? 'neu-tab-active text-slate-700 dark:text-slate-300'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <X className="w-3.5 h-3.5" />
              <span>{t('common.disabled', 'Disabled')}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Audio & Autoplay */}
        <div className="p-5 neu-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-black text-xs text-slate-900 dark:text-white">
              <Volume2 className="w-4 h-4 text-emerald-500" />
              <span>{t('customerDisplay.audioTitle', 'Video Audio Playback')}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
              {t('customerDisplay.audioDesc', 'Keep videos muted to prevent counter noise, or enable sound for loud promotions.')}
            </p>
          </div>

          <div className="flex items-center p-1 neu-tab-container shrink-0">
            <button
              type="button"
              onClick={() => updateConfig({ muteVideo: true })}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                config.muteVideo
                  ? 'neu-tab-active text-slate-700 dark:text-slate-300'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>{t('customerDisplay.muted', 'Muted')}</span>
            </button>
            <button
              type="button"
              onClick={() => updateConfig({ muteVideo: false })}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                !config.muteVideo
                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{t('customerDisplay.soundOn', 'Sound On')}</span>
            </button>
          </div>
        </div>

        {/* Card 3: Playlist Looping Strategy */}
        <div className="p-5 neu-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-black text-xs text-slate-900 dark:text-white">
              <Repeat className="w-4 h-4 text-teal-500" />
              <span>{t('customerDisplay.loopingModeTitle', 'Playlist Looping Mode')}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
              {t('customerDisplay.loopingModeDesc', 'Circular queue loop through all active ads, or lock to single current media.')}
            </p>
          </div>

          <div className="flex items-center p-1 neu-tab-container shrink-0">
            <button
              type="button"
              onClick={() => updateConfig({ loopMode: 'CONTINUOUS_PLAYLIST' })}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                config.loopMode !== 'REPEAT_CURRENT'
                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('customerDisplay.loopAll', 'Loop All')}</span>
            </button>
            <button
              type="button"
              onClick={() => updateConfig({ loopMode: 'REPEAT_CURRENT' })}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                config.loopMode === 'REPEAT_CURRENT'
                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{t('customerDisplay.singleLock', 'Single Lock')}</span>
            </button>
          </div>
        </div>

        {/* Card 4: Standby Screen Mode */}
        <div className="p-5 neu-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-black text-xs text-slate-900 dark:text-white">
              <Monitor className="w-4 h-4 text-emerald-500" />
              <span>{t('customerDisplay.standbyModeTitle', 'Standby Display Mode')}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
              {t('customerDisplay.standbyModeDesc', 'Screen content displayed when no active checkout is occurring at the register.')}
            </p>
          </div>

          <div className="flex items-center p-1 neu-tab-container shrink-0">
            <button
              type="button"
              onClick={() => updateConfig({ standbyMode: 'FULL_PROMOTION' })}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                config.standbyMode === 'FULL_PROMOTION'
                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>{t('customerDisplay.cinemaReel', 'Cinema Reel')}</span>
            </button>
            <button
              type="button"
              onClick={() => updateConfig({ standbyMode: 'STORE_LOGO' })}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                config.standbyMode === 'STORE_LOGO'
                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>{t('customerDisplay.storeLogo', 'Store Logo')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 3. Announcement Ticker Input ─── */}
      <div className="p-5 neu-card space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-amber-500" />
            <span>{t('customerDisplay.tickerLabel', 'Customer Screen Marquee / Announcement Ticker')}</span>
          </label>
          <span className="text-[10px] text-slate-400 font-mono">{t('customerDisplay.liveScrollingFooter', 'Live scrolling footer')}</span>
        </div>
        <input
          type="text"
          value={config.announcementTicker || ''}
          onChange={(e) => updateConfig({ announcementTicker: e.target.value })}
          placeholder="e.g. 🔥 MEMBER SPECIAL: Earn 2X Reward Points on all Fresh Bakery & Specialty Beverages this week!..."
          className="w-full h-11 px-4 neu-input text-xs font-bold text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
        />
      </div>

      {/* ─── 4. Enterprise Multi-Ad Control Suite (For 20+ Ads) ─── */}
      <div className="neu-card-lg overflow-hidden">
        {/* Gallery Top Bar */}
        <div className="p-6 border-b border-slate-200/40 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-emerald-500" />
              <span>{t('customerDisplay.playlistTitle', 'Promotional Media Playlist & Slideshow')}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black neu-pill text-emerald-600 dark:text-emerald-400">
                {t('customerDisplay.totalAdsCount', '{{count}} Total Ads', { count: ads.length })}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('customerDisplay.playlistSubtitle', 'Manage promotional videos, menu boards, and posters. Scaled for 20+ advertisements with search, batch actions, and queue table mode.')}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={resetToDefaults}
              className="px-4 py-2.5 neu-btn text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('customerDisplay.resetPresets', 'Load Defaults')}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddAd}
              className="px-5 py-2.5 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t('customerDisplay.btnAddAd', 'Add Video / Image Ad')}</span>
            </button>
          </div>
        </div>

        {/* ─── Search, Filter, Batch Toolbar & View Switcher Bar ─── */}
        <div className="p-4 border-b border-slate-200/40 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          {/* Left: Search & Filter Chips */}
          <div className="flex items-center gap-3 flex-wrap flex-1 min-w-[300px]">
            {/* Search Input */}
            <div className="relative min-w-[220px] max-w-sm flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={t('customerDisplay.searchPlaceholder', 'Search by title, badge, or tag...')}
                className="w-full h-10 pl-9 pr-3 neu-input text-xs font-bold text-slate-900 dark:text-white outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap p-1 neu-tab-container text-xs">
              <button
                type="button"
                onClick={() => {
                  setFilterType('ALL');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                  filterType === 'ALL'
                    ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('customerDisplay.filterAll', 'All ({{count}})', { count: ads.length })}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterType('ACTIVE');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filterType === 'ACTIVE'
                    ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{t('customerDisplay.filterActive', 'Active ({{count}})', { count: activeCount })}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterType('PAUSED');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                  filterType === 'PAUSED'
                    ? 'neu-tab-active text-amber-600 dark:text-amber-400'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('customerDisplay.filterPaused', 'Paused ({{count}})', { count: pausedCount })}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterType('VIDEO');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filterType === 'VIDEO'
                    ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>{t('customerDisplay.filterVideos', 'Videos ({{count}})', { count: videoCount })}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterType('OFFLINE');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filterType === 'OFFLINE'
                    ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>{t('customerDisplay.filterOffline', 'Offline Disk ({{count}})', { count: offlineCount })}</span>
              </button>
            </div>
          </div>

          {/* Right: View Switcher & Batch Selection */}
          <div className="flex items-center gap-3 shrink-0">
            {/* View Mode Grid vs Table Switcher */}
            <div className="flex items-center p-1 neu-tab-container">
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                className={`p-2 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'GRID' ? 'neu-tab-active text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Grid Cards View"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs font-bold">{t('customerDisplay.viewGrid', 'Grid')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`p-2 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'TABLE' ? 'neu-tab-active text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Playlist Queue Table View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs font-bold">{t('customerDisplay.viewTable', 'Table')}</span>
              </button>
            </div>

            {/* Select All Checkbox */}
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-2 neu-btn text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
            >
              {selectedAdIds.length === filteredAds.length && filteredAds.length > 0 ? (
                <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{t('customerDisplay.selectAll', 'Select All')}</span>
            </button>
          </div>
        </div>

        {/* ─── Batch Action Floating Ribbon ─── */}
        {selectedAdIds.length > 0 && (
          <div className="p-4 neu-card-sm m-4 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-400">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>{t('customerDisplay.selectedCount', '{{count}} Advertisements Selected', { count: selectedAdIds.length })}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBatchActivate(true)}
                className="px-3.5 py-2 neu-btn-primary text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{t('customerDisplay.batchActivate', 'Activate Selected')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleBatchActivate(false)}
                className="px-3.5 py-2 neu-btn text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>{t('customerDisplay.batchPause', 'Pause Selected')}</span>
              </button>

              <button
                type="button"
                onClick={handleBatchDelete}
                className="px-3.5 py-2 neu-btn-danger text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('customerDisplay.batchDelete', 'Delete Selected')}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAdIds([])}
                className="neu-circle-btn w-8 h-8 text-xs font-bold text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ─── Mode A: Poster Grid Mode (16:9 Visual Cards with Persistent Posters) ─── */}
        {viewMode === 'GRID' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedAds.map((ad, idx) => {
              const isSelected = selectedAdIds.includes(ad.id);
              const activeMediaSrc = mediaMap[ad.id] || ad.url;
              return (
                <div
                  key={ad.id}
                  className={`neu-card-interactive overflow-hidden flex flex-col justify-between transition-all group duration-200 relative ${
                    isSelected
                      ? 'ring-2 ring-emerald-500'
                      : !ad.isActive
                      ? 'opacity-60'
                      : ''
                  }`}
                >
                  {/* Select Checkbox Top Overlay */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelectAd(ad.id);
                    }}
                    className="absolute top-3 left-3 z-20 neu-circle-btn w-8 h-8 backdrop-blur-md cursor-pointer text-slate-700 dark:text-white hover:scale-110 transition-transform"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {/* Media Thumbnail / Video Preview */}
                  <div className="h-48 neu-sunken relative overflow-hidden flex items-center justify-center m-3 rounded-2xl">
                    {ad.type === 'VIDEO' ? (
                      <video
                        src={activeMediaSrc}
                        poster={ad.thumbnailUrl}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        onMouseOver={(e) => e.currentTarget.play().catch(() => {})}
                        onMouseOut={(e) => e.currentTarget.pause()}
                      />
                    ) : (
                      <img
                        src={activeMediaSrc || ad.thumbnailUrl}
                        alt={ad.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          if (ad.thumbnailUrl) {
                            (e.target as HTMLImageElement).src = ad.thumbnailUrl;
                          } else {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80';
                          }
                        }}
                      />
                    )}

                    {/* Dark Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

                    {/* Badge Overlay */}
                    {ad.badgeText && (
                      <span className="absolute top-3 left-12 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-black/70 text-amber-400 backdrop-blur-md">
                        {ad.badgeText}
                      </span>
                    )}

                    {/* Type Indicator */}
                    <span className="absolute top-3 right-3 p-1.5 rounded-xl bg-black/70 text-white backdrop-blur-md flex items-center gap-1">
                      {ad.type === 'VIDEO' ? (
                        <Video className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </span>

                    {/* Offline Badge */}
                    {ad.isOfflineFile && (
                      <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-teal-600/80 text-white backdrop-blur-md flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        <span>Offline File</span>
                      </span>
                    )}

                    {/* Price tag */}
                    {ad.priceTag && (
                      <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl text-xs font-mono font-black bg-emerald-500 text-white shadow-md">
                        {ad.priceTag}
                      </span>
                    )}
                  </div>

                  {/* Details & Actions */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="font-black text-sm text-slate-900 dark:text-white leading-snug">{ad.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{ad.subtitle || 'No description'}</div>

                      <div className="flex items-center gap-2 mt-2.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="px-2 py-0.5 rounded-lg neu-pill flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-500" />
                          <span>{ad.durationSeconds}s</span>
                        </span>
                        {ad.type === 'VIDEO' && (
                          <span className="px-2 py-0.5 rounded-lg neu-pill text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" />
                            <span>{ad.videoLoopCount === -1 ? 'Infinite Loop' : `Loop ${ad.videoLoopCount || 1}x`}</span>
                          </span>
                        )}
                        {ad.isOfflineFile && ad.fileSizeMB && (
                          <span className="px-2 py-0.5 rounded-lg neu-pill text-slate-500 dark:text-slate-400">
                            {ad.fileSizeMB} MB
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/40 dark:border-slate-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => toggleAdActive(ad.id)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wide cursor-pointer transition-all ${
                          ad.isActive
                            ? 'neu-pill text-emerald-600 dark:text-emerald-400'
                            : 'neu-pill text-slate-400'
                        }`}
                      >
                        {ad.isActive ? 'ACTIVE' : 'PAUSED'}
                      </button>

                      <div className="flex items-center gap-1">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => reorderAds(idx, idx - 1)}
                            className="neu-circle-btn w-7 h-7 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                            title="Move Up"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {idx < paginatedAds.length - 1 && (
                          <button
                            type="button"
                            onClick={() => reorderAds(idx, idx + 1)}
                            className="neu-circle-btn w-7 h-7 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                            title="Move Down"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEditAd(ad)}
                          className="neu-circle-btn w-7 h-7 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                          title="Edit Ad"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAd(ad)}
                          className="neu-circle-btn w-7 h-7 text-slate-400 hover:text-rose-500 cursor-pointer"
                          title="Delete Ad"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Mode B: High-Density Playlist Queue Table Mode ─── */}
        {viewMode === 'TABLE' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                  <th className="p-3.5 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="cursor-pointer text-slate-400 hover:text-slate-800 dark:hover:text-white"
                    >
                      {selectedAdIds.length === filteredAds.length && filteredAds.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3.5 w-14"># Order</th>
                  <th className="p-3.5">Media Preview</th>
                  <th className="p-3.5">Title & Subtitle</th>
                  <th className="p-3.5">Type / Source</th>
                  <th className="p-3.5">Duration & Loop</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {paginatedAds.map((ad, idx) => {
                  const isSelected = selectedAdIds.includes(ad.id);
                  const globalIdx = (currentPage - 1) * pageSize + idx;
                  const activeMediaSrc = mediaMap[ad.id] || ad.url;
                  return (
                    <tr
                      key={ad.id}
                      className={`hover:bg-slate-100/40 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-emerald-500/10' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectAd(ad.id)}
                          className="cursor-pointer text-slate-400 hover:text-slate-800 dark:hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-400">
                        #{globalIdx + 1}
                      </td>
                      <td className="p-3.5">
                        <div className="w-16 h-10 rounded-xl neu-sunken-sm overflow-hidden relative">
                          {ad.type === 'VIDEO' ? (
                            <video
                              src={activeMediaSrc}
                              poster={ad.thumbnailUrl}
                              className="w-full h-full object-cover"
                              muted
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={activeMediaSrc || ad.thumbnailUrl}
                              alt={ad.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{ad.title}</span>
                          {ad.badgeText && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black neu-pill text-amber-500">
                              {ad.badgeText}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{ad.subtitle || '-'}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          {ad.type === 'VIDEO' ? (
                            <span className="px-2 py-0.5 rounded-md neu-pill text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                              <Video className="w-3 h-3" />
                              <span>Video</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md neu-pill text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              <span>Image</span>
                            </span>
                          )}
                          {ad.isOfflineFile && (
                            <span className="px-2 py-0.5 rounded-md neu-pill text-teal-600 dark:text-teal-400 text-[10px] font-bold">
                              Disk ({ad.fileSizeMB || 'Offline'} MB)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                        <span>{ad.durationSeconds}s</span>
                        {ad.type === 'VIDEO' && (
                          <span className="text-emerald-500 ml-2">
                            ({ad.videoLoopCount === -1 ? 'Infinite' : `${ad.videoLoopCount || 1}x`})
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => toggleAdActive(ad.id)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                            ad.isActive
                              ? 'neu-pill text-emerald-600 dark:text-emerald-400'
                              : 'neu-pill text-slate-400'
                          }`}
                        >
                          {ad.isActive ? 'ACTIVE' : 'PAUSED'}
                        </button>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {globalIdx > 0 && (
                            <button
                              type="button"
                              onClick={() => reorderAds(globalIdx, globalIdx - 1)}
                              className="neu-circle-btn w-7 h-7 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                              title="Move Up"
                            >
                              <MoveUp className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {globalIdx < ads.length - 1 && (
                            <button
                              type="button"
                              onClick={() => reorderAds(globalIdx, globalIdx + 1)}
                              className="neu-circle-btn w-7 h-7 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                              title="Move Down"
                            >
                              <MoveDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditAd(ad)}
                            className="neu-circle-btn w-7 h-7 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                            title="Edit Ad"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAd(ad)}
                            className="neu-circle-btn w-7 h-7 text-slate-400 hover:text-rose-500 cursor-pointer"
                            title="Delete Ad"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Pagination Footer ─── */}
        {filteredAds.length > pageSize && (
          <div className="p-4 border-t border-slate-200/40 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredAds.length)} of {filteredAds.length} items
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="neu-circle-btn w-8 h-8 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono font-bold text-slate-800 dark:text-white px-2">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="neu-circle-btn w-8 h-8 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── 5. Add / Edit Media Ad Modal ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-2xl neu-card-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/40 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {editingAd ? 'Edit Promotional Advertisement' : 'Add New Promotional Media'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Offline video (.mp4) or banner image displayed on customer screen
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="neu-circle-btn w-8 h-8 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAd} className="space-y-4">
              {/* Source Type Switcher */}
              <div className="p-1 neu-tab-container grid grid-cols-2 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setSourceType('OFFLINE_FILE');
                    setIsOfflineFile(true);
                  }}
                  className={`py-2 rounded-full flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    sourceType === 'OFFLINE_FILE'
                      ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <HardDrive className="w-4 h-4 text-emerald-500" />
                  <span>Offline Local File (Zero Upload)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSourceType('ONLINE_URL');
                    setIsOfflineFile(false);
                  }}
                  className={`py-2 rounded-full flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    sourceType === 'ONLINE_URL'
                      ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <Globe className="w-4 h-4 text-emerald-500" />
                  <span>Direct Web URL / Presets</span>
                </button>
              </div>

              {/* ─── Mode A: Offline Local File Chooser ─── */}
              {sourceType === 'OFFLINE_FILE' ? (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime,image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="neu-sunken p-6 text-center cursor-pointer transition-all space-y-3 group"
                  >
                    <div className="w-14 h-14 mx-auto rounded-2xl neu-card-sm text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-7 h-7" />
                    </div>

                    <div>
                      <div className="font-black text-sm text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                        <span>Click to choose file or drag & drop</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Supports MP4, WebM videos, PNG, JPG, WebP image posters
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full neu-pill text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Zero Upload • Plays 100% Offline from Local Computer</span>
                    </div>
                  </div>

                  {/* Selected Offline File Info & Preview */}
                  {selectedFileName && (
                    <div className="p-3.5 neu-card-sm flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {adThumbnailUrl ? (
                          <img
                            src={adThumbnailUrl}
                            alt="Preview"
                            className="w-12 h-10 rounded-xl object-cover shrink-0 neu-sunken-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl neu-sunken-sm text-emerald-500 flex items-center justify-center shrink-0">
                            {adType === 'VIDEO' ? <FileVideo className="w-5 h-5" /> : <FileImage className="w-5 h-5" />}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-black text-xs text-slate-900 dark:text-white truncate">{selectedFileName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {selectedFileSizeMB} MB • {adType === 'VIDEO' ? 'Video Reel' : 'Image Poster'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 neu-btn text-xs font-bold shrink-0 cursor-pointer"
                      >
                        Change File
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* ─── Mode B: Online URL & Presets ─── */
                <div className="space-y-3">
                  {!editingAd && (
                    <div className="p-3 neu-card-sm space-y-1.5">
                      <div className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                        Quick Sample Presets
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {PRESET_SAMPLES.map((p, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleApplyPreset(p)}
                            className="px-3 py-1 neu-pill font-bold text-[10px] text-slate-700 dark:text-slate-300 cursor-pointer hover:text-emerald-600"
                          >
                            {p.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Media Type Switcher for URLs */}
                  <div className="grid grid-cols-2 gap-2 p-1 neu-tab-container text-xs font-black">
                    <button
                      type="button"
                      onClick={() => setAdType('IMAGE')}
                      className={`py-2 rounded-full flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        adType === 'IMAGE' ? 'neu-tab-active text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4 text-emerald-500" />
                      <span>Image Banner / Poster</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdType('VIDEO')}
                      className={`py-2 rounded-full flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        adType === 'VIDEO' ? 'neu-tab-active text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      <Video className="w-4 h-4 text-emerald-500" />
                      <span>Promotional Video (.mp4)</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Media Direct URL
                    </label>
                    <input
                      type="url"
                      required={!isOfflineFile}
                      value={adUrl}
                      onChange={(e) => setAdUrl(e.target.value)}
                      placeholder="https://... direct MP4/JPG/PNG URL"
                      className="w-full h-11 px-4 neu-input text-xs font-mono font-bold text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>
              )}

              {/* ─── Ad Details Form ─── */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Ad Headline Title
                </label>
                <input
                  type="text"
                  required
                  value={adTitle}
                  onChange={(e) => setAdTitle(e.target.value)}
                  placeholder="e.g. Signature Dark Roast Espresso + Croissant Set"
                  className="w-full h-11 px-4 neu-input text-xs font-bold text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Subtitle / Promo Description
                </label>
                <input
                  type="text"
                  value={adSubtitle}
                  onChange={(e) => setAdSubtitle(e.target.value)}
                  placeholder="e.g. Freshly brewed with 100% organic beans, daily 7:00 AM - 11:00 AM"
                  className="w-full h-11 px-4 neu-input text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Badge Tag
                  </label>
                  <input
                    type="text"
                    value={adBadge}
                    onChange={(e) => setAdBadge(e.target.value)}
                    placeholder="🔥 50% OFF"
                    className="w-full h-10 px-3 neu-input text-xs font-bold text-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Price Tag
                  </label>
                  <input
                    type="text"
                    value={adPriceTag}
                    onChange={(e) => setAdPriceTag(e.target.value)}
                    placeholder="35,000 LAK"
                    className="w-full h-10 px-3 neu-input text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Slide Seconds
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={120}
                    value={adDuration}
                    onChange={(e) => setAdDuration(Number(e.target.value))}
                    className="w-full h-10 px-3 neu-input text-xs font-mono font-bold text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Video Looping Specific Controls */}
              {adType === 'VIDEO' && (
                <div className="p-4 neu-card-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Video Loop & Repeat Behavior</span>
                    </span>
                    <select
                      value={adVideoLoopCount}
                      onChange={(e) => setAdVideoLoopCount(Number(e.target.value))}
                      className="h-8 px-3 neu-input text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                    >
                      <option value={1}>Play 1x (Single play, then advance)</option>
                      <option value={2}>Repeat 2x (Play twice before next ad)</option>
                      <option value={3}>Repeat 3x (Play 3 times before next ad)</option>
                      <option value={-1}>Infinite Loop (Keep repeating this video)</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    Controls how many times this specific video clip will repeat before the player automatically transitions to the next promotional ad in the playlist.
                  </p>
                </div>
              )}

              <div
                onClick={() => setAdIsActive(!adIsActive)}
                className="flex items-center gap-3 p-3.5 neu-card-sm cursor-pointer text-slate-700 dark:text-slate-200 font-bold"
              >
                <CustomCheckbox
                  checked={adIsActive}
                  onChange={(checked) => setAdIsActive(checked)}
                />
                <span className="text-xs">Enable this advertisement immediately in active playlist</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/40 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 neu-btn font-bold text-slate-600 dark:text-slate-400 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingFile}
                  className="px-6 py-2.5 neu-btn-primary text-white font-extrabold active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {editingAd ? 'Save Changes' : 'Add to Playlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDisplayManagerTab;
