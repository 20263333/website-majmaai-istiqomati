import { supabase } from './supabaseClient';

export type AnalyticsEventType = 'site_visit' | 'chessboard_visit' | 'whatsapp_click' | 'phone_click' | 'buy_request';

export interface AnalyticsEvent {
  id: string;
  event_type: AnalyticsEventType;
  device_id: string;
  created_at: string; // ISO string
  date: string; // YYYY-MM-DD
}

const LOCAL_STORAGE_ANALYTICS_KEY = 'sohtmon_analytics_events';
const LOCAL_STORAGE_DEVICE_ID_KEY = 'sohtmon_analytics_device_id';

// Helper to generate a compliant standard RFC4122 v4 UUID in safe Pure-JS format
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (_) {}
  }
  // Pure fallback RFC4122 v4 UUID generator (guarantees valid UUID format in HTTP / iframes)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Helper to get or create unique device ID
export function getDeviceId(): string {
  let devId = localStorage.getItem(LOCAL_STORAGE_DEVICE_ID_KEY);
  if (!devId) {
    devId = 'dev_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
    localStorage.setItem(LOCAL_STORAGE_DEVICE_ID_KEY, devId);
  }
  return devId;
}

// Helper to get local date string YYYY-MM-DD in safe local timezone components
export function getLocalDateString(date_obj = new Date()): string {
  const year = date_obj.getFullYear();
  const month = String(date_obj.getMonth() + 1).padStart(2, '0');
  const day = String(date_obj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Log a new analytics event
export async function logAnalyticsEvent(eventType: AnalyticsEventType): Promise<void> {
  const deviceId = getDeviceId();
  const now = new Date();
  const todayDateStr = getLocalDateString(now);

  console.log(`[Analytics] Track event: ${eventType} from device ${deviceId}`);

  // Fetch local events to verify duplicates
  const localEvents = getLocalEvents();

  // For site_visit and chessboard_visit, check if already logged today on this device
  if (eventType === 'site_visit' || eventType === 'chessboard_visit') {
    const hasAlreadyLoggedToday = localEvents.some(
      (e) => e.event_type === eventType && e.device_id === deviceId && e.date === todayDateStr
    );
    if (hasAlreadyLoggedToday) {
      console.log(`[Analytics] ${eventType} already logged for today. Skipping duplicate.`);
      return;
    }
  }

  const newEvent: AnalyticsEvent = {
    id: generateUUID(),
    event_type: eventType,
    device_id: deviceId,
    created_at: now.toISOString(),
    date: todayDateStr,
  };

  // 1. Save to Local Cache
  localEvents.push(newEvent);
  saveLocalEvents(localEvents);

  // 2. Try saving to Supabase if available
  if (supabase) {
    try {
      const { error } = await supabase.from('analytics_events').insert([
        {
          id: newEvent.id,
          event_type: newEvent.event_type,
          device_id: newEvent.device_id,
          created_at: newEvent.created_at,
          date: newEvent.date,
        },
      ]);
      if (error) {
        console.warn('[Analytics] Failed to insert into Supabase:', error.message);
      } else {
        console.log('[Analytics] Event successfully saved in Supabase.');
      }
    } catch (e: any) {
      console.warn('[Analytics] Supabase operation failed:', e.message || e);
    }
  }
}

// Get raw local storage events, filtering out any mock events to keep it lightweight
function getLocalEvents(): AnalyticsEvent[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_ANALYTICS_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data) as AnalyticsEvent[];
    // Ensure we don't persist any mock data to localStorage to avoid quota issues
    const filtered = parsed.filter((e) => e && e.id && !e.id.startsWith('mock_'));
    if (filtered.length !== parsed.length) {
      saveLocalEvents(filtered);
    }
    return filtered;
  } catch (e) {
    // If corruption occurred, safely clear and return empty array
    localStorage.removeItem(LOCAL_STORAGE_ANALYTICS_KEY);
    return [];
  }
}

// Save to local storage
function saveLocalEvents(events: AnalyticsEvent[]) {
  try {
    const filtered = events.filter((e) => e && e.id && !e.id.startsWith('mock_'));
    localStorage.setItem(LOCAL_STORAGE_ANALYTICS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('[Analytics] Failed to write to localStorage', e);
    // Safe retry option: try clearing completely if crashed
    try {
      localStorage.removeItem(LOCAL_STORAGE_ANALYTICS_KEY);
    } catch (_) {}
  }
}

// Global session cache for mock procedural events to avoid re-generating
let cachedInMemoryMockEvents: AnalyticsEvent[] | null = null;

// Seed mock data for beautiful historical visualization (past 2 years) in-memory
export function ensureSeededMockData(): AnalyticsEvent[] {
  if (cachedInMemoryMockEvents) {
    return cachedInMemoryMockEvents;
  }

  const seededEvents: AnalyticsEvent[] = [];
  const now = new Date();
  now.setHours(12, 0, 0, 0); // Normalize now to noon to avoid DST rollovers

  // Create mock events for the last 740 days to have complete comparisons for a full year
  for (let i = 740; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = getLocalDateString(day);

    // Dynamic wave pattern resembling real web traffic
    const dayOfWeek = day.getDay(); // 0 is Sunday, 6 is Saturday
    const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.5 : 1.3;
    
    // Add custom spikes at set intervals to simulate promotions or campaigns
    let spikeMultiplier = 1.0;
    if (i % 45 === 3 || i % 70 === 12) {
      spikeMultiplier = 2.8; // Custom traffic surges
    }

    const baseVisitors = Math.round((22 + Math.sin(i / 6) * 14 + Math.random() * 8) * weekendMultiplier * spikeMultiplier);
    const baseChessboard = Math.round(baseVisitors * (0.55 + Math.random() * 0.15));
    const baseWhatsapp = Math.round(baseChessboard * (0.18 + Math.random() * 0.12));
    const basePhone = Math.round(baseChessboard * (0.12 + Math.random() * 0.08));
    const baseBuyRequests = Math.round(baseChessboard * (0.04 + Math.random() * 0.06));

    // Seed direct site visits
    for (let u = 0; u < baseVisitors; u++) {
      seededEvents.push({
        id: `mock_sv_${i}_${u}`,
        event_type: 'site_visit',
        device_id: `mock_device_${Math.floor(Math.random() * 450)}`,
        created_at: day.toISOString(),
        date: dateStr,
      });
    }

    // Seed chessboard view visits
    for (let u = 0; u < baseChessboard; u++) {
      seededEvents.push({
        id: `mock_cb_${i}_${u}`,
        event_type: 'chessboard_visit',
        device_id: `mock_device_${Math.floor(Math.random() * 320)}`,
        created_at: day.toISOString(),
        date: dateStr,
      });
    }

    // Seed chessboard clicks
    for (let u = 0; u < baseWhatsapp; u++) {
      seededEvents.push({
        id: `mock_wa_${i}_${u}`,
        event_type: 'whatsapp_click',
        device_id: `mock_device_${Math.floor(Math.random() * 90)}`,
        created_at: day.toISOString(),
        date: dateStr,
      });
    }

    // Seed phone clicks
    for (let u = 0; u < basePhone; u++) {
      seededEvents.push({
        id: `mock_ph_${i}_${u}`,
        event_type: 'phone_click',
        device_id: `mock_device_${Math.floor(Math.random() * 90)}`,
        created_at: day.toISOString(),
        date: dateStr,
      });
    }

    // Seed buy requests
    for (let u = 0; u < baseBuyRequests; u++) {
      seededEvents.push({
        id: `mock_br_${i}_${u}`,
        event_type: 'buy_request',
        device_id: `mock_device_${Math.floor(Math.random() * 90)}`,
        created_at: day.toISOString(),
        date: dateStr,
      });
    }
  }

  // Clear any old massive legacy seeded storage item if left behind to repair quota
  try {
    localStorage.removeItem('sohtmon_analytics_events_seeded');
    localStorage.removeItem('sohtmon_analytics_seeded');
    localStorage.removeItem('sohtmon_analytics_seeded_v5');
  } catch (_) {}

  cachedInMemoryMockEvents = seededEvents;
  console.log(`[Analytics] Successfully generated ${seededEvents.length} in-memory historical mock records.`);
  return seededEvents;
}

// Fetch all analytics events combining Supabase, Local storage, and in-memory mock data
export async function getAnalyticsEvents(): Promise<AnalyticsEvent[]> {
  const mockEvents = ensureSeededMockData();
  const localEvents = getLocalEvents();

  let dbEventsMerged: AnalyticsEvent[] = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        // Map database records to model structure
        dbEventsMerged = data.map((d: any) => ({
          id: d.id,
          event_type: d.event_type as AnalyticsEventType,
          device_id: d.device_id,
          created_at: d.created_at,
          date: d.date,
        }));
      }
    } catch (e: any) {
      console.warn('[Analytics] Failed to fetch events from Supabase:', e.message || e);
    }
  }

  // Create absolute unique index map prioritizing DB events, local events, then fallback in-memory mock events
  const eventMap = new Map<string, AnalyticsEvent>();
  
  // Seed fallback mock events first
  mockEvents.forEach((e) => eventMap.set(e.id, e));
  // Override or add local tracked events
  localEvents.forEach((e) => eventMap.set(e.id, e));
  // Override or add live cloud Supabase events
  dbEventsMerged.forEach((e) => eventMap.set(e.id, e));

  return Array.from(eventMap.values());
}
