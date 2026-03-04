export type Screen =
  | 'home'
  | 'search_results'
  | 'compare'
  | 'map'
  | 'deals'
  | 'basket'
  | 'alerts'
  | 'profile'
  | 'scanner'
  | 'chat';

export interface Product {
  id: string;
  name: string;
  size: string;
  category: string;
  prices: Record<string, number>; // Store name -> Price
  image?: string;
  priceTrend?: 'up' | 'down';
}

export interface StorePrice {
  store: string;
  price: number | null;
  delta?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  products?: Product[];
  actions?: ChatAction[];
  timestamp: number;
  image?: string;
}

export interface ChatAction {
  type: 'add_to_basket';
  label: string;
  product_ids?: string[];
}
