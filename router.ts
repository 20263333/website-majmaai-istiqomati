export type AdminTab = 
  | 'brand' 
  | 'desc' 
  | 'contacts' 
  | 'map' 
  | 'docs' 
  | 'pricing' 
  | 'gallery' 
  | 'database' 
  | 'chessboard' 
  | 'integration' 
  | 'status_manager' 
  | 'recommendations' 
  | 'analytics' 
  | 'storage_manager' 
  | 'auth'
  | 'positioning'
  | 'cases';

export interface AppRoute {
  view: 'main' | 'apartments';
  isAdmin: boolean;
  isStatusOnly: boolean;
  isStandalone?: boolean;
  adminTab?: AdminTab;
  blockId?: string;
  floorId?: string;
}

export const ADMIN_TAB_SLUGS: Record<AdminTab, string> = {
  brand: 'brand',
  desc: 'desc',
  contacts: 'contacts',
  map: 'map',
  docs: 'docs',
  pricing: 'pricing',
  gallery: 'gallery',
  recommendations: 'recomendation',
  chessboard: 'shahmatka',
  status_manager: 'status-manager',
  integration: 'integration',
  storage_manager: 'storage',
  analytics: 'analytics',
  auth: 'auth',
  database: 'database',
  positioning: 'positioning',
  cases: 'cases'
};

const SLUG_TO_TAB: Record<string, AdminTab> = {
  positioning: 'positioning',
  position: 'positioning',
  colors: 'positioning',
  brand_colors: 'positioning',
  brand: 'brand',
  branding: 'brand',
  logo: 'brand',

  desc: 'desc',
  description: 'desc',

  contacts: 'contacts',
  contact: 'contacts',

  map: 'map',

  docs: 'docs',
  documents: 'docs',

  pricing: 'pricing',
  prices: 'pricing',

  gallery: 'gallery',

  recomendation: 'recommendations',
  recomendations: 'recommendations',
  recommendation: 'recommendations',
  recommendations: 'recommendations',

  shahmatka: 'chessboard',
  chessboard: 'chessboard',
  shahmat: 'chessboard',

  'status-manager': 'status_manager',
  status_manager: 'status_manager',
  status: 'status_manager',

  integration: 'integration',
  telegram: 'integration',

  storage: 'storage_manager',
  storage_manager: 'storage_manager',
  files: 'storage_manager',

  analytics: 'analytics',
  stats: 'analytics',

  auth: 'auth',
  security: 'auth',

  database: 'database',
  db: 'database'
};

function cleanSlug(s: string): string {
  let clean = s.toLowerCase().trim();
  if (clean.endsWith('/1')) {
    clean = clean.slice(0, -2);
  } else if (clean.endsWith('1') && clean.length > 1) {
    clean = clean.slice(0, -1);
  }
  return clean;
}

function checkIsStandalone(path: string, hash: string, search: URLSearchParams): boolean {
  if (search.get('standalone') === '1' || search.has('1')) {
    return true;
  }
  const cleanPath = path.toLowerCase().trim();
  const cleanHash = hash.toLowerCase().trim();
  
  if (cleanPath.endsWith('1') || cleanPath.endsWith('/1')) {
    return true;
  }
  if (cleanHash.endsWith('1') || cleanHash.endsWith('/1')) {
    return true;
  }
  return false;
}

function extractAdminTab(path: string, hash: string, search: URLSearchParams): AdminTab | undefined {
  // 1. Query param check ?tab=shahmatka or ?adminTab=...
  const queryTab = search.get('tab') || search.get('adminTab');
  if (queryTab) {
    const norm = cleanSlug(queryTab);
    if (SLUG_TO_TAB[norm]) return SLUG_TO_TAB[norm];
  }

  // 2. Hash check #shahmatka or #admin-shahmatka
  if (hash) {
    const cleanHash = hash.replace(/^#\/?/, '').toLowerCase();
    const hashParts = cleanHash.split(/[-/]/).filter(Boolean);
    for (const part of hashParts) {
      const norm = cleanSlug(part);
      if (norm !== 'admin' && SLUG_TO_TAB[norm]) {
        return SLUG_TO_TAB[norm];
      }
    }
  }

  // 3. Path check /admin-shahmatka, /admin-status-manager1, /admin/shahmatka, etc.
  const cleanPath = path.toLowerCase().replace(/^\//, '');
  if (cleanPath.startsWith('admin')) {
    let remainder = cleanPath.replace(/^admin[-/]?/, '');
    remainder = cleanSlug(remainder);
    if (remainder && SLUG_TO_TAB[remainder]) {
      return SLUG_TO_TAB[remainder];
    }
  }

  return undefined;
}

export function parseCurrentRoute(): AppRoute {
  const path = window.location.pathname.toLowerCase();
  const search = new URLSearchParams(window.location.search);
  const hash = window.location.hash.toLowerCase();

  let view: 'main' | 'apartments' = 'main';
  let isAdmin = false;
  let isStatusOnly = false;
  let adminTab: AdminTab | undefined = undefined;
  const isStandalone = checkIsStandalone(path, hash, search);

  // Extract query parameters
  let blockId = search.get('block') || undefined;
  let floorId = search.get('floor') || undefined;

  // Match routes
  if (path.startsWith('/admin') || hash.includes('admin')) {
    isAdmin = true;
    isStatusOnly = false;
    adminTab = extractAdminTab(path, hash, search) || 'brand';
  } else if (path.startsWith('/status-manager') || hash.includes('status-manager')) {
    isAdmin = true;
    isStatusOnly = true;
    adminTab = 'status_manager';
  } else if (
    path.startsWith('/apartments') || 
    path.startsWith('/chessboard') || 
    path.startsWith('/block') ||
    hash.includes('apartments') || 
    hash.includes('chessboard')
  ) {
    view = 'apartments';
  }

  // Fallback regex parsing for paths like /apartments/block/BLOCK_ID/floor/FLOOR_ID
  if (!blockId) {
    const blockMatch = path.match(/\/block\/([^\/]+)/i);
    if (blockMatch) {
      blockId = decodeURIComponent(blockMatch[1]);
    }
  }
  if (!floorId) {
    const floorMatch = path.match(/\/floor\/([^\/]+)/i);
    if (floorMatch) {
      floorId = decodeURIComponent(floorMatch[1]);
    }
  }

  return { view, isAdmin, isStatusOnly, isStandalone, adminTab, blockId, floorId };
}

export function navigateToRoute(route: Partial<AppRoute>, push = true) {
  const current = parseCurrentRoute();
  const target: AppRoute = { ...current, ...route };

  let url = '/';
  if (target.isAdmin) {
    if (target.isStatusOnly) {
      url = target.isStandalone ? '/status-manager1' : '/status-manager';
    } else {
      const tab = target.adminTab || 'brand';
      const slug = ADMIN_TAB_SLUGS[tab] || tab;
      const baseUrl = slug === 'brand' ? '/admin' : `/admin-${slug}`;
      url = target.isStandalone ? `${baseUrl}1` : baseUrl;
    }
  } else if (target.view === 'apartments') {
    const params = new URLSearchParams();
    if (target.blockId) params.set('block', target.blockId);
    if (target.floorId) params.set('floor', target.floorId);
    
    const queryString = params.toString();
    url = `/apartments${queryString ? '?' + queryString : ''}`;
  }

  const fullCurrent = window.location.pathname + window.location.search;
  if (fullCurrent !== url) {
    if (push) {
      window.history.pushState(target, '', url);
    } else {
      window.history.replaceState(target, '', url);
    }
  }
}

