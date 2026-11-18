import { useState, FormEvent, CSSProperties } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, Phone, FileSpreadsheet, ChevronRight, Compass, Home, Map as MapIcon, 
  ArrowRight, PhoneCall, Globe2, Building, X, Image as ImageIcon,
  Mail, MessageSquare, Send, CheckCircle, RefreshCw
} from 'lucide-react';
import { SiteSettings, ProjectDocument } from '../types';
import { sendTelegramAlert } from '../supabaseClient';
import PhoneContactModal from './PhoneContactModal';

interface MainPageProps {
  settings: SiteSettings;
  documents: ProjectDocument[];
  onSelectDocument: (doc: ProjectDocument) => void;
}

export default function MainPage({ settings, documents, onSelectDocument }: MainPageProps) {
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  const [caseLightboxData, setCaseLightboxData] = useState<{images: string[], index: number} | null>(null);

  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);

  // Suggestions / Complaints states
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackPhone, setFeedbackPhone] = useState('');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  const handleFeedbackSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedbackError('');
    if (!feedbackName.trim()) {
      setFeedbackError('Пожалуйста, введите ваше имя.');
      return;
    }
    if (!feedbackPhone.trim()) {
      setFeedbackError('Пожалуйста, введите ваш номер телефона.');
      return;
    }
    if (!feedbackComment.trim()) {
      setFeedbackError('Пожалуйста, напишите ваше предложение или жалобу.');
      return;
    }

    setIsSendingFeedback(true);
    try {
      const message = `<b>Предложение или Жалоба</b>\n` +
                      `👤 Имя: ${feedbackName.trim()}\n` +
                      `📞 Номер: ${feedbackPhone.trim()}\n` +
                      `📝 Комментарий: ${feedbackComment.trim()}`;

      const res = await sendTelegramAlert(settings, message, 'bot1');
      if (res) {
        setFeedbackSuccess(true);
        setFeedbackName('');
        setFeedbackPhone('');
        setFeedbackComment('');
        setTimeout(() => {
          setFeedbackSuccess(false);
          setIsFeedbackOpen(false);
        }, 3000);
      } else {
        setFeedbackError('Запрос не отправлен. Проверьте настройки Telegram-бота в панели администратора.');
      }
    } catch (err: any) {
      setFeedbackError(`Ошибка при отправке: ${err.message || 'Неизвестно'}`);
    } finally {
      setIsSendingFeedback(false);
    }
  };

  // Only show active documents
  const activeDocs = documents.filter(d => d.isActive);
  const galleryImages = (settings.gallery || []).slice(0, 10);

  const handlePrevImg = () => {
    setActiveImgIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };

  const handleNextImg = () => {
    setActiveImgIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="bg-transparent min-h-[calc(100vh-80px)] text-[#1E293B] flex flex-col justify-between font-sans" id="main-client-view">
      
      {/* Brand Hero Banner Section - Full Width & Premium Styled */}
      <div className="w-full text-center py-4 sm:py-8 bg-white/40 backdrop-blur-xs border-b border-slate-200/50" id="hero-brand-header">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex flex-col items-center space-y-4">
          
          {/* 1UM ТЕКСТ: ЖИРНЫЙ (Ихтиёрӣ) */}
          {settings.showTextBold !== false && (
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight text-[#0F172A] tracking-tighter uppercase text-center mt-2"
              id="hero-text-bold"
            >
              {settings.textBold}
            </motion.h1>
          )}

          {/* 2UM ТЕКСТ: КАМТАР ЖИРНЫЙ */}
          {settings.textMedium && (
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className={`text-[12px] sm:text-base md:text-lg font-semibold text-slate-500 tracking-wider uppercase text-center ${
                settings.showTextBold !== false ? '!mt-[-8px] sm:!mt-[-12px]' : 'mt-1'
              }`}
              id="hero-text-medium"
            >
              {settings.textMedium}
            </motion.h2>
          )}

          {/* LARGE HERO BANNER IMAGE */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="w-full mt-4 sm:mt-6"
            id="hero-16-9-banner-container"
          >
            <div className="w-full h-[280px] xs:h-[350px] sm:h-[480px] md:h-[580px] lg:h-[650px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-200/90 bg-slate-100 relative group">
              <img 
                src={settings.heroBannerUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=80'} 
                alt="Маҷмааи истиқоматӣ" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none opacity-70 group-hover:opacity-40 transition-opacity" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-8 md:p-10 space-y-10" id="main-client-container">
        
        {/* ROW 1: Project Description & Google Map standing side-by-side */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch" id="desc-and-map-row">
          
          {/* Project Details redesigned for elegance & modern aesthetics */}
          <motion.div 
            initial={{ opacity: 0, y: 80 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            className="p-8 md:p-10 bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs hover:shadow-md rounded-2xl space-y-5 flex flex-col justify-center h-full relative overflow-hidden transition-all duration-300" 
            id="desc-box"
          >
            {/* Elegant glowing background blur dot */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#D97706]/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full flex items-center gap-2 w-fit" style={{ backgroundColor: '#0a90e0' }}>
                <Compass size={13} className="stroke-[2.5]" style={{ borderColor: '#000a87' }} />
                <span style={{ color: '#1c006c' }}>Описание проекта</span>
              </h3>
              
              {/* Decorative engineering detail */}
              <div className="text-slate-300/40 hidden sm:flex items-center gap-1 font-mono text-[9px] select-none uppercase tracking-widest">
                <span>01/Project</span>
              </div>
            </div>

            <p className="text-slate-600 text-sm md:text-[15px] leading-relaxed text-justify font-sans whitespace-pre-line" id="client-project-desc">
              {settings.projectDescription}
            </p>
          </motion.div>

          {/* Right Column: Google Map & Address/Contacts directly below it */}
          <motion.div 
            initial={{ opacity: 0, y: 80 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4, delay: 0.15 }}
            className="flex flex-col gap-6 h-full justify-between" 
            id="map-and-contacts-column"
          >
            {/* Maps Block - Precise aspect frame standing side-by-side */}
            <div className="bg-white border border-slate-200 p-2 shadow-xs rounded-lg min-h-[300px] flex-1 relative text-[12px]" id="map-box">
              {settings.mapIframeUrl ? (
                <div className="w-full h-full min-h-[250px] relative" id="client-map-aspect-frame">
                  <iframe
                    src={settings.mapIframeUrl}
                    title="Местоположение строительного проекта в г. Душанбе"
                    className="w-full h-full min-h-[250px] border-0 rounded-sm"
                    allowFullScreen={true}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    id="client-map-iframe"
                  ></iframe>
                </div>
              ) : (
                <div className="absolute inset-0 bg-[#E2E8F0] flex flex-col items-center justify-center gap-3 p-4 rounded-lg">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#D97706] shadow-md">
                    <MapPin size={22} />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 uppercase font-mono">Местоположение проекта на Google Maps</span>
                </div>
              )}
            </div>

            {/* Address & Contact Details Block directly below the map */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-white border border-slate-200/60 rounded-xl shadow-xs" id="map-address-contacts-panel">
              {/* Address */}
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-mono">Адрес</span>
                <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug" id="client-project-address">
                  📍 {settings.projectAddress}
                </p>
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-mono">Номер телефона</span>
                <div className="flex flex-col gap-1">
                  <a 
                    href={`tel:${settings.projectPhone.replace(/\s+/g, '')}`}
                    onClick={(e) => { e.preventDefault(); setIsPhoneModalOpen(true); }}
                    className="text-sm font-bold text-[#D97706] hover:text-[#B45309] transition-colors leading-tight inline-flex items-center gap-1.5"
                    id="client-project-phone"
                  >
                    <PhoneCall size={14} />
                    <span>{settings.projectPhone}</span>
                  </a>
                  <span className="text-[9px] text-slate-400 font-sans">Ответственное лицо (Звоните для связи)</span>
                </div>
              </div>
            </div>
          </motion.div>

        </section>

        {/* ROW 2: Gallery & Project Documents (placed lower) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10" id="secondary-content-section">
          
          {/* Left Column: Gallery */}
          <div className="lg:col-span-12 xl:col-span-7 flex flex-col gap-8" id="secondary-left-column">
            
            {/* ГАЛЕРЕЯИ СУРАТҲОИ ДОМ (МАКСИМУМ 10 СУРАТ) */}
            {galleryImages.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 80 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
                className="p-6 bg-white border border-slate-200/60 rounded-xl shadow-xs"
                id="client-gallery-section"
              >
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#D97706] mb-4 flex items-center gap-2">
                  <ImageIcon size={14} className="stroke-[2.5]" />
                  <span>Дизайн интерьера ({galleryImages.length} / 10)</span>
                </h3>

                <div className="relative bg-slate-900 rounded-lg overflow-hidden group shadow border border-slate-200 aspect-[3/4] max-h-[600px] max-w-[450px] mx-auto" id="carousel-frame">
                  {/* Image slider container with framer motion animations */}
                  <div className="w-full h-full relative flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={activeImgIndex}
                        src={galleryImages[activeImgIndex]?.imageUrl}
                        alt={`Фото дома ${activeImgIndex + 1}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="w-full h-full object-cover cursor-zoom-in hover:brightness-105 transition-all"
                        referrerPolicy="no-referrer"
                        onClick={() => setIsLightboxOpen(true)}
                      />
                    </AnimatePresence>
                  </div>

                  {/* Overlaid navigational controls */}
                  {galleryImages.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevImg}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/60 hover:bg-[#D97706] text-white flex items-center justify-center transition-colors cursor-pointer z-10"
                        title="Назад"
                      >
                        <ChevronRight className="rotate-180" size={16} />
                      </button>
                      <button
                        onClick={handleNextImg}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/60 hover:bg-[#D97706] text-white flex items-center justify-center transition-colors cursor-pointer z-10"
                        title="Вперед"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </>
                  )}

                  {/* Caption / index indicator overlay in bottom left */}
                  <div className="absolute bottom-3 left-3 bg-slate-950/70 backdrop-blur-xs px-2.5 py-1 rounded text-[11px] text-white font-mono font-medium">
                    {activeImgIndex + 1} из {galleryImages.length}
                  </div>

                  {/* Lightbox helper button top right */}
                  <button
                    onClick={() => setIsLightboxOpen(true)}
                    className="absolute top-3 right-3 bg-slate-950/40 hover:bg-[#D97706]/80 text-white p-1.5 rounded-sm transition-colors text-[10px] sm:text-xs flex items-center gap-1 cursor-pointer"
                    title="Увеличить"
                  >
                    <ImageIcon size={12} />
                    <span className="font-mono text-[9px] uppercase tracking-wider hidden sm:inline">Увеличить</span>
                  </button>
                </div>

                {/* Dots index navigator */}
                {galleryImages.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5 mt-4">
                    {galleryImages.map((img, idx) => (
                      <button
                        key={img.id}
                        onClick={() => setActiveImgIndex(idx)}
                        className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                          idx === activeImgIndex 
                            ? 'w-6 bg-[#D97706]' 
                            : 'w-2 bg-slate-200 hover:bg-slate-300'
                        }`}
                        title={`Перейти к фото ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

          </div>

          {/* Right Column: Project Documents system Section - Placed lower */}
          <motion.div 
            initial={{ opacity: 0, y: 80 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4, delay: 0.15 }}
            className="lg:col-span-12 xl:col-span-5 bg-white border border-slate-200 p-6 rounded-xl shadow-xs h-fit" 
            id="documents-box"
          >
            <h3 className="text-md font-bold text-[#0F172A] mb-4 flex items-center justify-between tracking-wide">
              <span>ДОКУМЕНТЫ ПРОЕКТА</span>
              <span className="text-xs bg-slate-100 border border-slate-200/50 px-2.5 py-1 rounded text-slate-500 font-mono">
                {activeDocs.length} файлов
              </span>
            </h3>

            {activeDocs.length === 0 ? (
              <div className="py-12 bg-white border border-dashed border-slate-200 rounded-lg text-center text-slate-400 text-xs">
                Активные документы в настоящее время отсутствуют
              </div>
            ) : (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1" id="client-document-list">
                {activeDocs.map((doc) => {
                  const imgCount = doc.images && doc.images.length > 0 ? doc.images.length : (doc.imageUrl ? 1 : 0);
                  return (
                    <button
                      key={doc.id}
                      onClick={() => onSelectDocument(doc)}
                      className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-lg group cursor-pointer hover:border-[#D97706] hover:shadow-xs transition-all duration-200"
                      id={`client-doc-link-${doc.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="w-8 h-8 bg-amber-50 text-amber-700 flex items-center justify-center rounded transition-colors group-hover:bg-[#D97706] group-hover:text-white shrink-0">
                          <FileSpreadsheet size={16} />
                        </div>
                        <div className="flex flex-col items-start min-w-0 text-left">
                          <span className="text-sm font-semibold text-slate-700 group-hover:text-[#0F172A] truncate w-full">
                            {doc.title}
                          </span>
                          {imgCount > 1 && (
                            <span className="text-[10px] text-[#D97706] font-mono font-bold">
                              {imgCount} сурат
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-[#D97706] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}

            <p className="text-[10px] text-slate-400 leading-normal mt-4 font-mono">
              💡 Нажмите на название документа, чтобы посмотреть изображение и полную информацию.
            </p>
          </motion.div>

        </section>

        {/* SECTION: РЕКОМЕНДАЦИИ И МАТЕРИАЛЫ СТРОИТЕЛЬСТВА (RECOMMENDATIONS) */}
        {settings.recommendations && settings.recommendations.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 80 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-10 shadow-xs mt-10 md:mt-12 space-y-8 max-w-7xl mx-auto" 
            id="client-recommendations-section"
          >
            <div className="border-b border-slate-100 pb-5 text-center sm:text-left space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight leading-tight">ПРЕИМУЩЕСТВА И МАТЕРИАЛЫ</h2>
            </div>

            <div className="space-y-12 divide-y divide-slate-100/80 pt-2" id="recommendations-container-list">
              {settings.recommendations.map((item, idx) => {
                const imageStyles: any = {
                  transform: `scale(${item.zoom ?? 1})`,
                  transformOrigin: 'center center',
                  objectFit: item.isTransparentBg ? 'contain' : 'cover',
                  marginLeft: `${item.offsetX ?? 0}%`,
                  marginTop: `${item.offsetY ?? 0}%`,
                  width: '100%',
                  height: '100%',
                };

                const isRightPos = item.imagePosition === 'right';

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 80 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
                    className={`flex flex-col lg:flex-row items-center gap-6 lg:gap-14 py-8 first:pt-0 last:pb-0 ${
                      isRightPos ? 'lg:flex-row-reverse' : ''
                    }`}
                    id={`client-rec-${item.id}`}
                  >
                    {/* Visual 1:1 image container frame */}
                    <div className="w-full sm:w-auto flex justify-center shrink-0">
                      <div
                        className={`w-full max-w-[280px] sm:w-[280px] sm:h-[280px] aspect-square rounded-2xl overflow-hidden shadow-xs flex items-center justify-center relative ${
                          item.isTransparentBg
                            ? 'bg-transparent border border-transparent'
                            : 'bg-slate-50 border border-slate-200/80 shadow-md'
                        }`}
                        id={`client-rec-frame-${item.id}`}
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          style={imageStyles}
                          className="absolute pointer-events-none"
                          referrerPolicy="no-referrer"
                          id={`client-rec-image-${item.id}`}
                        />
                      </div>
                    </div>

                    {/* Content text */}
                    <div className="flex-1 min-w-0 max-w-full text-center lg:text-left space-y-3 pt-4 lg:pt-0">
                      <div className="flex items-center justify-center lg:justify-start gap-2 max-w-full">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] shrink-0" />
                        <h4 className="text-md sm:text-lg font-black text-[#0F172A] tracking-tight hover:text-[#D97706] transition-colors duration-200 break-all w-full">
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed whitespace-pre-line text-justify lg:text-left break-all overflow-hidden max-w-full">
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* SECTION: Cases (Completed Projects) */}
        {settings.cases && settings.cases.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 80 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-10 shadow-xs mt-10 md:mt-12 space-y-8 max-w-7xl mx-auto" 
            id="client-cases-section"
          >
            <div className="border-b border-slate-100 pb-5 text-center sm:text-left space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight leading-tight uppercase">ДРУГИЕ ОБЪЕКТЫ</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 pt-2" id="cases-container-list">
              {settings.cases.map((caseItem, idx) => (
                <motion.div
                  key={caseItem.id}
                  initial={{ opacity: 0, y: 80 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4, delay: idx * 0.1 }}
                  className="bg-slate-50 border border-slate-200/80 hover:border-[#D97706]/40 hover:shadow-md rounded-xl p-4 sm:p-5 transition-all flex flex-col h-full overflow-hidden"
                >
                  {caseItem.images && caseItem.images.length > 0 && (
                    <div 
                      className="w-[calc(100%+2rem)] sm:w-[calc(100%+2.5rem)] h-56 sm:h-64 -mt-4 -mx-4 sm:-mt-5 sm:-mx-5 mb-5 overflow-hidden bg-slate-100 shrink-0 relative cursor-pointer group"
                      onClick={() => setCaseLightboxData({ images: caseItem.images, index: 0 })}
                    >
                      <img src={caseItem.images[0]} alt={caseItem.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                      {caseItem.images.length > 1 && (
                        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                          + {caseItem.images.length - 1} фото
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-8 h-8 rounded-full bg-[#D97706]/10 text-[#D97706] font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-800 line-clamp-1" style={{ color: settings.primaryColor }}>
                      {caseItem.title}
                    </h3>
                  </div>

                  <div className="flex flex-col gap-1 mb-4 text-xs font-mono text-slate-500 uppercase tracking-widest">
                    {caseItem.location && <span>Адрес: {caseItem.location}</span>}
                    {caseItem.year && <span>Сдан: {caseItem.year}</span>}
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed flex-1 whitespace-pre-line">
                    {caseItem.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

      </main>

      {/* Styled Geometric Balance Footer */}
      <footer className="h-14 border-t border-slate-200 bg-white px-6 sm:px-10 flex items-center justify-center text-[9px] sm:text-[10px] text-slate-400 font-mono tracking-widest shrink-0 uppercase text-center">
        <div>© 2026 СИСТЕМА УПРАВЛЕНИЯ ЗДАНИЯМИ. ВСЕ ПРАВА ЗАЩИЩЕНЫ.</div>
      </footer>

      {/* Lightbox full-screen viewer */}
      <AnimatePresence>
        {isLightboxOpen && galleryImages[activeImgIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center p-4 select-none"
            id="gallery-lightbox-overlay"
          >
            {/* Close button */}
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-4 right-4 text-white hover:text-[#D97706] bg-slate-800/80 hover:bg-slate-800 p-2.5 rounded-full transition-colors cursor-pointer z-50"
              title="Закрыть"
            >
              <X size={24} />
            </button>

            {/* Main image container */}
            <div className="relative max-w-5xl max-h-[80vh] w-full flex items-center justify-center">
              <motion.img
                key={activeImgIndex}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.25 }}
                src={galleryImages[activeImgIndex].imageUrl}
                alt={`Фото дома ${activeImgIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain rounded border border-white/10 shadow-2xl"
                referrerPolicy="no-referrer"
              />

              {/* Prev / Next controls inside Lightbox */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImg}
                    className="absolute left-2 sm:-left-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-[#D97706] text-white flex items-center justify-center transition-colors cursor-pointer z-35"
                    title="Назад"
                  >
                    <ChevronRight className="rotate-180" size={24} />
                  </button>
                  <button
                    onClick={handleNextImg}
                    className="absolute right-2 sm:-right-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-[#D97706] text-white flex items-center justify-center transition-colors cursor-pointer z-35"
                    title="Вперед"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>

            {/* Lightbox index indicator */}
            <div className="mt-4 text-slate-300 text-sm font-mono bg-slate-900/50 backdrop-blur-xs px-4 py-1.5 rounded-full border border-slate-800">
              Фото {activeImgIndex + 1} из {galleryImages.length}
            </div>
          </motion.div>
        )}

        {/* CASE LIGHTBOX OVERLAY */}
        {caseLightboxData && caseLightboxData.images[caseLightboxData.index] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center p-4 select-none"
            id="case-lightbox-overlay"
          >
            {/* Close button */}
            <button
              onClick={() => setCaseLightboxData(null)}
              className="absolute top-4 right-4 text-white hover:text-[#D97706] bg-slate-800/80 hover:bg-slate-800 p-2.5 rounded-full transition-colors cursor-pointer z-50"
              title="Закрыть"
            >
              <X size={24} />
            </button>

            {/* Main image container */}
            <div className="relative max-w-5xl max-h-[80vh] w-full flex items-center justify-center">
              <motion.img
                key={caseLightboxData.index}
                src={caseLightboxData.images[caseLightboxData.index]}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl relative z-30"
                alt="Case preview"
                referrerPolicy="no-referrer"
                id={`case-lightbox-img-${caseLightboxData.index}`}
              />
              
              {/* Navigation buttons */}
              {caseLightboxData.images.length > 1 && (
                <>
                  <button
                    onClick={() => {
                      setCaseLightboxData(prev => {
                        if (!prev) return null;
                        return { ...prev, index: prev.index === 0 ? prev.images.length - 1 : prev.index - 1 };
                      });
                    }}
                    className="absolute left-2 sm:-left-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-[#D97706] text-white flex items-center justify-center transition-colors cursor-pointer z-35"
                    title="Назад"
                  >
                    <ChevronRight className="rotate-180" size={24} />
                  </button>
                  <button
                    onClick={() => {
                      setCaseLightboxData(prev => {
                        if (!prev) return null;
                        return { ...prev, index: prev.index === prev.images.length - 1 ? 0 : prev.index + 1 };
                      });
                    }}
                    className="absolute right-2 sm:-right-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-[#D97706] text-white flex items-center justify-center transition-colors cursor-pointer z-35"
                    title="Вперед"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>

            {/* Lightbox index indicator */}
            <div className="mt-4 text-slate-300 text-sm font-mono bg-slate-900/50 backdrop-blur-xs px-4 py-1.5 rounded-full border border-slate-800">
              Фото {caseLightboxData.index + 1} из {caseLightboxData.images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING MSG/SMS FEEDBACK BUTTON */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 flex flex-col items-end gap-3">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsFeedbackOpen(true)}
          className="w-14 h-14 bg-[#024F33] hover:bg-[#013522] text-white rounded-full flex items-center justify-center shadow-2xl cursor-pointer relative group transition-all duration-300"
          id="floating-feedback-btn"
          title="Предложение или жалоба"
        >
          <Mail size={24} className="animate-none" />
          
          {/* Tooltip on hover */}
          <span className="absolute right-16 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-md font-sans">
            Предложение или жалоба
          </span>
        </motion.button>
      </div>

      {/* FEEDBACK SUGGESTIONS / COMPLAINTS MODAL */}
      <AnimatePresence>
        {isFeedbackOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto font-sans"
            id="feedback-modal-overlay"
            onClick={() => setIsFeedbackOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-left"
              onClick={(e) => e.stopPropagation()}
              id="feedback-modal-box"
            >
              {/* Header */}
              <div className="bg-[#024F33] text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black tracking-wider uppercase">Предложение или Жалоба</h3>
                  <p className="text-[11px] text-emerald-100 mt-0.5 font-medium">
                    Ваша обратная связь помогает нам стать лучше
                  </p>
                </div>
                <button
                  onClick={() => setIsFeedbackOpen(false)}
                  className="p-1 text-emerald-100 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleFeedbackSubmit} className="p-6 space-y-4">
                {feedbackSuccess ? (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="py-8 text-center space-y-3 flex flex-col items-center justify-center"
                  >
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <CheckCircle size={28} />
                    </div>
                    <h4 className="text-base font-black text-slate-800 font-sans font-sans">Отправлено!</h4>
                    <p className="text-xs text-slate-400 max-w-xs leading-relaxed mx-auto text-center font-sans">
                      Спасибо за ваш отзыв! Ваше обращение успешно передано руководству.
                    </p>
                  </motion.div>
                ) : (
                  <>
                    {feedbackError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <X size={14} className="shrink-0" />
                        <span>{feedbackError}</span>
                      </div>
                    )}

                    <div className="space-y-3 font-sans">
                      {/* Name input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Ваше имя:</label>
                        <input
                          type="text"
                          required
                          placeholder="Ваше имя"
                          value={feedbackName}
                          onChange={(e) => setFeedbackName(e.target.value)}
                          className="w-full bg-[#F7F9FB] border border-slate-200 focus:border-[#024F33] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none transition-all text-slate-850"
                        />
                      </div>

                      {/* Phone input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Номер телефона:</label>
                        <input
                          type="text"
                          required
                          placeholder="Номер телефона"
                          value={feedbackPhone}
                          onChange={(e) => setFeedbackPhone(e.target.value)}
                          className="w-full bg-[#F7F9FB] border border-slate-200 focus:border-[#024F33] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none transition-all text-slate-850"
                        />
                      </div>

                      {/* Comment input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Комментарий, Предложение или Жалоба:</label>
                        <textarea
                          placeholder="Напишите ваше предложение или отзыв..."
                          required
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          rows={4}
                          className="w-full bg-[#F7F9FB] border border-slate-200 focus:border-[#024F33] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none transition-all text-slate-850 resize-none font-sans"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex gap-2 font-sans">
                      <button
                        type="button"
                        onClick={() => setIsFeedbackOpen(false)}
                        className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl tracking-wider transition-all uppercase text-center cursor-pointer"
                      >
                        Закрыть
                      </button>
                      <button
                        type="submit"
                        disabled={isSendingFeedback}
                        className="flex-1 py-3 px-4 bg-[#024F33] hover:bg-[#013522] text-white font-bold text-xs rounded-xl tracking-wider transition-all uppercase text-center cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {isSendingFeedback ? <RefreshCw className="animate-spin" size={13} /> : <Send size={13} />}
                        <span>{isSendingFeedback ? 'Отправка...' : 'Отправить'}</span>
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
