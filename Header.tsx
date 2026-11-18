import { Building2, Settings2, LayoutGrid, Home, LogIn, Calculator } from 'lucide-react';
import { SiteSettings } from '../types';

interface HeaderProps {
  onAdminToggle: () => void;
  isAdminMode: boolean;
  isSupabaseConnected: boolean;
  currentView: 'main' | 'apartments';
  onViewChange: (view: 'main' | 'apartments') => void;
  settings: SiteSettings;
  onOpenCalculator?: () => void;
  onOpenPhoneModal?: () => void;
}

export default function Header({ 
  onAdminToggle, 
  isAdminMode, 
  isSupabaseConnected,
  currentView,
  onViewChange,
  settings,
  onOpenCalculator,
  onOpenPhoneModal
}: HeaderProps) {
  const handleAuthClick = () => {
    if (settings.authUrl && settings.authUrl.trim()) {
      let url = settings.authUrl.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      alert('Силкаи авторизация гузошта нашудааст. Лутфан дар Панели Админ бахши "Авторизация" силкаро ворид кунед.');
    }
  };

  // Status counts for header display
  const floorsList = settings.floors || [];
  const statsFree = floorsList.reduce((acc, f) => acc + (f.apartments || []).filter(a => (a.status || 'free') === 'free').length, 0);
  const statsBooked = floorsList.reduce((acc, f) => acc + (f.apartments || []).filter(a => a.status === 'booked').length, 0);
  const statsSold = floorsList.reduce((acc, f) => acc + (f.apartments || []).filter(a => a.status === 'sold').length, 0);

  return (
    <header className={`min-h-16 sm:h-20 bg-white border-b border-slate-200 px-3 sm:px-8 ${currentView === 'apartments' ? 'hidden md:flex' : 'flex'} flex-wrap items-center justify-between gap-2 py-2 shrink-0 sticky top-0 z-40`} id="app-header">
      <div 
        className="flex items-center gap-2 sm:gap-4 cursor-pointer select-none group shrink-0"
        onClick={() => onViewChange('main')}
        title="На главную"
        id="header-branding-logo"
      >
        {/* Dynamic Logo Image or Fallback Emblem */}
        {settings.logoUrl ? (
          <div 
            className="bg-white border border-slate-200/80 flex items-center justify-center rounded-lg overflow-hidden group-hover:scale-105 transition-transform duration-300 shadow-3xs shrink-0" 
            id="header-custom-logo-frame"
            style={{
              width: `${40 * ((settings.logoScaleHeader || 100) / 100)}px`,
              height: `${40 * ((settings.logoScaleHeader || 100) / 100)}px`,
            }}
          >
            <img 
              src={settings.logoUrl} 
              alt="Логотип" 
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain p-0.5"
            />
          </div>
        ) : (
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#0F172A] flex items-center justify-center rounded-lg group-hover:rotate-12 transition-transform duration-300 shrink-0" id="header-fallback-logo-frame">
            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white rotate-45"></div>
          </div>
        )}
        
        <div className="max-w-[160px] xs:max-w-[200px] sm:max-w-[280px]">
          <span 
            className="text-[12px] xs:text-[14px] font-normal tracking-tight text-[#0F172A] block leading-tight uppercase whitespace-nowrap truncate"
            style={{ fontFamily: 'Georgia, serif', fontWeight: 'normal' }}
            id="header-dynamic-title-bold"
          >
            {settings.textBold || 'ДУШАНБЕ МЕГА СИТИ'}
          </span>
        </div>
      </div>

      {/* Middle Section: Shown when on Apartments View */}
      {currentView === 'apartments' && (
        <div className="hidden md:flex items-center gap-2 sm:gap-3 shrink-0 my-1" id="header-apartments-toolbar">
          {/* КАЛЬКУЛЯТОР */}
          <button
            onClick={onOpenCalculator}
            className="flex items-center gap-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white py-1.5 px-3 rounded-sm shadow-2xs transition-all text-xs font-bold uppercase tracking-wider cursor-pointer h-9 shrink-0"
            id="header-calc-button"
            title="Калькулятор"
          >
            <Calculator size={14} className="shrink-0" />
            <span>Калькулятор</span>
          </button>

          {/* КОНТАКТЫ */}
          <div 
            onClick={onOpenPhoneModal}
            className="flex items-center gap-2 bg-white px-2.5 py-1 border border-slate-200 rounded-sm shadow-2xs h-9 cursor-pointer hover:border-slate-300 transition-all shrink-0"
            id="header-contact-box"
            title="Контакты"
          >
            <Building2 className="text-[#D97706] shrink-0" size={14} />
            <div className="text-left">
              <span className="text-[9px] text-slate-400 font-mono tracking-wider block uppercase leading-none">Контакты</span>
              <span className="text-[11px] font-bold text-[#0F172A] leading-tight block truncate">
                {settings.projectPhone || '+992206431001'}
              </span>
            </div>
          </div>

          {/* ОМОРИ СТАТУСИ ХОНАҲО (HOUSE STATUS STATS BADGES) */}
          <div 
            className="hidden lg:flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs h-9 shrink-0" 
            id="header-chessboard-stats"
            title="Омори статуси хонаҳо"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/50 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span className="text-[10px] font-extrabold uppercase tracking-tight">{statsFree} СВОБОДНО</span>
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200/50 shrink-0">
                <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0"></span>
                <span className="text-[10px] font-extrabold uppercase tracking-tight">{statsBooked} ЗАБРОНИРОВАНО</span>
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/50 shrink-0">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                <span className="text-[10px] font-extrabold uppercase tracking-tight">{statsSold} ПРОДАНО</span>
              </span>
            </div>
          </div>
        </div>
      )}

      <nav className="hidden md:flex gap-1.5 sm:gap-3 text-[11px] sm:text-sm font-bold items-center shrink-0" id="header-nav-items">
        {/* Асосӣ Button */}
        <button
          onClick={() => onViewChange('main')}
          className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-sm transition-all flex items-center gap-1 sm:gap-2 cursor-pointer border ${
            currentView === 'main'
              ? 'bg-slate-100 text-[#0F172A] border-slate-200'
              : 'text-slate-500 hover:text-[#0F172A] hover:bg-slate-50 border-transparent'
          }`}
          id="nav-btn-main"
        >
          <Home size={13} />
          <span>Главная</span>
        </button>

        {/* Хонаҳо (Chessboard Grid) Button */}
        <button
          onClick={() => onViewChange('apartments')}
          className="px-2 py-1.5 sm:px-3 sm:py-2 rounded-sm transition-all flex items-center gap-1 sm:gap-2 cursor-pointer border uppercase tracking-wider"
          style={{
            backgroundColor: currentView === 'apartments' ? `${settings.secondaryColor || '#D97706'}18` : 'transparent',
            color: currentView === 'apartments' ? (settings.secondaryColor || '#D97706') : '#64748B',
            borderColor: currentView === 'apartments' ? `${settings.secondaryColor || '#D97706'}30` : 'transparent',
            fontWeight: currentView === 'apartments' ? '900' : '500'
          }}
          id="nav-btn-apartments"
          title="Шахматка квартир"
        >
          <LayoutGrid size={13} className="stroke-[2.5]" />
          <span>Квартиры</span>
        </button>

        {/* Вход / Auth Button */}
        <button
          onClick={handleAuthClick}
          className="px-2 py-1.5 sm:px-3 sm:py-2 rounded-sm transition-all flex items-center gap-1 sm:gap-2 cursor-pointer border text-white font-bold uppercase tracking-wider text-[9px] hover:opacity-90"
          style={{ 
            fontSize: '9px',
            backgroundColor: settings.primaryColor || '#0F172A',
            borderColor: settings.primaryColor || '#0F172A'
          }}
          id="nav-btn-vhod"
          title="Вход / Авторизация"
        >
          <LogIn size={12} className="stroke-[2.5]" />
          <span>Вход</span>
        </button>
      </nav>
    </header>
  );
}
