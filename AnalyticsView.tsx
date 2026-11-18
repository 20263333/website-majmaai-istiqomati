import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, LayoutGrid, Phone, Send, Info, Calendar, Filter, 
  ChevronRight, ArrowUpRight, TrendingUp, TrendingDown, Clock, Search, RotateCcw
} from 'lucide-react';
import { getAnalyticsEvents, AnalyticsEvent, AnalyticsEventType, getLocalDateString } from '../analytics';
import { supabase } from '../supabaseClient';

export default function AnalyticsView() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday' | 'week' | '2weeks' | 'month' | '3months' | '6months' | 'year' | 'custom'>('today');
  
  // Custom Date range
  const [startDateStr, setStartDateStr] = useState<string>('');
  const [endDateStr, setEndDateStr] = useState<string>('');
  
  // Hover node tooltip states per chart
  const [hoveredPoints, setHoveredPoints] = useState<Record<string, { x: number; y: number; val: number; date: string; index: number } | null>>({});

  // Clean popover filter dropdown states
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Default fallback values based on actual today safe noon
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const start = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000); // 30 days ago
    setStartDateStr(getLocalDateString(start));
    setEndDateStr(getLocalDateString(today));
    
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const data = await getAnalyticsEvents();
      setEvents(data);
    } catch (e) {
      console.error('Error fetching analytics events', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Pre-calculate date range based on timeFilter using absolute ms subtraction to bypass DST rollovers
  const activeDateRange = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    let endDate = new Date(today);
    let startDate = new Date(today);

    switch (timeFilter) {
      case 'today':
        break;
      case 'yesterday':
        startDate = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000);
        endDate = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
        break;
      case '2weeks':
        startDate = new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
      default:
        startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
        break;
      case '3months':
        startDate = new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000);
        break;
      case '6months':
        startDate = new Date(today.getTime() - 179 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(today.getTime() - 364 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (startDateStr) {
          const [y, m, d] = startDateStr.split('-').map(Number);
          startDate = new Date(y, m - 1, d, 12, 0, 0);
        }
        if (endDateStr) {
          const [y, m, d] = endDateStr.split('-').map(Number);
          endDate = new Date(y, m - 1, d, 12, 0, 0);
        }
        break;
    }

    return { startDate, endDate };
  }, [timeFilter, startDateStr, endDateStr]);

  // Format date helper JS
  const formatDisplayDate = (d: Date) => {
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  // Total list of consecutive dates under current range
  const dateList = useMemo(() => {
    const list: Date[] = [];
    const current = new Date(activeDateRange.startDate);
    const end = new Date(activeDateRange.endDate);
    
    // Safety guard to avoid infinite loop
    let loops = 0;
    while (current <= end && loops < 500) {
      list.push(new Date(current));
      current.setDate(current.getDate() + 1);
      loops++;
    }
    
    if (list.length === 0) {
      list.push(new Date(activeDateRange.startDate));
    }
    return list;
  }, [activeDateRange]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    const startStr = getLocalDateString(activeDateRange.startDate);
    const endStr = getLocalDateString(activeDateRange.endDate);
    
    const list = events.filter((e) => e && e.id && !e.id.startsWith('mock_'));
    return list.filter((e) => e.date >= startStr && e.date <= endStr);
  }, [events, activeDateRange]);

  // Previous equivalent range for comparison percentage shift
  const previousPeriodEvents = useMemo(() => {
    const countDays = dateList.length;
    const prevStart = new Date(activeDateRange.startDate);
    prevStart.setDate(prevStart.getDate() - countDays);
    const prevEnd = new Date(activeDateRange.startDate);
    prevEnd.setDate(prevEnd.getDate() - 1);

    const prevStartStr = getLocalDateString(prevStart);
    const prevEndStr = getLocalDateString(prevEnd);

    const list = events.filter((e) => e && e.id && !e.id.startsWith('mock_'));
    return list.filter((e) => e.date >= prevStartStr && e.date <= prevEndStr);
  }, [events, activeDateRange, dateList]);

  // Aggregate stats
  const stats = useMemo(() => {
    const getCount = (evs: AnalyticsEvent[], type: AnalyticsEventType) => {
      // Direct unique devices daily check
      if (type === 'site_visit' || type === 'chessboard_visit') {
        const uniqueKeys = new Set(evs.filter((e) => e.event_type === type).map((e) => `${e.date}_${e.device_id}`));
        return uniqueKeys.size;
      }
      return evs.filter((e) => e.event_type === type).length;
    };

    const currentSiteVisits = getCount(filteredEvents, 'site_visit');
    const prevSiteVisits = getCount(previousPeriodEvents, 'site_visit');

    const currentChessboard = getCount(filteredEvents, 'chessboard_visit');
    const prevChessboard = getCount(previousPeriodEvents, 'chessboard_visit');

    const currentWhatsapp = getCount(filteredEvents, 'whatsapp_click');
    const prevWhatsapp = getCount(previousPeriodEvents, 'whatsapp_click');

    const currentPhone = getCount(filteredEvents, 'phone_click');
    const prevPhone = getCount(previousPeriodEvents, 'phone_click');

    const currentRequests = getCount(filteredEvents, 'buy_request');
    const prevRequests = getCount(previousPeriodEvents, 'buy_request');

    const computeChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return {
      site_visit: { current: currentSiteVisits, previous: prevSiteVisits, change: computeChange(currentSiteVisits, prevSiteVisits) },
      chessboard_visit: { current: currentChessboard, previous: prevChessboard, change: computeChange(currentChessboard, prevChessboard) },
      whatsapp_click: { current: currentWhatsapp, previous: prevWhatsapp, change: computeChange(currentWhatsapp, prevWhatsapp) },
      phone_click: { current: currentPhone, previous: prevPhone, change: computeChange(currentPhone, prevPhone) },
      buy_request: { current: currentRequests, previous: prevRequests, change: computeChange(currentRequests, prevRequests) },
    };
  }, [filteredEvents, previousPeriodEvents]);

  // Daily Chart coordinates generator (custom SVG paths)
  const getChartDataForType = (type: AnalyticsEventType) => {
    const dataPoints = dateList.map((dt) => {
      const dtStr = getLocalDateString(dt);
      const evsForDate = filteredEvents.filter((e) => e.date === dtStr && e.event_type === type);
      
      let count = evsForDate.length;
      if (type === 'site_visit' || type === 'chessboard_visit') {
        // Unique daily per device
        count = new Set(evsForDate.map((e) => e.device_id)).size;
      }

      return {
        date: formatDisplayDate(dt),
        dateFull: dtStr,
        val: count,
      };
    });

    return dataPoints;
  };

  const metricMetadata: Record<AnalyticsEventType, { title: string; color: string; bgSoft: string; icon: any }> = {
    site_visit: { title: 'Посетители сайта (уникальные)', color: '#3b82f6', bgSoft: 'rgba(59, 130, 246, 0.08)', icon: Users },
    chessboard_visit: { title: 'Просмотры шахматки (уникальные)', color: '#10b981', bgSoft: 'rgba(16, 185, 129, 0.08)', icon: LayoutGrid },
    whatsapp_click: { title: 'Клики на WhatsApp-чат', color: '#14b8a6', bgSoft: 'rgba(20, 184, 166, 0.08)', icon: Send },
    phone_click: { title: 'Клики "Позвонить по телефону"', color: '#d97706', bgSoft: 'rgba(217, 119, 6, 0.08)', icon: Phone },
    buy_request: { title: 'Запросы на покупку (Отправлено)', color: '#6366f1', bgSoft: 'rgba(99, 102, 241, 0.08)', icon: ArrowUpRight },
  };

  // Custom Spline SVG Path generator
  const generateSvgPaths = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return { line: '', area: '' };
    if (points.length === 1) {
      return {
        line: `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`,
        area: `M ${points[0].x} ${points[0].y} L ${points[0].x} 185 L ${points[0].x} 185 Z`,
      };
    }

    let linePath = `M ${points[0].x} ${points[0].y}`;
    
    // Draw smooth cubic curves connecting the coordinates
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;

      linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }

    const firstPt = points[0];
    const lastPt = points[points.length - 1];
    const areaPath = `${linePath} L ${lastPt.x} 185 L ${firstPt.x} 185 Z`;

    return { line: linePath, area: areaPath };
  };

  return (
    <div className="space-y-8" id="admin-analytics-container">
      
      {/* Visual Analytics Hero Header section */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-md" id="analytics-hero">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-15" />
        <div className="absolute top-10 right-10 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
          <div>
            <div className="flex items-center gap-2 text-blue-400 text-xs font-mono font-bold uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Статистика активности
            </div>
            <h2 className="text-xl sm:text-2xl font-normal tracking-tight mt-1 animate-fade-in">ИНТЕРАКТИВНАЯ АНАЛИТИКА САЙТА</h2>
            <p className="text-[13px] leading-[12.75px] text-slate-300 mt-1 max-w-xl font-normal">
              Отслеживайте взаимодействия посетителей, популярность шахматки квартир, телефонные звонки, переходы в WhatsApp и прямые заявки на покупку.
            </p>
          </div>
          
          <button 
            onClick={fetchEvents}
            className="self-start md:self-auto py-2.5 px-4 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white border border-slate-700/50 rounded-xl text-xs font-normal transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
          >
            <RotateCcw size={14} className={isLoading ? 'animate-spin' : ''} />
            Синхронизировать
          </button>
        </div>
      </div>

      {/* Modern Compact Toolbar replacement for the big open filter box */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 shadow-xs" id="analytics-toolbar">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono block leading-none">ПЕРИОД АНАЛИЗА / ДАВРАИ ТАҲЛИЛ</span>
          <span className="text-xs font-bold text-slate-700 mt-1 inline-block">
            {timeFilter === 'today' && 'Сегодня (Имрӯз)'}
            {timeFilter === 'yesterday' && 'Вчера (Дирӯз)'}
            {timeFilter === 'week' && 'Последние 7 дней (7 рӯзи охир)'}
            {timeFilter === '2weeks' && 'Последние 14 дней (14 рӯзи охир)'}
            {timeFilter === 'month' && 'Последние 30 дней (30 рӯзи охир)'}
            {timeFilter === '3months' && 'Последние 3 месяца (3 моҳи охир)'}
            {timeFilter === '6months' && 'Последние 6 месяцев (6 моҳи охир)'}
            {timeFilter === 'year' && 'Последний 1 год (1 соли охир)'}
            {timeFilter === 'custom' && `Календарь (${formatDisplayDate(activeDateRange.startDate)} - ${formatDisplayDate(activeDateRange.endDate)})`}
          </span>
        </div>

        {/* Floating popover wrapper */}
        <div className="relative" ref={filterDropdownRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`p-2 rounded-lg border text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-xs ${
              isFilterOpen || timeFilter !== 'today' 
                ? 'border-slate-800 bg-slate-150 text-slate-900 ring-2 ring-slate-100' 
                : 'border-slate-200 bg-white'
            }`}
            title="Выбрать период"
          >
            <Filter size={15} />
          </button>

          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-3"
              >
                <div className="text-[10px] font-black tracking-wider text-slate-400 uppercase mb-2 font-mono">Выбрать период:</div>
                
                <div className="flex flex-col gap-1">
                  {(
                    [
                      { id: 'today', label: 'Сегодня' },
                      { id: 'yesterday', label: 'Вчера' },
                      { id: 'week', label: '7 дней' },
                      { id: '2weeks', label: '2 недели' },
                      { id: 'month', label: '30 дней' },
                      { id: '3months', label: '3 месяца' },
                      { id: '6months', label: '6 месяцев' },
                      { id: 'year', label: '1 год' },
                      { id: 'custom', label: 'Календарь' }
                    ] as const
                  ).map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => {
                        setTimeFilter(filter.id);
                        if (filter.id !== 'custom') {
                          setIsFilterOpen(false);
                        }
                      }}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        timeFilter === filter.id
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span>{filter.label}</span>
                      {timeFilter === filter.id && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                    </button>
                  ))}
                </div>

                {timeFilter === 'custom' && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Начало</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={startDateStr}
                          onChange={(e) => setStartDateStr(e.target.value)}
                          className="w-full pl-8 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-slate-800 text-slate-700"
                        />
                        <Calendar size={11} className="absolute left-2.5 top-2 text-slate-400" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Конец</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={endDateStr}
                          onChange={(e) => setEndDateStr(e.target.value)}
                          className="w-full pl-8 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-slate-800 text-slate-700"
                        />
                        <Calendar size={11} className="absolute left-2.5 top-2 text-slate-400" />
                      </div>
                    </div>

                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-lg text-xs font-bold transition-all font-mono tracking-wider cursor-pointer mt-1"
                    >
                      ПРИМЕНИТЬ
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>



      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white border border-slate-200 rounded-2xl" id="analytics-spinner">
          <RotateCcw className="animate-spin text-slate-400 mb-3" size={24} />
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest font-mono">Строим аналитическую модель...</p>
        </div>
      ) : (
        <>
          {/* Key Metrics Overviews Bento Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="stats-bento-grid">
            {(Object.keys(metricMetadata) as AnalyticsEventType[]).map((type) => {
              const item = stats[type];
              const meta = metricMetadata[type];
              const Icon = meta.icon;
              const isPositive = item.change >= 0;

              return (
                <div key={type} className="bg-white border border-slate-200 p-5 rounded-2xl hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase font-normal text-slate-400 tracking-wider truncate max-w-[120px]" title={meta.title}>
                      {type === 'site_visit' ? 'Визиты' : type === 'chessboard_visit' ? 'Шахматка' : type === 'whatsapp_click' ? 'WhatsApp' : type === 'phone_click' ? 'Звонки' : 'Заявки'}
                    </span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: meta.bgSoft, color: meta.color }}>
                      <Icon size={14} className="stroke-[2.5]" />
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-2xl font-black text-slate-800 leading-none">{item.current}</p>
                    
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className={`flex items-center gap-0.5 text-[10px] font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        <span>{isPositive ? '+' : ''}{item.change}%</span>
                      </div>
                      <span className="text-[9px] text-slate-400">vs пр. период</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Premium customized SVG Spline charts (One for each report) */}
          <div className="space-y-6" id="analytics-charts-deck">
            {(Object.keys(metricMetadata) as AnalyticsEventType[]).map((type) => {
              const meta = metricMetadata[type];
              const Icon = meta.icon;
              const chartData = getChartDataForType(type);

              // Find maximum value to normalize coordinates
              const maxValue = Math.max(...chartData.map((d) => d.val), 1);
              
              // Map items to SVG coordinates (600px width, 200px height - with padding bounds: 20px to 580px, 30px to 170px)
              const svgPoints = chartData.map((d, index) => {
                const totalPoints = chartData.length;
                const x = totalPoints > 1 ? 25 + (index / (totalPoints - 1)) * 550 : 300;
                const y = 170 - (d.val / maxValue) * 140; // max value sits at height 30, 0 sits at 170
                return { x, y, val: d.val, date: d.date, index };
              });

              const paths = generateSvgPaths(svgPoints);
              const hoveredPoint = hoveredPoints[type];

              // Pick 5 date labels safely spaced
              const labelsCount = chartData.length;
              const step = Math.max(Math.ceil(labelsCount / 6), 1);
              const visibleLabelsIndices = Array.from({ length: 7 }, (_, i) => Math.min(i * step, labelsCount - 1)).filter((v, i, self) => self.indexOf(v) === i);

              const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                
                // Find nearest point
                let nearest = svgPoints[0];
                let minDistance = Infinity;
                svgPoints.forEach((p) => {
                  const relativeX = (p.x / 600) * rect.width;
                  const dist = Math.abs(mouseX - relativeX);
                  if (dist < minDistance) {
                    minDistance = dist;
                    nearest = p;
                  }
                });

                if (nearest) {
                  setHoveredPoints((prev) => ({ ...prev, [type]: nearest }));
                }
              };

              const handleMouseLeave = () => {
                setHoveredPoints((prev) => ({ ...prev, [type]: null }));
              };

              return (
                <div key={type} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs" id={`chart-${type}`}>
                  
                  {/* Chart header area */}
                  <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: meta.bgSoft, color: meta.color }}>
                        <Icon size={14} className="stroke-[2.5]" />
                      </div>
                      <div>
                        <h3 className="text-xs font-normal uppercase text-slate-800 tracking-wider">{meta.title}</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">Динамика по выбранным дням ({chartData.length} дн.)</p>
                      </div>
                    </div>
                    
                    {/* Max total flag indicator */}
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 font-normal uppercase tracking-wider block">Пик (Максимум)</span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 rounded-md text-slate-700" style={{ color: meta.color }}>
                        {Math.max(...chartData.map((d) => d.val))} за день
                      </span>
                    </div>
                  </div>

                  {/* SVG Stage container */}
                  <div className="p-6 relative">
                    
                    {/* Tooltip Overlay */}
                    <AnimatePresence>
                      {hoveredPoint && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute bg-slate-900 text-white rounded-lg px-3 py-1.5 shadow-xl border border-slate-800 pointer-events-none z-20 text-[11px]"
                          style={{
                            left: `${(hoveredPoint.x / 600) * 100}%`,
                            top: `${(hoveredPoint.y / 200) * 100 - 15}%`,
                            transform: 'translate(-50%, -100%)',
                          }}
                        >
                          <div className="font-mono text-[9px] text-slate-400">{chartData[hoveredPoint.index].dateFull}</div>
                          <div className="font-black mt-0.5 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                            <span>{hoveredPoint.val} взаимодействий</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Spline Chart stage */}
                    <div className="w-full h-48 sm:h-64 relative">
                      <svg
                        viewBox="0 0 600 200"
                        className="w-full h-full overflow-visible xl:px-4"
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                      >
                        <defs>
                          <linearGradient id={`gradient-${type}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={meta.color} stopOpacity="0.22" />
                            <stop offset="100%" stopColor={meta.color} stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Dashed Gridlines background */}
                        <line x1="25" y1="30" x2="575" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                        <line x1="25" y1="100" x2="575" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                        <line x1="25" y1="170" x2="575" y2="170" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />

                        {/* Gradient Backdrop Fill */}
                        <path d={paths.area} fill={`url(#gradient-${type})`} />

                        {/* Smooth Line Curve */}
                        <path
                          d={paths.line}
                          fill="none"
                          stroke={meta.color}
                          strokeWidth="3"
                          strokeLinecap="round"
                        />

                        {/* Custom visual hover vertical line tracker */}
                        {hoveredPoint && (
                          <line
                            x1={hoveredPoint.x}
                            y1="20"
                            x2={hoveredPoint.x}
                            y2="185"
                            stroke={meta.color}
                            strokeWidth="1"
                            strokeDasharray="2 2"
                            opacity="0.65"
                          />
                        )}

                        {/* Points Anchor overlays */}
                        {svgPoints.map((pt, idx) => {
                          const isHovered = hoveredPoint && hoveredPoint.index === idx;
                          return (
                            <circle
                              key={idx}
                              cx={pt.x}
                              cy={pt.y}
                              r={isHovered ? 6 : 3.5}
                              fill={isHovered ? meta.color : "#ffffff"}
                              stroke={meta.color}
                              strokeWidth={isHovered ? 2 : 2.5}
                              className="transition-all duration-150"
                            />
                          );
                        })}

                        {/* Date axis label texts */}
                        {visibleLabelsIndices.map((ptIdx) => {
                          const pt = svgPoints[ptIdx];
                          if (!pt) return null;
                          return (
                            <text
                              key={ptIdx}
                              x={pt.x}
                              y="195"
                              textAnchor="middle"
                              fill="#94a3b8"
                              className="text-[9px] font-mono leading-none tracking-tight font-semibold"
                            >
                              {pt.date}
                            </text>
                          );
                        })}
                      </svg>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>


        </>
      )}

    </div>
  );
}
