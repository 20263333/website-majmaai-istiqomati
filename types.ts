export interface GalleryImage {
  id: string;
  imageUrl: string;
}

export interface BuildingBlock {
  id: string;
  name: string;
  description?: string;
}

export interface Apartment {
  id: string;
  number: number;
  name: string;
  planUrl?: string;
  area?: string;
  status?: 'free' | 'booked' | 'sold';
  buyerName?: string;
}

export type FloorType = 'apartment' | 'shop' | 'basement_shop' | 'parking';

export interface Floor {
  id: string;
  blockId?: string;
  floorNumber: number;
  apartments: Apartment[];
  isShopFloor?: boolean;
  floorType?: FloorType;
  customLabel?: string;
  floorPlanUrl?: string;
  planBgType?: 'transparent' | 'color';
  planBgColor?: string;
  planScale?: number;
}

export interface ProjectCase {
  id: string;
  title: string;
  description: string;
  location?: string;
  year?: string;
  images: string[];
}

export interface SiteSettings {
  logoUrl: string;
  heroBannerUrl?: string;
  logoScaleMain?: number;   // Percentage for Desktop, default is 100
  logoScaleMainMobile?: number; // Percentage for Mobile, default is 75
  logoScaleHeader?: number; // Percentage, e.g. 100, default is 100
  textBold: string;
  showTextBold?: boolean;
  textMedium: string;
  textNormal: string;
  projectDescription: string;
  projectAddress: string;
  projectPhone: string;
  mapIframeUrl: string;
  gallery?: GalleryImage[];
  blocks?: BuildingBlock[];
  floors?: Floor[];
  floorPrices?: Record<string, number>;
  floorDeposits?: Record<string, number>;
  floorCashOnly?: Record<string, boolean>;
  recommendations?: RecommendationItem[];
  cases?: ProjectCase[];
  tgBotToken1?: string;
  tgBotToken2?: string;
  tgChats?: TelegramChatConfig[];
  authUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
}

export interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imagePosition: 'left' | 'right';
  isTransparentBg?: boolean;
  zoom?: number;       // e.g. 1 to 3
  offsetX?: number;    // percentage, e.g. -50 to 50
  offsetY?: number;    // percentage, e.g. -50 to 50
}

export interface TelegramChatConfig {
  id: string;
  chatId: string;
  description: string;
  bot1Enabled: boolean;
  bot2Enabled: boolean;
}

export interface ProjectDocument {
  id: string;
  title: string;
  imageUrl: string; // Base64 data or Supabase storage URL (primary image)
  images?: string[]; // Array of up to 10 image URLs
  isActive: boolean;
  createdAt?: string;
}

export interface SupabaseConfigState {
  url: string;
  apiKey: string;
  isUsingSupabase: boolean;
  isConnected: boolean;
  errorMsg: string | null;
}
