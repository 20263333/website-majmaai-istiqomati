import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, X } from 'lucide-react';
import { logAnalyticsEvent } from '../analytics';

interface PhoneContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
}

export default function PhoneContactModal({ isOpen, onClose, phoneNumber }: PhoneContactModalProps) {
  if (!isOpen) return null;

  // Clean for Whatsapp / tel link
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // WhatsApp Link format: https://wa.me/992222191919
  const whatsappUrl = `https://wa.me/${cleanNumber}`;
  const callUrl = `tel:${cleanNumber}`;

  const handleWhatsappClick = () => {
    logAnalyticsEvent('whatsapp_click');
    onClose();
  };

  const handlePhoneClick = () => {
    logAnalyticsEvent('phone_click');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop with elegant blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
        />
        
        {/* Modal Box */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="bg-[#024F33] text-white px-5 py-4 pt-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider" style={{ fontWeight: 'normal', fontSize: '16px' }}>Связаться с нами</h3>
              <p className="text-[10px] text-emerald-100 mt-0.5">Выберите удобный способ связи</p>
            </div>
            <button 
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 space-y-4">
            <div className="text-center pb-3 border-b border-slate-100">
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block font-sans" style={{ fontWeight: 'normal' }}>КОНТАКТНЫЙ НОМЕР</span>
              <p className="text-lg font-black text-slate-800 mt-0.5 tracking-wide">{phoneNumber}</p>
            </div>

            <div className="space-y-3">
              {/* WhatsApp Option (Green) */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsappClick}
                className="flex items-center gap-3.5 w-full p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/50 rounded-xl transition-all text-left text-[#024F33] group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-[#00B074] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <svg 
                    viewBox="0 0 24 24" 
                    className="w-5 h-5 fill-current"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.705 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs sm:text-sm font-black block leading-snug uppercase tracking-wider text-emerald-800" style={{ fontWeight: 'bold' }}>WhatsApp</span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5">Перейти к диалогу в WhatsApp</span>
                </div>
              </a>

              {/* Direct Call Option (Amber / Yellow) */}
              <a
                href={callUrl}
                onClick={handlePhoneClick}
                className="flex items-center gap-3.5 w-full p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200/50 rounded-xl transition-all text-left text-amber-900 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-[#D97706] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <Phone size={18} className="stroke-[2.5]" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs sm:text-sm font-black block leading-snug uppercase tracking-wider text-amber-800">Телефонный звонок</span>
                  <span className="text-[10px] text-amber-600 block mt-0.5">Прямой звонок по этому номеру</span>
                </div>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
