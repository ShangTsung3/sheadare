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
  X,
  Mic,
  MicOff,
  Car,
  Footprints,
  Minus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, StorePrice, Product } from './types';

// --- Image Assets ---
const STORE_CONFIG: Record<string, { color: string, letter: string, filename: string, logo: string }> = {
  'SPAR': { color: 'bg-[#00703C]', letter: 'S', filename: '1.spar', logo: 'https://static.spargeorgia.com/Spar_files/d019aa0c-1a0e-45f2-ae4c-cd8734e69f59_Thumb.png' },
  '2 Nabiji': { color: 'bg-[#EE3124]', letter: '2', filename: '2. 2 nabiji', logo: 'https://2nabiji.ge/2-nabiji-logo.png' },
  'Goodwill': { color: 'bg-[#0054A6]', letter: 'G', filename: '3. Goodwill', logo: 'https://static.goodwill.ge/Goodwill_files/28402b34-5b3f-4e50-825a-d9827094769c_Thumb.png' },
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

const BottomNav = ({ active, setScreen, onMapTap, basketCount }: { active: Screen, setScreen: (s: Screen) => void, onMapTap?: () => void, basketCount: number }) => {
  const navItems = [
    { id: 'home', icon: Home, label: 'მთავარი' },
    { id: 'basket', icon: ShoppingBasket, label: 'კალათა' },
    { id: 'map', icon: MapIcon, label: 'რუკა' },
    { id: 'profile', icon: User, label: 'პროფილი' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 pt-2.5 pb-5 flex justify-between items-center z-50">
      {navItems.map((item) => {
        const isActive = active === item.id || (active === 'compare' && item.id === 'home');
        return (
          <button
            key={item.id}
            onClick={() => { if (item.id === 'map' && onMapTap) onMapTap(); setScreen(item.id as Screen); }}
            className={`transition-colors relative flex flex-col items-center gap-1 min-w-[3.5rem] ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'}`}
          >
            <div className="relative">
              <item.icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
              {item.id === 'basket' && basketCount > 0 && (
                <div className="absolute -top-1 -right-2 min-w-[16px] h-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                  {basketCount}
                </div>
              )}
            </div>
            <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
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

const HomeScreen = ({ setScreen, setSelectedProduct, darkMode, setDarkMode, basket, setBasket, voiceSearchQuery, setVoiceSearchQuery, voiceCategory, setVoiceCategory, onProductsLoaded }: { setScreen: (s: Screen) => void, setSelectedProduct: (p: Product) => void, darkMode: boolean, setDarkMode: (v: boolean) => void, basket: Product[], setBasket: React.Dispatch<React.SetStateAction<Product[]>>, voiceSearchQuery?: string | null, setVoiceSearchQuery?: (q: string | null) => void, voiceCategory?: string | null, setVoiceCategory?: (c: string | null) => void, onProductsLoaded?: (p: Product[]) => void }) => {
  const [selectedCategory, setSelectedCategory] = useState('ყველა');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try { const saved = localStorage.getItem('pasebi-search-history'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

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
    if (!debouncedQuery && !catValue) params.set('allStores', 'true');
    params.set('limit', '30');

    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/search?${params}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
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
    <div className="pb-24 pt-14 px-5 min-h-screen">
      <AnimatePresence>{toastProduct && <BasketToast productName={toastProduct} />}</AnimatePresence>
      <Header title="შეადარე" darkMode={darkMode} setDarkMode={setDarkMode} />

      {/* Search */}
      <div className="relative mb-5 flex gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={1.8} />
          <input
            type="text"
            placeholder="მოძებნე პროდუქტი..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-white focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-all border-0"
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
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6">
        {[
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
        ].map((cat) => (
          <button
            key={cat.name}
            onClick={() => setSelectedCategory(cat.name)}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedCategory === cat.name
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span className="text-sm">{cat.emoji}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Products */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xs font-semibold text-slate-400">
            {selectedCategory === 'ყველა' ? 'პოპულარული' : selectedCategory}
          </h2>
        </div>

        <div className="space-y-2.5">
          {loading && filteredProducts.length === 0 && [1,2,3,4,5].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl skeleton flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 skeleton rounded w-3/4" />
                <div className="h-3 skeleton rounded w-1/2" />
              </div>
            </div>
          ))}
          {filteredProducts.map((product, idx) => {
            const isInBasket = basket.find(item => item.id === product.id);
            const priceEntries = Object.entries(product.prices).filter(([, p]) => (p as number) > 0).sort((a, b) => (a[1] as number) - (b[1] as number));
            if (priceEntries.length === 0) return null;
            const bestPrice = priceEntries[0][1] as number;
            const worstPrice = priceEntries.length >= 2 ? priceEntries[priceEntries.length - 1][1] as number : bestPrice;
            const savePct = worstPrice > 0 ? Math.round(((worstPrice - bestPrice) / worstPrice) * 100) : 0;

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => { setSelectedProduct(product); setScreen('compare'); }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 cursor-pointer active:scale-[0.98] transition-transform border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center gap-3">
                  {/* Product image */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 flex-shrink-0">
                    <SmartImage
                      filename=""
                      imageUrl={product.image}
                      alt={product.name}
                      className="w-full h-full object-contain p-1"
                      fallbackLetter={product.name[0]}
                    />
                  </div>

                  {/* Name + badge */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-[13px] truncate">{product.name}</h3>
                      {product.size && <span className="text-slate-400 text-[11px] flex-shrink-0">{product.size}</span>}
                    </div>
                    {/* Store prices - clean inline */}
                    <div className="flex items-center gap-3 mt-1.5">
                      {priceEntries.map(([store, price], i) => (
                        <span key={store} className={`text-[12px] ${i === 0 ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-400'}`}>
                          {STORE_CONFIG[store]?.letter} {(price as number).toFixed(2)}₾
                        </span>
                      ))}
                      {/* Inline save badge */}
                      {priceEntries.length >= 2 && savePct >= 5 && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          savePct >= 25 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' :
                          savePct >= 10 ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' :
                          'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          -{savePct}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Add to basket */}
                  <button
                    onClick={(e) => toggleBasket(e, product)}
                    className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isInBasket
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <ShoppingBasket size={14} strokeWidth={isInBasket ? 2.5 : 1.8} />
                  </button>
                </div>
              </motion.div>
            );
          })}
          {!loading && filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <Search size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-medium text-sm">პროდუქტები არ მოიძებნა</p>
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
    <div className="pb-24 pt-14 px-5 min-h-screen">
      <AnimatePresence>{toastProduct && <BasketToast productName={toastProduct} />}</AnimatePresence>
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
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-2">
              {bestPrice?.price?.toFixed(2) || '—'}₾
              {bestPrice && <span className="text-xs text-slate-400 font-normal ml-1.5">საუკეთესო</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setShowAlertModal(true)}
            className="flex-1 flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-medium bg-slate-50 dark:bg-slate-800 px-4 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Bell size={14} />
            ალერტი
          </button>
          <button
            onClick={toggleBasket}
            className={`flex-1 flex items-center justify-center gap-2 text-xs font-medium px-4 py-2.5 rounded-xl transition-colors ${
              isInBasket
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <ShoppingBasket size={14} />
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
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-400 mb-3">ფასები მაღაზიებში</h3>
        {storeComparison.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`rounded-xl p-3.5 flex justify-between items-center border ${
              idx === 0
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30'
                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
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
                <span className="font-semibold text-slate-900 dark:text-white text-sm">{item.store}</span>
                {idx === 0 && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">ყველაზე იაფი</span>}
              </div>
            </div>
            <div className="text-right">
              <p className={`font-bold text-sm ${idx === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{item.price?.toFixed(2)}₾</p>
              {item.delta && item.delta > 0 && <p className="text-[10px] text-slate-400">+{item.delta.toFixed(2)}₾</p>}
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
          className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <MapIcon size={16} />
          რუკაზე ნახვა
        </button>
        <button className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-3.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
          <ExternalLink size={16} />
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
            <button onClick={() => { setTargetStore(activeStore); setScreen('map'); }}
              className="w-full bg-white text-slate-900 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
              <Navigation size={16} />
              მაჩვენე გზა
            </button>
          </div>
        </>
      )}
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

  // Global voice state
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceToast, setVoiceToast] = useState<{ text: string; type: 'command' | 'listening' | 'error' } | null>(null);
  // Shared state for voice → HomeScreen communication
  const [voiceSearchQuery, setVoiceSearchQuery] = useState<string | null>(null);
  const [voiceCategory, setVoiceCategory] = useState<string | null>(null);
  const [voiceProducts, setVoiceProducts] = useState<Product[]>([]);

  useEffect(() => { localStorage.setItem('pasebi-basket', JSON.stringify(basket)); }, [basket]);
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
    switch (currentScreen) {
      case 'home': return <HomeScreen {...props} setSelectedProduct={setSelectedProduct} voiceSearchQuery={voiceSearchQuery} setVoiceSearchQuery={setVoiceSearchQuery} voiceCategory={voiceCategory} setVoiceCategory={setVoiceCategory} onProductsLoaded={setVoiceProducts} />;
      case 'compare': return <CompareScreen {...props} selectedProduct={selectedProduct} setTargetStore={setTargetStore} />;
      case 'map': return <MapScreen {...props} targetStore={targetStore} setTargetStore={setTargetStore} selectedProduct={selectedProduct} />;
      case 'profile': return <ProfileScreen {...props} />;
      case 'basket': return <BasketScreen {...props} setTargetStore={setTargetStore} />;
      case 'alerts': return <AlertsScreen {...props} />;
      default: return <HomeScreen {...props} setSelectedProduct={setSelectedProduct} voiceSearchQuery={voiceSearchQuery} setVoiceSearchQuery={setVoiceSearchQuery} voiceCategory={voiceCategory} setVoiceCategory={setVoiceCategory} onProductsLoaded={setVoiceProducts} />;
    }
  };

  return (
    <div className="max-w-md mx-auto bg-slate-50 dark:bg-slate-950 min-h-screen relative">
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

      {/* Global floating mic button */}
      {currentScreen !== 'map' && (
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
      )}

      <BottomNav active={currentScreen} setScreen={setScreen} onMapTap={() => setTargetStore(null)} basketCount={basket.length} />
    </div>
  );
}
