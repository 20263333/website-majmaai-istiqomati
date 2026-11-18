import { useState, useEffect } from 'react';
import { 
  Trash2, RefreshCw, Search, HardDrive, Download, Calendar, ExternalLink, 
  CheckCircle, AlertTriangle, HelpCircle, Eye, Tag, Filter, ChevronDown
} from 'lucide-react';
import { listAllUploadedAssets, deleteStorageAsset, StorageFile } from '../supabaseClient';

export default function StorageManager() {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Deletion sequential double-confirmation states
  // We keep track of the file path being deleted and whether it's on confirmation stage 1 or 2
  const [pendingDeletePath, setPendingDeletePath] = useState<string | null>(null);
  const [confirmStage, setConfirmStage] = useState<0 | 1 | 2>(0); // 0=none, 1=first confirm, 2=second confirm

  const fetchFiles = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const allFiles = await listAllUploadedAssets();
      setFiles(allFiles);
    } catch (err: any) {
      setErrorMessage(err.message || 'Ошибка при загрузке списка файлов');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const initiateDelete = (path: string) => {
    setPendingDeletePath(path);
    setConfirmStage(1);
  };

  const cancelDelete = () => {
    setPendingDeletePath(null);
    setConfirmStage(0);
  };

  const handleConfirmStage1 = () => {
    if (pendingDeletePath) {
      setConfirmStage(2);
    }
  };

  const executeDelete = async () => {
    if (!pendingDeletePath) return;

    setIsLoading(true);
    try {
      const success = await deleteStorageAsset(pendingDeletePath);
      if (success) {
        showStatus('Файл успешно удален!', 'success');
        // update local state
        setFiles(prev => prev.filter(f => f.path !== pendingDeletePath));
      } else {
        showStatus('Ошибка при удалении файла. Возможно, файл уже удален.', 'error');
      }
    } catch (err: any) {
      showStatus(`Ошибка: ${err.message || 'Сетевая ошибка'}`, 'error');
    } finally {
      setPendingDeletePath(null);
      setConfirmStage(0);
      setIsLoading(false);
    }
  };

  const showStatus = (text: string, type: 'success' | 'info' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage(null);
    }, 4500);
  };

  // Human-readable bytes formatter
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Convert folder names to readable tajik labels
  const getFolderLabel = (folder: string) => {
    switch (folder) {
      case 'logos': return 'Логотипы';
      case 'documents': return 'Документы';
      case 'plans': return 'Планы этажей';
      case 'gallery': return 'Галерея';
      case 'recommendations': return 'Рекомендации';
      case 'assets': return 'Общие активы';
      default: return folder;
    }
  };

  // Filter folder list
  const folders = ['all', 'logos', 'documents', 'plans', 'gallery', 'recommendations', 'assets'];

  // Filter and search computation
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          file.folder.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = selectedFolder === 'all' || file.folder === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  // Totals
  const totalSize = files.reduce((acc, f) => acc + (f.metadata?.size || 0), 0);

  return (
    <div className="space-y-6" id="storage-manager-view-panel">
      
      {/* Header stats area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="storage-stats-grid">
        <div className="bg-white border border-slate-200 p-5 rounded-xs flex items-center gap-4 shadow-3xs">
          <div className="w-12 h-12 bg-[#024F33]/5 text-[#024F33] rounded-full flex items-center justify-center shrink-0">
            <HardDrive size={22} className="stroke-[2]" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">Количество загруженных файлов</p>
            <p className="text-xl sm:text-2xl font-black text-slate-800">{files.length} шт.</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xs flex items-center gap-4 shadow-3xs">
          <div className="w-12 h-12 bg-[#0F172A]/5 text-[#0F172A] rounded-full flex items-center justify-center shrink-0">
            <Tag size={22} className="stroke-[2]" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">Найденные файлы</p>
            <p className="text-xl sm:text-2xl font-black text-[#0F172A]">{filteredFiles.length} шт.</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xs flex items-center gap-4 shadow-3xs">
          <div className="w-12 h-12 bg-amber-500/5 text-amber-600 rounded-full flex items-center justify-center shrink-0">
            <HelpCircle size={22} className="stroke-[2]" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">Общий объем хранилища</p>
            <p className="text-xl sm:text-2xl font-black text-slate-800">{formatBytes(totalSize)}</p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar controls */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-xs shadow-3xs flex flex-col sm:flex-row gap-4 justify-between items-center" id="storage-controls-toolbar">
        {/* Search bar */}
        <div className="relative w-full sm:max-w-xs" id="storage-search-box">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Поиск файла..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#024F33] text-slate-700 font-medium transition-all"
          />
        </div>

        {/* Categories selector */}
        <div className="relative w-full sm:w-auto" id="storage-folders-bar">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center justify-between w-full sm:w-auto gap-2 py-2 px-3 text-xs border border-slate-200 rounded bg-slate-50 hover:bg-slate-100 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#024F33] text-slate-700 font-medium transition-all"
          >
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <span className="uppercase font-semibold tracking-wider">
                {selectedFolder === 'all' ? 'ВСЕ РАЗДЕЛЫ' : getFolderLabel(selectedFolder)}
              </span>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {isFilterOpen && (
            <div className="absolute top-full left-0 mt-1 w-full sm:w-48 bg-white border border-slate-200 rounded shadow-lg z-10 py-1">
              {folders.map(f => (
                <button
                  key={f}
                  onClick={() => {
                    setSelectedFolder(f);
                    setIsFilterOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all hover:bg-slate-50 ${
                    selectedFolder === f 
                      ? 'bg-slate-50 text-[#0F172A]' 
                      : 'text-slate-600'
                  }`}
                >
                  {f === 'all' ? 'ВСЕ РАЗДЕЛЫ' : getFolderLabel(f)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action refresh button */}
        <button
          onClick={fetchFiles}
          disabled={isLoading}
          className="flex items-center gap-1.5 py-2 px-3 text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded transition-all cursor-pointer bg-white absolute sm:static right-6 top-6 shrink-0"
        >
          <RefreshCw size={12} className={isLoading ? 'animate-spin text-[#024F33]' : 'text-slate-500'} />
          <span className="hidden sm:inline">Обновить</span>
        </button>
      </div>

      {/* Floating global messages status feedback banner */}
      {message && (
        <div className={`p-4 rounded border text-xs font-semibold flex items-center justify-between shadow-2xs transition-all ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
          message.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
          'bg-blue-50 text-blue-800 border-blue-200'
        }`} id="storage-toast">
          <div className="flex items-center gap-2">
            {message.type === 'success' && <CheckCircle size={15} className="text-emerald-600 shrink-0" />}
            {message.type === 'error' && <AlertTriangle size={15} className="text-red-500 shrink-0" />}
            {message.type === 'info' && <Eye size={15} className="text-blue-500 shrink-0" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-1">ЗАКРЫТЬ</button>
        </div>
      )}

      {/* Main Files Grid */}
      {isLoading && files.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded p-12 flex flex-col items-center justify-center space-y-4" id="storage-loader">
          <RefreshCw size={36} className="animate-spin text-[#024F33]" />
          <p className="text-xs font-medium text-slate-500">Список файлов загружается из хранилища Storage...</p>
        </div>
      ) : errorMessage ? (
        <div className="bg-red-50 border border-red-200 rounded p-8 flex flex-col items-center justify-center text-center space-y-3" id="storage-error-block">
          <AlertTriangle size={32} className="text-red-600" />
          <div>
            <p className="text-sm font-bold text-red-800">Проблема при чтении хранилища Supabase Storage</p>
            <p className="text-xs text-red-600 mt-1">{errorMessage}</p>
          </div>
          <button 
            onClick={fetchFiles}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded transition-all shadow-sm"
          >
            Попробовать снова
          </button>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded p-12 text-center flex flex-col items-center justify-center space-y-3" id="storage-empty">
          <HardDrive size={36} className="text-slate-300" />
          <p className="text-sm font-bold text-slate-700">Файлы не найдены</p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">В этом разделе или по фильтрам поиска не найдено файлов, соответствующих требованиям.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" id="storage-items-grid">
          {filteredFiles.map((file) => {
            const isImage = /\.(jpg|jpeg|png|gif|webp|svg)/i.test(file.name);
            const isCurrentlyDeletingThis = pendingDeletePath === file.path;

            return (
              <div 
                key={file.path} 
                className={`bg-white border border-slate-200 rounded overflow-hidden flex flex-col shadow-3xs hover:shadow-2xs transition-all relative ${
                  isCurrentlyDeletingThis ? 'ring-2 ring-red-400 border-transparent bg-red-50/10' : ''
                }`}
                id={`file-card-${file.name}`}
              >
                {/* Visual Image Preview / File Placeholder */}
                <div className="h-44 bg-slate-100 flex items-center justify-center relative overflow-hidden group/img">
                  {isImage ? (
                    <img 
                      src={file.publicUrl} 
                      alt={file.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105" 
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-slate-400 font-mono text-[9px] text-center p-4 truncate max-w-xs flex flex-col items-center gap-2">
                      <span className="p-3 bg-white rounded-full border border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] shadow-3xs">
                        {file.name.split('.').pop() || 'ФАЙЛ'}
                      </span>
                      <span className="font-bold text-slate-600 block mt-1 truncate max-w-[150px]">{file.name}</span>
                    </div>
                  )}

                  {/* Absolute badgified folder categorization */}
                  <span className="absolute top-2 left-2 text-[8px] sm:text-[9px] uppercase font-black tracking-wider bg-[#0F172A] text-white px-2 py-0.5 rounded-full shadow-3xs">
                    {getFolderLabel(file.folder)}
                  </span>
                </div>

                {/* Info Metadata Block */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3.5 bg-white border-t border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 font-mono flex items-center gap-1">
                      <Calendar size={10} />
                      {file.metadata?.createdAt ? new Date(file.metadata.createdAt).toLocaleDateString() : 'Нет данных'}
                    </span>
                    <h4 
                      className="text-xs font-bold text-slate-800 truncate font-mono" 
                      title={file.name}
                    >
                      {file.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-semibold font-mono">
                      Размер: <span className="text-slate-700 font-bold">{formatBytes(file.metadata?.size || 0)}</span>
                    </p>
                  </div>

                  {/* DOUBLE CONFIRMATION INLINE BUTTON TRIGGERS */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 justify-between">
                    
                    {/* View/External link actions */}
                    <div className="flex gap-1.5">
                      <a 
                        href={file.publicUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-150 rounded shadow-3xs transition-all cursor-pointer"
                        title="Просмотр файла"
                      >
                        <ExternalLink size={13} />
                      </a>
                      <a 
                        href={file.publicUrl} 
                        download={file.name}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-150 rounded shadow-3xs transition-all cursor-pointer"
                        title="Скачать"
                      >
                        <Download size={13} />
                      </a>
                    </div>

                    {/* Sequential double-confirmation button block */}
                    {isCurrentlyDeletingThis && confirmStage === 1 ? (
                      <div className="flex items-center gap-1 bg-amber-50 p-1 border border-amber-200 rounded animate-pulse">
                        <span className="text-[9px] font-black text-amber-700 px-1">Вы уверены?</span>
                        <button 
                          onClick={handleConfirmStage1}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[9px] px-2 py-1 rounded cursor-pointer uppercase tracking-tight"
                        >
                          Да
                        </button>
                        <button 
                          onClick={cancelDelete}
                          className="text-slate-500 hover:text-slate-700 font-bold text-[9px] px-1 py-1 cursor-pointer"
                        >
                          Нет
                        </button>
                      </div>
                    ) : isCurrentlyDeletingThis && confirmStage === 2 ? (
                      <div className="flex items-center gap-1 bg-red-50 p-1 border border-red-200 rounded animate-bounce">
                        <span className="text-[8px] font-black text-red-700 px-1 animate-pulse">Подтвердите еще раз!</span>
                        <button 
                          onClick={executeDelete}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold text-[9px] px-2 py-1 rounded cursor-pointer uppercase tracking-tight"
                        >
                          УДАЛИТЬ ОКОНЧАТЕЛЬНО!
                        </button>
                        <button 
                          onClick={cancelDelete}
                          className="text-slate-500 hover:text-slate-700 font-bold text-[9px] px-1 py-1 cursor-pointer"
                        >
                          Нет
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => initiateDelete(file.path)}
                        className="flex items-center justify-center gap-1 py-1.5 px-3 border border-transparent rounded bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-700 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-3xs hover:border-red-200"
                        title="Удалить"
                      >
                        <Trash2 size={12} />
                        <span>Удалить</span>
                      </button>
                    )}

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
