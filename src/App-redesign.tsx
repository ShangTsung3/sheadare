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
} from 'lucide-react';
import { motion, AnimatePresence, type PanInfo } from 'motion/react';
import QRCode from 'qrcode';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Screen, StorePrice, Product, ChatMessage, ChatAction } from './types';
import { Sparkles, Send, ImagePlus } from 'lucide-react';

// --- Image Assets ---
const STORE_CONFIG: Record<string, { color: string, letter: string, filename: string, logo: string }> = {
  'SPAR': { color: 'bg-[#00703C]', letter: 'S', filename: '1.spar', logo: 'https://static.spargeorgia.com/Spar_files/d019aa0c-1a0e-45f2-ae4c-cd8734e69f59_Thumb.png' },
  '2 Nabiji': { color: 'bg-[#EE3124]', letter: '2', filename: '2. 2 nabiji', logo: 'https://2nabiji.ge/2-nabiji-logo.png' },
  'Goodwill': { color: 'bg-[#0054A6]', letter: 'G', filename: '3. Goodwill', logo: 'https://static.goodwill.ge/Goodwill_files/28402b34-5b3f-4e50-825a-d9827094769c_Thumb.png' },
  'Europroduct': { color: 'bg-[#E30613]', letter: 'E', filename: '4. Europroduct', logo: 'https://europroduct.ge/Content/Images/logo.svg' },
  'Zoomer': { color: 'bg-[#00AEEF]', letter: 'Z', filename: 'zoomer', logo: 'https://zoommer.ge/favicon.ico' },
  'Alta': { color: 'bg-[#F7941D]', letter: 'A', filename: 'alta', logo: 'https://alta.ge/favicon.ico' },
  'Kontakt': { color: 'bg-[#E4002B]', letter: 'K', filename: 'kontakt', logo: 'https://kontakt.ge/favicon.ico' },
  'Megatechnica': { color: 'bg-[#1B4D8E]', letter: 'M', filename: 'megatechnica', logo: 'https://megatechnica.ge/favicon.ico' },
};

const SmartImage = ({ filename, alt, className, fallbackLetter, fallbackColor, isLogo, storeName, imageUrl }: { filename: string, alt: string, className?: string, fallbackLetter?: string, fallbackColor?: string, isLogo?: boolean, storeName?: string, imageUrl?: string }) => {
  const storeLogoUrl = isLogo && storeName && STORE_CONFIG[storeName]?.logo;
  const [src, setSrc] = useState(imageUrl || storeLogoUrl || (filename ? `/api/images/${encodeURIComponent(filename)}` : ''));
  const [error, setError] = useState(false);

  const handleError = () => {
    if (!error) setError(true);
  };

  if (error || !src) {
    if (isLogo && fallbackLetter) {
      return (
        <div className={`${className} ${fallbackColor} flex items-center justify-center text-white font-semibold`}>
          {fallbackLetter}
        </div>
      );
    }
    return (
      <div className={`${className} bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600`}>
        <ShoppingBasket size={18} />
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} onError={handleError} referrerPolicy="no-referrer" />;
};

// --- Components ---

const SplashScreen = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center"
  >
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="text-center"
    >
      <h1 className="text-4xl font-light tracking-[0.5em] text-white uppercase" style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>
        SHEADARE
      </h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="text-slate-400 text-sm mt-3 tracking-wide"
      >
        შეადარე ფასები
      </motion.p>
    </motion.div>
  </motion.div>
);

const ONBOARDING_SLIDES = [
  { title: 'შეადარე ფასები', desc: 'ნახე სად ღირს ყველაზე იაფად', emoji: '🔍' },
  { title: 'შეინახე კალათაში', desc: 'დაამატე პროდუქტები და ნახე ჯამი', emoji: '🛒' },
  { title: 'იპოვე მაღაზია', desc: 'რუკაზე ნახე უახლოესი ფილიალი', emoji: '📍' },
];

const OnboardingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [current, setCurrent] = useState(0);

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
          className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-semibold text-base active:scale-[0.98] transition-transform"
        >
          {current < ONBOARDING_SLIDES.length - 1 ? 'შემდეგი' : 'დაწყება'}
        </button>

        {current < ONBOARDING_SLIDES.length - 1 && (
          <button
            onClick={() => { localStorage.setItem('pasebi-onboarded', 'true'); onComplete(); }}
            className="w-full text-slate-400 py-3 text-sm font-medium mt-2"
          >
            გამოტოვება
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

const BottomNav = ({ active, setScreen, onMapTap, basketCount }: { active: Screen, setScreen: (s: Screen) => void, onMapTap?: () => void, basketCount: number }) => {
  const navItems = [
    { id: 'home', icon: Home, label: 'მთავარი' },
    { id: 'basket', icon: ShoppingBasket, label: 'კალათა' },
    { id: 'map', icon: MapIcon, label: 'რუკა' },
    { id: 'profile', icon: User, label: 'პროფილი' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 pt-3 pb-6 flex justify-between items-center z-50">
      {navItems.map((item) => {
        const isActive = active === item.id || (active === 'compare' && item.id === 'home');
        return (
          <button
            key={item.id}
            onClick={() => { if (item.id === 'map' && onMapTap) onMapTap(); setScreen(item.id as Screen); }}
            className={`transition-colors relative flex flex-col items-center gap-1.5 min-w-[4rem] py-1 ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'}`}
          >
            <div className="relative">
              <item.icon size={24} strokeWidth={isActive ? 2.2 : 1.6} />
              {item.id === 'basket' && basketCount > 0 && (
                <div className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {basketCount}
                </div>
              )}
            </div>
            <span className={`text-[12px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const Header = ({ title, showBack, onBack, darkMode, setDarkMode }: { title: string, showBack?: boolean, onBack?: () => void, darkMode?: boolean, setDarkMode?: (v: boolean) => void }) => (
  <header className="mb-6 flex items-center justify-between">
    <div className="flex items-center gap-3">
      {showBack && (
        <button onClick={onBack} className="p-2 -ml-2 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
      )}
      {title === 'შეადარე' ? (
        <h1 className="text-[22px] font-light tracking-[0.4em] uppercase text-slate-900 dark:text-white" style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>SHEADARE</h1>
      ) : (
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
      )}
    </div>
    {setDarkMode && (
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
      >
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    )}
  </header>
);

// --- Screens ---

const FALLBACK_PRODUCTS: Product[] = [
  { id: '1', name: 'ლუდი ყაზბეგი', size: '0.5L', category: 'ლუდი', prices: { '2 Nabiji': 2.40, 'SPAR': 2.55, 'Goodwill': 2.60 } },
  { id: '2', name: 'რძე სანტე', size: '1L', category: 'რძე', prices: { '2 Nabiji': 3.40, 'SPAR': 3.10, 'Goodwill': 3.50 } },
  { id: '3', name: 'პური მზეთამზე', size: '400g', category: 'პური', prices: { '2 Nabiji': 1.20, 'SPAR': 1.15, 'Goodwill': 1.30 } },
  { id: '4', name: 'წყალი ბაკურიანი', size: '0.5L', category: 'წყალი', prices: { '2 Nabiji': 0.65, 'SPAR': 0.60, 'Goodwill': 0.70 } },
  { id: '5', name: 'ქათმის ფილე', size: '1kg', category: 'ხორცი', prices: { '2 Nabiji': 15.20, 'SPAR': 14.80, 'Goodwill': 14.50 } },
];

const BasketToast = ({ productName }: { productName: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2"
  >
    <ShoppingBasket size={14} strokeWidth={2.5} />
    <span className="text-xs font-semibold">კალათაში დაემატა</span>
  </motion.div>
);

const HomeScreen = ({ setScreen, setSelectedProduct, darkMode, setDarkMode, basket, setBasket, favorites, setFavorites, voiceSearchQuery, setVoiceSearchQuery, voiceCategory, setVoiceCategory, onProductsLoaded }: { setScreen: (s: Screen) => void, setSelectedProduct: (p: Product) => void, darkMode: boolean, setDarkMode: (v: boolean) => void, basket: Product[], setBasket: React.Dispatch<React.SetStateAction<Product[]>>, favorites: Product[], setFavorites: React.Dispatch<React.SetStateAction<Product[]>>, voiceSearchQuery?: string | null, setVoiceSearchQuery?: (q: string | null) => void, voiceCategory?: string | null, setVoiceCategory?: (c: string | null) => void, onProductsLoaded?: (p: Product[]) => void }) => {
  const [storeType, setStoreType] = useState<'grocery' | 'electronics'>('grocery');
  const [selectedCategory, setSelectedCategory] = useState('ყველა');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try { const saved = localStorage.getItem('pasebi-search-history'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [topSavings, setTopSavings] = useState<Product[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDist, setPullDist] = useState(0);
  const [isAiResult, setIsAiResult] = useState(false);
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
    'რძე': 'რძ', 'ხორცი': 'ხორც', 'პური': 'პურ', 'ხილი': 'ხილ',
    'სასმელი': 'სასმელ', 'ლუდი': 'ლუდი', 'ტკბილეული': 'ტკბილ',
    'სნექი': 'სნექ', 'ყავა/ჩაი': 'ყავა', 'ჰიგიენა': 'ჰიგიენ',
  };

  const ELECTRONICS_CATEGORY_MAP: Record<string, string> = {
    'ტელეფონები': 'ტელეფონ', 'ლეპტოპები': 'ლეპტოპ', 'ტაბლეტები': 'ტაბლეტ',
    'ტელევიზორები': 'ტელევიზორ', 'აუდიო': 'აუდიო', 'გეიმინგი': 'გეიმინგ',
  };

  const CATEGORY_MAP = storeType === 'grocery' ? GROCERY_CATEGORY_MAP : ELECTRONICS_CATEGORY_MAP;

  // Smart search detection: 3+ words or patterns like "იაფი", size patterns
  const isSmartQuery = (q: string) => {
    if (!q) return false;
    const words = q.trim().split(/\s+/);
    const smartPatterns = /იაფი|ძვირი|საუკეთესო|კარგი|\d+\s*გ($|\s)|მლ|ლიტრ|კგ/i;
    return words.length >= 3 || smartPatterns.test(q);
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setIsAiResult(false);

    // Try smart search for qualifying queries
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
        .catch(() => {
          // Fallback to regular search
          return regularSearch(controller.signal);
        })
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
      params.set('limit', '30');

      return fetch(`/api/search?${params}`, { signal })
        .then(r => r.json())
        .then(data => {
          const withPrices = (data.results || []).filter((p: Product) => Object.keys(p.prices).length > 0);
          if (withPrices.length > 0) {
            setProducts(withPrices);
          } else if (!debouncedQuery && selectedCategory === 'ყველა' && storeType === 'grocery') {
            setProducts(FALLBACK_PRODUCTS);
          } else {
            setProducts(withPrices);
          }
        })
        .catch(() => {
          if (!debouncedQuery && selectedCategory === 'ყველა' && storeType === 'grocery') setProducts(FALLBACK_PRODUCTS);
        });
    }

    return () => controller.abort();
  }, [debouncedQuery, selectedCategory, refreshKey, storeType]);

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
  const [swipeHintShown] = useState(() => !!localStorage.getItem('pasebi-swipe-hint'));

  const addToFavorites = (product: Product) => {
    if (!favorites.find(f => f.id === product.id)) {
      setFavorites(prev => [...prev, product]);
      setFavoriteToast(product.name);
      setTimeout(() => setFavoriteToast(null), 1500);
    }
  };

  const addToBasketSwipe = (product: Product) => {
    if (!basket.find(item => item.id === product.id)) {
      setBasket(prev => [...prev, product]);
      setToastProduct(product.name);
      setTimeout(() => setToastProduct(null), 1500);
    }
  };

  const toggleBasket = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (basket.find(item => item.id === product.id)) {
      setBasket(basket.filter(item => item.id !== product.id));
    } else {
      setBasket([...basket, product]);
      setToastProduct(product.name);
      setTimeout(() => setToastProduct(null), 1500);
    }
  };

  return (
    <div ref={containerRef} className="pb-24 pt-14 px-5 min-h-screen overflow-auto" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
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
            <span className="text-xs font-semibold">ფავორიტებში დაემატა</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pull to refresh indicator */}
      {(pullDist > 0 || refreshing) && (
        <div className="flex justify-center items-center mb-2 -mt-2" style={{ height: pullDist > 0 ? pullDist : 30 }}>
          <RefreshCw size={18} className={`text-slate-400 transition-transform ${refreshing ? 'animate-spin' : ''}`} style={{ transform: `rotate(${pullDist * 3}deg)` }} />
        </div>
      )}

      <Header title="შეადარე" darkMode={darkMode} setDarkMode={setDarkMode} />

      {/* Store Type Tabs */}
      <div className="flex gap-0 mb-4 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
        <button
          onClick={() => { setStoreType('grocery'); setSelectedCategory('ყველა'); setSearchQuery(''); }}
          className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg transition-all ${
            storeType === 'grocery'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          სასურსათო
        </button>
        <button
          onClick={() => { setStoreType('electronics'); setSelectedCategory('ყველა'); setSearchQuery(''); }}
          className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg transition-all ${
            storeType === 'electronics'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          ტექნიკა
        </button>
      </div>

      {/* Top Savings */}
      {storeType === 'grocery' && topSavings.length > 0 && !debouncedQuery && (
        <section className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={16} className="text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">ამ კვირის დანაზოგი</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {topSavings.map((product) => {
              const priceEntries = Object.entries(product.prices).filter(([, p]) => (p as number) > 0).sort((a, b) => (a[1] as number) - (b[1] as number));
              if (priceEntries.length < 2) return null;
              const bestPrice = priceEntries[0][1] as number;
              const worstPrice = priceEntries[priceEntries.length - 1][1] as number;
              const savings = worstPrice - bestPrice;
              if (savings < 0.1) return null;
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => { setSelectedProduct(product); setScreen('compare'); }}
                  className="flex-shrink-0 w-[155px] bg-white dark:bg-slate-900 rounded-xl p-3 cursor-pointer active:scale-[0.97] transition-transform border border-slate-100 dark:border-slate-800"
                >
                  <div className="relative w-full h-20 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 mb-2">
                    <SmartImage filename="" imageUrl={product.image} alt={product.name} className="w-full h-full object-contain p-1" fallbackLetter={product.name[0]} />
                    {product.priceTrend && (
                      <div className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center ${product.priceTrend === 'down' ? 'bg-emerald-500' : 'bg-red-400'}`}>
                        {product.priceTrend === 'down' ? <TrendingDown size={11} className="text-white" /> : <TrendingUp size={11} className="text-white" />}
                      </div>
                    )}
                  </div>
                  <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white leading-tight line-clamp-2 mb-2" style={{ minHeight: '34px' }}>{product.name}</h3>
                  <div className="flex flex-col gap-1">
                    {priceEntries.map(([store, price], i) => (
                      <span key={store} className={`inline-flex items-center gap-1.5 text-[12px] ${i === 0 ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'font-medium text-slate-400'}`}>
                        <img src={STORE_CONFIG[store]?.logo} alt={store} className="w-3.5 h-3.5 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        {(price as number).toFixed(2)}₾
                      </span>
                    ))}
                  </div>
                  <div className="mt-2">
                    <span className={`text-[11px] font-bold px-2 py-1 rounded ${
                      savings >= 5 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' :
                      savings >= 1 ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' :
                      'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      დაზოგე {savings.toFixed(2)}₾
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Search */}
      <div className="relative mb-5 flex gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} strokeWidth={1.8} />
          <input
            type="text"
            placeholder="მოძებნე პროდუქტი..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-[15px] font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-white focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-all border-0"
          />
          {searchFocused && !searchQuery && searchHistory.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-lg z-20 overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">ბოლო ძიებები</span>
                <button onClick={() => { setSearchHistory([]); localStorage.removeItem('pasebi-search-history'); }} className="text-[10px] font-medium text-slate-400 hover:text-red-400">გასუფთავება</button>
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
          onClick={() => cameraInputRef.current?.click()}
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0"
          aria-label="ფოტოთი ძებნა"
        >
          <Camera size={20} className="text-white" />
        </button>
        <button
          onClick={() => setScreen('scanner')}
          className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center shrink-0"
          aria-label="ბარკოდის სკანერი"
        >
          <ScanLine size={20} className="text-white dark:text-slate-900" />
        </button>
        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result as string;
              setLoading(true);
              fetch('/api/ai/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64 }),
              })
                .then(r => r.json())
                .then(data => {
                  if (data.products?.length > 0) {
                    const withPrices = data.products.filter((p: Product) => Object.keys(p.prices).length > 0);
                    setProducts(withPrices);
                    setIsAiResult(true);
                    if (data.identified) setSearchQuery(data.identified);
                  }
                })
                .catch(() => {})
                .finally(() => setLoading(false));
            };
            reader.readAsDataURL(file);
            e.target.value = '';
          }}
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 mb-5">
        {(storeType === 'grocery' ? [
          { name: 'ყველა', emoji: '🛒' },
          { name: 'რძე', emoji: '🥛' },
          { name: 'ხორცი', emoji: '🥩' },
          { name: 'პური', emoji: '🍞' },
          { name: 'ხილი', emoji: '🍎' },
          { name: 'სასმელი', emoji: '🥤' },
          { name: 'ლუდი', emoji: '🍺' },
          { name: 'ტკბილეული', emoji: '🍫' },
          { name: 'სნექი', emoji: '🥜' },
          { name: 'ყავა/ჩაი', emoji: '☕' },
          { name: 'ჰიგიენა', emoji: '🧴' },
        ] : [
          { name: 'ყველა', emoji: '📱' },
          { name: 'ტელეფონები', emoji: '📲' },
          { name: 'ლეპტოპები', emoji: '💻' },
          { name: 'ტაბლეტები', emoji: '📋' },
          { name: 'ტელევიზორები', emoji: '📺' },
          { name: 'აუდიო', emoji: '🎧' },
          { name: 'გეიმინგი', emoji: '🎮' },
        ]).map((cat) => (
          <button
            key={cat.name}
            onClick={() => setSelectedCategory(cat.name)}
            className={`px-4 py-2.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 ${
              selectedCategory === cat.name
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span className="text-base">{cat.emoji}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Products */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400">
              {selectedCategory === 'ყველა' ? 'პოპულარული' : selectedCategory}
            </h2>
            {isAiResult && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 text-white">
                AI
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {loading && filteredProducts.length === 0 && [1,2,3,4,5].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-4 flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-xl skeleton flex-shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="h-4 skeleton rounded w-3/4" />
                <div className="h-3.5 skeleton rounded w-1/2" />
              </div>
            </div>
          ))}
          {filteredProducts.map((product, idx) => {
            const isInBasket = basket.find(item => item.id === product.id);
            const isFavorite = favorites.find(f => f.id === product.id);
            const priceEntries = Object.entries(product.prices).filter(([, p]) => (p as number) > 0).sort((a, b) => (a[1] as number) - (b[1] as number));
            if (priceEntries.length === 0) return null;
            const bestPrice = priceEntries[0][1] as number;
            const worstPrice = priceEntries.length >= 2 ? priceEntries[priceEntries.length - 1][1] as number : bestPrice;

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 12 }}
                animate={!swipeHintShown && idx === 0 ? { opacity: 1, y: 0, x: [0, -30, 30, 0] } : { opacity: 1, y: 0 }}
                transition={!swipeHintShown && idx === 0 ? { delay: 0.5, x: { delay: 1, duration: 0.8 } } : { delay: idx * 0.03 }}
                onAnimationComplete={() => { if (idx === 0 && !swipeHintShown) localStorage.setItem('pasebi-swipe-hint', 'true'); }}
              >
                <SwipeableProductCard
                  product={product}
                  onSwipeLeft={() => addToBasketSwipe(product)}
                  onSwipeRight={() => addToFavorites(product)}
                >
                  <div
                    onClick={() => { setSelectedProduct(product); setScreen('compare'); }}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-transform border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Product image */}
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 flex-shrink-0">
                        <SmartImage
                          filename=""
                          imageUrl={product.image}
                          alt={product.name}
                          className="w-full h-full object-contain p-1"
                          fallbackLetter={product.name[0]}
                        />
                      </div>

                      {/* Name + prices */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-slate-900 dark:text-white text-[15px] leading-snug mb-0.5">{product.name}</h3>
                          {isFavorite && <Heart size={12} className="text-pink-500 fill-pink-500 flex-shrink-0" />}
                        </div>
                        {product.size && <span className="text-slate-400 text-[12px]">{product.size}</span>}
                        {/* Store prices - with store names */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                          {priceEntries.map(([store, price], i) => (
                            <span key={store} className={`inline-flex items-center gap-1.5 text-[14px] ${i === 0 ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'font-medium text-slate-500 dark:text-slate-400'}`}>
                              <img src={STORE_CONFIG[store]?.logo} alt={store} className="w-4.5 h-4.5 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              <span className={`text-[11px] ${i === 0 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>{store === '2 Nabiji' ? '2ნაბ' : store === 'Goodwill' ? 'GW' : store === 'Europroduct' ? 'Euro' : store === 'Megatechnica' ? 'Mega' : store}</span>
                              {(price as number).toFixed(2)}₾
                            </span>
                          ))}
                        </div>
                        {/* Savings badge */}
                        {priceEntries.length >= 2 && (worstPrice - bestPrice) >= 0.1 && (
                          <div className="mt-2">
                            <span className={`text-[12px] font-bold px-2 py-1 rounded-lg inline-block ${
                              (worstPrice - bestPrice) >= 5 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' :
                              (worstPrice - bestPrice) >= 1 ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' :
                              'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              დაზოგე {(worstPrice - bestPrice).toFixed(2)}₾
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Add to basket */}
                      <button
                        onClick={(e) => toggleBasket(e, product)}
                        className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                          isInBasket
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <ShoppingBasket size={18} strokeWidth={isInBasket ? 2.5 : 1.8} />
                      </button>
                    </div>
                  </div>
                </SwipeableProductCard>
              </motion.div>
            );
          })}
          {!loading && filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <Search size={36} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-semibold text-base">პროდუქტები არ მოიძებნა</p>
              <p className="text-slate-300 dark:text-slate-600 text-sm mt-1">სცადე სხვა საძიებო სიტყვა</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const BarcodeScannerScreen = ({ setScreen, setSelectedProduct }: { setScreen: (s: Screen) => void, setSelectedProduct: (p: Product) => void }) => {
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [lastScanned, setLastScanned] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lookingUp = useRef(false);
  const quaggaStarted = useRef(false);

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
        setError(`ბარკოდის ძებნა ვერ მოხერხდა: ${code}`);
      })
      .finally(() => { setSearching(false); lookingUp.current = false; });
  }, [setSelectedProduct, setScreen]);

  useEffect(() => {
    let mounted = true;
    let detected = false;

    const startQuagga = async () => {
      const Quagga = (await import('@ericblade/quagga2')).default;
      if (!mounted) return;

      Quagga.init({
        inputStream: {
          name: 'Live',
          type: 'LiveStream',
          target: document.getElementById('barcode-reader')!,
          constraints: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        decoder: {
          readers: ['ean_reader', 'ean_8_reader', 'upc_reader', 'upc_e_reader', 'code_128_reader'],
          multiple: false,
        },
        locate: true,
        frequency: 20,
      }, (err: Error | null) => {
        if (err || !mounted) {
          // Try user-facing camera
          Quagga.init({
            inputStream: {
              name: 'Live',
              type: 'LiveStream',
              target: document.getElementById('barcode-reader')!,
              constraints: {
                facingMode: 'user',
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              },
            },
            decoder: {
              readers: ['ean_reader', 'ean_8_reader', 'upc_reader', 'upc_e_reader', 'code_128_reader'],
              multiple: false,
            },
            locate: true,
            frequency: 20,
          }, (err2: Error | null) => {
            if (err2 || !mounted) {
              if (mounted) setError('კამერაზე წვდომა ვერ მოხერხდა');
              return;
            }
            Quagga.start();
            quaggaStarted.current = true;
          });
          return;
        }
        Quagga.start();
        quaggaStarted.current = true;
      });

      Quagga.onDetected((result: { codeResult?: { code?: string } }) => {
        if (detected || !mounted) return;
        const code = result?.codeResult?.code;
        if (!code || code.length < 8) return;
        detected = true;
        Quagga.stop();
        quaggaStarted.current = false;
        setScanning(false);
        lookupBarcode(code);
      });
    };

    startQuagga();

    return () => {
      mounted = false;
      import('@ericblade/quagga2').then(m => {
        try { if (quaggaStarted.current) m.default.stop(); } catch(_e) { /* */ }
      });
    };
  }, [lookupBarcode]);

  const captureAndScan = async () => {
    const container = document.getElementById('barcode-reader');
    const video = container?.querySelector('video');
    if (!video) return;
    setError(null);

    const w = video.videoWidth;
    const h = video.videoHeight;
    const Quagga = (await import('@ericblade/quagga2')).default;

    // Try multiple image processing approaches
    const attempts = [
      { crop: false, threshold: 0 },      // raw image
      { crop: true, threshold: 0 },        // center crop
      { crop: false, threshold: 128 },     // B&W threshold
      { crop: true, threshold: 128 },      // center crop + B&W
      { crop: false, threshold: 100 },     // lower threshold
      { crop: true, threshold: 160 },      // higher threshold
    ];

    for (const attempt of attempts) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      if (attempt.crop) {
        // Crop center 60% of image
        const cw = Math.floor(w * 0.7);
        const ch = Math.floor(h * 0.5);
        const cx = Math.floor((w - cw) / 2);
        const cy = Math.floor((h - ch) / 2);
        canvas.width = cw;
        canvas.height = ch;
        ctx.drawImage(video, cx, cy, cw, ch, 0, 0, cw, ch);
      } else {
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(video, 0, 0);
      }

      // Apply B&W thresholding if specified
      if (attempt.threshold > 0) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imageData.data;
        for (let i = 0; i < d.length; i += 4) {
          const gray = d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114;
          const val = gray > attempt.threshold ? 255 : 0;
          d[i] = d[i+1] = d[i+2] = val;
        }
        ctx.putImageData(imageData, 0, 0);
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
      const code = await new Promise<string | null>((resolve) => {
        Quagga.decodeSingle({
          src: dataUrl,
          numOfWorkers: 0,
          decoder: { readers: ['ean_reader', 'ean_8_reader', 'upc_reader', 'upc_e_reader', 'code_128_reader'] },
          locate: true,
        }, (result) => {
          resolve(result?.codeResult?.code || null);
        });
      });

      if (code && code.length >= 8) {
        import('@ericblade/quagga2').then(m => {
          try { if (quaggaStarted.current) { m.default.stop(); quaggaStarted.current = false; } } catch(_e) { /* */ }
        });
        setScanning(false);
        lookupBarcode(code);
        return;
      }
    }

    // All attempts failed — also try html5-qrcode on the raw frame
    try {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(video, 0, 0);
      const blob = await new Promise<Blob>((r) => canvas.toBlob(b => r(b!), 'image/jpeg', 1.0));
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      const scanner = new Html5Qrcode('barcode-reader-file', {
        formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.UPC_A],
        verbose: false,
      });
      const decoded = await scanner.scanFile(file, false);
      if (decoded) {
        import('@ericblade/quagga2').then(m => {
          try { if (quaggaStarted.current) { m.default.stop(); quaggaStarted.current = false; } } catch(_e) { /* */ }
        });
        setScanning(false);
        lookupBarcode(decoded);
        return;
      }
    } catch(_e) { /* */ }

    setError('ბარკოდი ვერ ამოიცნო. სცადე კამერა პირდაპირ ბარკოდზე მიუშვირო.');
    setTimeout(() => setError(null), 4000);
  };

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (code.length < 8 || searching) return;
    import('@ericblade/quagga2').then(m => {
      try { if (quaggaStarted.current) { m.default.stop(); quaggaStarted.current = false; } } catch(_e) { /* */ }
    });
    setScanning(false);
    lookupBarcode(code);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    import('@ericblade/quagga2').then(m => {
      try { if (quaggaStarted.current) { m.default.stop(); quaggaStarted.current = false; } } catch(_e) { /* */ }
    });
    setScanning(false);
    const scanner = new Html5Qrcode('barcode-reader-file', {
      formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.UPC_A],
      verbose: false,
    });
    scanner.scanFile(file, false)
      .then(decodedText => lookupBarcode(decodedText))
      .catch(() => setError('ბარკოდი ვერ ამოიცნო ფოტოდან'));
  };

  const retry = () => {
    setNotFound(false);
    setError(null);
    setScanning(true);
    setSearching(false);
    lookingUp.current = false;
    setScreen('home');
    setTimeout(() => setScreen('scanner'), 50);
  };

  return (
    <div className="pb-24 pt-14 px-5 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setScreen('home')} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <ArrowLeft size={20} className="text-slate-700 dark:text-slate-300" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">ბარკოდის სკანერი</h1>
      </div>

      <div id="barcode-reader-file" className="hidden" />
      <div className="rounded-2xl overflow-hidden bg-black relative">
        <div id="barcode-reader" className="w-full [&>video]:w-full [&>canvas]:absolute [&>canvas]:top-0 [&>canvas]:left-0" />

        {/* Scanning laser line */}
        {scanning && !error && !scanSuccess && (
          <>
            <div className="absolute inset-0 pointer-events-none border-2 border-white/20 rounded-2xl" />
            <div className="absolute left-4 right-4 h-0.5 bg-red-500 pointer-events-none animate-[scanline_2s_ease-in-out_infinite]"
              style={{ boxShadow: '0 0 8px 2px rgba(239,68,68,0.6), 0 0 20px 4px rgba(239,68,68,0.3)' }} />
            {/* Corner markers */}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-white/70 rounded-tl pointer-events-none" />
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-white/70 rounded-tr pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-white/70 rounded-bl pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-white/70 rounded-br pointer-events-none" />
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <span className="bg-black/60 text-white text-xs px-4 py-2 rounded-full">
                მიმართე კამერა ბარკოდისკენ
              </span>
            </div>
          </>
        )}

        {/* Success flash */}
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
      `}</style>

      {/* Capture & scan button */}
      {scanning && (
        <button
          onClick={captureAndScan}
          className="mt-4 w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl font-bold text-base"
        >
          <Camera size={20} />
          გადაღება და სკანირება
        </button>
      )}

      {/* File upload option */}
      <div className="mt-3 flex gap-3">
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm"
        >
          <Camera size={18} />
          ფოტოს ატვირთვა
        </button>
      </div>

      {/* Manual barcode input */}
      <div className="mt-4">
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="ბარკოდის ნომერი (მაგ. 5449000133335)"
            value={manualCode}
            onChange={e => setManualCode(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
            className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-sm placeholder:text-slate-400"
          />
          <button
            onClick={handleManualSubmit}
            disabled={manualCode.trim().length < 8 || searching}
            className="px-5 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-semibold text-sm disabled:opacity-40"
          >
            {searching ? '...' : 'ძებნა'}
          </button>
        </div>
      </div>

      {searching && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-900 dark:border-t-white rounded-full animate-spin" />
            <span className="text-sm text-slate-600 dark:text-slate-300">იძებნება: {lastScanned}...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 text-center">
          <p className="text-red-500 font-medium mb-3">{error}</p>
          <button onClick={retry} className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-semibold text-sm">
            თავიდან ცდა
          </button>
        </div>
      )}

      {notFound && (
        <div className="mt-6 text-center">
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-3">პროდუქტი ვერ მოიძებნა{lastScanned ? ` (${lastScanned})` : ''}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={retry} className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-semibold text-sm">
              თავიდან სკანირება
            </button>
            <button onClick={() => setScreen('home')} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm">
              უკან
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const CompareScreen = ({ selectedProduct, setScreen, darkMode, setDarkMode, basket, setBasket, setTargetStore }: { selectedProduct: Product | null, setScreen: (s: Screen) => void, darkMode: boolean, setDarkMode: (v: boolean) => void, basket: Product[], setBasket: React.Dispatch<React.SetStateAction<Product[]>>, setTargetStore: (s: string | null) => void }) => {
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [targetPrice, setTargetPrice] = useState('2.20');
  const [compareData, setCompareData] = useState<{ stores: StorePrice[]; priceTrend?: 'up' | 'down' } | null>(null);
  const [priceHistory, setPriceHistory] = useState<{ store: string; price: number; date: string }[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  const product = selectedProduct || FALLBACK_PRODUCTS[0];
  const isInBasket = basket.find(item => item.id === product.id);

  useEffect(() => {
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
      .catch(() => {});

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
    .filter(s => s.price !== null && s.price > 0)
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
      setTimeout(() => setToastProduct(null), 1500);
    }
  };

  return (
    <div className="pb-24 pt-14 px-5 min-h-screen">
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

      <Header title="შედარება" showBack onBack={() => setScreen('home')} darkMode={darkMode} setDarkMode={setDarkMode} />

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
              {bestPrice && <span className="text-xs text-slate-400 font-normal">საუკეთესო</span>}
              {(compareData?.priceTrend || product.priceTrend) && (
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  (compareData?.priceTrend || product.priceTrend) === 'down'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400'
                }`}>
                  {(compareData?.priceTrend || product.priceTrend) === 'down'
                    ? <><TrendingDown size={10} /> გაიაფდა</>
                    : <><TrendingUp size={10} /> გაძვირდა</>}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2.5 mt-4">
          <button
            onClick={() => setShowAlertModal(true)}
            className="flex-1 flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 text-sm font-medium bg-slate-50 dark:bg-slate-800 px-4 py-3.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Bell size={16} />
            ალერტი
          </button>
          <button
            onClick={toggleBasket}
            className={`flex-1 flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3.5 rounded-xl transition-colors ${
              isInBasket
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <ShoppingBasket size={16} />
            {isInBasket ? 'კალათაშია' : 'კალათაში'}
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
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-100 dark:border-slate-800"
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">ფასის ალერტი</h3>
              <p className="text-slate-400 text-xs mb-5">შეგატყობინებთ ფასის ჩამოსვლისას</p>

              <div className="mb-6">
                <label className="text-[11px] font-medium text-slate-400 mb-2 block">სასურველი ფასი (₾)</label>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-xl py-3.5 px-4 text-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 transition-all"
                  placeholder="2.20"
                />
              </div>

              <button
                onClick={() => setShowAlertModal(false)}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3.5 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
              >
                ალერტის გააქტიურება
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Store prices */}
      <div className="space-y-2.5">
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">ფასები მაღაზიებში</h3>
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
                {idx === 0 && <span className="text-[12px] text-emerald-600 dark:text-emerald-400 font-semibold block">ყველაზე იაფი</span>}
              </div>
            </div>
            <div className="text-right">
              <p className={`font-bold text-lg ${idx === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{item.price?.toFixed(2)}₾</p>
              {item.delta && item.delta > 0 && <p className="text-[12px] text-slate-400 font-medium">+{item.delta.toFixed(2)}₾</p>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Price History */}
      {priceHistory.length > 1 && (() => {
        const stores = Array.from(new Set(priceHistory.map(h => h.store))) as string[];
        const storeColors: Record<string, string> = { 'SPAR': '#00703C', '2 Nabiji': '#EE3124', 'Goodwill': '#0054A6' };
        const sorted = [...priceHistory].sort((a, b) => a.date.localeCompare(b.date));
        const allPrices = sorted.map(h => h.price);
        const minP = Math.min(...allPrices);
        const maxP = Math.max(...allPrices);
        const range = maxP - minP || 1;
        const W = 300, H = 80, pad = 8;

        return (
          <div className="mt-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-400 mb-3">ფასის ისტორია</h3>
            <svg viewBox={`0 0 ${W} ${H + 15}`} className="w-full">
              {stores.map(store => {
                const pts = sorted.filter(h => h.store === store);
                if (pts.length < 2) return null;
                const path = pts.map((p, i) => {
                  const x = pad + (i / (pts.length - 1)) * (W - pad * 2);
                  const y = pad + (1 - (p.price - minP) / range) * (H - pad * 2);
                  return `${i === 0 ? 'M' : 'L'}${x},${y}`;
                }).join(' ');
                return <path key={store} d={path} fill="none" stroke={storeColors[store] || '#888'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />;
              })}
            </svg>
            <div className="flex gap-4 mt-1 justify-center">
              {stores.map(store => (
                <div key={store} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: storeColors[store] || '#888' }} />
                  <span className="text-[10px] text-slate-400">{store}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="mt-8 grid grid-cols-2 gap-3">
        <button
          onClick={() => { setTargetStore(bestPrice?.store || null); setScreen('map'); }}
          className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <MapIcon size={18} />
          რუკაზე ნახვა
        </button>
        <button className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
          <ExternalLink size={18} />
          საიტზე
        </button>
      </div>
    </div>
  );
};

// Map components - reuse from original
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

const createPulsingIcon = (color: string, label?: string) => L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div class="flex flex-col items-center">
      <div class="w-3.5 h-3.5 bg-${color} rounded-full border-2 border-white shadow-md"></div>
      ${label ? `<div class="mt-0.5 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[7px] font-semibold text-slate-700 whitespace-nowrap">${label}</div>` : ''}
    </div>
  `,
  iconSize: [24, 36],
  iconAnchor: [12, 18],
});

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

const MapScreen = ({ setScreen, darkMode, setDarkMode, targetStore, setTargetStore, selectedProduct }: { setScreen: (s: Screen) => void, darkMode: boolean, setDarkMode: (v: boolean) => void, targetStore: string | null, setTargetStore: (s: string | null) => void, selectedProduct: Product | null }) => {
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
    fetch(`https://router.project-osrm.org/route/v1/${profile}/${coords.lng},${coords.lat};${selectedBranch.lng},${selectedBranch.lat}?overview=full&geometries=geojson`)
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
              {targetStore ? `უახლოესი ${targetStore}` : 'მაღაზიები ახლოს'}
            </h2>
          </div>
          {!targetStore && nearbyBranches.length > 0 && (
            <span className="text-xs text-slate-400">{nearbyBranches.length} ნაპოვნი</span>
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
              <Marker position={[coords.lat, coords.lng]} icon={createPulsingIcon('cobalt', 'თქვენ')}>
                <Popup>თქვენ აქ ხართ</Popup>
              </Marker>
            </>
          )}
          {nearbyBranches.map((branch, idx) => (
            <Marker key={idx} position={[branch.lat, branch.lng]} icon={createPulsingIcon('emerald', branch.name)} eventHandlers={{ click: () => setSelectedBranch(branch) }}>
              <Popup><p className="font-medium text-xs">{branch.name}</p><p className="text-[10px] text-gray-500">{branch.address}</p></Popup>
            </Marker>
          ))}
          {coords && activeBranch && routeCoords.length > 0 && (
            <Polyline positions={routeCoords} pathOptions={{ color: routeMode === 'foot' ? '#10B981' : '#3B82F6', weight: 4, opacity: 0.7 }} />
          )}
        </MapContainer>
      </div>

      {/* Bottom panel */}
      <div className="absolute bottom-24 left-5 right-5 pointer-events-none z-20">
        {activeBranch ? (
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-900 dark:text-white px-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 pointer-events-auto">
            <p className="font-semibold text-sm">{activeBranch.name}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{activeBranch.address}</p>

            {selectedBranch && (
              <>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setRouteMode('foot')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-colors ${routeMode === 'foot' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <Footprints size={13} /> ფეხით
                  </button>
                  <button onClick={() => setRouteMode('driving')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-colors ${routeMode === 'driving' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <Car size={13} /> მანქანით
                  </button>
                </div>

                {routeLoading ? (
                  <div className="flex items-center justify-center gap-2 py-2 mt-2">
                    <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                    <span className="text-[11px] text-slate-400">მარშრუტი...</span>
                  </div>
                ) : routeInfo ? (
                  <div className="flex items-center gap-4 mt-2.5">
                    <span className="text-sm font-bold">{formatDist(routeInfo.distance)}</span>
                    <span className="text-sm text-slate-400">{formatTime(routeInfo.duration)}</span>
                  </div>
                ) : null}

                <div className="flex gap-2 mt-3">
                  <button onClick={() => { setSelectedBranch(null); setRouteCoords([]); setRouteInfo(null); }}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 py-2.5 rounded-lg text-[11px] font-medium">
                    დახურვა
                  </button>
                  <button onClick={() => { window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeBranch.lat},${activeBranch.lng}&travelmode=${routeMode === 'foot' ? 'walking' : 'driving'}`, '_blank'); }}
                    className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-2.5 rounded-lg text-[11px] font-medium">
                    Google Maps
                  </button>
                </div>
              </>
            )}

            {!selectedBranch && (
              <button onClick={() => setSelectedBranch(activeBranch)}
                className="w-full mt-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-2.5 rounded-lg font-medium text-xs">
                მარშრუტის ჩვენება
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 inline-block pointer-events-auto">
            <p className="text-xs text-slate-500">აირჩიეთ მაღაზია</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ProfileScreen = ({ setScreen, darkMode, setDarkMode }: { setScreen: (s: Screen) => void, darkMode: boolean, setDarkMode: (v: boolean) => void }) => (
  <div className="pb-24 pt-14 px-5 min-h-screen">
    <Header title="პროფილი" darkMode={darkMode} setDarkMode={setDarkMode} />
    <div className="flex items-center gap-4 mb-10 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
      <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
        <User size={28} />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">მარიამი</h2>
        <p className="text-xs text-slate-400">Premium წევრი</p>
      </div>
    </div>
    <div className="space-y-2">
      {[
        { label: 'შეტყობინებები', icon: Bell, id: 'alerts' },
        { label: 'ჩემი კალათა', icon: ShoppingBasket, id: 'basket' },
        { label: 'პარამეტრები', icon: Settings, id: 'profile' },
        { label: 'დახმარება', icon: Info, id: 'profile' },
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
  </div>
);

const BasketScreen = ({ setScreen, darkMode, setDarkMode, basket, setBasket, setTargetStore }: { setScreen: (s: Screen) => void, darkMode: boolean, setDarkMode: (v: boolean) => void, basket: Product[], setBasket: React.Dispatch<React.SetStateAction<Product[]>>, setTargetStore: (s: string | null) => void }) => {
  const [viewStore, setViewStore] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);

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
    <div className="pb-24 pt-14 px-5 min-h-screen">
      <Header title="კალათა" darkMode={darkMode} setDarkMode={setDarkMode} />

      {basket.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBasket size={36} className="text-slate-200 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-slate-900 dark:text-white font-semibold">კალათა ცარიელია</p>
          <p className="text-slate-400 text-xs mt-1">დაამატე პროდუქტები შედარებისთვის</p>
          <button onClick={() => setScreen('home')}
            className="mt-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-xl font-medium text-xs">
            პროდუქტების დამატება
          </button>
        </div>
      ) : (
        <>
          {/* Store tabs */}
          <div className="space-y-2 mb-6">
            <h3 className="text-xs font-semibold text-slate-400 mb-2">აირჩიე მაღაზია</h3>
            {storeTotals.map((item, idx) => (
              <button key={item.store} onClick={() => setViewStore(item.store)}
                className={`w-full p-3.5 rounded-xl transition-colors flex items-center justify-between border ${
                  item.store === activeStore
                    ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                }`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
                    <SmartImage filename={STORE_CONFIG[item.store]?.filename || ''} alt={item.store}
                      className="w-full h-full object-contain p-0.5" fallbackLetter={STORE_CONFIG[item.store]?.letter}
                      fallbackColor={STORE_CONFIG[item.store]?.color} isLogo storeName={item.store} />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">{item.store}</span>
                    <span className={`text-[10px] block ${item.hasAll ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {item.availableCount}/{basket.length} პროდუქტი
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 dark:text-white">{item.total.toFixed(2)}₾</span>
                  {idx === 0 ? (
                    <span className="text-[10px] text-emerald-500 block">ყველაზე იაფი</span>
                  ) : (
                    <span className="text-[10px] text-slate-400 block">+{(item.fullCost - storeTotals[0].fullCost).toFixed(2)}₾</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Products */}
          <div className="space-y-2 mb-6">
            <h3 className="text-xs font-semibold text-slate-400 mb-2">{activeStore}-ში</h3>
            {basket.map((item) => {
              const price = item.prices[activeStore];
              const available = price > 0;
              const altStore = !available
                ? Object.entries(item.prices)
                    .filter(([s, p]) => s !== activeStore && p > 0)
                    .sort((a, b) => a[1] - b[1])[0] || null
                : null;
              return (
                <div key={item.id} className={`p-3 rounded-xl border flex items-center gap-3 ${available ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800' : 'bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900/20'}`}>
                  <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    <SmartImage filename="" imageUrl={item.image} alt={item.name}
                      className="w-full h-full object-contain p-0.5" fallbackLetter={item.name[0]} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium text-sm truncate ${available ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{item.name}</h4>
                    <p className="text-[10px] text-slate-400">{item.size}</p>
                    {!available && altStore && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{altStore[0]}-ში {(altStore[1] as number).toFixed(2)}₾</p>
                    )}
                  </div>
                  <span className={`font-semibold text-sm flex-shrink-0 ${available ? 'text-slate-900 dark:text-white' : 'text-red-400 text-xs'}`}>
                    {available ? `${price.toFixed(2)}₾` : 'არ არის'}
                  </span>
                  <button onClick={() => setBasket(basket.filter(p => p.id !== item.id))}
                    className="text-slate-300 hover:text-red-400 p-1 flex-shrink-0">
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="bg-slate-900 dark:bg-slate-800 rounded-2xl p-5 text-white">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                  {activeStore === bestStore?.store ? 'საუკეთესო არჩევანი' : 'არჩეული'}
                </span>
                <h4 className="text-lg font-bold mt-0.5">{activeStore}</h4>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">ჯამი</span>
                <p className="text-2xl font-bold">{activeStoreData?.total.toFixed(2)}₾</p>
              </div>
            </div>
            {activeStoreData && !activeStoreData.hasAll && (
              <p className="text-xs text-slate-400 mb-3">{basket.length - activeStoreData.availableCount} ნივთი არ არის ამ მაღაზიაში</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setTargetStore(activeStore); setScreen('map'); }}
                className="flex-1 bg-white text-slate-900 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
                <Navigation size={16} />
                მაჩვენე გზა
              </button>
              <button
                onClick={() => {
                  const lines = basket.map(item => {
                    const price = item.prices[activeStore];
                    return `${item.name}${item.size ? ' ' + item.size : ''} — ${price > 0 ? price.toFixed(2) + '₾' : 'არ არის'}`;
                  });
                  const text = `🛒 საყიდლების სია (${activeStore})\n\n${lines.join('\n')}\n\nჯამი: ${activeStoreData?.total.toFixed(2)}₾\n\n— SHEADARE`;
                  if (navigator.share) {
                    navigator.share({ title: 'საყიდლების სია', text }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(text).then(() => {
                      alert('სია დაკოპირდა!');
                    });
                  }
                }}
                className="w-12 bg-slate-700 dark:bg-slate-700 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center active:scale-[0.98] transition-transform"
              >
                <Share2 size={16} />
              </button>
              <button
                onClick={generateQR}
                className="w-12 bg-slate-700 dark:bg-slate-700 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center active:scale-[0.98] transition-transform"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="8" height="8" rx="1" /><rect x="14" y="2" width="8" height="8" rx="1" /><rect x="2" y="14" width="8" height="8" rx="1" />
                  <path d="M14 14h2v2h-2zM20 14h2v2h-2zM14 20h2v2h-2zM20 20h2v2h-2zM17 17h2v2h-2z" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQR && qrImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQR(false)}
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
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 text-center">QR კოდი</h3>
              <p className="text-xs text-slate-400 text-center mb-5">დაასკანერე კალათის გასაზიარებლად</p>
              <div className="flex justify-center mb-5">
                <img src={qrImage} alt="QR Code" className="w-48 h-48 rounded-xl" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const ids = basket.map(item => item.id).join(',');
                    const url = `${window.location.origin}?basket=${ids}`;
                    navigator.clipboard.writeText(url).then(() => alert('ლინკი დაკოპირდა!'));
                  }}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-medium text-sm active:scale-[0.98] transition-transform"
                >
                  ლინკის კოპირება
                </button>
                <button
                  onClick={() => {
                    const ids = basket.map(item => item.id).join(',');
                    const url = `${window.location.origin}?basket=${ids}`;
                    if (navigator.share) {
                      navigator.share({ title: 'SHEADARE კალათა', url }).catch(() => {});
                    }
                  }}
                  className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
                >
                  გაზიარება
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AlertsScreen = ({ setScreen, darkMode, setDarkMode }: { setScreen: (s: Screen) => void, darkMode: boolean, setDarkMode: (v: boolean) => void }) => (
  <div className="pb-24 pt-14 px-5 min-h-screen">
    <Header title="შეტყობინებები" showBack onBack={() => setScreen('profile')} darkMode={darkMode} setDarkMode={setDarkMode} />
    <div className="space-y-6">
      <section>
        <h3 className="text-xs font-semibold text-slate-400 mb-3">აქტიური ალერტები</h3>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <Bell size={18} className="text-slate-400 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">ლუდი ყაზბეგი</h4>
            <p className="text-[10px] text-slate-400">სამიზნე: 2.20₾</p>
          </div>
          <button className="text-[10px] font-medium text-red-400">წაშლა</button>
        </div>
      </section>
      <section>
        <h3 className="text-xs font-semibold text-slate-400 mb-3">ისტორია</h3>
        <div className="space-y-2">
          {[
            { title: 'ფასის კლება!', desc: 'ლუდი ყაზბეგი ახლა 2.40₾ ღირს 2 ნაბიჯში', time: '10 წთ წინ', type: 'price' },
            { title: 'ახალი აქცია', desc: 'SPAR-ში დაიწყო კვირეული, -20% ქეშბექი', time: '1 სთ წინ', type: 'promo' },
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

// --- Chat Screen ---
const ChatScreen = ({ setScreen, darkMode, setDarkMode, basket, setBasket, setSelectedProduct }: {
  setScreen: (s: Screen) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  basket: Product[];
  setBasket: React.Dispatch<React.SetStateAction<Product[]>>;
  setSelectedProduct: (p: Product) => void;
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'გამარჯობა! მე ვარ შეადარე-ს AI ასისტენტი. დამიწერე რა პროდუქტები გაინტერესებს და მოვძებნი საუკეთესო ფასებს! 🛒',
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
      text: text.trim() || 'ფოტოთი ძებნა',
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
        text: 'კავშირის შეცდომა. სცადე თავიდან.',
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
      <div className="px-5">
        <Header title="AI ასისტენტი" showBack onBack={() => setScreen('home')} darkMode={darkMode} setDarkMode={setDarkMode} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${msg.role === 'user' ? '' : ''}`}>
              {/* Message bubble */}
              <div className={`rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-br-md'
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
                    const priceEntries = Object.entries(product.prices).filter(([, p]) => (p as number) > 0).sort((a, b) => (a[1] as number) - (b[1] as number));
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
                          <div key={store} className={`text-[11px] ${i === 0 ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
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
                              : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                          }`}
                        >
                          {isInBasket ? 'კალათაშია' : '+ კალათა'}
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
                      className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg text-[12px] font-semibold active:scale-95 transition-transform"
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
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0 active:scale-90 transition-transform"
          >
            <ImagePlus size={20} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="დაწერე რა გაინტერესებს..."
            className="flex-1 bg-white dark:bg-slate-800 rounded-xl py-3 px-4 text-[14px] font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-600"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || (!input.trim())}
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90 ${
              input.trim() && !loading
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
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
      'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
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
  }
): string | null {
  const t = text.toLowerCase().trim();

  // --- Navigation ---
  if (/^(მთავარი|სახლ|სახლში|დასაწყის|home)/.test(t)) {
    actions.setScreen('home');
    return 'მთავარი გვერდი';
  }
  if (/^(კალათა|კალათ|basket|cart)/.test(t)) {
    actions.setScreen('basket');
    return 'კალათა';
  }
  if (/^(რუკა|მეფ|map|რუკაზე)/.test(t)) {
    actions.setTargetStore(null);
    actions.setScreen('map');
    return 'რუკა';
  }
  if (/^(პროფილი|profile|ანგარიშ|ჩემი)/.test(t)) {
    actions.setScreen('profile');
    return 'პროფილი';
  }
  if (/^(შეტყობინებ|ალერტ|notification)/.test(t)) {
    actions.setScreen('alerts');
    return 'შეტყობინებები';
  }
  if (/^(უკან|back|დაბრუნება)/.test(t)) {
    actions.setScreen('home');
    return 'უკან';
  }

  // --- Dark/Light Mode ---
  if (/(ბნელი|ღამის|dark|მუქი)/.test(t)) {
    actions.setDarkMode(true);
    return 'ღამის რეჟიმი';
  }
  if (/(ნათელი|დღის|light|თეთრ)/.test(t)) {
    actions.setDarkMode(false);
    return 'ნათელი რეჟიმი';
  }

  // --- Categories ---
  const categoryMap: Record<string, string> = {
    'ყველა': 'ყველა', 'რძე': 'რძე', 'ხორცი': 'ხორცი', 'ხორც': 'ხორცი',
    'პური': 'პური', 'ხილი': 'ხილი', 'სასმელი': 'სასმელი', 'ლუდი': 'ლუდი',
    'ტკბილეული': 'ტკბილეული', 'სნექი': 'სნექი', 'ყავა': 'ყავა/ჩაი',
    'ჩაი': 'ყავა/ჩაი', 'ჰიგიენა': 'ჰიგიენა',
  };
  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (t === keyword || t === `${keyword} კატეგორია` || t === `მაჩვენე ${keyword}`) {
      actions.setScreen('home');
      actions.setSelectedCategory(category);
      return `კატეგორია: ${category}`;
    }
  }

  // --- Basket actions ---
  if (/(დაამატე|კალათაში დაამატე|ჩაამატე)/.test(t)) {
    if (actions.products.length > 0) {
      const product = actions.products[0];
      if (!actions.basket.find(b => b.id === product.id)) {
        actions.setBasket(prev => [...prev, product]);
        return `${product.name} კალათაში დაემატა`;
      }
      return `${product.name} უკვე კალათაშია`;
    }
    return 'პროდუქტი ვერ მოიძებნა';
  }
  if (/(კალათა გაასუფთავე|წაშალე ყველა|კალათა წაშალე|გაასუფთავე)/.test(t)) {
    actions.setBasket([]);
    return 'კალათა გასუფთავდა';
  }

  // --- Store on map ---
  if (/(სპარი|spar)/.test(t) && /(რუკა|მაჩვენე|სადაა|სად არის|უახლოეს)/.test(t)) {
    actions.setTargetStore('SPAR');
    actions.setScreen('map');
    return 'უახლოესი SPAR რუკაზე';
  }
  if (/(ნაბიჯი|nabiji|2 ნაბიჯ)/.test(t) && /(რუკა|მაჩვენე|სადაა|სად არის|უახლოეს)/.test(t)) {
    actions.setTargetStore('2 Nabiji');
    actions.setScreen('map');
    return 'უახლოესი 2 Nabiji რუკაზე';
  }
  if (/(გუდვილ|goodwill)/.test(t) && /(რუკა|მაჩვენე|სადაა|სად არის|უახლოეს)/.test(t)) {
    actions.setTargetStore('Goodwill');
    actions.setScreen('map');
    return 'უახლოესი Goodwill რუკაზე';
  }

  // --- Fallback: treat as search ---
  if (t.length >= 2) {
    actions.setScreen('home');
    actions.setSearchQuery(t);
    return `ძიება: ${t}`;
  }

  return null;
}

export default function App() {
  const [currentScreen, setScreen] = useState<Screen>('home');
  const [darkMode, setDarkMode] = useState(false);
  const [basket, setBasket] = useState<Product[]>(() => {
    try { const saved = localStorage.getItem('pasebi-basket'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [targetStore, setTargetStore] = useState<string | null>(null);

  // Splash & onboarding
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('pasebi-onboarded'));

  // Favorites
  const [favorites, setFavorites] = useState<Product[]>(() => {
    try { const saved = localStorage.getItem('pasebi-favorites'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

  // Global voice state
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceToast, setVoiceToast] = useState<{ text: string; type: 'command' | 'listening' | 'error' } | null>(null);
  // Shared state for voice → HomeScreen communication
  const [voiceSearchQuery, setVoiceSearchQuery] = useState<string | null>(null);
  const [voiceCategory, setVoiceCategory] = useState<string | null>(null);
  const [voiceProducts, setVoiceProducts] = useState<Product[]>([]);

  // Splash auto-dismiss
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
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
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const showToast = (text: string, type: 'command' | 'listening' | 'error' = 'command') => {
    setVoiceToast({ text, type });
    setTimeout(() => setVoiceToast(null), 2000);
  };

  const startVoiceCommand = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { showToast('ხმოვანი ძიება მიუწვდომელია', 'error'); return; }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ka-GE';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setVoiceListening(true);
      showToast('მოუსმენს...', 'listening');
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
      });
      if (result) {
        showToast(result, 'command');
      } else {
        showToast(`"${text}" - ვერ გავიგე`, 'error');
      }
    };

    recognition.onerror = () => {
      setVoiceListening(false);
      showToast('ვერ მოისმინა', 'error');
    };
    recognition.onend = () => setVoiceListening(false);
    recognition.start();
  };

  const renderScreen = () => {
    const props = { setScreen, darkMode, setDarkMode, basket, setBasket };
    const homeProps = { ...props, favorites, setFavorites, setSelectedProduct, voiceSearchQuery, setVoiceSearchQuery, voiceCategory, setVoiceCategory, onProductsLoaded: setVoiceProducts };
    switch (currentScreen) {
      case 'home': return <HomeScreen {...homeProps} />;
      case 'compare': return <CompareScreen {...props} selectedProduct={selectedProduct} setTargetStore={setTargetStore} />;
      case 'map': return <MapScreen {...props} targetStore={targetStore} setTargetStore={setTargetStore} selectedProduct={selectedProduct} />;
      case 'profile': return <ProfileScreen {...props} />;
      case 'basket': return <BasketScreen {...props} setTargetStore={setTargetStore} />;
      case 'alerts': return <AlertsScreen {...props} />;
      case 'scanner': return <BarcodeScannerScreen setScreen={setScreen} setSelectedProduct={setSelectedProduct} />;
      case 'chat': return <ChatScreen {...props} setSelectedProduct={setSelectedProduct} />;
      default: return <HomeScreen {...homeProps} />;
    }
  };

  return (
    <div className="max-w-md mx-auto bg-slate-50 dark:bg-slate-950 min-h-screen relative">
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
            >
              {renderScreen()}
            </motion.div>
          </AnimatePresence>

          {/* Voice toast */}
          <AnimatePresence>
            {voiceToast && <VoiceToast text={voiceToast.text} type={voiceToast.type} />}
          </AnimatePresence>

          {/* Floating buttons */}
          {currentScreen !== 'map' && currentScreen !== 'chat' && (
            <>
              {/* AI Chat button */}
              <button
                onClick={() => setScreen('chat')}
                className="fixed bottom-[8.5rem] right-5 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
              >
                <Sparkles size={20} className="text-white" />
              </button>
              {/* Voice mic button */}
              <button
                onClick={startVoiceCommand}
                className={`fixed bottom-[5.5rem] right-5 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 ${
                  voiceListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                }`}
              >
                <Mic size={20} />
              </button>
            </>
          )}

          <BottomNav active={currentScreen} setScreen={setScreen} onMapTap={() => setTargetStore(null)} basketCount={basket.length} />
        </>
      )}
    </div>
  );
}
