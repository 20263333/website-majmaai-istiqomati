import { createClient } from '@supabase/supabase-js';
import { SiteSettings, ProjectDocument } from './types';
import { recalculateApartmentNumbers } from './utils/floorUtils';

// Supabase URL and Key loaded dynamically from environment variables
export const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

export let supabase: any = null;

try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn('Нусхабардории Supabase бо хатогӣ рӯбарӯ шуд. LocalStorage истифода мешавад.', e);
}

// Default settings as requested by the user
export const DEFAULT_SETTINGS: SiteSettings = {
  logoUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=300&q=80',
  heroBannerUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=80',
  floorPrices: {
    '1': 11500,
    '2': 6500,
    '3': 6500,
    '4': 6500,
    '5': 6500,
    '6': 6500,
    '7': 6200,
    '8': 6200,
    '9': 6200,
    '10': 6200,
    '11': 5800,
    '12': 5800,
    '13': 5800,
    '14': 6800
  },
  floorDeposits: {
    '1': 100,
    '2': 59,
    '3': 59,
    '4': 59,
    '5': 59,
    '6': 59,
    '7': 39,
    '8': 39,
    '9': 39,
    '10': 39,
    '11': 29,
    '12': 29,
    '13': 29,
    '14': 29,
    '15': 29,
    '16': 29
  },
  floorCashOnly: {
    '1': true,
    '2': false,
    '3': false,
    '4': false,
    '5': false,
    '6': false,
    '7': false,
    '8': false,
    '9': false,
    '10': false,
    '11': false,
    '12': false,
    '13': false,
    '14': false,
    '15': false,
    '16': false
  },
  textBold: 'ЛОИҲАИ КОМПЛЕКСИ ИСТИҚОМАТИИ ХОНАҲОИ БАЛАНДОШЁНА',
  showTextBold: true,
  textMedium: 'БЕҲТАРИН ХОНАҲОИ ИСТИҚОМАТӢ ВА МАРКАЗҲОИ ХИЗМАТРАСОНӢ',
  textNormal: 'Сатҳи баландтарини бароҳатӣ ва амният барои шумову оилаи шумо',
  projectDescription: 'Тавсифи лоиҳа: Лоиҳакашии биноҳои истиқоматии баландошёна, иборат аз 3 (се) блок бо ҷоликунии марказҳои савдою хизматрасонӣ дар ошёнаҳои аввал ва таваққуфгоҳи наклиётӣ дар таҳхонаи онҳо, дар заминаи биноҳои истиқоматии бисёрквартирадори 3 ошёна, бинои филиали Ҷамъияти саҳомии кушодаи «Бонки Эсхата» ва бинову иншооти мавҷудаи бартарафшавандаи гирду атрофи он, воқеъ дар кӯчаи Н.Қарабоев №16, 18, 3-юм гузаргоҳи кӯчаи Н.Қарабоев №2, 3, 4, 4 «а», 5, 6 ва 7 ноҳияи Фирдавсии шаҳри Душанбе',
  projectAddress: 'кӯчаи Н.Қарабоев №2, 3, 4, 4 «а», 5, 6 ва 7',
  projectPhone: '+992 307 33 77 77',
  mapIframeUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3121.3653136279934!2d68.7699318!3d38.5130635!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38b5d130a00ebf6d%3A0xc3da00ccca067e9!2sNekruz%20Karabaev%20St%2C%20Dushanbe!5e0!3m2!1sen!2stj!4v1717700000000!5m2!1sen!2stj',
  gallery: [
    { id: '1', imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80' },
    { id: '2', imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80' },
    { id: '3', imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80' }
  ],
  floors: [
    {
      id: 'f1',
      floorNumber: 1,
      apartments: [
        { id: 'a1', number: 1, name: 'Хонаи 1', area: '65.4', planUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80' },
        { id: 'a2', number: 2, name: 'Хонаи 2', area: '42.8', planUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
        { id: 'a3', number: 3, name: 'Хонаи 3', area: '85.2', planUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80' },
        { id: 'a4', number: 4, name: 'Хонаи 4', area: '53.1', planUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80' }
      ]
    },
    {
      id: 'f2',
      floorNumber: 2,
      apartments: [
        { id: 'a5', number: 5, name: 'Хонаи 5', area: '65.4', planUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80' },
        { id: 'a6', number: 6, name: 'Хонаи 6', area: '42.8', planUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
        { id: 'a7', number: 7, name: 'Хонаи 7', area: '85.2', planUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80' },
        { id: 'a8', number: 8, name: 'Хонаи 8', area: '53.1', planUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80' }
      ]
    },
    {
      id: 'f3',
      floorNumber: 3,
      apartments: [
        { id: 'a9', number: 9, name: 'Хонаи 9', area: '65.4', planUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80' },
        { id: 'a10', number: 10, name: 'Хонаи 10', area: '42.8', planUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
        { id: 'a11', number: 11, name: 'Хонаи 11', area: '85.2', planUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80' },
        { id: 'a12', number: 12, name: 'Хонаи 12', area: '53.1', planUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80' }
      ]
    }
  ],
  tgBotToken1: '',
  tgBotToken2: '',
  tgChats: [],
  recommendations: [],
  blocks: [
    { id: 'block_default_a', name: 'Блок А' }
  ],
  logoScaleMain: 100,
  logoScaleHeader: 100,
  authUrl: '',
  primaryColor: '#0F172A',
  secondaryColor: '#D97706',
  accentColor: '#059669'
};

const LOCAL_STORAGE_SETTINGS_KEY = 'sohtmon_site_settings';
const LOCAL_STORAGE_DOCS_KEY = 'sohtmon_project_documents';

// Helper to check if tables exist by making a preflight query
export async function testSupabaseConnection(): Promise<{ isConnected: boolean; error: string | null }> {
  if (!supabase) {
    return { isConnected: false, error: 'Муштарии Supabase сохта нашудааст' };
  }
  try {
    const { data, error } = await supabase.from('site_settings').select('key').limit(1);
    if (error) {
      return { isConnected: false, error: `Ҷадвали 'site_settings' ёфт нашуд ё кушода намешавад: ${error.message}` };
    }
    return { isConnected: true, error: null };
  } catch (e: any) {
    return { isConnected: false, error: e.message || 'Хатогии шабака дар пайвастшавӣ ба Supabase' };
  }
}

// LOAD SETTINGS
export async function getSettings(forceLocal = false): Promise<{ settings: SiteSettings; isSupabase: boolean }> {
  if (!forceLocal && supabase) {
    try {
      const { data, error } = await supabase.from('site_settings').select('key, value');
      if (!error && data && data.length > 0) {
        const settingsMap: any = {};
        data.forEach((row: any) => {
          settingsMap[row.key] = row.value;
        });
        
        // Map elements back
        const loaded: SiteSettings = {
          logoUrl: settingsMap.logo_url || DEFAULT_SETTINGS.logoUrl,
          heroBannerUrl: settingsMap.hero_banner_url !== undefined ? settingsMap.hero_banner_url : DEFAULT_SETTINGS.heroBannerUrl,
          logoScaleMain: settingsMap.logo_scale_main ? parseInt(settingsMap.logo_scale_main, 10) : (DEFAULT_SETTINGS.logoScaleMain || 100),
          logoScaleHeader: settingsMap.logo_scale_header ? parseInt(settingsMap.logo_scale_header, 10) : (DEFAULT_SETTINGS.logoScaleHeader || 100),
          textBold: settingsMap.text_bold || DEFAULT_SETTINGS.textBold,
          showTextBold: settingsMap.show_text_bold !== undefined ? settingsMap.show_text_bold === 'true' : true,
          textMedium: settingsMap.text_medium || DEFAULT_SETTINGS.textMedium,
          textNormal: settingsMap.text_normal || DEFAULT_SETTINGS.textNormal,
          projectDescription: settingsMap.project_description || DEFAULT_SETTINGS.projectDescription,
          projectAddress: settingsMap.project_address || DEFAULT_SETTINGS.projectAddress,
          projectPhone: settingsMap.project_phone || DEFAULT_SETTINGS.projectPhone,
          mapIframeUrl: settingsMap.map_iframe_url || DEFAULT_SETTINGS.mapIframeUrl,
          gallery: (() => {
            try {
              return settingsMap.gallery_images ? JSON.parse(settingsMap.gallery_images) : DEFAULT_SETTINGS.gallery || [];
            } catch (e) {
              return DEFAULT_SETTINGS.gallery || [];
            }
          })(),
          floors: (() => {
            try {
              return settingsMap.apartment_floors ? JSON.parse(settingsMap.apartment_floors) : DEFAULT_SETTINGS.floors || [];
            } catch (e) {
              return DEFAULT_SETTINGS.floors || [];
            }
          })(),
          floorPrices: (() => {
            try {
              return settingsMap.floor_prices ? JSON.parse(settingsMap.floor_prices) : DEFAULT_SETTINGS.floorPrices || {};
            } catch (e) {
              return DEFAULT_SETTINGS.floorPrices || {};
            }
          })(),
          floorDeposits: (() => {
            try {
              return settingsMap.floor_deposits ? JSON.parse(settingsMap.floor_deposits) : DEFAULT_SETTINGS.floorDeposits || {};
            } catch (e) {
              return DEFAULT_SETTINGS.floorDeposits || {};
            }
          })(),
          floorCashOnly: (() => {
            try {
              return settingsMap.floor_cash_only ? JSON.parse(settingsMap.floor_cash_only) : DEFAULT_SETTINGS.floorCashOnly || {};
            } catch (e) {
              return DEFAULT_SETTINGS.floorCashOnly || {};
            }
          })(),
          tgBotToken1: settingsMap.tg_bot_token1 || '',
          tgBotToken2: settingsMap.tg_bot_token2 || '',
          tgChats: (() => {
            try {
              return settingsMap.tg_chats ? JSON.parse(settingsMap.tg_chats) : [];
            } catch (e) {
              return [];
            }
          })(),
          recommendations: (() => {
            try {
              return settingsMap.recommendations ? JSON.parse(settingsMap.recommendations) : DEFAULT_SETTINGS.recommendations || [];
            } catch (e) {
              return DEFAULT_SETTINGS.recommendations || [];
            }
          })(),
          blocks: (() => {
            try {
              return settingsMap.building_blocks ? JSON.parse(settingsMap.building_blocks) : DEFAULT_SETTINGS.blocks || [{ id: 'block_default_a', name: 'Блок А' }];
            } catch (e) {
              return DEFAULT_SETTINGS.blocks || [{ id: 'block_default_a', name: 'Блок А' }];
            }
          })(),
          authUrl: settingsMap.auth_url || DEFAULT_SETTINGS.authUrl || '',
          primaryColor: settingsMap.primary_color || DEFAULT_SETTINGS.primaryColor || '#0F172A',
          secondaryColor: settingsMap.secondary_color || DEFAULT_SETTINGS.secondaryColor || '#D97706',
          accentColor: settingsMap.accent_color || DEFAULT_SETTINGS.accentColor || '#059669',
          backgroundColor: settingsMap.background_color || DEFAULT_SETTINGS.backgroundColor || '#FFFFFF',
          cases: (() => {
            try {
              return settingsMap.cases ? JSON.parse(settingsMap.cases) : DEFAULT_SETTINGS.cases || [];
            } catch (e) {
              return DEFAULT_SETTINGS.cases || [];
            }
          })(),
        };
        loaded.floors = recalculateApartmentNumbers(loaded.floors || [], loaded.blocks || []);
        // Cache settings in LocalStorage to prime for fast synchronous loading next time
        try {
          localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(loaded));
        } catch (e) {}
        return { settings: loaded, isSupabase: true };
      }
    } catch (e) {
      console.warn('Пайвастшавӣ ба Supabase хато шуд, ба LocalStorage гузаштем', e);
    }
  }

  // LocalStorage Fallback
  const stored = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
  if (stored) {
    try {
      const parsed: SiteSettings = JSON.parse(stored);
      parsed.floors = recalculateApartmentNumbers(parsed.floors || [], parsed.blocks || []);
      return { settings: parsed, isSupabase: false };
    } catch {
      return { settings: DEFAULT_SETTINGS, isSupabase: false };
    }
  }
  return { settings: DEFAULT_SETTINGS, isSupabase: false };
}

// SAVE ONE OR ALL SETTINGS
export async function saveSettings(settings: SiteSettings, useSupabase = true): Promise<boolean> {
  // Ensure apartment numbers start from 1 per block on save
  if (settings.floors) {
    settings.floors = recalculateApartmentNumbers(settings.floors, settings.blocks || []);
  }

  // Save to LocalStorage always as a robust cache
  try {
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Нусхабардорӣ дар LocalStorage бо хатогии лимит рӯбарӯ шуд. Маълумот дар хотира ё Supabase солим аст.', e);
  }

  if (useSupabase && supabase) {
    try {
      const rows = [
        { key: 'logo_url', value: settings.logoUrl || '' },
        { key: 'hero_banner_url', value: settings.heroBannerUrl || '' },
        { key: 'logo_scale_main', value: (settings.logoScaleMain || 100).toString() },
        { key: 'logo_scale_header', value: (settings.logoScaleHeader || 100).toString() },
        { key: 'text_bold', value: settings.textBold || '' },
        { key: 'show_text_bold', value: (settings.showTextBold !== false).toString() },
        { key: 'text_medium', value: settings.textMedium || '' },
        { key: 'text_normal', value: settings.textNormal || '' },
        { key: 'project_description', value: settings.projectDescription || '' },
        { key: 'project_address', value: settings.projectAddress || '' },
        { key: 'project_phone', value: settings.projectPhone || '' },
        { key: 'map_iframe_url', value: settings.mapIframeUrl || '' },
        { key: 'gallery_images', value: JSON.stringify(settings.gallery || []) },
        { key: 'apartment_floors', value: JSON.stringify(settings.floors || []) },
        { key: 'floor_prices', value: JSON.stringify(settings.floorPrices || {}) },
        { key: 'floor_deposits', value: JSON.stringify(settings.floorDeposits || {}) },
        { key: 'floor_cash_only', value: JSON.stringify(settings.floorCashOnly || {}) },
        { key: 'tg_bot_token1', value: settings.tgBotToken1 || '' },
        { key: 'tg_bot_token2', value: settings.tgBotToken2 || '' },
        { key: 'tg_chats', value: JSON.stringify(settings.tgChats || []) },
        { key: 'recommendations', value: JSON.stringify(settings.recommendations || []) },
        { key: 'building_blocks', value: JSON.stringify(settings.blocks || []) },
        { key: 'auth_url', value: settings.authUrl || '' },
        { key: 'primary_color', value: settings.primaryColor || '#0F172A' },
        { key: 'secondary_color', value: settings.secondaryColor || '#D97706' },
        { key: 'accent_color', value: settings.accentColor || '#059669' },
        { key: 'background_color', value: settings.backgroundColor || '#FFFFFF' },
        { key: 'cases', value: JSON.stringify(settings.cases || []) }
      ];

      // Upsert rows individually or in bulk
      const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' });
      if (!error) {
        return true;
      }
      console.error('Хатогии Supabase upsert settings:', error);
    } catch (e) {
      console.error('Хатогии пайвастшавӣ ба Supabase дар вақти сабткунӣ:', e);
    }
  }
  return true; // Returns true because we saved to local cache successfully anyway!
}

// GET DOCUMENTS
export async function getDocuments(useSupabase = true): Promise<{ documents: ProjectDocument[]; isSupabase: boolean }> {
  if (useSupabase && supabase) {
    try {
      const { data, error } = await supabase
        .from('project_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const docs: ProjectDocument[] = data.map((d: any) => {
          let imgs: string[] = [];
          if (Array.isArray(d.images)) {
            imgs = d.images;
          } else if (typeof d.images === 'string') {
            try {
              const parsed = JSON.parse(d.images);
              if (Array.isArray(parsed)) imgs = parsed;
            } catch {}
          }
          if (imgs.length === 0 && d.image_url) {
            if (typeof d.image_url === 'string' && d.image_url.startsWith('[')) {
              try {
                const parsed = JSON.parse(d.image_url);
                if (Array.isArray(parsed)) imgs = parsed;
              } catch {}
            }
          }
          if (imgs.length === 0 && d.image_url) {
            imgs = [d.image_url];
          }

          return {
            id: d.id,
            title: d.title,
            imageUrl: imgs[0] || d.image_url || '',
            images: imgs,
            isActive: d.is_active,
            createdAt: d.created_at
          };
        });
        // Cache documents in LocalStorage to prime for fast synchronous loading next time
        try {
          localStorage.setItem(LOCAL_STORAGE_DOCS_KEY, JSON.stringify(docs));
        } catch (e) {}
        return { documents: docs, isSupabase: true };
      }
      console.warn('Хатогӣ дар гирифтани ҳуҷҷатҳо аз Supabase, ба Local Storage мегузарем:', error);
    } catch (e) {
      console.warn('Хатогии шабакавӣ дар гирифтани ҳуҷҷатҳо аз Supabase, ба Local Storage мегузарем:', e);
    }
  }

  // LocalStorage Fallback
  const stored = localStorage.getItem(LOCAL_STORAGE_DOCS_KEY);
  if (stored) {
    try {
      const parsedDocs: ProjectDocument[] = JSON.parse(stored);
      const normalized = parsedDocs.map(d => {
        const imgs = d.images && d.images.length > 0 ? d.images : (d.imageUrl ? [d.imageUrl] : []);
        return {
          ...d,
          imageUrl: imgs[0] || d.imageUrl || '',
          images: imgs
        };
      });
      return { documents: normalized, isSupabase: false };
    } catch {
      return { documents: [], isSupabase: false };
    }
  }
  
  // Return empty list if newly set up
  return { documents: [], isSupabase: false };
}

// SAVE DOCUMENTS (used for LocalStorage syncing)
function saveDocsToLocal(docs: ProjectDocument[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_DOCS_KEY, JSON.stringify(docs));
  } catch (e) {
    console.warn('Нусхабардории ҳуҷҷатҳо дар LocalStorage бо хатогии лимит рӯбарӯ шуд.', e);
  }
}

// ADD DOCUMENT
export async function addDocument(document: Omit<ProjectDocument, 'id'>, useSupabase = true): Promise<ProjectDocument> {
  const newId = crypto.randomUUID();
  const imagesList = document.images && document.images.length > 0 ? document.images : (document.imageUrl ? [document.imageUrl] : []);
  const primaryImg = imagesList[0] || document.imageUrl || '';
  const dbImageUrl = imagesList.length > 1 ? JSON.stringify(imagesList) : primaryImg;

  const newDoc: ProjectDocument = {
    id: newId,
    title: document.title,
    imageUrl: primaryImg,
    images: imagesList,
    isActive: document.isActive,
    createdAt: new Date().toISOString()
  };

  if (useSupabase && supabase) {
    try {
      const { data, error } = await supabase
        .from('project_documents')
        .insert([{
          id: newId,
          title: document.title,
          image_url: dbImageUrl,
          is_active: document.isActive
        }])
        .select();

      if (!error && data && data.length > 0) {
        // Successfully added to Supabase
        // Also cache locally
        const { documents } = await getDocuments(false);
        saveDocsToLocal([newDoc, ...documents]);
        return newDoc;
      }
      console.error('Хатогии Supabase дар илова кардани ҳуҷҷат:', error);
    } catch (e) {
      console.error('Хатогии шабакавӣ дар илова кардани ҳуҷҷат:', e);
    }
  }

  // LocalStorage ONLY fallback
  const { documents } = await getDocuments(false);
  const updated = [newDoc, ...documents];
  saveDocsToLocal(updated);
  return newDoc;
}

// UPDATE DOCUMENT
export async function updateDocument(id: string, updates: Partial<ProjectDocument>, useSupabase = true): Promise<boolean> {
  if (useSupabase && supabase) {
    try {
      // Map to supabase keys
      const mappedUpdates: any = {};
      if (updates.title !== undefined) mappedUpdates.title = updates.title;
      if (updates.images !== undefined) {
        mappedUpdates.image_url = updates.images.length > 1 
          ? JSON.stringify(updates.images) 
          : (updates.images[0] || updates.imageUrl || '');
      } else if (updates.imageUrl !== undefined) {
        mappedUpdates.image_url = updates.imageUrl;
      }
      if (updates.isActive !== undefined) mappedUpdates.is_active = updates.isActive;

      const { error } = await supabase
        .from('project_documents')
        .update(mappedUpdates)
        .eq('id', id);

      if (!error) {
        // also update local cache
        const { documents } = await getDocuments(false);
        const updated = documents.map(d => d.id === id ? { ...d, ...updates } : d);
        saveDocsToLocal(updated);
        return true;
      }
      console.error('Хатогии Supabase дар тағйир додани ҳуҷҷат:', error);
    } catch (e) {
      console.error('Хатогии шабакавӣ дар тағйир додани ҳуҷҷат:', e);
    }
  }

  // Local Storage fallback
  const { documents } = await getDocuments(false);
  const updated = documents.map(d => d.id === id ? { ...d, ...updates } : d);
  saveDocsToLocal(updated);
  return true;
}

// DELETE DOCUMENT
export async function deleteDocument(id: string, useSupabase = true): Promise<boolean> {
  if (useSupabase && supabase) {
    try {
      const { error } = await supabase
        .from('project_documents')
        .delete()
        .eq('id', id);

      if (!error) {
        const { documents } = await getDocuments(false);
        const updated = documents.filter(d => d.id !== id);
        saveDocsToLocal(updated);
        return true;
      }
      console.error('Хатогии Supabase дар нест кардани ҳуҷҷат:', error);
    } catch (e) {
      console.error('Хатогии шабакавӣ дар нест кардани ҳуҷҷат:', e);
    }
  }

  // Local storage fallback
  const { documents } = await getDocuments(false);
  const updated = documents.filter(d => d.id !== id);
  saveDocsToLocal(updated);
  return true;
}

// UPLOAD ASSET TO SUPABASE STORAGE
export async function uploadAsset(file: File, folder = 'assets'): Promise<string | null> {
  if (!supabase) {
    console.warn('Муштарии Supabase сохта нашудааст, боргузорӣ иҷро намешавад.');
    return null;
  }
  try {
    const fileExt = file.name.split('.').pop() || 'png';
    const cleanName = file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${folder}/${Date.now()}_${cleanName}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('project-assets')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Хатогии боркунӣ ба сабади Supabase:', error);
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('project-assets')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading file to Supabase:', error);
    return null;
  }
}

// SQL helper string to display to the user
export const SQL_SETUP_SCRIPT = `-- Ин рамзҳоро нусхабардорӣ карда, дар Supabase SQL Editor пахш кунед (Run)

-- 1. Ҷадвал барои Танзимоти Сайт (Логотип, Матнҳо, Телефон, Харита ва ғ.)
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Рамзҳои амниятии RLS барои танзимот
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Сёсатҳо (Policies) барои site_settings
CREATE POLICY "Иҷозати хондан барои ҳама" ON site_settings
    FOR SELECT TO public USING (true);

CREATE POLICY "Иҷозати комил (Админ) барои ҳама" ON site_settings
    FOR ALL TO public USING (true);


-- 2. Ҷадвал барои Ҳуҷҷатҳои Лоиҳа
CREATE TABLE IF NOT EXISTS project_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL, -- Нигоҳдории сурат ҳамчун матни Base64 ё суроғаи интернетӣ
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Рамзҳои амниятии RLS барои ҳуҷҷатҳо
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

-- Сёсатҳо (Policies) барои project_documents
CREATE POLICY "Иҷозати хондан барои ҳама" ON project_documents
    FOR SELECT TO public USING (true);

CREATE POLICY "Иҷозати комил (Админ) барои ҳама" ON project_documents
    FOR ALL TO public USING (true);


-- 3. Ворид кардани маълумоти аввалия (Намуна) ба ҷадвали танзимот (Барои санҷиш)
INSERT INTO site_settings (key, value) VALUES
('logo_url', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=300&q=80'),
('hero_banner_url', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=80'),
('text_bold', 'ЛОИҲАИ КОМПЛЕКСИ ИСТИҚОМАТИИ ХОНАҲОИ БАЛАНДОШЁНА'),
('text_medium', 'БЕҲТАРИН ХОНАҲОИ ИСТИҚОМАТӢ ВА МАРКАЗҲОИ ХИЗМАТРАСОНӢ'),
('text_normal', 'Сатҳи баландтарини бароҳатӣ ва амният барои шумову оилаи шумо'),
('project_description', 'Тавсифи лоиҳа: Лоиҳакашии биноҳои истиқоматии баландошёна, иборат аз 3 (се) блок бо ҷойгиронии марказҳои савдою хизматрасонӣ дар ошёнаҳои аввал ва таваққуфгоҳи наклиётӣ дар таҳхонаи онҳо, дар заминаи биноҳои истиқоматии бисёрквартирадори 3 ошёна, бинои филиали Ҷамъияти саҳомии кушодаи «Бонки Эсхата» ва бинову иншооти мавҷудаи бартарафшавандаи гирду атрофи он, воқеъ дар кӯчаи Н.Қарабоев №16, 18, 3-юм гузаргоҳи кӯчаи Н.Қарабоев №2, 3, 4, 4 «а», 5, 6 ва 7 ноҳияи Фирдавсии шаҳри Душанбе'),
('project_address', 'кӯчаи Н.Қарабоев №2, 3, 4, 4 «а», 5, 6 ва 7'),
('project_phone', '+992 307 33 77 77'),
('map_iframe_url', 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3121.3653136279934!2d68.7699318!3d38.5130635!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38b5d130a00ebf6d%3A0xc3da00ccca067e9!2sNekruz%20Karabaev%20St%2C%20Dushanbe!5e0!3m2!1sen!2stj!4v1717700000000!5m2!1sen!2stj')
ON CONFLICT (key) DO NOTHING;


-- 4. Танзимот ва Амнияти Storage Bucket барои Логотипҳо ва Ҳуҷҷатҳо
-- Сохтани сабад (Bucket) бо номи 'project-assets'
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-assets', 'project-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Сёсати 1: Иҷозати хондани суратҳо барои ҳамаи истифодабарандагон
CREATE POLICY "Иҷозати хондани суратҳо барои ҳама" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'project-assets');

-- Сёсати 2: Иҷозати боркунии суратҳо ва файлҳо (INSERT/Upload)
CREATE POLICY "Иҷозати боркунии суратҳо барои ҳама" ON storage.objects
    FOR INSERT TO public WITH CHECK (bucket_id = 'project-assets');

-- Сёсати 3: Иҷозати нест кардани суратҳо (DELETE/Remove)
CREATE POLICY "Иҷозати нест кардани суратҳо барои ҳама" ON storage.objects
    FOR DELETE TO public USING (bucket_id = 'project-assets');


-- 5. Ҷадвал барои Сабти Рӯйдодҳои Аналитика (Аналитика Квартираҳо ва Вебсайт)
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY,
    event_type TEXT NOT NULL,
    device_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    date TEXT NOT NULL
);

-- Рамзҳои амниятии RLS барои аналитика
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Сиёсатҳо (Policies) барои analytics_events
CREATE POLICY "Иҷозати хондан барои ҳама" ON analytics_events
    FOR SELECT TO public USING (true);

CREATE POLICY "Иҷозати ворид кардан барои ҳама" ON analytics_events
    FOR INSERT TO public WITH CHECK (true);
`;

// Helper to send telegram notifications
export async function sendTelegramAlert(
  settings: SiteSettings,
  message: string,
  botType: 'bot1' | 'bot2'
): Promise<boolean> {
  const token = botType === 'bot1' ? settings.tgBotToken1 : settings.tgBotToken2;
  if (!token) {
    console.warn(`Барои ${botType === 'bot1' ? 'Боти 1' : 'Боти 2'} ягон токен танзим нашудааст.`);
    return false;
  }

  const chats = settings.tgChats || [];
  const activeChats = chats.filter((c) => {
    return c.chatId && (botType === 'bot1' ? c.bot1Enabled : c.bot2Enabled);
  });

  if (activeChats.length === 0) {
    console.warn(`Ягон Чат ID барои ${botType === 'bot1' ? 'Боти 1' : 'Боти 2'} фаъол нест.`);
    return false;
  }

  let success = false;
  for (const chat of activeChats) {
    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: chat.chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });

      if (response.ok) {
        success = true;
      } else {
        const errJson = await response.json();
        console.error(`Хатогии фиристодани смс ба Телеграм [Chat ${chat.chatId}]:`, errJson);
      }
    } catch (e) {
      console.error(`Хатогии шабака дар пайвастшавӣ ба Телеграм API:`, e);
    }
  }

  return success;
}

export interface StorageFile {
  name: string;
  path: string;
  folder: string;
  publicUrl: string;
  metadata?: {
    size: number;
    createdAt: string | null;
  };
}

// GET ALL STORAGE ASSETS
export async function listAllUploadedAssets(): Promise<StorageFile[]> {
  if (!supabase) {
    return [];
  }
  const folders = ['logos', 'documents', 'plans', 'gallery', 'recommendations', 'assets'];
  let allFiles: StorageFile[] = [];

  for (const folder of folders) {
    try {
      const { data, error } = await supabase.storage
        .from('project-assets')
        .list(folder, { limit: 150 });

      if (!error && data) {
        data.forEach((file: any) => {
          if (file.name !== '.emptyFolderPlaceholder') {
            const path = `${folder}/${file.name}`;
            const { data: publicUrlData } = supabase.storage
              .from('project-assets')
              .getPublicUrl(path);

            allFiles.push({
              name: file.name,
              path: path,
              folder: folder,
              publicUrl: publicUrlData.publicUrl,
              metadata: {
                size: file.metadata?.size || 0,
                createdAt: file.created_at || file.updated_at || null
              }
            });
          }
        });
      }
    } catch (e) {
      console.warn(`Хатогии хондани папкаи ${folder} аз Storage:`, e);
    }
  }

  // Sort files by latest first
  allFiles.sort((a, b) => {
    const timeA = a.metadata?.createdAt ? new Date(a.metadata.createdAt).getTime() : 0;
    const timeB = b.metadata?.createdAt ? new Date(b.metadata.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  return allFiles;
}

// DELETE AN ASSET FROM STORAGE
export async function deleteStorageAsset(path: string): Promise<boolean> {
  if (!supabase) {
    return false;
  }
  try {
    const { data, error } = await supabase.storage
      .from('project-assets')
      .remove([path]);

    if (error) {
      console.error('Хатогии нест кардани файл аз Storage:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Хатогии шабакавӣ дар нест кардани файл аз Storage:', e);
    return false;
  }
}
