import { createContext, useContext, useState, useCallback } from 'react';

export type Language = 'ka' | 'en';

const translations = {
  // Splash & Onboarding
  splash_subtitle: { ka: 'გამიგე სად არის იაფი', en: 'Find the best prices' },
  onboarding_slide1_title: { ka: 'გამიგე ფასები', en: 'Discover Prices' },
  onboarding_slide1_desc: { ka: 'ნახე სად ღირს ყველაზე იაფად', en: 'Find the cheapest store' },
  onboarding_slide2_title: { ka: 'შეინახე კალათაში', en: 'Save to Basket' },
  onboarding_slide2_desc: { ka: 'დაამატე პროდუქტები და ნახე ჯამი', en: 'Add products and see totals' },
  onboarding_slide3_title: { ka: 'იპოვე მაღაზია', en: 'Find a Store' },
  onboarding_slide3_desc: { ka: 'რუკაზე ნახე უახლოესი ფილიალი', en: 'See the nearest branch on map' },
  onboarding_next: { ka: 'შემდეგი', en: 'Next' },
  onboarding_start: { ka: 'დაწყება', en: 'Get Started' },
  onboarding_skip: { ka: 'გამოტოვება', en: 'Skip' },

  // Photo scan
  photo_scanning: { ka: 'ვეძებთ პროდუქტს...', en: 'Searching for product...' },

  // Navigation
  nav_home: { ka: 'მთავარი', en: 'Home' },
  nav_basket: { ka: 'კალათა', en: 'Basket' },
  nav_map: { ka: 'რუკა', en: 'Map' },
  nav_profile: { ka: 'პროფილი', en: 'Profile' },

  // Store types
  store_type_grocery: { ka: 'სასურსათო', en: 'Grocery' },
  store_type_electronics: { ka: 'ტექნიკა', en: 'Electronics' },
  store_type_pharmacy: { ka: 'აფთიაქი', en: 'Pharmacy' },
  store_type_construction: { ka: 'სამშენებლო', en: 'Construction' },

  // Header
  header_title: { ka: 'გამიგე', en: 'Gamige' },

  // Top savings
  top_savings_title: { ka: 'დღის დანაზოგი', en: "Today's Savings" },
  top_savings_products: { ka: 'პროდუქტი ყველაზე იაფად', en: 'products at best price' },
  savings_label: { ka: 'დაზოგვა', en: 'Save' },
  add_to_basket_bulk: { ka: 'კალათაში დამატება', en: 'Add to Basket' },

  // Search
  search_placeholder: { ka: 'მოძებნე პროდუქტი...', en: 'Search products...' },
  search_history: { ka: 'ბოლო ძიებები', en: 'Recent Searches' },
  search_clear: { ka: 'გასუფთავება', en: 'Clear' },
  search_by_photo: { ka: 'ფოტოთი ძებნა', en: 'Search by Photo' },
  search_barcode: { ka: 'ბარკოდის სკანერი', en: 'Barcode Scanner' },

  // Categories - Grocery
  cat_all: { ka: 'ყველა', en: 'All' },
  cat_dairy: { ka: 'რძის პროდუქტი', en: 'Dairy' },
  cat_meat: { ka: 'ხორცი', en: 'Meat' },
  cat_bread: { ka: 'პური', en: 'Bread' },
  cat_fruit: { ka: 'ხილი/ბოსტანი', en: 'Fruits/Veg' },
  cat_beverage: { ka: 'სასმელი', en: 'Beverages' },
  cat_beer: { ka: 'ლუდი', en: 'Beer' },
  cat_sweets: { ka: 'ტკბილეული', en: 'Sweets' },
  cat_snacks: { ka: 'სნექი', en: 'Snacks' },
  cat_coffee_tea: { ka: 'ყავა/ჩაი', en: 'Coffee/Tea' },
  cat_hygiene: { ka: 'ჰიგიენა', en: 'Hygiene' },

  // Categories - Electronics
  cat_phones: { ka: 'ტელეფონები', en: 'Phones' },
  cat_laptops: { ka: 'ლეპტოპები', en: 'Laptops' },
  cat_tablets: { ka: 'ტაბლეტები', en: 'Tablets' },
  cat_tvs: { ka: 'ტელევიზორები', en: 'TVs' },
  cat_audio: { ka: 'აუდიო', en: 'Audio' },
  cat_gaming: { ka: 'გეიმინგი', en: 'Gaming' },

  // Categories - Pharmacy
  cat_pain: { ka: 'ტკივილი', en: 'Pain Relief' },
  cat_vitamins: { ka: 'ვიტამინი', en: 'Vitamins' },
  cat_heart: { ka: 'გული', en: 'Heart' },
  cat_antibiotics: { ka: 'ანტიბიოტიკი', en: 'Antibiotics' },
  cat_diabetes: { ka: 'დიაბეტი', en: 'Diabetes' },
  cat_allergies: { ka: 'ალერგია', en: 'Allergies' },

  // Categories - Construction
  cat_tools: { ka: 'ხელსაწყო', en: 'Tools' },
  cat_paint: { ka: 'საღებავი', en: 'Paint' },
  cat_plumbing: { ka: 'სანტექნიკა', en: 'Plumbing' },
  cat_lighting: { ka: 'განათება', en: 'Lighting' },
  cat_furniture: { ka: 'ავეჯი', en: 'Furniture' },
  cat_garden: { ka: 'ბაღი', en: 'Garden' },

  // Products
  products_popular: { ka: 'პოპულარული', en: 'Popular' },
  products_not_found: { ka: 'პროდუქტები არ მოიძებნა', en: 'No products found' },
  products_try_different: { ka: 'სცადე სხვა საძიებო სიტყვა', en: 'Try a different search term' },
  product_best_price: { ka: 'ყველაზე იაფი', en: 'Best Price' },

  // Toasts
  toast_added_basket: { ka: 'კალათაში დაემატა', en: 'Added to basket' },
  toast_added_favorites: { ka: 'ფავორიტებში დაემატა', en: 'Added to favorites' },
  toast_products_added: { ka: 'პროდუქტი კალათაში', en: 'products added to basket' },

  // Barcode Scanner
  barcode_title: { ka: 'ბარკოდის სკანერი', en: 'Barcode Scanner' },
  barcode_instruction: { ka: 'მიმართე კამერა ბარკოდისკენ', en: 'Point camera at barcode' },
  barcode_capture: { ka: 'გადაღება და სკანირება', en: 'Capture & Scan' },
  barcode_upload: { ka: 'ფოტოს ატვირთვა', en: 'Upload Photo' },
  barcode_manual_placeholder: { ka: 'ბარკოდის ნომერი (მაგ. 5449000133335)', en: 'Barcode number (e.g. 5449000133335)' },
  barcode_search: { ka: 'ძებნა', en: 'Search' },
  barcode_searching: { ka: 'იძებნება:', en: 'Searching:' },
  barcode_not_recognized: { ka: 'ბარკოდი ვერ ამოიცნო. სცადე კამერა პირდაპირ ბარკოდზე მიუშვირო.', en: 'Barcode not recognized. Try pointing the camera directly at the barcode.' },
  barcode_not_found: { ka: 'პროდუქტი ვერ მოიძებნა', en: 'Product not found' },
  barcode_not_found_photo: { ka: 'ბარკოდი ვერ ამოიცნო ფოტოდან', en: 'Barcode not recognized from photo' },
  barcode_camera_error: { ka: 'კამერაზე წვდომა ვერ მოხერხდა', en: 'Camera access failed' },
  barcode_lookup_error: { ka: 'ბარკოდის ძებნა ვერ მოხერხდა:', en: 'Barcode lookup failed:' },
  barcode_retry: { ka: 'თავიდან ცდა', en: 'Retry' },
  barcode_retry_scan: { ka: 'თავიდან სკანირება', en: 'Scan Again' },
  barcode_back: { ka: 'უკან', en: 'Back' },

  // Compare Screen
  compare_title: { ka: 'შედარება', en: 'Compare' },
  compare_best: { ka: 'საუკეთესო', en: 'Best' },
  compare_price_down: { ka: 'გაიაფდა', en: 'Price Down' },
  compare_price_up: { ka: 'გაძვირდა', en: 'Price Up' },
  compare_alert: { ka: 'ალერტი', en: 'Alert' },
  compare_in_basket: { ka: 'კალათაშია', en: 'In Basket' },
  compare_add_basket: { ka: 'კალათაში', en: 'Add to Basket' },
  compare_prices_header: { ka: 'ფასები მაღაზიებში', en: 'Store Prices' },
  compare_cheapest: { ka: 'ყველაზე იაფი', en: 'Cheapest' },
  compare_price_history: { ka: 'ფასის ისტორია', en: 'Price History' },
  compare_show_map: { ka: 'რუკაზე ნახვა', en: 'Show on Map' },
  compare_alert_title: { ka: 'ფასის ალერტი', en: 'Price Alert' },
  compare_alert_desc: { ka: 'შეგატყობინებთ ფასის ჩამოსვლისას', en: "We'll notify you when the price drops" },
  compare_alert_label: { ka: 'სასურველი ფასი (₾)', en: 'Target price (₾)' },
  compare_alert_activate: { ka: 'ალერტის გააქტიურება', en: 'Activate Alert' },

  // Map Screen
  map_title_nearby: { ka: 'მაღაზიები ახლოს', en: 'Nearby Stores' },
  map_title_closest: { ka: 'უახლოესი', en: 'Nearest' },
  map_branches_found: { ka: 'ნაპოვნი', en: 'found' },
  map_select_store: { ka: 'აირჩიეთ მაღაზია', en: 'Select a store' },
  map_you: { ka: 'თქვენ', en: 'You' },
  map_you_here: { ka: 'თქვენ აქ ხართ', en: 'You are here' },
  map_route_foot: { ka: 'ფეხით', en: 'Walking' },
  map_route_car: { ka: 'მანქანით', en: 'Driving' },
  map_route_loading: { ka: 'მარშრუტი...', en: 'Route...' },
  map_route_show: { ka: 'მარშრუტის ჩვენება', en: 'Show Route' },
  map_route_close: { ka: 'დახურვა', en: 'Close' },

  // Basket Screen
  basket_title: { ka: 'კალათა', en: 'Basket' },
  basket_empty: { ka: 'კალათა ცარიელია', en: 'Basket is empty' },
  basket_empty_desc: { ka: 'დაამატე პროდუქტები შედარებისთვის', en: 'Add products to compare prices' },
  basket_add_products: { ka: 'პროდუქტების დამატება', en: 'Add Products' },
  basket_select_store: { ka: 'აირჩიე მაღაზია', en: 'Select Store' },
  basket_in_stock: { ka: 'პროდუქტი', en: 'products' },
  basket_best_choice: { ka: 'ყველაზე იაფი', en: 'Cheapest' },
  basket_best_option: { ka: 'საუკეთესო არჩევანი', en: 'Best Option' },
  basket_selected: { ka: 'არჩეული', en: 'Selected' },
  basket_total: { ka: 'ჯამი', en: 'Total' },
  basket_unavailable: { ka: 'ნივთი არ არის ამ მაღაზიაში', en: 'items not available in this store' },
  basket_not_available: { ka: 'არ არის', en: 'N/A' },
  basket_show_direction: { ka: 'მაჩვენე გზა', en: 'Show Direction' },
  basket_share: { ka: 'გაზიარება', en: 'Share' },
  basket_qr_title: { ka: 'QR კოდი', en: 'QR Code' },
  basket_qr_desc: { ka: 'დაასკანერე კალათის გასაზიარებლად', en: 'Scan to share your basket' },
  basket_copy_link: { ka: 'ლინკის კოპირება', en: 'Copy Link' },
  basket_list_copied: { ka: 'სია დაკოპირდა!', en: 'List copied!' },
  basket_link_copied: { ka: 'ლინკი დაკოპირდა!', en: 'Link copied!' },
  basket_shopping_list: { ka: '🛒 საყიდლების სია', en: '🛒 Shopping List' },

  // Profile Screen
  profile_title: { ka: 'პროფილი', en: 'Profile' },
  profile_name: { ka: 'მარიამი', en: 'Mariam' },
  profile_member: { ka: 'Premium წევრი', en: 'Premium Member' },
  profile_alerts: { ka: 'შეტყობინებები', en: 'Notifications' },
  profile_my_basket: { ka: 'ჩემი კალათა', en: 'My Basket' },
  profile_settings: { ka: 'პარამეტრები', en: 'Settings' },
  profile_help: { ka: 'დახმარება', en: 'Help' },
  profile_language: { ka: 'ენა', en: 'Language' },

  // Alerts Screen
  alerts_title: { ka: 'შეტყობინებები', en: 'Notifications' },
  alerts_active: { ka: 'აქტიური ალერტები', en: 'Active Alerts' },
  alerts_history: { ka: 'ისტორია', en: 'History' },
  alerts_delete: { ka: 'წაშლა', en: 'Delete' },
  alerts_price_drop: { ka: 'ფასის კლება!', en: 'Price Drop!' },
  alerts_new_promo: { ka: 'ახალი აქცია', en: 'New Promotion' },
  alerts_target: { ka: 'სამიზნე:', en: 'Target:' },

  // Chat Screen
  chat_title: { ka: 'AI ასისტენტი', en: 'AI Assistant' },
  chat_welcome: { ka: 'გამარჯობა! მე ვარ გამიგე-ს AI ასისტენტი. დამიწერე რა პროდუქტები გაინტერესებს და მოვძებნი საუკეთესო ფასებს! 🛒', en: "Hi! I'm the GAMIGE AI assistant. Tell me what products you're looking for and I'll find the best prices! 🛒" },
  chat_placeholder: { ka: 'დაწერე რა გაინტერესებს...', en: 'What are you looking for...' },
  chat_image_search: { ka: 'ფოტოთი ძებნა', en: 'Search by Photo' },
  chat_in_basket: { ka: 'კალათაშია', en: 'In Basket' },
  chat_add_basket: { ka: '+ კალათა', en: '+ Basket' },
  chat_error: { ka: 'კავშირის შეცდომა. სცადე თავიდან.', en: 'Connection error. Please try again.' },

  // Voice
  voice_listening: { ka: 'მოუსმენს...', en: 'Listening...' },
  voice_not_understood: { ka: 'ვერ გავიგე', en: "Didn't understand" },
  voice_unavailable: { ka: 'ხმოვანი ძიება მიუწვდომელია', en: 'Voice search unavailable' },
  voice_not_heard: { ka: 'ვერ მოისმინა', en: "Couldn't hear" },
  voice_home: { ka: 'მთავარი გვერდი', en: 'Home page' },
  voice_basket: { ka: 'კალათა', en: 'Basket' },
  voice_map: { ka: 'რუკა', en: 'Map' },
  voice_profile: { ka: 'პროფილი', en: 'Profile' },
  voice_alerts: { ka: 'შეტყობინებები', en: 'Notifications' },
  voice_dark_mode: { ka: 'ღამის რეჟიმი', en: 'Dark mode' },
  voice_light_mode: { ka: 'ნათელი რეჟიმი', en: 'Light mode' },
  voice_category: { ka: 'კატეგორია:', en: 'Category:' },
  voice_added_basket: { ka: 'კალათაში დაემატა', en: 'Added to basket' },
  voice_already_in_basket: { ka: 'უკვე კალათაშია', en: 'Already in basket' },
  voice_product_not_found: { ka: 'პროდუქტი ვერ მოიძებნა', en: 'Product not found' },
  voice_basket_cleared: { ka: 'კალათა გასუფთავდა', en: 'Basket cleared' },
  voice_search: { ka: 'ძიება:', en: 'Search:' },
  voice_nearest_on_map: { ka: 'უახლოესი', en: 'Nearest' },
  voice_on_map: { ka: 'რუკაზე', en: 'on map' },
} as const;

export type TranslationKey = keyof typeof translations;

export const LanguageContext = createContext<{
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}>({
  lang: 'ka',
  setLang: () => {},
  t: (key) => translations[key]?.ka || key,
});

export function useLanguageState() {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      return (localStorage.getItem('pasebi-lang') as Language) || 'ka';
    } catch {
      return 'ka';
    }
  });

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    try { localStorage.setItem('pasebi-lang', newLang); } catch {}
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return translations[key]?.[lang] || translations[key]?.ka || key;
  }, [lang]);

  return { lang, setLang, t };
}

export function useLanguage() {
  return useContext(LanguageContext);
}
