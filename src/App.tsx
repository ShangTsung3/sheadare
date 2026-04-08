import React, { useState, useEffect } from 'react';
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
  Sparkles,
  X,
  Mic,
  MicOff,
  Car,
  Footprints,
  Flame,
  BadgePercent
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, StorePrice, Product } from './types';

// --- Image Assets ---
const getStoreLogo = (name: string, color: string) => 
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color.replace('bg-[#', '').replace(']', '')}&color=fff&bold=true&font-size=0.5`;

const STORE_CONFIG: Record<string, { color: string, letter: string, filename: string, logo: string }> = {
  'SPAR': { color: 'bg-[#00703C]', letter: 'S', filename: '1.spar', logo: 'https://static.spargeorgia.com/Spar_files/d019aa0c-1a0e-45f2-ae4c-cd8734e69f59_Thumb.png' },
  '2 Nabiji': { color: 'bg-[#EE3124]', letter: '2', filename: '2. 2 nabiji', logo: 'https://2nabiji.ge/2-nabiji-logo.png' },
  'Goodwill': { color: 'bg-[#0054A6]', letter: 'G', filename: '3. Goodwill', logo: 'https://static.goodwill.ge/Goodwill_files/28402b34-5b3f-4e50-825a-d9827094769c_Thumb.png' },
};

const KAZBEGI_PLACEHOLDER = "https://picsum.photos/seed/beer/400/400";

const SmartImage = ({ filename, alt, className, fallbackLetter, fallbackColor, isLogo, storeName, imageUrl }: { filename: string, alt: string, className?: string, fallbackLetter?: string, fallbackColor?: string, isLogo?: boolean, storeName?: string, imageUrl?: string }) => {
  const storeLogoUrl = isLogo && storeName && STORE_CONFIG[storeName]?.logo;
  const resolvedSrc = imageUrl || storeLogoUrl || (filename ? `/api/images/${encodeURIComponent(filename)}` : '');
  const [src, setSrc] = useState(resolvedSrc);
  const [error, setError] = useState(false);
  const [triedFallback, setTriedFallback] = useState(false);

  // Reset state when source changes
  useEffect(() => {
    setSrc(resolvedSrc);
    setError(false);
    setTriedFallback(false);
  }, [resolvedSrc]);

  const handleError = () => {
    if (!error && !triedFallback && isLogo && storeName) {
      // Logo URL failed, try ui-avatars as second fallback
      setSrc(getStoreLogo(storeName, fallbackColor || 'bg-[#ccc]'));
      setTriedFallback(true);
    } else if (!error) {
      if (filename === '5. ლუდი ყაზბეგი') {
        setSrc(KAZBEGI_PLACEHOLDER);
      }
      setError(true);
    }
  };

  if (error) {
    if (isLogo && fallbackLetter) {
      return (
        <div className={`${className} ${fallbackColor} flex items-center justify-center text-white font-black`}>
          {fallbackLetter}
        </div>
      );
    }
    return (
      <div className={`${className} ${fallbackColor || 'bg-slate-50 dark:bg-slate-800/50'} flex items-center justify-center text-slate-200 dark:text-slate-700`}>
        <ShoppingBasket size={20} strokeWidth={2.5} />
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      onError={handleError}
      referrerPolicy="no-referrer"
    />
  );
};

// --- Components ---

const BottomNav = ({ active, setScreen, onMapTap, basketCount }: { active: Screen, setScreen: (s: Screen) => void, onMapTap?: () => void, basketCount: number }) => {
  const navItems = [
    { id: 'home', icon: Home, label: 'მთავარი' },
    { id: 'basket', icon: ShoppingBasket, label: 'კალათა' },
    { id: 'map', icon: MapIcon, label: 'რუკა' },
    { id: 'profile', icon: User, label: 'პროფილი' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 glass px-6 pt-3 pb-5 flex justify-between items-center z-50 rounded-t-[1.5rem] shadow-[0_-4px_30px_rgba(0,0,0,0.08)]">
      {navItems.map((item) => {
        const isActive = active === item.id || (active === 'compare' && item.id === 'home');
        return (
          <button
            key={item.id}
            onClick={() => { if (item.id === 'map' && onMapTap) onMapTap(); setScreen(item.id as Screen); }}
            className={`transition-all duration-200 relative flex flex-col items-center gap-0.5 min-w-[3.5rem] ${isActive ? 'text-cobalt scale-105' : 'text-slate-300 dark:text-slate-600'}`}
          >
            <div className="relative">
              <item.icon size={21} strokeWidth={isActive ? 2.5 : 1.8} />
              {item.id === 'basket' && basketCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  className="absolute -top-1.5 -right-2.5 min-w-4 h-4 bg-gradient-to-r from-cobalt to-blue-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-1 shadow-lg shadow-cobalt/30"
                >
                  {basketCount}
                </motion.div>
              )}
            </div>
            <span className={`text-[9px] font-semibold ${isActive ? 'text-cobalt' : ''}`}>{item.label}</span>
            {isActive && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute -top-3 w-8 h-1 bg-gradient-to-r from-cobalt to-blue-400 rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

const Header = ({ title, showBack, onBack, darkMode, setDarkMode }: { title: string, showBack?: boolean, onBack?: () => void, darkMode?: boolean, setDarkMode?: (v: boolean) => void }) => (
  <header className="mb-5 flex items-center justify-between">
    <div className="flex items-center gap-3">
      {showBack && (
        <button onClick={onBack} className="p-2 -ml-2 text-ink dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>
      )}
      <h1 className={`text-2xl font-black tracking-tight ${title === 'PaseBI' ? 'bg-gradient-to-r from-cobalt to-emerald bg-clip-text text-transparent' : 'text-ink dark:text-white'}`}>{title}</h1>
    </div>
    {setDarkMode && (
      <button 
        onClick={() => setDarkMode(!darkMode)}
        className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-white/5 text-ink dark:text-white transition-all active:scale-90"
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
    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-cobalt text-white px-5 py-3 rounded-2xl shadow-xl shadow-cobalt/30 flex items-center gap-2"
  >
    <ShoppingBasket size={14} strokeWidth={3} />
    <span className="text-xs font-black">კალათაში დაემატა</span>
  </motion.div>
);

const HomeScreen = ({ setScreen, setSelectedProduct, darkMode, setDarkMode, basket, setBasket }: { setScreen: (s: Screen) => void, setSelectedProduct: (p: Product) => void, darkMode: boolean, setDarkMode: (v: boolean) => void, basket: Product[], setBasket: React.Dispatch<React.SetStateAction<Product[]>> }) => {
  const [selectedCategory, setSelectedCategory] = useState('ყველა');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [listening, setListening] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try { const saved = localStorage.getItem('pasebi-search-history'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ka-GE';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setSearchQuery(text);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  // Debounce search input by 300ms
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

  const CATEGORY_MAP: Record<string, string> = {
    'რძე': 'რძ', 'ხორცი': 'ხორც', 'პური': 'პურ', 'ხილი': 'ხილ',
    'სასმელი': 'სასმელ', 'ლუდი': 'ლუდი', 'ტკბილეული': 'ტკბილ',
    'სნექი': 'სნექ', 'ყავა/ჩაი': 'ყავა', 'ჰიგიენა': 'ჰიგიენ',
  };

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    const catValue = CATEGORY_MAP[selectedCategory];
    if (catValue) params.set('category', catValue);
    // Default "ყველა" view (no search, no category): show only products in all 3 stores
    if (!debouncedQuery && !catValue) params.set('allStores', 'true');
    params.set('limit', '30');

    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/search?${params}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        // Filter out products with no prices (out of stock everywhere)
        const withPrices = (data.results || []).filter((p: Product) => Object.keys(p.prices).length > 0);
        if (withPrices.length > 0) {
          setProducts(withPrices);
        } else if (!debouncedQuery && selectedCategory === 'ყველა') {
          setProducts(FALLBACK_PRODUCTS);
        } else {
          setProducts(withPrices);
        }
      })
      .catch(() => {
        if (!debouncedQuery && selectedCategory === 'ყველა') setProducts(FALLBACK_PRODUCTS);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [debouncedQuery, selectedCategory]);

  const filteredProducts = products;

  const [toastProduct, setToastProduct] = useState<string | null>(null);

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
    <div className="pb-28 pt-12 px-6 min-h-screen">
      <AnimatePresence>{toastProduct && <BasketToast productName={toastProduct} />}</AnimatePresence>
      <Header title="PaseBI" darkMode={darkMode} setDarkMode={setDarkMode} />

      {/* Search */}
      <div className="relative mb-6 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="მოძებნე პროდუქტი..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 dark:text-white focus:ring-2 focus:ring-cobalt/20 focus:border-cobalt/30 transition-all shadow-card"
          />
          {searchFocused && !searchQuery && searchHistory.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 glass-header border border-slate-100 dark:border-white/5 rounded-2xl shadow-xl z-20 overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">ბოლო ძიებები</span>
                <button onClick={() => { setSearchHistory([]); localStorage.removeItem('pasebi-search-history'); }} className="text-[9px] font-bold text-red-400">გასუფთავება</button>
              </div>
              {searchHistory.map((q, i) => (
                <button
                  key={i}
                  onMouseDown={() => setSearchQuery(q)}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Clock size={14} className="text-slate-300" />
                  <span className="text-sm font-bold text-ink dark:text-white">{q}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={startVoiceSearch}
          className={`p-3.5 rounded-2xl border transition-all shadow-card ${listening ? 'bg-red-500 border-red-400 text-white animate-pulse' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 text-slate-400 hover:text-cobalt'}`}
        >
          {listening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
      </div>

      {/* Categories */}
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar mb-6">
        {[
          { name: 'ყველა', emoji: '🛒', value: '' },
          { name: 'რძე', emoji: '🥛', value: 'რძ' },
          { name: 'ხორცი', emoji: '🥩', value: 'ხორც' },
          { name: 'პური', emoji: '🍞', value: 'პურ' },
          { name: 'ხილი', emoji: '🍎', value: 'ხილ' },
          { name: 'სასმელი', emoji: '🥤', value: 'სასმელ' },
          { name: 'ლუდი', emoji: '🍺', value: 'ლუდი' },
          { name: 'ტკბილეული', emoji: '🍫', value: 'ტკბილ' },
          { name: 'სნექი', emoji: '🥜', value: 'სნექ' },
          { name: 'ყავა/ჩაი', emoji: '☕', value: 'ყავა' },
          { name: 'ჰიგიენა', emoji: '🧴', value: 'ჰიგიენ' },
        ].map((cat) => (
          <button
            key={cat.name}
            onClick={() => setSelectedCategory(cat.name)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${selectedCategory === cat.name ? 'bg-gradient-to-r from-cobalt to-blue-500 text-white shadow-lg shadow-cobalt/25' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/5 hover:border-cobalt/20'}`}
          >
            <span>{cat.emoji}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">
            {selectedCategory === 'ყველა' ? 'ყველაზე იაფი ახლა' : selectedCategory}
          </h2>
        </div>

        <div className="space-y-4">
          {loading && filteredProducts.length === 0 && [1,2,3,4,5].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-3xl p-4 flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl skeleton flex-shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="h-4 skeleton rounded-lg w-3/4" />
                <div className="flex gap-1.5">
                  <div className="h-5 skeleton rounded-lg w-14" />
                  <div className="h-5 skeleton rounded-lg w-14" />
                  <div className="h-5 skeleton rounded-lg w-14" />
                </div>
              </div>
              <div className="w-9 h-9 skeleton rounded-xl flex-shrink-0" />
            </div>
          ))}
          {filteredProducts.map((product, idx) => {
            const isInBasket = basket.find(item => item.id === product.id);
            const priceEntries = Object.entries(product.prices).filter(([, p]) => (p as number) > 0).sort((a, b) => (a[1] as number) - (b[1] as number));
            if (priceEntries.length === 0) return null;
            const bestPrice = priceEntries[0][1] as number;
            const worstPrice = priceEntries.length >= 2 ? priceEntries[priceEntries.length - 1][1] as number : bestPrice;
            const savePct = worstPrice > 0 ? Math.round(((worstPrice - bestPrice) / worstPrice) * 100) : 0;

            const badge = priceEntries.length >= 2 && savePct >= 5
              ? savePct >= 30
                ? { label: 'საუკეთესო ფასი', icon: Flame, gradient: 'from-orange-500 to-red-500', shadow: 'shadow-orange-500/25', border: true }
                : savePct >= 15
                  ? { label: 'კარგი ფასი', icon: Sparkles, gradient: 'from-emerald to-teal-400', shadow: 'shadow-emerald/25', border: true }
                  : { label: 'ოდნავ იაფი', icon: BadgePercent, gradient: 'from-cobalt to-blue-400', shadow: 'shadow-cobalt/20', border: false }
              : null;

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => { setSelectedProduct(product); setScreen('compare'); }}
                className={`relative bg-white dark:bg-slate-900 rounded-[1.25rem] p-4 shadow-card cursor-pointer active:scale-[0.98] ${badge?.border ? 'gradient-border' : 'border border-slate-100 dark:border-white/5'}`}
              >
                {badge && (
                  <div className={`absolute -top-2.5 left-4 bg-gradient-to-r ${badge.gradient} text-white text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md ${badge.shadow} flex items-center gap-1`}>
                    <badge.icon size={9} /> {badge.label} · -{savePct}%
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800 flex-shrink-0 border border-slate-100 dark:border-white/5">
                    <SmartImage
                      filename=""
                      imageUrl={product.image}
                      alt={product.name}
                      className="w-full h-full object-contain p-1"
                      fallbackLetter={product.name[0]}
                      fallbackColor="bg-slate-200"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-ink dark:text-white text-sm truncate">{product.name} <span className="text-slate-400 dark:text-slate-600 font-bold ml-1">{product.size}</span></h3>
                    {/* Store price pills */}
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {priceEntries.map(([store, price], i) => (
                        <span key={store} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black ${i === 0 ? 'bg-emerald/10 text-emerald' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                          {STORE_CONFIG[store]?.letter || store[0]}
                          <span>{(price as number).toFixed(2)}₾</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <motion.button
                    onClick={(e) => toggleBasket(e, product)}
                    whileTap={{ scale: 1.2 }}
                    className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isInBasket ? 'bg-cobalt text-white shadow-lg shadow-cobalt/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-300 hover:text-cobalt'}`}
                  >
                    <ShoppingBasket size={16} strokeWidth={isInBasket ? 3 : 2} />
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
          {!loading && filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-5 rounded-full bg-gradient-to-br from-cobalt/5 to-emerald/5 flex items-center justify-center">
                <Search size={36} className="text-cobalt/30" />
              </div>
              <p className="text-slate-400 font-bold text-sm">პროდუქტები არ მოიძებნა</p>
              <p className="text-slate-300 dark:text-slate-600 text-xs mt-1">სცადე სხვა საძიებო სიტყვა</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const CompareScreen = ({ selectedProduct, setScreen, darkMode, setDarkMode, basket, setBasket, setTargetStore }: { selectedProduct: Product | null, setScreen: (s: Screen) => void, darkMode: boolean, setDarkMode: (v: boolean) => void, basket: Product[], setBasket: React.Dispatch<React.SetStateAction<Product[]>>, setTargetStore: (s: string | null) => void }) => {
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [targetPrice, setTargetPrice] = useState('2.20');
  const [compareData, setCompareData] = useState<{ stores: StorePrice[] } | null>(null);
  const [priceHistory, setPriceHistory] = useState<{ store: string; price: number; date: string }[]>([]);

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

  // Sort: cheapest first, filter out 0-price stores
  const storeComparison = rawComparison
    .filter(s => s.price !== null && s.price > 0)
    .sort((a, b) => (a.price || 0) - (b.price || 0));

  const bestPrice = storeComparison[0];

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
    <div className="pb-28 pt-12 px-6 min-h-screen">
      <AnimatePresence>{toastProduct && <BasketToast productName={toastProduct} />}</AnimatePresence>
      <Header title="შედარება" showBack onBack={() => setScreen('home')} darkMode={darkMode} setDarkMode={setDarkMode} />

      <div className="bg-white dark:bg-slate-900 gradient-border rounded-[2rem] p-5 mb-6 shadow-card relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-inner overflow-hidden border border-slate-100 dark:border-white/5 flex-shrink-0">
            <SmartImage
              filename=""
              imageUrl={product.image}
              alt={product.name}
              className="w-full h-full object-contain p-2"
              fallbackLetter={product.name[0]}
              fallbackColor="bg-slate-100"
            />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-black text-ink dark:text-white tracking-tight leading-tight">{product.name}</h2>
            <p className="text-xs text-slate-400 font-bold mt-0.5">{product.size}</p>
            <div className="inline-flex items-center gap-1.5 bg-emerald/10 text-emerald px-3 py-1.5 rounded-xl mt-2">
              <TrendingDown size={14} strokeWidth={3} />
              <span className="font-black text-xs">{bestPrice?.price?.toFixed(2) || '—'}₾</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setShowAlertModal(true)}
            className="flex-1 flex items-center justify-center gap-2 text-cobalt dark:text-blue-400 text-[10px] font-black uppercase tracking-widest bg-cobalt/5 dark:bg-cobalt/10 px-4 py-2.5 rounded-xl hover:bg-cobalt/10 transition-all"
          >
            <Bell size={14} strokeWidth={3} />
            ალერტი
          </button>
          <button
            onClick={toggleBasket}
            className={`flex-1 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all ${isInBasket ? 'bg-cobalt text-white shadow-lg shadow-cobalt/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-cobalt'}`}
          >
            <ShoppingBasket size={14} strokeWidth={3} />
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
              className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 dark:border-white/5"
            >
              <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto mb-6" />
              <h3 className="text-xl font-black text-ink dark:text-white mb-2">ფასის ალერტი</h3>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-bold mb-6">შეგატყობინებთ, როდესაც ფასი ჩამოვა მითითებულ ნიშნულზე</p>
              
              <div className="mb-8">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">სასურველი ფასი (₾)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 text-xl font-black text-ink dark:text-white focus:ring-2 focus:ring-cobalt/20 transition-all"
                    placeholder="2.20"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black">₾</div>
                </div>
              </div>

              <button 
                onClick={() => setShowAlertModal(false)}
                className="w-full bg-cobalt text-white py-4.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-cobalt/30 active:scale-95 transition-all"
              >
                ალერტის გააქტიურება
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600 mb-5">ფასები მაღაზიებში</h3>
        {storeComparison.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`rounded-2xl p-4 flex justify-between items-center shadow-card ${idx === 0 ? 'bg-gradient-to-r from-emerald/5 to-teal-50/50 dark:from-emerald/10 dark:to-emerald/5 border border-emerald/20' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5'}`}
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-100 dark:border-white/5 relative">
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
                <span className="font-black text-ink dark:text-white text-sm block">{item.store}</span>
                {idx === 0 && <span className="text-[9px] font-black text-emerald uppercase tracking-widest">საუკეთესო ფასი</span>}
              </div>
            </div>
            <div className="text-right">
              <p className={`font-black text-base ${idx === 0 ? 'text-emerald' : 'text-ink dark:text-white'}`}>{item.price?.toFixed(2)}₾</p>
              {item.delta && item.delta > 0 && <p className="text-[10px] text-red-500 font-black">+{item.delta.toFixed(2)}₾</p>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Price History Chart */}
      {priceHistory.length > 1 && (() => {
        const stores = Array.from(new Set(priceHistory.map(h => h.store))) as string[];
        const storeColors: Record<string, string> = { 'SPAR': '#00703C', '2 Nabiji': '#EE3124', 'Goodwill': '#0054A6' };
        const sorted = [...priceHistory].sort((a, b) => a.date.localeCompare(b.date));
        const allPrices = sorted.map(h => h.price);
        const minP = Math.min(...allPrices);
        const maxP = Math.max(...allPrices);
        const range = maxP - minP || 1;
        const W = 300, H = 100, pad = 10;

        return (
          <div className="mt-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-5 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600 mb-4">ფასის ისტორია</h3>
            <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full">
              {stores.map(store => {
                const pts = sorted.filter(h => h.store === store);
                if (pts.length < 2) return null;
                const path = pts.map((p, i) => {
                  const x = pad + (i / (pts.length - 1)) * (W - pad * 2);
                  const y = pad + (1 - (p.price - minP) / range) * (H - pad * 2);
                  return `${i === 0 ? 'M' : 'L'}${x},${y}`;
                }).join(' ');
                return <path key={store} d={path} fill="none" stroke={storeColors[store] || '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />;
              })}
            </svg>
            <div className="flex gap-4 mt-2 justify-center">
              {stores.map(store => (
                <div key={store} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: storeColors[store] || '#888' }} />
                  <span className="text-[9px] font-bold text-slate-400">{store}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="mt-10 grid grid-cols-2 gap-4">
        <button
          onClick={() => { setTargetStore(bestPrice?.store || null); setScreen('map'); }}
          className="bg-cobalt text-white py-4.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-cobalt/30 active:scale-95 transition-all"
        >
          <MapIcon size={18} strokeWidth={2.5} />
          რუკაზე ნახვა
        </button>
        <button className="bg-ink dark:bg-white dark:text-ink text-white py-4.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
          <ExternalLink size={18} strokeWidth={2.5} />
          საიტზე
        </button>
      </div>
    </div>
  );
};

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// --- Custom Leaflet Icons ---
const createPulsingIcon = (color: string, label?: string) => L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div class="flex flex-col items-center">
      <div class="relative">
        <div class="w-4 h-4 bg-${color} rounded-full border-2 border-white shadow-lg z-10 relative"></div>
        <div class="absolute inset-0 w-4 h-4 bg-${color} rounded-full animate-ping opacity-40"></div>
      </div>
      ${label ? `<div class="mt-1 bg-white/90 backdrop-blur-sm border border-slate-100 px-2 py-0.5 rounded-md shadow-sm text-[8px] font-black text-ink whitespace-nowrap">${label}</div>` : ''}
    </div>
  `,
  iconSize: [30, 42],
  iconAnchor: [15, 21],
});

const RecenterMap = ({ coords }: { coords: { lat: number; lng: number } }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([coords.lat, coords.lng], 16);
  }, [coords, map]);
  return null;
};

const FitRouteBounds = ({ coords, branch }: { coords: { lat: number; lng: number }; branch: { lat: number; lng: number } }) => {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(
      [coords.lat, coords.lng],
      [branch.lat, branch.lng]
    );
    map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
  }, [coords, branch, map]);
  return null;
};

interface BranchResult {
  store: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  distanceKm: number;
}

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
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });

        const params = new URLSearchParams({ lat: String(latitude), lng: String(longitude) });
        if (targetStore) {
          params.set('store', targetStore);
          params.set('limit', '1');
        } else {
          params.set('limit', '15');
        }

        fetch(`/api/stores/branches?${params}`)
          .then((r) => r.json())
          .then((data) => {
            setNearbyBranches(data.branches || []);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      },
      () => setLoading(false)
    );
  }, [targetStore]);

  // Auto-select nearest branch in targeted mode
  useEffect(() => {
    if (targetStore && nearbyBranches.length > 0) {
      setSelectedBranch(nearbyBranches[0]);
    }
  }, [targetStore, nearbyBranches]);

  // Fetch route from OSRM when we have coords + selected branch
  useEffect(() => {
    if (!coords || !selectedBranch) {
      setRouteCoords([]);
      setRouteInfo(null);
      return;
    }

    setRouteLoading(true);
    const profile = routeMode === 'foot' ? 'foot' : 'car';
    const url = `https://router.project-osrm.org/route/v1/${profile}/${coords.lng},${coords.lat};${selectedBranch.lng},${selectedBranch.lat}?overview=full&geometries=geojson`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          const geojsonCoords: [number, number][] = route.geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]] // GeoJSON is [lng, lat], Leaflet needs [lat, lng]
          );
          setRouteCoords(geojsonCoords);
          setRouteInfo({ distance: route.distance, duration: route.duration });
        }
      })
      .catch(() => {
        setRouteCoords([]);
        setRouteInfo(null);
      })
      .finally(() => setRouteLoading(false));
  }, [coords, selectedBranch, routeMode]);

  // Clean up targetStore when leaving the screen
  useEffect(() => {
    return () => setTargetStore(null);
  }, []);

  const isTargeted = targetStore !== null;
  const activeBranch = selectedBranch || nearbyBranches[0] || null;

  const headerTitle = isTargeted
    ? `უახლოესი ${targetStore}`
    : 'მაღაზიები ჩემთან ახლოს';

  const startNavigation = (branch: BranchResult) => {
    setSelectedBranch(branch);
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} კმ`;
    return `${Math.round(meters)} მ`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds >= 3600) {
      const h = Math.floor(seconds / 3600);
      const m = Math.round((seconds % 3600) / 60);
      return `${h} სთ ${m} წთ`;
    }
    return `${Math.round(seconds / 60)} წთ`;
  };

  return (
    <div className="h-screen relative overflow-hidden flex flex-col">
      {/* Map Header */}
      <div className="absolute top-12 left-6 right-6 z-20">
        <div className="glass p-4 rounded-3xl compact-shadow flex items-center gap-3">
          <button onClick={() => setScreen('home')} className="p-2 -ml-1 text-ink dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <div>
            <h2 className="font-black text-ink dark:text-white text-sm">{headerTitle}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-1.5 h-1.5 bg-emerald rounded-full animate-pulse"></div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                {isTargeted && selectedProduct ? selectedProduct.name : 'ცოცხალი ძიება'}
              </p>
            </div>
          </div>
          {!isTargeted && nearbyBranches.length > 0 && (
            <div className="ml-auto bg-emerald/10 px-3 py-1 rounded-full border border-emerald/20">
              <span className="text-emerald text-[10px] font-black">{nearbyBranches.length} მაღაზია</span>
            </div>
          )}
        </div>
      </div>

      {/* Leaflet Map */}
      <div className="flex-1 relative z-10">
        {loading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-ink dark:text-white font-black text-sm">რუკა იტვირთება...</p>
            </div>
          </div>
        )}

        <MapContainer
          center={coords ? [coords.lat, coords.lng] : [41.7151, 44.8271]}
          zoom={14}
          style={{ height: '100%', width: '100%', filter: darkMode ? 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)' : 'none' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {coords && (
            <>
              {selectedBranch ? (
                <FitRouteBounds coords={coords} branch={selectedBranch} />
              ) : (
                <RecenterMap coords={coords} />
              )}
              <Marker position={[coords.lat, coords.lng]} icon={createPulsingIcon('cobalt', 'თქვენ')}>
                <Popup>თქვენ აქ ხართ</Popup>
              </Marker>
            </>
          )}

          {nearbyBranches.map((branch, idx) => (
            <Marker
              key={idx}
              position={[branch.lat, branch.lng]}
              icon={createPulsingIcon('emerald', branch.name)}
              eventHandlers={{
                click: () => setSelectedBranch(branch),
              }}
            >
              <Popup>
                <div className="p-1">
                  <p className="font-bold text-xs">{branch.name}</p>
                  <p className="text-[10px] text-gray-500">{branch.address}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{branch.distanceKm} კმ</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Route polyline - actual OSRM route or fallback dashed line */}
          {coords && activeBranch && (
            routeCoords.length > 0 ? (
              <Polyline
                positions={routeCoords}
                pathOptions={{
                  color: routeMode === 'foot' ? '#10B981' : '#3B82F6',
                  weight: 5,
                  opacity: 0.8,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            ) : (
              <Polyline
                positions={[
                  [coords.lat, coords.lng],
                  [activeBranch.lat, activeBranch.lng],
                ]}
                pathOptions={{ color: '#3B82F6', weight: 3, dashArray: '10, 10', opacity: 0.7 }}
              />
            )
          )}
        </MapContainer>
      </div>

      {/* Info Bar */}
      <div className="absolute bottom-28 left-6 right-6 pointer-events-none z-20">
        {activeBranch ? (
          <div className="bg-ink/90 dark:bg-slate-900/95 backdrop-blur-md text-white px-5 py-4 rounded-2xl shadow-2xl pointer-events-auto">
            {/* Branch info */}
            <div className="mb-3">
              <p className="font-black text-sm">{activeBranch.name}</p>
              <p className="text-[11px] text-white/60 mt-0.5">{activeBranch.address}</p>
            </div>

            {/* Walking / Driving toggle - only when route is active */}
            {selectedBranch && (
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setRouteMode('foot')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black transition-all ${
                    routeMode === 'foot'
                      ? 'bg-emerald text-white shadow-lg shadow-emerald/30'
                      : 'bg-white/10 text-white/60 hover:bg-white/15'
                  }`}
                >
                  <Footprints size={14} strokeWidth={2.5} />
                  ფეხით
                </button>
                <button
                  onClick={() => setRouteMode('driving')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black transition-all ${
                    routeMode === 'driving'
                      ? 'bg-cobalt text-white shadow-lg shadow-cobalt/30'
                      : 'bg-white/10 text-white/60 hover:bg-white/15'
                  }`}
                >
                  <Car size={14} strokeWidth={2.5} />
                  მანქანით
                </button>
              </div>
            )}

            {/* Route info (distance + time) */}
            {selectedBranch && routeLoading ? (
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span className="text-[11px] text-white/50 font-bold">მარშრუტი იტვირთება...</span>
              </div>
            ) : selectedBranch && routeInfo ? (
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1.5">
                  <Navigation size={12} strokeWidth={3} className="text-emerald" />
                  <span className="text-sm font-black text-emerald">{formatDistance(routeInfo.distance)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={12} strokeWidth={3} className="text-white/50" />
                  <span className="text-sm font-black text-white/80">{formatDuration(routeInfo.duration)}</span>
                </div>
                <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider">
                  {routeMode === 'foot' ? 'სავალი გზა' : 'საავტომობილო'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mb-3">
                <Navigation size={12} strokeWidth={3} className="text-emerald" />
                <span className="text-sm font-black text-emerald">{activeBranch.distanceKm} კმ</span>
                <span className="text-[10px] text-white/40 ml-1">პირდაპირი მანძილი</span>
              </div>
            )}

            {/* Navigation buttons */}
            {!selectedBranch ? (
              <button
                onClick={() => startNavigation(activeBranch)}
                className="w-full bg-emerald text-white py-3 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald/30"
              >
                <Navigation size={14} strokeWidth={3} />
                მარშრუტის ჩვენება
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { setSelectedBranch(null); setRouteCoords([]); setRouteInfo(null); }}
                  className="flex-1 bg-white/10 text-white py-3 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <X size={14} strokeWidth={3} />
                  გაუქმება
                </button>
                <button
                  onClick={() => {
                    const mode = routeMode === 'foot' ? 'walking' : 'driving';
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeBranch.lat},${activeBranch.lng}&travelmode=${mode}`, '_blank');
                  }}
                  className="flex-1 bg-cobalt text-white py-3 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-cobalt/30"
                >
                  <ExternalLink size={14} strokeWidth={3} />
                  Google Maps
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-ink/90 dark:bg-slate-900/95 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl inline-block pointer-events-auto">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald rounded-full animate-pulse"></div>
              <p className="text-xs font-medium">აირჩიეთ მაღაზია მარშრუტის სანახავად</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DealsScreen = ({ darkMode, setDarkMode }: { darkMode: boolean, setDarkMode: (v: boolean) => void }) => (
  <div className="pb-28 pt-12 px-6 min-h-screen">
    <Header title="აქციები" darkMode={darkMode} setDarkMode={setDarkMode} />
    <div className="bg-cobalt rounded-3xl p-8 text-white mb-10 relative overflow-hidden shadow-2xl shadow-cobalt/30">
      <div className="relative z-10">
        <span className="bg-white/20 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">სპეციალური შეთავაზება</span>
        <h3 className="text-2xl font-black mt-4 leading-tight">SPAR-ის კვირეული</h3>
        <p className="text-white/80 text-xs mt-2 font-bold">მიიღე -20% ქეშბექი ყველა პროდუქტზე</p>
        <button className="mt-6 bg-white text-cobalt px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg active:scale-95 transition-all">
          გააქტიურება
        </button>
      </div>
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute -left-10 -top-10 w-32 h-32 bg-emerald/20 rounded-full blur-2xl"></div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-3xl p-4 compact-shadow group">
          <div className="aspect-square bg-slate-50 dark:bg-slate-800 rounded-2xl mb-4 flex items-center justify-center border border-slate-100 dark:border-white/5 group-hover:scale-105 transition-transform">
            <Tag size={32} className="text-slate-200 dark:text-slate-700" />
          </div>
          <h4 className="font-black text-ink dark:text-white text-xs truncate">პროდუქტი #{i}</h4>
          <div className="flex items-center justify-between mt-3">
            <span className="text-emerald font-black text-sm">1.50₾</span>
            <span className="text-slate-300 dark:text-slate-700 text-[10px] font-bold line-through">2.00₾</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ProfileScreen = ({ setScreen, darkMode, setDarkMode }: { setScreen: (s: Screen) => void, darkMode: boolean, setDarkMode: (v: boolean) => void }) => (
  <div className="pb-28 pt-12 px-6 min-h-screen">
    <Header title="პროფილი" darkMode={darkMode} setDarkMode={setDarkMode} />
    <div className="flex items-center gap-5 mb-12 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 compact-shadow">
      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center text-slate-300 dark:text-slate-700 border border-slate-100 dark:border-white/5">
        <User size={40} />
      </div>
      <div>
        <h2 className="text-xl font-black text-ink dark:text-white">მარიამი</h2>
        <p className="text-cobalt text-xs font-black uppercase tracking-widest mt-1">Premium წევრი</p>
      </div>
    </div>

    <div className="space-y-3">
      {[
        { label: 'შეტყობინებები', icon: Bell, id: 'alerts' },
        { label: 'ჩემი კალათა', icon: ShoppingBasket, id: 'basket' },
        { label: 'პარამეტრები', icon: Settings, id: 'profile' },
        { label: 'დახმარება', icon: Info, id: 'profile' },
      ].map((item, idx) => (
        <button 
          key={idx} 
          onClick={() => setScreen(item.id as Screen)}
          className="w-full flex items-center justify-between p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-cobalt transition-colors">
              <item.icon size={20} strokeWidth={2.5} />
            </div>
            <span className="font-black text-ink dark:text-white text-sm">{item.label}</span>
          </div>
          <ChevronRight size={18} className="text-slate-300 dark:text-slate-700" />
        </button>
      ))}
    </div>
  </div>
);

const BasketScreen = ({ setScreen, darkMode, setDarkMode, basket, setBasket, setTargetStore }: { setScreen: (s: Screen) => void, darkMode: boolean, setDarkMode: (v: boolean) => void, basket: Product[], setBasket: React.Dispatch<React.SetStateAction<Product[]>>, setTargetStore: (s: string | null) => void }) => {
  const [viewStore, setViewStore] = useState<string | null>(null);

  // Collect all stores that have at least one price for basket items
  const storeSet = new Set<string>();
  for (const item of basket) {
    for (const store of Object.keys(item.prices)) {
      if (item.prices[store] > 0) storeSet.add(store);
    }
  }

  const calculateTotal = (store: string) => {
    return basket.reduce((sum, item) => sum + (item.prices[store] || 0), 0);
  };

  // "Full cost" = store's own prices + cheapest alternatives from other stores for missing items
  const calculateFullCost = (store: string) => {
    let cost = 0;
    for (const item of basket) {
      if (item.prices[store] > 0) {
        cost += item.prices[store];
      } else {
        // Find cheapest alternative from any other store
        const alt = Object.entries(item.prices)
          .filter(([s, p]) => s !== store && p > 0)
          .sort((a, b) => a[1] - b[1])[0];
        if (alt) cost += alt[1];
      }
    }
    return cost;
  };

  const storeTotals = Array.from(storeSet).map(store => ({
    store,
    total: calculateTotal(store),
    fullCost: calculateFullCost(store),
    hasAll: basket.every(item => item.prices[store] > 0),
    availableCount: basket.filter(item => item.prices[store] > 0).length,
  })).sort((a, b) => a.fullCost - b.fullCost);

  const bestStore = storeTotals[0];
  const activeStore = viewStore || bestStore?.store || '';
  const activeStoreData = storeTotals.find(s => s.store === activeStore) || bestStore;

  return (
    <div className="pb-28 pt-12 px-6 min-h-screen">
      <Header title="კალათა" darkMode={darkMode} setDarkMode={setDarkMode} />

      {basket.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-cobalt/5 to-emerald/5 flex items-center justify-center">
            <ShoppingBasket size={40} className="text-cobalt/25" />
          </div>
          <p className="text-ink dark:text-white font-black text-base">კალათა ცარიელია</p>
          <p className="text-slate-400 text-xs mt-1">დაამატე პროდუქტები შედარებისთვის</p>
          <button
            onClick={() => setScreen('home')}
            className="mt-6 bg-gradient-to-r from-cobalt to-blue-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-cobalt/25 active:scale-95 transition-transform"
          >
            პროდუქტების დამატება
          </button>
        </div>
      ) : (
        <>
          {/* Store selector tabs */}
          <div className="space-y-3 mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">აირჩიე მაღაზია</h3>
            {storeTotals.map((item, idx) => (
              <button
                key={item.store}
                onClick={() => setViewStore(item.store)}
                className={`w-full p-4 rounded-2xl transition-all duration-200 flex items-center justify-between shadow-card ${item.store === activeStore ? 'bg-gradient-to-r from-cobalt/5 to-blue-50/50 dark:from-cobalt/10 dark:to-blue-900/10 border border-cobalt/25' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-100 dark:border-white/5">
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
                  <div className="text-left">
                    <span className={`font-black text-sm block ${item.store === activeStore ? 'text-cobalt' : 'text-ink dark:text-white'}`}>{item.store}</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${item.hasAll ? 'text-emerald' : 'text-amber-500'}`}>
                      {item.availableCount}/{basket.length} პროდუქტი {item.hasAll ? '✓' : ''}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-black text-lg block ${item.store === activeStore ? 'text-cobalt' : 'text-ink dark:text-white'}`}>{item.total.toFixed(2)}₾</span>
                  {idx === 0 ? (
                    <span className="text-[9px] font-bold text-emerald">საუკეთესო ჯამი</span>
                  ) : (
                    <span className="text-[9px] font-bold text-red-400">+{(item.fullCost - storeTotals[0].fullCost).toFixed(2)}₾ ჯამში</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Product list for selected store */}
          <div className="space-y-3 mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">
              {activeStore}-ში შენი კალათა
            </h3>
            {basket.map((item) => {
              const price = item.prices[activeStore];
              const available = price > 0;
              // Find cheapest alternative store for unavailable items
              const altStore = !available
                ? Object.entries(item.prices)
                    .filter(([s, p]) => s !== activeStore && p > 0)
                    .sort((a, b) => a[1] - b[1])[0] || null
                : null;
              return (
                <div key={item.id} className={`p-4 rounded-2xl border flex items-center gap-4 ${available ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5' : 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30'}`}>
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 dark:border-white/5 flex-shrink-0">
                    <SmartImage
                      filename=""
                      imageUrl={item.image}
                      alt={item.name}
                      className="w-full h-full object-contain p-1"
                      fallbackLetter={item.name[0]}
                      fallbackColor="bg-slate-100"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-black text-sm truncate ${available ? 'text-ink dark:text-white' : 'text-slate-400'}`}>{item.name}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{item.size}</p>
                    {!available && altStore && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{altStore[0]}-ში {altStore[1].toFixed(2)}₾</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {available ? (
                      <span className="font-black text-ink dark:text-white">{price.toFixed(2)}₾</span>
                    ) : (
                      <span className="text-[10px] font-black text-red-500 uppercase">არ არის</span>
                    )}
                  </div>
                  <button
                    onClick={() => setBasket(basket.filter(p => p.id !== item.id))}
                    className="text-slate-300 dark:text-slate-600 hover:text-red-400 p-1 flex-shrink-0 transition-colors"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Bottom recommendation card */}
          <div className="bg-gradient-to-br from-cobalt via-blue-500 to-blue-600 rounded-[2rem] p-7 text-white shadow-elevated relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/8 rounded-full blur-3xl"></div>
            <div className="absolute -left-10 -bottom-10 w-28 h-28 bg-emerald/10 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <span className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em]">{activeStore === bestStore?.store ? 'საუკეთესო არჩევანი' : 'არჩეული მაღაზია'}</span>
                  <h4 className="text-xl font-black mt-1">{activeStore}</h4>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em]">ჯამი</span>
                  <p className="text-3xl font-black mt-1">{activeStoreData?.total.toFixed(2)}₾</p>
                </div>
              </div>
              {activeStoreData && !activeStoreData.hasAll && (
                <div className="bg-white/15 rounded-xl px-4 py-2 mb-4 text-center">
                  <span className="text-xs font-black">{basket.length - activeStoreData.availableCount} ნივთი ამ მაღაზიაში არ არის</span>
                </div>
              )}
              <button
                onClick={() => { setTargetStore(activeStore); setScreen('map'); }}
                className="w-full bg-white text-cobalt py-4.5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
              >
                <Navigation size={16} strokeWidth={2.5} />
                მაჩვენე გზა მაღაზიამდე
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const AlertsScreen = ({ setScreen, darkMode, setDarkMode }: { setScreen: (s: Screen) => void, darkMode: boolean, setDarkMode: (v: boolean) => void }) => (
  <div className="pb-28 pt-12 px-6 min-h-screen">
    <Header title="შეტყობინებები" showBack onBack={() => setScreen('profile')} darkMode={darkMode} setDarkMode={setDarkMode} />
    
    <div className="space-y-8">
      {/* Active Alerts Section */}
      <section>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600 mb-4">აქტიური ალერტები</h3>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cobalt/10 text-cobalt flex items-center justify-center">
            <Bell size={20} />
          </div>
          <div className="flex-1">
            <h4 className="font-black text-ink dark:text-white text-sm">ლუდი ყაზბეგი</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase">სამიზნე ფასი: 2.20₾</p>
          </div>
          <button className="text-[10px] font-black text-red-500 uppercase tracking-widest">წაშლა</button>
        </div>
      </section>

      {/* History Section */}
      <section>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600 mb-4">ისტორია</h3>
        <div className="space-y-3">
          {[
            { title: 'ფასის კლება!', desc: 'ლუდი ყაზბეგი ახლა 2.40₾ ღირს 2 ნაბიჯში', time: '10 წთ წინ', type: 'price' },
            { title: 'ახალი აქცია', desc: 'SPAR-ში დაიწყო კვირეული, -20% ქეშბექი', time: '1 სთ წინ', type: 'promo' },
            { title: 'მარაგშია', desc: 'რძე სანტე ისევ ხელმისაწვდომია Goodwill-ში', time: '3 სთ წინ', type: 'stock' },
          ].map((alert, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm flex gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${alert.type === 'price' ? 'bg-emerald/10 text-emerald' : 'bg-cobalt/10 text-cobalt'}`}>
                {alert.type === 'price' ? <TrendingDown size={20} /> : <Bell size={20} />}
              </div>
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-black text-ink dark:text-white text-sm">{alert.title}</h4>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">{alert.time}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{alert.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  </div>
);

export default function App() {
  const [currentScreen, setScreen] = useState<Screen>('home');
  const [darkMode, setDarkMode] = useState(false);
  const [basket, setBasket] = useState<Product[]>(() => {
    try { const saved = localStorage.getItem('pasebi-basket'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [targetStore, setTargetStore] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('pasebi-basket', JSON.stringify(basket));
  }, [basket]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const renderScreen = () => {
    const props = { setScreen, darkMode, setDarkMode, basket, setBasket };
    switch (currentScreen) {
      case 'home': return <HomeScreen {...props} setSelectedProduct={setSelectedProduct} />;
      case 'compare': return <CompareScreen {...props} selectedProduct={selectedProduct} setTargetStore={setTargetStore} />;
      case 'map': return <MapScreen {...props} targetStore={targetStore} setTargetStore={setTargetStore} selectedProduct={selectedProduct} />;
      case 'deals': return <DealsScreen darkMode={darkMode} setDarkMode={setDarkMode} />;
      case 'profile': return <ProfileScreen {...props} />;
      case 'basket': return <BasketScreen {...props} setTargetStore={setTargetStore} />;
      case 'alerts': return <AlertsScreen {...props} />;
      default: return <HomeScreen {...props} setSelectedProduct={setSelectedProduct} />;
    }
  };

  return (
    <div className="max-w-md mx-auto bg-slate-50 dark:bg-dark-bg min-h-screen relative shadow-2xl overflow-hidden transition-colors duration-300">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>

      <BottomNav active={currentScreen} setScreen={setScreen} onMapTap={() => setTargetStore(null)} basketCount={basket.length} />
    </div>
  );
}
