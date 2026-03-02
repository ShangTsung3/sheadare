export type Screen = 
  | 'home' 
  | 'search_results' 
  | 'compare' 
  | 'map' 
  | 'deals' 
  | 'basket' 
  | 'alerts' 
  | 'profile';

export interface Product {
  id: string;
  name: string;
  size: string;
  category: string;
  prices: Record<string, number>; // Store name -> Price
  image?: string;
}

export interface StorePrice {
  store: string;
  price: number | null;
  delta?: number;
}
