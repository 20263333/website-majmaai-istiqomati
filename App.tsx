import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Header from './components/Header';
import MainPage from './components/MainPage';
import ApartmentsPage from './components/ApartmentsPage';
import AdminPanel from './components/AdminPanel';
import DocumentModal from './components/DocumentModal';
import PhoneContactModal from './components/PhoneContactModal';
import MobileNavBar from './components/MobileNavBar';
import AnimatedBackground from './components/AnimatedBackground';
import { SiteSettings, ProjectDocument } from './types';
import { 
  getSettings, saveSettings, getDocuments, addDocument, 
  updateDocument, deleteDocument, testSupabaseConnection, 
  DEFAULT_SETTINGS 
} from './supabaseClient';
import { logAnalyticsEvent } from './analytics';
import { parseCurrentRoute, navigateToRoute, AdminTab } from './router';

export default function App() {
  const initialRoute = parseCurrentRoute();
  const [isAdminMode, setIsAdminMode] = useState(initialRoute.isAdmin);
  const [isStatusOnlyMode, setIsStatusOnlyMode] = useState(initialRoute.isStatusOnly);
  const [isStandaloneMode, setIsStandaloneMode] = useState(initialRoute.isStandalone || false);
  const [currentView, setCurrentView] = useState<'main' | 'apartments'>(initialRoute.view);
  const [adminTab, setAdminTab] = useState<AdminTab | undefined>(initialRoute.adminTab);
  const [isGlobalPhoneModalOpen, setIsGlobalPhoneModalOpen] = useState(false);
  const [isGlobalCalculatorOpen, setIsGlobalCalculatorOpen] = useState(false);

  // Sync state with browser back/forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const route = parseCurrentRoute();
      setIsAdminMode(route.isAdmin);
      setIsStatusOnlyMode(route.isStatusOnly);
      setIsStandaloneMode(route.isStandalone || false);
      setCurrentView(route.view);
      if (route.adminTab) {
        setAdminTab(route.adminTab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleViewChange = (view: 'main' | 'apartments') => {
    setCurrentView(view);
    setIsAdminMode(false);
    setIsStatusOnlyMode(false);
    navigateToRoute({ view, isAdmin: false, isStatusOnly: false });
  };
  
  // Synchronously load cached settings and documents from localStorage to enable instant UI load
  const [settings, setSettings] = useState<SiteSettings>(() => {
    try {
      const stored = localStorage.getItem('sohtmon_site_settings');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return DEFAULT_SETTINGS;
  });

  // Dynamically update corporate brand positioning colors on document element
  useEffect(() => {
    const primary = settings.primaryColor || '#0F172A';
    const secondary = settings.secondaryColor || '#D97706';
    const accent = settings.accentColor || '#059669';

    document.documentElement.style.setProperty('--color-primary', primary);
    document.documentElement.style.setProperty('--color-secondary', secondary);
    document.documentElement.style.setProperty('--color-accent', accent);
  }, [settings.primaryColor, settings.secondaryColor, settings.accentColor]);
  
  const [documents, setDocuments] = useState<ProjectDocument[]>(() => {
    try {
      const stored = localStorage.getItem('sohtmon_project_documents');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return [];
  });
  
  const [selectedDoc, setSelectedDoc] = useState<ProjectDocument | null>(null);

  // Connection and Diagnostic States
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [dbErrorMsg, setDbErrorMsg] = useState<string | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  // Syncing / Loading
  const [isLoading, setIsLoading] = useState(true);

  // Optimized fast database loader: runs tests and data fetches concurrently via Promise.all
  const loadAppData = useCallback(async () => {
    setIsCheckingConnection(true);
    try {
      // 1. Establish connection first
      const conn = await testSupabaseConnection();
      setIsSupabaseConnected(conn.isConnected);
      setDbErrorMsg(conn.error);

      // 2. Fetch both settings and documents concurrently instead of sequentially
      const [settingsRes, docsRes] = await Promise.all([
        getSettings(!conn.isConnected),
        getDocuments(conn.isConnected)
      ]);

      setSettings(settingsRes.settings);
      setDocuments(docsRes.documents);
    } catch (e: any) {
      console.error('Ошибка загрузки данных:', e);
      setDbErrorMsg(e.message || 'Сетевая ошибка при загрузке.');
      setIsSupabaseConnected(false);

      // Parallelized fallback cached load
      try {
        const [cacheSettings, cacheDocs] = await Promise.all([
          getSettings(true),
          getDocuments(false)
        ]);
        setSettings(cacheSettings.settings);
        setDocuments(cacheDocs.documents);
      } catch (err) {
        console.error('Не удалось загрузить кэшированные данные:', err);
      }
    } finally {
      setIsLoading(false);
      setIsCheckingConnection(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    loadAppData();
  }, [loadAppData]);

  // Update document title when settings change
  useEffect(() => {
    document.title = settings?.textBold || "Sharora Building";
  }, [settings]);

  // Track page visits
  useEffect(() => {
    if (!isLoading && !isAdminMode) {
      if (currentView === 'main') {
        logAnalyticsEvent('site_visit');
      } else if (currentView === 'apartments') {
        logAnalyticsEvent('chessboard_visit');
      }
    }
  }, [currentView, isAdminMode, isLoading]);

  // Listen for consecutive typing of "2025" or "2026" to toggle Admin / Status Manager Mode
  const isAdminModeRef = useRef(isAdminMode);
  const isStatusOnlyModeRef = useRef(isStatusOnlyMode);
  
  useEffect(() => {
    isAdminModeRef.current = isAdminMode;
    isStatusOnlyModeRef.current = isStatusOnlyMode;
  }, [isAdminMode, isStatusOnlyMode]);

  useEffect(() => {
    let buffer = '';
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }

      const key = e.key;
      // We only care about numbers
      if (/^[0-9]$/.test(key)) {
        buffer = (buffer + key).slice(-4); // Keep only last 4 characters

        if (buffer === '2025') {
          const currentAdmin = isAdminModeRef.current;
          const currentStatusOnly = isStatusOnlyModeRef.current;
          // Toggle standard Admin Panel
          if (currentAdmin && !currentStatusOnly) {
            setIsAdminMode(false);
            navigateToRoute({ isAdmin: false });
          } else {
            setIsAdminMode(true);
            navigateToRoute({ isAdmin: true, isStatusOnly: false });
          }
          setIsStatusOnlyMode(false);
          buffer = '';
        } else if (buffer === '2026') {
          const currentAdmin = isAdminModeRef.current;
          const currentStatusOnly = isStatusOnlyModeRef.current;
          // Toggle Status Manager Mode
          if (currentAdmin && currentStatusOnly) {
            setIsAdminMode(false);
            setIsStatusOnlyMode(false);
            navigateToRoute({ isAdmin: false });
          } else {
            setIsAdminMode(true);
            setIsStatusOnlyMode(true);
            navigateToRoute({ isAdmin: true, isStatusOnly: true });
          }
          buffer = '';
        }
      } else {
        buffer = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Handle Save Settings
  const handleSaveSettings = async (newSettings: SiteSettings) => {
    await saveSettings(newSettings, isSupabaseConnected);
    setSettings(newSettings);
  };

  // Handle Add Document
  const handleAddDocument = async (title: string, imageUrl: string, images: string[], isActive: boolean) => {
    const newDoc = await addDocument({ title, imageUrl, images, isActive }, isSupabaseConnected);
    setDocuments(prev => [newDoc, ...prev]);
  };

  // Handle Update Document
  const handleUpdateDocument = async (id: string, updates: Partial<ProjectDocument>) => {
    await updateDocument(id, updates, isSupabaseConnected);
    setDocuments(prev => prev.map(doc => doc.id === id ? { ...doc, ...updates } : doc));
    
    if (selectedDoc && selectedDoc.id === id) {
      setSelectedDoc(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  // Handle Delete Document
  const handleDeleteDocument = async (id: string) => {
    await deleteDocument(id, isSupabaseConnected);
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    if (selectedDoc && selectedDoc.id === id) {
      setSelectedDoc(null);
    }
  };

  // Magnicent, text-less construction-themed preloader
  if (isLoading) {
    // If the logo is empty or the default placeholder Unsplash image, we render the gorgeous native rotating compass graphics instead of showing a static stranger's photo
    const isDefaultLogo = !settings.logoUrl || settings.logoUrl === DEFAULT_SETTINGS.logoUrl;
    const cachedLogo = isDefaultLogo ? null : settings.logoUrl;
    
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center relative overflow-hidden" id="app-loading-screen">
        {/* Architectural Blueprint Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />
        
        {/* Subtle diagonal blueprint desk glows */}
        <div className="absolute inset-x-0 h-[100%] top-[-50%] rotate-12 -skew-y-12 bg-[radial-gradient(ellipse_at_top_right,var(--color-amber-500),transparent_50%)] opacity-5 blur-[120px]" />
        
        {/* Blueprint loading preloader containing spinning drafts and structural compasses */}
        <div className="relative flex items-center justify-center w-64 h-64">
          {/* External Spinning Draft Ring */}
          <div className="absolute w-48 h-48 border border-dashed border-amber-500/25 rounded-full animate-[spin_10s_linear_infinite]" />
          
          {/* Inner Golden Precision Gear Circle */}
          <div className="absolute w-40 h-40 border border-double border-amber-500/40 rounded-full animate-[spin_5s_linear_infinite_reverse] before:content-[''] before:absolute before:inset-2 before:border before:border-dashed before:border-amber-500/20 before:rounded-full" />
          
          {/* Glowing pulse aura behind logo */}
          <div className="absolute w-28 h-28 bg-[#D97706]/10 rounded-full blur-xl animate-pulse" />
          
          {/* Core Construction Logo Wrapper with beautiful slide and pulse */}
          <div className="absolute w-28 h-28 bg-[#111822] border-2 border-amber-600/65 rounded-2xl flex items-center justify-center p-2.5 overflow-hidden shadow-2xl shadow-amber-500/10 hover:border-amber-500 transition-all duration-300 z-10 animate-[pulse_2s_ease-in-out_infinite]">
            {cachedLogo ? (
              <img 
                src={cachedLogo} 
                alt="Логотип" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-12 h-12 border-2 border-amber-500 rotate-45 flex items-center justify-center bg-slate-900 shadow">
                <div className="w-6 h-6 border border-dashed border-amber-500 rotate-12" />
              </div>
            )}
          </div>

          {/* Compass layout alignment desk marks */}
          <div className="absolute left-0 right-0 h-[1px] bg-amber-500/20 max-w-[260px] mx-auto pointer-events-none" />
          <div className="absolute top-0 bottom-0 w-[1px] bg-amber-500/20 max-h-[260px] my-auto pointer-events-none" />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen text-stone-800 antialiased font-sans relative" 
      id="app-root-container"
      style={{ backgroundColor: settings.backgroundColor || '#FFFFFF' }}
    >
      {/* Subtle construction watermark graphics background */}
      <AnimatedBackground />

      {/* Header displayed on top of non-admin page */}
      {!isAdminMode && (
        <Header
          onAdminToggle={() => {
            setIsAdminMode(true);
            navigateToRoute({ isAdmin: true, isStatusOnly: false });
          }}
          isAdminMode={false}
          isSupabaseConnected={isSupabaseConnected}
          currentView={currentView}
          onViewChange={handleViewChange}
          settings={settings}
          onOpenCalculator={() => setIsGlobalCalculatorOpen(true)}
          onOpenPhoneModal={() => setIsGlobalPhoneModalOpen(true)}
        />
      )}

      {/* Primary Workspace Route Container with beautiful fluid page animations */}
      <main id="app-main-view" className="overflow-visible pb-20 md:pb-0">
        <AnimatePresence mode="wait">
          {isAdminMode ? (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <AdminPanel
                settings={settings}
                documents={documents}
                isConnected={isSupabaseConnected}
                errorMsg={dbErrorMsg}
                isRefreshing={isCheckingConnection}
                onRefresh={loadAppData}
                onSaveSettings={handleSaveSettings}
                onAddDoc={handleAddDocument}
                onUpdateDoc={handleUpdateDocument}
                onDeleteDoc={handleDeleteDocument}
                statusOnlyMode={isStatusOnlyMode}
                isStandaloneMode={isStandaloneMode}
                initialTab={adminTab}
                onTabChange={(newTab) => {
                  setAdminTab(newTab);
                  navigateToRoute({ isAdmin: true, isStatusOnly: false, isStandalone: isStandaloneMode, adminTab: newTab });
                }}
                onBackToClient={() => {
                  setIsAdminMode(false);
                  setIsStatusOnlyMode(false);
                  setIsStandaloneMode(false);
                  navigateToRoute({ isAdmin: false, view: currentView });
                }}
              />
            </motion.div>
          ) : currentView === 'apartments' ? (
            <motion.div
              key="apartments"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <ApartmentsPage 
                settings={settings} 
                isCalculatorOpen={isGlobalCalculatorOpen}
                onOpenCalculator={() => setIsGlobalCalculatorOpen(true)}
                onCloseCalculator={() => setIsGlobalCalculatorOpen(false)}
                onOpenPhoneModal={() => setIsGlobalPhoneModalOpen(true)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <MainPage
                settings={settings}
                documents={documents}
                onSelectDocument={setSelectedDoc}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Persistent Mobile Bottom Navigation App Bar */}
      {!isStandaloneMode && (
        <MobileNavBar
          currentView={currentView}
          onViewChange={handleViewChange}
          isAdminMode={isAdminMode}
          onAdminToggle={() => {
            if (isAdminMode) {
              setIsAdminMode(false);
              setIsStatusOnlyMode(false);
              navigateToRoute({ isAdmin: false, view: currentView });
            } else {
              setIsAdminMode(true);
              const targetTab = adminTab || 'brand';
              navigateToRoute({ isAdmin: true, isStatusOnly: false, adminTab: targetTab });
            }
          }}
          settings={settings}
          onOpenPhoneModal={() => setIsGlobalPhoneModalOpen(true)}
        />
      )}

      {/* Phone Contact Modal triggered from bottom navigation or header */}
      <PhoneContactModal
        isOpen={isGlobalPhoneModalOpen}
        onClose={() => setIsGlobalPhoneModalOpen(false)}
        phoneNumber={settings.projectPhone || '+992000000000'}
      />

      {/* Fullscreen Overlay / Page modal view for single clicked document */}
      <DocumentModal
        document={selectedDoc}
        onClose={() => setSelectedDoc(null)}
      />
    </div>
  );
}
