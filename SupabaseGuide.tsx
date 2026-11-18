import { useState } from 'react';
import { Database, Copy, Check, Terminal, ExternalLink, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { SQL_SETUP_SCRIPT, SUPABASE_URL } from '../supabaseClient';

interface SupabaseGuideProps {
  isConnected: boolean;
  errorMsg: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function SupabaseGuide({ isConnected, errorMsg, onRefresh, isRefreshing }: SupabaseGuideProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(SQL_SETUP_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-sm overflow-hidden shadow-xs" id="supabase-guide-container">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-sm ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            <Database size={20} className={isRefreshing ? 'animate-spin' : ''} />
          </div>
          <div>
            <h3 className="font-bold text-[#0F172A] tracking-tight text-sm">Танзими Пойгоҳи додаҳои Supabase</h3>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">CLOUD INFRASTRUCTURE SYNC</p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 hover:text-white bg-slate-100 hover:bg-[#0F172A] disabled:opacity-50 rounded-sm border border-slate-200 transition-colors cursor-pointer font-bold uppercase tracking-wider"
          id="supabase-refresh-btn"
        >
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Санҷиш</span>
        </button>
      </div>

      <div className="p-5 md:p-6 space-y-6">
        {/* Connection Status Box */}
        {isConnected ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-sm flex items-start gap-3 text-emerald-800">
            <ShieldCheck className="text-emerald-600 mt-0.5 shrink-0" size={18} />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">Пайвастшавӣ ба Supabase муваффақ аст ✓</h4>
              <p className="text-xs mt-1 leading-relaxed text-emerald-700">
                Пойгоҳи додаҳои абрии Supabase бо муваффақият фаъол аст. Тамоми маълумотҳо ва ҳуҷҷатҳо мустақиман дар абр сабт мешаванд.
              </p>
              <div className="mt-2 text-[10px] font-mono bg-white p-1 px-2 border border-emerald-100 rounded text-emerald-600 break-all select-all">
                URL: {SUPABASE_URL}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-sm flex items-start gap-3.5 text-amber-800">
            <AlertTriangle className="text-[#D97706] mt-0.5 shrink-0" size={18} />
            <div className="space-y-1 w-full">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">Ҳолати маҳаллӣ (LocalStorage Active)</h4>
              <p className="text-xs leading-relaxed text-amber-700">
                Апп ба Supabase дастрасӣ пайдо карда натавонист (Ҷадвалҳо дар Supabase ҳанӯз сохта нашудаанд ё лозим аст рамзи SQL-ро ворид кунед).
              </p>
              <div className="p-2.5 bg-slate-900 rounded text-xs font-mono text-slate-300 border border-slate-800 mt-2 break-all">
                Error log: {errorMsg || 'Ҷадвалҳо дар Supabase ёфт нашуданд.'}
              </div>
              <p className="text-[10px] text-amber-900/80 leading-normal mt-2 select-none font-mono">
                💡 **Нигарон набошед!** Барнома ба таври худкор дар режими маҳаллӣ (LocalStorage) кор мекунад. Шумо метавонед тамоми танзимотҳоро бемалол иваз кунед ва онҳо захира мешаванд. Пас аз ворид кардани рамзҳои SQL дар Supabase, он ба таври худкор пайваст ва ҳамоҳанг мешавад.
              </p>
            </div>
          </div>
        )}

        {/* Action Guide Step-by-Step */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-[#D97706] uppercase tracking-wider">Дастурамали Танзими Supabase:</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-sm space-y-1.5 flex flex-col justify-between">
              <div>
                <div className="text-slate-400 text-[10px] font-mono uppercase font-bold">Қадами 1</div>
                <h5 className="text-[#0F172A] text-xs font-bold mt-1">Кушодани Supabase</h5>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  Ба лоиҳаи худ дар Supabase дароед ва ба бахши **SQL Editor** гузаред.
                </p>
              </div>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-[#D97706] hover:text-[#B45309] font-bold pt-2 shrink-0 cursor-pointer font-mono text-xs"
              >
                Гузариш <ExternalLink size={10} />
              </a>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-sm space-y-1.5 flex flex-col justify-between">
              <div>
                <div className="text-slate-400 text-[10px] font-mono uppercase font-bold">Қадами 2</div>
                <h5 className="text-[#0F172A] text-xs font-bold mt-1">Нусхаи SQL</h5>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  Рамзи SQL-и дар поён овардашударо бо воситаи пахши тугмаи "Нусхабардорӣ" нусха гиред.
                </p>
              </div>
              <button
                onClick={copyToClipboard}
                className="inline-flex items-center gap-1 text-[11px] text-[#D97706] hover:text-[#B45309] font-bold text-left pt-2 cursor-pointer font-mono text-xs"
              >
                <span>Нусха гирифтан</span>
                <Copy size={10} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-sm space-y-1.5 flex flex-col justify-between">
              <div>
                <div className="text-slate-400 text-[10px] font-mono uppercase font-bold">Қадами 3</div>
                <h5 className="text-[#0F172A] text-xs font-bold mt-1">Иҷро Намудан</h5>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  Рамзи нусхашударо дар SQL Editor-и Supabase гузошта, тугмаи **Run**-ро пахш созед.
                </p>
              </div>
              <button
                onClick={onRefresh}
                className="inline-flex items-center gap-1 text-[11px] text-[#D97706] hover:text-[#B45309] font-bold text-left pt-2 cursor-pointer font-mono text-xs"
              >
                <span>Санҷид</span>
              </button>
            </div>
          </div>
        </div>

        {/* Copy SQL Script Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600">
            <span className="flex items-center gap-1.5 font-mono text-slate-550 font-bold">
              <Terminal size={14} className="text-slate-400" />
              Рамзҳои SQL (Скрипти Танзимот)
            </span>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-705 rounded-sm border border-slate-200 transition-colors cursor-pointer text-xs font-mono font-bold uppercase tracking-wider"
              id="copy-sql-code-btn"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-emerald-600" />
                  <span className="text-emerald-600">Нусха шуд!</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Нусхаи SQL</span>
                </>
              )}
            </button>
          </div>

          <div className="relative group rounded-sm overflow-hidden border border-slate-200 bg-slate-900">
            <pre className="text-[11px] font-mono text-slate-300 p-4 overflow-x-auto max-h-60 leading-relaxed select-all">
              {SQL_SETUP_SCRIPT}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
