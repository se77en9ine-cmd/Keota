import React, { useEffect, useState, useRef } from 'react';
import { useCartStore } from '../store/useCartStore';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useCustomerDisplayStore } from '../store/useCustomerDisplayStore';
import { getOfflineMediaUrl } from '../utils/offlineMediaDB';
import { CustomerDisplayQrModal } from '../components/display/CustomerDisplayQrModal';
import {
  ShoppingBag,
  QrCode,
  Sparkles,
  User,
  Award,
  Percent,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Clock,
  Flame,
  CheckCircle2,
  Store,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

export const CustomerDisplayPage: React.FC = () => {
  const {
    items,
    selectedCustomer,
    getSubtotal,
    getTotalDiscount,
    getTotalTax,
    getGrandTotal,
    enableTax,
    taxName,
    taxRate,
    taxCalculationMode,
  } = useCartStore();

  const { format, convert, currentCurrency, fetchCurrencies, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';
  const { store } = useSettingsStore();

  const { config, ads, currentAdIndex, nextAd, setCurrentAdIndex, qrModal, showQrModal, hideQrModal } =
    useCustomerDisplayStore();
  const activeAds = ads.filter((a) => a.isActive);

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [videoRepeatCount, setVideoRepeatCount] = useState<number>(1);
  const [resolvedMediaUrl, setResolvedMediaUrl] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchCurrencies();
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(clockInterval);
  }, [fetchCurrencies]);

  // Slideshow auto-advance logic
  const currentAd = activeAds[currentAdIndex] || activeAds[0];

  // Resolve offline blob media url if needed
  useEffect(() => {
    if (!currentAd) {
      setResolvedMediaUrl('');
      return;
    }
    if (currentAd.isOfflineFile && currentAd.offlineFileId) {
      getOfflineMediaUrl(currentAd.offlineFileId).then((blobUrl) => {
        if (blobUrl) {
          setResolvedMediaUrl(blobUrl);
        } else {
          setResolvedMediaUrl(currentAd.url);
        }
      });
    } else {
      setResolvedMediaUrl(currentAd.url);
    }
  }, [currentAd]);

  // Reset repeat counter whenever current ad changes
  useEffect(() => {
    setVideoRepeatCount(1);
  }, [currentAdIndex]);

  const isSingleMediaOrLocked =
    activeAds.length <= 1 ||
    config.loopMode === 'REPEAT_CURRENT' ||
    currentAd?.videoLoopCount === -1;

  // Auto-advance timer (Works for Images and acts as Watchdog Fallback for Videos)
  useEffect(() => {
    if (!config.enableAds || activeAds.length <= 1) return;
    if (config.loopMode === 'REPEAT_CURRENT') return;

    if (currentAd?.type === 'IMAGE') {
      const duration = (currentAd.durationSeconds || config.slideInterval || 8) * 1000;
      timerRef.current = setTimeout(() => {
        nextAd();
      }, duration);
    } else if (currentAd?.type === 'VIDEO' && currentAd.videoLoopCount !== -1) {
      // Watchdog timer: If video stalls or fails to fire onEnded, auto-advance
      const videoDuration = Math.max(currentAd.durationSeconds || 15, 5);
      const totalWatchdogMs = (videoDuration * (currentAd.videoLoopCount || 1) + 2) * 1000;
      timerRef.current = setTimeout(() => {
        nextAd();
      }, totalWatchdogMs);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentAdIndex, currentAd, config.enableAds, config.loopMode, activeAds.length, config.slideInterval, nextAd]);

  // Robust Auto-play for videos on slide change
  useEffect(() => {
    if (currentAd?.type === 'VIDEO' && videoRef.current) {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay policy fallback: mute and replay
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {});
          }
        });
      }
    }
  }, [currentAdIndex, currentAd, resolvedMediaUrl]);

  const handleVideoEnded = () => {
    if (isSingleMediaOrLocked) {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
      return;
    }

    const maxRepeats = currentAd?.videoLoopCount || 1;
    if (videoRepeatCount < maxRepeats) {
      setVideoRepeatCount((prev) => prev + 1);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    } else {
      setVideoRepeatCount(1);
      nextAd();
    }
  };

  const handleVideoError = () => {
    console.warn('Video failed to load/play, auto-advancing to next ad in 2s...');
    setTimeout(() => {
      nextAd();
    }, 2000);
  };

  const subtotal = getSubtotal();
  const totalDiscount = getTotalDiscount();
  const totalTax = getTotalTax();
  const grandTotal = getGrandTotal();

  const convertedTotal = convert(grandTotal, baseCode, currentCurrency);
  const convertedSubtotal = convert(subtotal, baseCode, currentCurrency);
  const convertedDiscount = convert(totalDiscount, baseCode, currentCurrency);
  const convertedTax = convert(totalTax, baseCode, currentCurrency);

  const hasItems = items.length > 0;

  return (
    <div className="h-screen w-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-5 font-app select-none overflow-hidden relative">
      {/* ─── Top Header Bar ─── */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 z-20">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 via-emerald-500 to-teal-400 flex items-center justify-center font-black text-xl text-slate-950 shadow-lg shadow-brand-500/25">
            39
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span>{store?.name || '39POS Flagship Store'}</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                LIVE TERMINAL
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">{config.welcomeHeading}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedCustomer && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-2xl shadow-sm">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">{selectedCustomer.name}</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Award className="w-3 h-3" />
                <span>{selectedCustomer.tier}</span>
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-slate-300">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{currentTime}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>TERMINAL READY</span>
          </div>
        </div>
      </div>

      {/* ─── Center Workspace: Standby Attract Mode vs Active Checkout Mode ─── */}
      {!hasItems && !qrModal.isOpen && config.standbyMode === 'FULL_PROMOTION' && activeAds.length > 0 ? (
        /* ═══════════════════════════════════════════════════════════
           STANDBY FULLSCREEN PROMOTIONAL CINEMA & VIDEO REEL
           ═══════════════════════════════════════════════════════════ */
        <div className="flex-1 my-3 rounded-3xl overflow-hidden relative border border-slate-800 shadow-2xl bg-slate-900 flex items-center justify-center">
          {/* Media Player */}
          {currentAd?.type === 'VIDEO' ? (
            <video
              ref={videoRef}
              key={`${currentAd.id}-${currentAdIndex}`}
              src={resolvedMediaUrl || currentAd.url}
              poster={currentAd?.thumbnailUrl}
              autoPlay={config.autoPlayVideo}
              muted={config.muteVideo}
              playsInline
              preload="auto"
              loop={isSingleMediaOrLocked}
              onEnded={handleVideoEnded}
              onError={handleVideoError}
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              key={currentAd?.id}
              src={resolvedMediaUrl || currentAd?.url}
              alt={currentAd?.title}
              className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-700"
            />
          )}

          {/* Dark Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-transparent to-transparent pointer-events-none" />

          {/* Top Floating Promo Badge */}
          {currentAd?.badgeText && (
            <div className="absolute top-8 left-8 z-10 animate-in slide-in-from-top-4 duration-500">
              <span className="px-4 py-1.5 rounded-2xl text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-xl flex items-center gap-1.5 border border-yellow-300">
                <Flame className="w-4 h-4 fill-current" />
                <span>{currentAd.badgeText}</span>
              </span>
            </div>
          )}

          {/* Bottom Headline & Call to Action Box */}
          <div className="absolute bottom-8 left-8 right-8 z-10 flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-lg">
                {currentAd?.title}
              </h2>
              <p className="text-sm sm:text-lg text-slate-300 font-medium leading-relaxed drop-shadow-md">
                {currentAd?.subtitle}
              </p>

              {/* Slide Progress Dots */}
              <div className="flex items-center gap-2 pt-3">
                {activeAds.map((ad, idx) => (
                  <button
                    key={ad.id}
                    onClick={() => setCurrentAdIndex(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx === currentAdIndex
                        ? 'w-8 bg-emerald-400 shadow-md shadow-emerald-500/50'
                        : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Right Price & QR Standby Box */}
            <div className="flex items-center gap-4 bg-slate-950/80 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-2xl">
              {currentAd?.priceTag && (
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Special Deal</div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                    {currentAd.priceTag}
                  </div>
                </div>
              )}

              <div className="w-16 h-16 bg-white p-1.5 rounded-2xl flex items-center justify-center shadow-lg">
                <QrCode className="w-14 h-14 text-slate-950" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════
           ACTIVE CHECKOUT LAYOUT:
           PROMO CARD IS BIGGER & DOMINANT (HERO SHOWCASE 60%+)
           ITEMS & PAYMENT SIDEBAR (COMPACT 40%)
           ═══════════════════════════════════════════════════════════ */
        <div className="flex-1 flex flex-col lg:flex-row gap-5 my-3 overflow-hidden">
          {/* 1. Left/Sidebar Column: Items Receipt OR Dynamic Animated QR Payment Panel (~420px - 460px) */}
          <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col gap-3 flex-shrink-0 min-h-[500px]">
            {qrModal.isOpen ? (
              /* 📱 High-Tech Animated QR Payment Scanner Panel on the Left Side */
              <CustomerDisplayQrModal
                currentTotal={convertedTotal}
                currentCurrencyCode={currentCurrency}
                onBackToReceipt={() => hideQrModal()}
              />
            ) : (
              /* 🧾 Standard Itemized Receipt Slip + Grand Total + Fast QR Card */
              <>
                {/* Scanned Items Card */}
                <div className="flex-1 flex flex-col bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-4 overflow-hidden shadow-xl min-h-[220px]">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Scanned Items ({items.length})</span>
                    </span>
                    <span>Price</span>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 pr-1 space-y-1 mt-1">
                    {items.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 py-8">
                        <ShoppingBag className="w-10 h-10 opacity-25 text-emerald-500" />
                        <p className="text-xs font-bold text-slate-300">Your cart is currently empty</p>
                      </div>
                    ) : (
                      items.map((item, idx) => (
                        <div key={`${item.productId}-${item.variantId || idx}`} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-black text-sm text-white truncate">{item.name}</div>
                            {item.variantName && (
                              <div className="text-[10px] text-emerald-400 font-bold">{item.variantName}</div>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-black text-base text-emerald-400 font-mono">
                              {format(convert(item.totalPrice, baseCode, currentCurrency), currentCurrency)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {item.quantity} × {format(convert(item.unitPrice, baseCode, currentCurrency), currentCurrency)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Breakdown */}
                  <div className="pt-2.5 border-t border-slate-800 space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal:</span>
                      <span className="font-mono font-bold text-slate-200">
                        {format(convertedSubtotal, currentCurrency)}
                      </span>
                    </div>

                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-amber-400 font-bold">
                        <span className="flex items-center gap-1">
                          <Percent className="w-3 h-3" />
                          <span>Discounts:</span>
                        </span>
                        <span className="font-mono">
                          -{format(convertedDiscount, currentCurrency)}
                        </span>
                      </div>
                    )}

                    {enableTax && taxRate > 0 && (
                      <div className="flex justify-between text-slate-400">
                        <span>{taxName} ({taxRate}%):</span>
                        <span className="font-mono font-bold text-slate-200">
                          {taxCalculationMode === 'INCLUSIVE' ? 'Included' : format(convertedTax, currentCurrency)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Total Payable Box */}
                <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/90 border border-slate-700/80 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">
                      Total Payable Amount
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-black text-[10px] border border-emerald-500/30">
                      {currentCurrency}
                    </span>
                  </div>

                  <div className="text-3xl sm:text-4xl font-black text-white mt-1.5 leading-none font-mono tracking-tight">
                    {format(convertedTotal, currentCurrency)}
                  </div>

                  {currentCurrency !== baseCode && (
                    <div className="text-[11px] text-slate-400 font-mono font-bold mt-1">
                      ≈ {format(grandTotal, baseCode)}
                    </div>
                  )}

                  <div className="pt-2.5 mt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Total Items:</span>
                    <span className="font-mono font-black text-white">
                      {items.reduce((s, i) => s + i.quantity, 0)} pcs
                    </span>
                  </div>
                </div>

                {/* Fast QR Payment Box (Tap to Open Animated Laser QR on Left Side) */}
                {config.showQrCode && (
                  <button
                    type="button"
                    onClick={() => {
                      showQrModal({
                        amount: convertedTotal,
                        currency: currentCurrency,
                      });
                    }}
                    className="w-full p-3.5 rounded-3xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 flex items-center gap-3.5 shadow-xl transition-all hover:scale-102 group cursor-pointer text-left"
                  >
                    <div className="w-14 h-14 bg-white p-1 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:ring-2 group-hover:ring-emerald-400 transition-all">
                      <QrCode className="w-12 h-12 text-slate-950" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-black text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                        <span>{config.qrPayTitle}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold">
                          Tap to Scan
                        </span>
                      </div>
                      <div className="text-xs font-extrabold text-white">
                        Scan with Banking App
                      </div>
                      <div className="text-[9px] text-slate-400 leading-tight">
                        PromptPay • BCEL One • WeChat • Alipay
                      </div>
                    </div>
                  </button>
                )}
              </>
            )}
          </div>

          {/* 2. Main Center/Right HERO Promotional Media Showcase (BIGGER & CINEMATIC ~60-65% screen) */}
          {config.enableAds && activeAds.length > 0 ? (
            <div className="flex-1 min-w-0 rounded-3xl overflow-hidden border-2 border-slate-800/90 bg-slate-900 flex flex-col justify-between relative shadow-2xl">
              {/* Massive Media Video / Image Player */}
              <div className="relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center min-h-[350px]">
                {currentAd?.type === 'VIDEO' ? (
                  <video
                    key={`${currentAd.id}-${currentAdIndex}`}
                    src={resolvedMediaUrl || currentAd.url}
                    poster={currentAd?.thumbnailUrl}
                    autoPlay={config.autoPlayVideo}
                    muted={config.muteVideo}
                    playsInline
                    preload="auto"
                    loop={isSingleMediaOrLocked}
                    onEnded={handleVideoEnded}
                    onError={handleVideoError}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    key={currentAd?.id}
                    src={resolvedMediaUrl || currentAd?.url}
                    alt={currentAd?.title}
                    className="w-full h-full object-cover animate-in fade-in duration-500"
                  />
                )}

                {/* Dark Gradient Overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-transparent pointer-events-none" />

                {/* Promo Badge */}
                {currentAd?.badgeText && (
                  <div className="absolute top-5 left-5 z-10">
                    <span className="px-3.5 py-1.5 rounded-2xl text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-2xl flex items-center gap-1.5 border border-yellow-300">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      <span>{currentAd.badgeText}</span>
                    </span>
                  </div>
                )}

                {/* Price Tag Overlay */}
                {currentAd?.priceTag && (
                  <span className="absolute top-5 right-5 px-3.5 py-1.5 rounded-2xl text-sm font-mono font-black bg-emerald-500 text-slate-950 shadow-xl">
                    {currentAd.priceTag}
                  </span>
                )}

                {/* Large Headline & Details Overlay inside the Hero Box */}
                <div className="absolute bottom-6 left-6 right-6 z-10 flex items-end justify-between gap-4">
                  <div className="space-y-1.5 max-w-xl">
                    <h2 className="text-2xl sm:text-3xl xl:text-4xl font-black text-white tracking-tight drop-shadow-lg">
                      {currentAd?.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-200 font-medium line-clamp-2 drop-shadow-md">
                      {currentAd?.subtitle}
                    </p>
                  </div>

                  {/* Call to Action Button */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="px-4 py-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white font-black text-xs shadow-lg">
                      {currentAd?.callToAction || 'Ask Cashier to Add'}
                    </span>

                    {/* Interactive Slide Dots */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {activeAds.map((ad, idx) => (
                        <button
                          key={ad.id}
                          onClick={() => setCurrentAdIndex(idx)}
                          className={`h-2 rounded-full transition-all cursor-pointer ${
                            idx === currentAdIndex
                              ? 'w-6 bg-emerald-400 shadow-md shadow-emerald-500/50'
                              : 'w-2 bg-white/40 hover:bg-white/70'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Fallback if ads disabled */
            <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <Store className="w-16 h-16 text-slate-700" />
              <h3 className="text-xl font-black text-white">{store?.name || '39POS Store'}</h3>
              <p className="text-xs text-slate-400 max-w-md">{config.welcomeSubheading}</p>
            </div>
          )}
        </div>
      )}

      {/* ─── Bottom Marquee Ticker & Footer ─── */}
      <div className="z-20 space-y-1.5 pt-1.5 border-t border-slate-800/80">
        {config.announcementTicker && (
          <div className="overflow-hidden whitespace-nowrap bg-indigo-500/10 border border-indigo-500/20 py-1 px-3 rounded-xl">
            <div className="inline-block animate-marquee text-[11px] font-extrabold text-indigo-300 tracking-wide">
              {config.announcementTicker}
            </div>
          </div>
        )}

        <div className="text-center text-[10px] text-slate-500 font-medium">
          {config.thankYouMessage}
        </div>
      </div>
    </div>
  );
};

export default CustomerDisplayPage;
