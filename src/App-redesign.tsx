import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Home,
  Tag,
  ChevronRight,
  SlidersHorizontal,
  Map as MapIcon,
  User,
  Search,
  TrendingDown,
  Clock,
  ArrowLeft,
  ExternalLink,
  ShoppingBasket,
  Bell,
  Info,
  Settings,
  Moon,
  Sun,
  Navigation,
  X,
  Mic,
  MicOff,
  Car,
  Footprints,
  Minus,
  TrendingUp,
  Share2,
  RefreshCw,
  Heart,
  ScanLine,
  Camera,
  Shield,
  FileText,
  Trash2,
  Check,
  Upload,
  Pencil,
  Eye,
  EyeOff,
  Zap,
  BarChart3,
  Star,
  Mail,
} from 'lucide-react';
import { motion, AnimatePresence, type PanInfo } from 'motion/react';
import QRCode from 'qrcode';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Screen, StorePrice, Product, ChatMessage, ChatAction } from './types';
import { Sparkles, Send, ImagePlus, Globe } from 'lucide-react';
import { LanguageContext, useLanguageState, useLanguage } from './i18n';

// --- Image Assets ---
const STORE_CONFIG: Record<string, { color: string, letter: string, filename: string, logo: string }> = {
  'SPAR': { color: 'bg-[#00703C]', letter: 'S', filename: '1.spar', logo: '/logos/spar.png' },
  '2 Nabiji': { color: 'bg-[#EE3124]', letter: '2', filename: '2. 2 nabiji', logo: '/logos/2nabiji.png' },
  'Goodwill': { color: 'bg-[#0054A6]', letter: 'G', filename: '3. Goodwill', logo: '/logos/goodwill.jpg' },
  'Europroduct': { color: 'bg-[#E30613]', letter: 'E', filename: '4. Europroduct', logo: '/logos/europroduct.jpg' },
  'Agrohub': { color: 'bg-[#4CAF50]', letter: 'A', filename: 'agrohub', logo: '/logos/agrohub.jpg' },
  'Zoomer': { color: 'bg-[#00AEEF]', letter: 'Z', filename: 'zoomer', logo: 'https://zoommer.ge/icons/main-logo.svg' },
  'Alta': { color: 'bg-[#F7941D]', letter: 'A', filename: 'alta', logo: 'https://alta.ge/images/logo.svg' },
  'Kontakt': { color: 'bg-[#E4002B]', letter: 'K', filename: 'kontakt', logo: 'https://kontakt.ge/static/version1772708998/frontend/Swissup/breeze-customized-ge/ka_GE/images/logo.svg' },
  'Megatechnica': { color: 'bg-[#1B4D8E]', letter: 'M', filename: 'megatechnica', logo: 'https://megatechnica.ge/assets/img/app/red_logo_large.png' },
  'MetroMart': { color: 'bg-[#FF6B00]', letter: 'M', filename: 'metromart', logo: 'https://metromart.ge/logo.png' },
  'PSP': { color: 'bg-[#00A651]', letter: 'P', filename: 'psp', logo: 'https://psp.ge/logo.png' },
  'Aversi': { color: 'bg-[#0072BC]', letter: 'A', filename: 'aversi', logo: 'https://shop.aversi.ge/images/logos/31/logo_Aversi-24-3.png' },
  'GPC': { color: 'bg-[#E2231A]', letter: 'G', filename: 'gpc', logo: 'https://gpc.ge/images/logo_ka.svg' },
  'Gorgia': { color: 'bg-[#E8432E]', letter: 'G', filename: 'gorgia', logo: 'https://gorgia.ge/images/logos/44/logo_copy.webp' },
  'Goodbuild': { color: 'bg-[#1B8B3A]', letter: 'G', filename: 'goodbuild', logo: 'https://goodbuild.ge/images/LogGeo.svg' },
  'iMart': { color: 'bg-[#FF4500]', letter: 'i', filename: 'imart', logo: 'https://imart.ge/images/logos/405/%E1%83%90%E1%83%98%E1%83%9B%E1%83%90%E1%83%A0%E1%83%A2%E1%83%98%E1%83%A1-%E1%83%9A%E1%83%9D%E1%83%92%E1%83%9D11.png' },
  'Libre': { color: 'bg-[#D4145A]', letter: 'L', filename: 'libre', logo: 'https://libre.ge/storage/images/logolibre.svg' },
  'Georgita': { color: 'bg-[#C5AC71]', letter: 'G', filename: 'georgita', logo: '/logos/georgita.svg' },
};

const SmartImage = ({ filename, alt, className, fallbackLetter, fallbackColor, isLogo, storeName, imageUrl, lazy }: { filename: string, alt: string, className?: string, fallbackLetter?: string, fallbackColor?: string, isLogo?: boolean, storeName?: string, imageUrl?: string, lazy?: boolean }) => {
  const storeLogoUrl = isLogo && storeName && STORE_CONFIG[storeName]?.logo;
  const resolvedSrc = imageUrl || storeLogoUrl || (filename ? `/api/images/${encodeURIComponent(filename)}` : '');
  const [error, setError] = useState(false);

  useEffect(() => { setError(false); }, [resolvedSrc]);

  if (error || !resolvedSrc) {
    if (isLogo && fallbackLetter) {
      return (
        <div className={`${className} ${fallbackColor} flex items-center justify-center text-white font-semibold`}>
          {fallbackLetter}
        </div>
      );
    }
    return (
      <div className={`${className} bg-slate-100 flex items-center justify-center text-slate-300`}>
        <ShoppingBasket size={18} />
      </div>
    );
  }

  return <img src={resolvedSrc} alt={alt} className={className} loading={lazy ? 'lazy' : 'eager'} decoding="async" onError={() => setError(true)} referrerPolicy="no-referrer" />;
};

// --- Components ---

const PhotoScanOverlay = () => {
  const { t } = useLanguage();
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const steps = [
      { target: 15, delay: 300 },
      { target: 30, delay: 600 },
      { target: 48, delay: 400 },
      { target: 62, delay: 500 },
      { target: 75, delay: 400 },
      { target: 85, delay: 600 },
      { target: 93, delay: 800 },
      { target: 97, delay: 1000 },
    ];
    let i = 0;
    const tick = () => {
      if (i >= steps.length) return;
      const step = steps[i];
      setTimeout(() => {
        setProgress(step.target);
        i++;
        tick();
      }, step.delay);
    };
    tick();
  }, []);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex flex-col items-center justify-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-[#108AB1]/30 animate-[scanRing_1.5s_ease-out_infinite]" />
        <div className="absolute inset-0 rounded-full bg-[#108AB1]/20 animate-[scanRing_1.5s_ease-out_infinite_0.5s]" />
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#108AB1] to-[#073A4B] flex items-center justify-center shadow-xl shadow-[#108AB1]/40">
          <Camera size={40} className="text-white" />
        </div>
      </div>
      <div className="text-4xl font-bold text-white mb-2">{progress}%</div>
      <div className="text-sm text-white/70 mb-6">{t('photo_scanning')}</div>
      <div className="w-72 h-2.5 bg-white/15 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#108AB1] to-[#06D7A0] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

const BucketLoader = React.lazy(() => import('./components/BucketLoader'));

const SplashScreen = () => {
  const { t } = useLanguage();
  return (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center gap-6"
  >
    <React.Suspense fallback={null}>
      <BucketLoader />
    </React.Suspense>
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="text-center"
    >
      <h1 className="text-3xl font-light tracking-[0.5em] text-slate-800 uppercase flex items-center gap-2.5" style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>
        GAMIGE <span className="text-[10px] font-bold tracking-normal px-2 py-1 rounded-lg bg-[#108AB1]/10 text-[#108AB1] normal-case">beta</span>
      </h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="text-[#108AB1] text-sm mt-2 tracking-wide font-medium"
      >
        {t('splash_subtitle')}
      </motion.p>
    </motion.div>
  </motion.div>
  );
};

const ONBOARDING_EMOJIS = ['🔍', '🛒', '📍'];

const OnboardingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const { t } = useLanguage();
  const [current, setCurrent] = useState(0);

  const ONBOARDING_SLIDES = [
    { title: t('onboarding_slide1_title'), desc: t('onboarding_slide1_desc'), emoji: ONBOARDING_EMOJIS[0] },
    { title: t('onboarding_slide2_title'), desc: t('onboarding_slide2_desc'), emoji: ONBOARDING_EMOJIS[1] },
    { title: t('onboarding_slide3_title'), desc: t('onboarding_slide3_desc'), emoji: ONBOARDING_EMOJIS[2] },
  ];

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -50 && current < ONBOARDING_SLIDES.length - 1) {
      setCurrent(current + 1);
    } else if (info.offset.x > 50 && current > 0) {
      setCurrent(current - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white dark:bg-slate-950 flex flex-col">
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <motion.div
          key={current}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -80 }}
          transition={{ duration: 0.3 }}
          className="text-center px-10 select-none"
        >
          <div className="text-7xl mb-8">{ONBOARDING_SLIDES[current].emoji}</div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            {ONBOARDING_SLIDES[current].title}
          </h2>
          <p className="text-slate-400 text-base">
            {ONBOARDING_SLIDES[current].desc}
          </p>
        </motion.div>
      </div>

      <div className="pb-16 px-8">
        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mb-8">
          {ONBOARDING_SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? 'w-8 bg-slate-900 dark:bg-white' : 'w-2 bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => {
            if (current < ONBOARDING_SLIDES.length - 1) {
              setCurrent(current + 1);
            } else {
              localStorage.setItem('pasebi-onboarded', 'true');
              onComplete();
            }
          }}
          className="w-full bg-[#108AB1] text-white py-4 rounded-2xl font-semibold text-base active:scale-[0.98] transition-transform"
        >
          {current < ONBOARDING_SLIDES.length - 1 ? t('onboarding_next') : t('onboarding_start')}
        </button>

        {current < ONBOARDING_SLIDES.length - 1 && (
          <button
            onClick={() => { localStorage.setItem('pasebi-onboarded', 'true'); onComplete(); }}
            className="w-full text-slate-400 py-3 text-sm font-medium mt-2"
          >
            {t('onboarding_skip')}
          </button>
        )}
      </div>
    </div>
  );
};

const SwipeableProductCard = ({ product, children, onSwipeLeft, onSwipeRight }: {
  product: Product;
  children: React.ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}) => {
  const [dragX, setDragX] = useState(0);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Background layers */}
      <div className="absolute inset-0 flex">
        <div className={`flex-1 flex items-center justify-start pl-5 transition-opacity ${dragX > 30 ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'linear-gradient(90deg, #fce4ec, transparent)' }}>
          <Heart size={22} className="text-pink-500" />
        </div>
        <div className={`flex-1 flex items-center justify-end pr-5 transition-opacity ${dragX < -30 ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'linear-gradient(-90deg, #e8f5e9, transparent)' }}>
          <ShoppingBasket size={22} className="text-emerald-600" />
        </div>
      </div>
      {/* Draggable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDrag={(_, info) => setDragX(info.offset.x)}
        onDragEnd={(_, info) => {
          setDragX(0);
          if (info.offset.x < -80) onSwipeLeft();
          else if (info.offset.x > 80) onSwipeRight();
        }}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </div>
  );
};

const BottomNav = ({ active, setScreen, onMapTap, basketCount, alertCount, onAlertTap, searchQuery, onSearchChange, onChatTap, onVoiceTap, voiceListening }: { active: Screen, setScreen: (s: Screen) => void, onMapTap?: () => void, basketCount: number, alertCount?: number, onAlertTap?: () => void, searchQuery?: string, onSearchChange?: (q: string) => void, onChatTap?: () => void, onVoiceTap?: () => void, voiceListening?: boolean }) => {
  const { t } = useLanguage();
  const navItems = [
    { id: 'home', icon: Home, label: t('nav_home') },
    { id: 'basket', icon: ShoppingBasket, label: t('nav_basket') },
    { id: 'map', icon: MapIcon, label: t('nav_map') },
    { id: 'profile', icon: User, label: t('nav_profile') },
  ];

  return (
    <>
      {/* Mobile/Tablet bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 pt-3 pb-6 flex justify-between items-center z-50">
        {navItems.map((item) => {
          const isActive = active === item.id || (active === 'compare' && item.id === 'home');
          return (
            <button
              key={item.id}
              onClick={() => { if (item.id === 'map' && onMapTap) onMapTap(); if (item.id === 'home' && active === 'home') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; } setScreen(item.id as Screen); }}
              className={`transition-colors relative flex flex-col items-center gap-1 sm:gap-1.5 min-w-[3.5rem] sm:min-w-[4rem] py-1 ${isActive ? 'text-[#108AB1]' : 'text-[#073A4B]/30'}`}
            >
              <div className="relative">
                <item.icon size={24} strokeWidth={isActive ? 2.2 : 1.6} />
                {item.id === 'basket' && basketCount > 0 && (
                  <div className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] bg-[#F04770] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {basketCount}
                  </div>
                )}
              </div>
              <span className={`text-[10px] sm:text-[12px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
      {/* Desktop top header nav */}
      <div className="hidden lg:flex fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-100/80 items-center z-50">
        {/* Left: Logo + Nav together */}
        <div className="flex items-center gap-6 pl-10 xl:pl-14 shrink-0">
          <h1 className="text-[17px] font-semibold tracking-[0.25em] uppercase text-slate-800 flex items-center gap-2" style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>GAMIGE <span className="text-[9px] font-bold tracking-normal px-1.5 py-0.5 rounded-md bg-[#108AB1]/10 text-[#108AB1] normal-case">beta</span></h1>
          <nav className="flex items-center gap-1">
            {navItems.filter(item => item.id !== 'profile').map((item) => {
              const isActive = active === item.id || (active === 'compare' && item.id === 'home');
              return (
                <button
                  key={item.id}
                  onClick={() => { if (item.id === 'map' && onMapTap) onMapTap(); setScreen(item.id as Screen); }}
                  className={`transition-all relative flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium ${isActive ? 'text-[#108AB1] bg-[#108AB1]/8' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
                >
                  <item.icon size={17} strokeWidth={isActive ? 2.2 : 1.5} />
                  <span>{item.label}</span>
                  {item.id === 'basket' && basketCount > 0 && (
                    <div className="min-w-[17px] h-[17px] bg-[#F04770] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 -mr-1">
                      {basketCount}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Search — wider */}
        <div className="flex-1 max-w-2xl mx-auto px-8">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={17} strokeWidth={2} />
            <input
              type="text"
              placeholder={t('search_placeholder')}
              value={searchQuery || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-full py-2.5 pl-10 pr-4 text-[13px] font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-[#108AB1]/20 focus:border-[#108AB1]/30 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Right corner: Notification + Profile */}
        <div className="flex items-center gap-2.5 pr-10 xl:pr-14 shrink-0">
          {onAlertTap && (
            <button onClick={onAlertTap} className="w-10 h-10 rounded-full flex items-center justify-center relative text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
              <Bell size={19} strokeWidth={1.8} />
              {(alertCount ?? 0) > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5">
                  {alertCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setScreen('profile')}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${active === 'profile' ? 'bg-[#108AB1] text-white' : 'bg-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-300'}`}
          >
            <User size={18} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </>
  );
};

const Header = ({ title, showBack, onBack, alertCount, onAlertTap }: { title: string, showBack?: boolean, onBack?: () => void, darkMode?: boolean, setDarkMode?: (v: boolean) => void, alertCount?: number, onAlertTap?: () => void }) => (
  <header className="mb-6 flex items-center justify-between">
    <div className="flex items-center gap-3">
      {showBack && (
        <button onClick={onBack} className="p-2 -ml-2 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
      )}
      {(title === 'გამიგე' || title === 'Compare') ? (
        <h1 className="text-[22px] font-light tracking-[0.4em] uppercase text-slate-900 dark:text-white flex items-center gap-2" style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>GAMIGE <span className="text-[8px] font-bold tracking-normal px-1.5 py-0.5 rounded-md bg-[#108AB1]/10 text-[#108AB1] normal-case">beta</span></h1>
      ) : (
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
      )}
    </div>
    {onAlertTap && (
      <div className="hidden lg:block">
        <button
          onClick={onAlertTap}
          className="p-2 relative text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
        >
          <Bell size={20} />
          {(alertCount ?? 0) > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
              {alertCount}
            </span>
          )}
        </button>
      </div>
    )}
  </header>
);

// --- Screens ---

const BANNER_SLIDES = [
  { bg: 'from-[#108AB1] to-[#073A4B]', title: 'გამიგე ფასები', desc: '7 მაღაზიის ფასები ერთ ადგილას', emoji: '🔍', image: '/banners/slide1.png' },
  { bg: 'from-emerald-500 to-teal-600', title: 'დაზოგე ფული', desc: 'იპოვე ყველაზე იაფი ვარიანტი', emoji: '💰', image: '/banners/slide2.png' },
  { bg: 'from-violet-500 to-purple-600', title: 'გააანალიზე პროდუქტი', desc: 'შეამოწმე რამდენად ჯანსაღია', emoji: '🔬', image: '/banners/slide3.png' },
  { bg: 'from-amber-500 to-orange-600', title: 'იპოვე მაღაზია', desc: 'უახლოესი ფილიალი რუკაზე', emoji: '📍', image: '/banners/slide4.png' },
];

const BannerSlider = () => {
  const [bannerIndex, setBannerIndex] = useState(0);
  const touchStartX = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => setBannerIndex(i => (i + 1) % BANNER_SLIDES.length), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mb-4">
      <div className="relative overflow-hidden rounded-2xl"
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const diff = e.changedTouches[0].clientX - touchStartX.current;
          if (diff > 50) setBannerIndex(i => (i - 1 + BANNER_SLIDES.length) % BANNER_SLIDES.length);
          if (diff < -50) setBannerIndex(i => (i + 1) % BANNER_SLIDES.length);
        }}
      >
        <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${bannerIndex * 100}%)` }}>
          {BANNER_SLIDES.map((slide, i) => (
            slide.image ? (
              <div key={i} className="w-full shrink-0 aspect-[3/1] sm:aspect-[4/1] lg:aspect-[5/1] overflow-hidden">
                <img src={slide.image} alt={slide.title} className="w-full h-full object-cover object-center rounded-2xl" />
              </div>
            ) : (
              <div key={i} className={`w-full shrink-0 bg-gradient-to-r ${slide.bg} px-8 lg:px-14 flex items-center gap-6 aspect-[3/1] sm:aspect-[4/1] lg:aspect-[5/1]`}>
                <div className="text-3xl lg:text-4xl">{slide.emoji}</div>
                <div>
                  <h3 className="text-white font-bold text-base lg:text-lg">{slide.title}</h3>
                  <p className="text-white/70 text-xs lg:text-sm mt-0.5">{slide.desc}</p>
                </div>
              </div>
            )
          ))}
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {BANNER_SLIDES.map((_, i) => (
            <button key={i} onClick={() => setBannerIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === bannerIndex ? 'bg-white w-4' : 'bg-white/40'}`} />
          ))}
        </div>
      </div>
    </div>
  );
};

const FALLBACK_PRODUCTS: Product[] = [
  { id: '1', name: 'ლუდი ყაზბეგი', size: '0.5L', category: 'ლუდი', prices: { '2 Nabiji': 2.40, 'SPAR': 2.55, 'Goodwill': 2.60 } },
  { id: '2', name: 'რძე სანტე', size: '1L', category: 'რძე', prices: { '2 Nabiji': 3.40, 'SPAR': 3.10, 'Goodwill': 3.50 } },
  { id: '3', name: 'პური მზეთამზე', size: '400g', category: 'პური', prices: { '2 Nabiji': 1.20, 'SPAR': 1.15, 'Goodwill': 1.30 } },
  { id: '4', name: 'წყალი ბაკურიანი', size: '0.5L', category: 'წყალი', prices: { '2 Nabiji': 0.65, 'SPAR': 0.60, 'Goodwill': 0.70 } },
  { id: '5', name: 'ქათმის ფილე', size: '1kg', category: 'ხორცი', prices: { '2 Nabiji': 15.20, 'SPAR': 14.80, 'Goodwill': 14.50 } },
];

const BasketToast = ({ productName }: { productName: string }) => {
  const { t } = useLanguage();
  return (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#073A4B] text-white px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2"
  >
    <ShoppingBasket size={14} strokeWidth={2.5} />
    <span className="text-xs font-semibold">{t('toast_added_basket')}</span>
  </motion.div>
  );
};

const HomeScreen = ({ setScreen, setSelectedProduct, darkMode, setDarkMode, alertCount, onAlertTap, basket, setBasket, favorites, setFavorites, voiceSearchQuery, setVoiceSearchQuery, voiceCategory, setVoiceCategory, onProductsLoaded, desktopSearchQuery, setDesktopSearchQuery }: { setScreen: (s: Screen) => void, setSelectedProduct: (p: Product) => void, darkMode: boolean, setDarkMode: (v: boolean) => void, alertCount?: number, onAlertTap?: () => void, basket: Product[], setBasket: React.Dispatch<React.SetStateAction<Product[]>>, favorites: Product[], setFavorites: React.Dispatch<React.SetStateAction<Product[]>>, voiceSearchQuery?: string | null, setVoiceSearchQuery?: (q: string | null) => void, voiceCategory?: string | null, setVoiceCategory?: (c: string | null) => void, onProductsLoaded?: (p: Product[]) => void, desktopSearchQuery?: string, setDesktopSearchQuery?: (q: string) => void }) => {
  const { t } = useLanguage();
  const [storeType, setStoreType] = useState<'grocery' | 'electronics' | 'pharmacy' | 'construction'>('grocery');
  const [gridCols, setGridCols] = useState<3 | 4 | 5>(() => {
    try { const saved = Number(localStorage.getItem('pasebi-grid-cols')); return (saved === 3 || saved === 4 || saved === 5) ? saved : 3; } catch { return 3; }
  });
  const [selectedCategory, setSelectedCategory] = useState('ყველა');
  const [sortBy, setSortBy] = useState<'popular' | 'discount' | 'price_asc' | 'price_desc'>('popular');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try { const saved = localStorage.getItem('pasebi-search-history'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [topSavings, setTopSavings] = useState<Product[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDist, setPullDist] = useState(0);
  const [isAiResult, setIsAiResult] = useState(false);
  const [photoScanning, setPhotoScanning] = useState(false);
  const pullStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const fetchTopSavings = useCallback(() => {
    fetch('/api/search/top-savings')
      .then(r => r.json())
      .then(data => { if (data.results) setTopSavings(data.results); })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchTopSavings(); }, [refreshKey]);

  // Fetch category counts
  useEffect(() => {
    fetch('/api/search/category-counts')
      .then(r => r.json())
      .then(data => { if (data.counts) setCategoryCounts(data.counts); })
      .catch(() => {});
  }, []);

  // Auto-refresh top savings every 30 minutes
  useEffect(() => {
    const interval = setInterval(fetchTopSavings, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTopSavings]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    pullStartY.current = e.touches[0].clientY;
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      const diff = e.touches[0].clientY - pullStartY.current;
      if (diff > 0) setPullDist(Math.min(diff * 0.4, 70));
    }
  }, []);
  const handleTouchEnd = useCallback(() => {
    if (pullDist > 40) {
      setRefreshing(true);
      setRefreshKey(k => k + 1);
      setTimeout(() => setRefreshing(false), 800);
    }
    setPullDist(0);
  }, [pullDist]);

  // Listen for voice search queries from App
  useEffect(() => {
    if (voiceSearchQuery) {
      setSearchQuery(voiceSearchQuery);
      setVoiceSearchQuery?.(null);
    }
  }, [voiceSearchQuery]);

  // Sync desktop header search → local search
  useEffect(() => {
    if (desktopSearchQuery !== undefined && desktopSearchQuery !== searchQuery) {
      setSearchQuery(desktopSearchQuery);
    }
  }, [desktopSearchQuery]);

  // Sync local search → desktop header search
  useEffect(() => {
    setDesktopSearchQuery?.(searchQuery);
  }, [searchQuery]);

  // Listen for voice category changes from App
  useEffect(() => {
    if (voiceCategory) {
      setSelectedCategory(voiceCategory);
      setVoiceCategory?.(null);
    }
  }, [voiceCategory]);

  // Report products to App for voice "დაამატე" command
  useEffect(() => {
    onProductsLoaded?.(products);
  }, [products]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= 2) {
      setSearchHistory(prev => {
        const updated = [debouncedQuery, ...prev.filter(h => h !== debouncedQuery)].slice(0, 8);
        localStorage.setItem('pasebi-search-history', JSON.stringify(updated));
        return updated;
      });
    }
  }, [debouncedQuery]);

  const GROCERY_CATEGORY_MAP: Record<string, string> = {
    'რძე': 'რძ', 'რძის პროდუქტი': 'რძ', 'ხორცი': 'ხორც', 'პური': 'პურ', 'ხილი': 'ხილ', 'ხილი/ბოსტანი': 'ხილ',
    'სასმელი': 'სასმელ', 'ლუდი': 'ლუდი', 'ტკბილეული': 'ტკბილ',
    'სნექი': 'სნექ', 'ყავა/ჩაი': 'ყავა', 'ჰიგიენა': 'ჰიგიენ',
  };

  const ELECTRONICS_CATEGORY_MAP: Record<string, string> = {
    'ტელეფონები': 'ტელეფონ', 'ლეპტოპები': 'ლეპტოპ', 'ტაბლეტები': 'ტაბლეტ',
    'ტელევიზორები': 'ტელევიზორ', 'აუდიო': 'აუდიო', 'გეიმინგი': 'გეიმინგ',
  };

  const PHARMACY_CATEGORY_MAP: Record<string, string> = {
    'ტკივილი': 'ტკივილ', 'ვიტამინი': 'ვიტამინ', 'გული': 'გულ',
    'ანტიბიოტიკი': 'ანტიბიოტ', 'დიაბეტი': 'დიაბეტ', 'ალერგია': 'ალერგ',
  };

  const CONSTRUCTION_CATEGORY_MAP: Record<string, string> = {
    'ხელსაწყო': 'ხელსაწყო', 'საღებავი': 'საღებავ', 'სანტექნიკა': 'სანტექნიკ',
    'განათება': 'განათებ', 'ავეჯი': 'ავეჯ', 'ბაღი': 'ბაღ',
  };

  const CATEGORY_MAP = storeType === 'grocery' ? GROCERY_CATEGORY_MAP : storeType === 'electronics' ? ELECTRONICS_CATEGORY_MAP : storeType === 'pharmacy' ? PHARMACY_CATEGORY_MAP : CONSTRUCTION_CATEGORY_MAP;

  // Smart search detection: 3+ words or patterns like "იაფი", size patterns
  const isSmartQuery = (q: string) => {
    if (!q) return false;
    const words = q.trim().split(/\s+/);
    const smartPatterns = /იაფი|ძვირი|საუკეთესო|კარგი|\d+\s*გ($|\s)|მლ|ლიტრ|კგ/i;
    return words.length >= 3 || smartPatterns.test(q);
  };

  useEffect(() => {
    const controller = new AbortController();
    setProducts([]);
    setLoading(true);
    setIsAiResult(false);

    if (debouncedQuery && isSmartQuery(debouncedQuery)) {
      fetch(`/api/ai/smart?q=${encodeURIComponent(debouncedQuery)}`, { signal: controller.signal })
        .then(r => r.json())
        .then(data => {
          const withPrices = (data.results || []).filter((p: Product) => Object.keys(p.prices).length > 0);
          if (withPrices.length > 0) {
            setProducts(withPrices);
            setIsAiResult(!!data.ai_parsed);
          } else {
            setProducts([]);
          }
        })
        .catch(() => regularSearch(controller.signal))
        .finally(() => setLoading(false));
    } else {
      regularSearch(controller.signal).finally(() => setLoading(false));
    }

    function regularSearch(signal: AbortSignal) {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set('q', debouncedQuery);
      const catValue = CATEGORY_MAP[selectedCategory];
      if (catValue) params.set('category', catValue);
      params.set('storeType', storeType);
      if (storeType === 'grocery' && !debouncedQuery && !catValue) params.set('allStores', 'true');
      params.set('limit', '60');
      if (sortBy !== 'popular') params.set('sort', sortBy);

      return fetch(`/api/search?${params}`, { signal })
        .then(r => r.json())
        .then(data => {
          const withPrices = (data.results || []).filter((p: Product) => Object.keys(p.prices).length > 0);
          setProducts(withPrices);
        })
        .catch(() => {});
    }

    return () => controller.abort();
  }, [debouncedQuery, selectedCategory, refreshKey, storeType, sortBy]);

  // Deduplicate products with same name - keep the one with most stores
  const filteredProducts = products.filter((product, idx, arr) => {
    const sameName = arr.findIndex(p => p.name === product.name);
    if (sameName === idx) return true;
    // Keep if this one has more stores than the earlier one
    const thisStores = Object.keys(product.prices).length;
    const otherStores = Object.keys(arr[sameName].prices).length;
    return thisStores > otherStores;
  });
  const [toastProduct, setToastProduct] = useState<string | null>(null);
  const [favoriteToast, setFavoriteToast] = useState<string | null>(null);
  const [swipeHintShown] = useState(() => {
    const shown = !!localStorage.getItem('pasebi-swipe-hint');
    if (!shown) localStorage.setItem('pasebi-swipe-hint', 'true');
    return shown;
  });

  const addToFavorites = (product: Product) => {
    if (!favorites.find(f => f.id === product.id)) {
      setFavorites(prev => [...prev, product]);
      setFavoriteToast(product.name);
      setTimeout(() => setFavoriteToast(null), 2500);
    }
  };

  const addToBasketSwipe = (product: Product) => {
    if (!basket.find(item => item.id === product.id)) {
      setBasket(prev => [...prev, product]);
      setToastProduct(product.name);
      setTimeout(() => setToastProduct(null), 2500);
    }
  };

  const toggleBasket = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (basket.find(item => item.id === product.id)) {
      setBasket(basket.filter(item => item.id !== product.id));
    } else {
      // Require auth for 3+ items
      if (basket.length >= 3 && !localStorage.getItem('pasebi-auth-token')) {
        window.dispatchEvent(new CustomEvent('auth-required', { detail: 'კალათაში 3-ზე მეტი პროდუქტის დასამატებლად გაიარეთ რეგისტრაცია' }));
        return;
      }
      setBasket([...basket, product]);
      setToastProduct(product.name);
      setTimeout(() => setToastProduct(null), 2500);
    }
  };

  return (
    <div ref={containerRef} className="pb-24 lg:pb-8 pt-4 lg:pt-3 px-5 md:px-8 lg:px-8 xl:px-10 min-h-screen" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <AnimatePresence>{toastProduct && <BasketToast productName={toastProduct} />}</AnimatePresence>
      <AnimatePresence>
        {favoriteToast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-pink-500 text-white px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2"
          >
            <Heart size={14} strokeWidth={2.5} />
            <span className="text-xs font-semibold">{t('toast_added_favorites')}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pull to refresh indicator */}
      {(pullDist > 0 || refreshing) && (
        <div className="flex justify-center items-center mb-2 -mt-2" style={{ height: pullDist > 0 ? pullDist : 30 }}>
          <RefreshCw size={18} className={`text-slate-400 transition-transform ${refreshing ? 'animate-spin' : ''}`} style={{ transform: `rotate(${pullDist * 3}deg)` }} />
        </div>
      )}

      <div className="lg:hidden">
        <Header title={t('header_title')} alertCount={alertCount} onAlertTap={onAlertTap} />
      </div>

      {/* Store Type Tabs — დროებით მხოლოდ სასურსათო, დანარჩენი ტაბები დაბრუნდება მოგვიანებით */}

      {/* Top Savings */}
      {/* დღის დანაზოგი დროებით გამორთული */}
      {false && storeType === 'grocery' && topSavings.length > 0 && !debouncedQuery && (() => {
        const savingsData = topSavings.map((product) => {
          const priceEntries = Object.entries(product.prices).filter(([store, p]) => (p as number) > 0 && store !== 'SPAR').sort((a, b) => (a[1] as number) - (b[1] as number));
          if (priceEntries.length < 2) return null;
          const bestPrice = priceEntries[0][1] as number;
          const worstPrice = priceEntries[priceEntries.length - 1][1] as number;
          const savings = worstPrice - bestPrice;
          if (savings < 0.1) return null;
          return { product, priceEntries, bestPrice, worstPrice, savings };
        }).filter(Boolean) as { product: Product; priceEntries: [string, number][]; bestPrice: number; worstPrice: number; savings: number }[];
        const totalCheap = savingsData.reduce((sum, d) => sum + d.bestPrice, 0);
        const totalExpensive = savingsData.reduce((sum, d) => sum + d.worstPrice, 0);
        const totalSavings = totalExpensive - totalCheap;
        const savingsPercent = totalExpensive > 0 ? Math.round((totalSavings / totalExpensive) * 100) : 0;
        return (
        <section className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={16} className="text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('top_savings_title')}</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 lg:grid lg:grid-cols-4 lg:overflow-hidden">
            {savingsData.map(({ product, priceEntries, bestPrice, worstPrice, savings }) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => { setSelectedProduct(product); setScreen('compare'); }}
                  className="flex-shrink-0 w-[140px] sm:w-[155px] lg:w-auto bg-white dark:bg-slate-900 rounded-xl p-3 cursor-pointer active:scale-[0.97] transition-transform border border-slate-100 dark:border-slate-800 flex flex-col"
                >
                  <div className="relative w-full h-20 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 mb-2">
                    <SmartImage filename="" imageUrl={product.image} alt={product.name} className="w-full h-full object-contain p-1" fallbackLetter={product.name[0]} />
                    <div className="absolute top-1 right-1 bg-[#F04770] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      -{savings.toFixed(1)}₾
                    </div>
                  </div>
                  <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white leading-tight line-clamp-2 mb-2 min-h-[36px]">{product.name}</h3>
                  <div className="mt-auto">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[15px] font-bold text-[#06D7A0]">{bestPrice.toFixed(2)}₾</span>
                      <span className="text-[12px] text-slate-400 line-through">{worstPrice.toFixed(2)}₾</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[6px] font-bold text-white ${STORE_CONFIG[priceEntries[0][0]]?.color || 'bg-slate-400'}`}>{STORE_CONFIG[priceEntries[0][0]]?.letter || '?'}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{priceEntries[0][0]}</span>
                    </div>
                  </div>
                </motion.div>
            ))}
          </div>
          {/* Total savings bar — დროებით გამორთული */}
          {false && savingsData.length > 1 && (
            <div className="mt-3 bg-gradient-to-r from-[#108AB1] to-[#073A4B] rounded-xl p-3.5 lg:max-w-2xl">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] text-white/90 font-medium">{savingsData.length} {t('top_savings_products')}</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-[18px] font-bold text-white">{totalCheap.toFixed(0)}₾</span>
                    <span className="text-[13px] text-white/80 line-through">{totalExpensive.toFixed(0)}₾</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[11px] text-white/90 font-medium">{t('savings_label')}</span>
                  <span className="text-[20px] font-bold text-white">{totalSavings.toFixed(0)}₾</span>
                  <span className="text-[11px] text-white/80 font-medium">-{savingsPercent}%</span>
                </div>
              </div>
              <button
                onClick={() => {
                  let added = 0;
                  for (const { product } of savingsData) {
                    if (!basket.find(item => item.id === product.id)) {
                      basket.push(product);
                      added++;
                    }
                  }
                  if (added > 0) {
                    setBasket([...basket]);
                    setToastProduct(`${added} ${t('toast_products_added')}`);
                    setTimeout(() => setToastProduct(null), 2500);
                  }
                }}
                className="mt-3 w-full bg-white/20 hover:bg-white/30 active:scale-[0.98] transition-all text-white font-bold text-[13px] py-2.5 rounded-lg flex items-center justify-center gap-2"
              >
                <ShoppingBasket size={16} />
                {t('add_to_basket_bulk')}
              </button>
            </div>
          )}
        </section>
        );
      })()}

      {/* Search — hidden on desktop (search is in top header) */}
      <div className="relative mb-5 flex gap-2.5 lg:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} strokeWidth={1.8} />
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-[15px] font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-white focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-all border-0"
          />
          {searchFocused && !searchQuery && searchHistory.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-lg z-20 overflow-hidden max-h-[50vh] overflow-y-auto">
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t('search_history')}</span>
                <button onClick={() => { setSearchHistory([]); localStorage.removeItem('pasebi-search-history'); }} className="text-[10px] font-medium text-slate-400 hover:text-red-400">{t('search_clear')}</button>
              </div>
              {searchHistory.map((q, i) => (
                <button
                  key={i}
                  onMouseDown={() => setSearchQuery(q)}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Clock size={14} className="text-slate-300" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{q}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => {
            if (!localStorage.getItem('pasebi-auth-token')) {
              window.dispatchEvent(new CustomEvent('auth-required', { detail: 'ფოტოთი ძებნისთვის გაიარეთ რეგისტრაცია' }));
              return;
            }
            cameraInputRef.current?.click();
          }}
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0"
          aria-label={t('search_by_photo')}
        >
          <Camera size={20} className="text-white" />
        </button>
        <button
          onClick={() => setScreen('scanner')}
          className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center shrink-0"
          aria-label={t('search_barcode')}
        >
          <ScanLine size={20} className="text-white dark:text-slate-900" />
        </button>
        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            // Reset all state for fresh search
            setPhotoScanning(true);
            setLoading(true);
            setProducts([]);
            setSearchQuery('');
            setSelectedCategory('ყველა');
            setIsAiResult(false);
            // Compress image — higher quality for better recognition
            const img = new Image();
            img.onload = () => {
              const MAX = 1600;
              let w = img.width, h = img.height;
              if (w > MAX || h > MAX) {
                if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                else { w = Math.round(w * MAX / h); h = MAX; }
              }
              const canvas = document.createElement('canvas');
              canvas.width = w; canvas.height = h;
              canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
              const base64 = canvas.toDataURL('image/jpeg', 0.9);
              fetch('/api/ai/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64 }),
              })
                .then(r => {
                  if (!r.ok) throw new Error(`HTTP ${r.status}`);
                  return r.json();
                })
                .then(data => {
                  if (data.error) {
                    alert(data.error);
                    return;
                  }
                  if (data.products?.length > 0) {
                    const withPrices = data.products.filter((p: Product) => Object.keys(p.prices).length > 0);
                    setProducts(withPrices);
                    setIsAiResult(true);
                  } else {
                    alert(data.text || t('products_not_found'));
                  }
                })
                .catch((err) => {
                  alert(err.message);
                })
                .finally(() => { setPhotoScanning(false); setLoading(false); });
            };
            img.src = URL.createObjectURL(file);
            e.target.value = '';
          }}
        />
      </div>

      {/* Fullscreen photo scanning overlay */}
      {photoScanning && <PhotoScanOverlay />}

      {/* Categories + Products layout */}
      {(() => {
        const categories = storeType === 'grocery' ? [
          { key: 'ყველა', name: t('cat_all'), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> },
          { key: 'რძის პროდუქტი', name: t('cat_dairy'), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2h8l1 5H7L8 2z"/><path d="M7 7h10v13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7z"/><path d="M12 11v4"/></svg> },
          { key: 'ხორცი', name: t('cat_meat'), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 2.5c3 1.5 5 5 4.5 9s-4 7.5-8 7.5-7-3-7.5-6.5 1.5-7 4.5-8.5"/><circle cx="12" cy="12" r="3"/></svg> },
          { key: 'პური', name: t('cat_bread'), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8c0-3 2.5-5 7-5s7 2 7 5c0 2-1 3-1 3H6s-1-1-1-3z"/><rect x="5" y="11" width="14" height="7" rx="1"/><path d="M5 18h14v2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-2z"/></svg> },
          { key: 'ხილი/ბოსტანი', name: t('cat_fruit'), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c3 2 6 5.5 6 10a6 6 0 0 1-12 0c0-4.5 3-8 6-10z"/><path d="M12 2v6"/></svg> },
          { key: 'სასმელი', name: t('cat_beverage'), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg> },
          { key: 'ლუდი', name: t('cat_beer'), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 11h1a3 3 0 0 1 0 6h-1"/><path d="M5 7h12v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7z"/><path d="M8 2v3"/><path d="M12 2v3"/></svg> },
          { key: 'ტკბილეული', name: t('cat_sweets'), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 4v16"/></svg> },
          { key: 'სნექი', name: t('cat_snacks'), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3l5 5-2 7 6-3 5 5"/><path d="M3 17l4-4"/></svg> },
          { key: 'ყავა/ჩაი', name: t('cat_coffee_tea'), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><path d="M6 1v3"/><path d="M10 1v3"/></svg> },
          { key: 'ჰიგიენა', name: t('cat_hygiene'), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v4a2 2 0 0 0 4 0V2"/><rect x="8" y="6" width="8" height="14" rx="2"/><path d="M12 10v4"/></svg> },
        ] : [];

        return (
          <>
            {/* Mobile: horizontal scroll categories */}
            <div className="lg:hidden flex gap-2.5 overflow-x-auto no-scrollbar pb-1 mb-5">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => { setSelectedCategory(cat.key); setSearchQuery(''); }}
                  aria-pressed={selectedCategory === cat.key}
                  className={`px-4 py-2.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 focus:outline-none touch-manipulation ${
                    selectedCategory === cat.key
                      ? 'bg-[#108AB1] text-white shadow-sm'
                      : 'bg-white text-[#073A4B]/60 border border-slate-200'
                  }`}
                >
                  <span className="opacity-70">{cat.icon}</span>
                  {cat.name}
                  {categoryCounts[cat.key] ? (
                    <span className={`text-[10px] font-semibold ml-0.5 hidden lg:inline ${selectedCategory === cat.key ? 'text-white/70' : 'text-slate-400'}`}>{categoryCounts[cat.key] > 999 ? Math.round(categoryCounts[cat.key] / 1000) + 'k' : categoryCounts[cat.key]}</span>
                  ) : null}
                </button>
              ))}
            </div>

            {/* Desktop: sidebar categories + products */}
            <div className="lg:flex lg:gap-6 lg:items-start">
              {/* Sidebar — fixed on scroll */}
              <div className="hidden lg:block w-56 xl:w-64 shrink-0">
                <div className="fixed top-[5rem] w-56 xl:w-64 max-h-[calc(100vh-5.5rem)] overflow-y-auto">
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] overflow-hidden">
                    {/* Header */}
                    <div className="px-5 pt-5 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#108AB1]/10 flex items-center justify-center">
                          <SlidersHorizontal size={15} className="text-[#108AB1]" />
                        </div>
                        <span className="text-[14px] font-bold text-slate-800">კატეგორიები</span>
                      </div>
                    </div>
                    {/* Category list */}
                    <div className="px-3 pb-3 space-y-0.5">
                      {categories.map((cat) => (
                        <button
                          key={cat.key}
                          onClick={() => { setSelectedCategory(cat.key); setSearchQuery(''); }}
                          aria-pressed={selectedCategory === cat.key}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all text-left focus:outline-none group ${
                            selectedCategory === cat.key
                              ? 'bg-gradient-to-r from-[#108AB1] to-[#0d7a9e] text-white shadow-md shadow-[#108AB1]/20'
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                          }`}
                        >
                          <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                            selectedCategory === cat.key
                              ? 'bg-white/20'
                              : 'bg-slate-100 group-hover:bg-slate-200/70'
                          }`}>{cat.icon}</span>
                          <span className="flex-1">{cat.name}</span>
                          {categoryCounts[cat.key] ? (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              selectedCategory === cat.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                            }`}>{categoryCounts[cat.key] > 999 ? Math.round(categoryCounts[cat.key] / 1000) + 'k' : categoryCounts[cat.key]}</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Products */}
              <section className="flex-1 min-w-0">

        {/* Banner Slider */}
        {!debouncedQuery && selectedCategory === 'ყველა' && <BannerSlider />}

        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400">
              {selectedCategory === 'ყველა' ? 'პროდუქცია' : selectedCategory}
              <span className="text-xs text-slate-400 font-normal ml-1 hidden lg:inline">{filteredProducts.length} ნივთი</span>
            </h2>
            {isAiResult && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 text-white">
                AI
              </span>
            )}
            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border touch-manipulation ${sortBy !== 'popular' ? 'bg-[#108AB1]/10 text-[#108AB1] border-[#108AB1]/20' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
              >
                <SlidersHorizontal size={13} />
                {sortBy === 'popular' ? 'სორტირება' : sortBy === 'discount' ? 'ფასდაკლება %' : sortBy === 'price_asc' ? 'იაფი → ძვირი' : 'ძვირი → იაფი'}
              </button>
              {showSortMenu && (
                <>
                  <div className="fixed inset-0 z-20" onMouseDown={() => setShowSortMenu(false)} onTouchStart={() => setShowSortMenu(false)} />
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl z-30 w-48 py-1 overflow-hidden">
                    {([
                      { key: 'popular' as const, label: 'პოპულარული' },
                      { key: 'discount' as const, label: 'ფასდაკლება %' },
                      { key: 'price_asc' as const, label: 'იაფი → ძვირი' },
                      { key: 'price_desc' as const, label: 'ძვირი → იაფი' },
                    ]).map(opt => (
                      <button
                        key={opt.key}
                        onMouseDown={(e) => { e.stopPropagation(); setSortBy(opt.key); setShowSortMenu(false); }}
                        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setSortBy(opt.key); setShowSortMenu(false); }}
                        className={`w-full text-left px-4 py-3 text-[13px] font-medium transition-colors touch-manipulation ${sortBy === opt.key ? 'bg-[#108AB1]/10 text-[#108AB1]' : 'text-slate-600 hover:bg-slate-50 active:bg-slate-100'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Grid view switcher — modern pill style */}
          <div className="hidden lg:flex items-center bg-slate-100/80 rounded-full p-0.5 border border-slate-200/50">
            {([3, 4, 5] as const).map(cols => {
              const isActive = gridCols === cols;
              return (
                <button
                  key={cols}
                  onClick={() => { setGridCols(cols); localStorage.setItem('pasebi-grid-cols', String(cols)); }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-white shadow-sm scale-105' : 'hover:bg-white/60'}`}
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                    {cols === 2 && <>
                      <rect x="1" y="1" width="8" height="8" rx="2" stroke={isActive ? '#108AB1' : '#94a3b8'} strokeWidth="1.5" fill={isActive ? '#108AB1' : 'none'} fillOpacity="0.1" />
                      <rect x="11" y="1" width="8" height="8" rx="2" stroke={isActive ? '#108AB1' : '#94a3b8'} strokeWidth="1.5" fill={isActive ? '#108AB1' : 'none'} fillOpacity="0.1" />
                      <rect x="1" y="11" width="8" height="8" rx="2" stroke={isActive ? '#108AB1' : '#94a3b8'} strokeWidth="1.5" fill={isActive ? '#108AB1' : 'none'} fillOpacity="0.1" />
                      <rect x="11" y="11" width="8" height="8" rx="2" stroke={isActive ? '#108AB1' : '#94a3b8'} strokeWidth="1.5" fill={isActive ? '#108AB1' : 'none'} fillOpacity="0.1" />
                    </>}
                    {cols === 3 && <>
                      {[0.5, 7, 13.5].map((x, i) => <React.Fragment key={i}>
                        <rect x={x} y="1" width="5.5" height="8" rx="1.5" stroke={isActive ? '#108AB1' : '#94a3b8'} strokeWidth="1.2" fill={isActive ? '#108AB1' : 'none'} fillOpacity="0.1" />
                        <rect x={x} y="11" width="5.5" height="8" rx="1.5" stroke={isActive ? '#108AB1' : '#94a3b8'} strokeWidth="1.2" fill={isActive ? '#108AB1' : 'none'} fillOpacity="0.1" />
                      </React.Fragment>)}
                    </>}
                    {cols === 4 && <>
                      {[0.5, 5.5, 10.5, 15.5].map((x, i) => <React.Fragment key={i}>
                        <rect x={x} y="2" width="3.5" height="6" rx="1" stroke={isActive ? '#108AB1' : '#94a3b8'} strokeWidth="1" fill={isActive ? '#108AB1' : 'none'} fillOpacity="0.15" />
                        <rect x={x} y="11" width="3.5" height="6" rx="1" stroke={isActive ? '#108AB1' : '#94a3b8'} strokeWidth="1" fill={isActive ? '#108AB1' : 'none'} fillOpacity="0.15" />
                      </React.Fragment>)}
                    </>}
                    {cols === 5 && <>
                      {[0, 4, 8, 12, 16].map((x, i) => <React.Fragment key={i}>
                        <rect x={x} y="2" width="3" height="6" rx="0.75" stroke={isActive ? '#108AB1' : '#94a3b8'} strokeWidth="0.8" fill={isActive ? '#108AB1' : 'none'} fillOpacity="0.15" />
                        <rect x={x} y="11" width="3" height="6" rx="0.75" stroke={isActive ? '#108AB1' : '#94a3b8'} strokeWidth="0.8" fill={isActive ? '#108AB1' : 'none'} fillOpacity="0.15" />
                      </React.Fragment>)}
                    </>}
                  </svg>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`grid gap-2 sm:gap-3 lg:gap-4 ${
          gridCols === 3 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4' :
          gridCols === 4 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' :
          'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
        }`}>
          {loading && filteredProducts.length === 0 && [1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <div className="w-full aspect-[4/3] skeleton" />
              <div className="p-3 space-y-2.5">
                <div className="h-4 skeleton rounded-lg w-4/5" />
                <div className="h-3 skeleton rounded-lg w-3/5" />
                <div className="h-3 skeleton rounded-lg w-2/5" />
                <div className="h-8 skeleton rounded-lg w-full mt-2" />
              </div>
            </div>
          ))}
          {filteredProducts.map((product, idx) => {
            const isInBasket = basket.find(item => item.id === product.id);
            const isFavorite = favorites.find(f => f.id === product.id);
            const priceEntries = Object.entries(product.prices).filter(([store, p]) => (p as number) > 0 && store !== 'SPAR').sort((a, b) => (a[1] as number) - (b[1] as number));
            if (priceEntries.length === 0) return null;
            const bestPrice = priceEntries[0][1] as number;
            const worstPrice = priceEntries.length >= 2 ? priceEntries[priceEntries.length - 1][1] as number : bestPrice;
            const savePct = worstPrice > 0 ? Math.round(((worstPrice - bestPrice) / worstPrice) * 100) : 0;
            const saveAmount = (worstPrice - bestPrice).toFixed(2);

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => { setSelectedProduct(product); setScreen('compare'); }}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedProduct(product); setScreen('compare'); } }}
                role="button"
                aria-label={product.name}
                className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#108AB1]/50 flex flex-col h-full touch-manipulation"
              >
                {/* Image - full width top, fixed aspect ratio */}
                <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-50 rounded-t-2xl flex items-center justify-center">
                  <SmartImage
                    filename=""
                    imageUrl={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain p-3"
                    fallbackLetter={product.name[0]}
                    lazy
                  />
                  {/* Savings badge - top left */}
                  {priceEntries.length >= 2 && savePct >= 5 && (
                    <div className={`absolute top-2 left-2 text-white text-[10px] font-black px-2 py-0.5 rounded-full ${
                      savePct >= 30 ? 'bg-gradient-to-r from-[#F04770] to-[#F78C6A]' :
                      savePct >= 15 ? 'bg-gradient-to-r from-[#06D7A0] to-[#108AB1]' :
                      'bg-[#108AB1]'
                    }`}>
                      -{savePct}%
                    </div>
                  )}
                  {/* Add button - top right */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleBasket(e, product); }}
                      aria-label={isInBasket ? 'Remove from basket' : 'Add to basket'}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all focus:outline-none ${
                        isInBasket
                          ? 'bg-[#108AB1] text-white shadow-md shadow-[#108AB1]/30'
                          : 'bg-white/90 text-slate-400 border border-slate-200/80 backdrop-blur-sm hover:bg-[#108AB1] hover:text-white hover:border-[#108AB1] hover:shadow-lg hover:shadow-[#108AB1]/25 hover:scale-110'
                      }`}
                    >
                      {isInBasket ? <X size={14} strokeWidth={2.5} /> : <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="7" y1="3" x2="7" y2="11"/><line x1="3" y1="7" x2="11" y2="7"/></svg>}
                    </button>
                    {isFavorite && <Heart size={14} className="text-pink-500 fill-pink-500 mx-auto" aria-label="Add to favorites" />}
                  </div>
                </div>
                {/* Info - below image */}
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="font-bold text-slate-900 dark:text-white text-[12px] sm:text-[13px] leading-tight line-clamp-2">{product.name}</h3>
                  {product.size && <p className="text-slate-400 text-[11px] mt-0.5 line-clamp-1">{product.size}</p>}
                  {/* Store prices - show max 3 */}
                  <div className="mt-2 space-y-1">
                    {priceEntries.slice(0, 3).map(([store, price], i) => (
                      <div key={store} className={`flex items-center justify-between text-[12px] ${i === 0 ? 'font-bold text-[#06D7A0]' : 'font-medium text-slate-400'}`}>
                        <span className="flex items-center gap-1.5">
                          {STORE_CONFIG[store]?.logo ? (
                            <img src={STORE_CONFIG[store].logo} alt="" className="w-4 h-4 rounded object-contain" onError={(e) => { (e.target as HTMLImageElement).replaceWith(Object.assign(document.createElement('span'), { className: `w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white ${STORE_CONFIG[store]?.color || 'bg-slate-400'}`, textContent: STORE_CONFIG[store]?.letter || store[0] })); }} />
                          ) : (
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white ${STORE_CONFIG[store]?.color || 'bg-slate-400'}`}>{STORE_CONFIG[store]?.letter || store[0]}</span>
                          )}
                          <span className="text-[10px]">{store === '2 Nabiji' ? '2ნაბ' : store === 'Goodwill' ? 'GW' : store === 'Europroduct' ? 'Euro' : store === 'Megatechnica' ? 'Mega' : store}</span>
                        </span>
                        <span>{(price as number).toFixed(2)}₾</span>
                      </div>
                    ))}
                    {priceEntries.length > 3 && (
                      <div className="text-[10px] text-slate-400 text-center">+{priceEntries.length - 3} {priceEntries.length - 3 === 1 ? 'store' : 'stores'}</div>
                    )}
                  </div>
                  {/* Save amount - pushed to bottom */}
                  <div className="mt-auto pt-2">
                    {priceEntries.length >= 2 && (worstPrice - bestPrice) >= 0.1 ? (
                      <div className={`text-center text-[11px] font-bold py-1.5 rounded-lg ${
                        (worstPrice - bestPrice) >= 5 ? 'bg-[#06D7A0]/10 text-[#06D7A0]' :
                        (worstPrice - bestPrice) >= 1 ? 'bg-[#108AB1]/10 text-[#108AB1]' :
                        'bg-[#073A4B]/5 text-[#073A4B]/50'
                      }`}>
                        {t('savings_label')} {saveAmount}₾
                      </div>
                    ) : (
                      <div className="text-center text-[11px] font-bold py-1.5 rounded-lg bg-[#073A4B]/5 text-[#073A4B]/30">
                        {bestPrice.toFixed(2)}₾
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
          {!loading && filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <Search size={36} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-semibold text-base">{t('products_not_found')}</p>
              <p className="text-slate-300 dark:text-slate-600 text-sm mt-1">{t('products_try_different')}</p>
            </div>
          )}
        </div>
      </section>
            </div>{/* end lg:flex */}
          </>
        );
      })()}
    </div>
  );
};

const BarcodeScannerScreen = ({ setScreen, setSelectedProduct }: { setScreen: (s: Screen) => void, setSelectedProduct: (p: Product) => void }) => {
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [lastScanned, setLastScanned] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lookingUp = useRef(false);
  const scannerRef = useRef<InstanceType<typeof Html5Qrcode> | null>(null);

  const [scanSuccess, setScanSuccess] = useState(false);

  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1600;
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.15);
      }, 150);
    } catch(_e) { /* */ }
  }, []);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      try { scannerRef.current.stop().catch(() => {}); } catch(_e) { /* */ }
      try { scannerRef.current.clear(); } catch(_e) { /* */ }
      scannerRef.current = null;
    }
  }, []);

  const lookupBarcode = useCallback((code: string) => {
    if (lookingUp.current) return;
    lookingUp.current = true;
    setScanSuccess(true);
    setSearching(true);
    setNotFound(false);
    setError(null);
    setLastScanned(code);
    playBeep();
    try { navigator.vibrate?.([100, 50, 100]); } catch(_e) { /* */ }
    stopScanner();
    fetch(`/api/search/barcode/${encodeURIComponent(code)}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (data.product) {
          setSelectedProduct(data.product);
          setScreen('compare');
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        console.error('Barcode lookup failed:', err);
        setError(`${t('barcode_lookup_error')} ${code}`);
      })
      .finally(() => { setSearching(false); lookingUp.current = false; });
  }, [setSelectedProduct, setScreen, stopScanner]);

  useEffect(() => {
    if (!scanning) return;
    let mounted = true;

    const startScanner = async () => {
      const el = document.getElementById('barcode-reader');
      if (!el || !mounted) return;

      const scanner = new Html5Qrcode('barcode-reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
        ],
        verbose: false,
      });
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: (vw, vh) => ({ width: Math.floor(Math.min(vw, vh) * 0.8), height: Math.floor(Math.min(vw, vh) * 0.4) }),
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!mounted || lookingUp.current) return;
            if (decodedText && decodedText.length >= 8) {
              setScanning(false);
              lookupBarcode(decodedText);
            }
          },
          () => {},
        );
      } catch (err) {
        try {
          await scanner.start(
            { facingMode: 'user' },
            { fps: 15, qrbox: (vw, vh) => ({ width: Math.floor(Math.min(vw, vh) * 0.8), height: Math.floor(Math.min(vw, vh) * 0.4) }) },
            (decodedText) => {
              if (!mounted || lookingUp.current) return;
              if (decodedText && decodedText.length >= 8) {
                setScanning(false);
                lookupBarcode(decodedText);
              }
            },
            () => {},
          );
        } catch(_e) {
          if (mounted) setError(t('barcode_camera_error'));
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      stopScanner();
    };
  }, [scanning, lookupBarcode, stopScanner]);

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (code.length < 8 || searching) return;
    stopScanner();
    setScanning(false);
    lookupBarcode(code);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopScanner();
    setScanning(false);
    const fileScanner = new Html5Qrcode('barcode-reader-file', {
      formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.UPC_A],
      verbose: false,
    });
    fileScanner.scanFile(file, false)
      .then(decodedText => lookupBarcode(decodedText))
      .catch(() => setError(t('barcode_not_found_photo')));
  };

  const retry = () => {
    setNotFound(false);
    setError(null);
    setScanSuccess(false);
    setSearching(false);
    lookingUp.current = false;
    setScanning(true);
  };

  return (
    <div className="pb-24 lg:pb-8 pt-4 px-5 md:px-8 lg:px-12 xl:px-16 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => { stopScanner(); setScreen('home'); }} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">{t('barcode_title')}</h1>
      </div>

      <div id="barcode-reader-file" className="hidden" />
      <div className="rounded-2xl overflow-hidden bg-black relative" style={{ minHeight: 'min(300px, 55vh)' }}>
        <div id="barcode-reader" className="w-full" />

        {scanning && !error && !scanSuccess && (
          <>
            <div className="absolute inset-0 pointer-events-none border-2 border-white/20 rounded-2xl" />
            <div className="absolute left-4 right-4 h-0.5 bg-red-500 pointer-events-none animate-[scanline_2s_ease-in-out_infinite]"
              style={{ boxShadow: '0 0 8px 2px rgba(239,68,68,0.6), 0 0 20px 4px rgba(239,68,68,0.3)' }} />
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-white/70 rounded-tl pointer-events-none" />
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-white/70 rounded-tr pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-white/70 rounded-bl pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-white/70 rounded-br pointer-events-none" />
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <span className="bg-black/60 text-white text-xs px-4 py-2 rounded-full">
                {t('barcode_instruction')}
              </span>
            </div>
          </>
        )}

        {scanSuccess && (
          <div className="absolute inset-0 bg-green-500/30 animate-[flash_0.6s_ease-out_forwards] pointer-events-none rounded-2xl" />
        )}
      </div>

      <style>{`
        @keyframes scanline {
          0%, 100% { top: 15%; }
          50% { top: 75%; }
        }
        @keyframes flash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        #barcode-reader video { width: 100% !important; border-radius: 1rem; }
        #barcode-reader canvas { display: none !important; }
        #barcode-reader img[alt="Info icon"] { display: none !important; }
        #barcode-reader__dashboard { display: none !important; }
      `}</style>

      <div className="mt-3 flex gap-3">
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm"
        >
          <Camera size={18} />
          {t('barcode_upload')}
        </button>
      </div>

      <div className="mt-4">
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder={t('barcode_manual_placeholder')}
            value={manualCode}
            onChange={e => setManualCode(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
            className="flex-1 px-4 py-3 bg-slate-100 text-slate-900 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#108AB1]/50"
          />
          <button
            onClick={handleManualSubmit}
            disabled={manualCode.trim().length < 8 || searching}
            className="px-5 py-3 bg-[#108AB1] text-white rounded-xl font-semibold text-sm disabled:opacity-40"
          >
            {searching ? '...' : t('barcode_search')}
          </button>
        </div>
      </div>

      {searching && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl">
            <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" />
            <span className="text-sm text-slate-600">{t('barcode_searching')} {lastScanned}...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 text-center">
          <p className="text-red-500 font-medium mb-3">{error}</p>
          <button onClick={retry} className="px-6 py-2.5 bg-[#108AB1] text-white rounded-xl font-semibold text-sm">
            {t('barcode_retry')}
          </button>
        </div>
      )}

      {notFound && (
        <div className="mt-6 text-center">
          <p className="text-slate-500 font-medium mb-3">{t('barcode_not_found')}{lastScanned ? ` (${lastScanned})` : ''}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={retry} className="px-6 py-2.5 bg-[#108AB1] text-white rounded-xl font-semibold text-sm">
              {t('barcode_retry_scan')}
            </button>
            <button onClick={() => { stopScanner(); setScreen('home'); }} className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm">
              {t('barcode_back')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const CompareScreen = ({ selectedProduct, setScreen, darkMode, setDarkMode, alertCount, onAlertTap, basket, setBasket, setTargetStore }: { selectedProduct: Product | null, setScreen: (s: Screen) => void, darkMode: boolean, setDarkMode: (v: boolean) => void, alertCount?: number, onAlertTap?: () => void, basket: Product[], setBasket: React.Dispatch<React.SetStateAction<Product[]>>, setTargetStore: (s: string | null) => void }) => {
  const { t, lang } = useLanguage();
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [targetPrice, setTargetPrice] = useState('2.20');
  const [compareData, setCompareData] = useState<{ stores: StorePrice[]; priceTrend?: 'up' | 'down' } | null>(null);
  const [compareLoading, setCompareLoading] = useState(true);
  const [priceHistory, setPriceHistory] = useState<{ store: string; price: number; date: string }[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const product = selectedProduct || FALLBACK_PRODUCTS[0];
  const isInBasket = basket.find(item => item.id === product.id);

  useEffect(() => {
    setCompareLoading(true);
    fetch(`/api/compare/${product.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.stores) {
          setCompareData({
            stores: data.stores.map((s: { store: string; price: number; delta: number; inStock: boolean }) => ({
              store: s.store,
              price: s.inStock ? s.price : null,
              delta: s.delta || undefined,
            })),
            priceTrend: data.product?.priceTrend,
          });
        }
      })
      .catch(() => {})
      .finally(() => setCompareLoading(false));

    fetch(`/api/history/${product.id}`)
      .then(r => r.json())
      .then(data => { if (data.history) setPriceHistory(data.history); })
      .catch(() => {});
  }, [product.id]);

  const rawComparison: StorePrice[] = compareData?.stores || Object.entries(product.prices)
    .filter(([, price]) => price > 0)
    .sort((a, b) => a[1] - b[1])
    .map(([store, price], idx, arr) => ({
      store,
      price,
      delta: idx === 0 ? undefined : +(price - arr[0][1]).toFixed(2),
    }));

  const storeComparison = rawComparison
    .filter(s => s.price !== null && s.price > 0 && s.store !== 'SPAR')
    .sort((a, b) => (a.price || 0) - (b.price || 0));

  const bestPrice = storeComparison[0];
  const worstPriceCompare = storeComparison.length >= 2 ? storeComparison[storeComparison.length - 1] : null;
  const totalSavings = worstPriceCompare && bestPrice ? (worstPriceCompare.price || 0) - (bestPrice.price || 0) : 0;

  useEffect(() => {
    if (totalSavings >= 5) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [totalSavings]);

  const [toastProduct, setToastProduct] = useState<string | null>(null);
  const toggleBasket = () => {
    if (isInBasket) {
      setBasket(basket.filter(item => item.id !== product.id));
    } else {
      setBasket([...basket, product]);
      setToastProduct(product.name);
      setTimeout(() => setToastProduct(null), 2500);
    }
  };

  return (
    <div className="pb-24 lg:pb-8 pt-4 px-5 md:px-8 lg:px-12 xl:px-16 min-h-screen">
      <AnimatePresence>{toastProduct && <BasketToast productName={toastProduct} />}</AnimatePresence>

      {/* Confetti animation for big savings */}
      {showConfetti && (
        <>
          <style>{`
            @keyframes confetti-fall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
            @keyframes confetti-spin { 0% { transform: rotateX(0) rotateY(0); } 100% { transform: rotateX(360deg) rotateY(180deg); } }
            .confetti-piece { position: fixed; top: -10px; z-index: 100; width: 10px; height: 10px; border-radius: 2px; animation: confetti-fall 3s ease-in forwards; pointer-events: none; }
            .confetti-piece::after { content: ''; position: absolute; inset: 0; border-radius: inherit; background: inherit; animation: confetti-spin 2s linear infinite; }
          `}</style>
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                background: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'][i % 6],
                animationDelay: `${Math.random() * 1.5}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                width: `${6 + Math.random() * 8}px`,
                height: `${6 + Math.random() * 8}px`,
              }}
            />
          ))}
        </>
      )}

      <Header title={t('compare_title')} showBack onBack={() => setScreen('home')} />

      {/* Product card - clean */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 mb-6 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
            <SmartImage
              filename=""
              imageUrl={product.image}
              alt={product.name}
              className="w-full h-full object-contain p-2"
              fallbackLetter={product.name[0]}
            />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{product.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{product.size}</p>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {bestPrice?.price?.toFixed(2) || '—'}₾
              </p>
              {bestPrice && <span className="text-xs text-slate-400 font-normal">{t('compare_best')}</span>}
              {(compareData?.priceTrend || product.priceTrend) && (
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  (compareData?.priceTrend || product.priceTrend) === 'down'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400'
                }`}>
                  {(compareData?.priceTrend || product.priceTrend) === 'down'
                    ? <><TrendingDown size={10} /> {t('compare_price_down')}</>
                    : <><TrendingUp size={10} /> {t('compare_price_up')}</>}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2.5 mt-4">
          <button
            onClick={() => {
              if (!localStorage.getItem('pasebi-auth-token')) {
                window.dispatchEvent(new CustomEvent('auth-required', { detail: 'ფასის ალერტის დასაყენებლად გაიარეთ რეგისტრაცია' }));
                return;
              }
              setShowAlertModal(true);
            }}
            className="flex-1 flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 text-sm font-medium bg-slate-50 dark:bg-slate-800 px-4 py-3.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Bell size={16} />
            {t('compare_alert')}
          </button>
          <button
            onClick={toggleBasket}
            className={`flex-1 flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3.5 rounded-xl transition-colors ${
              isInBasket
                ? 'bg-[#108AB1] text-white'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <ShoppingBasket size={16} />
            {isInBasket ? t('compare_in_basket') : t('compare_add_basket')}
          </button>
        </div>
      </div>

      {/* Price Alert Modal */}
      <AnimatePresence>
        {showAlertModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAlertModal(false)}
              onKeyDown={(e) => { if (e.key === 'Escape') setShowAlertModal(false); }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-100 dark:border-slate-800"
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t('compare_alert_title')}</h3>
              <p className="text-slate-400 text-xs mb-5">{t('compare_alert_desc')}</p>

              <div className="mb-6">
                <label className="text-[11px] font-medium text-slate-400 mb-2 block">{t('compare_alert_label')}</label>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-xl py-3.5 px-4 text-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 transition-all"
                  placeholder="2.20"
                />
              </div>

              <button
                onClick={() => {
                  const deviceId = localStorage.getItem('pasebi-device-id') || Math.random().toString(36).slice(2) + Date.now().toString(36);
                  localStorage.setItem('pasebi-device-id', deviceId);
                  fetch('/api/alerts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ device_id: deviceId, product_id: product.id, target_price: Number(targetPrice) }),
                  }).then(() => { setShowAlertModal(false); window.dispatchEvent(new Event('alerts-updated')); }).catch(() => setShowAlertModal(false));
                }}
                className="w-full bg-[#108AB1] text-white py-3.5 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
              >
                {t('compare_alert_activate')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Store prices */}
      <div>
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">{t('compare_prices_header')}</h3>
        {compareLoading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-8 h-8 border-2 border-[#108AB1] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">{lang === 'ka' ? 'ფასები იტვირთება...' : 'Loading prices...'}</p>
          </div>
        ) : (
        <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:space-y-0 lg:gap-3">
        {storeComparison.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`rounded-xl p-4 flex justify-between items-center border ${
              idx === 0
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30'
                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800">
                <SmartImage
                  filename={STORE_CONFIG[item.store]?.filename || ''}
                  alt={item.store}
                  className="w-full h-full object-contain p-1"
                  fallbackLetter={STORE_CONFIG[item.store]?.letter}
                  fallbackColor={STORE_CONFIG[item.store]?.color}
                  isLogo
                  storeName={item.store}
                />
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-[15px]">{item.store}</span>
                {idx === 0 && <span className="text-[12px] text-[#06D7A0] font-semibold block">{t('compare_cheapest')}</span>}
              </div>
            </div>
            <div className="text-right">
              <p className={`font-bold text-lg ${idx === 0 ? 'text-[#06D7A0]' : 'text-slate-900 dark:text-white'}`}>{item.price?.toFixed(2)}₾</p>
              {item.delta && item.delta > 0 && <p className="text-[12px] text-slate-400 font-medium">+{item.delta.toFixed(2)}₾</p>}
            </div>
          </motion.div>
        ))}
        </div>
        )}
      </div>

      {/* Price History */}
      {priceHistory.length > 1 && (() => {
        const storeColors: Record<string, string> = { '2 Nabiji': '#F59E0B', 'Goodwill': '#0054A6', 'Agrohub': '#8B5CF6', 'Europroduct': '#E30613' };
        // Filter out SPAR (closed) and deduplicate: keep last price per store per day
        const dayMap = new Map<string, { store: string; price: number; date: string }>();
        for (const h of [...priceHistory].filter(h => h.store !== 'SPAR').sort((a, b) => a.date.localeCompare(b.date))) {
          const day = h.date.slice(0, 10);
          dayMap.set(`${h.store}|${day}`, { ...h, date: day });
        }
        const sorted = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
        if (sorted.length < 2) return null;
        const stores = Array.from(new Set(sorted.map(h => h.store)));
        const dates = Array.from(new Set(sorted.map(h => h.date))).sort();
        const allPrices = sorted.map(h => h.price);
        const minP = Math.min(...allPrices);
        const maxP = Math.max(...allPrices);
        const range = maxP - minP || 0.5;
        const padded = range * 0.15;
        const W = 400, H = 180, padL = 42, padR = 55, padT = 20, padB = 32;
        const chartW = W - padL - padR;
        const chartH = H - padT - padB;
        const yMin = minP - padded;
        const yMax = maxP + padded;
        const yRange = yMax - yMin || 1;

        const yTicks = 4;
        const yStep = yRange / yTicks;

        return (
          <div className="mt-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 lg:max-w-2xl">
            <h3 className="text-xs font-semibold text-slate-400 mb-3">{t('compare_price_history')}</h3>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
              {/* Grid lines */}
              {Array.from({ length: yTicks + 1 }).map((_, i) => {
                const val = yMin + i * yStep;
                const y = padT + chartH - (i * yStep / yRange) * chartH;
                return (
                  <g key={`grid-${i}`}>
                    <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#f1f5f9" strokeWidth="0.5" />
                    <text x={padL - 5} y={y + 3} textAnchor="end" fill="#94a3b8" fontSize="7.5" fontWeight="500">{val.toFixed(2)}₾</text>
                  </g>
                );
              })}

              {/* X axis dates */}
              {(() => {
                const maxLabels = 5;
                const step = Math.max(1, Math.ceil(dates.length / maxLabels));
                const indices = dates.map((_, i) => i).filter(i => i % step === 0 || i === dates.length - 1);
                return indices.map(i => {
                  const x = padL + (i / Math.max(dates.length - 1, 1)) * chartW;
                  const d = dates[i];
                  const label = d.length >= 10 ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : d;
                  return <text key={`date-${i}`} x={x} y={H - 5} textAnchor="middle" fill="#94a3b8" fontSize="7" fontWeight="500">{label}</text>;
                });
              })()}

              {/* Lines + end labels per store */}
              {stores.map(store => {
                const pts = sorted.filter(h => h.store === store);
                if (pts.length < 1) return null;
                const coords = pts.map((p) => {
                  const dateIdx = dates.indexOf(p.date);
                  const x = padL + (dateIdx / Math.max(dates.length - 1, 1)) * chartW;
                  const y = padT + chartH - ((p.price - yMin) / yRange) * chartH;
                  return { x, y, price: p.price, date: p.date };
                });
                const color = storeColors[store] || '#64748b';

                // Smooth curve using cubic bezier
                let path = `M${coords[0].x},${coords[0].y}`;
                for (let i = 1; i < coords.length; i++) {
                  const prev = coords[i - 1];
                  const curr = coords[i];
                  const cpx = (prev.x + curr.x) / 2;
                  path += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
                }

                const last = coords[coords.length - 1];
                const shortName = store === '2 Nabiji' ? '2ნაბ' : store === 'Goodwill' ? 'GW' : store === 'Europroduct' ? 'Euro' : store;

                return (
                  <g key={store}>
                    <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
                    {/* End dot + label on right side */}
                    <circle cx={last.x} cy={last.y} r="3" fill="white" stroke={color} strokeWidth="1.5" />
                    <text x={last.x + 6} y={last.y - 5} textAnchor="start" fill={color} fontSize="8" fontWeight="700">{last.price.toFixed(2)}₾</text>
                    <text x={last.x + 6} y={last.y + 5} textAnchor="start" fill={color} fontSize="6.5" fontWeight="500" opacity="0.7">{shortName}</text>
                    {/* Tap areas on all points */}
                    {coords.map((c, i) => (
                      <circle key={`tap-${i}`} cx={c.x} cy={c.y} r="1.5" fill={color} opacity="0.4" />
                    ))}
                  </g>
                );
              })}
            </svg>
          </div>
        );
      })()}

      {/* Analysis section */}
      <div className="mt-6">
        <button
          onClick={() => {
            if (showAnalysis) { setShowAnalysis(false); return; }
            if (!localStorage.getItem('pasebi-auth-token')) {
              window.dispatchEvent(new CustomEvent('auth-required', { detail: 'პროდუქტის ანალიზის სანახავად გაიარეთ რეგისტრაცია' }));
              return;
            }
            setShowAnalysis(true);
            if (!analysis) {
              setAnalysisLoading(true);
              // Try barcode first, fallback to name-based analysis
              fetch(`/api/compare/${product.id}`)
                .then(r => r.json())
                .then(async cData => {
                  const barcode = cData?.product?.barcode;
                  if (barcode) {
                    const barcodeRes = await fetch(`/api/analysis/product/${barcode}`).then(r => r.json());
                    if (barcodeRes.found) { setAnalysis(barcodeRes); return; }
                  }
                  // Fallback: analyze by product name
                  const nameRes = await fetch(`/api/analysis/by-name/${encodeURIComponent(product.name)}`).then(r => r.json());
                  setAnalysis(nameRes);
                })
                .catch(() => {
                  // Last resort: name-based
                  fetch(`/api/analysis/by-name/${encodeURIComponent(product.name)}`).then(r => r.json()).then(data => setAnalysis(data)).catch(() => setAnalysis({ found: false }));
                })
                .finally(() => setAnalysisLoading(false));
              return;
            }
          }}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all border-2 ${
            showAnalysis ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-600'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
          {showAnalysis ? 'დამალვა' : 'ანალიზი'}
        </button>

        <AnimatePresence>
          {showAnalysis && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                {analysisLoading && (
                  <div className="flex items-center justify-center gap-3 py-8">
                    <div className="w-6 h-6 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
                    <span className="text-sm text-slate-400">ანალიზი მიმდინარეობს...</span>
                  </div>
                )}

                {analysis && !analysisLoading && !analysis.found && (
                  <div className="text-center py-6">
                    <p className="text-slate-400 text-sm">ამ პროდუქტის შემადგენლობის მონაცემები ვერ მოიძებნა</p>
                  </div>
                )}

                {analysis && !analysisLoading && analysis.found && (
                  <>
                    {/* Verdict — Bobby Approved style */}
                    {analysis.verdict && (
                      <div className={`flex items-center gap-3 p-3.5 rounded-xl border ${
                        analysis.verdict.color === 'emerald' || analysis.verdict.color === 'green' ? 'bg-emerald-50 border-emerald-200' :
                        analysis.verdict.color === 'amber' ? 'bg-amber-50 border-amber-200' :
                        'bg-red-50 border-red-200'
                      }`}>
                        <span className="text-2xl">{analysis.verdict.emoji}</span>
                        <div>
                          <p className="font-bold text-slate-800">{analysis.verdict.text}</p>
                          {analysis.betterThan && <p className="text-[11px] text-slate-500">უკეთესია ვიდრე {analysis.betterThan}% პროდუქტი ამ კატეგორიაში</p>}
                        </div>
                      </div>
                    )}

                    {/* Yuka Score + Nutriscore + Nova */}
                    <div className="flex gap-3">
                      {analysis.yukaScore != null && (
                        <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center">
                          <div className={`text-2xl font-bold ${analysis.yukaScore >= 60 ? 'text-emerald-500' : analysis.yukaScore >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                            {analysis.yukaScore}<span className="text-sm text-slate-400">/100</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">ქულა</p>
                        </div>
                      )}
                      {analysis.nutriscore && (
                        <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center">
                          <div className={`text-2xl font-bold ${analysis.nutriscore === 'a' ? 'text-emerald-500' : analysis.nutriscore === 'b' ? 'text-green-500' : analysis.nutriscore === 'c' ? 'text-amber-500' : 'text-red-500'}`}>
                            {analysis.nutriscore.toUpperCase()}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Nutriscore</p>
                        </div>
                      )}
                      {analysis.nova && (
                        <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center">
                          <div className={`text-2xl font-bold ${analysis.nova <= 2 ? 'text-emerald-500' : analysis.nova === 3 ? 'text-amber-500' : 'text-red-500'}`}>
                            {analysis.nova}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Nova</p>
                          <p className="text-[9px] text-slate-400 leading-tight mt-0.5">{analysis.novaDescription}</p>
                        </div>
                      )}
                    </div>

                    {/* Badges */}
                    {analysis.badges && analysis.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.badges.map((b: any, i: number) => (
                          <span key={i} className={`px-2.5 py-1 text-[11px] font-medium rounded-full border ${
                            b.color === 'red' ? 'bg-red-50 text-red-600 border-red-100' :
                            b.color === 'emerald' || b.color === 'green' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            b.color === 'blue' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>{b.label}</span>
                        ))}
                      </div>
                    )}

                    {/* Nutrition bars */}
                    {analysis.nutrition && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">100გ-ში</h4>
                        {[
                          { label: 'კალორია', value: analysis.nutrition.calories, unit: 'კკალ', max: 500, color: 'bg-blue-500' },
                          { label: 'შაქარი', value: analysis.nutrition.sugar, unit: 'გ', max: 50, color: analysis.nutrition.sugar > 15 ? 'bg-red-500' : analysis.nutrition.sugar > 5 ? 'bg-amber-500' : 'bg-emerald-500' },
                          { label: 'ცხიმი', value: analysis.nutrition.fat, unit: 'გ', max: 50, color: analysis.nutrition.fat > 17 ? 'bg-red-500' : analysis.nutrition.fat > 5 ? 'bg-amber-500' : 'bg-emerald-500' },
                          { label: 'მარილი', value: analysis.nutrition.salt, unit: 'გ', max: 5, color: analysis.nutrition.salt > 1.5 ? 'bg-red-500' : analysis.nutrition.salt > 0.5 ? 'bg-amber-500' : 'bg-emerald-500' },
                          { label: 'ცილა', value: analysis.nutrition.protein, unit: 'გ', max: 50, color: 'bg-blue-500' },
                        ].filter(n => n.value != null && n.value !== 0).map(n => (
                          <div key={n.label} className="flex items-center gap-3">
                            <span className="text-[12px] text-slate-500 w-14 shrink-0">{n.label}</span>
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${n.color}`} style={{ width: `${Math.min(100, (n.value / n.max) * 100)}%` }} />
                            </div>
                            <span className="text-[12px] font-semibold text-slate-700 w-16 text-right">{n.value}{n.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Ingredient risks — Think Dirty style */}
                    {analysis.ingredientRisks && analysis.ingredientRisks.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">საშიში ინგრედიენტები</h4>
                        <div className="space-y-1.5">
                          {analysis.ingredientRisks.map((r: any, i: number) => (
                            <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg ${r.risk === 'high' ? 'bg-red-50' : r.risk === 'medium' ? 'bg-amber-50' : 'bg-slate-50'}`}>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${r.risk === 'high' ? 'bg-red-500 text-white' : r.risk === 'medium' ? 'bg-amber-500 text-white' : 'bg-slate-300 text-white'}`}>
                                {r.risk === 'high' ? 'მაღალი' : r.risk === 'medium' ? 'საშუალო' : 'დაბალი'}
                              </span>
                              <div>
                                <span className="text-[12px] font-semibold text-slate-700">{r.name}</span>
                                <p className="text-[11px] text-slate-500">{r.reason}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Allergens */}
                    {analysis.allergens && analysis.allergens.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">ალერგენები</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.allergens.map((a: string) => (
                            <span key={a} className="px-2.5 py-1 bg-red-50 text-red-600 text-[11px] font-medium rounded-full border border-red-100">{a}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Analysis */}
                    {analysis.aiAnalysis && (
                      <div className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-xl p-4 border border-violet-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles size={14} className="text-violet-500" />
                          <span className="text-xs font-bold text-violet-700">AI ანალიზი</span>
                        </div>
                        <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">{analysis.aiAnalysis}</p>
                      </div>
                    )}

                    {/* Partial data warning */}
                    {analysis.partialData && (
                      <p className="text-[10px] text-slate-400 text-center">ნაწილობრივი მონაცემები — შემადგენლობა სრულად არ არის ხელმისაწვდომი</p>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4">
        <button
          onClick={() => { setTargetStore(bestPrice?.store || null); setScreen('map'); }}
          className="w-full bg-[#108AB1] text-white py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <MapIcon size={18} />
          {t('compare_show_map')}
        </button>
      </div>
    </div>
  );
};

// Map components - reuse from original
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

const createPulsingIcon = (color: string, label?: string) => {
  const hex = color === 'cobalt' ? '#3B82F6' : color === 'emerald' ? '#10B981' : '#3B82F6';
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center">
        <div style="width:14px;height:14px;background:${hex};border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>
        ${label ? `<div style="margin-top:2px;background:white;border:1px solid #e2e8f0;padding:1px 6px;border-radius:4px;font-size:7px;font-weight:600;color:#334155;white-space:nowrap">${label}</div>` : ''}
      </div>
    `,
    iconSize: [24, 36],
    iconAnchor: [12, 18],
  });
};

const RecenterMap = ({ coords }: { coords: { lat: number; lng: number } }) => {
  const map = useMap();
  useEffect(() => { map.setView([coords.lat, coords.lng], 16); }, [coords, map]);
  return null;
};

const FitRouteBounds = ({ coords, branch }: { coords: { lat: number; lng: number }; branch: { lat: number; lng: number } }) => {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds([coords.lat, coords.lng], [branch.lat, branch.lng]);
    map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
  }, [coords, branch, map]);
  return null;
};

interface BranchResult { store: string; name: string; lat: number; lng: number; address: string; distanceKm: number; }

const MapScreen = ({ setScreen, darkMode, setDarkMode, alertCount, onAlertTap, targetStore, setTargetStore, selectedProduct }: { setScreen: (s: Screen) => void, darkMode: boolean, setDarkMode: (v: boolean) => void, alertCount?: number, onAlertTap?: () => void, targetStore: string | null, setTargetStore: (s: string | null) => void, selectedProduct: Product | null }) => {
  const { t } = useLanguage();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [nearbyBranches, setNearbyBranches] = useState<BranchResult[]>([]);
  const [routeMode, setRouteMode] = useState<'foot' | 'driving'>('foot');
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchResult | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        const params = new URLSearchParams({ lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) });
        if (targetStore) { params.set('store', targetStore); params.set('limit', '1'); }
        else { params.set('limit', '15'); }
        fetch(`/api/stores/branches?${params}`)
          .then(r => r.json())
          .then(data => { setNearbyBranches(data.branches || []); setLoading(false); })
          .catch(() => setLoading(false));
      },
      () => setLoading(false)
    );
  }, [targetStore]);

  useEffect(() => {
    if (targetStore && nearbyBranches.length > 0) setSelectedBranch(nearbyBranches[0]);
  }, [targetStore, nearbyBranches]);

  useEffect(() => {
    if (!coords || !selectedBranch) { setRouteCoords([]); setRouteInfo(null); return; }
    setRouteLoading(true);
    const profile = routeMode === 'foot' ? 'foot' : 'car';
    fetch(`https://router.project-osrm.org/route/v1/${profile}/${coords.lng},${coords.lat};${selectedBranch.lng},${selectedBranch.lat}?overview=full&geometries=geojson&alternatives=false`)
      .then(r => r.json())
      .then(data => {
        if (data.routes?.[0]) {
          setRouteCoords(data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]));
          setRouteInfo({ distance: data.routes[0].distance, duration: data.routes[0].duration });
        }
      })
      .catch(() => { setRouteCoords([]); setRouteInfo(null); })
      .finally(() => setRouteLoading(false));
  }, [coords, selectedBranch, routeMode]);

  useEffect(() => { return () => setTargetStore(null); }, []);

  const activeBranch = selectedBranch || nearbyBranches[0] || null;
  const formatDist = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} კმ` : `${Math.round(m)} მ`;
  const formatTime = (s: number) => s >= 3600 ? `${Math.floor(s / 3600)} სთ ${Math.round((s % 3600) / 60)} წთ` : `${Math.round(s / 60)} წთ`;

  return (
    <div className="h-screen relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="absolute top-12 left-5 right-5 z-20">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <button onClick={() => setScreen('home')} className="p-1.5 text-slate-900 dark:text-white">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">
              {targetStore ? `${t('map_title_closest')} ${targetStore}` : t('map_title_nearby')}
            </h2>
          </div>
          {!targetStore && nearbyBranches.length > 0 && (
            <span className="text-xs text-slate-400">{nearbyBranches.length} {t('map_branches_found')}</span>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative z-10">
        {loading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
          </div>
        )}
        <MapContainer
          center={coords ? [coords.lat, coords.lng] : [41.7151, 44.8271]}
          zoom={14}
          style={{ height: '100%', width: '100%', filter: darkMode ? 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)' : 'none' }}
          zoomControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {coords && (
            <>
              {selectedBranch ? <FitRouteBounds coords={coords} branch={selectedBranch} /> : <RecenterMap coords={coords} />}
              <Marker position={[coords.lat, coords.lng]} icon={createPulsingIcon('cobalt', t('map_you'))}>
                <Popup>{t('map_you_here')}</Popup>
              </Marker>
            </>
          )}
          {nearbyBranches.map((branch, idx) => (
            <Marker key={idx} position={[branch.lat, branch.lng]} icon={createPulsingIcon('emerald', branch.name)} eventHandlers={{ click: () => setSelectedBranch(branch) }}>
              <Popup><p className="font-medium text-xs">{branch.name}</p><p className="text-[10px] text-gray-500">{branch.address}</p></Popup>
            </Marker>
          ))}
          {coords && activeBranch && routeCoords.length > 0 && (
            <Polyline positions={routeCoords} pathOptions={{ color: routeMode === 'foot' ? '#10B981' : '#3B82F6', weight: routeMode === 'foot' ? 4 : 5, opacity: 0.8, dashArray: routeMode === 'foot' ? '8, 8' : undefined }} />
          )}
        </MapContainer>
      </div>

      {/* Bottom panel */}
      <div className="absolute bottom-24 left-3 right-3 lg:bottom-10 lg:left-1/2 lg:-translate-x-1/2 lg:w-[480px] pointer-events-none z-20">
        {activeBranch ? (
          <div className="bg-white text-slate-900 px-5 py-5 rounded-2xl border border-slate-200 shadow-xl pointer-events-auto">
            {/* Store info + distance */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[15px]">{activeBranch.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{activeBranch.address}</p>
              </div>
              {routeInfo && !routeLoading && (
                <div className="bg-[#108AB1]/10 rounded-xl px-3 py-2 text-center shrink-0">
                  <span className="text-base font-bold text-[#108AB1] block">{formatDist(routeInfo.distance)}</span>
                  <span className="text-[10px] text-[#108AB1]/70">{formatTime(routeInfo.duration)}</span>
                </div>
              )}
              {routeLoading && (
                <div className="w-6 h-6 border-2 border-slate-200 border-t-[#108AB1] rounded-full animate-spin shrink-0" />
              )}
            </div>

            {selectedBranch && (
              <div className="flex items-center gap-2.5 mt-3">
                {/* Route mode toggle */}
                <div className="flex bg-slate-100 rounded-xl p-0.5 shrink-0">
                  <button onClick={() => setRouteMode('foot')} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-semibold transition-all ${routeMode === 'foot' ? 'bg-white text-[#108AB1] shadow-sm' : 'text-slate-400'}`}>
                    <Footprints size={14} /> {t('map_route_foot')}
                  </button>
                  <button onClick={() => setRouteMode('driving')} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-semibold transition-all ${routeMode === 'driving' ? 'bg-white text-[#108AB1] shadow-sm' : 'text-slate-400'}`}>
                    <Car size={14} /> {t('map_route_car')}
                  </button>
                </div>
                {/* Navigate button */}
                <button onClick={() => { window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeBranch.lat},${activeBranch.lng}&travelmode=${routeMode === 'foot' ? 'walking' : 'driving'}`, '_blank'); }}
                  className="flex-1 bg-[#108AB1] text-white py-2.5 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform">
                  <Navigation size={14} /> ნავიგაცია
                </button>
                {/* Close */}
                <button onClick={() => { setSelectedBranch(null); setRouteCoords([]); setRouteInfo(null); }}
                  className="w-9 h-9 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center hover:text-slate-600 shrink-0">
                  <X size={15} />
                </button>
              </div>
            )}

            {!selectedBranch && (
              <button onClick={() => setSelectedBranch(activeBranch)}
                className="w-full mt-3 bg-[#108AB1] text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
                <Navigation size={16} /> {t('map_route_show')}
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 inline-block pointer-events-auto">
            <p className="text-xs text-slate-500">{t('map_select_store')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ProfileScreen = ({ setScreen, darkMode, setDarkMode, alertCount, onAlertTap }: { setScreen: (s: Screen) => void, darkMode: boolean, setDarkMode: (v: boolean) => void, alertCount?: number, onAlertTap?: () => void }) => {
  const { t, lang, setLang } = useLanguage();
  const [authUser, setAuthUser] = useState<{ id: number; email: string; name?: string } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'verify' | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authShowPassword, setAuthShowPassword] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [authShowTerms, setAuthShowTerms] = useState(false);
  const [authShowPrivacy, setAuthShowPrivacy] = useState(false);
  const [authTermsRead, setAuthTermsRead] = useState(false);
  const [authPrivacyRead, setAuthPrivacyRead] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Check if logged in & fetch Google Client ID
  useEffect(() => {
    const token = localStorage.getItem('pasebi-auth-token');
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => { if (data.user) setAuthUser(data.user); })
        .catch(() => {});
    }
    // Fetch Google Client ID for Sign-In button
    fetch('/api/auth/config')
      .then(r => r.json())
      .then(data => { if (data.googleClientId) (window as any).__GOOGLE_CLIENT_ID = data.googleClientId; })
      .catch(() => {});
  }, []);

  const handleRegister = async () => {
    setAuthError(''); setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword, name: authName }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error); return; }
      setAuthMode('verify');
    } catch { setAuthError('კავშირის შეცდომა'); }
    finally { setAuthLoading(false); }
  };

  const handleLogin = async () => {
    setAuthError(''); setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      const data = await res.json();
      if (data.needsVerification) { setAuthMode('verify'); setAuthError(''); return; }
      if (!res.ok) { setAuthError(data.error); return; }
      localStorage.setItem('pasebi-auth-token', data.token);
      setAuthUser(data.user);
      setAuthMode(null);
    } catch { setAuthError('კავშირის შეცდომა'); }
    finally { setAuthLoading(false); }
  };

  const handleVerify = async () => {
    setAuthError(''); setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, code: authCode }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error); return; }
      localStorage.setItem('pasebi-auth-token', data.token);
      setAuthUser(data.user);
      setAuthMode(null);
    } catch { setAuthError('კავშირის შეცდომა'); }
    finally { setAuthLoading(false); }
  };

  const handleGoogleSignIn = () => {
    const clientId = (window as any).__GOOGLE_CLIENT_ID;
    if (!clientId || !(window as any).google?.accounts?.id) {
      setAuthError('Google Sign-In არ არის ხელმისაწვდომი');
      return;
    }
    (window as any).google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        setAuthError(''); setAuthLoading(true);
        try {
          const res = await fetch('/api/auth/google', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential }),
          });
          const data = await res.json();
          if (!res.ok) { setAuthError(data.error); return; }
          localStorage.setItem('pasebi-auth-token', data.token);
          setAuthUser(data.user);
          setAuthMode(null);
        } catch { setAuthError('კავშირის შეცდომა'); }
        finally { setAuthLoading(false); }
      },
    });
    (window as any).google.accounts.id.prompt();
  };

  const handleLogout = () => {
    const token = localStorage.getItem('pasebi-auth-token');
    if (token) fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    localStorage.removeItem('pasebi-auth-token');
    setAuthUser(null);
  };

  return (
    <div className="pb-24 lg:pb-8 pt-4 lg:pt-3 px-5 md:px-8 lg:px-12 xl:px-16 min-h-screen">
      <div className="lg:hidden"><Header title={t('profile_title')} /></div>
      <div className="lg:max-w-lg lg:mx-auto">

      {/* User card */}
      <div className="flex items-center gap-4 mb-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold ${authUser ? 'bg-[#108AB1] text-white' : 'bg-slate-100 text-slate-400'}`}>
          {authUser ? (authUser.name || authUser.email)[0].toUpperCase() : <User size={28} />}
        </div>
        <div className="flex-1">
          {authUser ? (
            <>
              <h2 className="text-lg font-bold text-slate-900">{authUser.name || authUser.email.split('@')[0]}</h2>
              <p className="text-xs text-slate-400">{authUser.email}</p>
            </>
          ) : (
            <>
              <h2 className="text-base font-bold text-slate-900">სტუმარი</h2>
              <p className="text-xs text-slate-400">შედით ან დარეგისტრირდით</p>
            </>
          )}
        </div>
        {authUser ? (
          <button onClick={handleLogout} className="text-xs text-red-400 font-medium hover:text-red-600">გასვლა</button>
        ) : (
          <button onClick={() => setAuthMode('login')} className="px-4 py-2 bg-[#108AB1] text-white text-xs font-semibold rounded-lg hover:bg-[#0d7a9e] transition-colors">შესვლა</button>
        )}
      </div>

      {/* Auth Modal */}
      <AnimatePresence>
        {authMode && !authUser && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">

            {authMode === 'verify' ? (
              <>
                <h3 className="text-base font-bold text-slate-800 mb-1">ვერიფიკაცია</h3>
                <p className="text-xs text-slate-400 mb-4">კოდი გამოგზავნილია {authEmail}-ზე</p>
                <input value={authCode} onChange={e => setAuthCode(e.target.value)} placeholder="6-ნიშნა კოდი"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm mb-3 focus:ring-2 focus:ring-[#108AB1]/20 focus:border-[#108AB1]/30" />
                {authError && <p className="text-red-500 text-xs mb-3">{authError}</p>}
                <button onClick={handleVerify} disabled={authLoading}
                  className="w-full bg-[#108AB1] text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50">
                  {authLoading ? '...' : 'დადასტურება'}
                </button>
              </>
            ) : (
              <>
                <div className="flex gap-2 mb-5">
                  <button onClick={() => { setAuthMode('login'); setAuthError(''); }}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${authMode === 'login' ? 'bg-[#108AB1] text-white' : 'bg-slate-100 text-slate-500'}`}>
                    შესვლა
                  </button>
                  <button onClick={() => { setAuthMode('register'); setAuthError(''); }}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${authMode === 'register' ? 'bg-[#108AB1] text-white' : 'bg-slate-100 text-slate-500'}`}>
                    რეგისტრაცია
                  </button>
                </div>

                {authMode === 'register' && (
                  <input value={authName} onChange={e => setAuthName(e.target.value)} placeholder="სახელი (არასავალდებულო)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm mb-3 focus:ring-2 focus:ring-[#108AB1]/20 focus:border-[#108AB1]/30" />
                )}
                <input value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="Email" type="email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm mb-3 focus:ring-2 focus:ring-[#108AB1]/20 focus:border-[#108AB1]/30" />
                <div className="relative mb-3">
                  <input value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="პაროლი" type={authShowPassword ? 'text' : 'password'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pr-11 text-sm focus:ring-2 focus:ring-[#108AB1]/20 focus:border-[#108AB1]/30" />
                  <button type="button" onClick={() => setAuthShowPassword(!authShowPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                    {authShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {authMode === 'register' && authPassword && (
                  <div className="mb-3">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4].map(i => {
                        const strength = authPassword.length >= 8 && /[A-Z]/.test(authPassword) && /[0-9]/.test(authPassword) && /[^A-Za-z0-9]/.test(authPassword) ? 4
                          : authPassword.length >= 8 && /[A-Z]/.test(authPassword) && /[0-9]/.test(authPassword) ? 3
                          : authPassword.length >= 6 ? 2 : 1;
                        const colors = ['bg-red-400','bg-orange-400','bg-yellow-400','bg-green-500'];
                        return <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? colors[strength-1] : 'bg-slate-200'}`} />;
                      })}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {authPassword.length < 6 ? 'სუსტი — მინიმუმ 6 სიმბოლო' : authPassword.length < 8 ? 'საშუალო' : /[A-Z]/.test(authPassword) && /[0-9]/.test(authPassword) ? 'ძლიერი' : 'საშუალო — დაამატეთ ციფრი და დიდი ასო'}
                    </p>
                  </div>
                )}

                {authMode === 'register' && (
                  <div className="relative mb-3">
                    <input value={authConfirmPassword} onChange={e => setAuthConfirmPassword(e.target.value)} placeholder="გაიმეორეთ პაროლი" type={authShowPassword ? 'text' : 'password'}
                      className={`w-full bg-slate-50 border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-[#108AB1]/20 focus:border-[#108AB1]/30 ${authConfirmPassword && authConfirmPassword !== authPassword ? 'border-red-300' : 'border-slate-200'}`} />
                    {authConfirmPassword && authConfirmPassword === authPassword && (
                      <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                    )}
                    {authConfirmPassword && authConfirmPassword !== authPassword && (
                      <p className="text-red-500 text-[10px] mt-1">პაროლები არ ემთხვევა</p>
                    )}
                  </div>
                )}

                {authMode === 'register' && (<>
                  <label className="flex items-start gap-2 mb-3 cursor-pointer">
                    <input type="checkbox" id="age-confirm" className="mt-1 w-4 h-4 rounded border-slate-300 text-[#108AB1] focus:ring-[#108AB1]" />
                    <span className="text-[11px] text-slate-500 leading-relaxed">
                      ვადასტურებ რომ 16 წელს გადავცილდი და ვეთანხმები{' '}
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAuthShowTerms(true); setAuthTermsRead(false); }} className="text-[#108AB1] underline font-medium">მომსახურების პირობებს</button>
                      {' '}და{' '}
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAuthShowPrivacy(true); setAuthPrivacyRead(false); }} className="text-[#108AB1] underline font-medium">კონფიდენციალურობის პოლიტიკას</button>
                    </span>
                  </label>

                  {/* Terms popup with scroll-to-read */}
                  {authShowTerms && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                      <div className="relative bg-white rounded-2xl max-w-[92vw] sm:max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-slate-100">
                          <h3 className="text-base font-bold text-slate-800">მომსახურების პირობები</h3>
                        </div>
                        <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1 text-sm text-slate-600 space-y-3 leading-relaxed"
                          onScroll={(e) => {
                            const el = e.currentTarget;
                            if (el.scrollHeight - el.scrollTop - el.clientHeight < 30) setAuthTermsRead(true);
                          }}>
                          <p>გამიგე არის ფასების შედარების პლატფორმა.</p>
                          <p>სერვისით სარგებლობით თქვენ ეთანხმებით შემდეგ პირობებს:</p>
                          <p>• ფასები ინფორმაციული ხასიათისაა და შეიძლება განსხვავდებოდეს მაღაზიაში არსებული ფასებისგან.</p>
                          <p>• მომხმარებელმა თავად უნდა გადაამოწმოს საბოლოო ფასი შეძენისას.</p>
                          <p>• ფასები განახლდება ავტომატურად, ყოველ საათში.</p>
                          <p>• პლატფორმა არ არის პასუხისმგებელი ფასების ცვლილებაზე, რომელიც მოხდა ბოლო განახლების შემდეგ.</p>
                          <p>• პროდუქტების ანალიზი მოწოდებულია ხელოვნური ინტელექტის მეშვეობით და არ წარმოადგენს სამედიცინო რჩევას.</p>
                          <p>• რეგისტრაციისთვის საჭიროა მინიმუმ 16 წლის ასაკი.</p>
                          <p>• მომხმარებელი ვალდებულია მიუთითოს სწორი ელ-ფოსტის მისამართი.</p>
                          <p>• აკრძალულია სერვისის ავტომატური (ბოტით) გამოყენება.</p>
                          <p>• სერვისი მოწოდებულია „როგორც არის" პრინციპით, გარანტიების გარეშე.</p>
                          <p>• პლატფორმა არ არის მაღაზია და არ ყიდის პროდუქტებს.</p>
                          <p>• ჩვენ ვიტოვებთ უფლებას შევცვალოთ ეს პირობები წინასწარი შეტყობინებით.</p>
                          <p>• ეს პირობები რეგულირდება საქართველოს კანონმდებლობით.</p>
                        </div>
                        <div className="px-4 sm:px-6 py-3 border-t border-slate-100">
                          {!authTermsRead && <p className="text-[10px] text-amber-500 text-center mb-2">ჩამოსქროლეთ ბოლომდე წასაკითხად</p>}
                          <button onClick={() => setAuthShowTerms(false)} disabled={!authTermsRead}
                            className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${authTermsRead ? 'bg-[#108AB1] text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                            {authTermsRead ? 'წავიკითხე, ვეთანხმები' : 'ჩამოსქროლეთ ბოლომდე...'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Privacy popup with scroll-to-read */}
                  {authShowPrivacy && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                      <div className="relative bg-white rounded-2xl max-w-[92vw] sm:max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-slate-100">
                          <h3 className="text-base font-bold text-slate-800">კონფიდენციალურობის პოლიტიკა</h3>
                        </div>
                        <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1 text-sm text-slate-600 space-y-3 leading-relaxed"
                          onScroll={(e) => {
                            const el = e.currentTarget;
                            if (el.scrollHeight - el.scrollTop - el.clientHeight < 30) setAuthPrivacyRead(true);
                          }}>
                          <p>გამიგე პატივს სცემს თქვენს კონფიდენციალურობას და იცავს თქვენს პერსონალურ მონაცემებს.</p>
                          <p><strong>რა მონაცემებს ვაგროვებთ:</strong></p>
                          <p>• ელექტრონული ფოსტის მისამართი (email)</p>
                          <p>• სახელი (არასავალდებულო)</p>
                          <p>• პაროლი (დაშიფრული სახით)</p>
                          <p>• საძიებო მოთხოვნები (ანონიმური სტატისტიკისთვის)</p>
                          <p>• კალათაში დამატებული პროდუქტები</p>
                          <p>• ფასების შეტყობინებები</p>
                          <p><strong>როგორ ვიყენებთ:</strong></p>
                          <p>• ანგარიშის შექმნა და ავტორიზაცია</p>
                          <p>• ფასების შეტყობინებების გაგზავნა</p>
                          <p>• სერვისის გაუმჯობესება</p>
                          <p><strong>მონაცემების გაზიარება:</strong></p>
                          <p>• ჩვენ არ ვყიდით და არ გადავცემთ თქვენს პერსონალურ მონაცემებს მესამე მხარეებს.</p>
                          <p>• მონაცემები ინახება დაცულ სერვერზე.</p>
                          <p>• პაროლები ინახება დაშიფრული სახით.</p>
                          <p><strong>თქვენი უფლებები:</strong></p>
                          <p>• ანგარიშის და ყველა მონაცემის წაშლა ნებისმიერ დროს</p>
                          <p>• პერსონალური მონაცემების კორექცია</p>
                          <p>• შეტყობინებების მიღების შეწყვეტა</p>
                          <p>• საიტი იყენებს localStorage-ს სესიისა და პარამეტრების შესანახად.</p>
                          <p>• სერვისით სარგებლობა დაშვებულია 16 წლის და უფროსი ასაკის პირებისთვის.</p>
                        </div>
                        <div className="px-4 sm:px-6 py-3 border-t border-slate-100">
                          {!authPrivacyRead && <p className="text-[10px] text-amber-500 text-center mb-2">ჩამოსქროლეთ ბოლომდე წასაკითხად</p>}
                          <button onClick={() => setAuthShowPrivacy(false)} disabled={!authPrivacyRead}
                            className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${authPrivacyRead ? 'bg-[#108AB1] text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                            {authPrivacyRead ? 'წავიკითხე, ვეთანხმები' : 'ჩამოსქროლეთ ბოლომდე...'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>)}

                {authError && <p className="text-red-500 text-xs mb-3">{authError}</p>}

                <button onClick={() => {
                  if (authMode === 'register') {
                    if (authPassword.length < 6) { setAuthError('პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს'); return; }
                    if (authPassword !== authConfirmPassword) { setAuthError('პაროლები არ ემთხვევა'); return; }
                    const checkbox = document.getElementById('age-confirm') as HTMLInputElement;
                    if (!checkbox?.checked) { setAuthError('გთხოვთ დაადასტუროთ ასაკი და პირობები'); return; }
                  }
                  (authMode === 'login' ? handleLogin : handleRegister)();
                }} disabled={authLoading}
                  className="w-full bg-[#108AB1] text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 mb-3">
                  {authLoading ? '...' : authMode === 'login' ? 'შესვლა' : 'რეგისტრაცია'}
                </button>

                {/* Google Sign-In divider + button */}
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400">ან</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <button onClick={handleGoogleSignIn} disabled={authLoading}
                  className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 py-3 rounded-xl font-medium text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 mb-3 shadow-sm">
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google-ით შესვლა
                </button>

                <button onClick={() => setAuthMode(null)} className="w-full text-xs text-slate-400 py-2">გაუქმება</button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Why Register — only shown when not logged in */}
      {!authUser && !authMode && (
        <>
          {/* Stats banner */}
          <div className="mb-4 bg-gradient-to-r from-[#108AB1] to-[#0d7a9e] rounded-2xl p-5 text-white">
            <div className="flex items-center justify-around text-center">
              <div>
                <p className="text-2xl font-bold">7</p>
                <p className="text-[11px] opacity-80">{lang === 'ka' ? 'მაღაზია' : 'Stores'}</p>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div>
                <p className="text-2xl font-bold">15K+</p>
                <p className="text-[11px] opacity-80">{lang === 'ka' ? 'პროდუქტი' : 'Products'}</p>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div>
                <p className="text-2xl font-bold">0₾</p>
                <p className="text-[11px] opacity-80">{lang === 'ka' ? 'უფასოდ' : 'Free'}</p>
              </div>
            </div>
          </div>

          {/* Features list */}
          <div className="mb-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">{lang === 'ka' ? 'რატომ გამიგე?' : 'Why Gamige?'}</h3>
            <div className="space-y-3">
              {[
                { icon: TrendingDown, color: 'text-green-500 bg-green-50', text: lang === 'ka' ? 'შეადარე ფასები 7 მაღაზიაში ერთდროულად' : 'Compare prices across 7 stores at once' },
                { icon: Bell, color: 'text-blue-500 bg-blue-50', text: lang === 'ka' ? 'მიიღე შეტყობინება როცა ფასი დაეცემა' : 'Get notified when prices drop' },
                { icon: ScanLine, color: 'text-purple-500 bg-purple-50', text: lang === 'ka' ? 'დაასკანერე ბარკოდი და იპოვე იაფი ფასი' : 'Scan barcode to find cheapest price' },
                { icon: BarChart3, color: 'text-orange-500 bg-orange-50', text: lang === 'ka' ? 'ნახე ფასების ისტორია და ტრენდი' : 'View price history and trends' },
                { icon: Zap, color: 'text-amber-500 bg-amber-50', text: lang === 'ka' ? 'AI ანალიზი — შეაფასე პროდუქტის ხარისხი' : 'AI analysis — rate product quality' },
                { icon: ShoppingBasket, color: 'text-teal-500 bg-teal-50', text: lang === 'ka' ? 'შეადარე კალათა — სად ჯობია ყიდვა' : 'Compare baskets — where to buy cheaper' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color.split(' ')[1]}`}>
                    <item.icon size={18} className={item.color.split(' ')[0]} />
                  </div>
                  <p className="text-[13px] text-slate-600 leading-snug">{item.text}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setAuthMode('register')}
              className="w-full mt-5 bg-[#108AB1] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#0d7a9e] transition-colors">
              {lang === 'ka' ? 'დარეგისტრირდი უფასოდ' : 'Register for Free'}
            </button>
          </div>
        </>
      )}

      {/* Language Selection */}
      <div className="mb-2 w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Globe size={18} className="text-slate-400" />
          <span className="font-medium text-slate-900 dark:text-white text-sm">{t('profile_language')}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setLang('ka')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${lang === 'ka' ? 'bg-[#108AB1] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300'}`}>
            ქარ
          </button>
          <button onClick={() => setLang('en')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${lang === 'en' ? 'bg-[#108AB1] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300'}`}>
            Eng
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {[
          { label: t('profile_alerts'), icon: Bell, id: 'alerts' },
          { label: t('profile_my_basket'), icon: ShoppingBasket, id: 'basket' },
        ].map((item, idx) => (
          <button key={idx} onClick={() => setScreen(item.id as Screen)}
            className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <div className="flex items-center gap-3">
              <item.icon size={18} className="text-slate-400" />
              <span className="font-medium text-slate-900 dark:text-white text-sm">{item.label}</span>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </button>
        ))}
      </div>

      {/* Legal & Account */}
      <div className="mt-4 space-y-2">
        <button onClick={() => setShowPrivacy(true)}
          className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <div className="flex items-center gap-3">
            <Shield size={18} className="text-slate-400" />
            <span className="font-medium text-slate-900 dark:text-white text-sm">{lang === 'ka' ? 'კონფიდენციალურობა' : 'Privacy Policy'}</span>
          </div>
          <ChevronRight size={16} className="text-slate-300" />
        </button>
        <button onClick={() => setShowTerms(true)}
          className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-slate-400" />
            <span className="font-medium text-slate-900 dark:text-white text-sm">{lang === 'ka' ? 'მომსახურების პირობები' : 'Terms of Service'}</span>
          </div>
          <ChevronRight size={16} className="text-slate-300" />
        </button>
        {authUser?.email === 'dzikiii.j@gmail.com' && (
          <button onClick={() => setScreen('admin')}
            className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <div className="flex items-center gap-3">
              <Settings size={18} className="text-slate-400" />
              <span className="font-medium text-slate-900 dark:text-white text-sm">Admin Panel</span>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </button>
        )}
        {authUser && (
          <button onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
            <div className="flex items-center gap-3">
              <Trash2 size={18} className="text-red-400" />
              <span className="font-medium text-red-500 text-sm">{lang === 'ka' ? 'ანგარიშის წაშლა' : 'Delete Account'}</span>
            </div>
            <ChevronRight size={16} className="text-red-300" />
          </button>
        )}
      </div>

      {/* Contact & Feedback */}
      <div className="mt-4 mb-2">
        <button onClick={() => window.location.href = 'mailto:support@gamige.com?subject=Feedback'}
          className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <Mail size={18} className="text-slate-400" />
            <span className="font-medium text-slate-900 dark:text-white text-sm">{lang === 'ka' ? 'დაგვიკავშირდით' : 'Contact Us'}</span>
          </div>
          <ChevronRight size={16} className="text-slate-300" />
        </button>
      </div>

      {/* Social Links */}
      <div className="mt-2 mb-2 flex items-center justify-center gap-4">
        <a href="https://www.facebook.com/gamige.com" target="_blank" rel="noopener noreferrer"
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-blue-50 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        </a>
        <a href="https://www.instagram.com/gamige.com" target="_blank" rel="noopener noreferrer"
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-pink-50 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#E4405F"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
        </a>
        <a href="https://t.me/gamige" target="_blank" rel="noopener noreferrer"
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-sky-50 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#0088cc"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
        </a>
      </div>

      {/* App rating */}
      <div className="mt-2 mb-4 text-center">
        <div className="flex items-center justify-center gap-1 mb-1">
          {[1,2,3,4,5].map(i => <Star key={i} size={16} className="text-amber-400 fill-amber-400" />)}
        </div>
        <p className="text-[11px] text-slate-400">{lang === 'ka' ? 'მოგწონს აპი? შეგვაფასე!' : 'Like the app? Rate us!'}</p>
      </div>

      <div className="text-center">
        <p className="text-[10px] text-slate-300">GAMIGE v1.0 beta</p>
        <p className="text-[10px] text-slate-300 mt-0.5">&copy; 2026</p>
      </div>

      {/* Privacy Modal */}
      <AnimatePresence>
        {showPrivacy && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowPrivacy(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl p-4 sm:p-6 max-w-[92vw] sm:max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">{lang === 'ka' ? 'კონფიდენციალურობის პოლიტიკა' : 'Privacy Policy'}</h3>
                <button onClick={() => setShowPrivacy(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
              </div>
              <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
                <p>{lang === 'ka' ? 'გამიგე (gamige.com) პატივს სცემს თქვენს კონფიდენციალურობას.' : 'Gamige (gamige.com) respects your privacy.'}</p>
                <p>{lang === 'ka' ? 'ჩვენ ვაგროვებთ მხოლოდ იმ მონაცემებს, რაც საჭიროა სერვისის მუშაობისთვის: email მისამართი, კალათის მონაცემები და ფასების შეტყობინებები.' : 'We only collect data necessary for the service: email address, basket data, and price alerts.'}</p>
                <p>{lang === 'ka' ? 'თქვენი მონაცემები არ გადაეცემა მესამე მხარეს. ფასების ინფორმაცია საჯაროდ ხელმისაწვდომი წყაროებიდან გროვდება.' : 'Your data is not shared with third parties. Price information is collected from publicly available sources.'}</p>
                <p>{lang === 'ka' ? 'თქვენ შეგიძლიათ ნებისმიერ დროს წაშალოთ თქვენი ანგარიში და ყველა დაკავშირებული მონაცემი.' : 'You can delete your account and all associated data at any time.'}</p>
                <p>{lang === 'ka' ? 'საიტი იყენებს localStorage-ს სესიისა და პარამეტრების შესანახად.' : 'The site uses localStorage to save session and preferences.'}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Terms Modal */}
      <AnimatePresence>
        {showTerms && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowTerms(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl p-4 sm:p-6 max-w-[92vw] sm:max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">{lang === 'ka' ? 'მომსახურების პირობები' : 'Terms of Service'}</h3>
                <button onClick={() => setShowTerms(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
              </div>
              <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
                <p>{lang === 'ka' ? 'გამიგე (gamige.com) არის ფასების შედარების პლატფორმა.' : 'Gamige (gamige.com) is a price comparison platform.'}</p>
                <p>{lang === 'ka' ? 'სერვისით სარგებლობით თქვენ ეთანხმებით შემდეგ პირობებს:' : 'By using the service you agree to the following terms:'}</p>
                <p>{lang === 'ka' ? '• ფასები ინფორმაციული ხასიათისაა და შეიძლება განსხვავდებოდეს მაღაზიაში არსებული ფასებისგან.' : '• Prices are informational and may differ from in-store prices.'}</p>
                <p>{lang === 'ka' ? '• მომხმარებელმა თავად უნდა გადაამოწმოს საბოლოო ფასი შეძენისას.' : '• Users should verify the final price at the time of purchase.'}</p>
                <p>{lang === 'ka' ? '• სერვისი მოწოდებულია "როგორც არის" პრინციპით, გარანტიების გარეშე.' : '• The service is provided "as is" without warranties.'}</p>
                <p>{lang === 'ka' ? '• რეგისტრაციისთვის საჭიროა მინიმუმ 16 წლის ასაკი.' : '• You must be at least 16 years old to register.'}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Account Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center px-5">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">{lang === 'ka' ? 'ანგარიშის წაშლა' : 'Delete Account'}</h3>
              <p className="text-sm text-slate-400 mb-5">{lang === 'ka' ? 'ნამდვილად გინდათ ანგარიშის წაშლა? ეს მოქმედება შეუქცევადია.' : 'Are you sure you want to delete your account? This action is irreversible.'}</p>
              <button
                onClick={async () => {
                  const token = localStorage.getItem('pasebi-auth-token');
                  if (!token) return;
                  try {
                    const res = await fetch('/api/auth/me', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                    if (res.ok) {
                      localStorage.removeItem('pasebi-auth-token');
                      localStorage.removeItem('pasebi-basket');
                      localStorage.removeItem('pasebi-favorites');
                      localStorage.removeItem('pasebi-device-id');
                      setAuthUser(null);
                      setShowDeleteConfirm(false);
                    }
                  } catch {}
                }}
                className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold text-sm mb-2 active:scale-[0.98] transition-transform hover:bg-red-600">
                {lang === 'ka' ? 'დიახ, წაშალე' : 'Yes, Delete'}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)}
                className="w-full text-slate-400 text-xs py-2">
                {lang === 'ka' ? 'გაუქმება' : 'Cancel'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>{/* end lg:max-w-lg */}
    </div>
  );
};

const BasketScreen = ({ setScreen, darkMode, setDarkMode, alertCount, onAlertTap, basket, setBasket, setTargetStore }: { setScreen: (s: Screen) => void, darkMode: boolean, setDarkMode: (v: boolean) => void, alertCount?: number, onAlertTap?: () => void, basket: Product[], setBasket: React.Dispatch<React.SetStateAction<Product[]>>, setTargetStore: (s: string | null) => void }) => {
  const { t } = useLanguage();
  const [viewStore, setViewStore] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const generateQR = async () => {
    const ids = basket.map(item => item.id).join(',');
    const url = `${window.location.origin}?basket=${ids}`;
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 256, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } });
      setQrImage(dataUrl);
      setShowQR(true);
    } catch { /* ignore */ }
  };

  const storeSet = new Set<string>();
  for (const item of basket) {
    for (const store of Object.keys(item.prices)) {
      if (item.prices[store] > 0) storeSet.add(store);
    }
  }

  const calculateTotal = (store: string) => basket.reduce((sum, item) => sum + (item.prices[store] || 0), 0);
  const calculateFullCost = (store: string) => {
    let cost = 0;
    for (const item of basket) {
      if (item.prices[store] > 0) { cost += item.prices[store]; }
      else {
        const alt = Object.entries(item.prices).filter(([s, p]) => s !== store && p > 0).sort((a, b) => a[1] - b[1])[0];
        if (alt) cost += alt[1];
      }
    }
    return cost;
  };

  const storeTotals = Array.from(storeSet).map(store => ({
    store, total: calculateTotal(store), fullCost: calculateFullCost(store),
    hasAll: basket.every(item => item.prices[store] > 0),
    availableCount: basket.filter(item => item.prices[store] > 0).length,
  })).sort((a, b) => a.fullCost - b.fullCost);

  const bestStore = storeTotals[0];
  const activeStore = viewStore || bestStore?.store || '';
  const activeStoreData = storeTotals.find(s => s.store === activeStore) || bestStore;

  return (
    <div className="pb-24 lg:pb-8 pt-4 lg:pt-3 px-5 md:px-8 lg:px-12 xl:px-16 min-h-screen" style={{ overflow: 'visible' }}>
      <div className="lg:hidden">
        <Header title={t('basket_title')} />
      </div>
      <div className="lg:max-w-6xl lg:mx-auto">

      {basket.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBasket size={36} className="text-slate-200 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-slate-900 dark:text-white font-semibold">{t('basket_empty')}</p>
          <p className="text-slate-400 text-xs mt-1">{t('basket_empty_desc')}</p>
          <button onClick={() => setScreen('home')}
            className="mt-5 bg-[#108AB1] text-white px-5 py-2.5 rounded-xl font-medium text-xs">
            {t('basket_add_products')}
          </button>
        </div>
      ) : (
        <React.Fragment>
          {/* Desktop: title + item count */}
          <div className="hidden lg:flex lg:items-baseline lg:justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">{t('basket_title')}</h2>
            <span className="text-sm text-slate-400">{basket.length} ნივთი</span>
          </div>

          {/* Store tabs */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-slate-400 mb-2">{t('basket_select_store')}</h3>
            <div className="space-y-2 lg:flex lg:gap-2.5 lg:space-y-0 lg:overflow-x-auto no-scrollbar">
            {storeTotals.map((item, idx) => (
              <button key={item.store} onClick={() => setViewStore(item.store)}
                className={`w-full lg:w-auto lg:shrink-0 px-4 py-3 rounded-xl transition-all flex items-center gap-3 border ${
                  item.store === activeStore
                    ? 'bg-[#108AB1]/5 border-[#108AB1]/30 shadow-sm'
                    : 'bg-white border-slate-100 hover:border-slate-200'
                }`}>
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-50 shrink-0">
                  <SmartImage filename={STORE_CONFIG[item.store]?.filename || ''} alt={item.store}
                    className="w-full h-full object-contain p-0.5" fallbackLetter={STORE_CONFIG[item.store]?.letter}
                    fallbackColor={STORE_CONFIG[item.store]?.color} isLogo storeName={item.store} />
                </div>
                <div className="text-left whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">{item.store}</span>
                    <span className="font-bold text-sm text-slate-900">{item.total.toFixed(2)}₾</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] ${item.hasAll ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {item.availableCount}/{basket.length} {t('basket_in_stock')}
                    </span>
                    {idx === 0 ? (
                      <span className="text-[10px] text-emerald-500 font-medium">{t('basket_best_choice')}</span>
                    ) : (
                      <span className="text-[10px] text-slate-400">+{(item.fullCost - storeTotals[0].fullCost).toFixed(2)}₾</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
            </div>
          </div>

          {/* Section header */}
          <h3 className="text-xs font-semibold text-slate-400 mb-3">{activeStore}-ში</h3>

          {/* Desktop: Products left + Summary right */}
          <div className="lg:flex lg:gap-8 lg:items-start">

          {/* Products column */}
          <div className="mb-6 lg:mb-0 lg:flex-1 lg:min-w-0">
            <div className="space-y-3">
            {basket.map((item) => {
              const price = item.prices[activeStore];
              const available = price > 0;
              const altStore = !available
                ? Object.entries(item.prices)
                    .filter(([s, p]) => s !== activeStore && p > 0)
                    .sort((a, b) => a[1] - b[1])[0] || null
                : null;
              return (
                <div key={item.id} className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${available ? 'bg-white border-slate-200 shadow-sm hover:shadow-md' : 'bg-red-50/50 border-red-200/60'}`}>
                  <div className="w-20 h-20 lg:w-24 lg:h-24 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                    <SmartImage filename="" imageUrl={item.image} alt={item.name}
                      className="w-full h-full object-contain p-2" fallbackLetter={item.name[0]} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-[13px] leading-tight line-clamp-2 ${available ? 'text-slate-800' : 'text-slate-400'}`}>{item.name}</h4>
                    {item.size && <p className="text-[11px] text-slate-400 mt-0.5">{item.size}</p>}
                    {!available && altStore && (
                      <p className="text-[10px] text-amber-500 mt-0.5">{altStore[0]}-ში {(altStore[1] as number).toFixed(2)}₾</p>
                    )}
                  </div>
                  <span className={`font-bold flex-shrink-0 ${available ? 'text-slate-900 text-base' : 'text-red-400 text-xs'}`}>
                    {available ? `${price.toFixed(2)}₾` : t('basket_not_available')}
                  </span>
                  <button onClick={() => setBasket(basket.filter(p => p.id !== item.id))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-slate-400 hover:text-white hover:bg-red-500 transition-all">
                    <X size={15} strokeWidth={2} />
                  </button>
                </div>
              );
            })}
            </div>{/* end space-y-3 */}
          </div>

          {/* Summary — sticky on desktop, below on mobile */}
          <div className="lg:w-80 lg:shrink-0">
            <div className="lg:sticky lg:top-[4.5rem]">
              <div className="bg-gradient-to-br from-[#108AB1] to-[#073A4B] rounded-2xl p-4 lg:p-6 text-white shadow-xl">
                <div className="flex items-center justify-between mb-3 lg:mb-5">
                  <div>
                    <span className="text-[10px] lg:text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                      {activeStore === bestStore?.store ? t('basket_best_option') : t('basket_selected')}
                    </span>
                    <h4 className="text-lg lg:text-xl font-bold">{activeStore}</h4>
                  </div>
                  <div className="bg-white/10 rounded-xl px-4 py-2 lg:px-5 lg:py-3">
                    <span className="text-[10px] text-slate-400">{t('basket_total')}</span>
                    <p className="text-xl lg:text-3xl font-bold">{activeStoreData?.total.toFixed(2)}₾</p>
                  </div>
                </div>
                {activeStoreData && !activeStoreData.hasAll && (
                  <p className="text-[10px] text-amber-400 mb-2">{basket.length - activeStoreData.availableCount} {t('basket_unavailable')}</p>
                )}
                <button onClick={() => { setTargetStore(activeStore); setScreen('map'); }}
                  className="w-full bg-white text-slate-900 py-3 lg:py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform hover:bg-slate-100 mb-2 lg:mb-3">
                  <Navigation size={16} />
                  {t('basket_show_direction')}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowShareMenu(true)}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2.5 lg:py-3 rounded-xl font-medium text-[12px] lg:text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                  >
                    <Share2 size={14} />
                    {t('basket_share')}
                  </button>
                  <button
                    onClick={generateQR}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2.5 lg:py-3 rounded-xl font-medium text-[12px] lg:text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="8" height="8" rx="1" /><rect x="14" y="2" width="8" height="8" rx="1" /><rect x="2" y="14" width="8" height="8" rx="1" />
                      <path d="M14 14h2v2h-2zM20 14h2v2h-2zM14 20h2v2h-2zM20 20h2v2h-2zM17 17h2v2h-2z" />
                    </svg>
                    QR
                  </button>
                </div>
              </div>
            </div>
          </div>{/* end lg:w-80 */}
          </div>{/* end lg:flex */}
        </React.Fragment>
      )}
      </div>{/* end lg:max-w-6xl */}

      {/* Share Modal */}
      <AnimatePresence>
        {showShareMenu && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-4 pb-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowShareMenu(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
              className="relative z-10 bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-800">{t('basket_share')}</h3>
                <button onClick={() => setShowShareMenu(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {(() => {
                  const lines = basket.map(item => {
                    const price = item.prices[activeStore];
                    return `${item.name}${item.size ? ' ' + item.size : ''} — ${price > 0 ? price.toFixed(2) + '₾' : t('basket_not_available')}`;
                  });
                  const text = `${t('basket_shopping_list')} (${activeStore})\n\n${lines.join('\n')}\n\n${t('basket_total')}: ${activeStoreData?.total.toFixed(2)}₾\n\n— GAMIGE`;
                  const encoded = encodeURIComponent(text);
                  const url = encodeURIComponent(window.location.href);
                  const shareOptions = [
                    { name: 'Telegram', color: 'bg-[#0088cc]', icon: '✈️', href: `https://t.me/share/url?url=${url}&text=${encoded}` },
                    { name: 'WhatsApp', color: 'bg-[#25D366]', icon: '💬', href: `https://wa.me/?text=${encoded}` },
                    { name: 'Viber', color: 'bg-[#7360F2]', icon: '📱', href: `viber://forward?text=${encoded}` },
                    { name: 'Messenger', color: 'bg-[#0084FF]', icon: '💭', href: `fb-messenger://share/?link=${url}` },
                    { name: 'Instagram', color: 'bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]', icon: '📷', href: `https://www.instagram.com/` },
                    { name: 'Email', color: 'bg-[#EA4335]', icon: '✉️', href: `mailto:?subject=${encodeURIComponent(t('basket_shopping_list'))}&body=${encoded}` },
                    { name: 'ლინკი', color: 'bg-slate-700', icon: '🔗', href: '#copy' },
                  ];
                  return shareOptions.map(opt => (
                    <button
                      key={opt.name}
                      onClick={() => {
                        if (opt.href === '#copy') {
                          navigator.clipboard.writeText(text).then(() => { alert(t('basket_list_copied')); });
                        } else {
                          window.open(opt.href, '_blank');
                        }
                        setShowShareMenu(false);
                      }}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div className={`w-12 h-12 ${opt.color} rounded-full flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform`}>
                        {opt.icon}
                      </div>
                      <span className="text-[10px] font-medium text-slate-500">{opt.name}</span>
                    </button>
                  ));
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQR && qrImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQR(false)}
              onKeyDown={(e) => { if (e.key === 'Escape') setShowQR(false); }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-xs"
            >
              <button onClick={() => setShowQR(false)} className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 text-center">{t('basket_qr_title')}</h3>
              <p className="text-xs text-slate-400 text-center mb-5">{t('basket_qr_desc')}</p>
              <div className="flex justify-center mb-5">
                <img src={qrImage} alt="QR Code" className="w-48 h-48 rounded-xl" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const ids = basket.map(item => item.id).join(',');
                    const url = `${window.location.origin}?basket=${ids}`;
                    navigator.clipboard.writeText(url).then(() => alert(t('basket_link_copied')));
                  }}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-medium text-sm active:scale-[0.98] transition-transform"
                >
                  {t('basket_copy_link')}
                </button>
                <button
                  onClick={() => {
                    const ids = basket.map(item => item.id).join(',');
                    const url = `${window.location.origin}?basket=${ids}`;
                    if (navigator.share) {
                      navigator.share({ title: 'GAMIGE კალათა', url }).catch(() => {});
                    }
                  }}
                  className="flex-1 bg-[#108AB1] text-white py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
                >
                  {t('basket_share')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AlertsScreen = ({ setScreen, darkMode, setDarkMode, alertCount, onAlertTap }: { setScreen: (s: Screen) => void, darkMode: boolean, setDarkMode: (v: boolean) => void, alertCount?: number, onAlertTap?: () => void }) => {
  const { t } = useLanguage();
  return (
  <div className="pb-24 lg:pb-8 pt-4 px-5 md:px-8 lg:px-12 xl:px-16 min-h-screen">
    <Header title={t('alerts_title')} showBack onBack={() => setScreen('profile')} alertCount={alertCount} onAlertTap={onAlertTap} />
    <div className="space-y-6">
      <section>
        <h3 className="text-xs font-semibold text-slate-400 mb-3">{t('alerts_active')}</h3>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <Bell size={18} className="text-slate-400 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">ლუდი ყაზბეგი</h4>
            <p className="text-[10px] text-slate-400">{t('alerts_target')} 2.20₾</p>
          </div>
          <button className="text-[10px] font-medium text-red-400">{t('alerts_delete')}</button>
        </div>
      </section>
      <section>
        <h3 className="text-xs font-semibold text-slate-400 mb-3">{t('alerts_history')}</h3>
        <div className="space-y-2">
          {[
            { title: t('alerts_price_drop'), desc: 'ლუდი ყაზბეგი ახლა 2.40₾ ღირს 2 ნაბიჯში', time: '10 წთ წინ', type: 'price' },
            { title: t('alerts_new_promo'), desc: 'SPAR-ში დაიწყო კვირეული, -20% ქეშბექი', time: '1 სთ წინ', type: 'promo' },
          ].map((alert, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex gap-3">
              <TrendingDown size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{alert.title}</h4>
                  <span className="text-[10px] text-slate-400">{alert.time}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{alert.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  </div>
  );
};

// --- Chat Screen ---
const ChatScreen = ({ setScreen, darkMode, setDarkMode, alertCount, onAlertTap, basket, setBasket, setSelectedProduct }: {
  setScreen: (s: Screen) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  alertCount?: number;
  onAlertTap?: () => void;
  basket: Product[];
  setBasket: React.Dispatch<React.SetStateAction<Product[]>>;
  setSelectedProduct: (p: Product) => void;
}) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: t('chat_welcome'),
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string, image?: string) => {
    if (!text.trim() && !image) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text.trim() || t('chat_image_search'),
      timestamp: Date.now(),
      image,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      let response;
      if (image) {
        // Image search
        const res = await fetch('/api/ai/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image }),
        });
        response = await res.json();
      } else {
        // Text chat
        const history = messages
          .filter(m => m.id !== 'welcome')
          .map(m => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text }));
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text.trim(), history }),
        });
        response = await res.json();
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: response.text || response.error || 'ვერ მივიღე პასუხი',
        products: response.products,
        actions: response.actions,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: t('chat_error'),
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      sendMessage('', base64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAction = (action: ChatAction, products?: Product[]) => {
    if (action.type === 'add_to_basket' && products) {
      const newItems = products.filter(p => !basket.find(b => b.id === p.id));
      if (newItems.length > 0) {
        setBasket(prev => [...prev, ...newItems]);
      }
    }
  };

  return (
    <div className="pb-20 pt-14 px-0 min-h-screen flex flex-col">
      <div className="px-4">
        <Header title={t('chat_title')} showBack onBack={() => setScreen('home')} alertCount={alertCount} onAlertTap={onAlertTap} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${msg.role === 'user' ? '' : ''}`}>
              {/* Message bubble */}
              <div className={`rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-[#108AB1] text-white rounded-br-md'
                  : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-md border border-slate-100 dark:border-slate-700'
              }`}>
                {msg.image && (
                  <img src={msg.image} alt="uploaded" className="w-32 h-32 object-cover rounded-lg mb-2" />
                )}
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>

              {/* Products carousel */}
              {msg.products && msg.products.length > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {msg.products.map((product) => {
                    const priceEntries = Object.entries(product.prices).filter(([store, p]) => (p as number) > 0 && store !== 'SPAR').sort((a, b) => (a[1] as number) - (b[1] as number));
                    if (priceEntries.length === 0) return null;
                    const isInBasket = basket.find(b => b.id === product.id);
                    return (
                      <div
                        key={product.id}
                        onClick={() => { setSelectedProduct(product); setScreen('compare'); }}
                        className="flex-shrink-0 w-[150px] bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 cursor-pointer active:scale-[0.97] transition-transform"
                      >
                        <div className="w-full h-16 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 mb-2">
                          <SmartImage filename="" imageUrl={product.image} alt={product.name} className="w-full h-full object-contain p-1" fallbackLetter={product.name[0]} />
                        </div>
                        <h4 className="text-[12px] font-semibold text-slate-900 dark:text-white leading-tight line-clamp-2 mb-1.5" style={{ minHeight: '30px' }}>{product.name}</h4>
                        {priceEntries.slice(0, 2).map(([store, price], i) => (
                          <div key={store} className={`text-[11px] ${i === 0 ? 'font-bold text-[#06D7A0]' : 'text-slate-400'}`}>
                            {store}: {(price as number).toFixed(2)}₾
                          </div>
                        ))}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isInBasket) setBasket(prev => [...prev, product]);
                          }}
                          className={`mt-2 w-full py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                            isInBasket
                              ? 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                              : 'bg-[#108AB1] text-white'
                          }`}
                        >
                          {isInBasket ? t('chat_in_basket') : t('chat_add_basket')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action buttons */}
              {msg.actions && msg.actions.length > 0 && msg.products && msg.products.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {msg.actions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => handleAction(action, msg.products)}
                      className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950 text-[#06D7A0] rounded-lg text-[12px] font-semibold active:scale-95 transition-transform"
                    >
                      <ShoppingBasket size={12} className="inline mr-1" />
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3 border border-slate-100 dark:border-slate-700">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="sticky bottom-0 px-4 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
        <div className="flex gap-2 items-end">
          <input type="file" ref={fileInputRef} accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
          <button
            onClick={handleImagePick}
            aria-label="Upload image"
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0 active:scale-90 transition-transform focus:outline-none focus:ring-2 focus:ring-[#108AB1]/50"
          >
            <ImagePlus size={20} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder={t('chat_placeholder')}
            className="flex-1 bg-white dark:bg-slate-800 rounded-xl py-3 px-4 text-[14px] font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-600"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || (!input.trim())}
            aria-label="Send message"
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-[#108AB1]/50 ${
              input.trim() && !loading
                ? 'bg-[#108AB1] text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
            }`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Voice Command Toast ---
const VoiceToast = ({ text, type }: { text: string; type: 'command' | 'listening' | 'error' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className={`fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-medium ${
      type === 'listening' ? 'bg-red-500 text-white' :
      type === 'error' ? 'bg-slate-700 text-slate-300' :
      'bg-[#108AB1] text-white'
    }`}
  >
    {type === 'listening' && <Mic size={13} className="animate-pulse" />}
    {text}
  </motion.div>
);

// --- Voice Command Processor ---
function processVoiceCommand(
  text: string,
  actions: {
    setScreen: (s: Screen) => void;
    setDarkMode: (v: boolean) => void;
    darkMode: boolean;
    setSearchQuery: (q: string) => void;
    setSelectedCategory: (c: string) => void;
    setTargetStore: (s: string | null) => void;
    basket: Product[];
    setBasket: React.Dispatch<React.SetStateAction<Product[]>>;
    products: Product[];
    t: (key: string) => string;
  }
): string | null {
  const t = actions.t as any;
  const cmd = text.toLowerCase().trim();

  // --- Navigation ---
  if (/^(მთავარი|სახლ|სახლში|დასაწყის|home)/.test(cmd)) {
    actions.setScreen('home');
    return t('voice_home');
  }
  if (/^(კალათა|კალათ|basket|cart)/.test(cmd)) {
    actions.setScreen('basket');
    return t('voice_basket');
  }
  if (/^(რუკა|მეფ|map|რუკაზე)/.test(cmd)) {
    actions.setTargetStore(null);
    actions.setScreen('map');
    return t('voice_map');
  }
  if (/^(პროფილი|profile|ანგარიშ|ჩემი)/.test(cmd)) {
    actions.setScreen('profile');
    return t('voice_profile');
  }
  if (/^(შეტყობინებ|ალერტ|notification)/.test(cmd)) {
    actions.setScreen('alerts');
    return t('voice_alerts');
  }
  if (/^(უკან|back|დაბრუნება)/.test(cmd)) {
    actions.setScreen('home');
    return t('barcode_back');
  }

  // --- Dark/Light Mode ---
  if (/(ბნელი|ღამის|dark|მუქი)/.test(cmd)) {
    actions.setDarkMode(true);
    return t('voice_dark_mode');
  }
  if (/(ნათელი|დღის|light|თეთრ)/.test(cmd)) {
    actions.setDarkMode(false);
    return t('voice_light_mode');
  }

  // --- Categories ---
  const categoryMap: Record<string, string> = {
    'ყველა': 'ყველა', 'რძე': 'რძე', 'ხორცი': 'ხორცი', 'ხორც': 'ხორცი',
    'პური': 'პური', 'ხილი': 'ხილი', 'სასმელი': 'სასმელი', 'ლუდი': 'ლუდი',
    'ტკბილეული': 'ტკბილეული', 'სნექი': 'სნექი', 'ყავა': 'ყავა/ჩაი',
    'ჩაი': 'ყავა/ჩაი', 'ჰიგიენა': 'ჰიგიენა',
  };
  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (cmd === keyword || cmd === `${keyword} კატეგორია` || cmd === `მაჩვენე ${keyword}`) {
      actions.setScreen('home');
      actions.setSelectedCategory(category);
      return `${t('voice_category')} ${category}`;
    }
  }

  // --- Basket actions ---
  if (/(დაამატე|კალათაში დაამატე|ჩაამატე)/.test(cmd)) {
    if (actions.products.length > 0) {
      const product = actions.products[0];
      if (!actions.basket.find(b => b.id === product.id)) {
        actions.setBasket(prev => [...prev, product]);
        return `${product.name} ${t('voice_added_basket')}`;
      }
      return `${product.name} ${t('voice_already_in_basket')}`;
    }
    return t('voice_product_not_found');
  }
  if (/(კალათა გაასუფთავე|წაშალე ყველა|კალათა წაშალე|გაასუფთავე)/.test(cmd)) {
    actions.setBasket([]);
    return t('voice_basket_cleared');
  }

  // --- Store on map ---
  if (/(სპარი|spar)/.test(cmd) && /(რუკა|მაჩვენე|სადაა|სად არის|უახლოეს)/.test(cmd)) {
    actions.setTargetStore('SPAR');
    actions.setScreen('map');
    return `${t('voice_nearest_on_map')} SPAR ${t('voice_on_map')}`;
  }
  if (/(ნაბიჯი|nabiji|2 ნაბიჯ)/.test(cmd) && /(რუკა|მაჩვენე|სადაა|სად არის|უახლოეს)/.test(cmd)) {
    actions.setTargetStore('2 Nabiji');
    actions.setScreen('map');
    return `${t('voice_nearest_on_map')} 2 Nabiji ${t('voice_on_map')}`;
  }
  if (/(გუდვილ|goodwill)/.test(cmd) && /(რუკა|მაჩვენე|სადაა|სად არის|უახლოეს)/.test(cmd)) {
    actions.setTargetStore('Goodwill');
    actions.setScreen('map');
    return `${t('voice_nearest_on_map')} Goodwill ${t('voice_on_map')}`;
  }

  // --- Fallback: treat as search ---
  if (cmd.length >= 2) {
    actions.setScreen('home');
    actions.setSearchQuery(cmd);
    return `${t('voice_search')} ${cmd}`;
  }

  return null;
}

const AdminScraperToggle = () => {
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem('pasebi-auth-token');
    if (token) fetch('/api/admin/scraper/status', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setStatus(d.status || {})).catch(() => {}).finally(() => setLoading(false));
    else setLoading(false);
  }, []);
  const toggle = (store: string) => {
    const token = localStorage.getItem('pasebi-auth-token');
    if (!token) return;
    fetch(`/api/admin/scraper/toggle/${store}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if ('enabled' in d) setStatus(prev => ({ ...prev, [store]: d.enabled })); });
  };
  if (loading) return null;
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
      <h2 className="font-semibold text-sm text-slate-900 dark:text-white mb-3">Scraper On/Off</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(status).map(([store, enabled]) => (
          <button key={store} onClick={() => toggle(store)}
            className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all border ${enabled ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'}`}>
            <span>{store.toUpperCase()}</span>
            <span className={`inline-block w-8 h-4 rounded-full relative transition-colors ${enabled ? 'bg-green-400' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${enabled ? 'right-0.5' : 'left-0.5'}`} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

const AdminUserManager = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQ, setSearchQ] = useState('');
  const [loading, setLoading] = useState(true);
  const fetchUsers = (p: number) => {
    const token = localStorage.getItem('pasebi-auth-token');
    if (!token) return;
    setLoading(true);
    fetch(`/api/admin/users?page=${p}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setUsers(d.users || []); setTotal(d.total || 0); setPage(d.page || 1); })
      .catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetchUsers(1); }, []);
  const deleteUser = (id: number, email: string) => {
    if (!confirm(`წაშალოთ ${email}?`)) return;
    const token = localStorage.getItem('pasebi-auth-token');
    if (!token) return;
    fetch(`/api/admin/user/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success) setUsers(prev => prev.filter(u => u.id !== id)); else alert(d.error || 'Error'); });
  };
  const filtered = searchQ ? users.filter(u => (u.email || '').toLowerCase().includes(searchQ.toLowerCase()) || (u.name || '').toLowerCase().includes(searchQ.toLowerCase())) : users;
  const totalPages = Math.ceil(total / 20);
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-sm text-slate-900 dark:text-white">მომხმარებლები ({total})</h2>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="ძიება..."
          className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs w-40" />
      </div>
      {loading ? (
        <div className="p-4 text-center text-xs text-slate-400">იტვირთება...</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-50 dark:border-slate-800">
                <th className="px-4 py-2">ელფოსტა</th><th className="px-4 py-2">სახელი</th><th className="px-4 py-2">ვერიფ.</th><th className="px-4 py-2">თარიღი</th><th className="px-4 py-2"></th>
              </tr></thead>
              <tbody>
                {filtered.map((u: any) => (
                  <tr key={u.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0">
                    <td className="px-4 py-2 font-medium text-slate-900 dark:text-white text-xs">{u.email}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs">{u.name || '—'}</td>
                    <td className="px-4 py-2"><span className={`inline-block w-2 h-2 rounded-full ${u.email_verified ? 'bg-green-500' : 'bg-slate-300'}`} /></td>
                    <td className="px-4 py-2 text-slate-400 text-xs">{u.created_at ? new Date(u.created_at + 'Z').toLocaleString('ka-GE') : '—'}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        {!u.email_verified && (
                          <button onClick={() => {
                            const token = localStorage.getItem('pasebi-auth-token');
                            if (!token) return;
                            fetch(`/api/admin/user/${u.id}/verify`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
                              .then(r => r.json()).then(d => { if (d.success) setUsers(prev => prev.map(x => x.id === u.id ? { ...x, email_verified: 1 } : x)); });
                          }} className="p-1 rounded hover:bg-green-50 text-green-400 hover:text-green-600 transition-colors" title="ვერიფიკაცია">
                            <Check size={14} />
                          </button>
                        )}
                        {u.email !== 'dzikiii.j@gmail.com' && (
                          <button onClick={() => deleteUser(u.id, u.email)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors" title="წაშლა">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-3 text-center text-xs text-slate-400">ვერ მოიძებნა</td></tr>}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => fetchUsers(page - 1)} disabled={page <= 1}
                className="px-3 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30">←</button>
              <span className="text-xs text-slate-500">{page} / {totalPages}</span>
              <button onClick={() => fetchUsers(page + 1)} disabled={page >= totalPages}
                className="px-3 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30">→</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const AdminBanners = () => {
  const [banners, setBanners] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fetchBanners = () => {
    const token = localStorage.getItem('pasebi-auth-token');
    if (token) fetch('/api/admin/banners', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setBanners(d.banners || [])).catch(() => {});
  };
  useEffect(() => { fetchBanners(); }, []);
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      const token = localStorage.getItem('pasebi-auth-token');
      if (!token) { setUploading(false); return; }
      fetch('/api/admin/banner/upload', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, data: base64 })
      }).then(r => r.json()).then(d => {
        if (d.success) fetchBanners();
        else alert(d.error || 'Error');
      }).catch(() => {}).finally(() => { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; });
    };
    reader.readAsDataURL(file);
  };
  const deleteBanner = (filename: string) => {
    if (!confirm(`წაშალოთ ${filename}?`)) return;
    const token = localStorage.getItem('pasebi-auth-token');
    if (!token) return;
    fetch(`/api/admin/banner/${encodeURIComponent(filename)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success) setBanners(prev => prev.filter(b => b.filename !== filename)); });
  };
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm text-slate-900 dark:text-white">ბანერები ({banners.length})</h2>
        <label className={`flex items-center gap-1.5 px-3 py-1.5 bg-[#108AB1] text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-[#0d7a9e] transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <Upload size={14} />
          {uploading ? '...' : 'ატვირთვა'}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </label>
      </div>
      {banners.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {banners.map((b: any) => (
            <div key={b.filename} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden relative group">
              <img src={b.url} alt={b.filename} className="w-full h-24 object-cover" />
              <div className="flex items-center justify-between px-2 py-1">
                <p className="text-[10px] text-slate-400 truncate flex-1">{b.filename}</p>
                <button onClick={() => deleteBanner(b.filename)} className="p-0.5 rounded text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" title="წაშლა">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminHealth = () => {
  const [health, setHealth] = useState<any>(null);
  useEffect(() => {
    const token = localStorage.getItem('pasebi-auth-token');
    if (token) fetch('/api/admin/health', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setHealth).catch(() => {});
  }, []);
  if (!health) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h2 className="font-semibold text-sm text-slate-900 mb-3">სერვერი</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div><span className="text-slate-400">Uptime</span><p className="font-semibold text-slate-700">{Math.floor(health.uptime / 3600)}სთ {Math.floor((health.uptime % 3600) / 60)}წთ</p></div>
        <div><span className="text-slate-400">RAM</span><p className="font-semibold text-slate-700">{Math.round((health.memory?.rss || 0) / 1024 / 1024)}MB</p></div>
        <div><span className="text-slate-400">DB ზომა</span><p className="font-semibold text-slate-700">{health.dbSizeMB}MB</p></div>
        <div><span className="text-slate-400">Node</span><p className="font-semibold text-slate-700">{health.nodeVersion}</p></div>
      </div>
    </div>
  );
};

const AdminProductSearch = () => {
  const [searchQ, setSearchQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', category: '', barcode: '' });
  const searchProducts = () => {
    if (!searchQ.trim()) return;
    const token = localStorage.getItem('pasebi-auth-token');
    if (token) fetch(`/api/admin/products?q=${encodeURIComponent(searchQ)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setResults(d.products || [])).catch(() => {});
  };
  const deleteProduct = (id: number) => {
    if (!confirm('წაშალო პროდუქტი?')) return;
    const token = localStorage.getItem('pasebi-auth-token');
    if (token) fetch(`/api/admin/product/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      .then(() => setResults(r => r.filter(p => p.id !== id)));
  };
  const startEdit = (p: any) => {
    setEditingId(p.id);
    setEditForm({ name: p.name || '', category: p.category || '', barcode: p.barcode || '' });
  };
  const saveEdit = (id: number) => {
    const token = localStorage.getItem('pasebi-auth-token');
    if (!token) return;
    fetch(`/api/admin/product/${id}`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm)
    }).then(r => r.json()).then(d => {
      if (d.success) {
        setResults(prev => prev.map(p => p.id === id ? { ...p, ...editForm } : p));
        setEditingId(null);
      } else alert(d.error || 'Error');
    });
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h2 className="font-semibold text-sm text-slate-900 mb-3">პროდუქტის ძიება</h2>
      <div className="flex gap-2 mb-3">
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchProducts()}
          placeholder="სახელი ან ბარკოდი" className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
        <button onClick={searchProducts} className="px-4 py-2 bg-[#108AB1] text-white rounded-lg text-sm font-semibold">ძიება</button>
      </div>
      {results.length > 0 && (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {results.map((p: any) => (
            <div key={p.id} className="px-3 py-2 bg-slate-50 rounded-lg">
              {editingId === p.id ? (
                <div className="space-y-2">
                  <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="სახელი" className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs" />
                  <div className="flex gap-2">
                    <input value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                      placeholder="კატეგორია" className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs" />
                    <input value={editForm.barcode} onChange={e => setEditForm(f => ({ ...f, barcode: e.target.value }))}
                      placeholder="ბარკოდი" className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs" />
                  </div>
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => setEditingId(null)} className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700">გაუქმება</button>
                    <button onClick={() => saveEdit(p.id)} className="px-3 py-1 bg-green-500 text-white rounded text-xs font-semibold hover:bg-green-600">შენახვა</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400">{p.category} · {p.source} · {p.barcode || 'no barcode'}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEdit(p)} className="text-slate-400 hover:text-blue-600 p-1" title="რედაქტირება">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:text-red-600 p-1">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminErrors = () => {
  const [errors, setErrors] = useState<any[]>([]);
  useEffect(() => {
    const token = localStorage.getItem('pasebi-auth-token');
    if (token) fetch('/api/admin/errors', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setErrors(d.errors || [])).catch(() => {});
  }, []);
  if (errors.length === 0) return null;
  return (
    <div className="bg-white rounded-xl border border-red-100 p-4">
      <h2 className="font-semibold text-sm text-red-600 mb-3">შეცდომები ({errors.length})</h2>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {errors.map((e: any, i: number) => (
          <div key={i} className="px-3 py-2 bg-red-50 rounded-lg">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-red-700">{e.store}</span>
              <span className="text-[10px] text-red-400">{e.started_at ? new Date(e.started_at + 'Z').toLocaleString('ka-GE') : ''}</span>
            </div>
            <p className="text-[11px] text-red-600 mt-0.5 line-clamp-2">{e.error_message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminAnalysis = ({ stats }: { stats: any }) => {
  const [running, setRunning] = useState(false);

  const runAnalysis = () => {
    setRunning(true);
    const token = localStorage.getItem('pasebi-auth-token');
    fetch('/api/admin/run-analysis', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => alert(d.message || d.error))
      .catch(e => alert(e.message))
      .finally(() => setRunning(false));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h2 className="font-semibold text-sm text-slate-900 mb-3">ანალიზი</h2>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">გაანალიზებული: {stats?.overview?.analysisCache || 0} / {stats?.overview?.totalProducts || 0}</p>
          <div className="w-48 h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-[#108AB1] rounded-full" style={{ width: `${stats?.overview?.analysisProgress || 0}%` }} />
          </div>
        </div>
        <button
          onClick={runAnalysis}
          disabled={running}
          className="px-4 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-all"
        >
          {running ? '...' : 'გაშვება'}
        </button>
      </div>
    </div>
  );
};

const AdminAnalytics = () => {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    const token = localStorage.getItem('pasebi-auth-token');
    if (token) fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setData).catch(() => {});
  }, []);
  if (!data) return null;
  const maxSearch = Math.max(...(data.searchesPerDay || []).map((d: any) => d.count), 1);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400">ძიებები დღეს</p>
          <p className="text-2xl font-bold text-[#108AB1]">{data.searchesToday}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400">ნახვები დღეს</p>
          <p className="text-2xl font-bold text-violet-500">{data.viewsToday}</p>
        </div>
      </div>
      {data.searchesPerDay?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-sm text-slate-900 mb-3">ძიებები / დღეში</h2>
          <div className="flex items-end gap-1 h-24">
            {data.searchesPerDay.map((d: any, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-[#108AB1] rounded-t-sm" style={{ height: `${Math.max(4, (d.count / maxSearch) * 80)}px` }} />
                <span className="text-[8px] text-slate-400">{d.date?.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.topSearches?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-sm text-slate-900 mb-3">ტოპ ძიებები (7 დღე)</h2>
          <div className="space-y-1.5">{data.topSearches.slice(0, 10).map((s: any, i: number) => (
            <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-lg">
              <span className="text-xs font-medium text-slate-700">{s.query}</span>
              <span className="text-xs text-slate-400">{s.count}x</span>
            </div>
          ))}</div>
        </div>
      )}
      {data.popularProducts?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-sm text-slate-900 mb-3">პოპულარული პროდუქტები (7 დღე)</h2>
          <div className="space-y-1.5">{data.popularProducts.slice(0, 10).map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-lg">
              <span className="text-xs font-medium text-slate-700 truncate flex-1">{p.name}</span>
              <span className="text-xs text-slate-400 shrink-0 ml-2">{p.views} ნახვა</span>
            </div>
          ))}</div>
        </div>
      )}
      {data.userGrowth?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-sm text-slate-900 mb-3">მომხმარებლების ზრდა (30 დღე)</h2>
          <div className="space-y-1">{data.userGrowth.map((d: any, i: number) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400 w-16">{d.date?.slice(5)}</span>
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, d.count * 20)}%` }} />
              </div>
              <span className="text-[10px] font-semibold text-slate-600 w-6 text-right">{d.count}</span>
            </div>
          ))}</div>
        </div>
      )}
    </div>
  );
};

const AdminAlerts = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem('pasebi-auth-token');
    if (token) fetch('/api/admin/alerts', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setAlerts(d.alerts || [])).catch(() => {})
      .finally(() => setLoading(false));
    else setLoading(false);
  }, []);
  const deleteAlert = (id: number) => {
    const token = localStorage.getItem('pasebi-auth-token');
    if (!token) return;
    fetch(`/api/admin/alert/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success) setAlerts(prev => prev.filter(a => a.id !== id)); });
  };
  if (loading) return <div className="p-4 text-center text-xs text-slate-400">იტვირთება...</div>;
  if (alerts.length === 0) return null;
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <h2 className="font-semibold text-sm text-slate-900 dark:text-white">შეტყობინებები ({alerts.length})</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-50 dark:border-slate-800">
            <th className="px-4 py-2">პროდუქტი</th><th className="px-4 py-2">მომხმარებელი</th><th className="px-4 py-2">სამიზნე ფასი</th><th className="px-4 py-2">სტატუსი</th><th className="px-4 py-2"></th>
          </tr></thead>
          <tbody>
            {alerts.map((a: any) => (
              <tr key={a.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0">
                <td className="px-4 py-2 text-xs font-medium text-slate-800 dark:text-white truncate max-w-[180px]">{a.product_name || `#${a.product_id}`}</td>
                <td className="px-4 py-2 text-xs text-slate-500">{a.email || `user#${a.user_id}`}</td>
                <td className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300">{a.target_price != null ? `${a.target_price} GEL` : '—'}</td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${a.triggered_at ? 'bg-green-100 text-green-700' : a.active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                    {a.triggered_at ? 'triggered' : a.active ? 'active' : 'inactive'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <button onClick={() => deleteAlert(a.id)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors" title="წაშლა">
                    <X size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminScreen = ({ setScreen }: { setScreen: (s: Screen) => void }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'scrapers' | 'products' | 'users' | 'analytics'>('overview');

  useEffect(() => {
    const token = localStorage.getItem('pasebi-auth-token');
    if (!token) { setError('შესვლა საჭიროა'); setLoading(false); return; }
    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error('Access denied'); return r.json(); })
      .then(data => setStats(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-2 border-[#108AB1] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <p className="text-red-500 font-medium">{error}</p>
      <button onClick={() => setScreen('profile')} className="text-[#108AB1] text-sm">← უკან</button>
    </div>
  );

  const tabs = [
    { id: 'overview' as const, label: 'მიმოხილვა' },
    { id: 'scrapers' as const, label: 'სკრეიპერები' },
    { id: 'products' as const, label: 'პროდუქტები' },
    { id: 'users' as const, label: 'მომხმარებლები' },
    { id: 'analytics' as const, label: 'ანალიტიკა' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header + Tabs */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3 py-3">
            <button onClick={() => setScreen('profile')} className="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors">
              <ArrowLeft size={20} className="text-slate-700" />
            </button>
            <h1 className="text-lg font-bold text-slate-900">Admin Panel</h1>
          </div>
          <div className="flex gap-1 pb-2 overflow-x-auto no-scrollbar">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${tab === t.id ? 'bg-[#108AB1] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Overview Tab */}
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { label: 'პროდუქტები', value: stats?.overview?.totalProducts ?? 0 },
                { label: 'ფასები', value: stats?.overview?.totalOffers ?? 0 },
                { label: 'იუზერები', value: stats?.overview?.totalUsers ?? 0 },
                { label: 'დღეს', value: stats?.overview?.todayUsers ?? 0 },
                { label: 'ალერტები', value: `${stats?.overview?.activeAlerts ?? 0}/${stats?.overview?.triggeredAlerts ?? 0}` },
                { label: 'ანალიზი', value: `${stats?.overview?.analysisProgress ?? 0}%` },
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-3 text-center">
                  <p className="text-[10px] text-slate-400">{c.label}</p>
                  <p className="text-lg font-bold text-slate-900">{c.value}</p>
                </div>
              ))}
            </div>
            {stats?.storeBreakdown && (
              <div className="bg-white rounded-xl border border-slate-100 p-4">
                <h2 className="font-semibold text-sm text-slate-900 mb-2">მაღაზიები</h2>
                <div className="grid grid-cols-5 gap-2">
                  {stats.storeBreakdown.map((s: any, i: number) => (
                    <div key={i} className="text-center bg-slate-50 rounded-lg p-2">
                      <p className="text-xs font-semibold text-slate-700">{s.store}</p>
                      <p className="text-sm font-bold text-[#108AB1]">{s.products}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <AdminHealth />
            <AdminAnalysis stats={stats} />
          </>
        )}

        {/* Scrapers Tab */}
        {tab === 'scrapers' && (
          <>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-semibold text-sm text-slate-900 mb-3">ხელით გაშვება</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['spar', 'nabiji', 'goodwill', 'europroduct'].map(store => (
                  <button key={store}
                    onClick={() => {
                      const token = localStorage.getItem('pasebi-auth-token');
                      fetch(`/api/admin/scraper/run/${store}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
                        .then(r => r.json()).then(d => alert(d.message || d.error));
                    }}
                    className="px-3 py-2.5 bg-slate-50 hover:bg-[#108AB1] hover:text-white text-slate-700 rounded-lg text-xs font-semibold transition-all active:scale-95 border border-slate-200">
                    {store.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <AdminScraperToggle />
            {stats?.recentRuns && (
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100"><h2 className="font-semibold text-sm">ბოლო runs</h2></div>
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-slate-400 border-b border-slate-50">
                      <th className="px-3 py-2">მაღაზია</th><th className="px-3 py-2">სტატუსი</th><th className="px-3 py-2">ნაპოვნი</th><th className="px-3 py-2">თარიღი</th>
                    </tr></thead>
                    <tbody>{stats.recentRuns.map((r: any, i: number) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0">
                        <td className="px-3 py-1.5 font-medium">{r.store}</td>
                        <td className="px-3 py-1.5"><span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${r.status === 'completed' ? 'bg-green-100 text-green-700' : r.status === 'running' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{r.status === 'completed' ? '✓' : r.status === 'running' ? '⟳' : '✗'}</span></td>
                        <td className="px-3 py-1.5 text-slate-500">{r.products_found || 0}</td>
                        <td className="px-3 py-1.5 text-slate-400">{r.started_at ? new Date(r.started_at + 'Z').toLocaleString('ka-GE') : '—'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}
            <AdminErrors />
          </>
        )}

        {/* Products Tab */}
        {tab === 'products' && (
          <>
            <AdminProductSearch />
            <AdminBanners />
          </>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <>
            <AdminUserManager />
            <AdminAlerts />
          </>
        )}

        {/* Analytics Tab */}
        {tab === 'analytics' && <AdminAnalytics />}
      </div>
    </div>
  );
};

export default function App() {
  const languageState = useLanguageState();

  return (
    <LanguageContext.Provider value={languageState}>
      <AppInner />
    </LanguageContext.Provider>
  );
}

const CookieConsent = () => {
  const [visible, setVisible] = useState(() => !localStorage.getItem('pasebi-cookie-consent'));
  if (!visible) return null;
  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 z-[100] flex justify-center pointer-events-none">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-lg px-5 py-3 flex items-center gap-4 max-w-md w-full pointer-events-auto">
        <p className="text-sm text-slate-600 flex-1">ეს საიტი იყენებს cookies-ს</p>
        <button
          onClick={() => { localStorage.setItem('pasebi-cookie-consent', 'true'); setVisible(false); }}
          className="px-4 py-2 bg-[#108AB1] text-white text-xs font-semibold rounded-lg hover:bg-[#0d7a9e] transition-colors shrink-0"
        >
          ვეთანხმები
        </button>
      </div>
    </div>
  );
};

function AppInner() {
  const { t } = useLanguage();
  const [currentScreen, setScreen] = useState<Screen>('home');

  // Global auth state
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('pasebi-auth-token'));
  const [showAuthPrompt, setShowAuthPrompt] = useState<string | null>(null);

  const requireAuth = (reason: string, callback?: () => void): boolean => {
    if (isLoggedIn) { callback?.(); return true; }
    setShowAuthPrompt(reason);
    return false;
  };

  // Listen for auth changes + auth-required events
  useEffect(() => {
    const check = () => setIsLoggedIn(!!localStorage.getItem('pasebi-auth-token'));
    const onAuthRequired = (e: Event) => setShowAuthPrompt((e as CustomEvent).detail || 'გაიარეთ რეგისტრაცია');
    window.addEventListener('storage', check);
    window.addEventListener('auth-required', onAuthRequired);
    const interval = setInterval(check, 2000);
    return () => { window.removeEventListener('storage', check); window.removeEventListener('auth-required', onAuthRequired); clearInterval(interval); };
  }, []);
  const [darkMode, setDarkMode] = useState(() => {
    // Force light mode
    document.documentElement.classList.remove('dark');
    return false;
  });
  const [basket, setBasket] = useState<Product[]>(() => {
    try { const saved = localStorage.getItem('pasebi-basket'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [targetStore, setTargetStore] = useState<string | null>(null);

  // Splash & onboarding
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Favorites
  const [favorites, setFavorites] = useState<Product[]>(() => {
    try { const saved = localStorage.getItem('pasebi-favorites'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

  // Alerts
  const [alertCount, setAlertCount] = useState(0);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const alertsRef = useRef<HTMLDivElement>(null);

  const getDeviceId = useCallback(() => {
    return localStorage.getItem('pasebi-device-id') || (() => {
      const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('pasebi-device-id', id);
      return id;
    })();
  }, []);

  const fetchAlerts = useCallback(() => {
    const deviceId = getDeviceId();
    fetch(`/api/alerts?device_id=${deviceId}`)
      .then(r => r.json())
      .then(data => {
        const allAlerts = data.alerts || [];
        setAlerts(allAlerts);
        // Count: active alerts + unseen triggered alerts
        const active = allAlerts.filter((a: any) => a.active);
        const triggered = allAlerts.filter((a: any) => a.triggered_at && !a.active);
        const unseenTriggered = triggered.filter((a: any) => !localStorage.getItem(`pasebi-alert-seen-${a.id}`));
        setAlertCount(active.length + unseenTriggered.length);
      })
      .catch(() => {});
  }, [getDeviceId]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    const onUpdate = () => fetchAlerts();
    window.addEventListener('alerts-updated', onUpdate);
    return () => { clearInterval(interval); window.removeEventListener('alerts-updated', onUpdate); };
  }, [fetchAlerts]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) setShowAlerts(false);
    };
    if (showAlerts) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAlerts]);

  const deleteAlert = (alertId: number) => {
    const deviceId = getDeviceId();
    fetch(`/api/alerts/${alertId}?device_id=${deviceId}`, { method: 'DELETE' })
      .then(() => { fetchAlerts(); })
      .catch(() => {});
  };

  const markAllSeen = () => {
    alerts.filter((a: any) => a.triggered_at).forEach((a: any) => {
      localStorage.setItem(`pasebi-alert-seen-${a.id}`, 'true');
    });
    setAlertCount(0);
  };

  // Global voice state
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceToast, setVoiceToast] = useState<{ text: string; type: 'command' | 'listening' | 'error' } | null>(null);
  // Shared state for voice/desktop search → HomeScreen communication
  const [desktopSearchQuery, setDesktopSearchQuery] = useState('');
  const [voiceSearchQuery, setVoiceSearchQuery] = useState<string | null>(null);
  const [voiceCategory, setVoiceCategory] = useState<string | null>(null);
  const [voiceProducts, setVoiceProducts] = useState<Product[]>([]);

  // Splash auto-dismiss
  useEffect(() => {
    // Splash: მინიმუმ 3 წამი, მაქსიმუმ 5 წამი
    const minTime = 3000;
    const maxTimer = setTimeout(() => setShowSplash(false), 5000);
    const start = Date.now();
    fetch('/api/search?storeType=grocery&allStores=true&limit=120')
      .then(() => {
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, minTime - elapsed);
        setTimeout(() => setShowSplash(false), remaining);
      })
      .catch(() => {});
    return () => clearTimeout(maxTimer);
    return () => clearTimeout(timer);
  }, []);

  // URL basket restore
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const basketParam = params.get('basket');
    if (basketParam) {
      const ids = basketParam.split(',').filter(Boolean);
      if (ids.length > 0) {
        Promise.all(ids.map(id =>
          fetch(`/api/compare/${id}`).then(r => r.json()).then(data => {
            if (data.product) return data.product as Product;
            return null;
          }).catch(() => null)
        )).then(products => {
          const valid = products.filter(Boolean) as Product[];
          if (valid.length > 0) {
            setBasket(valid);
            setScreen('basket');
          }
        });
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  useEffect(() => { localStorage.setItem('pasebi-basket', JSON.stringify(basket)); }, [basket]);
  useEffect(() => { localStorage.setItem('pasebi-favorites', JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const showToast = (text: string, type: 'command' | 'listening' | 'error' = 'command') => {
    setVoiceToast({ text, type });
    setTimeout(() => setVoiceToast(null), 2000);
  };

  const startVoiceCommand = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { showToast(t('voice_unavailable'), 'error'); return; }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ka-GE';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setVoiceListening(true);
      showToast(t('voice_listening'), 'listening');
    };

    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      const result = processVoiceCommand(text, {
        setScreen,
        setDarkMode,
        darkMode,
        setSearchQuery: (q) => setVoiceSearchQuery(q),
        setSelectedCategory: (c) => setVoiceCategory(c),
        setTargetStore,
        basket,
        setBasket,
        products: voiceProducts,
        t,
      });
      if (result) {
        showToast(result, 'command');
      } else {
        showToast(`"${text}" - ${t('voice_not_understood')}`, 'error');
      }
    };

    recognition.onerror = () => {
      setVoiceListening(false);
      showToast(t('voice_not_heard'), 'error');
    };
    recognition.onend = () => setVoiceListening(false);
    recognition.start();
  };

  const onAlertTap = () => { setShowAlerts(prev => !prev); if (!showAlerts) markAllSeen(); };
  const renderScreen = () => {
    const props = { setScreen, darkMode, setDarkMode, basket, setBasket, alertCount, onAlertTap };
    const homeProps = { ...props, favorites, setFavorites, setSelectedProduct, voiceSearchQuery, setVoiceSearchQuery, voiceCategory, setVoiceCategory, onProductsLoaded: setVoiceProducts, desktopSearchQuery, setDesktopSearchQuery };
    switch (currentScreen) {
      case 'home': return <HomeScreen {...homeProps} />;
      case 'compare': return <CompareScreen {...props} selectedProduct={selectedProduct} setTargetStore={setTargetStore} />;
      case 'map': return <MapScreen {...props} targetStore={targetStore} setTargetStore={setTargetStore} selectedProduct={selectedProduct} />;
      case 'profile': return <ProfileScreen {...props} />;
      case 'basket': return <BasketScreen {...props} setTargetStore={setTargetStore} />;
      case 'alerts': return <AlertsScreen {...props} />;
      case 'scanner': return <BarcodeScannerScreen setScreen={setScreen} setSelectedProduct={setSelectedProduct} />;
      case 'chat': return <ChatScreen {...props} setSelectedProduct={setSelectedProduct} />;
      case 'admin': return <AdminScreen setScreen={setScreen} />;
      default: return <HomeScreen {...homeProps} />;
    }
  };

  return (
    <div className="w-full lg:pt-16 bg-slate-50 dark:bg-slate-950 min-h-screen relative">
      {/* Splash Screen */}
      <AnimatePresence>
        {showSplash && <SplashScreen />}
      </AnimatePresence>

      {/* Onboarding - shown after splash, only on first launch */}
      {!showSplash && showOnboarding && (
        <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Main App */}
      {!showSplash && !showOnboarding && (
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ overflow: 'visible' }}
            >
              {renderScreen()}
            </motion.div>
          </AnimatePresence>

          {/* Voice toast */}
          <AnimatePresence>
            {voiceToast && <VoiceToast text={voiceToast.text} type={voiceToast.type} />}
          </AnimatePresence>

          {/* Floating buttons */}
          {/* AI Chat and Voice mic floating buttons removed */}

          <BottomNav active={currentScreen} setScreen={setScreen} onMapTap={() => setTargetStore(null)} basketCount={basket.length} alertCount={alertCount} onAlertTap={onAlertTap} searchQuery={desktopSearchQuery} onSearchChange={(q) => { setDesktopSearchQuery(q); if (q.length > 0 && currentScreen !== 'home') setScreen('home'); }} onChatTap={() => setScreen('chat')} onVoiceTap={startVoiceCommand} voiceListening={voiceListening} />

          {/* Auth prompt modal */}
          <AnimatePresence>
            {showAuthPrompt && (
              <div className="fixed inset-0 z-[80] flex items-center justify-center px-5">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setShowAuthPrompt(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
                  <div className="w-14 h-14 bg-[#108AB1]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <User size={24} className="text-[#108AB1]" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">შესვლა საჭიროა</h3>
                  <p className="text-sm text-slate-400 mb-5">{showAuthPrompt}</p>
                  <button
                    onClick={() => { setShowAuthPrompt(null); setScreen('profile'); }}
                    className="w-full bg-[#108AB1] text-white py-3 rounded-xl font-semibold text-sm mb-2 active:scale-[0.98] transition-transform">
                    შესვლა / რეგისტრაცია
                  </button>
                  <button onClick={() => setShowAuthPrompt(null)}
                    className="w-full text-slate-400 text-xs py-2">
                    მოგვიანებით
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Notifications dropdown */}
          <AnimatePresence>
            {showAlerts && (
              <motion.div
                ref={alertsRef}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="fixed top-[4.5rem] right-3 sm:right-10 xl:right-14 z-[60] w-[calc(100vw-1.5rem)] sm:w-[360px] max-w-[360px] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">{t('alerts_title')}</h3>
                  <button onClick={() => setShowAlerts(false)} className="text-slate-400 hover:text-slate-600 p-1">
                    <X size={16} />
                  </button>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {alerts.length === 0 ? (
                    <div className="py-10 text-center">
                      <Bell size={24} className="text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">შეტყობინებები არ არის</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {alerts.map((alert: any) => (
                        <div key={alert.id} className={`px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors ${alert.triggered_at ? 'bg-emerald-50/50' : ''}`}>
                          <div className="w-10 h-10 rounded-xl bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                            {alert.product_image ? (
                              <img src={alert.product_image} alt="" className="w-full h-full object-contain p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center ${alert.triggered_at ? 'bg-emerald-100 text-emerald-600' : 'bg-[#108AB1]/10 text-[#108AB1]'}`}>
                                {alert.triggered_at ? <TrendingDown size={16} /> : <Bell size={16} />}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-slate-800 leading-tight truncate">
                              {alert.product_name || `პროდუქტი #${alert.product_id}`}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {alert.triggered_at ? 'ფასი ჩამოვიდა!' : `სამიზნე: ${alert.target_price}₾`} · {alert.store || 'ყველა მაღაზია'}
                            </p>
                            {alert.active && !alert.triggered_at && (
                              <span className="inline-block text-[10px] text-[#108AB1] font-medium mt-1 bg-[#108AB1]/10 px-2 py-0.5 rounded-full">მოლოდინში</span>
                            )}
                            {alert.triggered_at && (
                              <span className="inline-block text-[10px] text-emerald-600 font-medium mt-1 bg-emerald-100 px-2 py-0.5 rounded-full">შესრულდა</span>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteAlert(alert.id); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
      <CookieConsent />
    </div>
  );
}
