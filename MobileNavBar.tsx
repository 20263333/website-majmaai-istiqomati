import { Home, LayoutGrid, LogIn, PhoneCall } from 'lucide-react';
import { SiteSettings } from '../types';

interface MobileNavBarProps {
  currentView: 'main' | 'apartments';
  onViewChange: (view: 'main' | 'apartments') => void;
  isAdminMode?: boolean;
  onAdminToggle?: () => void;
  settings: SiteSettings;
  onOpenPhoneModal?: () => void;
}

export default function MobileNavBar({
  currentView,
  onViewChange,
  isAdminMode = false,
  settings,
  onOpenPhoneModal
}: MobileNavBarProps) {
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

  const phoneNum = settings.projectPhone;

  const primaryColor = settings.primaryColor || '#0F172A';
  const secondaryColor = settings.secondaryColor || '#D97706';
  const accentColor = settings.accentColor || '#059669';

  return (
    <div 
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md border-t border-slate-200 shadow-2xl px-2 py-1 pb-safe transition-all" 
      style={{ backgroundColor: '#ffffff' }}
      id="mobile-app-bottom-bar"
    >
      <div className="flex items-center justify-around gap-1 max-w-md mx-auto">
        {/* Главная */}
        <button
          onClick={() => onViewChange('main')}
          className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer w-1/4 hover:bg-slate-50"
          style={{
            color: currentView === 'main' && !isAdminMode ? secondaryColor : '#94A3B8',
            backgroundColor: currentView === 'main' && !isAdminMode ? `${secondaryColor}25` : undefined
          }}
          id="mobile-nav-main"
        >
          <Home size={18} className="mb-0.5" />
          <span className="truncate max-w-full">Главная</span>
        </button>

        {/* Квартиры / Шахматка */}
        <button
          onClick={() => onViewChange('apartments')}
          className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer w-1/4 hover:bg-slate-50"
          style={{
            color: currentView === 'apartments' && !isAdminMode ? secondaryColor : '#94A3B8',
            backgroundColor: currentView === 'apartments' && !isAdminMode ? `${secondaryColor}25` : undefined
          }}
          id="mobile-nav-apartments"
        >
          <LayoutGrid size={18} className="mb-0.5" />
          <span className="truncate max-w-full">Квартиры</span>
        </button>

        {/* Занг / Заявка */}
        <button
          onClick={() => {
            if (onOpenPhoneModal) {
              onOpenPhoneModal();
            } else if (phoneNum) {
              window.location.href = `tel:${phoneNum.replace(/\s+/g, '')}`;
            }
          }}
          className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer w-1/4 hover:opacity-90"
          style={{
            color: accentColor,
            backgroundColor: `${accentColor}25`
          }}
          id="mobile-nav-call"
        >
          <PhoneCall size={18} className="mb-0.5 animate-pulse" style={{ color: accentColor }} />
          <span className="truncate max-w-full">Заявка</span>
        </button>

        {/* Вход / Auth */}
        <button
          onClick={handleAuthClick}
          className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[10px] font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer w-1/4"
          id="mobile-nav-auth"
        >
          <LogIn size={18} className="mb-0.5" />
          <span className="truncate max-w-full">Вход</span>
        </button>
      </div>
    </div>
  );
}
