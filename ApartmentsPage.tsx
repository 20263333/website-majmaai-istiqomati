import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, Phone, Square, ChevronRight, X, Layers, Image as ImageIcon, Sparkles, Building2, MapPin, Calculator, CheckCircle, MessageSquare, Send, RefreshCw, User, ZoomIn, ZoomOut, Maximize2, RotateCcw
} from 'lucide-react';
import { SiteSettings, Floor, Apartment } from '../types';
import { sendTelegramAlert } from '../supabaseClient';
import { recalculateApartmentNumbers } from '../utils/floorUtils';
import PhoneContactModal from './PhoneContactModal';
import ImageZoomModal from './ImageZoomModal';
import { logAnalyticsEvent } from '../analytics';
import { parseCurrentRoute, navigateToRoute } from '../router';

interface ApartmentsPageProps {
  settings: SiteSettings;
  isCalculatorOpen?: boolean;
  onOpenCalculator?: () => void;
  onCloseCalculator?: () => void;
  onOpenPhoneModal?: () => void;
}

export default function ApartmentsPage({ 
  settings,
  isCalculatorOpen: propsIsCalculatorOpen,
  onOpenCalculator,
  onCloseCalculator,
  onOpenPhoneModal
}: ApartmentsPageProps) {
  const rawFloorsList = settings.floors || [];
  const blocksList = settings.blocks && settings.blocks.length > 0 
    ? settings.blocks 
    : [{ id: 'block_default_a', name: 'Блок А' }];

  const defaultBlockId = blocksList[0]?.id || 'block_default_a';

  // Ensure apartment numbers start from 1 for every block individually
  const floorsList = recalculateApartmentNumbers(rawFloorsList, blocksList);

  // Resolve plan URL fallbacks and apartment fallbacks strictly per block
  const resolvedFloors: (Floor & { floorPlanUrl?: string })[] = floorsList.map(floor => {
    const floorBlockId = floor.blockId || defaultBlockId;
    const isShopFloorObj = floor.isShopFloor === true;
    
    // Get floors belonging ONLY to this floor's block
    const blockFloors = floorsList.filter(f => (f.blockId || defaultBlockId) === floorBlockId);
    
    const blockResFloors = blockFloors.filter(f => f.isShopFloor !== true).sort((a, b) => a.floorNumber - b.floorNumber);
    const blockShopFloors = blockFloors.filter(f => f.isShopFloor === true).sort((a, b) => a.floorNumber - b.floorNumber);

    // Default floor layout image specifically for THIS block
    const fallbackResPlanImg = blockResFloors.find(f => f.floorPlanUrl)?.floorPlanUrl || '';
    const fallbackShopPlanImg = blockShopFloors.find(f => f.floorPlanUrl)?.floorPlanUrl || '';

    // Resolve floorPlanUrl fallback
    let resolvedPlanUrl = floor.floorPlanUrl || '';
    if (!resolvedPlanUrl) {
      resolvedPlanUrl = isShopFloorObj ? fallbackShopPlanImg : fallbackResPlanImg;
    }

    // Base apartment templates for THIS block
    const baseResFloor = blockResFloors[0];
    const baseResAptsSorted = baseResFloor 
      ? [...(baseResFloor.apartments || [])].sort((a, b) => a.number - b.number)
      : [];

    const baseShopFloor = blockShopFloors[0];
    const baseShopAptsSorted = baseShopFloor 
      ? [...(baseShopFloor.apartments || [])].sort((a, b) => a.number - b.number)
      : [];

    // Sort to align by index
    const sortedApts = [...(floor.apartments || [])].sort((a, b) => a.number - b.number);
    const resolvedApts = sortedApts.map((apt, index) => {
      // Find corresponding base apartment at same sorted index in THIS block
      const baseApt = isShopFloorObj ? baseShopAptsSorted[index] : baseResAptsSorted[index];
      
      const resolvedArea = apt.area ? apt.area : (baseApt?.area || '');
      const resolvedPlanUrl = apt.planUrl ? apt.planUrl : (baseApt?.planUrl || '');

      return {
        ...apt,
        area: resolvedArea,
        planUrl: resolvedPlanUrl
      };
    });

    return {
      ...floor,
      floorPlanUrl: resolvedPlanUrl,
      apartments: resolvedApts
    };
  });

  // Helper to identify residential floors (хонаҳои истиқоматӣ)
  const isResidentialFloor = (f: Floor) => {
    if (f.isShopFloor === true) return false;
    if (f.floorType === 'shop' || f.floorType === 'basement_shop' || f.floorType === 'parking') return false;
    return true;
  };

  const initialRoute = parseCurrentRoute();
  const initialBlockId = (() => {
    if (initialRoute.blockId && blocksList.some(b => b.id === initialRoute.blockId)) {
      return initialRoute.blockId;
    }
    const blockA = blocksList.find(b => b.name.toLowerCase().includes('а') || b.name.toLowerCase().includes('a'));
    return blockA?.id || blocksList[0]?.id || 'block_default_a';
  })();

  const [selectedBlockId, setSelectedBlockId] = useState<string>(initialBlockId);

  const blockFloors = resolvedFloors.filter(f => (f.blockId || blocksList[0].id) === selectedBlockId);
  const sortedFloorsAsc = [...blockFloors].sort((a, b) => a.floorNumber - b.floorNumber);
  
  const initialFloorId = (() => {
    if (initialRoute.floorId && blockFloors.some(f => f.id === initialRoute.floorId)) {
      return initialRoute.floorId;
    }
    const firstResFloor = sortedFloorsAsc.find(isResidentialFloor);
    return firstResFloor?.id || sortedFloorsAsc[0]?.id || '';
  })();
  
  // States
  const [selectedFloorId, setSelectedFloorId] = useState<string>(initialFloorId);

  // Sync selected block and floor to browser URL
  useEffect(() => {
    if (selectedBlockId) {
      navigateToRoute({
        view: 'apartments',
        blockId: selectedBlockId,
        floorId: selectedFloorId || undefined
      }, false);
    }
  }, [selectedBlockId, selectedFloorId]);

  // Ensure valid floor when block changes
  useEffect(() => {
    if (selectedBlockId) {
      const currentBlockFloors = resolvedFloors.filter(f => (f.blockId || blocksList[0].id) === selectedBlockId);
      if (currentBlockFloors.length > 0) {
        if (!selectedFloorId || !currentBlockFloors.some(f => f.id === selectedFloorId)) {
          const sorted = [...currentBlockFloors].sort((a, b) => a.floorNumber - b.floorNumber);
          const firstRes = sorted.find(isResidentialFloor) || sorted[0];
          if (firstRes) {
            setSelectedFloorId(firstRes.id);
          }
        }
      }
    }
  }, [selectedBlockId, resolvedFloors]);

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const route = parseCurrentRoute();
      if (route.blockId && blocksList.some(b => b.id === route.blockId)) {
        setSelectedBlockId(route.blockId);
      }
      if (route.floorId) {
        setSelectedFloorId(route.floorId);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [blocksList]);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<Apartment & { floorNumber: number } | null>(null);
  const [viewedPlanModal, setViewedPlanModal] = useState<{ url: string; title: string; bgColor?: string; bgType?: string } | null>(null);
  const [cardScale, setCardScale] = useState<number>(100);

  // Buy / Booking form states
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerComment, setBuyerComment] = useState('');
  const [isSendingBuy, setIsSendingBuy] = useState(false);
  const [buySendSuccess, setBuySendSuccess] = useState(false);
  const [buyError, setBuyError] = useState('');

  const handleBuySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBuyError('');
    if (!buyerName.trim()) {
      setBuyError('Лутфан номи худро ворид кунед.');
      return;
    }
    if (!buyerPhone.trim()) {
      setBuyError('Лутфан рақами телефони худро ворид кунед.');
      return;
    }

    setIsSendingBuy(true);
    try {
      const currentBlockObj = blocksList.find(b => b.id === selectedBlockId);
      const activeBlockName = currentBlockObj ? currentBlockObj.name : 'Блок А';

      const message = `<b>Заявка на покупка</b>\n` +
                      `🏢 Блок: ${activeBlockName}\n` +
                      `👤 Ном: ${buyerName.trim()}\n` +
                      `📞 Ракам: ${buyerPhone.trim()}\n` +
                      `🏢 Этаж: ${selectedApartment?.floorNumber || 'Номаълум'}\n` +
                      `🚪 Хона: ${selectedApartment?.number || selectedApartment?.name || 'Номаълум'}\n` +
                      `💬 Комент: ${buyerComment.trim() || '-'}`;

      const res = await sendTelegramAlert(settings, message, 'bot1');
      if (res) {
        logAnalyticsEvent('buy_request');
        setBuySendSuccess(true);
        setBuyerName('');
        setBuyerPhone('');
        setBuyerComment('');
        setTimeout(() => {
          setBuySendSuccess(false);
          setIsBuyModalOpen(false);
        }, 3000);
      } else {
        setBuyError('Дархост фиристода нашуд. Танзимоти Телеграм ботро дар панели админ санҷед.');
      }
    } catch (err: any) {
      setBuyError(`Хатогӣ ҳангоми фиристодан: ${err.message || 'Номаълум'}`);
    } finally {
      setIsSendingBuy(false);
    }
  };

  // Calculator states
  const [internalIsCalcOpen, setInternalIsCalcOpen] = useState(false);
  const isCalculatorOpen = propsIsCalculatorOpen !== undefined ? propsIsCalculatorOpen : internalIsCalcOpen;

  const setIsCalculatorOpen = (val: boolean) => {
    setInternalIsCalcOpen(val);
    if (val) {
      if (onOpenCalculator) onOpenCalculator();
    } else {
      if (onCloseCalculator) onCloseCalculator();
    }
  };
  const [calcFloor, setCalcFloor] = useState<number>(2);
  const [calcArea, setCalcArea] = useState<number>(65);
  const [calcPaymentType, setCalcPaymentType] = useState<'installment' | 'cash'>('installment');
  const [calcDepositPercent, setCalcDepositPercent] = useState<number>(30);
  const [calcCustomDepositTjs, setCalcCustomDepositTjs] = useState<number | null>(null);

  const getSqmPriceTjs = (floor: number): number => {
    let p = 6500;
    if (settings.floorPrices && settings.floorPrices[String(floor)] !== undefined) {
      p = settings.floorPrices[String(floor)];
    } else {
      if (floor === 1) p = 11500;
      else if (floor >= 2 && floor <= 6) p = 6500;
      else if (floor >= 7 && floor <= 10) p = 6200;
      else if (floor >= 11 && floor <= 13) p = 5800;
      else if (floor >= 14) p = 6800;
    }
    return p < 2000 ? Math.round(p * 9.58) : p;
  };

  const getDepositPercentVal = (floor: number): number => {
    if (settings.floorDeposits && settings.floorDeposits[String(floor)] !== undefined) {
      return settings.floorDeposits[String(floor)];
    }
    if (floor === 1) return 100;
    if (floor >= 2 && floor <= 6) return 50;
    if (floor >= 7 && floor <= 10) return 40;
    if (floor >= 11) return 30;
    return 30;
  };

  const isCashOnlyFloor = settings.floorCashOnly && settings.floorCashOnly[String(calcFloor)] !== undefined
    ? settings.floorCashOnly[String(calcFloor)]
    : (calcFloor === 1);

  const currentSqmPriceTjs = getSqmPriceTjs(calcFloor);
  const totalCostTjs = calcArea * currentSqmPriceTjs;

  const isCashMode = calcPaymentType === 'cash' || isCashOnlyFloor;

  const effectiveDepositPercent = isCashMode
    ? 100
    : (calcCustomDepositTjs !== null && totalCostTjs > 0
        ? Math.min(100, Math.max(0, (calcCustomDepositTjs / totalCostTjs) * 100))
        : calcDepositPercent);

  const initialDepositTjs = isCashMode
    ? totalCostTjs
    : (calcCustomDepositTjs !== null
        ? Math.min(totalCostTjs, Math.max(0, calcCustomDepositTjs))
        : (totalCostTjs * calcDepositPercent) / 100);

  const remainingCostTjs = isCashMode ? 0 : Math.max(0, totalCostTjs - initialDepositTjs);

  const monthly18MonthsTjs = isCashMode ? 0 : remainingCostTjs / 18;
  const monthly24MonthsTjs = isCashMode ? 0 : remainingCostTjs / 24;

  const fmtTjs = (num: number) => {
    return new Intl.NumberFormat('ru-RU', {
      maximumFractionDigits: 0
    }).format(Math.round(num)) + ' сомонӣ';
  };

  const associatedFloor = selectedApartment 
    ? resolvedFloors.find(f => f.floorNumber === selectedApartment.floorNumber) 
    : null;
  const isShop = associatedFloor?.isShopFloor || false;

  // Active Floor ID checks if selectedFloorId exists in current list, otherwise defaults to the first available floor
  const activeFloorId = selectedFloorId && blockFloors.some(f => f.id === selectedFloorId)
    ? selectedFloorId
    : (sortedFloorsAsc[0]?.id || '');

  // Filtered floors to render (shows only the active selected floor)
  const renderedFloors = blockFloors.filter(f => f.id === activeFloorId);

  // Get total count of apartments
  const totalApartments = resolvedFloors.reduce((acc, f) => acc + (f.apartments?.length || 0), 0);

  // Status counts for the entire building project
  const statsFree = resolvedFloors.reduce((acc, f) => acc + (f.apartments || []).filter(a => (a.status || 'free') === 'free').length, 0);
  const statsBooked = resolvedFloors.reduce((acc, f) => acc + (f.apartments || []).filter(a => a.status === 'booked').length, 0);
  const statsSold = resolvedFloors.reduce((acc, f) => acc + (f.apartments || []).filter(a => a.status === 'sold').length, 0);

  return (
    <div className="bg-transparent min-h-[calc(100vh-80px)] text-[#1E293B] flex flex-col justify-between font-sans py-3 sm:py-6 px-3 sm:px-6 lg:px-8" id="apartments-chessboard-view">
      
      {/* Container wrapper - Expanded max-width for widescreen displays */}
      <div className="max-w-[1920px] mx-auto w-full flex-grow">
        
        {/* Mobile Toolbar for Calculator, Contacts, and Status indicators (Desktop header has them in main Header bar) */}
        <div className="md:hidden mb-4 border-b border-slate-200 pb-3 flex flex-col gap-3">
          
          {/* Calculator and Contact */}
          <div className="flex flex-row items-center gap-2 sm:gap-3 w-full shrink-0">
            <button
              onClick={() => {
                setCalcFloor(2);
                setCalcArea(65);
                setIsCalculatorOpen(true);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white py-2 px-3 rounded-sm shadow-sm transition-all text-[11px] font-bold uppercase tracking-wider cursor-pointer h-[38px]"
              id="calc-open-header-button-mobile"
            >
              <Calculator size={15} className="shrink-0" />
              <span className="truncate">Калькулятор</span>
            </button>

            <div 
              onClick={() => setIsPhoneModalOpen(true)}
              className="flex-1 flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-sm shadow-2xs h-[38px] cursor-pointer hover:border-slate-300 transition-all shrink-0"
            >
              <Building2 className="text-[#D97706] shrink-0" size={15} />
              <div className="text-left overflow-hidden">
                <span className="text-[9px] text-slate-400 font-mono tracking-wider block uppercase truncate leading-tight">Контакты</span>
                <a 
                  href={`tel:${settings.projectPhone}`} 
                  onClick={(e) => { e.preventDefault(); setIsPhoneModalOpen(true); }}
                  className="text-[11px] font-bold text-[#0F172A] hover:underline flex items-center gap-1 truncate leading-tight"
                >
                  {settings.projectPhone}
                </a>
              </div>
            </div>
          </div>

          {/* Status Indicator Counts */}
          <div 
            className="flex items-center justify-between gap-1.5 bg-white border border-slate-200 p-2 rounded-md shadow-2xs w-full overflow-x-auto" 
            id="header-chessboard-stats-mobile"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold font-mono w-full justify-between">
              <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/50 shrink-0" title="Свободно (Холи)">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span className="text-[10px] font-extrabold uppercase tracking-tight">{statsFree} СВОБОДНО</span>
              </span>
              <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-sky-50 text-sky-700 border border-sky-200/50 shrink-0" title="Забронировано (Брон)">
                <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0"></span>
                <span className="text-[10px] font-extrabold uppercase tracking-tight">{statsBooked} ЗАБРОНИРОВАНО</span>
              </span>
              <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200/50 shrink-0" title="Продано (Фурӯхта)">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                <span className="text-[10px] font-extrabold uppercase tracking-tight">{statsSold} ПРОДАНО</span>
              </span>
            </div>
          </div>

        </div>

        {floorsList.length === 0 ? (
          <div className="py-20 text-center bg-white border border-dashed border-slate-200 rounded-md shadow-2xs">
            <Layers className="mx-auto text-slate-300 mb-4 animate-pulse" size={48} />
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Этажи или квартиры пока не созданы</h3>
            <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto">
              Пожалуйста, войдите в панель администратора (введите код "2026" или "2025") и добавьте этажи в разделе "Управление статусом квартир"!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Full-width Block Selector Tabs across top of panels */}
            {blocksList.length > 0 && (
              <div className="bg-white border border-slate-200 p-3.5 sm:p-4 rounded-sm shadow-2xs w-full">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Building2 size={15} className="text-[#D97706]" />
                    <span>ВЫБОР БЛОКА</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider hidden sm:inline">
                    всего: {blocksList.length} блок
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
                  {blocksList.map(block => (
                    <button
                      key={block.id}
                      onClick={() => {
                        setSelectedBlockId(block.id);
                        const fList = resolvedFloors.filter(f => (f.blockId || blocksList[0].id) === block.id).sort((a, b) => a.floorNumber - b.floorNumber);
                        const targetFloor = fList.find(isResidentialFloor) || fList[0];
                        if (targetFloor) setSelectedFloorId(targetFloor.id);
                      }}
                      className={`px-4 py-2.5 rounded-sm text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 border ${
                        selectedBlockId === block.id
                          ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Building2 size={13} className={selectedBlockId === block.id ? 'text-[#D97706]' : 'text-slate-400'} />
                      <span>{block.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col lg:flex-row items-start gap-6">
              
              {/* Left selector column: Floors Navigation with independent scrollable sticky behavior */}
              <motion.div 
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full lg:w-64 xl:w-72 shrink-0 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto pr-1 space-y-4 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent"
                id="left-floors-sticky-sidebar"
              >

              <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-sm shadow-2xs">
                <h4 className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 sm:mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers size={13} className="text-[#D97706]" />
                    <span>Выбор этажа</span>
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 lg:hidden">
                    {blockFloors.length} ошёна
                  </span>
                </h4>

                {/* Mobile Horizontal Scrollable Floor Selector */}
                <div className="flex lg:hidden gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-1 -mx-1 px-1" id="floors-selection-mobile">
                  {blockFloors.length === 0 ? (
                    <div className="py-2 text-center text-slate-400 text-xs italic">
                      Дар ин блок ошёна нест
                    </div>
                  ) : (
                    [...blockFloors]
                      .sort((a, b) => a.floorNumber - b.floorNumber)
                      .map((floor) => (
                        <button
                          key={floor.id}
                          onClick={() => setSelectedFloorId(floor.id)}
                          className={`px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
                            activeFloorId === floor.id
                              ? 'text-white shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200/70 hover:bg-slate-100'
                          }`}
                          style={{
                            backgroundColor: activeFloorId === floor.id ? '#068ad9' : undefined,
                            borderColor: activeFloorId === floor.id ? '#068ad9' : undefined
                          }}
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            floor.floorType === 'parking' ? 'bg-purple-600' :
                            floor.floorType === 'basement_shop' ? 'bg-teal-600' :
                            floor.isShopFloor ? 'bg-blue-500' : 'bg-[#EAB308]'
                          }`} />
                          <span>
                            {floor.floorType === 'parking' ? `${floor.floorNumber} ${floor.customLabel || 'Парковка'}` :
                             floor.floorType === 'basement_shop' ? `${floor.floorNumber} ${floor.customLabel || 'Подвал'}` :
                             floor.customLabel ? `${floor.customLabel} ${floor.floorNumber}` :
                             `Этаж ${floor.floorNumber}`}
                          </span>
                        </button>
                      ))
                  )}
                </div>

                {/* Desktop Vertical Floors Stack */}
                <div className="hidden lg:flex flex-col gap-1.5 pb-2 lg:pb-0" id="floors-selection-stack">
                  {blockFloors.length === 0 ? (
                    <div className="py-4 text-center text-slate-400 text-xs italic">
                      В этом блоке нет этажей
                    </div>
                  ) : (
                    [...blockFloors]
                      .sort((a, b) => a.floorNumber - b.floorNumber)
                      .map((floor) => (
                        <button
                          key={floor.id}
                          onClick={() => setSelectedFloorId(floor.id)}
                          className={`w-full text-left px-3 py-2 sm:py-2.5 text-xs font-semibold rounded transition-all cursor-pointer flex items-center justify-between gap-2 border ${
                            activeFloorId === floor.id
                              ? 'text-white shadow-xs font-bold'
                              : 'bg-slate-50 text-slate-600 border-slate-200/40 hover:bg-slate-100'
                          }`}
                          style={{
                            backgroundColor: activeFloorId === floor.id ? '#068ad9' : undefined,
                            borderColor: activeFloorId === floor.id ? '#068ad9' : undefined
                          }}
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              floor.floorType === 'parking' ? 'bg-purple-600' :
                              floor.floorType === 'basement_shop' ? 'bg-teal-600' :
                              floor.isShopFloor ? 'bg-blue-500' : 'bg-[#EAB308]'
                            }`} />
                            <span className="truncate">
                              {floor.floorType === 'parking' ? `${floor.floorNumber} ${floor.customLabel || 'Парковка'}` :
                               floor.floorType === 'basement_shop' ? `${floor.floorNumber} ${floor.customLabel || 'Подвал'}` :
                               floor.customLabel ? `${floor.customLabel} ${floor.floorNumber}` :
                               `Этаж ${floor.floorNumber}`}
                            </span>
                          </span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                            activeFloorId === floor.id ? 'bg-slate-950 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {(floor.apartments || []).length} {
                              floor.floorType === 'parking' ? 'м.' :
                              floor.isShopFloor ? 'пом.' : 'кв.'
                            }
                          </span>
                        </button>
                      ))
                  )}
                </div>
              </div>

              {/* Tips & Instructions Panel */}
              <div className="bg-[#0F172A] text-white p-4 rounded-sm shadow border border-slate-800 relative overflow-hidden hidden lg:block">
                <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
                  <Building2 size={120} />
                </div>
                <h5 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1 mb-2">
                  <Sparkles size={12} />
                  <span>Знаете ли вы?</span>
                </h5>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  Нажав на любую квартиру справа, вы откроете окно с её точной планировкой, площадью и строительными чертежами.
                </p>
                <div className="mt-3 text-[10px] font-mono text-amber-500/80 uppercase">
                  ✓ Полный контроль • Высокая точность
                </div>
              </div>
            </motion.div>

            {/* Right container column: Chessboard Block Stack representation */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
              className="flex-1 min-w-0 space-y-6 w-full"
            >
              
              <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-sm shadow-2xs">
                
                <div className="flex flex-col gap-6" id="chessboard-layout-split">
                  
                  {/* Left side: Building floor-by-floor section */}
                  <div className="w-full flex flex-col gap-4" id="building-brick-chessboard">
                    {renderedFloors.map((floor) => {
                      const sortedApartments = [...(floor.apartments || [])].sort((a,b) => a.number - b.number);
                      
                      return (
                        <motion.div
                          key={floor.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                          className="flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-slate-50/60 p-3 sm:p-4 rounded-xl border border-slate-200/50"
                          id={`floor-brick-row-${floor.id}`}
                        >
                          {/* Floor tag identifier on left */}
                          <div className="md:w-36 py-2 px-3 sm:px-4 bg-[#0F172A] text-white font-mono font-bold text-xs rounded-lg shrink-0 flex items-center justify-between shadow-2xs md:justify-center">
                            <span className="uppercase tracking-widest text-[9px] text-amber-400 opacity-80 md:hidden">Этаж</span>
                            <span>
                              {floor.floorNumber} • {
                                floor.floorType === 'parking' ? (floor.customLabel || 'ПАРКОВКА').toUpperCase() :
                                floor.floorType === 'basement_shop' ? (floor.customLabel || 'ПОДВАЛ').toUpperCase() :
                                floor.isShopFloor ? (floor.customLabel || 'КОММЕРЦИЯ').toUpperCase() :
                                (floor.customLabel || 'ЭТАЖ').toUpperCase()
                              }
                            </span>
                          </div>

                          {/* Apartments grid inside this floor - responsive up to 8 columns so all 8 apartments fit on one row */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5 sm:gap-3 w-full flex-grow">
                            {sortedApartments.length === 0 ? (
                              <div className="col-span-full py-4 text-center text-slate-400 text-xs italic">
                                {floor.floorType === 'parking' ? 'На этом этаже нет парковочных мест' :
                                 floor.floorType === 'basement_shop' ? 'На этом этаже нет магазинов' :
                                 floor.isShopFloor ? 'На этом этаже нет коммерческих помещений' : 'На этом этаже нет квартир'}
                              </div>
                            ) : (
                              sortedApartments.map((apt, index) => {
                                const currentStatus = apt.status || 'free';
                                
                                let cardClasses = '';
                                let iconClasses = '';
                                let textClasses = '';
                                
                                if (currentStatus === 'free') {
                                  cardClasses = 'bg-emerald-50/60 border-emerald-500/25 hover:border-emerald-500 hover:bg-emerald-100/50 text-emerald-950';
                                  iconClasses = 'text-emerald-500';
                                  textClasses = 'text-emerald-600';
                                } else if (currentStatus === 'booked') {
                                  cardClasses = 'bg-sky-50/60 border-sky-500/25 hover:border-sky-500 hover:bg-sky-100/50 text-sky-950';
                                  iconClasses = 'text-sky-500';
                                  textClasses = 'text-sky-650';
                                } else {
                                  cardClasses = 'bg-rose-50/60 border-rose-500/25 hover:border-rose-500 hover:bg-rose-100/50 text-rose-950';
                                  iconClasses = 'text-rose-500';
                                  textClasses = 'text-rose-650';
                                }

                                return (
                                  <motion.button
                                    key={apt.id}
                                    initial={{ opacity: 0, scale: 0.92, y: 8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ 
                                      duration: 0.3, 
                                      delay: Math.min(index * 0.02, 0.25),
                                      ease: [0.16, 1, 0.3, 1]
                                    }}
                                    onClick={() => setSelectedApartment({ ...apt, floorNumber: floor.floorNumber })}
                                    className={`p-3.5 sm:p-4 rounded-xl border-2 transition-all text-left flex flex-col justify-between group cursor-pointer aspect-[1.15] shadow-xs hover:shadow-md ${cardClasses}`}
                                    id={`chessboard-apt-card-${apt.id}`}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span className="text-xs sm:text-sm font-black font-mono tracking-tight text-[#0f172a] block">
                                        {apt.name}
                                      </span>
                                      <Home size={13} className={`${iconClasses} stroke-[2.5]`} />
                                    </div>
                                    
                                    <div className="mt-4 flex items-baseline justify-between">
                                      <span className="text-xs sm:text-base font-black text-[#0F172A]">
                                        {apt.area ? `${apt.area} м²` : '---'}
                                      </span>
                                      {apt.planUrl && (
                                        <span className={`text-[10px] font-black uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity ${textClasses}`}>
                                          ПЛАН
                                        </span>
                                      )}
                                    </div>
                                  </motion.button>
                                );
                              })
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Active Floor General Layout Plan Card wrapper (At the bottom of apartments as requested) */}
                  {renderedFloors[0] && (
                    <motion.div
                      key={`plan-${renderedFloors[0].id}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.08, ease: 'easeOut' }}
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5"
                      id="active-floor-plan-card"
                    >
                      <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
                        <div>
                          <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block font-mono">
                            {renderedFloors[0].isShopFloor ? 'Схема планировки коммерции' : 'Схема планировки квартир'}
                          </span>
                          <h4 className="text-sm sm:text-base font-black text-[#0F172A] uppercase mt-0.5 tracking-tight flex items-center gap-1.5">
                            <Layers size={15} className="text-[#D97706]" />
                            <span>Схема этажа {renderedFloors[0].floorNumber}</span>
                          </h4>
                        </div>
                        
                        {/* Interactive Zoom Toolbar for the Floor Scheme Card */}
                        {renderedFloors[0].floorPlanUrl && (
                          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-white border border-slate-200 p-1.5 rounded-xl shadow-xs">
                            <button
                              onClick={() => setCardScale(prev => Math.max(prev - 20, 60))}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Дур кардан (Zoom Out)"
                            >
                              <ZoomOut size={14} />
                            </button>

                            <span className="text-[10px] font-mono font-bold text-slate-700 px-1 min-w-[38px] text-center">
                              {cardScale}%
                            </span>

                            <button
                              onClick={() => setCardScale(prev => Math.min(prev + 20, 220))}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Наздик кардан (Zoom In)"
                            >
                              <ZoomIn size={14} />
                            </button>

                            <button
                              onClick={() => setCardScale(100)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Бозсозӣ ба 100%"
                            >
                              <RotateCcw size={13} />
                            </button>

                            <div className="h-4 w-px bg-slate-200 mx-0.5" />

                            <button
                              onClick={() => setViewedPlanModal({
                                url: renderedFloors[0].floorPlanUrl!,
                                title: `Схема этажа ${renderedFloors[0].floorNumber} (Масштаб ва пеш бурдан)`,
                                bgColor: renderedFloors[0].planBgColor,
                                bgType: renderedFloors[0].planBgType
                              })}
                              className="flex items-center gap-1 px-2.5 py-1 bg-[#0F172A] hover:bg-slate-800 text-white text-[10px] font-bold font-mono rounded-lg transition-colors cursor-pointer shadow-xs"
                              title="Тамошо дар экрани пурра бо Масштаб ва Пеш бурдан"
                            >
                              <Maximize2 size={13} className="text-amber-400" />
                              <span className="hidden xs:inline">Калон кардан</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Dynamic height/width frame that fits actual image dimensions precisely instead of forced 4:3 */}
                      {renderedFloors[0].floorPlanUrl ? (
                        <div 
                          className={`rounded-xl overflow-auto flex items-center justify-center p-3 sm:p-5 relative group/plan cursor-zoom-in w-full max-w-4xl mx-auto h-auto min-h-[250px] transition-all duration-300 ${
                            renderedFloors[0].planBgType === 'color' 
                              ? 'border border-slate-200 shadow-xs' 
                              : 'border border-transparent bg-transparent'
                          }`}
                          style={{ 
                            backgroundColor: renderedFloors[0].planBgType === 'color' 
                              ? (renderedFloors[0].planBgColor || '#ffffff') 
                              : 'transparent' 
                          }}
                          onClick={() => setViewedPlanModal({
                            url: renderedFloors[0].floorPlanUrl!,
                            title: `Схема этажа ${renderedFloors[0].floorNumber} (Масштаб ва пеш бурдан)`,
                            bgColor: renderedFloors[0].planBgColor,
                            bgType: renderedFloors[0].planBgType
                          })}
                        >
                          <img
                             src={renderedFloors[0].floorPlanUrl}
                             alt={`Общая схема этажа ${renderedFloors[0].floorNumber}`}
                             className="h-auto max-h-[85vh] object-contain transition-transform duration-200"
                             style={{ 
                               width: `${(renderedFloors[0].planScale || 100) * (cardScale / 100)}%`, 
                               maxWidth: cardScale > 100 ? 'none' : '100%' 
                             }}
                             referrerPolicy="no-referrer"
                          />
                          <div className="absolute bottom-4 right-4 bg-[#0F172A]/90 text-white text-[9px] font-black font-mono px-3 py-1.5 rounded-lg uppercase tracking-wider pointer-events-none transition-all shadow-md flex items-center gap-1.5 border border-white/20">
                             <ZoomIn size={12} className="text-amber-400" />
                             <span>Масштаб ва пеш бурдан (Zoom)</span>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-slate-200 bg-slate-50 rounded-xl text-center text-slate-400 p-12 flex flex-col items-center justify-center gap-2.5 w-full max-w-2xl mx-auto min-h-[300px]">
                          <ImageIcon className="text-slate-300" size={42} />
                          <p className="font-bold text-xs text-slate-500">Изображение плана отсутствует</p>
                          <p className="text-[11px] text-slate-400 max-w-[220px] leading-relaxed mx-auto">
                            Для этого этажа общая схема планировки отсутствует.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}

                </div>

              </div>

            </motion.div>

          </div>
        </div>
        )}

      </div>

      {/* FOOTER STATS INFO */}
      <footer className="w-full text-center py-6 mt-12 border-t border-slate-200 text-[10px] font-mono uppercase tracking-widest text-[#64748B]">
        <div>© 2026 СИСТЕМА УПРАВЛЕНИЯ ЗДАНИЯМИ. ВСЕ ПРАВА ЗАЩИЩЕНЫ.</div>
      </footer>

      {/* DETAIL MODAL OVERLAY: When clicking on apartment to see plan and details */}
      <AnimatePresence>
        {selectedApartment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
            id="apt-detail-modal-overlay"
            onClick={() => setSelectedApartment(null)}
          >
            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
              className="bg-white border border-slate-200 rounded-sm shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-left"
              onClick={(e) => e.stopPropagation()} // stop click bubbling
              id="apt-detail-modal-box"
            >
              
              {/* Header */}
              <div className="bg-[#0F172A] text-white px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-500 font-mono tracking-widest uppercase bg-amber-500/10 px-1.5 py-0.5 rounded">
                      {isShop ? 'ИНФОРМАЦИЯ О ПОМЕЩЕНИИ' : 'ИНФОРМАЦИЯ О КВАРТИРЕ'}
                    </span>
                    <span className="text-xs text-slate-300 font-mono">
                      {selectedApartment.floorNumber < 0 ? 'Подвал/Парковка ' + selectedApartment.floorNumber : 'Этаж ' + selectedApartment.floorNumber}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold uppercase mt-1">
                    {selectedApartment.name} ({isShop ? 'коммерция' : 'квартира'} №{selectedApartment.number})
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedApartment(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                  title="Закрыть"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content Body */}
              <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                
                {/* Floor plan illustration */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase block">{isShop ? 'Планировка и схема коммерции' : 'Планировка и схема комнат (Floor Plan)'}</span>
                  
                  {selectedApartment.planUrl ? (
                    <div 
                      className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100 max-h-[320px] flex items-center justify-center relative shadow-inner group cursor-zoom-in"
                      onClick={() => setViewedPlanModal({
                        url: selectedApartment.planUrl!,
                        title: `Планировка: ${selectedApartment.name} (№${selectedApartment.number}${selectedApartment.area ? ' • ' + selectedApartment.area + ' м²' : ''})`
                      })}
                    >
                      <img
                        src={selectedApartment.planUrl}
                        alt={`План ${selectedApartment.name}`}
                        className="max-h-[320px] w-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute bottom-2.5 right-2.5 bg-[#0F172A]/90 text-white text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1.5 border border-white/20 transition-all group-hover:bg-[#D97706]">
                        <ZoomIn size={13} className="text-amber-400 group-hover:text-white" />
                        <span>Масштаб ва пеш бурдан (Zoom)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-10 border border-dashed border-slate-200 bg-slate-50 rounded-lg text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5">
                      <ImageIcon className="text-slate-300" size={24} />
                      <p className="font-bold text-slate-600">Чертеж не загружен</p>
                      <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed px-4">
                        Свяжитесь с нами по телефону, чтобы получить полную информацию.
                      </p>
                    </div>
                  )}
                </div>

                {/* Visual spec checklist grid */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center text-center min-w-0">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block truncate">
                      Этаж
                    </span>
                    <span className="text-xs font-black text-[#0F172A] mt-0.5 truncate">{selectedApartment.floorNumber < 0 ? (false ? 'Подвал' : 'Парковка') + ' (' + selectedApartment.floorNumber + ')' : selectedApartment.floorNumber + '-й этаж'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center text-center min-w-0">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block truncate">
                      Площадь
                    </span>
                    <span className="text-xs font-black text-[#0F172A] mt-0.5 truncate">
                      {selectedApartment.area ? `${selectedApartment.area} м²` : 'Не опред.'}
                    </span>
                  </div>
                  <div className={`p-2.5 border rounded-xl flex flex-col items-center justify-center text-center min-w-0 font-sans ${
                      (!selectedApartment.status || selectedApartment.status === 'free')
                        ? 'bg-emerald-50 border-emerald-500/20 text-emerald-800'
                        : selectedApartment.status === 'booked'
                          ? 'bg-sky-50 border-sky-500/20 text-sky-800'
                          : 'bg-rose-50 border-rose-500/20 text-rose-800'
                    }`}
                  >
                    <span 
                      className="text-[9px] opacity-75 font-bold uppercase tracking-wider block truncate"
                      style={{ fontWeight: 'normal' }}
                    >
                      Статус
                    </span>
                    <span className="text-[10px] font-black mt-0.5 tracking-tight uppercase flex items-center justify-center gap-1 truncate">
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-current shrink-0"></span>
                      <span className="truncate" style={{ fontWeight: 'bold' }}>
                        {(!selectedApartment.status || selectedApartment.status === 'free')
                          ? 'Свободно'
                          : selectedApartment.status === 'booked'
                            ? 'Бронь'
                            : 'Продано'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Call To Action options */}
                <div className="pt-4 border-t border-slate-100">
                  {selectedApartment.status === 'sold' ? (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-center gap-3.5" id="sold-owner-info-box">
                      <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0 text-rose-600 shadow-3xs hover:scale-105 transition-transform" id="sold-owner-avatar-container">
                        <User size={18} className="stroke-[2.5]" />
                      </div>
                      <div className="space-y-0.5 font-sans">
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block font-mono">
                          {isShop ? 'Владелец помещения (Собственник):' : 'Владелец квартиры (Собственник):'}
                        </span>
                        <p className="text-sm font-extrabold text-slate-800" id="sold-owner-name-display">
                          {selectedApartment.buyerName && selectedApartment.buyerName.trim() 
                            ? selectedApartment.buyerName.trim() 
                            : 'Договор оформлен / Имя не указано'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-row gap-1.5 w-full">
                      <a
                        href={`tel:${settings.projectPhone}`}
                        onClick={(e) => { e.preventDefault(); setIsPhoneModalOpen(true); }}
                        className="flex-1 flex flex-col min-[380px]:flex-row items-center justify-center gap-1 py-2 px-1 bg-[#D97706] hover:bg-[#B45309] text-white font-extrabold text-[9px] min-[360px]:text-[10px] sm:text-xs rounded-lg transition-all shadow-sm cursor-pointer uppercase tracking-wider text-center"
                        style={{ height: '45px', width: '82px' }}
                      >
                        <Phone size={12} className="shrink-0" />
                        <span className="truncate" style={{ fontWeight: 'normal' }}>Позвонить</span>
                      </a>

                      <button
                        onClick={() => setIsBuyModalOpen(true)}
                        className="flex-1 flex flex-col min-[380px]:flex-row items-center justify-center gap-1 py-2 px-1 bg-[#024F33] hover:bg-[#013522] text-white font-extrabold text-[9px] min-[360px]:text-[10px] sm:text-xs rounded-lg transition-all shadow-sm cursor-pointer uppercase tracking-wider text-center animate-none"
                        style={{ paddingTop: '8px', marginLeft: '-2px', marginTop: '0px', paddingBottom: '5px', marginRight: '2px', marginBottom: '3px' }}
                      >
                        <MessageSquare size={12} className="shrink-0" />
                        <span className="truncate" style={{ fontWeight: 'normal' }}>{isShop ? 'Купить' : 'Купить'}</span>
                      </button>

                      {!isShop && (
                        <button
                          onClick={() => {
                            const areaNum = selectedApartment ? parseFloat(selectedApartment.area || '65') : 65;
                            setCalcFloor(selectedApartment ? selectedApartment.floorNumber : 2);
                            setCalcArea(isNaN(areaNum) ? 65 : areaNum);
                            setSelectedApartment(null); // close detail modal
                            setIsCalculatorOpen(true); // open calculator modal
                          }}
                          className="flex-1 flex flex-col min-[380px]:flex-row items-center justify-center gap-1 py-2 px-1 border border-[#4F46E5] text-[#4F46E5] bg-indigo-50 hover:bg-indigo-100 hover:text-[#4338CA] font-extrabold text-[9px] min-[360px]:text-[10px] sm:text-xs rounded-lg transition-all cursor-pointer uppercase tracking-wider text-center"
                          style={{ height: '46px' }}
                        >
                          <Calculator size={12} className="shrink-0" />
                          <span className="truncate" style={{ fontWeight: 'normal' }}>Расчёт</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
 
      {/* INTERACTIVE ZOOM & PAN MODAL FOR FLOOR PLANS & APARTMENT LAYOUTS */}
      <ImageZoomModal
        isOpen={!!viewedPlanModal}
        imageUrl={viewedPlanModal?.url || null}
        title={viewedPlanModal?.title}
        bgColor={viewedPlanModal?.bgColor}
        bgType={viewedPlanModal?.bgType}
        onClose={() => setViewedPlanModal(null)}
      />

      {/* EXQUISITE INTERACTIVE CALCULATOR MODAL */}
      <AnimatePresence>
        {isCalculatorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
            id="apartment-calculator-modal-overlay"
            onClick={() => setIsCalculatorOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden text-left relative font-sans"
              onClick={(e) => e.stopPropagation()}
              id="apartment-calculator-modal-box"
            >
              
              {/* Header block */}
              <div className="text-white p-4 flex items-center justify-between relative shadow-sm shrink-0" style={{ backgroundColor: '#00225f' }}>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white/10 rounded-xl flex items-center justify-center text-white">
                    <Calculator size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-wider text-white uppercase leading-tight">
                      КАЛЬКУЛЯТОР
                    </h3>
                    <p className="text-[9px] text-[#A7F3D0] uppercase tracking-wider opacity-90 mt-0.5" style={{ fontWeight: 'normal' }}>
                      Расчет стоимости помещения
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCalculatorOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer"
                  title="Закрыть"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body and Calculations */}
              <div className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto bg-slate-50/40">
                
                {/* Inputs Row 1: Payment Mode Toggle */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider font-sans">
                    СПОСОБ ОПЛАТЫ / НАМУДИ ПАРДОХТ
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-200/70 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCalcPaymentType('installment')}
                      disabled={isCashOnlyFloor}
                      className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 uppercase tracking-tight ${
                        calcPaymentType === 'installment' && !isCashOnlyFloor
                          ? 'bg-[#024F33] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      } ${isCashOnlyFloor ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Layers size={13} />
                      <span>Рассрочка</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcPaymentType('cash')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 uppercase tracking-tight ${
                        calcPaymentType === 'cash' || isCashOnlyFloor
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Home size={13} />
                      <span>Нақдӣ (100%)</span>
                    </button>
                  </div>
                </div>

                {/* Inputs Row 2: Floor & Area */}
                <div className="grid grid-cols-2 gap-2">
                  {/* ЭТАЖ */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">
                      ЭТАЖ / ОШЁНА
                    </label>
                    <div className="relative flex items-center bg-white border border-slate-200 focus-within:border-emerald-500/50 rounded-xl px-2.5 py-1.5 transition-all">
                      <input
                        type="number"
                        min="1"
                        max="16"
                        value={calcFloor}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          const newFloor = isNaN(val) ? 2 : Math.max(1, Math.min(16, val));
                          setCalcFloor(newFloor);
                          setCalcDepositPercent(getDepositPercentVal(newFloor));
                          setCalcCustomDepositTjs(null);
                        }}
                        className="w-full bg-transparent font-black font-mono text-xs text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  {/* ПЛОЩАДЬ */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">
                      ПЛОЩАДЬ (м²) / МАСОҲАТ
                    </label>
                    <div className="relative flex items-center bg-white border-2 border-[#00B074] rounded-xl px-2.5 py-1 focus-within:border-[#008F5D] transition-all">
                      <input
                        type="number"
                        min="1"
                        value={calcArea}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setCalcArea(isNaN(val) ? 65 : val);
                        }}
                        className="w-full bg-transparent font-black font-mono text-xs text-slate-800 outline-none"
                      />
                      <span className="text-[9px] font-bold text-slate-500 ml-1 font-mono">м²</span>
                    </div>
                  </div>
                </div>

                {/* Main calculations Mint Green card block */}
                <div className="bg-[#E6F8F0] border border-[#BFF2DE] rounded-xl p-3.5 space-y-2 shadow-2xs">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-bold text-[#009E65] uppercase tracking-wider block mb-0.5">
                        ОБЩАЯ СТОИМОСТЬ (АРЗИШИ УМУМӢ)
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-[#024F33] tracking-tight block font-mono">
                        {fmtTjs(totalCostTjs)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-semibold text-[#009E65] uppercase tracking-wider block mb-0.5">
                        ЦЕНА ЗА 1 м²
                      </span>
                      <span className="text-sm sm:text-base font-black text-[#024F33] tracking-tight font-mono block">
                        {fmtTjs(currentSqmPriceTjs)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Down Payment (Пешпардохт) Section if Installment mode */}
                {!isCashMode ? (
                  <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-2 shadow-3xs">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
                        ПЕРВОНАЧАЛЬНЫЙ ВЗНОС / ПЕШПАРДОХТ:
                      </label>
                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-mono">
                        {Math.round(effectiveDepositPercent)}% ({fmtTjs(initialDepositTjs)})
                      </span>
                    </div>

                    {/* Quick percentage selector buttons */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {[20, 30, 40, 50].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            setCalcDepositPercent(pct);
                            setCalcCustomDepositTjs(null);
                          }}
                          className={`py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer font-mono ${
                            calcCustomDepositTjs === null && calcDepositPercent === pct
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>

                    {/* Custom Down Payment Amount Input (Somoni) */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                        Или укажите сумму взноса в сомони:
                      </span>
                      <div className="relative flex items-center bg-slate-50 border border-slate-200 focus-within:border-indigo-500 rounded-xl px-2.5 py-1.5 transition-all">
                        <input
                          type="number"
                          min="0"
                          max={totalCostTjs}
                          placeholder={String(Math.round(initialDepositTjs))}
                          value={calcCustomDepositTjs !== null ? calcCustomDepositTjs : ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (isNaN(val)) {
                              setCalcCustomDepositTjs(null);
                            } else {
                              setCalcCustomDepositTjs(Math.max(0, Math.min(totalCostTjs, val)));
                            }
                          }}
                          className="w-full bg-transparent font-black font-mono text-xs text-slate-800 outline-none"
                        />
                        <span className="text-[10px] font-black text-indigo-600 ml-1 font-mono">сомонӣ</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-center">
                    <span className="block text-[10px] font-black text-amber-800 uppercase tracking-wider mb-0.5">
                      Пардохти пурра бо нақдӣ (100% пешпардохт)
                    </span>
                    <p className="text-[11px] text-amber-700 font-bold leading-snug">
                      {isCashOnlyFloor
                        ? `Ошёнаи ${calcFloor} танҳо бо тарзи нақдӣ фурӯхта мешавад.`
                        : `Пардохти умумӣ: ${fmtTjs(totalCostTjs)} — бе рассрочка.`}
                    </p>
                  </div>
                )}

                {/* Installments monthly payment cards */}
                {!isCashMode && (
                  <div className="grid grid-cols-2 gap-2">
                    {/* 24 months box */}
                    <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 flex items-center gap-2 shadow-3xs">
                      <div className="p-2 bg-purple-50 text-purple-600 rounded-lg shrink-0">
                        <Layers size={15} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest block mb-0.5">
                          24 МЕСЯЦА (24 МОҲ)
                        </span>
                        <span className="text-xs sm:text-sm font-black text-purple-700 tracking-tight font-mono block truncate">
                          {fmtTjs(monthly24MonthsTjs)} / моҳ
                        </span>
                      </div>
                    </div>

                    {/* 18 months box */}
                    <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 flex items-center gap-2 shadow-3xs">
                      <div className="p-2 bg-sky-50 text-sky-600 rounded-lg shrink-0">
                        <Layers size={15} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest block mb-0.5">
                          18 МЕСЯЦЕВ (18 МОҲ)
                        </span>
                        <span className="text-xs sm:text-sm font-black text-sky-700 tracking-tight font-mono block truncate">
                          {fmtTjs(monthly18MonthsTjs)} / моҳ
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Informative suffix and solid bottom close button */}
                <div className="space-y-3 pt-1 shrink-0">
                  <p className="text-[9px] text-slate-400 text-center font-bold leading-relaxed">
                    © Ҳисоби нарх бо асъори миллӣ (сомонӣ) иҷро карда мешавад.
                  </p>
                  
                  <div className="flex flex-row gap-2">
                    <button
                      onClick={() => setIsCalculatorOpen(false)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#024F33] hover:bg-[#013522] text-white font-extrabold text-[10px] rounded-xl transition-all shadow-sm uppercase tracking-wider text-center cursor-pointer"
                      id="calc-modal-close-action"
                    >
                      <span>ПОНЯТНО</span>
                    </button>
                    
                    <a
                      href={`tel:${settings.projectPhone}`}
                      onClick={(e) => { e.preventDefault(); setIsPhoneModalOpen(true); }}
                      className="flex-1 flex items-center justify-center gap-1 py-2.5 px-3 border border-[#024F33] text-[#024F33] hover:bg-emerald-50 font-extrabold text-[10px] rounded-xl transition-all uppercase tracking-wider text-center cursor-pointer"
                    >
                      <Phone size={11} className="shrink-0" />
                      <span className="truncate font-bold">СВЯЗАТЬСЯ</span>
                    </a>
                  </div>
                </div>

              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BUY APARTMENT MODAL OVERLAY */}
      <AnimatePresence>
        {isBuyModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs z-60 flex items-center justify-center p-4 overflow-y-auto font-sans"
            id="buy-apartment-modal-overlay"
            onClick={() => setIsBuyModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-left"
              onClick={(e) => e.stopPropagation()}
              id="buy-apartment-modal-box"
            >
              {/* Header */}
              <div className="bg-[#024F33] text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black tracking-wider uppercase" style={{ fontWeight: 'normal', fontSize: '18px' }}>Заявка на покупку</h3>
                  <p className="text-[11px] text-[#A7F3D0] mt-0.5 font-medium" style={{ fontSize: '10px' }}>
                    {selectedApartment?.name} ({selectedApartment?.floorNumber < 0 ? 'Подвал/Парковка ' + selectedApartment?.floorNumber : 'Этаж ' + selectedApartment?.floorNumber}, Помещение №{selectedApartment?.number})
                  </p>
                </div>
                <button
                  onClick={() => setIsBuyModalOpen(false)}
                  className="p-1 text-emerald-100 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleBuySubmit} className="p-6 space-y-4">
                {buySendSuccess ? (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="py-8 text-center space-y-3 flex flex-col items-center justify-center"
                  >
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <CheckCircle size={28} />
                    </div>
                    <h4 className="text-base font-black text-slate-800 font-sans">Заявка успешно отправлена!</h4>
                    <p className="text-xs text-slate-400 max-w-xs leading-relaxed mx-auto text-center font-sans">
                      Ваша заявка на покупку была отправлена. Наш специалист свяжется с вами в ближайшее время. Спасибо за доверие!
                    </p>
                  </motion.div>
                ) : (
                  <>
                    {buyError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <X size={14} className="shrink-0" />
                        <span>{buyError}</span>
                      </div>
                    )}

                    <div className="space-y-3 font-sans">
                      {/* Name input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block" style={{ fontWeight: 'normal' }}>Ваше имя:</label>
                        <input
                          type="text"
                          required
                          placeholder="Ваше имя"
                          value={buyerName}
                          onChange={(e) => setBuyerName(e.target.value)}
                          className="w-full bg-[#F7F9FB] border border-slate-200 focus:border-[#024F33] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none transition-all text-slate-850"
                        />
                      </div>

                      {/* Phone input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block" style={{ fontWeight: 'normal' }}>Номер телефона:</label>
                        <input
                          type="text"
                          required
                          placeholder="Номер телефона"
                          value={buyerPhone}
                          onChange={(e) => setBuyerPhone(e.target.value)}
                          className="w-full bg-[#F7F9FB] border border-slate-200 focus:border-[#024F33] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none transition-all text-slate-850"
                        />
                      </div>

                      {/* Comment input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block" style={{ fontWeight: 'normal' }}>Комментарий или вопрос (необязательно):</label>
                        <textarea
                          placeholder="Напишите комментарий..."
                          value={buyerComment}
                          onChange={(e) => setBuyerComment(e.target.value)}
                          rows={3}
                          className="w-full bg-[#F7F9FB] border border-slate-200 focus:border-[#024F33] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none transition-all text-slate-850 resize-none font-sans"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex gap-2 font-sans">
                      <button
                        type="button"
                        onClick={() => setIsBuyModalOpen(false)}
                        className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl tracking-wider transition-all uppercase text-center cursor-pointer"
                        style={{ height: '39px' }}
                      >
                        Отмена
                      </button>
                      <button
                        type="submit"
                        disabled={isSendingBuy}
                        className="flex-1 py-3 px-4 bg-[#024F33] hover:bg-[#013522] text-white font-bold text-xs rounded-xl tracking-wider transition-all uppercase text-center cursor-pointer flex items-center justify-center gap-1.5"
                        style={{ height: '40px' }}
                      >
                        {isSendingBuy ? <RefreshCw className="animate-spin" size={13} /> : <Send size={13} />}
                        <span style={{ fontWeight: 'normal' }}>{isSendingBuy ? 'Отправка...' : 'Отправить заявку'}</span>
                      </button>
                    </div>
                  </>
                )}
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PhoneContactModal 
        isOpen={isPhoneModalOpen} 
        onClose={() => setIsPhoneModalOpen(false)} 
        phoneNumber={settings.projectPhone} 
      />

    </div>
  );
}
