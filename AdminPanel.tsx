import { useState, useRef, ChangeEvent, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Settings, FileText, Map, Phone, Image as ImageIcon, FileUp, Save, Trash2, 
  Check, Edit2, CheckCircle, RefreshCw, Eye, EyeOff, AlertCircle, Info, Database,
  Search, MapPin, ChevronUp, ChevronDown, LayoutGrid, Layers, Plus, Send, Bot, ToggleLeft,
  ClipboardCheck, RotateCcw, Sliders, ArrowUpRight, TrendingUp, HardDrive, Building2, KeyRound, LogIn, Copy, Palette, Briefcase, X
} from 'lucide-react';
import { SiteSettings, ProjectDocument, Floor, Apartment, FloorType, ProjectCase } from '../types';
import SupabaseGuide from './SupabaseGuide';
import { uploadAsset, DEFAULT_SETTINGS, sendTelegramAlert, listAllUploadedAssets, deleteStorageAsset, StorageFile } from '../supabaseClient';
import { recalculateApartmentNumbers } from '../utils/floorUtils';
import AnalyticsView from './AnalyticsView';
import StorageManager from './StorageManager';

// CLIENT-SIDE IMAGE COMPRESSION HELPER TO ENSURE RELIABLE SAVING & UPLOADING OF ANY SIZE
const compressImage = (file: File, maxWidth = 1600, maxHeight = 1600, quality = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      resolve(file);
      return;
    }

    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Only resize if the dimensions are larger than limits
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Replace extension with .jpg
            const cleanName = file.name.replace(/\.[^/.]+$/, "");
            const compressedFile = new File([blob], `${cleanName}_compressed.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      resolve(file);
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      resolve(file);
    };
    reader.readAsDataURL(file);
  });
};

interface AdminPanelProps {
  settings: SiteSettings;
  documents: ProjectDocument[];
  isConnected: boolean;
  errorMsg: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  onSaveSettings: (newSettings: SiteSettings) => Promise<void>;
  onAddDoc: (title: string, imageUrl: string, images: string[], isActive: boolean) => Promise<void>;
  onUpdateDoc: (id: string, updates: Partial<ProjectDocument>) => Promise<void>;
  onDeleteDoc: (id: string) => Promise<void>;
  onBackToClient: () => void;
  statusOnlyMode?: boolean;
  isStandaloneMode?: boolean;
  initialTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
}

type AdminTab = 'brand' | 'positioning' | 'desc' | 'contacts' | 'map' | 'docs' | 'pricing' | 'gallery' | 'database' | 'chessboard' | 'integration' | 'status_manager' | 'recommendations' | 'cases' | 'analytics' | 'storage_manager' | 'auth';

export default function AdminPanel({
  settings,
  documents,
  isConnected,
  errorMsg,
  isRefreshing,
  onRefresh,
  onSaveSettings,
  onAddDoc,
  onUpdateDoc,
  onDeleteDoc,
  onBackToClient,
  statusOnlyMode = false,
  isStandaloneMode = false,
  initialTab = 'brand',
  onTabChange
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (statusOnlyMode) {
      setActiveTab('status_manager');
    }
  }, [statusOnlyMode]);

  const handleTabSelect = (tabId: AdminTab) => {
    setActiveTab(tabId);
    if (onTabChange) {
      onTabChange(tabId);
    }
  };
  const initialBlocks = settings.blocks && settings.blocks.length > 0 
    ? settings.blocks 
    : [{ id: 'block_default_a', name: 'Блок А' }];

  const [localSettings, setLocalSettings] = useState<SiteSettings>(() => ({
    ...settings,
    floors: recalculateApartmentNumbers(settings.floors || [], initialBlocks)
  }));

  useEffect(() => {
    if (!localSettings.floorPrices || !localSettings.floorDeposits || !localSettings.floorCashOnly || localSettings.tgBotToken1 === undefined) {
      setLocalSettings(prev => ({
        ...prev,
        floorPrices: prev.floorPrices || settings.floorPrices || DEFAULT_SETTINGS.floorPrices || {},
        floorDeposits: prev.floorDeposits || settings.floorDeposits || DEFAULT_SETTINGS.floorDeposits || {},
        floorCashOnly: prev.floorCashOnly || settings.floorCashOnly || DEFAULT_SETTINGS.floorCashOnly || {},
        tgBotToken1: prev.tgBotToken1 !== undefined ? prev.tgBotToken1 : settings.tgBotToken1 || '',
        tgBotToken2: prev.tgBotToken2 !== undefined ? prev.tgBotToken2 : settings.tgBotToken2 || '',
        tgChats: prev.tgChats !== undefined ? prev.tgChats : settings.tgChats || []
      }));
    }
  }, [settings, localSettings.floorPrices, localSettings.floorDeposits, localSettings.floorCashOnly, localSettings.tgBotToken1]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const currentBlocks = localSettings.blocks && localSettings.blocks.length > 0 
    ? localSettings.blocks 
    : [{ id: 'block_default_a', name: 'Блок А' }];

  // Status Manager States
  const [selectedStatusBlockId, setSelectedStatusBlockId] = useState<string>('');
  const [selectedStatusFloorNum, setSelectedStatusFloorNum] = useState<number | null>(null);
  const [pendingStatusChanges, setPendingStatusChanges] = useState<Record<string, 'free' | 'booked' | 'sold'>>({});
  const [pendingBuyerNames, setPendingBuyerNames] = useState<Record<string, string>>({});
  const [unlockSoldEdits, setUnlockSoldEdits] = useState(false);
  
  // Modals for Custom Confirmations
  const [isUnlockConfirmOpen, setIsUnlockConfirmOpen] = useState(false);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [tempChangesList, setTempChangesList] = useState<{
    apartmentId: string;
    blockName?: string;
    floorNum: number;
    aptName: string;
    aptNum: number;
    oldStatus: 'free' | 'booked' | 'sold';
    newStatus: 'free' | 'booked' | 'sold';
    buyerName?: string;
  }[]>([]);

  useEffect(() => {
    if (currentBlocks.length > 0) {
      if (!selectedStatusBlockId || !currentBlocks.some(b => b.id === selectedStatusBlockId)) {
        setSelectedStatusBlockId(currentBlocks[0].id);
      }
    }
  }, [currentBlocks, selectedStatusBlockId]);

  useEffect(() => {
    if (localSettings.floors && localSettings.floors.length > 0 && selectedStatusFloorNum === null) {
      const sortedFloors = [...localSettings.floors].sort((a, b) => a.floorNumber - b.floorNumber);
      setSelectedStatusFloorNum(sortedFloors[0].floorNumber);
    }
  }, [localSettings.floors, selectedStatusFloorNum]);

  // States for new Document
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocImages, setNewDocImages] = useState<string[]>([]);
  const [newDocActive, setNewDocActive] = useState(true);
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [newDocError, setNewDocError] = useState('');

  // Telegram Integration States
  const [newChatId, setNewChatId] = useState('');
  const [newChatDesc, setNewChatDesc] = useState('');
  const [newChatBot1Enabled, setNewChatBot1Enabled] = useState(true);
  const [newChatBot2Enabled, setNewChatBot2Enabled] = useState(false);
  const [bot1TestStatus, setBot1TestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [bot2TestStatus, setBot2TestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [bot1TestMsg, setBot1TestMsg] = useState('');
  const [bot2TestMsg, setBot2TestMsg] = useState('');

  // States for Editing existing Document
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingDocTitle, setEditingDocTitle] = useState('');
  const [editingDocImages, setEditingDocImages] = useState<string[]>([]);

  // Recommendations States
  const [editingRecommendation, setEditingRecommendation] = useState<any | null>(null);
  const [isAddingRecommendation, setIsAddingRecommendation] = useState(false);
  const [editingCase, setEditingCase] = useState<ProjectCase | Partial<ProjectCase> | null>(null);
  const [isAddingCase, setIsAddingCase] = useState(false);
  const [isSelectingImageFromGallery, setIsSelectingImageFromGallery] = useState(false);

  // File picker references
  const mainLogoInputRef = useRef<HTMLInputElement>(null);
  const heroBannerInputRef = useRef<HTMLInputElement>(null);
  const newDocInputRef = useRef<HTMLInputElement>(null);
  const editDocInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const recommendationInputRef = useRef<HTMLInputElement>(null);

  // Recommendations Management Logic
  const handleMoveRecommendationUp = (index: number) => {
    const list = [...(localSettings.recommendations || [])];
    if (index === 0) return;
    const temp = list[index];
    list[index] = list[index - 1];
    list[index - 1] = temp;
    setLocalSettings(prev => ({ ...prev, recommendations: list }));
  };

  const handleMoveRecommendationDown = (index: number) => {
    const list = [...(localSettings.recommendations || [])];
    if (index === list.length - 1) return;
    const temp = list[index];
    list[index] = list[index + 1];
    list[index + 1] = temp;
    setLocalSettings(prev => ({ ...prev, recommendations: list }));
  };

  const handleDeleteRecommendation = (id: string) => {
    const list = (localSettings.recommendations || []).filter(item => item.id !== id);
    setLocalSettings(prev => ({ ...prev, recommendations: list }));
  };

  const handleSaveRecommendationItem = () => {
    if (!editingRecommendation) return;
    if (!editingRecommendation.title?.trim()) {
      alert("Лутфан сарлавҳа (ном)-ро ворид кунед!");
      return;
    }
    if (!editingRecommendation.imageUrl?.trim()) {
      alert("Лутфан аксро интихоб ё бор кунед!");
      return;
    }

    const currentList = [...(localSettings.recommendations || [])];
    const isNew = !editingRecommendation.id;
    const itemToSave = {
      id: isNew ? 'rec_' + Date.now() : editingRecommendation.id,
      title: editingRecommendation.title.trim(),
      description: (editingRecommendation.description || '').trim(),
      imageUrl: editingRecommendation.imageUrl.trim(),
      imagePosition: editingRecommendation.imagePosition || 'left',
      isTransparentBg: !!editingRecommendation.isTransparentBg,
      zoom: editingRecommendation.zoom ?? 1,
      offsetX: editingRecommendation.offsetX ?? 0,
      offsetY: editingRecommendation.offsetY ?? 0
    };

    let updatedList;
    if (isNew) {
      updatedList = [...currentList, itemToSave];
    } else {
      updatedList = currentList.map(item => item.id === itemToSave.id ? itemToSave : item);
    }

    setLocalSettings(prev => ({ ...prev, recommendations: updatedList }));
    setEditingRecommendation(null);
    setIsAddingRecommendation(false);
  };

  const [isUploadingRecommendation, setIsUploadingRecommendation] = useState(false);

  const handleRecommendationImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size > 10 * 1024 * 1024) {
        alert('Ҳаҷми сурат бояд аз 10MB хурдтар бошад.');
        return;
      }
      setIsUploadingRecommendation(true);
      try {
        const publicUrl = await uploadAsset(file, 'recommendations');
        if (publicUrl) {
          setEditingRecommendation((prev: any) => ({
            ...prev,
            imageUrl: publicUrl
          }));
        } else {
          // fallback to base64
          const reader = new FileReader();
          reader.onloadend = () => {
            setEditingRecommendation((prev: any) => ({
              ...prev,
              imageUrl: reader.result as string
            }));
          };
          reader.readAsDataURL(file);
        }
      } catch (error) {
        console.error("Error uploading recommendation image, falling back to base64:", error);
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditingRecommendation((prev: any) => ({
            ...prev,
            imageUrl: reader.result as string
          }));
        };
        reader.readAsDataURL(file);
      } finally {
        setIsUploadingRecommendation(false);
      }
    }
  };

  // Cases Logic
  const handleDeleteCaseItem = (id: string) => {
    if (confirm('Шумо мутмаин ҳастед, ки ин кейсро нест кардан мехоҳед?')) {
      const currentList = localSettings.cases || [];
      const updatedList = currentList.filter(item => item.id !== id);
      setLocalSettings(prev => ({ ...prev, cases: updatedList }));
    }
  };

  const handleSaveCaseItem = () => {
    if (!editingCase) return;
    if (!editingCase.title?.trim()) {
      alert("Лутфан сарлавҳа (ном)-ро ворид кунед!");
      return;
    }

    const currentList = [...(localSettings.cases || [])];
    const isNew = !editingCase.id;
    const itemToSave = {
      id: isNew ? 'case_' + Date.now() : editingCase.id as string,
      title: editingCase.title.trim(),
      description: (editingCase.description || '').trim(),
      images: editingCase.images || [],
      location: (editingCase.location || '').trim(),
      year: (editingCase.year || '').trim(),
    };

    let updatedList;
    if (isNew) {
      updatedList = [...currentList, itemToSave];
    } else {
      updatedList = currentList.map(item => item.id === itemToSave.id ? itemToSave : item);
    }

    setLocalSettings(prev => ({ ...prev, cases: updatedList }));
    setEditingCase(null);
    setIsAddingCase(false);
  };

  const [isUploadingCaseImage, setIsUploadingCaseImage] = useState(false);

  const handleCaseImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const currentImages = editingCase?.images || [];
      if (currentImages.length >= 5) {
        alert("Шумо танҳо 5 расм метавонед бор кунед!");
        return;
      }
      
      const file = files[0];
      if (file.size > 10 * 1024 * 1024) {
        alert('Ҳаҷми сурат бояд аз 10MB хурдтар бошад.');
        return;
      }
      setIsUploadingCaseImage(true);
      try {
        const publicUrl = await uploadAsset(file, 'cases');
        if (publicUrl) {
          setEditingCase((prev: any) => ({
            ...prev,
            images: [...(prev.images || []), publicUrl]
          }));
        } else {
          // fallback to base64
          const reader = new FileReader();
          reader.onloadend = () => {
            setEditingCase((prev: any) => ({
              ...prev,
              images: [...(prev.images || []), reader.result as string]
            }));
          };
          reader.readAsDataURL(file);
        }
      } catch (error) {
        console.error("Error uploading case image, falling back to base64:", error);
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditingCase((prev: any) => ({
            ...prev,
            images: [...(prev.images || []), reader.result as string]
          }));
        };
        reader.readAsDataURL(file);
      } finally {
        setIsUploadingCaseImage(false);
      }
    }
  };

  // Loading states for asset uploads
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingHeroBanner, setIsUploadingHeroBanner] = useState(false);
  const [isUploadingNewDoc, setIsUploadingNewDoc] = useState(false);
  const [isUploadingEditDoc, setIsUploadingEditDoc] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [uploadingAptId, setUploadingAptId] = useState<string | null>(null);
  const [uploadingFloorId, setUploadingFloorId] = useState<string | null>(null);
  const [galleryUrlInput, setGalleryUrlInput] = useState('');

  const handleGalleryFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files) as File[];
      
      const oversized = fileList.some(item => item.size > 10 * 1024 * 1024);
      if (oversized) {
        alert('Ҳаҷми суратҳои галерея бояд аз 10MB хурдтар бошад.');
        e.target.value = '';
        return;
      }

      const currentGallery = localSettings.gallery || [];
      
      if (currentGallery.length + fileList.length > 10) {
        alert(`Шумо наметавонед зиёда аз 10 сурат дар галерея илова кунед. Айни замон ${currentGallery.length} сурат доред ва кӯшиши боркунии ${fileList.length} суратро доред.`);
        e.target.value = '';
        return;
      }

      setIsUploadingGallery(true);
      try {
        const compressedFileList: File[] = [];
        for (const file of fileList) {
          try {
            const compressed = await compressImage(file, 1600, 1600, 0.82);
            compressedFileList.push(compressed);
          } catch (err) {
            console.warn('Фишурдасозии файл хато шуд, аслашро истифода мебарем:', err);
            compressedFileList.push(file);
          }
        }

        let updatedGallery = [...currentGallery];

        if (isConnected) {
          try {
            for (const file of compressedFileList) {
              const publicUrl = await uploadAsset(file, 'gallery');
              if (publicUrl) {
                const newImg = { id: crypto.randomUUID(), imageUrl: publicUrl };
                updatedGallery.push(newImg);
              }
            }
            setLocalSettings(prev => ({ ...prev, gallery: updatedGallery }));
            e.target.value = '';
            return;
          } catch (err) {
            console.error('Хатогии боргирии сурат ба Supabase, баргашт ба Base64:', err);
          }
        }

        // Base64 Fallback (using compressed files for high performance and standard save compatibility)
        let processedCount = 0;
        const tempGallery = [...currentGallery];
        for (const file of compressedFileList) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            const newImg = { id: crypto.randomUUID(), imageUrl: base64String };
            tempGallery.push(newImg);
            processedCount++;
            if (processedCount === compressedFileList.length) {
              setLocalSettings(prev => ({ ...prev, gallery: tempGallery }));
              e.target.value = '';
            }
          };
          reader.readAsDataURL(file);
        }
      } catch (err) {
        console.error('Хатогӣ дар коркарди файлҳои галерея:', err);
      } finally {
        setIsUploadingGallery(false);
      }
    }
  };

  const handleAddGalleryUrl = () => {
    if (!galleryUrlInput.trim()) return;
    const currentGallery = localSettings.gallery || [];
    if (currentGallery.length >= 10) {
      alert('Шумо наметавонед зиёда аз 10 сурат дар галерея илова кунед.');
      return;
    }
    const newImg = { id: crypto.randomUUID(), imageUrl: galleryUrlInput.trim() };
    const updatedGallery = [...currentGallery, newImg];
    setLocalSettings(prev => ({ ...prev, gallery: updatedGallery }));
    setGalleryUrlInput('');
  };

  const handleDeleteGalleryImg = (id: string) => {
    const currentGallery = localSettings.gallery || [];
    const updatedGallery = currentGallery.filter(img => img.id !== id);
    setLocalSettings(prev => ({ ...prev, gallery: updatedGallery }));
  };

  const handleMoveGalleryImg = (index: number, direction: 'up' | 'down') => {
    const currentGallery = [...(localSettings.gallery || [])];
    if (direction === 'up' && index > 0) {
      const temp = currentGallery[index];
      currentGallery[index] = currentGallery[index - 1];
      currentGallery[index - 1] = temp;
    } else if (direction === 'down' && index < currentGallery.length - 1) {
      const temp = currentGallery[index];
      currentGallery[index] = currentGallery[index + 1];
      currentGallery[index + 1] = temp;
    }
    setLocalSettings(prev => ({ ...prev, gallery: currentGallery }));
  };

  // Map interactive selector states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [mapSearchResults, setMapSearchResults] = useState<any[]>([]);
  const [selectedLat, setSelectedLat] = useState<number>(38.5130635);
  const [selectedLng, setSelectedLng] = useState<number>(68.7699318);
  const [mapMode, setMapMode] = useState<'streets' | 'satellite'>('streets');
  const [mapZoom, setMapZoom] = useState<number>(19); // Default to high-detail zoom level 19 for maximal detail

  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

  // Parse initial satellite mode status from settings.mapIframeUrl too
  useEffect(() => {
    const iframeUrl = settings.mapIframeUrl || '';
    if (iframeUrl.includes('t=k') || iframeUrl.includes('t=h')) {
      setMapMode('satellite');
    } else {
      setMapMode('streets');
    }
  }, [settings.mapIframeUrl]);

  // Unified helper for generating coordinate embedded url with adjustable zoom
  const generateEmbedUrl = (lat: number, lng: number, mode: 'streets' | 'satellite', zoom: number = 19) => {
    const safeLat = isNaN(lat) ? 38.5130635 : lat;
    const safeLng = isNaN(lng) ? 68.7699318 : lng;
    const tParam = mode === 'satellite' ? 'h' : ''; // Use 'h' for hybrid (satellite with roads, streets, and labels)
    return `https://maps.google.com/maps?q=${safeLat.toFixed(7)},${safeLng.toFixed(7)}&t=${tParam}&z=${zoom}&ie=UTF8&iwloc=&output=embed`;
  };

  // Parse initial coordinates and zoom from mapIframeUrl on settings initialization
  useEffect(() => {
    let initialLat = 38.5130635;
    let initialLng = 68.7699318;
    const iframeUrl = settings.mapIframeUrl || '';
    if (iframeUrl.includes('pb=')) {
      const latMatch = iframeUrl.match(/!3d([-\d.]+)/);
      const lngMatch = iframeUrl.match(/!2d([-\d.]+)/);
      if (latMatch && lngMatch) {
        const parsedLat = parseFloat(latMatch[1]);
        const parsedLng = parseFloat(lngMatch[2]);
        if (!isNaN(parsedLat)) initialLat = parsedLat;
        if (!isNaN(parsedLng)) initialLng = parsedLng;
      }
    } else {
      const qMatch = iframeUrl.match(/[?&]q=([-\d.]+),([-\d.]+)/);
      if (qMatch) {
        const parsedLat = parseFloat(qMatch[1]);
        const parsedLng = parseFloat(qMatch[2]);
        if (!isNaN(parsedLat)) initialLat = parsedLat;
        if (!isNaN(parsedLng)) initialLng = parsedLng;
      }
    }
    const zMatch = iframeUrl.match(/[?&]z=(\d+)/);
    if (zMatch) {
      const parsedZ = parseInt(zMatch[1]);
      if (!isNaN(parsedZ)) {
        setMapZoom(parsedZ);
      }
    } else {
      setMapZoom(19); // Default to close-up zoom 19
    }
    setSelectedLat(initialLat);
    setSelectedLng(initialLng);
  }, [settings.mapIframeUrl]);

  // Initialize and synchronize Leaflet Map instance
  useEffect(() => {
    if (activeTab !== 'map') return;

    const mapElement = document.getElementById('admin-leaflet-map');
    if (!mapElement) return;

    // Force complete clean-up of previous leaflet instances & references
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (e) {
        console.warn('Error cleanup map instance:', e);
      }
      mapInstanceRef.current = null;
    }

    // Reset element's inner HTML to avoid target duplication issues
    mapElement.innerHTML = '';
    delete (mapElement as any)._leaflet_id;

    // High quality custom pulsing SVG icon so we don't depend on unlinked CDN graphics
    const pulsingIcon = L.divIcon({
      html: `
        <div class="flex items-center justify-center relative" style="width: 44px; height: 44px;">
          <div class="absolute w-12 h-12 rounded-full bg-red-500 opacity-40 animate-ping"></div>
          <div class="absolute w-7 h-7 rounded-full bg-red-600 border-2 border-white shadow-2xl flex items-center justify-center">
            <div class="w-2.5 h-2.5 rounded-full bg-white"></div>
          </div>
        </div>
      `,
      className: 'custom-pulsing-marker-red',
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    // Initialize fresh map - adjust Leaflet UI zoom in line with selected Google Maps zoom
    const leafletZoom = Math.min(mapZoom, 20);
    const map = L.map('admin-leaflet-map', {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([selectedLat, selectedLng], leafletZoom);

    mapInstanceRef.current = map;

    // Use standard Google Maps layers for familiar labels, roads, streets, and names
    const tileUrl = mapMode === 'satellite'
      ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}' // Google Hybrid (Satellite with labels and roads)
      : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'; // Google Roadmap (Standard)

    const baseAttribution = '&copy; Google Maps';

    const baseTile = L.tileLayer(tileUrl, {
      attribution: baseAttribution,
      maxZoom: 20
    }).addTo(map);

    tileLayerRef.current = baseTile;

    // Placed marker
    const marker = L.marker([selectedLat, selectedLng], {
      draggable: true,
      icon: pulsingIcon
    }).addTo(map);
    markerRef.current = marker;

    // Coordinate synchronizer callback
    const updateCoords = (lat: number, lng: number) => {
      setSelectedLat(lat);
      setSelectedLng(lng);
      const newUrl = generateEmbedUrl(lat, lng, mapMode, mapZoom);
      setLocalSettings(prev => ({ ...prev, mapIframeUrl: newUrl }));
    };

    // Wire Leaflet event triggers
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      updateCoords(position.lat, position.lng);
    });

    map.on('click', (e: any) => {
      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng);
        updateCoords(e.latlng.lat, e.latlng.lng);
      }
    });

    // Render / sizes update
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    const sizesInvals = [300, 700, 1200];
    sizesInvals.forEach(delay => {
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, delay);
    });

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn('Error clearing map on cleanup:', e);
        }
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [activeTab, mapMode, mapZoom]);




  const handleMapSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearchingMap(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await response.json();
      setMapSearchResults(data);
    } catch (err) {
      console.error('Хатогии ҷустуҷӯи харита:', err);
    } finally {
      setIsSearchingMap(false);
    }
  };

  const handleSelectPlace = (place: any) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    setSelectedLat(lat);
    setSelectedLng(lon);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lon], 16);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon]);
      }
    }

    const newUrl = generateEmbedUrl(lat, lon, mapMode, mapZoom);
    setLocalSettings(prev => ({ ...prev, mapIframeUrl: newUrl }));
    setMapSearchResults([]);
    setSearchQuery(place.display_name);
  };

  // Convert files to base64 or upload to Supabase bucket directly
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>, type: 'logo' | 'hero_banner' | 'new_doc' | 'edit_doc') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Ҳаҷми сурат бояд аз 10MB хурдтар бошад.');
        return;
      }

      // Check if Supabase connection is active
      if (isConnected) {
        if (type === 'logo') setIsUploadingLogo(true);
        if (type === 'hero_banner') setIsUploadingHeroBanner(true);
        if (type === 'new_doc') setIsUploadingNewDoc(true);
        if (type === 'edit_doc') setIsUploadingEditDoc(true);

        try {
          // Upload directly to Supabase storage bucket
          const folderName = type === 'logo' ? 'logos' : type === 'hero_banner' ? 'banners' : 'documents';
          const publicUrl = await uploadAsset(file, folderName);
          if (publicUrl) {
            if (type === 'logo') {
              setLocalSettings(prev => ({ ...prev, logoUrl: publicUrl }));
            } else if (type === 'hero_banner') {
              setLocalSettings(prev => ({ ...prev, heroBannerUrl: publicUrl }));
            } else if (type === 'new_doc') {
              setNewDocImages(prev => [...prev, publicUrl].slice(0, 10));
            } else if (type === 'edit_doc') {
              setEditingDocImages(prev => [...prev, publicUrl].slice(0, 10));
            }
            return; // Successfully uploaded, return early!
          }
        } catch (err) {
          console.error('Хатогии боргирии сурат ба Supabase, баргашт ба Base64:', err);
        } finally {
          if (type === 'logo') setIsUploadingLogo(false);
          if (type === 'hero_banner') setIsUploadingHeroBanner(false);
          if (type === 'new_doc') setIsUploadingNewDoc(false);
          if (type === 'edit_doc') setIsUploadingEditDoc(false);
        }
      }

      // Fallback to base64 in case Supabase is not connected or upload failed
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (type === 'logo') {
          setLocalSettings(prev => ({ ...prev, logoUrl: base64String }));
        } else if (type === 'hero_banner') {
          setLocalSettings(prev => ({ ...prev, heroBannerUrl: base64String }));
        } else if (type === 'new_doc') {
          setNewDocImages(prev => [...prev, base64String].slice(0, 10));
        } else if (type === 'edit_doc') {
          setEditingDocImages(prev => [...prev, base64String].slice(0, 10));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveGeneralSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const settingsToSave = {
        ...localSettings,
        floors: recalculateApartmentNumbers(localSettings.floors || [], currentBlocks)
      };
      await onSaveSettings(settingsToSave);
      setLocalSettings(settingsToSave);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStatusesPreflight = () => {
    const changes: typeof tempChangesList = [];
    (localSettings.floors || []).forEach(floor => {
      const floorBlockId = floor.blockId || currentBlocks[0]?.id;
      const bObj = currentBlocks.find(b => b.id === floorBlockId);
      const blockName = bObj ? bObj.name : 'Блок А';

      (floor.apartments || []).forEach(apt => {
        const current = apt.status || 'free';
        const pending = pendingStatusChanges[apt.id];
        if (pending && pending !== current) {
          changes.push({
            apartmentId: apt.id,
            blockName,
            floorNum: floor.floorNumber,
            aptName: apt.name,
            aptNum: apt.number,
            oldStatus: current,
            newStatus: pending,
            buyerName: pendingBuyerNames[apt.id] || ''
          });
        }
      });
    });

    if (changes.length === 0) {
      // Just set state so a small informational warning is not needed or we can do alert directly
      setTempChangesList([]);
      alert('Шумо ягон статусро иваз накардаед.');
      return;
    }

    setTempChangesList(changes);
    setIsSaveConfirmOpen(true);
  };

  const handleCommitStatusChanges = async () => {
    setIsSaving(true);
    setIsSaveConfirmOpen(false);
    try {
      const updatedFloors = (localSettings.floors || []).map(floor => {
        const floorApts = floor.apartments || [];
        const updatedApts = floorApts.map(apt => {
          const pending = pendingStatusChanges[apt.id];
          if (pending) {
            const hasBuyer = pending === 'sold' && pendingBuyerNames[apt.id];
            return {
              ...apt,
              status: pending,
              ...(hasBuyer ? { buyerName: pendingBuyerNames[apt.id] } : {})
            };
          }
          return apt;
        });
        return {
          ...floor,
          apartments: updatedApts
        };
      });

      const nextSettings = {
        ...localSettings,
        floors: updatedFloors
      };

      // 1. Save to database / localSettings
      await onSaveSettings(nextSettings);
      setLocalSettings(nextSettings);

      // 2. Send Telegram notifications for each change
      for (const c of tempChangesList) {
        let msg = '';
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const dateStr = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}`;
        const bNameStr = c.blockName ? `🏢 Блок: ${c.blockName}\n` : '';

        if (c.newStatus === 'sold') {
          const buyer = c.buyerName && c.buyerName.trim() ? c.buyerName.trim() : 'Муайян нашудааст';
          msg = `Урааааа🥳 - ХОНА ФУРУХТА ШУД!\n` +
                bNameStr +
                `Этажи ${c.floorNum} - Хонаи ${c.aptNum || c.aptName}\n` +
                `Харидор: ${buyer}\n` +
                `Сана: ${dateStr}`;
        } else if (c.oldStatus === 'sold' && c.newStatus === 'free') {
          msg = `Статус дубора иваз шуд!\n` +
                `Аз Фурӯхта шуд ба Холи\n` +
                bNameStr +
                `Этаж ${c.floorNum} - Хонаи ${c.aptNum || c.aptName}\n` +
                `Сана: ${dateStr}`;
        } else if (c.oldStatus === 'booked' && c.newStatus === 'free') {
          msg = `Статус иваз шуд!\n` +
                `Аз Брон ба Холи\n` +
                bNameStr +
                `Этаж ${c.floorNum} - Хонаи ${c.aptNum || c.aptName}\n` +
                `Сана: ${dateStr}`;
        } else if (c.newStatus === 'booked') {
          msg = `Урааааа🥳 - ХОНА БРОН ШУД!\n` +
                bNameStr +
                `Этажи ${c.floorNum} - Квартира ${c.aptNum || c.aptName}\n` +
                `Сана: ${dateStr}`;
        } else {
          const oldLabel = c.oldStatus === 'sold' ? 'Продано' : c.oldStatus === 'booked' ? 'Брон' : 'Свободно';
          const newLabel = c.newStatus === 'sold' ? 'Продано' : c.newStatus === 'booked' ? 'Брон' : 'Свободно';
          msg = `Статус изменен!\n` +
                `С ${oldLabel} на ${newLabel}\n` +
                bNameStr +
                `Этаж ${c.floorNum} - Квартира ${c.aptNum || c.aptName}\n` +
                `Дата: ${dateStr}`;
        }

        try {
          await sendTelegramAlert(nextSettings, msg, 'bot2');
        } catch (tgErr) {
          console.error("error sending bot2 tg alert", tgErr);
        }
      }

      // Clear pending states
      setPendingStatusChanges({});
      setPendingBuyerNames({});
      setUnlockSoldEdits(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);

    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTelegramChat = () => {
    if (!newChatId.trim()) return;
    const newChat = {
      id: crypto.randomUUID(),
      chatId: newChatId.trim(),
      description: newChatDesc.trim() || 'Чат ID',
      bot1Enabled: newChatBot1Enabled,
      bot2Enabled: newChatBot2Enabled
    };
    const currentChats = localSettings.tgChats || [];
    setLocalSettings(prev => ({
      ...prev,
      tgChats: [...currentChats, newChat]
    }));
    setNewChatId('');
    setNewChatDesc('');
    setNewChatBot1Enabled(true);
    setNewChatBot2Enabled(false);
  };

  const handleDeleteTelegramChat = (id: string) => {
    const currentChats = localSettings.tgChats || [];
    setLocalSettings(prev => ({
      ...prev,
      tgChats: currentChats.filter(c => c.id !== id)
    }));
  };

  const handleUpdateTelegramChat = (id: string, updates: Partial<{ chatId: string; description: string; bot1Enabled: boolean; bot2Enabled: boolean }>) => {
    const currentChats = localSettings.tgChats || [];
    setLocalSettings(prev => ({
      ...prev,
      tgChats: currentChats.map(c => c.id === id ? { ...c, ...updates } : c)
    }));
  };

  const handleToggleChatBot = (id: string, botKey: 'bot1' | 'bot2') => {
    const currentChats = localSettings.tgChats || [];
    setLocalSettings(prev => ({
      ...prev,
      tgChats: currentChats.map(c => {
        if (c.id === id) {
          return {
            ...c,
            bot1Enabled: botKey === 'bot1' ? !c.bot1Enabled : c.bot1Enabled,
            bot2Enabled: botKey === 'bot2' ? !c.bot2Enabled : c.bot2Enabled
          };
        }
        return c;
      })
    }));
  };

  const testTelegramBot = async (botKey: 'bot1' | 'bot2') => {
    const token = botKey === 'bot1' ? localSettings.tgBotToken1 : localSettings.tgBotToken2;
    const setStatus = botKey === 'bot1' ? setBot1TestStatus : setBot2TestStatus;
    const setMsg = botKey === 'bot1' ? setBot1TestMsg : setBot2TestMsg;

    if (!token) {
      setStatus('error');
      setMsg('Пожалуйста, введите токен бота.');
      return;
    }

    setStatus('testing');
    setMsg('Подключение...');
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const body = await response.json();
      if (response.ok && body.ok) {
        setStatus('success');
        setMsg(`Активен! @${body.result.username}`);
      } else {
        setStatus('error');
        setMsg(`Ошибка: ${body.description || 'Неверный токен'}`);
      }
    } catch (e: any) {
      setStatus('error');
      setMsg(`Ошибка: ${e.message || 'Не удалось подключиться'}`);
    }
  };

  const sendTestNotification = async (chatId: string, botKey: 'bot1' | 'bot2') => {
    const token = botKey === 'bot1' ? localSettings.tgBotToken1 : localSettings.tgBotToken2;
    if (!token) {
      alert('Пожалуйста, сначала введите и сохраните токен этого бота.');
      return;
    }
    try {
      const msg = `⚡️ <b>Тестовое сообщение</b>\n\nЭто тестовое сообщение с сайта для проверки Chat ID.\nВремя: ${new Date().toLocaleTimeString()}`;
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: msg,
          parse_mode: 'HTML'
        })
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        alert('Тестовое сообщение успешно отправлено! Проверьте Telegram.');
      } else {
        alert(`Ошибка при отправке: ${data.description || 'Неизвестно'}`);
      }
    } catch (e: any) {
      alert(`Ошибка подключения к Telegram API: ${e.message}`);
    }
  };

  const handleDocImagesUpload = async (e: ChangeEvent<HTMLInputElement>, mode: 'new' | 'edit') => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const currentImages = mode === 'new' ? newDocImages : editingDocImages;
    const slotsLeft = 10 - currentImages.length;
    if (slotsLeft <= 0) {
      alert('Максимум 10 сурат дар як документ илова кардан мумкин аст.');
      if (e.target) e.target.value = '';
      return;
    }

    const filesToProcess = files.slice(0, slotsLeft);
    if (mode === 'new') setIsUploadingNewDoc(true);
    else setIsUploadingEditDoc(true);

    const uploaded: string[] = [];

    for (const file of filesToProcess) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`Ҳаҷми файли ${file.name} аз 10MB калонтар аст.`);
        continue;
      }

      let publicUrl: string | null = null;
      if (isConnected) {
        try {
          publicUrl = await uploadAsset(file, 'documents');
        } catch (err) {
          console.error('Upload error:', err);
        }
      }

      if (!publicUrl) {
        publicUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      if (publicUrl) {
        uploaded.push(publicUrl);
      }
    }

    if (mode === 'new') {
      setNewDocImages(prev => [...prev, ...uploaded].slice(0, 10));
      setIsUploadingNewDoc(false);
      setNewDocError('');
    } else {
      setEditingDocImages(prev => [...prev, ...uploaded].slice(0, 10));
      setIsUploadingEditDoc(false);
    }

    if (e.target) e.target.value = '';
  };

  const handleAddNewDocumentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setNewDocError('');
    if (!newDocTitle.trim()) {
      setNewDocError('Пожалуйста, введите название документа.');
      return;
    }
    if (newDocImages.length === 0) {
      setNewDocError('Пожалуйста, выберите хотя бы одно изображение документа (до 10 шт).');
      return;
    }

    setIsAddingDoc(true);
    try {
      await onAddDoc(newDocTitle.trim(), newDocImages[0], newDocImages, newDocActive);
      setNewDocTitle('');
      setNewDocImages([]);
      setNewDocActive(true);
      if (newDocInputRef.current) newDocInputRef.current.value = '';
    } catch (e: any) {
      setNewDocError('Произошла ошибка при добавлении.');
    } finally {
      setIsAddingDoc(false);
    }
  };

  const startEditingDoc = (doc: ProjectDocument) => {
    setEditingDocId(doc.id);
    setEditingDocTitle(doc.title);
    const imgs = doc.images && doc.images.length > 0 ? doc.images : (doc.imageUrl ? [doc.imageUrl] : []);
    setEditingDocImages(imgs);
  };

  const cancelEditingDoc = () => {
    setEditingDocId(null);
    setEditingDocTitle('');
    setEditingDocImages([]);
  };

  const saveEditedDoc = async (id: string) => {
    if (!editingDocTitle.trim()) {
      alert('Название документа не может быть пустым');
      return;
    }
    if (editingDocImages.length === 0) {
      alert('Документ должен иметь хотя бы одно изображение');
      return;
    }
    try {
      await onUpdateDoc(id, {
        title: editingDocTitle.trim(),
        imageUrl: editingDocImages[0] || '',
        images: editingDocImages
      });
      setEditingDocId(null);
      setEditingDocImages([]);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleDocStatus = async (id: string, currentStatus: boolean) => {
    try {
      await onUpdateDoc(id, { isActive: !currentStatus });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (window.confirm('Вы уверены, что хотите полностью удалить этот документ?')) {
      try {
        await onDeleteDoc(id);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // FLOORS & APARTMENTS ADMIN HELPERS
  const [numAptsInput, setNumAptsInput] = useState<number | string>(4);
  const [addingFloorBlockId, setAddingFloorBlockId] = useState<string | null>(null);
  const [floorTypeToCreate, setFloorTypeToCreate] = useState<FloorType>('apartment');
  const [customLabelInput, setCustomLabelInput] = useState<string>('Магазин');
  const [expandedFloorIds, setExpandedFloorIds] = useState<Record<string, boolean>>({});
  const [expandedBlockIds, setExpandedBlockIds] = useState<Record<string, boolean>>({});
  const [newBlockNameInput, setNewBlockNameInput] = useState('');
  const [duplicateModalFloor, setDuplicateModalFloor] = useState<Floor | null>(null);
  const [selectedTargetFloorIds, setSelectedTargetFloorIds] = useState<string[]>([]);

  const toggleBlockExpanded = (blockId: string) => {
    setExpandedBlockIds(prev => ({ ...prev, [blockId]: !prev[blockId] }));
  };

  const handleAddBlock = () => {
    const name = newBlockNameInput.trim();
    if (!name) {
      alert('Пожалуйста, введите название нового блока (например: Блок Б).');
      return;
    }
    const newBlock = {
      id: 'block_' + Date.now(),
      name,
      description: ''
    };
    const updatedBlocks = [...currentBlocks, newBlock];
    setLocalSettings(prev => ({
      ...prev,
      blocks: updatedBlocks
    }));
    setNewBlockNameInput('');
    setExpandedBlockIds(prev => ({ ...prev, [newBlock.id]: true }));
  };

  const handleDeleteBlock = (blockId: string) => {
    if (currentBlocks.length <= 1) {
      alert('Вы не можете удалить единственный существующий блок.');
      return;
    }
    if (window.confirm('Вы уверены, что хотите удалить этот блок и все его этажи и квартиры?')) {
      const updatedBlocks = currentBlocks.filter(b => b.id !== blockId);
      const updatedFloors = (localSettings.floors || []).filter(f => (f.blockId || currentBlocks[0].id) !== blockId);
      setLocalSettings(prev => ({
        ...prev,
        blocks: updatedBlocks,
        floors: recalculateApartmentNumbers(updatedFloors, updatedBlocks)
      }));
    }
  };

  const toggleFloorExpanded = (id: string) => {
    setExpandedFloorIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const recalculateApartmentNumbersHelper = (floors: Floor[], blocks = currentBlocks): Floor[] => {
    return recalculateApartmentNumbers(floors, blocks);
  };

  const handleAddFloor = (blockId: string) => {
    const floorsList = localSettings.floors || [];
    const targetBlockId = blockId;
    const targetBlockFloors = floorsList.filter(f => (f.blockId || currentBlocks[0].id) === targetBlockId);
    
    // Limits
    if (floorTypeToCreate === 'shop') {
      const count = targetBlockFloors.filter(f => f.floorType === 'shop' || (!f.floorType && f.isShopFloor === true)).length;
      if (count >= 4) {
        alert('Вы не можете добавить более 4 этажей магазинов в этом блоке.');
        return;
      }
    } else if (floorTypeToCreate === 'basement_shop') {
      const count = targetBlockFloors.filter(f => f.floorType === 'basement_shop').length;
      if (count >= 2) {
        alert('Вы не можете добавить более 2 цокольных этажей (магазинов в подвале) в этом блоке.');
        return;
      }
    } else if (floorTypeToCreate === 'parking') {
      const count = targetBlockFloors.filter(f => f.floorType === 'parking').length;
      if (count >= 3) {
        alert('Вы не можете добавить более 3 этажей парковки в этом блоке.');
        return;
      }
    }

    const nextFloorNum = floorsList.length > 0 
      ? Math.max(...floorsList.map(f => f.floorNumber)) + 1 
      : 1;

    const aptCount = parseInt(String(numAptsInput)) || 4;
    const newApts = Array.from({ length: aptCount }, () => ({
      id: crypto.randomUUID(),
      number: 0,
      name: '',
      area: '',
      planUrl: ''
    }));

    const chosenLabel = floorTypeToCreate === 'basement_shop' ? customLabelInput.trim().slice(0, 10) : '';
    const newFloor: Floor = {
      id: crypto.randomUUID(),
      blockId: targetBlockId,
      floorNumber: nextFloorNum,
      apartments: newApts,
      isShopFloor: floorTypeToCreate !== 'apartment',
      floorType: floorTypeToCreate,
      customLabel: chosenLabel ? chosenLabel : (floorTypeToCreate === 'basement_shop' ? 'Магазин' : undefined)
    };

    const updatedFloors = recalculateApartmentNumbers([...floorsList, newFloor], currentBlocks);
    setLocalSettings(prev => ({ 
      ...prev, 
      blocks: currentBlocks,
      floors: updatedFloors 
    }));
    setAddingFloorBlockId(null);
  };

  const handleDeleteFloor = (floorId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот этаж со всеми его квартирами?')) {
      const floorsList = localSettings.floors || [];
      const filtered = floorsList.filter(f => f.id !== floorId);
      const updatedFloors = recalculateApartmentNumbers(filtered, currentBlocks);
      setLocalSettings(prev => ({ ...prev, floors: updatedFloors }));
    }
  };

  const handleUpdateApartment = (floorId: string, aptId: string, updates: Partial<Apartment>) => {
    const floorsList = localSettings.floors || [];
    const updatedFloors = floorsList.map(floor => {
      if (floor.id === floorId) {
        const updatedApts = floor.apartments.map(apt => {
          if (apt.id === aptId) {
            return { ...apt, ...updates };
          }
          return apt;
        });
        return { ...floor, apartments: updatedApts };
      }
      return floor;
    });
    setLocalSettings(prev => ({ ...prev, floors: updatedFloors }));
  };

  const handleUpdateFloor = (floorId: string, updates: Partial<Floor>) => {
    const floorsList = localSettings.floors || [];
    const updatedFloors = floorsList.map(floor => {
      if (floor.id === floorId) {
        return { ...floor, ...updates };
      }
      return floor;
    });
    setLocalSettings(prev => ({ ...prev, floors: updatedFloors }));
  };

  const handleFloorPlanUpload = async (e: ChangeEvent<HTMLInputElement>, floorId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Размер файла должен быть меньше 10MB.');
        return;
      }
      setUploadingFloorId(floorId);
      let fileToUpload = file;
      
      try {
        fileToUpload = await compressImage(file, 1600, 1600, 0.85);
      } catch (comprErr) {
        console.warn('Сжатие файла завершилось с ошибкой, используется оригинальный файл:', comprErr);
      }
      
      try {
        if (isConnected) {
          const publicUrl = await uploadAsset(fileToUpload, 'plans');
          if (publicUrl) {
            handleUpdateFloor(floorId, { floorPlanUrl: publicUrl });
            return;
          }
        }

        // Base64 Fallback
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          handleUpdateFloor(floorId, { floorPlanUrl: base64String });
        };
        reader.readAsDataURL(fileToUpload);
      } catch (err) {
        console.error('Ошибка загрузки плана этажа:', err);
      } finally {
        setUploadingFloorId(null);
      }
    }
  };

  const handleAddNewApartmentToFloor = (floorId: string) => {
    const floorsList = localSettings.floors || [];
    const updatedFloors = floorsList.map(floor => {
      if (floor.id === floorId) {
        const newApt: Apartment = {
          id: crypto.randomUUID(),
          number: 0,
          name: '',
          area: '',
          planUrl: ''
        };
        return {
          ...floor,
          apartments: [...(floor.apartments || []), newApt]
        };
      }
      return floor;
    });
    const finalFloors = recalculateApartmentNumbers(updatedFloors, currentBlocks);
    setLocalSettings(prev => ({ ...prev, floors: finalFloors }));
  };

  const handleDeleteApartmentFromFloor = (floorId: string, aptId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту квартиру?')) {
      const floorsList = localSettings.floors || [];
      const updatedFloors = floorsList.map(floor => {
        if (floor.id === floorId) {
          return {
            ...floor,
            apartments: (floor.apartments || []).filter((a) => a.id !== aptId)
          };
        }
        return floor;
      });
      const finalFloors = recalculateApartmentNumbers(updatedFloors, currentBlocks);
      setLocalSettings(prev => ({ ...prev, floors: finalFloors }));
    }
  };

  // DUPLICATE FLOOR HELPERS
  const handleOpenDuplicateModal = (floor: Floor) => {
    setDuplicateModalFloor(floor);
    const blockId = floor.blockId || currentBlocks[0]?.id;
    const sameBlockOtherFloors = (localSettings.floors || []).filter(
      f => (f.blockId || currentBlocks[0]?.id) === blockId && f.id !== floor.id
    );
    setSelectedTargetFloorIds(sameBlockOtherFloors.map(f => f.id));
  };

  const handleToggleTargetFloor = (targetFloorId: string) => {
    setSelectedTargetFloorIds(prev =>
      prev.includes(targetFloorId)
        ? prev.filter(id => id !== targetFloorId)
        : [...prev, targetFloorId]
    );
  };

  const handleSelectAllTargets = (targetFloors: Floor[]) => {
    setSelectedTargetFloorIds(targetFloors.map(f => f.id));
  };

  const handleDeselectAllTargets = () => {
    setSelectedTargetFloorIds([]);
  };

  const handleApplyFloorDuplication = () => {
    if (!duplicateModalFloor || selectedTargetFloorIds.length === 0) return;

    const currentFloors = localSettings.floors || [];

    const updatedFloors = currentFloors.map(f => {
      if (selectedTargetFloorIds.includes(f.id)) {
        // Deep clone apartments from source floor with fresh IDs
        const duplicatedApartments: Apartment[] = (duplicateModalFloor.apartments || []).map(apt => ({
          id: crypto.randomUUID(),
          number: apt.number,
          name: apt.name,
          area: apt.area || '',
          planUrl: apt.planUrl || '',
          status: apt.status || 'free',
          buyerName: apt.buyerName || ''
        }));

        return {
          ...f,
          floorPlanUrl: duplicateModalFloor.floorPlanUrl || '',
          planBgType: duplicateModalFloor.planBgType || 'transparent',
          planBgColor: duplicateModalFloor.planBgColor || '#FFFFFF',
          planScale: duplicateModalFloor.planScale || 100,
          isShopFloor: duplicateModalFloor.isShopFloor,
          floorType: duplicateModalFloor.floorType,
          apartments: duplicatedApartments
        };
      }
      return f;
    });

    const finalFloors = recalculateApartmentNumbers(updatedFloors, currentBlocks);

    setLocalSettings(prev => ({
      ...prev,
      floors: finalFloors
    }));

    setDuplicateModalFloor(null);
    setSelectedTargetFloorIds([]);
  };

  const handleApartmentPlanUpload = async (e: ChangeEvent<HTMLInputElement>, floorId: string, aptId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Размер файла должен быть меньше 10MB.');
        return;
      }
      setUploadingAptId(aptId);
      let fileToUpload = file;
      
      try {
        // Compress image on the client side to bypass size limits and prevent QuotaExceeded errors
        fileToUpload = await compressImage(file, 1600, 1600, 0.85);
      } catch (comprErr) {
        console.warn('Сжатие файла завершилось с ошибкой, используется оригинальный файл:', comprErr);
      }
      
      try {
        if (isConnected) {
          const publicUrl = await uploadAsset(fileToUpload, 'plans');
          if (publicUrl) {
            handleUpdateApartment(floorId, aptId, { planUrl: publicUrl });
            return;
          }
        }

        // Base64 Fallback
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          handleUpdateApartment(floorId, aptId, { planUrl: base64String });
        };
        reader.readAsDataURL(fileToUpload);
      } catch (err) {
        console.error('Ошибка загрузки плана:', err);
      } finally {
        setUploadingAptId(null);
      }
    }
  };

  const tabs: { id: AdminTab; label: string; icon: any }[] = [
    { id: 'brand', label: 'Логотип и заголовки', icon: Settings },
    { id: 'positioning', label: 'Позиционирование (3 Цвета)', icon: Palette },
    { id: 'desc', label: 'Описание проекта', icon: FileText },
    { id: 'contacts', label: 'Контакты и адрес', icon: Phone },
    { id: 'map', label: 'Карта Google', icon: Map },
    { id: 'docs', label: 'Документы проекта', icon: FileUp },
    { id: 'pricing', label: 'Цены по этажам', icon: Layers },
    { id: 'gallery', label: 'Галерея фотографий', icon: ImageIcon },
    { id: 'recommendations', label: 'Рекомендации', icon: Sliders },
    { id: 'cases', label: 'Кейсы (Сданные объекты)', icon: Briefcase },
    { id: 'chessboard', label: 'Шахматка', icon: LayoutGrid },
    { id: 'status_manager', label: 'Статус квартир', icon: ClipboardCheck },
    { id: 'integration', label: 'Интеграция', icon: Send },
    { id: 'storage_manager', label: 'Файлы и Изображения', icon: HardDrive },
    { id: 'analytics', label: 'Аналитика', icon: TrendingUp },
    { id: 'auth', label: 'Авторизация', icon: KeyRound }
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1E293B] flex flex-col font-sans" id="admin-panel-root">
      
      {/* High contrast admin top-bar */}
      <header className="min-h-16 h-auto sm:h-20 bg-white border-b border-slate-200 px-3 sm:px-10 py-2 sm:py-0 flex items-center justify-between sticky top-0 z-45" id="admin-header">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#0F172A] flex items-center justify-center rounded-lg text-white shrink-0" id="admin-header-logo-icon">
            <Sliders size={16} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-bold text-[#0F172A] tracking-tight text-xs sm:text-base leading-tight uppercase">ПАНЕЛЬ УПРАВЛЕНИЯ</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isStandaloneMode && (
            <button
              onClick={onBackToClient}
              className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-xs font-normal bg-[#0F172A] hover:bg-[#1E293B] hover:scale-[1.01] active:scale-[0.99] text-white rounded-lg shadow-sm border border-transparent hover:border-slate-800 transition-all cursor-pointer uppercase tracking-wider group shrink-0"
              id="admin-to-client-btn"
            >
              <span className="font-normal hidden xs:inline sm:inline">Выйти на сайт</span>
              <span className="font-normal xs:hidden sm:hidden">Выход</span>
              <ArrowUpRight size={13} className="stroke-[2.5] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          )}
        </div>
      </header>

      {/* Grid Layout Workspace */}
      <div className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-8 md:p-10 grid grid-cols-12 gap-4 sm:gap-8 md:gap-10">
        
        {/* Navigation tab menu */}
        {!statusOnlyMode && !isStandaloneMode && (
          <>
            {/* Desktop Navigation Sidebar */}
            <aside className="hidden lg:flex col-span-3 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto flex-col gap-1.5 bg-white border border-slate-200 p-4 rounded-sm h-fit shadow-xs scrollbar-thin" id="admin-sidebar">
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 pb-3 border-b border-slate-100 mb-2">
                Настройки системы
              </p>
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                const isTabActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabSelect(tab.id)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-sm text-left text-xs sm:text-sm font-semibold transition-all cursor-pointer border ${
                      isTabActive
                        ? 'bg-[#0F172A] text-white border-[#0F172A] font-bold'
                        : 'text-slate-600 bg-white hover:bg-slate-50 hover:text-[#0F172A] border-slate-100'
                    }`}
                    id={`tab-btn-${tab.id}`}
                  >
                    <IconComponent size={15} className="shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </aside>

            {/* Mobile Navigation Tab Bar / Selector for Mobile Screens */}
            <div className="col-span-12 lg:hidden space-y-3 bg-white border border-slate-200 p-3 rounded-xl shadow-2xs" id="admin-mobile-tab-nav">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                  Бахши танзимот:
                </label>
                <select
                  value={activeTab}
                  onChange={(e) => handleTabSelect(e.target.value as AdminTab)}
                  className="bg-slate-100 border border-slate-200 font-bold text-xs text-slate-800 rounded-lg p-2 focus:border-amber-500 outline-none cursor-pointer max-w-[200px] truncate"
                  id="admin-mobile-tab-select"
                >
                  {tabs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Horizontal Scrollable Pills */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 pt-1 -mx-1 px-1">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  const isTabActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabSelect(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer border ${
                        isTabActive
                          ? 'bg-[#0F172A] text-white border-[#0F172A]'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <IconComponent size={14} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Right Active Work Panel Container */}
        <main className={`col-span-12 ${statusOnlyMode || isStandaloneMode ? 'lg:col-span-12' : 'lg:col-span-9'} flex flex-col`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="bg-white border border-slate-200 rounded-sm p-6 sm:p-8 flex flex-col gap-6 shadow-sm"
              id={`tab-workspace-${activeTab}`}
            >
              
              {/* TAB 1: LOGO, HEADER TEXTS EDITORS */}
              {activeTab === 'brand' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-md sm:text-lg font-bold text-[#0F172A] tracking-tight">Логотип и заголовки</h3>
                      <p className="text-xs text-slate-400 mt-1">Редактируйте первый крупный текст, второй средний текст и изображение логотипа ниже.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveGeneralSettings}
                      disabled={isSaving}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#024F33] hover:bg-[#013522] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition-all uppercase tracking-wider shadow-sm cursor-pointer shrink-0"
                      id="save-brand-header-btn"
                    >
                      {isSaving ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />}
                      <span>Сохранить</span>
                    </button>
                  </div>

                  {/* Logo Picker Section */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-sm space-y-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Изображение логотипа комплекса</label>
                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      <div className="w-20 h-20 bg-white border border-slate-250 rounded-sm overflow-hidden flex items-center justify-center relative shadow-sm shrink-0">
                        {isUploadingLogo ? (
                          <div className="flex flex-col items-center justify-center gap-1">
                            <RefreshCw size={16} className="animate-spin text-amber-600" />
                            <span className="text-[8px] font-mono text-slate-400">Загрузка...</span>
                          </div>
                        ) : localSettings.logoUrl ? (
                          <img src={localSettings.logoUrl} alt="Logo preview" referrerPolicy="no-referrer" className="object-cover w-full h-full" />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">Лого</span>
                        )}
                      </div>
                      <div className="space-y-2 w-full">
                        <div className="flex gap-2">
                          <input
                            type="file"
                            ref={mainLogoInputRef}
                            onChange={(e) => handleImageUpload(e, 'logo')}
                            accept="image/*"
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => mainLogoInputRef.current?.click()}
                            disabled={isUploadingLogo}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-[#0F172A] border border-slate-250 rounded-sm text-xs font-semibold cursor-pointer disabled:opacity-50"
                          >
                            {isUploadingLogo ? <RefreshCw size={13} className="animate-spin" /> : <FileUp size={13} />}
                            <span>{isUploadingLogo ? 'Загрузка фото...' : 'Выбрать фото'}</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Выберите прямое изображение логотипа с устройства (размер до 2MB).
                        </p>
                      </div>
                    </div>

                    {/* Live Scale Controls & Previews */}
                    {localSettings.logoUrl && (
                      <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6" id="logo-scale-controls">
                        {/* Scale Main Hero Desktop */}
                        <div className="space-y-3 bg-white p-4 border border-slate-100 rounded-lg shadow-2xs">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-600 uppercase">Главная страница (ПК)</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] sm:text-xs rounded-full font-bold">
                              {localSettings.logoScaleMain || 100}%
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-400 font-bold">20%</span>
                            <input
                              type="range"
                              min="20"
                              max="200"
                              value={localSettings.logoScaleMain || 100}
                              onChange={(e) => setLocalSettings(prev => ({ ...prev, logoScaleMain: parseInt(e.target.value, 10) }))}
                              className="flex-1 accent-[#024F33] cursor-pointer"
                            />
                            <span className="text-[10px] text-slate-400 font-bold">200%</span>
                          </div>
                          <p className="text-[10px] text-slate-400">Логотип на большом экране компьютера (Desktop).</p>
                          
                          {/* Live preview container for Hero Desktop logo */}
                          <div className="mt-2 border border-slate-200/60 bg-slate-50/50 p-4 rounded flex flex-col items-center justify-center min-h-[140px] relative">
                            <span className="absolute top-1 left-1.5 text-[8px] font-mono text-slate-400 uppercase tracking-widest">Компьютер (Desktop)</span>
                            <div 
                              className="overflow-hidden flex items-center justify-center bg-white border border-slate-150 rounded"
                              style={{
                                width: `${100 * ((localSettings.logoScaleMain || 100) / 100)}px`,
                                height: `${100 * ((localSettings.logoScaleMain || 100) / 100)}px`,
                                maxWidth: '100%',
                              }}
                            >
                              <img 
                                src={localSettings.logoUrl} 
                                alt="Hero Desktop preview" 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain" 
                              />
                            </div>
                          </div>
                        </div>

                        {/* Scale Main Hero Mobile */}
                        <div className="space-y-3 bg-white p-4 border border-slate-100 rounded-lg shadow-2xs">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-600 uppercase">Главная страница (Мобильный)</span>
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 font-mono text-[10px] sm:text-xs rounded-full font-bold">
                              {localSettings.logoScaleMainMobile ?? 75}%
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-400 font-bold">20%</span>
                            <input
                              type="range"
                              min="20"
                              max="200"
                              value={localSettings.logoScaleMainMobile ?? 75}
                              onChange={(e) => setLocalSettings(prev => ({ ...prev, logoScaleMainMobile: parseInt(e.target.value, 10) }))}
                              className="flex-1 accent-[#D97706] cursor-pointer"
                            />
                            <span className="text-[10px] text-slate-400 font-bold">200%</span>
                          </div>
                          <p className="text-[10px] text-slate-400">Логотип на мобильном телефоне (Mobile).</p>
                          
                          {/* Live preview container for Hero Mobile logo */}
                          <div className="mt-2 border border-slate-200/60 bg-slate-50/50 p-4 rounded flex flex-col items-center justify-center min-h-[140px] relative">
                            <span className="absolute top-1 left-1.5 text-[8px] font-mono text-amber-600 font-bold uppercase tracking-widest">Мобильный (Mobile)</span>
                            <div 
                              className="overflow-hidden flex items-center justify-center bg-white border border-slate-150 rounded"
                              style={{
                                width: `${100 * ((localSettings.logoScaleMainMobile ?? 75) / 100)}px`,
                                height: `${100 * ((localSettings.logoScaleMainMobile ?? 75) / 100)}px`,
                                maxWidth: '100%',
                              }}
                            >
                              <img 
                                src={localSettings.logoUrl} 
                                alt="Hero Mobile preview" 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain" 
                              />
                            </div>
                          </div>
                        </div>

                        {/* Scale Header */}
                        <div className="space-y-3 bg-white p-4 border border-slate-100 rounded-lg shadow-2xs">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-600 uppercase">Верхнее меню (Header)</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] sm:text-xs rounded-full font-bold">
                              {localSettings.logoScaleHeader || 100}%
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-400 font-bold">20%</span>
                            <input
                              type="range"
                              min="20"
                              max="200"
                              value={localSettings.logoScaleHeader || 100}
                              onChange={(e) => setLocalSettings(prev => ({ ...prev, logoScaleHeader: parseInt(e.target.value, 10) }))}
                              className="flex-1 accent-[#024F33] cursor-pointer"
                            />
                            <span className="text-[10px] text-slate-400 font-bold">200%</span>
                          </div>
                          <p className="text-[10px] text-slate-400">Логотип в верхнем меню (Header) рядом с заголовком.</p>
                          
                          {/* Live preview container for Header logo */}
                          <div className="mt-2 border border-slate-200/60 bg-slate-50/50 p-4 rounded flex flex-col items-center justify-center min-h-[140px] relative">
                            <span className="absolute top-1 left-1.5 text-[8px] font-mono text-slate-400 uppercase tracking-widest">Предпросмотр меню (Header)</span>
                            <div 
                              className="bg-white border border-slate-200 flex items-center justify-center rounded-lg overflow-hidden shrink-0"
                              style={{
                                width: `${40 * ((localSettings.logoScaleHeader || 100) / 100)}px`,
                                height: `${40 * ((localSettings.logoScaleHeader || 100) / 100)}px`,
                              }}
                            >
                              <img 
                                src={localSettings.logoUrl} 
                                alt="Header preview" 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain p-0.5" 
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 16:9 Hero Banner Image Picker Section */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-sm space-y-4" id="hero-banner-settings-box">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest">Главный баннер первой страницы (Формат 16:9)</label>
                        <p className="text-[10px] text-slate-400 mt-0.5">Загрузите изображение, которое отображается под логотипом и заголовками на главной странице в формате 16:9.</p>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 font-mono font-bold px-2.5 py-1 rounded border border-emerald-200/60 shrink-0">
                        16 : 9 Aspect Ratio
                      </span>
                    </div>

                    <div className="flex flex-col md:flex-row items-start gap-5 pt-1">
                      {/* 16:9 Image Preview Box */}
                      <div className="w-full md:w-72 aspect-[16/9] bg-white border border-slate-250 rounded-xl overflow-hidden flex items-center justify-center relative shadow-sm shrink-0 group">
                        {isUploadingHeroBanner ? (
                          <div className="flex flex-col items-center justify-center gap-1.5 p-4">
                            <RefreshCw size={20} className="animate-spin text-amber-600" />
                            <span className="text-[9px] font-mono text-slate-400">Загрузка фото...</span>
                          </div>
                        ) : localSettings.heroBannerUrl ? (
                          <>
                            <img src={localSettings.heroBannerUrl} alt="Hero Banner Preview" referrerPolicy="no-referrer" className="object-cover w-full h-full" />
                            <button
                              type="button"
                              onClick={() => setLocalSettings(prev => ({ ...prev, heroBannerUrl: '' }))}
                              className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full opacity-90 group-hover:opacity-100 transition-all shadow-md cursor-pointer"
                              title="Удалить фото"
                            >
                              <X size={13} />
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400 p-4 text-center">
                            <ImageIcon size={26} className="text-slate-300" />
                            <span className="text-[10px] font-mono font-semibold">Фото 16:9 не установлено</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 w-full flex-1">
                        <div className="flex flex-wrap gap-2 items-center">
                          <input
                            type="file"
                            ref={heroBannerInputRef}
                            onChange={(e) => handleImageUpload(e, 'hero_banner')}
                            accept="image/*"
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => heroBannerInputRef.current?.click()}
                            disabled={isUploadingHeroBanner}
                            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
                          >
                            {isUploadingHeroBanner ? <RefreshCw size={13} className="animate-spin" /> : <FileUp size={13} />}
                            <span>{isUploadingHeroBanner ? 'Загрузка фото...' : 'Выбрать фото (16:9)'}</span>
                          </button>

                          {localSettings.heroBannerUrl && (
                            <button
                              type="button"
                              onClick={() => setLocalSettings(prev => ({ ...prev, heroBannerUrl: '' }))}
                              className="flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                            >
                              <Trash2 size={13} />
                              <span>Удалить</span>
                            </button>
                          )}
                        </div>

                        {/* URL Input option */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Или введите ссылку на фото (URL):</label>
                          <input
                            type="text"
                            value={localSettings.heroBannerUrl || ''}
                            onChange={(e) => setLocalSettings(prev => ({ ...prev, heroBannerUrl: e.target.value }))}
                            placeholder="https://images.unsplash.com/..."
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-250 rounded-lg text-slate-800 focus:outline-none focus:border-[#0F172A]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Three Texts Block */}
                  <div className="space-y-4">
                    {/* Text 1: Heavy Bold */}
                    <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                          <span>Первый текст (Крупный размер / Жирный)</span>
                          <span className="text-[10px] bg-amber-150 text-[#D97706] border border-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">1-Й ЖИРНЫЙ</span>
                        </label>
                        <input
                          type="text"
                          value={localSettings.textBold}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, textBold: e.target.value }))}
                          className="w-full text-sm font-semibold px-3 py-2.5 bg-white border border-slate-250 rounded-sm text-slate-800 focus:outline-none focus:border-[#0F172A]"
                          id="input-text-bold"
                          placeholder="СОВРЕМЕННЫЙ ЖИЛОЙ КОМПЛЕКС"
                        />
                      </div>

                      {/* Toggle option to show/hide textBold */}
                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200/80">
                        <span className="text-xs font-bold text-slate-700">
                          Отображение жирного текста на главной странице (под логотипом):
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input 
                            type="checkbox" 
                            checked={localSettings.showTextBold !== false}
                            onChange={(e) => setLocalSettings(prev => ({ ...prev, showTextBold: e.target.checked }))}
                            className="sr-only peer"
                            id="toggle-show-text-bold"
                          />
                          <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#024F33]"></div>
                          <span className="ml-2 text-xs font-black text-slate-800">
                            {localSettings.showTextBold !== false ? 'ДА (Показывать)' : 'НЕТ (Скрыть)'}
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Text 2: Slightly Bold */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Второй текст (Средний размер / Менее жирный)</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded font-mono font-semibold">2-Й МЕНЕЕ ЖИРНЫЙ</span>
                      </label>
                      <input
                        type="text"
                        value={localSettings.textMedium}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, textMedium: e.target.value }))}
                        className="w-full text-sm px-3 py-2.5 bg-white border border-slate-250 rounded-sm text-slate-800 focus:outline-none focus:border-[#0F172A]"
                        id="input-text-medium"
                        placeholder="Открытие лучших квартир"
                      />
                    </div>

                    {/* Text 3 is removed because it is no longer needed */}
                  </div>

                  {/* Submit Block */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                    <p className="text-[11px] text-slate-400 leading-normal flex items-center gap-1.5 font-mono">
                      <Info size={12} className="text-slate-400 shrink-0" />
                      Сохранение в базу данных Supabase и локальный кэш происходит автоматически.
                    </p>
                    <button
                      onClick={handleSaveGeneralSettings}
                      disabled={isSaving}
                      className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#D97706] hover:bg-[#B45309] text-white font-bold rounded-sm text-xs cursor-pointer disabled:opacity-50 transition-colors uppercase tracking-wider"
                      id="save-brand-btn"
                    >
                      {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                      <span>Сохранить</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB POSITIONING & BRAND COLORS */}
              {activeTab === 'positioning' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Palette size={20} className="text-[#D97706]" />
                        <h3 className="text-md sm:text-lg font-bold text-[#0F172A] tracking-tight">
                          Позиционирование и бренд-цвета компании
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Укажите 3 цвета для полной настройки дизайна сайта. Эти 3 цвета используются во всех кнопках, фонах, ценах и разделах сайта.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveGeneralSettings}
                      disabled={isSaving}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-5 bg-[#024F33] hover:bg-[#013522] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition-all uppercase tracking-wider shadow-sm cursor-pointer shrink-0"
                      id="save-positioning-colors-btn"
                    >
                      {isSaving ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />}
                      <span>Сохранить</span>
                    </button>
                  </div>

                  {/* Presets Grid */}
                  <div className="bg-slate-50 border border-slate-200/80 p-4 sm:p-5 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <span>Готовые палитры позиционирования (Готовые пресеты)</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">Нажмите для выбора</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        {
                          name: 'Премиум Мушакӣ (Gold & Dark)',
                          primary: '#0F172A',
                          secondary: '#D97706',
                          accent: '#059669',
                          desc: 'Классика и роскошь'
                        },
                        {
                          name: 'Корпоративный Синий (Royal Navy)',
                          primary: '#1E3A8A',
                          secondary: '#2563EB',
                          accent: '#10B981',
                          desc: 'Надёжный и современный'
                        },
                        {
                          name: 'Современный Эко-Стиль (Emerald)',
                          primary: '#064E3B',
                          secondary: '#059669',
                          accent: '#D97706',
                          desc: 'Природа и комфорт'
                        },
                        {
                          name: 'Строгий Минимализм (Monochrome)',
                          primary: '#111827',
                          secondary: '#475569',
                          accent: '#2563EB',
                          desc: 'Строгий и сдержанный'
                        },
                        {
                          name: 'Престиж Рубин (Executive Wine)',
                          primary: '#881337',
                          secondary: '#E11D48',
                          accent: '#D97706',
                          desc: 'Яркий и привлекательный'
                        },
                        {
                          name: 'Сарвати Зарин (Luxury Amber)',
                          primary: '#18181B',
                          secondary: '#B45309',
                          accent: '#0D9488',
                          desc: 'Высокий премиум'
                        }
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setLocalSettings(prev => ({
                              ...prev,
                              primaryColor: preset.primary,
                              secondaryColor: preset.secondary,
                              accentColor: preset.accent
                            }));
                          }}
                          className="p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-left transition-all shadow-2xs hover:shadow-xs group cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-800 truncate">{preset.name}</span>
                            <span className="text-[9px] text-slate-400">{preset.desc}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-5 rounded-sm shadow-2xs flex items-center justify-center text-[9px] font-mono font-bold text-white" style={{ backgroundColor: preset.primary }}>
                              Ц1
                            </div>
                            <div className="flex-1 h-5 rounded-sm shadow-2xs flex items-center justify-center text-[9px] font-mono font-bold text-white" style={{ backgroundColor: preset.secondary }}>
                              Ц2
                            </div>
                            <div className="flex-1 h-5 rounded-sm shadow-2xs flex items-center justify-center text-[9px] font-mono font-bold text-white" style={{ backgroundColor: preset.accent }}>
                              Ц3
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Editors (4 Colors) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Color 1 */}
                    <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">Цвет 1: Основной</label>
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">{localSettings.primaryColor || '#0F172A'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={localSettings.primaryColor || '#0F172A'}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="w-12 h-12 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shadow-2xs"
                        />
                        <input
                          type="text"
                          value={localSettings.primaryColor || '#0F172A'}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                          placeholder="#0F172A"
                          className="flex-1 px-3 py-2 text-xs font-mono font-bold text-slate-800 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Основной цвет заголовков, шапки (header), основных кнопок и тёмных фонов.
                      </p>
                    </div>

                    {/* Color 2 */}
                    <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">Цвет 2: Вторичный</label>
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">{localSettings.secondaryColor || '#D97706'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={localSettings.secondaryColor || '#D97706'}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          className="w-12 h-12 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shadow-2xs"
                        />
                        <input
                          type="text"
                          value={localSettings.secondaryColor || '#D97706'}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          placeholder="#D97706"
                          className="flex-1 px-3 py-2 text-xs font-mono font-bold text-slate-800 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Цвет кнопок звонка, цен квартир, шахматки и важных акцентов.
                      </p>
                    </div>

                    {/* Color 3 */}
                    <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">Цвет 3: Доп. (Акцент)</label>
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">{localSettings.accentColor || '#059669'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={localSettings.accentColor || '#059669'}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                          className="w-12 h-12 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shadow-2xs"
                        />
                        <input
                          type="text"
                          value={localSettings.accentColor || '#059669'}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                          placeholder="#059669"
                          className="flex-1 px-3 py-2 text-xs font-mono font-bold text-slate-800 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Цвет свободных статусов, отличительных элементов и быстрого вызова.
                      </p>
                    </div>
                    
                    {/* Background Color */}
                    <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">Цвет фона (Background)</label>
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">{localSettings.backgroundColor || '#FFFFFF'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={localSettings.backgroundColor || '#FFFFFF'}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                          className="w-12 h-12 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shadow-2xs"
                        />
                        <input
                          type="text"
                          value={localSettings.backgroundColor || '#FFFFFF'}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                          placeholder="#FFFFFF"
                          className="flex-1 px-3 py-2 text-xs font-mono font-bold text-slate-800 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Общий цвет фона сайта. 
                      </p>
                    </div>
                  </div>

                  {/* Live Preview Section */}
                  <div className="p-5 bg-white border border-slate-250 rounded-lg space-y-4 shadow-2xs">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Живой предпросмотр дизайна (Live Preview)</h4>
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-6">
                      
                      {/* Sample Header / Banner */}
                      <div 
                        className="p-4 rounded-lg text-white flex items-center justify-between shadow-sm"
                        style={{ backgroundColor: localSettings.primaryColor || '#0F172A' }}
                      >
                        <span className="text-xs font-bold uppercase tracking-wider">Пример шапки (Цвет 1)</span>
                        <span 
                          className="px-3 py-1 text-[10px] font-bold rounded-full text-white"
                          style={{ backgroundColor: localSettings.secondaryColor || '#D97706' }}
                        >
                          Цвет 2 (Акцент)
                        </span>
                      </div>

                      {/* Sample Buttons & Badges */}
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          className="px-4 py-2 text-xs font-bold text-white rounded-lg shadow-2xs"
                          style={{ backgroundColor: localSettings.primaryColor || '#0F172A' }}
                        >
                          Основная кнопка (Цвет 1)
                        </button>
                        
                        <button
                          type="button"
                          className="px-4 py-2 text-xs font-bold text-white rounded-lg shadow-2xs"
                          style={{ backgroundColor: localSettings.secondaryColor || '#D97706' }}
                        >
                          Акцентная кнопка (Цвет 2)
                        </button>

                        <button
                          type="button"
                          className="px-4 py-2 text-xs font-bold text-white rounded-lg shadow-2xs"
                          style={{ backgroundColor: localSettings.accentColor || '#059669' }}
                        >
                          Заявка / Звонок (Цвет 3)
                        </button>

                        <span 
                          className="px-2.5 py-1 text-[10px] font-bold rounded-md border"
                          style={{ 
                            backgroundColor: `${localSettings.secondaryColor || '#D97706'}15`, 
                            color: localSettings.secondaryColor || '#D97706',
                            borderColor: `${localSettings.secondaryColor || '#D97706'}40`
                          }}
                        >
                          $680/м² (Цвет 2)
                        </span>

                        <span 
                          className="px-2.5 py-1 text-[10px] font-bold rounded-md border"
                          style={{ 
                            backgroundColor: `${localSettings.accentColor || '#059669'}15`, 
                            color: localSettings.accentColor || '#059669',
                            borderColor: `${localSettings.accentColor || '#059669'}40`
                          }}
                        >
                          Свободно (Цвет 3)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Save Footer */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                    <p className="text-[11px] text-slate-400 leading-normal flex items-center gap-1.5 font-mono">
                      <Info size={12} className="text-slate-400 shrink-0" />
                      Сохранение автоматически применяется ко всему сайту.
                    </p>
                    <button
                      type="button"
                      onClick={handleSaveGeneralSettings}
                      disabled={isSaving}
                      className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#D97706] hover:bg-[#B45309] text-white font-bold rounded-sm text-xs cursor-pointer disabled:opacity-50 transition-colors uppercase tracking-wider"
                      id="save-positioning-bottom-btn"
                    >
                      {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                      <span>Сохранить</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: DETAILED PROJECT DESCRIPTION BLOCK */}
              {activeTab === 'desc' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-md sm:text-lg font-bold text-[#0F172A] tracking-tight">Описание проекта</h3>
                      <p className="text-xs text-slate-400 mt-1">Основной раздел описания строительного комплекса.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveGeneralSettings}
                      disabled={isSaving}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#024F33] hover:bg-[#013522] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition-all uppercase tracking-wider shadow-sm cursor-pointer shrink-0"
                      id="save-desc-header-btn"
                    >
                      {isSaving ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />}
                      <span>Сохранить</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Текст подробного описания</label>
                    <textarea
                      value={localSettings.projectDescription}
                      rows={8}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, projectDescription: e.target.value }))}
                      className="w-full text-sm leading-relaxed px-4 py-3 bg-white border border-slate-250 rounded-sm text-slate-800 focus:outline-none focus:border-[#0F172A]"
                      id="input-project-desc"
                      placeholder="Подробное описание строительного объекта..."
                    />
                  </div>

                  {/* Submit Action */}
                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={handleSaveGeneralSettings}
                      disabled={isSaving}
                      className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#D97706] hover:bg-[#B45309] text-white font-bold rounded-sm text-xs cursor-pointer transition-colors uppercase tracking-wider"
                      id="save-desc-btn"
                    >
                      {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                      <span>Сохранить</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: CONTACTS & KEY DETAILS */}
              {activeTab === 'contacts' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-md sm:text-lg font-bold text-[#0F172A] tracking-tight">Телефон и адрес</h3>
                      <p className="text-xs text-slate-400 mt-1">Настройка географического адреса и контактного номера телефона.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveGeneralSettings}
                      disabled={isSaving}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#024F33] hover:bg-[#013522] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition-all uppercase tracking-wider shadow-sm cursor-pointer shrink-0"
                      id="save-contacts-header-btn"
                    >
                      {isSaving ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />}
                      <span>Сохранить</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">📍 Адрес комплекса</label>
                      <input
                        type="text"
                        value={localSettings.projectAddress}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, projectAddress: e.target.value }))}
                        className="w-full text-sm px-3 py-2.5 bg-white border border-slate-250 rounded-sm text-slate-800 focus:outline-none focus:border-[#0F172A]"
                        id="input-project-addr"
                        placeholder="ул. Н. Карабаева №2"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">📞 Контактный телефон</label>
                      <input
                        type="text"
                        value={localSettings.projectPhone}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, projectPhone: e.target.value }))}
                        className="w-full text-sm font-semibold px-3 py-2.5 bg-white border border-slate-250 rounded-sm text-slate-800 focus:outline-none focus:border-[#0F172A]"
                        id="input-project-phone"
                        placeholder="+992 307 33 77 77"
                      />
                    </div>
                  </div>

                  {/* Submit Action */}
                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={handleSaveGeneralSettings}
                      disabled={isSaving}
                      className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#D97706] hover:bg-[#B45309] text-white font-bold rounded-sm text-xs cursor-pointer transition-colors uppercase tracking-wider"
                      id="save-contacts-btn"
                    >
                      {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                      <span>Сохранить</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: GOOGLE MAPS SETTINGS */}
              {activeTab === 'map' && (
                <div className="space-y-6" id="admin-map-tab">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-md sm:text-lg font-bold text-[#0F172A] tracking-tight">Настройка карты Google Maps и местоположения</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Найдите и укажите расположение строительного комплекса прямо на карте. Главная страница сайта автоматически отобразит это место.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveGeneralSettings}
                      disabled={isSaving}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#024F33] hover:bg-[#013522] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition-all uppercase tracking-wider shadow-sm cursor-pointer shrink-0"
                      id="save-map-header-btn"
                    >
                      {isSaving ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />}
                      <span>Сохранить</span>
                    </button>
                  </div>

                  {/* Nominatim Search Bar */}
                  <form onSubmit={handleMapSearch} className="space-y-2 relative">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Поиск местоположения по названию и адресу</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Например: ул. Н. Карабаева, Душанбе..."
                          className="w-full text-sm pl-9 pr-3 py-2.5 bg-white border border-slate-250 rounded-sm text-slate-800 focus:outline-none focus:border-[#0F172A]"
                        />
                        <Search size={14} className="text-slate-400 absolute left-3 top-3.5" />
                      </div>
                      <button
                        type="submit"
                        disabled={isSearchingMap}
                        className="px-4 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isSearchingMap ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
                        <span>Поиск</span>
                      </button>
                    </div>

                    {/* Dropdown with results */}
                    {mapSearchResults.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-50 max-h-56 overflow-y-auto divide-y divide-slate-100 font-sans">
                        {mapSearchResults.map((place, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectPlace(place)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 text-xs sm:text-sm text-slate-700 flex items-start gap-2.5 cursor-pointer"
                          >
                            <MapPin size={15} className="text-amber-600 shrink-0 mt-0.5" />
                            <span>{place.display_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </form>

                  {/* Interactive Map Selector & Coordinates Dashboard */}
                  <div className="space-y-4 pt-2">
                    {/* Live Interactive Leaflet Map for Pinpointing & Satellite Layer */}
                    <div className="w-full space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                          КАРТА ВЫБОРА ТЕКУЩЕГО МЕСТОПОЛОЖЕНИЯ (СПУТНИК / ОНЛАЙН)
                        </label>
                        
                        {/* Map Mode Layer Selector with Instant Settings Link Synchronization */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-sm border border-slate-200">
                          <button
                            type="button"
                            onClick={() => {
                              setMapMode('streets');
                              const newUrl = generateEmbedUrl(selectedLat, selectedLng, 'streets', mapZoom);
                              setLocalSettings(prev => ({ ...prev, mapIframeUrl: newUrl }));
                            }}
                            className={`px-3 py-1 text-[10px] font-bold rounded-xs transition-all flex items-center gap-1 cursor-pointer ${
                              mapMode === 'streets'
                                ? 'bg-white text-[#0F172A] shadow-xs border border-slate-200/50'
                                : 'text-slate-500 hover:text-[#0F172A]'
                            }`}
                          >
                            🗺️ Карта / Схема
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMapMode('satellite');
                              const newUrl = generateEmbedUrl(selectedLat, selectedLng, 'satellite', mapZoom);
                              setLocalSettings(prev => ({ ...prev, mapIframeUrl: newUrl }));
                            }}
                            className={`px-3 py-1 text-[10px] font-bold rounded-xs transition-all flex items-center gap-1 cursor-pointer ${
                              mapMode === 'satellite'
                                ? 'bg-[#0F172A] text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            🛰️ Спутник / Фото
                          </button>
                        </div>
                      </div>

                      <div className="border border-slate-250 rounded-sm overflow-hidden bg-slate-50 shadow-sm relative">
                        {/* Leaflet interactive map div */}
                        <div 
                          id="admin-leaflet-map" 
                          style={{ height: '480px', width: '100%', minHeight: '480px' }} 
                          className="z-10 focus:outline-none" 
                        />

                        {/* Interactive Guidance overlay banner */}
                        <div className="absolute top-2 left-12 z-20 bg-white/95 backdrop-blur-sm text-[#0F172A] px-2.5 py-1.5 rounded-sm shadow-md text-[10px] font-medium border border-slate-200 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                          <span>Нажмите на любую точку карты или перетащите маркер, чтобы выбрать точное местоположение.</span>
                        </div>

                        {/* Coordinate status bar footer overlay */}
                        <div className="bg-[#0F172A] text-slate-350 px-4 py-3 text-[11px] font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800 relative z-20">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>Координаты выбранного местоположения:</span>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                            <span>Широта (Lat): <strong className="text-white font-mono">{selectedLat.toFixed(7)}</strong></span>
                            <span>Долгота (Lng): <strong className="text-white font-mono">{selectedLng.toFixed(7)}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Google Maps Zoom Level Controller */}
                      <div className="bg-slate-50 border border-slate-200 rounded-sm p-4 mt-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <div>
                            <span className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                              🔍 МАСШТАБ ОТОБРАЖЕНИЯ КАРТЫ (GOOGLE MAPS ZOOM)
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5 block leading-relaxed">
                              Укажите масштаб отображения карты для клиентов на главной странице (больший масштаб показывает объект ближе и подробнее).
                            </span>
                          </div>
                          <span className="bg-[#D97706]/10 text-[#D97706] text-xs font-bold px-3 py-1 rounded-sm border border-[#D97706]/20 font-mono whitespace-nowrap">
                            Масштаб: z{mapZoom} ({mapZoom >= 19 ? 'Максимальный / Точный' : mapZoom >= 17 ? 'Близко' : mapZoom >= 15 ? 'Средний' : 'Далеко'})
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-[10px] text-slate-400 select-none font-bold uppercase tracking-wide">🏖️ Далеко</span>
                          <input
                            type="range"
                            min="12"
                            max="21"
                            value={mapZoom}
                            onChange={(e) => {
                              const newZoom = parseInt(e.target.value);
                              setMapZoom(newZoom);
                              const newUrl = generateEmbedUrl(selectedLat, selectedLng, mapMode, newZoom);
                              setLocalSettings(prev => ({ ...prev, mapIframeUrl: newUrl }));
                            }}
                            className="flex-grow accent-[#D97706] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                          />
                          <span className="text-[10px] text-slate-400 select-none font-bold uppercase tracking-wide">🔎 Максимальный масштаб</span>
                        </div>

                        {/* Quick preset buttons */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                          {[
                            { label: '🏢 Город (z14)', value: 14 },
                            { label: '🏘️ Район (z16)', value: 16 },
                            { label: '📍 Точно (z19)', value: 19 },
                            { label: '🔍 Максимальный (z21)', value: 21 }
                          ].map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setMapZoom(preset.value);
                                const newUrl = generateEmbedUrl(selectedLat, selectedLng, mapMode, preset.value);
                                setLocalSettings(prev => ({ ...prev, mapIframeUrl: newUrl }));
                              }}
                              className={`py-1.5 px-2 rounded-xs text-[10px] font-bold border transition-all cursor-pointer ${
                                mapZoom === preset.value
                                  ? 'bg-[#0F172A] border-[#0F172A] text-white shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Action */}
                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={handleSaveGeneralSettings}
                      disabled={isSaving}
                      className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#D97706] hover:bg-[#B45309] text-white font-bold rounded-sm text-xs cursor-pointer transition-colors uppercase tracking-wider"
                      id="save-map-btn"
                    >
                      {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                      <span>Сохранить</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: REGISTERED PROJECT DOCUMENTS MANAGER */}
              {activeTab === 'docs' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-md sm:text-lg font-bold text-[#0F172A] tracking-tight">Список документов проекта</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Загружайте фотографии, планировки или документы (до 10 фото в один документ) и настраивайте их отображение на сайте.
                    </p>
                  </div>

                  {/* Add document Section Form */}
                  <form onSubmit={handleAddNewDocumentSubmit} className="p-5 bg-slate-50 border border-slate-200 rounded-sm space-y-4">
                    <span className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider font-mono">Добавление нового документа</span>
                    
                    {newDocError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded flex items-center gap-2 font-medium">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{newDocError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Title */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Заголовок документа</label>
                        <input
                          type="text"
                          value={newDocTitle}
                          onChange={(e) => {
                            setNewDocTitle(e.target.value);
                            setNewDocError('');
                          }}
                          className="w-full text-sm px-3 py-2.5 bg-white border border-slate-250 rounded-sm text-slate-800 focus:outline-none focus:border-[#0F172A]"
                          placeholder="Например: План 1-го этажа"
                          id="new-doc-title-input"
                        />
                      </div>

                      {/* Image selector */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                          <span>Загрузка фото (то 10 сурат)</span>
                          <span className="text-[10px] font-mono text-amber-700 font-bold">{newDocImages.length}/10</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="file"
                            ref={newDocInputRef}
                            onChange={(e) => handleDocImagesUpload(e, 'new')}
                            accept="image/*"
                            multiple
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => newDocInputRef.current?.click()}
                            disabled={isUploadingNewDoc || newDocImages.length >= 10}
                            className="w-full flex items-center justify-between gap-1.5 px-3 py-2.5 bg-white hover:bg-slate-50 text-[#0F172A] border border-slate-250 rounded-sm text-xs font-semibold cursor-pointer text-left disabled:opacity-50"
                            id="new-doc-file-btn"
                          >
                            <span className="text-slate-500 truncate">
                              {isUploadingNewDoc
                                ? 'Загрузка фото...'
                                : newDocImages.length >= 10
                                ? 'Максимум (10/10) расид'
                                : newDocImages.length > 0
                                ? `Боргирӣ шуд: ${newDocImages.length} сурат (Илова кардан...)`
                                : 'Интихоби суратҳо (то 10 шт)'}
                            </span>
                            {isUploadingNewDoc ? (
                              <RefreshCw size={14} className="animate-spin text-amber-600 shrink-0" />
                            ) : (
                              <FileUp size={14} className="text-slate-400 shrink-0" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Previews Grid (up to 10 photos) */}
                    {newDocImages.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">
                          Суратҳои интихобшуда ({newDocImages.length}/10):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {newDocImages.map((imgUrl, idx) => (
                            <div key={idx} className="relative w-20 h-20 bg-white border border-slate-250 rounded-sm overflow-hidden group shadow-2xs">
                              <img src={imgUrl} alt={`New Doc ${idx + 1}`} className="w-full h-full object-cover" />
                              <span className="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-mono font-bold px-1 rounded">
                                #{idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => setNewDocImages(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold cursor-pointer"
                              >
                                Удалить
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Toggle Switch active & submit button */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-200/40">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 font-semibold">
                        <input
                          type="checkbox"
                          checked={newDocActive}
                          onChange={(e) => setNewDocActive(e.target.checked)}
                          className="rounded text-[#D97706] border-slate-300 focus:ring-[#D97706] h-4 w-4 cursor-pointer"
                          id="new-doc-is-active-check"
                        />
                        <span>Активен (Отображать на главной странице)</span>
                      </label>

                      <button
                        type="submit"
                        disabled={isAddingDoc || isUploadingNewDoc}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold rounded-sm text-xs cursor-pointer transition-colors uppercase tracking-wider disabled:opacity-50"
                        id="add-document-btn"
                      >
                        {isAddingDoc ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={14} />}
                        <span>Добавить</span>
                      </button>
                    </div>
                  </form>

                  {/* List of current Documents */}
                  <div className="space-y-4 pt-2">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">ТЕКУЩИЕ АКТИВНЫЕ ДОКУМЕНТЫ</span>
                    
                    {documents.length === 0 ? (
                      <div className="py-12 border border-dashed border-slate-200 rounded-sm text-center text-slate-400 text-xs font-mono">
                        Документы не найдены
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {documents.map((doc) => {
                          const isEditingState = editingDocId === doc.id;
                          const docImgs = doc.images && doc.images.length > 0 ? doc.images : (doc.imageUrl ? [doc.imageUrl] : []);

                          return (
                            <div
                              key={doc.id}
                              className={`p-4 rounded-sm border transition-all flex flex-col justify-between gap-4 ${
                                doc.isActive 
                                  ? 'bg-white border-slate-250 shadow-xs' 
                                  : 'bg-slate-50 border-slate-200 opacity-75'
                              }`}
                              id={`doc-card-${doc.id}`}
                            >
                              {isEditingState ? (
                                <div className="space-y-3 w-full">
                                  <div className="space-y-1">
                                    <label className="text-[10px] text-slate-400 uppercase font-bold font-mono">Навсозии номи Файл</label>
                                    <input
                                      type="text"
                                      value={editingDocTitle}
                                      onChange={(e) => setEditingDocTitle(e.target.value)}
                                      className="w-full text-xs px-2.5 py-2 bg-white border border-slate-250 rounded text-slate-800"
                                    />
                                  </div>

                                  {/* Edit images grid */}
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[10px] text-slate-400 uppercase font-bold font-mono">Суратҳои документ ({editingDocImages.length}/10)</label>
                                      <input
                                        type="file"
                                        ref={editDocInputRef}
                                        onChange={(e) => handleDocImagesUpload(e, 'edit')}
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => editDocInputRef.current?.click()}
                                        disabled={isUploadingEditDoc || editingDocImages.length >= 10}
                                        className="px-2 py-1 bg-white hover:bg-slate-50 text-[10px] text-slate-700 border border-slate-250 rounded cursor-pointer disabled:opacity-50 flex items-center gap-1 font-bold"
                                      >
                                        {isUploadingEditDoc && <RefreshCw size={10} className="animate-spin text-amber-600" />}
                                        <span>+ Иловаи сурат</span>
                                      </button>
                                    </div>

                                    {editingDocImages.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 pt-1">
                                        {editingDocImages.map((img, idx) => (
                                          <div key={idx} className="relative w-14 h-14 bg-white border border-slate-200 rounded overflow-hidden group">
                                            <img src={img} alt={`Edit ${idx}`} className="w-full h-full object-cover" />
                                            <span className="absolute top-0.5 left-0.5 bg-black/70 text-white text-[8px] font-mono px-1 rounded">#{idx+1}</span>
                                            <button
                                              type="button"
                                              onClick={() => setEditingDocImages(prev => prev.filter((_, i) => i !== idx))}
                                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold cursor-pointer"
                                            >
                                              Удалить
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex gap-2 justify-end pt-1">
                                    <button
                                      type="button"
                                      onClick={cancelEditingDoc}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[11px] cursor-pointer font-medium"
                                    >
                                      Отмена
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => saveEditedDoc(doc.id)}
                                      className="px-3 py-1 bg-[#D97706] text-white font-bold rounded text-[11px] cursor-pointer"
                                    >
                                      Готово
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-3">
                                  <div className="relative w-16 h-16 bg-slate-100 border border-slate-200 rounded-sm overflow-hidden shrink-0">
                                    {docImgs.length > 0 ? (
                                      <>
                                        <img src={docImgs[0]} alt={doc.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                        {docImgs.length > 1 && (
                                          <span className="absolute bottom-0 right-0 bg-black/75 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-tl">
                                            +{docImgs.length - 1}
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px] font-mono">Нет фото</div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <h4 className="text-xs font-bold text-[#0F172A] truncate">{doc.title}</h4>
                                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                        doc.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'
                                      }`}>
                                        <span className={`w-1 h-1 rounded-full ${doc.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                        {doc.isActive ? 'АКТИВЕН НА САЙТЕ' : 'ОТКЛЮЧЕН'}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-mono font-semibold">
                                        📷 {docImgs.length} сурат
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Controls Actions list */}
                              {!isEditingState && (
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                                  <button
                                    onClick={() => toggleDocStatus(doc.id, doc.isActive)}
                                    className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider cursor-pointer py-1 px-2 rounded transition-colors ${
                                      doc.isActive 
                                        ? 'text-[#D97706] hover:bg-amber-50' 
                                        : 'text-slate-400 hover:text-[#0F172A] hover:bg-slate-100'
                                    }`}
                                    title="Показать или отключить документ"
                                  >
                                    {doc.isActive ? <Eye size={12} /> : <EyeOff size={11} />}
                                    <span>{doc.isActive ? 'Временно отключить' : 'Активировать'}</span>
                                  </button>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => startEditingDoc(doc)}
                                      className="p-1 px-2 text-slate-500 hover:text-[#0F172A] hover:bg-slate-100 rounded text-[11px] font-semibold flex items-center gap-0.5 cursor-pointer transition-colors"
                                      id={`edit-doc-btn-${doc.id}`}
                                    >
                                      <Edit2 size={11} />
                                      <span>Редактировать</span>
                                    </button>

                                    <button
                                      onClick={() => handleDeleteDocument(doc.id)}
                                      className="p-1 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded text-[11px] font-semibold flex items-center gap-0.5 cursor-pointer transition-colors"
                                      id={`delete-doc-btn-${doc.id}`}
                                    >
                                      <Trash2 size={11} />
                                      <span>Нест КАРДАН</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: GALLERY IMAGES RELATION SYSTEM */}
              {activeTab === 'gallery' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-md sm:text-lg font-bold text-[#0F172A] tracking-tight">Галерея фотографий объекта</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Вы можете добавить до 10 фотографий, изменять их порядок или удалять.
                      </p>
                    </div>
                    {/* Compact save button at the top header */}
                    <button
                      onClick={handleSaveGeneralSettings}
                      disabled={isSaving}
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#024F33] hover:bg-[#013522] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition-all uppercase tracking-wider shadow-sm cursor-pointer shrink-0"
                      id="save-gallery-top-btn"
                    >
                      {isSaving ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />}
                      <span>Сохранить</span>
                    </button>
                  </div>

                  {saveSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-sm flex items-center gap-2"
                      id="gallery-success-toast"
                    >
                      <CheckCircle size={15} />
                      <span>Галерея успешно сохранена и обновлена на сайте!</span>
                    </motion.div>
                  )}

                  {/* Add Image Box */}
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-sm space-y-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <ImageIcon size={14} />
                      <span>Добавить новую фотографию (максимум 10)</span>
                    </h4>

                    {(localSettings.gallery || []).length >= 10 ? (
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-sm text-xs text-amber-800 flex items-center gap-2 font-medium">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>Вы уже достигли лимита в 10 фотографий. Чтобы добавить новую, удалите одну из предыдущих.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Option A: Upload local image */}
                        <div className="flex flex-col gap-2">
                          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Загрузить с компьютера</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            ref={galleryInputRef}
                            className="hidden"
                            onChange={handleGalleryFileUpload}
                          />
                          <button
                            type="button"
                            onClick={() => galleryInputRef.current?.click()}
                            disabled={isUploadingGallery}
                            className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-[#D97706] bg-white rounded-md p-6 transition-all hover:bg-amber-50/20 group cursor-pointer text-center select-none"
                            id="gallery-file-upload-trigger"
                          >
                            {isUploadingGallery ? (
                              <RefreshCw size={24} className="text-[#D97706] animate-spin mb-2" />
                            ) : (
                              <FileUp size={24} className="text-slate-400 group-hover:text-[#D97706] mb-2 transition-colors" />
                            )}
                            <span className="text-xs font-bold text-slate-600 group-hover:text-[#0f172a] transition-colors uppercase tracking-wider">
                              Нажмите здесь
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1">Фотографии PNG, JPG до 10MB</span>
                          </button>
                        </div>

                        {/* Option B: Add URL */}
                        <div className="flex flex-col gap-2 justify-between">
                          <div className="space-y-2">
                            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Или введите интернет-ссылку на фото (URL)</span>
                            <input
                              type="text"
                              value={galleryUrlInput}
                              onChange={(e) => setGalleryUrlInput(e.target.value)}
                              placeholder="Например: https://images.unsplash.com/photo-..."
                              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-[#D97706] text-xs font-mono"
                              id="gallery-url-input-field"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleAddGalleryUrl}
                            className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold py-2 px-4 rounded-md text-xs uppercase tracking-wider cursor-pointer font-sans"
                            id="add-gallery-url-btn"
                          >
                            + Добавить в галерею
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Existing Images Re-ordering and deletion management */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Текущие фотографии в галерее ({(localSettings.gallery || []).length})
                    </h4>

                    {!(localSettings.gallery && localSettings.gallery.length > 0) ? (
                      <div className="py-12 border border-dashed border-slate-200 rounded-md text-center text-slate-400 text-xs">
                        В галерее нет фотографий. Пожалуйста, добавьте фото!
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2.5" id="admin-gallery-list">
                        {(localSettings.gallery || []).map((img, idx) => {
                          const isFirst = idx === 0;
                          const isLast = idx === (localSettings.gallery || []).length - 1;

                          return (
                            <div
                              key={img.id}
                              className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-sm hover:border-slate-300 transition-colors shadow-2xs"
                              id={`gallery-item-${img.id}`}
                            >
                              <div className="flex items-center gap-4 min-w-0">
                                {/* Number Indicator */}
                                <div className="text-xs font-bold text-slate-400 font-mono w-5">
                                  #{idx + 1}
                                </div>
                                {/* Image Preview Thumbnail */}
                                <div className="w-16 h-12 bg-slate-100 rounded border border-slate-200/60 overflow-hidden shrink-0">
                                  <img
                                    src={img.imageUrl}
                                    alt={`Сурати #${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                {/* URL text */}
                                <div className="min-w-0">
                                  <p className="text-[10px] font-mono text-slate-400 truncate max-w-[280px] sm:max-w-[400px]">
                                    {img.imageUrl}
                                  </p>
                                </div>
                              </div>

                              {/* Controls */}
                              <div className="flex items-center gap-1.5">
                                {/* Up */}
                                <button
                                  type="button"
                                  disabled={isFirst}
                                  onClick={() => handleMoveGalleryImg(idx, 'up')}
                                  className={`p-1.5 rounded transition-colors ${
                                    isFirst 
                                      ? 'text-slate-300 bg-slate-50 cursor-not-allowed' 
                                      : 'text-slate-600 hover:text-white bg-slate-100 hover:bg-[#D97706] cursor-pointer'
                                  }`}
                                  title="Ба боло бурдан"
                                  id={`gallery-up-${img.id}`}
                                >
                                  <ChevronUp size={14} />
                                </button>
                                {/* Down */}
                                <button
                                  type="button"
                                  disabled={isLast}
                                  onClick={() => handleMoveGalleryImg(idx, 'down')}
                                  className={`p-1.5 rounded transition-colors ${
                                    isLast 
                                      ? 'text-slate-300 bg-slate-50 cursor-not-allowed' 
                                      : 'text-slate-600 hover:text-white bg-slate-100 hover:bg-[#D97706] cursor-pointer'
                                  }`}
                                  title="Ба поён бурдан"
                                  id={`gallery-down-${img.id}`}
                                >
                                  <ChevronDown size={14} />
                                </button>
                                {/* Trash delete */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteGalleryImg(img.id)}
                                  className="p-1.5 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded transition-colors cursor-pointer ml-2"
                                  title="Нест кардан"
                                  id={`gallery-delete-${img.id}`}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Main Save Action Bar */}
                  <div className="pt-4 border-t border-slate-100 mt-4 flex justify-end">
                    <button
                      onClick={handleSaveGeneralSettings}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-5 py-3 bg-[#0F172A] hover:bg-[#1E293B] disabled:bg-slate-300 text-white font-bold text-xs rounded-sm transition-all cursor-pointer uppercase tracking-wider shadow"
                      id="save-gallery-bottom-btn"
                    >
                      {isSaving ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />}
                      <span>Сохранить</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: RECOMMENDATIONS SECTION */}
              {activeTab === 'recommendations' && (
                <div className="space-y-6" id="recommendations-workspace">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-md sm:text-lg font-bold text-[#0F172A] tracking-tight">Рекомендации (Преимущества и Материалы)</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Добавьте информацию о преимуществах, технологиях или материалах, используемых в строительстве.
                      </p>
                    </div>
                    {/* Header Action buttons */}
                    <div className="flex items-center gap-2">
                      {!editingRecommendation && !isAddingRecommendation && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRecommendation({
                              title: '',
                              description: '',
                              imageUrl: '',
                              imagePosition: 'left',
                              isTransparentBg: false,
                              zoom: 1,
                              offsetX: 0,
                              offsetY: 0
                            });
                            setIsAddingRecommendation(true);
                          }}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#D97706] hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all uppercase tracking-wider shadow-sm cursor-pointer"
                          id="add-recommendation-top-btn"
                        >
                          <Plus size={13} />
                          <span>Добавить</span>
                        </button>
                      )}
                      <button
                        onClick={handleSaveGeneralSettings}
                        disabled={isSaving}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#024F33] hover:bg-[#013522] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition-all uppercase tracking-wider shadow-sm cursor-pointer"
                        id="save-recs-top-btn"
                      >
                        {isSaving ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />}
                        <span>Сохранить</span>
                      </button>
                    </div>
                  </div>

                  {/* FORM EDITOR STATE (ADD OR EDIT MODE) */}
                  {(isAddingRecommendation || editingRecommendation?.id) && editingRecommendation && (
                    <div className="p-5 sm:p-6 bg-slate-50 border border-slate-200/80 rounded-xl space-y-6 shadow-xs animate-in fade-in-50 duration-200" id="recommendation-form-editor">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                          {editingRecommendation.id ? 'Таҳрири карточка (Редактировать)' : 'Иловаи карточкаи нав (Добавить)'}
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRecommendation(null);
                            setIsAddingRecommendation(false);
                          }}
                          className="text-xs text-[#D97706] hover:text-amber-800 font-extrabold uppercase"
                        >
                          Бекор кардан
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* LEFT COLUMN: Inputs */}
                        <div className="lg:col-span-7 space-y-4">
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Заголовок (Название выделяется жирным) <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              value={editingRecommendation.title || ''}
                              onChange={e => setEditingRecommendation((prev: any) => ({ ...prev, title: e.target.value }))}
                              placeholder="Например: Цемент марки М-500"
                              className="w-full px-4 py-2.5 border border-slate-250 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/20 bg-white"
                              id="rec-input-title"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Описание</label>
                            <textarea
                              rows={4}
                              value={editingRecommendation.description || ''}
                              onChange={e => setEditingRecommendation((prev: any) => ({ ...prev, description: e.target.value }))}
                              placeholder="Напишите подробно, чтобы отображалось на главной странице..."
                              className="w-full px-4 py-2.5 border border-slate-250 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/20 bg-white"
                              id="rec-input-desc"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Расположение фото на сайте</label>
                              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/60 rounded-lg">
                                <button
                                  type="button"
                                  onClick={() => setEditingRecommendation((prev: any) => ({ ...prev, imagePosition: 'left' }))}
                                  className={`py-2 text-xs font-bold rounded-md transition-all cursor-pointer text-center ${
                                    (editingRecommendation.imagePosition || 'left') === 'left'
                                      ? 'bg-white text-[#0F172A] shadow-xs font-black'
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  Слева
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingRecommendation((prev: any) => ({ ...prev, imagePosition: 'right' }))}
                                  className={`py-2 text-xs font-bold rounded-md transition-all cursor-pointer text-center ${
                                    editingRecommendation.imagePosition === 'right'
                                      ? 'bg-white text-[#0F172A] shadow-xs font-black'
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  Справа (Аз рост)
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Пасманзари сурат (Фон)</label>
                              <div className="flex items-center h-[42px] px-3 bg-white border border-slate-250 rounded-lg">
                                <label className="flex items-center gap-2 cursor-pointer w-full select-none text-xs text-slate-600 font-semibold">
                                  <input
                                    type="checkbox"
                                    checked={!!editingRecommendation.isTransparentBg}
                                    onChange={e => setEditingRecommendation((prev: any) => ({ ...prev, isTransparentBg: e.target.checked }))}
                                    className="w-4 h-4 rounded border-slate-300 text-[#D97706] focus:ring-[#D97706]"
                                  />
                                  <span>Бе пасманзар (Шаффоф барои PNG/SVG)</span>
                                </label>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
                            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Манбаи сурат (Сарчашмаи акс)</span>
                            
                            <div className="flex flex-wrap gap-2">
                              {/* File Input button trigger */}
                              <button
                                type="button"
                                disabled={isUploadingRecommendation}
                                onClick={() => recommendationInputRef.current?.click()}
                                className="px-3 py-1.5 border border-slate-250 rounded bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                {isUploadingRecommendation ? (
                                  <RefreshCw className="animate-spin text-[#D97706]" size={13} />
                                ) : (
                                  <FileUp size={13} />
                                )}
                                <span>{isUploadingRecommendation ? 'Бор шуда истодааст...' : 'Бор кардани файл (svg, png, jpg)'}</span>
                              </button>

                              {/* Toggle Inline Gallery picker */}
                              <button
                                type="button"
                                onClick={() => setIsSelectingImageFromGallery(!isSelectingImageFromGallery)}
                                className={`px-3 py-1.5 border rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                                  isSelectingImageFromGallery
                                    ? 'bg-[#0F172A] border-[#0F172A] text-white'
                                    : 'border-slate-250 bg-slate-50 hover:bg-slate-100 text-slate-700'
                                }`}
                              >
                                <ImageIcon size={13} />
                                <span>Интихоб аз Галерея</span>
                              </button>

                              <input
                                type="file"
                                ref={recommendationInputRef}
                                accept="image/*"
                                className="hidden"
                                onChange={handleRecommendationImageUpload}
                              />
                            </div>

                            {/* Inline Gallery Picker selector view */}
                            {isSelectingImageFromGallery && (
                              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-md space-y-2 mt-2 animate-in slide-in-from-top-1 duration-150">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Нажмите и выберите фото из галереи:</span>
                                {(!localSettings.gallery || localSettings.gallery.length === 0) ? (
                                  <span className="text-[11px] text-slate-400 block font-mono">Галерея пуста.</span>
                                ) : (
                                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-[140px] overflow-y-auto pr-1">
                                    {(localSettings.gallery || []).map(g => (
                                      <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => {
                                          setEditingRecommendation((prev: any) => ({ ...prev, imageUrl: g.imageUrl }));
                                          setIsSelectingImageFromGallery(false);
                                        }}
                                        className={`aspect-square overflow-hidden border rounded relative hover:opacity-80 transition-all ${
                                          editingRecommendation.imageUrl === g.imageUrl ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200'
                                        }`}
                                      >
                                        <img src={g.imageUrl} alt="gallery-option" className="w-full h-full object-cover" />
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Manual URL box if they want to paste or verify it */}
                            <div className="space-y-1">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Или введите ссылку на фото вручную (URL/Base64):</span>
                              <input
                                type="text"
                                value={editingRecommendation.imageUrl || ''}
                                onChange={e => setEditingRecommendation((prev: any) => ({ ...prev, imageUrl: e.target.value }))}
                                placeholder="https://example.com/image.png"
                                className="w-full px-3 py-2 border border-slate-200 rounded text-xs bg-slate-50 font-mono focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* RIGHT COLUMN: Interactive 1:1 Live Preview with Crop & Zoom controls */}
                        <div className="lg:col-span-5 flex flex-col items-center gap-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
                          <span className="block text-xs font-black text-slate-500 uppercase tracking-widest">Пешнамоиши 1:1 ва Танзими Масштаб</span>
                          
                          {/* 1:1 Square Frame standing on a checkerboard bg */}
                          <div
                            className={`w-48 h-48 relative border rounded-lg overflow-hidden flex items-center justify-center shadow-md select-none ${
                              editingRecommendation.isTransparentBg
                                ? 'bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] bg-slate-100'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            {editingRecommendation.imageUrl ? (
                              <img
                                src={editingRecommendation.imageUrl}
                                alt="Live Crop Preview"
                                className="absolute pointer-events-none transition-all duration-75"
                                style={{
                                  transform: `scale(${editingRecommendation.zoom ?? 1})`,
                                  transformOrigin: 'center center',
                                  objectFit: editingRecommendation.isTransparentBg ? 'contain' : 'cover',
                                  marginLeft: `${editingRecommendation.offsetX ?? 0}%`,
                                  marginTop: `${editingRecommendation.offsetY ?? 0}%`,
                                  width: '100%',
                                  height: '100%',
                                }}
                              />
                            ) : (
                              <div className="text-center p-4 text-slate-400">
                                <ImageIcon size={28} className="mx-auto mb-1.5 text-slate-300" />
                                <span className="text-[10px] font-medium block">Выберите изображение, чтобы увидеть предпросмотр</span>
                              </div>
                            )}
                          </div>

                          {editingRecommendation.imageUrl && (
                            <div className="w-full space-y-3 pt-2">
                              {/* Zoom Slider */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px] font-bold text-slate-500">
                                  <span>Масштаб фото (Zoom):</span>
                                  <span className="font-mono text-amber-600">{(editingRecommendation.zoom ?? 1).toFixed(2)}x</span>
                                </div>
                                <input
                                  type="range"
                                  min="1"
                                  max="3"
                                  step="0.05"
                                  value={editingRecommendation.zoom ?? 1}
                                  onChange={e => setEditingRecommendation((prev: any) => ({ ...prev, zoom: parseFloat(e.target.value) }))}
                                  className="w-full accent-[#D97706] h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                                />
                              </div>

                              {/* Offset X Slider */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px] font-bold text-slate-500">
                                  <span>Смещение X (По горизонтали):</span>
                                  <span className="font-mono text-amber-600">{editingRecommendation.offsetX ?? 0}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="-50"
                                  max="50"
                                  step="1"
                                  value={editingRecommendation.offsetX ?? 0}
                                  onChange={e => setEditingRecommendation((prev: any) => ({ ...prev, offsetX: parseInt(e.target.value) }))}
                                  className="w-full accent-[#D97706] h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                                />
                              </div>

                              {/* Offset Y Slider */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px] font-bold text-slate-500">
                                  <span>Смещение Y (По вертикали):</span>
                                  <span className="font-mono text-amber-600">{editingRecommendation.offsetY ?? 0}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="-50"
                                  max="50"
                                  step="1"
                                  value={editingRecommendation.offsetY ?? 0}
                                  onChange={e => setEditingRecommendation((prev: any) => ({ ...prev, offsetY: parseInt(e.target.value) }))}
                                  className="w-full accent-[#D97706] h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                                />
                              </div>

                              <div className="text-[10px] text-slate-400 text-center select-none font-sans mt-1">
                                💡 Двигайте слайдеры, чтобы кадрировать желаемый центр фото ("обрезать").
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Editor validation actions */}
                      <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRecommendation(null);
                            setIsAddingRecommendation(false);
                          }}
                          className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer uppercase select-none"
                        >
                          Отмена
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveRecommendationItem}
                          className="px-5 py-2.5 bg-[#024F33] hover:bg-[#013522] text-white font-bold text-xs rounded-xl transition-all cursor-pointer uppercase tracking-wider select-none"
                        >
                          Подтвердить и добавить
                        </button>
                      </div>
                    </div>
                  )}

                  {/* MASTER LIST OF EXISTING RECOMMENDATION CARDS WITH ORDER CONTROLS */}
                  {!editingRecommendation && !isAddingRecommendation && (
                     <div className="space-y-4">
                       <div className="flex items-center justify-between">
                         <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Список карточек ({localSettings.recommendations?.length || 0})</span>
                         <span className="text-[11px] text-slate-400">💡 Изменение порядка с помощью стрелок (сортировка) поддерживается.</span>
                       </div>

                       {(!localSettings.recommendations || localSettings.recommendations.length === 0) ? (
                         <div className="py-12 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                           <Sliders size={32} className="text-slate-300" />
                           <p className="text-xs font-sans font-semibold">Ещё не добавлено ни одной карточки Рекомендации.</p>
                           <button
                             type="button"
                             onClick={() => {
                               setEditingRecommendation({
                                 title: '',
                                 description: '',
                                 imageUrl: '',
                                 imagePosition: 'left',
                                 isTransparentBg: false,
                                 zoom: 1,
                                 offsetX: 0,
                                 offsetY: 0
                               });
                               setIsAddingRecommendation(true);
                             }}
                             className="py-2 px-3.5 bg-[#D97706] hover:bg-amber-700 rounded-lg text-white font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer"
                           >
                             Илова кардан
                           </button>
                         </div>
                       ) : (
                         <div className="grid grid-cols-1 gap-4">
                           {(localSettings.recommendations || []).map((item, idx) => {
                             const imageStyles: any = {
                               transform: `scale(${item.zoom ?? 1})`,
                               transformOrigin: 'center center',
                               objectFit: item.isTransparentBg ? 'contain' : 'cover',
                               marginLeft: `${item.offsetX ?? 0}%`,
                               marginTop: `${item.offsetY ?? 0}%`,
                               width: '100%',
                               height: '100%',
                             };

                             return (
                               <div
                                 key={item.id}
                                 className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4"
                               >
                                 <div className="flex items-center gap-4 min-w-0 flex-1">
                                   <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative">
                                     <img src={item.imageUrl} alt={item.title} style={imageStyles} />
                                   </div>
                                   <div className="min-w-0">
                                     <h4 className="text-sm font-bold text-slate-800 truncate">{item.title}</h4>
                                     <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{item.description}</p>
                                   </div>
                                 </div>

                                 <div className="flex items-center gap-2 shrink-0">
                                   <button
                                     type="button"
                                     disabled={idx === 0}
                                     onClick={() => handleMoveRecommendationUp(idx)}
                                     className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                                     title="Вверх"
                                   >
                                     <ChevronUp size={14} />
                                   </button>
                                   <button
                                     type="button"
                                     disabled={idx === (localSettings.recommendations || []).length - 1}
                                     onClick={() => handleMoveRecommendationDown(idx)}
                                     className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                                     title="Вниз"
                                   >
                                     <ChevronDown size={14} />
                                   </button>
                                   <button
                                     type="button"
                                     onClick={() => {
                                       setEditingRecommendation({ ...item });
                                       setIsAddingRecommendation(false);
                                     }}
                                     className="p-1.5 rounded-lg border border-slate-200 text-amber-600 hover:bg-amber-50 cursor-pointer"
                                     title="Редактировать"
                                   >
                                     <Edit2 size={14} />
                                   </button>
                                   <button
                                     type="button"
                                     onClick={() => handleDeleteRecommendation(item.id)}
                                     className="p-1.5 rounded-lg border border-slate-200 text-red-600 hover:bg-red-50 cursor-pointer"
                                     title="Удалить"
                                   >
                                     <Trash2 size={14} />
                                   </button>
                                 </div>
                               </div>
                             );
                           })}
                         </div>
                       )}
                     </div>
                   )}
                </div>
              )}

              {activeTab === 'cases' && (
                <div className="space-y-6" id="cases-workspace">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-md sm:text-lg font-bold text-[#0F172A] tracking-tight">Кейсы (Сданные объекты)</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Добавьте информацию о сданных объектах (название, описание, фотографии).
                      </p>
                    </div>
                    {/* Header Action buttons */}
                    <div className="flex items-center gap-2">
                      {!editingCase && !isAddingCase && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCase({
                              title: '',
                              description: '',
                              images: [],
                              location: '',
                              year: ''
                            });
                            setIsAddingCase(true);
                          }}
                          className="px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                        >
                          <Plus size={14} />
                          <span className="hidden sm:inline">Добавить</span>
                        </button>
                      )}
                      
                      {!editingCase && !isAddingCase && (
                        <button
                          onClick={handleSaveGeneralSettings}
                          disabled={isSaving}
                          className="px-3 sm:px-4 py-2 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                          <span className="hidden sm:inline">Сохранить</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Add / Edit Form */}
                  {(isAddingCase || editingCase?.id) && editingCase && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 lg:p-6 shadow-2xs space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <h4 className="text-sm font-bold text-slate-800">
                          {editingCase.id ? 'Редактирование кейса' : 'Добавление нового кейса'}
                        </h4>
                        <button 
                          onClick={() => {
                            setEditingCase(null);
                            setIsAddingCase(false);
                          }}
                          className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                        {/* Left column: Text inputs */}
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Заголовок (Название) *</label>
                            <input
                              type="text"
                              value={editingCase.title || ''}
                              onChange={e => setEditingCase({...editingCase, title: e.target.value})}
                              placeholder="Например: ЖК «Сомон»"
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Расположение (Адрес)</label>
                            <input
                              type="text"
                              value={editingCase.location || ''}
                              onChange={e => setEditingCase({...editingCase, location: e.target.value})}
                              placeholder="Например: г. Душанбе, ул. Рудаки"
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Год сдачи</label>
                            <input
                              type="text"
                              value={editingCase.year || ''}
                              onChange={e => setEditingCase({...editingCase, year: e.target.value})}
                              placeholder="Например: 2022"
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Описание</label>
                            <textarea
                              value={editingCase.description || ''}
                              onChange={e => setEditingCase({...editingCase, description: e.target.value})}
                              placeholder="Информация о здании..."
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all min-h-[120px] resize-y"
                            />
                          </div>
                        </div>

                        {/* Right column: Images */}
                        <div className="space-y-4">
                          <label className="block text-xs font-bold text-slate-700 mb-1">Фотографии (до 5 шт) *</label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {(editingCase.images || []).map((imgUrl, idx) => (
                              <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                                <img src={imgUrl} alt={`Case img ${idx}`} className="w-full h-full object-cover" />
                                <button 
                                  onClick={() => {
                                    setEditingCase({
                                      ...editingCase,
                                      images: (editingCase.images || []).filter((_, i) => i !== idx)
                                    });
                                  }}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                            {(editingCase.images || []).length < 5 && (
                              <label className={`w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${isUploadingCaseImage ? 'border-amber-400 bg-amber-50' : 'border-slate-300 hover:border-amber-500 hover:bg-slate-50'}`}>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleCaseImageUpload}
                                  disabled={isUploadingCaseImage}
                                />
                                {isUploadingCaseImage ? (
                                  <RefreshCw className="animate-spin text-amber-500 mb-1" size={16} />
                                ) : (
                                  <ImageIcon className="text-slate-400 mb-1" size={16} />
                                )}
                                <span className="text-[9px] font-bold text-slate-500">{isUploadingCaseImage ? 'Загрузка...' : 'Добавить'}</span>
                              </label>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">Рекомендуемые форматы: JPG, PNG, WEBP. Максимальный размер: 10MB.</p>
                        </div>
                      </div>

                      {/* Save/Cancel Buttons */}
                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                        <button
                          onClick={() => {
                            setEditingCase(null);
                            setIsAddingCase(false);
                          }}
                          className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={handleSaveCaseItem}
                          className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                        >
                          <Save size={14} />
                          <span>Сохранить</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List of Cases */}
                  {!editingCase && !isAddingCase && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(localSettings.cases || []).length === 0 ? (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400">
                          <Briefcase size={32} className="mb-3 text-slate-300" />
                          <p className="text-sm font-medium">Ягон кейс илова нашудааст</p>
                          <p className="text-xs mt-1">Барои илова кардан тугмаи "Илова кардан"-ро пахш кунед</p>
                        </div>
                      ) : (
                        (localSettings.cases || []).map((caseItem, idx) => (
                          <div key={caseItem.id} className="group bg-white border border-slate-200 hover:border-amber-300/50 hover:shadow-md rounded-xl p-4 transition-all relative">
                            {caseItem.images?.[0] && (
                              <div className="w-full h-32 rounded-lg overflow-hidden mb-3 bg-slate-100">
                                <img src={caseItem.images[0]} alt={caseItem.title} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-col">
                                <span className="text-xs font-mono font-bold text-slate-400 mb-1">#{idx + 1}</span>
                                <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{caseItem.title}</h4>
                                {caseItem.location && <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{caseItem.location}</p>}
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{caseItem.description}</p>
                              </div>
                            </div>
                            
                            {/* Action overlay */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                              <button
                                onClick={() => {
                                  setEditingCase(caseItem);
                                  setIsAddingCase(false);
                                }}
                                className="p-1.5 bg-white text-slate-600 hover:text-amber-600 rounded-md shadow-xs border border-slate-100 cursor-pointer"
                                title="Таҳрир кардан"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteCaseItem(caseItem.id)}
                                className="p-1.5 bg-white text-slate-600 hover:text-red-600 rounded-md shadow-xs border border-slate-100 cursor-pointer"
                                title="Нест кардан"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {!editingCase && !isAddingCase && (localSettings.cases || []).length > 0 && (
                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button
                          onClick={handleSaveGeneralSettings}
                          disabled={isSaving}
                          className="px-5 py-2.5 bg-[#D97706] hover:bg-[#B45309] text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {isSaving ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />}
                          <span>Сохранить настройки</span>
                        </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: FLOOR PRICES EDIT SECTION */}
              {activeTab === 'pricing' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-md sm:text-lg font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
                        <Layers className="text-emerald-600" size={20} />
                        <span>Настройка цен по этажам</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Укажите цену за 1 м² в сомони (TJS) для каждого этажа. Эти цены будут использоваться в калькуляторе на сайте.
                      </p>
                    </div>
                    {/* Save Button */}
                    <button
                      onClick={handleSaveGeneralSettings}
                      disabled={isSaving}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#024F33] hover:bg-[#013522] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition-all uppercase tracking-wider shadow-sm cursor-pointer shrink-0"
                      id="save-prices-top-btn"
                    >
                      {isSaving ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />}
                      <span>Сохранить</span>
                    </button>
                  </div>

                  {saveSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2"
                    >
                      <CheckCircle size={15} />
                      <span>Цены этажей успешно сохранены в базе данных!</span>
                    </motion.div>
                  )}



                  {/* Individual Floor Prices Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 16 }, (_, i) => i + 1).map((fl) => {
                      const currentPrices = localSettings.floorPrices || {};
                      const rawPrice = currentPrices[String(fl)] !== undefined ? currentPrices[String(fl)] : (fl === 1 ? 11500 : fl >= 2 && fl <= 6 ? 6500 : fl >= 7 && fl <= 10 ? 6200 : 5800);
                      const priceVal = rawPrice < 2000 ? Math.round(rawPrice * 9.58) : rawPrice;

                      const currentDeposits = localSettings.floorDeposits || {};
                      const depositVal = currentDeposits[String(fl)] !== undefined ? currentDeposits[String(fl)] : (fl === 1 ? 100 : fl >= 2 && fl <= 6 ? 50 : fl >= 7 && fl <= 10 ? 40 : 30);

                      const currentCashOnly = localSettings.floorCashOnly || {};
                      const isCashOnlyVal = currentCashOnly[String(fl)] !== undefined ? currentCashOnly[String(fl)] : (fl === 1);
                      
                      return (
                        <div 
                          key={fl}
                          className={`p-4 rounded-2xl border transition-all ${
                            isCashOnlyVal
                              ? 'bg-amber-50/20 border-amber-200/60'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2.5">
                            <span className="text-xs font-black text-slate-700 uppercase tracking-tight">
                              Этаж {fl}
                            </span>
                            {isCashOnlyVal ? (
                              <span className="text-[8px] bg-amber-600 text-white font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide">
                                Только наличные (100%)
                              </span>
                            ) : (
                              <span className="text-[8px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide">
                                Рассрочка {depositVal}%
                              </span>
                            )}
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Цена за 1 м² (сомонӣ):</label>
                              <div className="relative flex items-center bg-[#F7F9FB] border border-slate-200 focus-within:bg-white focus-within:border-emerald-500/50 rounded-xl px-3 py-1.5 transition-all">
                                <input
                                  type="number"
                                  min="1"
                                  value={priceVal}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    const updatedPrices = { ...currentPrices };
                                    updatedPrices[String(fl)] = isNaN(val) ? 0 : val;
                                    setLocalSettings(prev => ({
                                      ...prev,
                                      floorPrices: updatedPrices
                                    }));
                                  }}
                                  className="w-full bg-transparent font-black font-mono text-sm text-slate-800 outline-none"
                                />
                                <span className="text-xs font-extrabold text-slate-500 ml-1 font-mono">TJS</span>
                              </div>
                            </div>

                            {/* Purchase type selector toggle */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Способ оплаты:</label>
                              <div className="grid grid-cols-2 gap-1 bg-[#F1F5F9] p-1 rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = { ...currentCashOnly };
                                    updated[String(fl)] = true;
                                    
                                    const updatedDep = { ...currentDeposits };
                                    updatedDep[String(fl)] = 100;

                                    setLocalSettings(prev => ({
                                      ...prev,
                                      floorCashOnly: updated,
                                      floorDeposits: updatedDep
                                    }));
                                  }}
                                  className={`text-[9px] font-bold py-1 px-1 rounded-lg transition-all cursor-pointer ${
                                    isCashOnlyVal 
                                      ? 'bg-amber-600 text-white shadow-xs' 
                                      : 'text-slate-600 hover:text-slate-800'
                                  }`}
                                >
                                  Только наличные
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = { ...currentCashOnly };
                                    updated[String(fl)] = false;
                                    
                                    const updatedDep = { ...currentDeposits };
                                    if (updatedDep[String(fl)] === 100 || updatedDep[String(fl)] === undefined) {
                                      updatedDep[String(fl)] = (fl >= 11 ? 29 : fl >= 7 ? 39 : 59);
                                    }

                                    setLocalSettings(prev => ({
                                      ...prev,
                                      floorCashOnly: updated,
                                      floorDeposits: updatedDep
                                    }));
                                  }}
                                  className={`text-[9px] font-bold py-1 px-1 rounded-lg transition-all cursor-pointer ${
                                    !isCashOnlyVal 
                                      ? 'bg-emerald-600 text-white shadow-xs' 
                                      : 'text-slate-600 hover:text-emerald-700'
                                  }`}
                                >
                                  Рассрочка
                                </button>
                              </div>
                            </div>

                            {/* Deposit Percent */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Процент предоплаты:</label>
                              {isCashOnlyVal ? (
                                <div className="bg-amber-100/20 border border-amber-250/30 rounded-xl px-3 py-1 text-center font-bold text-[10px] text-amber-800 flex items-center justify-center h-[34px]">
                                  100% предоплата
                                </div>
                              ) : (
                                <div className="relative flex items-center bg-[#F7F9FB] border border-slate-200 focus-within:bg-white focus-within:border-emerald-500/50 rounded-xl px-3 py-1 transition-all h-[34px]">
                                  <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={depositVal}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      const updatedDeposits = { ...currentDeposits };
                                      updatedDeposits[String(fl)] = isNaN(val) ? 0 : Math.min(100, Math.max(0, val));
                                      setLocalSettings(prev => ({
                                        ...prev,
                                        floorDeposits: updatedDeposits
                                      }));
                                    }}
                                    className="w-full bg-transparent font-black font-mono text-xs text-slate-800 outline-none"
                                  />
                                  <span className="text-[10px] font-extrabold text-slate-400 ml-1 font-mono">%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Lower Save Action Bar */}
                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={handleSaveGeneralSettings}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-5 py-3 bg-[#024F33] hover:bg-[#013522] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition-all cursor-pointer uppercase tracking-wider shadow animate-none"
                      id="save-prices-bottom-btn"
                    >
                      {isSaving ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />}
                      <span>Сохранить</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: APARTMENTS STATUS MANAGER */}
              {activeTab === 'status_manager' && (
                <div className="space-y-6">
                  {/* Tab Header with return/restore button */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-150 pb-4">
                    <div>
                      <h3 className="text-md sm:text-lg font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
                        <ClipboardCheck className="text-[#024F33]" size={20} />
                        <span>Управление статусом квартир</span>
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveStatusesPreflight}
                        disabled={isSaving || Object.keys(pendingStatusChanges).length === 0}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#024F33] hover:bg-[#013522] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition-all uppercase tracking-wider shadow-sm cursor-pointer"
                        id="save-statuses-header-btn"
                      >
                        {isSaving ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />}
                        <span>Сохранить</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsUnlockConfirmOpen(true)}
                        className={`flex items-center justify-center py-2.5 px-3 rounded-xl text-white font-bold text-xs transition-all shadow-sm cursor-pointer ${
                          unlockSoldEdits 
                            ? 'bg-[#024F33] hover:bg-[#013522]' 
                            : 'bg-amber-600 hover:bg-amber-700'
                        }`}
                        title="Разрешить исправление проданных"
                      >
                        <RotateCcw size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Block Selection Bar for Status Manager */}
                  {currentBlocks.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-xl shadow-2xs w-full">
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                          <Building2 size={15} className="text-[#024F33]" />
                          <span>Выбор блока</span>
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Всего: {currentBlocks.length} блоков
                        </span>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
                        {currentBlocks.map((block) => (
                          <button
                            key={block.id}
                            type="button"
                            onClick={() => {
                              setSelectedStatusBlockId(block.id);
                              const bFloors = (localSettings.floors || []).filter(f => (f.blockId || currentBlocks[0].id) === block.id);
                              if (bFloors.length > 0) {
                                const sorted = [...bFloors].sort((a, b) => a.floorNumber - b.floorNumber);
                                setSelectedStatusFloorNum(sorted[0].floorNumber);
                              }
                            }}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 border ${
                              selectedStatusBlockId === block.id
                                ? 'bg-[#024F33] text-white border-[#024F33] shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <Building2 size={13} className={selectedStatusBlockId === block.id ? 'text-amber-400' : 'text-slate-400'} />
                            <span>{block.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Floor Selection Panel */}
                  {(() => {
                    const activeBlockFloors = (localSettings.floors || []).filter(
                      f => (f.blockId || currentBlocks[0].id) === selectedStatusBlockId
                    );

                    return (
                      <div className="p-1 px-1.5 bg-slate-100 border border-slate-200/80 rounded-2xl">
                        <div className="flex flex-wrap gap-1.5 justify-start p-1 max-h-40 overflow-y-auto">
                          {activeBlockFloors.length === 0 ? (
                            <div className="py-2.5 px-4 text-xs text-slate-400 italic font-medium">
                              В этом блоке нет этажей.
                            </div>
                          ) : (
                            [...activeBlockFloors]
                              .sort((a, b) => a.floorNumber - b.floorNumber)
                              .map((floor) => {
                                const isActive = selectedStatusFloorNum === floor.floorNumber;
                                return (
                                  <button
                                    key={floor.id}
                                    type="button"
                                    onClick={() => setSelectedStatusFloorNum(floor.floorNumber)}
                                    className={`py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                      isActive
                                        ? 'bg-[#024F33] text-white shadow-sm'
                                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                                    }`}
                                  >
                                    {floor.isShopFloor ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`}><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><line x1="9" y1="22" x2="9" y2="16" /><line x1="15" y1="22" x2="15" y2="16" /><line x1="9" y1="16" x2="15" y2="16" /><path d="M9 6h.01M15 6h.01M9 11h.01M15 11h.01" /></svg>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                                    )}
                                    <span>Этаж {floor.floorNumber}</span>
                                  </button>
                                );
                              })
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Apartments Grid wrapper */}
                  <div className="space-y-4">
                    {(() => {
                      const activeBlockFloors = (localSettings.floors || []).filter(
                        f => (f.blockId || currentBlocks[0].id) === selectedStatusBlockId
                      );
                      const curFloor = activeBlockFloors.find(f => f.floorNumber === selectedStatusFloorNum);
                      if (!curFloor) {
                        return (
                          <div className="py-12 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs font-medium">
                            Этажи или квартиры не найдены.
                          </div>
                        );
                      }

                      const apartmentsList = curFloor.apartments || [];
                      if (apartmentsList.length === 0) {
                        return (
                          <div className="py-12 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs font-medium">
                            На этом этаже не создано ни одной квартиры.
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {apartmentsList.map((apt) => {
                            const originalStatus = apt.status || 'free';
                            const currentStatus = pendingStatusChanges[apt.id] || originalStatus;
                            const isChanged = currentStatus !== originalStatus;
                            
                            // Locked condition: if saved value is 'sold' and unlockSoldEdits is false
                            const isLocked = originalStatus === 'sold' && !unlockSoldEdits;

                            return (
                              <div
                                key={apt.id}
                                className={`relative border rounded-2xl p-4.5 transition-all shadow-2xs ${
                                  isLocked 
                                    ? 'bg-slate-50 border-slate-200 opacity-70' 
                                    : 'bg-white border-slate-200/80 hover:shadow-xs'
                                }`}
                              >
                                {isChanged && (
                                  <span className="absolute top-3 right-3 text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Не сохранено
                                  </span>
                                )}

                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-extrabold text-slate-800 tracking-tight block">
                                      {apt.name} (№{apt.number})
                                    </span>
                                    {isLocked && (
                                      <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase">
                                        🔒 Заблокировано
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[10px] text-slate-400 font-medium mb-3 whitespace-nowrap">
                                    Площадь: {apt.area ? `${apt.area} м²` : 'не указано'}
                                  </div>

                                  {/* Status Selector Pills */}
                                  <div className="space-y-2 mt-3">
                                    <label className="text-[9px] font-black uppercase text-slate-400 block tracking-wider font-mono">
                                      Смена статуса:
                                    </label>
                                    <div className="grid grid-cols-3 gap-1 font-sans">
                                      {/* Free Option */}
                                      <button
                                        type="button"
                                        disabled={isLocked}
                                        onClick={() => {
                                          setPendingStatusChanges(prev => ({ ...prev, [apt.id]: 'free' }));
                                        }}
                                        className={`py-1.5 text-[10px] font-extrabold rounded-lg border tracking-tight cursor-pointer transition-all ${
                                          currentStatus === 'free'
                                            ? 'bg-slate-100 border-slate-300 text-slate-800 font-black shadow-2xs'
                                            : isLocked 
                                              ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                              : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                        }`}
                                      >
                                        Свободно
                                      </button>

                                      {/* Booked Option */}
                                      <button
                                        type="button"
                                        disabled={isLocked}
                                        onClick={() => {
                                          setPendingStatusChanges(prev => ({ ...prev, [apt.id]: 'booked' }));
                                        }}
                                        className={`py-1.5 text-[10px] font-extrabold rounded-lg border tracking-tight cursor-pointer transition-all ${
                                          currentStatus === 'booked'
                                            ? 'bg-amber-100 border-amber-300 text-amber-800 font-black shadow-2xs'
                                            : isLocked 
                                              ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                              : 'bg-white border-slate-200 text-slate-500 hover:text-amber-600 hover:bg-amber-50/20'
                                        }`}
                                      >
                                        Брон
                                      </button>

                                      {/* Sold Option */}
                                      <button
                                        type="button"
                                        disabled={isLocked}
                                        onClick={() => {
                                          setPendingStatusChanges(prev => ({ ...prev, [apt.id]: 'sold' }));
                                        }}
                                        className={`py-1.5 text-[10px] font-extrabold rounded-lg border tracking-tight cursor-pointer transition-all ${
                                          currentStatus === 'sold'
                                            ? 'bg-red-105 border-red-300 text-red-800 font-black shadow-2xs'
                                            : isLocked 
                                              ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                              : 'bg-white border-slate-200 text-slate-500 hover:text-red-750 hover:bg-red-50/30'
                                        }`}
                                      >
                                        Продано
                                      </button>
                                    </div>
                                  </div>

                                  {/* Buyer name field if selected status is 'sold' */}
                                  {currentStatus === 'sold' && (
                                    <div className="mt-3.5 space-y-1 font-sans">
                                      <label className="text-[9px] font-black uppercase text-slate-400 block tracking-wider font-mono">
                                        Имя покупателя:
                                      </label>
                                      <input
                                        type="text"
                                        disabled={isLocked}
                                        placeholder="Введите имя покупателя..."
                                        value={pendingBuyerNames[apt.id] || apt.buyerName || ''}
                                        onChange={(e) => setPendingBuyerNames(prev => ({ ...prev, [apt.id]: e.target.value }))}
                                        className={`w-full text-xs p-2 border rounded-xl outline-none transition-all ${
                                          isLocked 
                                            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed font-medium'
                                            : 'bg-white border-slate-200 focus:border-[#024F33] text-slate-850 font-semibold'
                                        }`}
                                      />
                                    </div>
                                  )}

                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Bottom Actions Bar */}
                  <div className="pt-6 border-t border-slate-100 flex justify-between items-center font-sans">
                    <div>
                      {Object.keys(pendingStatusChanges).length > 0 && (
                        <span className="text-xs font-semibold text-amber-600">
                          ⚙️ {Object.keys(pendingStatusChanges).length} хона ислоҳ шуд, омодаи сабт
                        </span>
                      )}
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleSaveStatusesPreflight}
                      disabled={isSaving || Object.keys(pendingStatusChanges).length === 0}
                      className="flex items-center gap-2 px-5 py-3 bg-[#024F33] hover:bg-[#013522] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition-all cursor-pointer uppercase tracking-wider shadow"
                      id="save-statuses-btn"
                    >
                      {isSaving ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />}
                      <span>Сохранить</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: TELEGRAM INTEGRATION TAB */}
              {activeTab === 'integration' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-md sm:text-lg font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
                        <Send className="text-emerald-600" size={20} />
                        <span>Интеграция с Telegram</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Настройка Telegram-ботов и Chat ID для автоматического получения заявок и жалоб.
                      </p>
                    </div>
                    {/* Save Button */}
                    <button
                      onClick={handleSaveGeneralSettings}
                      disabled={isSaving}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#024F33] hover:bg-[#013522] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition-all uppercase tracking-wider shadow-sm cursor-pointer shrink-0"
                      id="save-integration-top-btn"
                    >
                      {isSaving ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />}
                      <span>Сохранить</span>
                    </button>
                  </div>

                  {saveSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2"
                    >
                      <CheckCircle size={15} />
                      <span>Настройки Telegram успешно сохранены!</span>
                    </motion.div>
                  )}

                  {/* TWO BOTS CONFIGURATION CARDS */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* BOT 1 CONFIG */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                          <Bot size={22} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800">Бот 1 (Заявки и Жалобы)</h4>
                          <p className="text-[11px] text-slate-400">Для запросов на покупку, предложений и жалоб в целом</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Токен Бота (Bot Token):</label>
                        <div className="relative flex items-center bg-[#F7F9FB] border border-slate-200 focus-within:bg-white focus-within:border-blue-500/50 rounded-xl px-3 py-2 transition-all">
                          <input
                            type="text"
                            placeholder="e.g. 123456789:ABCdefGhI..."
                            value={localSettings.tgBotToken1 || ''}
                            onChange={(e) => setLocalSettings(prev => ({ ...prev, tgBotToken1: e.target.value }))}
                            className="w-full bg-transparent font-medium font-mono text-xs text-slate-800 outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => testTelegramBot('bot1')}
                          className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-705 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
                        >
                          {bot1TestStatus === 'testing' ? <RefreshCw className="animate-spin" size={12} /> : null}
                          <span>Проверить Бота</span>
                        </button>

                        {bot1TestStatus !== 'idle' && (
                          <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                            bot1TestStatus === 'success' ? 'text-emerald-600' : bot1TestStatus === 'error' ? 'text-rose-600' : 'text-slate-500'
                          }`}>
                            {bot1TestStatus === 'success' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                            <span>{bot1TestMsg}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* BOT 2 CONFIG */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                          <Bot size={22} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800">Бот 2 (Бронирование и Продажа)</h4>
                          <p className="text-[11px] text-slate-400">Для продажи квартир или бронирования из шахматки</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Токен Бота (Bot Token):</label>
                        <div className="relative flex items-center bg-[#F7F9FB] border border-slate-200 focus-within:bg-white focus-within:border-emerald-500/50 rounded-xl px-3 py-2 transition-all">
                          <input
                            type="text"
                            placeholder="e.g. 987654321:XYZabcDeF..."
                            value={localSettings.tgBotToken2 || ''}
                            onChange={(e) => setLocalSettings(prev => ({ ...prev, tgBotToken2: e.target.value }))}
                            className="w-full bg-transparent font-medium font-mono text-xs text-slate-800 outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => testTelegramBot('bot2')}
                          className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-705 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
                        >
                          {bot2TestStatus === 'testing' ? <RefreshCw className="animate-spin" size={12} /> : null}
                          <span>Проверить Бота</span>
                        </button>

                        {bot2TestStatus !== 'idle' && (
                          <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                            bot2TestStatus === 'success' ? 'text-emerald-600' : bot2TestStatus === 'error' ? 'text-rose-600' : 'text-slate-500'
                          }`}>
                            {bot2TestStatus === 'success' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                            <span>{bot2TestMsg}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* MANAGE CHAT IDS */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6">
                    <div>
                      <h4 className="text-sm font-black text-slate-800">Настройка Chat ID и Выбор Ботов</h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Добавьте общие Chat ID и выберите, уведомления от какого бота будут отправляться в этот чат. Какие боты приглашены, а какие нет.
                      </p>
                    </div>

                    {/* Form to Add New Chat ID */}
                    <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-slate-200/50 flex flex-col md:flex-row gap-4 items-end">
                      <div className="space-y-1 w-full md:w-1/3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Чат ID (Chat ID):</label>
                        <input
                          type="text"
                          placeholder="e.g. -10012345678"
                          value={newChatId}
                          onChange={(e) => setNewChatId(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none"
                        />
                      </div>

                      <div className="space-y-1 w-full md:w-1/3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Название / Описание чата:</label>
                        <input
                          type="text"
                          placeholder="e.g. Группа Клиентов"
                          value={newChatDesc}
                          onChange={(e) => setNewChatDesc(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                        />
                      </div>

                      {/* Bot checkboxes */}
                      <div className="flex flex-col gap-2 w-full md:w-fit py-1">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newChatBot1Enabled}
                            onChange={(e) => setNewChatBot1Enabled(e.target.checked)}
                            className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                          />
                          <span>Бот 1 (Заявки)</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newChatBot2Enabled}
                            onChange={(e) => setNewChatBot2Enabled(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          />
                          <span>Бот 2 (Бронь и Продажа)</span>
                        </label>
                      </div>

                      {/* Submit */}
                      <button
                        type="button"
                        onClick={handleAddTelegramChat}
                        disabled={!newChatId.trim()}
                        className="px-5 py-2.5 bg-[#024F33] hover:bg-[#013522] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap h-fit uppercase tracking-normal"
                      >
                        <Plus className="inline mr-1" size={13} />
                        <span>Добавить Чат</span>
                      </button>
                    </div>

                    {/* Chats List Display */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Настроенные Активные Чаты:</span>
                      
                      {(!localSettings.tgChats || localSettings.tgChats.length === 0) ? (
                        <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                          Ни один Chat ID не подключен. Пожалуйста, добавьте выше.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {localSettings.tgChats.map((chat) => (
                            <div key={chat.id} className="bg-[#FAFBFD] p-4 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <h5 className="text-xs font-black text-slate-800 leading-tight">{chat.description}</h5>
                                  <code className="text-[10px] font-mono font-bold text-blue-600 block mt-0.5">{chat.chatId}</code>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTelegramChat(chat.id)}
                                  className="p-1 px-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>

                              {/* Notification toggles */}
                              <div className="pt-2 border-t border-slate-200/55 space-y-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Получать сообщения от:</span>
                                <div className="flex items-center gap-4">
                                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={chat.bot1Enabled ?? true}
                                      onChange={(e) => handleUpdateTelegramChat(chat.id, { bot1Enabled: e.target.checked })}
                                      className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                                    />
                                    <span>Бот 1</span>
                                  </label>
                                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={chat.bot2Enabled ?? true}
                                      onChange={(e) => handleUpdateTelegramChat(chat.id, { bot2Enabled: e.target.checked })}
                                      className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                                    />
                                    <span>Бот 2</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: CHESSBOARD BLOCK AND FLOOR MANAGEMENT */}
              {activeTab === 'chessboard' && (
                <div className="space-y-6">
                  {/* Block Management & Per-Block Floors Section */}
                  <div className="space-y-6">
                    <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                            <Building2 size={15} className="text-[#D97706]" />
                            <span>Управление блоками здания (Секции)</span>
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Проект может состоять из нескольких блоков. Вы можете добавить новый блок или удалить существующие.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        {currentBlocks.map((block) => (
                          <div key={block.id} className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded text-xs font-bold text-slate-700">
                            <span>{block.name}</span>
                            {currentBlocks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteBlock(block.id)}
                                className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                                title="Удалить блок"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-slate-100">
                        <input
                          type="text"
                          placeholder="Название нового блока (например: Блок Б)"
                          value={newBlockNameInput}
                          onChange={(e) => setNewBlockNameInput(e.target.value)}
                          className="text-xs p-2.5 border border-slate-200 rounded bg-slate-50 flex-grow font-semibold"
                        />
                        <button
                          type="button"
                          onClick={handleAddBlock}
                          className="px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded uppercase tracking-wider cursor-pointer shrink-0"
                        >
                          + Добавить блок
                        </button>
                      </div>
                    </div>

                    {/* Per-Block Floor Sections */}
                    {currentBlocks.map((block) => {
                      const blockFloors = (localSettings.floors || []).filter(f => (f.blockId || currentBlocks[0].id) === block.id);
                      const isAddingHere = addingFloorBlockId === block.id;
                      const blockShopCount = blockFloors.filter(f => f.floorType === 'shop' || (!f.floorType && f.isShopFloor === true)).length;
                      const blockBasementCount = blockFloors.filter(f => f.floorType === 'basement_shop').length;
                      const blockParkingCount = blockFloors.filter(f => f.floorType === 'parking').length;
                      const isBlockExpanded = !!expandedBlockIds[block.id];

                      return (
                        <div key={block.id} className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden transition-all">
                          {/* Clickable Block Header Card */}
                          <div 
                            onClick={() => toggleBlockExpanded(block.id)}
                            className="p-4 sm:p-5 bg-white hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-[#D97706] text-white flex items-center justify-center font-extrabold text-base shrink-0 shadow-2xs">
                                {block.name.replace(/[^А-ЯЁA-Z0-9]/gi, '').slice(0, 2) || 'Б'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm sm:text-base font-bold text-[#0F172A] uppercase tracking-tight">{block.name}</h4>
                                  <span className="text-[11px] font-bold px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                                    {blockFloors.length} этажей
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {isBlockExpanded ? 'Нажмите, чтобы скрыть этажи' : 'Нажмите для редактирования этажей и квартир этого блока'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleBlockExpanded(block.id);
                                }}
                                className={`px-4 py-2 text-xs font-bold rounded transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                                  isBlockExpanded 
                                    ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' 
                                    : 'bg-[#0F172A] hover:bg-slate-800 text-white'
                                }`}
                              >
                                <span>{isBlockExpanded ? 'Закрыть' : 'Редактировать этажи'}</span>
                                {isBlockExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Block Content */}
                          {isBlockExpanded && (
                            <div className="p-4 sm:p-5 space-y-4 bg-slate-50/40 border-t border-slate-200">
                              {/* Add Floor Buttons Header */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                  Настройка и добавление этажей в {block.name}:
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => { setAddingFloorBlockId(block.id); setFloorTypeToCreate('apartment'); setNumAptsInput(4); }}
                                    className="px-3 py-2 bg-[#D97706] hover:bg-amber-700 text-white font-bold text-xs rounded transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                  >
                                    <Plus size={13} />
                                    <span>+ Квартиры</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={blockShopCount >= 4}
                                    onClick={() => { setAddingFloorBlockId(block.id); setFloorTypeToCreate('shop'); setNumAptsInput(3); }}
                                    className={`px-3 py-2 text-white font-bold text-xs rounded transition-colors cursor-pointer flex items-center gap-1 shadow-2xs ${
                                      blockShopCount >= 4 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                                    }`}
                                    title={blockShopCount >= 4 ? 'Максимум 4 коммерческих этажа' : 'Добавить коммерческий этаж'}
                                  >
                                    <Plus size={13} />
                                    <span>+ Магазин ({blockShopCount}/4)</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={blockBasementCount >= 2}
                                    onClick={() => { setAddingFloorBlockId(block.id); setFloorTypeToCreate('basement_shop'); setNumAptsInput(2); }}
                                    className={`px-3 py-2 text-white font-bold text-xs rounded transition-colors cursor-pointer flex items-center gap-1 shadow-2xs ${
                                      blockBasementCount >= 2 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'
                                    }`}
                                    title={blockBasementCount >= 2 ? 'Максимум 2 этажа в подвале' : 'Добавить подвальный этаж'}
                                  >
                                    <Plus size={13} />
                                    <span>+ Подвал ({blockBasementCount}/2)</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={blockParkingCount >= 3}
                                    onClick={() => { setAddingFloorBlockId(block.id); setFloorTypeToCreate('parking'); setNumAptsInput(10); }}
                                    className={`px-3 py-2 text-white font-bold text-xs rounded transition-colors cursor-pointer flex items-center gap-1 shadow-2xs ${
                                      blockParkingCount >= 3 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
                                    }`}
                                    title={blockParkingCount >= 3 ? 'Максимум 3 этажа парковки' : 'Добавить этаж парковки'}
                                  >
                                    <Plus size={13} />
                                    <span>+ Парковка ({blockParkingCount}/3)</span>
                                  </button>
                                </div>
                              </div>

                          {/* Inline Add Floor Form for this Block */}
                          {isAddingHere && (
                            <div className="p-4 bg-slate-50 border border-amber-200 rounded-md space-y-3">
                              <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                                {floorTypeToCreate === 'apartment' && `Добавление жилого этажа в ${block.name}`}
                                {floorTypeToCreate === 'shop' && `Добавление коммерческого этажа в ${block.name}`}
                                {floorTypeToCreate === 'basement_shop' && `Добавление подвального этажа в ${block.name}`}
                                {floorTypeToCreate === 'parking' && `Добавление парковочного этажа в ${block.name}`}
                              </span>
                              <div className={`grid grid-cols-1 ${floorTypeToCreate === 'basement_shop' ? 'sm:grid-cols-2' : ''} gap-3`}>
                                <div>
                                  <label className="block text-[10px] text-slate-500 uppercase font-mono mb-1">
                                    {floorTypeToCreate === 'apartment' && 'Количество квартир'}
                                    {floorTypeToCreate === 'shop' && 'Количество магазинов'}
                                    {floorTypeToCreate === 'basement_shop' && 'Количество объектов (магазин/склад)'}
                                    {floorTypeToCreate === 'parking' && 'Количество парковочных мест'}
                                  </label>
                                  <input 
                                    type="number" 
                                    value={numAptsInput} 
                                    min={1} 
                                    max={50} 
                                    className="w-full text-xs p-2.5 border border-slate-200 rounded bg-white font-bold"
                                    onChange={(e) => setNumAptsInput(parseInt(e.target.value) || 4)} 
                                  />
                                </div>
                                {floorTypeToCreate === 'basement_shop' && (
                                  <div>
                                    <label className="block text-[10px] text-slate-500 uppercase font-mono mb-1">
                                      Назначение / Название подвала (макс. 10 символов)
                                    </label>
                                    <input 
                                      type="text" 
                                      maxLength={10}
                                      value={customLabelInput} 
                                      placeholder="Например: Магазин, Склад"
                                      className="w-full text-xs p-2.5 border border-slate-200 rounded bg-white font-bold"
                                      onChange={(e) => setCustomLabelInput(e.target.value.slice(0, 10))} 
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 justify-end pt-1">
                                <button 
                                  onClick={() => handleAddFloor(block.id)} 
                                  className="px-4 py-2 bg-[#D97706] hover:bg-amber-700 text-white font-bold text-xs rounded cursor-pointer uppercase"
                                >
                                  Создать
                                </button>
                                <button 
                                  onClick={() => setAddingFloorBlockId(null)} 
                                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded cursor-pointer uppercase"
                                >
                                  Отмена
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Floors List for this Block */}
                          <div className="space-y-3 pt-1">
                            {blockFloors.length === 0 ? (
                              <div className="py-8 border border-dashed border-slate-200 rounded text-center text-slate-400 text-xs italic">
                                В {block.name} пока не создано ни одного этажа.
                              </div>
                            ) : (
                              [...blockFloors]
                                .sort((a, b) => b.floorNumber - a.floorNumber)
                                .map((floor) => {
                                  const isExpanded = !!expandedFloorIds[floor.id];
                                  const aptList = floor.apartments || [];

                                  return (
                                    <div key={floor.id} className="border border-slate-200 bg-slate-50/20 rounded overflow-hidden shadow-2xs">
                                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded bg-[#0F172A] text-white flex items-center justify-center text-xs font-mono font-bold">
                                            {floor.floorNumber}
                                          </div>
                                          <div>
                                            <span className="text-xs sm:text-sm font-bold text-[#0F172A] tracking-tight block">
                                              ЭТАЖ {floor.floorNumber}
                                              {floor.floorType === 'parking' && ` (${(floor.customLabel || 'ПАРКОВКА').toUpperCase()})`}
                                              {floor.floorType === 'basement_shop' && ` (${(floor.customLabel || 'МАГАЗИН В ПОДВАЛЕ').toUpperCase()})`}
                                              {(floor.floorType === 'shop' || (!floor.floorType && floor.isShopFloor)) && ` (${(floor.customLabel || 'МАГАЗИНЫ').toUpperCase()})`}
                                              {floor.floorType === 'apartment' && floor.customLabel && ` (${floor.customLabel.toUpperCase()})`}
                                              {` (${block.name})`}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono block">
                                              {aptList.length} {
                                                floor.floorType === 'parking' ? 'парк. мест' :
                                                floor.floorType === 'basement_shop' ? (floor.customLabel ? floor.customLabel.toLowerCase() : 'магазин подвал') :
                                                (floor.floorType === 'shop' || floor.isShopFloor) ? 'магазинов' : 'квартир'
                                              } • Номера: {aptList.length > 0 ? `${aptList[0].number} до ${aptList[aptList.length - 1].number}` : 'пусто'}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenDuplicateModal(floor)}
                                            className="p-1.5 text-amber-600 hover:text-white hover:bg-[#D97706] bg-white border border-slate-300 rounded transition-all cursor-pointer flex items-center justify-center shadow-2xs"
                                            title="Дублировать настройки на другие этажи"
                                            id={`btn-duplicate-floor-${floor.id}`}
                                          >
                                            <Copy size={13} />
                                          </button>
                                          <button
                                            onClick={() => toggleFloorExpanded(floor.id)}
                                            className="px-3 py-1.5 text-[10px] font-bold bg-white border border-slate-300 text-slate-600 hover:text-[#0F172A] hover:bg-slate-50 rounded transition-colors cursor-pointer flex items-center gap-1 uppercase"
                                          >
                                            {isExpanded ? 'Свернуть' : 'Редактировать'}
                                            {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                          </button>
                                          <button
                                            onClick={() => handleDeleteFloor(floor.id)}
                                            className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-500 bg-white border border-slate-300 rounded transition-all cursor-pointer"
                                            title="Удалить этаж"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      </div>

                                      {isExpanded && (
                                        <div className="p-4 bg-white border-t border-slate-100 space-y-4">
                                          
                                          {/* Номи таъинот / катибаи ошёна */}
                                          <div className="bg-amber-50/60 border border-amber-200/80 rounded p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                              <label className="block text-[10px] text-[#0F172A] font-bold uppercase tracking-wider mb-0.5">
                                                Назначение / Название этажа (макс. 10 символов)
                                              </label>
                                              <p className="text-[9px] text-slate-500">
                                                Это слово (например: {floor.floorType === 'basement_shop' ? 'Магазин, Склад, Офис' : 'Магазин, Парковка'}) отображается в Шахматке.
                                              </p>
                                            </div>
                                            <input
                                              type="text"
                                              maxLength={10}
                                              value={floor.customLabel || ''}
                                              placeholder={floor.floorType === 'basement_shop' ? 'Магазин' : 'Макс. 10 букв'}
                                              className="text-xs p-2 border border-slate-300 rounded bg-white font-bold w-full sm:w-56 focus:border-amber-500"
                                              onChange={(e) => handleUpdateFloor(floor.id, { customLabel: e.target.value.slice(0, 10) })}
                                            />
                                          </div>

                                          {/* Общая планировка этажа */}
                                          <div className="bg-[#F8FAFC] border border-slate-200 rounded p-4 space-y-3">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
                                              <div>
                                                <h5 className="text-[11px] font-extrabold text-[#0F172A] uppercase tracking-wider">Общая схема этажа (Планировка этажа {floor.floorNumber})</h5>
                                                <p className="text-[9px] text-[#64748B] mt-0.5 tracking-tight leading-relaxed">
                                                  Это изображение показывает общую структуру этажа {floor.floorNumber} в Шахматке. Если пусто, первое изображение такого же типа этажа ({floor.isShopFloor ? 'коммерция' : 'квартиры'}) будет использовано как общее.
                                                </p>
                                              </div>
                                              
                                              {floor.floorPlanUrl && (
                                                <button
                                                  type="button"
                                                  onClick={() => handleUpdateFloor(floor.id, { floorPlanUrl: '' })}
                                                  className="text-[9px] font-black text-rose-600 hover:text-rose-800 uppercase flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded cursor-pointer"
                                                >
                                                  Удалить
                                                </button>
                                              )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                              <div>
                                                <label className="block text-[9px] text-[#64748B] font-bold uppercase tracking-wider mb-1">Ссылка на изображение (URL)</label>
                                                <input
                                                  type="text"
                                                  value={floor.floorPlanUrl || ''}
                                                  placeholder="Например: https://example.com/floor-plan.jpg"
                                                  className="w-full text-xs p-2 border border-slate-200 rounded bg-white font-mono focus:border-amber-500"
                                                  onChange={(e) => handleUpdateFloor(floor.id, { floorPlanUrl: e.target.value })}
                                                />
                                              </div>

                                              <div>
                                                <label className="block text-[9px] text-[#64748B] font-bold uppercase tracking-wider mb-1">Загрузка файла</label>
                                                <div className="flex items-center gap-2">
                                                  <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-slate-250 rounded bg-white hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700 select-none">
                                                    <FileUp size={14} className="text-slate-400" />
                                                    <span>
                                                      {uploadingFloorId === floor.id ? "Загрузка..." : "Выбрать изображение"}
                                                    </span>
                                                    <input
                                                      type="file"
                                                      accept="image/*"
                                                      className="hidden"
                                                      disabled={uploadingFloorId === floor.id}
                                                      onChange={(e) => handleFloorPlanUpload(e, floor.id)}
                                                    />
                                                  </label>
                                                </div>
                                              </div>
                                            </div>

                                            {floor.floorPlanUrl && (
                                              <div className="mt-4 pt-4 border-t border-slate-200 space-y-4" id={`floor-plan-customizer-${floor.id}`}>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                  
                                                  {/* Left column: background type and scale controls */}
                                                  <div className="space-y-4">
                                                    {/* Background Choice */}
                                                    <div>
                                                      <span className="block text-[9px] text-[#475569] font-black uppercase tracking-wider mb-2">Фон под изображением планировки (SVG/PNG)</span>
                                                      <div className="flex items-center gap-2">
                                                        <button
                                                          type="button"
                                                          onClick={() => handleUpdateFloor(floor.id, { planBgType: 'transparent' })}
                                                          className={`flex-1 py-2 px-3 rounded text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                                                            (floor.planBgType || 'transparent') === 'transparent'
                                                              ? 'bg-[#0F172A] text-white border-[#0F172A]'
                                                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                          }`}
                                                        >
                                                          Вариант 1: Без фона
                                                        </button>
                                                        <button
                                                          type="button"
                                                          onClick={() => handleUpdateFloor(floor.id, { planBgType: 'color' })}
                                                          className={`flex-1 py-2 px-3 rounded text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                                                            floor.planBgType === 'color'
                                                              ? 'bg-[#0F172A] text-white border-[#0F172A]'
                                                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                          }`}
                                                        >
                                                          Вариант 2: Цветной фон
                                                        </button>
                                                      </div>
                                                    </div>

                                                    {/* Color Picker (Only if background type is color) */}
                                                    {floor.planBgType === 'color' && (
                                                      <div className="bg-white p-3 border border-slate-200 rounded space-y-2.5">
                                                        <span className="block text-[8px] text-[#64748B] font-bold uppercase tracking-widest">Выбор цвета фона</span>
                                                        
                                                        <div className="flex flex-wrap items-center gap-3">
                                                          {/* Preset Circle Color buttons */}
                                                          <div className="flex flex-wrap gap-1.5">
                                                            {[
                                                              { name: 'Белый', value: '#FFFFFF' },
                                                              { name: 'Светло-серый', value: '#F1F5F9' },
                                                              { name: 'Бежевый', value: '#FAF6F0' },
                                                              { name: 'Тёмный', value: '#0F172A' },
                                                            ].map(colorOpt => (
                                                              <button
                                                                key={colorOpt.value}
                                                                type="button"
                                                                onClick={() => handleUpdateFloor(floor.id, { planBgColor: colorOpt.value })}
                                                                className={`w-6 h-6 rounded-full border transition-all relative cursor-pointer ${
                                                                  (floor.planBgColor || '#FFFFFF').toUpperCase() === colorOpt.value.toUpperCase()
                                                                    ? 'ring-2 ring-indigo-500 scale-110 border-indigo-600'
                                                                    : 'border-slate-250 hover:scale-105'
                                                                }`}
                                                                style={{ backgroundColor: colorOpt.value }}
                                                                title={colorOpt.name}
                                                              />
                                                            ))}
                                                          </div>

                                                          <span className="text-slate-300">|</span>

                                                          {/* Custom color picker */}
                                                          <div className="flex items-center gap-2">
                                                            <input
                                                              type="color"
                                                              value={floor.planBgColor || '#FFFFFF'}
                                                              onChange={(e) => handleUpdateFloor(floor.id, { planBgColor: e.target.value })}
                                                              className="w-8 h-8 p-0.5 rounded border border-slate-200 cursor-pointer bg-transparent"
                                                              title="Выбор любого цвета"
                                                            />
                                                            <input
                                                              type="text"
                                                              value={floor.planBgColor || '#FFFFFF'}
                                                              onChange={(e) => handleUpdateFloor(floor.id, { planBgColor: e.target.value })}
                                                              className="w-20 text-[10px] font-mono py-1 px-1.5 border border-slate-200 rounded text-center uppercase font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                            />
                                                          </div>
                                                        </div>
                                                      </div>
                                                    )}

                                                    {/* Scaling ratio bar */}
                                                    <div>
                                                      <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[9px] text-[#475569] font-black uppercase tracking-wider">Масштаб планировки (Размер планировки)</span>
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[9px] rounded-full font-bold">
                                                          {floor.planScale || 100}%
                                                        </span>
                                                      </div>
                                                      <div className="flex items-center gap-3">
                                                        <span className="text-[9px] text-slate-400 font-bold">30%</span>
                                                        <input
                                                          type="range"
                                                          min="30"
                                                          max="200"
                                                          value={floor.planScale || 100}
                                                          onChange={(e) => handleUpdateFloor(floor.id, { planScale: parseInt(e.target.value, 10) })}
                                                          className="flex-1 accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                                        />
                                                        <span className="text-[9px] text-slate-400 font-bold">200%</span>
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {/* Right column: Interactive real-time live preview */}
                                                  <div className="flex flex-col">
                                                    <span className="block text-[9px] text-[#475569] font-black uppercase tracking-wider mb-2">Предварительный просмотр плана (Preview)</span>
                                                    
                                                    <div 
                                                      className="flex-1 border border-slate-200 rounded-xl min-h-[160px] flex items-center justify-center relative p-4 overflow-hidden shadow-2xs"
                                                      style={{
                                                        backgroundColor: (floor.planBgType === 'color' ? (floor.planBgColor || '#FFFFFF') : 'transparent'),
                                                        backgroundImage: (floor.planBgType || 'transparent') === 'transparent'
                                                          ? 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)' 
                                                          : 'none',
                                                        backgroundSize: (floor.planBgType || 'transparent') === 'transparent' ? '12px 12px' : 'none'
                                                      }}
                                                    >
                                                      <div className="absolute top-1.5 left-2 text-[8px] font-mono text-slate-400 uppercase tracking-widest pointer-events-none">
                                                        Живой просмотр ({floor.planBgType === 'color' ? 'С фоном' : 'Прозрачный'})
                                                      </div>

                                                      <div 
                                                        className="transition-all duration-300 flex items-center justify-center"
                                                        style={{
                                                          width: `${floor.planScale || 100}%`,
                                                          maxWidth: '100%',
                                                        }}
                                                      >
                                                        <img
                                                          src={floor.floorPlanUrl}
                                                          alt={`Preview ${floor.floorNumber}`}
                                                          className="max-h-[140px] max-w-full object-contain"
                                                          referrerPolicy="no-referrer"
                                                        />
                                                      </div>
                                                    </div>
                                                  </div>

                                                </div>
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* Apartment list */}
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {aptList.map((apt) => (
                                              <div key={apt.id} className="border border-slate-200 p-3 bg-slate-50/50 rounded-sm relative group">
                                                {/* Apartment Delete Trigger */}
                                                <button
                                                  onClick={() => handleDeleteApartmentFromFloor(floor.id, apt.id)}
                                                  className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-100 border border-slate-200 bg-white hover:border-rose-100 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                                                  title={floor.isShopFloor ? "Удалить магазин" : "Удалить квартиру"}
                                                >
                                                  <Trash2 size={11} />
                                                </button>

                                                <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-150">
                                                  <span className="text-xs font-black text-[#0F172A] font-sans block">
                                                    {apt.name} (№{apt.number})
                                                  </span>
                                                </div>

                                                <div className="grid grid-cols-1 gap-2.5">
                                                  <div>
                                                    <label className="block text-[9px] text-[#64748B] font-bold uppercase tracking-wider">Площадь (м²)</label>
                                                    <input
                                                      type="text"
                                                      value={apt.area || ''}
                                                      placeholder="Например: 64.5"
                                                      className="w-full text-xs p-2 mt-0.5 border border-slate-200 rounded bg-white font-mono focus:border-amber-500"
                                                      onChange={(e) => handleUpdateApartment(floor.id, apt.id, { area: e.target.value })}
                                                    />
                                                  </div>

                                                  <div>
                                                    <label className="block text-[9px] text-[#64748B] font-bold uppercase tracking-wider mb-1">
                                                      {floor.floorType === 'parking' ? 'Статус парковки' :
                                                       floor.floorType === 'basement_shop' ? 'Статус магазина в подвале' :
                                                       floor.isShopFloor ? 'Статус магазина' : 'Статус квартиры'}
                                                    </label>
                                                    <div className="grid grid-cols-3 gap-1 select-none">
                                                      <button
                                                        type="button"
                                                        onClick={() => handleUpdateApartment(floor.id, apt.id, { status: 'free' })}
                                                        className={`py-1.5 px-1.5 text-[9px] font-black rounded border transition-all cursor-pointer text-center uppercase tracking-tight ${
                                                          (!apt.status || apt.status === 'free')
                                                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                                                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                                        }`}
                                                      >
                                                        Свободно
                                                       </button>
                                                       <button
                                                         type="button"
                                                         onClick={() => handleUpdateApartment(floor.id, apt.id, { status: 'booked' })}
                                                         className={`py-1.5 px-1.5 text-[9px] font-black rounded border transition-all cursor-pointer text-center uppercase tracking-tight ${
                                                           apt.status === 'booked'
                                                             ? 'bg-sky-600 text-white border-sky-700 shadow-2xs'
                                                             : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                                         }`}
                                                       >
                                                         Забронировано
                                                       </button>
                                                       <button
                                                         type="button"
                                                         onClick={() => handleUpdateApartment(floor.id, apt.id, { status: 'sold' })}
                                                         className={`py-1.5 px-1.5 text-[9px] font-black rounded border transition-all cursor-pointer text-center uppercase tracking-tight ${
                                                           apt.status === 'sold'
                                                             ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                                                             : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                                         }`}
                                                       >
                                                         Продано
                                                       </button>
                                                     </div>
                                                   </div>
                                                   
                                                   <div>
                                                     <label className="block text-[9px] text-[#64748B] font-bold uppercase tracking-wider">Изображение планировки (Чертеж)</label>
                                                     <div className="flex gap-1 mt-0.5">
                                                       <input
                                                         type="text"
                                                         value={apt.planUrl || ''}
                                                         placeholder="Ссылка на фото (URL)"
                                                         className="flex-1 text-[11px] p-2 border border-slate-200 rounded bg-white focus:border-amber-500"
                                                         onChange={(e) => handleUpdateApartment(floor.id, apt.id, { planUrl: e.target.value })}
                                                       />
                                                       <label 
                                                         className={`cursor-pointer border border-slate-200 text-white px-2.5 py-2 rounded flex items-center justify-center shrink-0 transition-colors ${
                                                           uploadingAptId === apt.id 
                                                             ? 'bg-amber-600 border-amber-500 cursor-not-allowed' 
                                                             : 'bg-[#0F172A] hover:bg-[#1E293B]'
                                                         }`} 
                                                         title={uploadingAptId === apt.id ? "Загрузка..." : "Загрузить фото планировки"}
                                                       >
                                                         {uploadingAptId === apt.id ? (
                                                           <RefreshCw size={12} className="animate-spin" />
                                                         ) : (
                                                           <FileUp size={12} />
                                                         )}
                                                         <input
                                                           type="file"
                                                           accept="image/*"
                                                           className="hidden"
                                                           disabled={uploadingAptId === apt.id}
                                                           onChange={(e) => handleApartmentPlanUpload(e, floor.id, apt.id)}
                                                         />
                                                       </label>
                                                     </div>
                                                   </div>

                                                   {/* Tiny Preview Thumbnail */}
                                                   {apt.planUrl && (
                                                     <div className="h-10 w-full mt-1 border border-slate-200 rounded overflow-hidden bg-slate-100 flex items-center justify-center p-0.5 relative">
                                                       <img src={apt.planUrl} alt="Preview" className="h-full object-contain" referrerPolicy="no-referrer" />
                                                       <span className="absolute right-1 bottom-0.5 text-[8px] text-slate-400 font-mono tracking-widest leading-none">✓ ИЗОБРАЖЕНИЕ ЗАГРУЖЕНО</span>
                                                     </div>
                                                   )}
                                                 </div>
                                               </div>
                                             ))}
                                           </div>

                                           {/* Add single room button inside floor */}
                                           <div className="pt-2 border-t border-slate-100 flex justify-end">
                                             <button
                                               onClick={() => handleAddNewApartmentToFloor(floor.id)}
                                               className="px-3.5 py-2 text-[10px] font-bold border border-slate-250 hover:border-slate-800 text-[#1E293B] bg-white rounded flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                                             >
                                               <Plus size={12} />
                                               <span>{floor.isShopFloor ? '+ ДОБАВИТЬ НОВЫЙ МАГАЗИН' : '+ ДОБАВИТЬ НОВУЮ КВАРТИРУ'}</span>
                                            </button>
                                          </div>

                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                  </div>

                  {/* BOTTOM SAVE BAR */}
                  <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={handleSaveGeneralSettings}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-5 py-3 bg-[#D97706] hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-sm transition-all cursor-pointer uppercase tracking-wider shadow"
                      id="save-chessboard-btn"
                    >
                      {isSaving ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />}
                      <span>Сохранить</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 8: ANALYTICS INTEGRATIVE GRAPHICAL DASHBOARD */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <AnalyticsView />
                </div>
              )}

              {/* TAB 9: FILE AND ASSET STORAGE MANAGER */}
              {activeTab === 'storage_manager' && (
                <div className="space-y-6">
                  <StorageManager />
                </div>
              )}

              {/* TAB 10: AUTHENTICATION / AUTHORIZATION LINK SETTINGS */}
              {activeTab === 'auth' && (
                <div className="space-y-6" id="tab-auth">
                  <div className="bg-white p-6 sm:p-8 rounded-sm border border-slate-200 shadow-xs space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <h3 className="text-md sm:text-lg font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
                        <KeyRound size={20} className="text-[#D97706]" />
                        Авторизация (Кнопка Вход)
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Настройка ссылки (URL) для кнопки "Вход" в шапке сайта.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Ссылка для кнопки "Вход" (URL)
                        </label>
                        <input
                          type="text"
                          value={localSettings.authUrl || ''}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, authUrl: e.target.value }))}
                          className="w-full text-sm font-semibold px-3 py-2.5 bg-white border border-slate-250 rounded-sm text-slate-800 focus:outline-none focus:border-[#0F172A]"
                          id="input-auth-url"
                          placeholder="Например: https://example.com/login или https://crm.myproject.tj"
                        />
                        <p className="text-[11px] text-slate-400">
                          При нажатии кнопки "Вход" в шапке сайта, пользователь будет перенаправлен по этой ссылке.
                        </p>
                      </div>

                      {/* Submit Block */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                        <p className="text-[11px] text-slate-400 leading-normal flex items-center gap-1.5 font-mono">
                          <Info size={12} className="text-slate-400 shrink-0" />
                          Сохранение в базу Supabase и локальный кэш будет применено автоматически.
                        </p>
                        <button
                          onClick={handleSaveGeneralSettings}
                          disabled={isSaving}
                          className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#D97706] hover:bg-[#B45309] text-white font-bold rounded-sm text-xs cursor-pointer disabled:opacity-50 transition-colors uppercase tracking-wider"
                          id="save-auth-btn"
                        >
                          {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                          <span>Сохранить</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Styled toast saving feedback banner */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white p-4 rounded-sm shadow-xl border border-[#D97706]/30 flex items-center gap-3.5 max-w-sm"
          >
            <div className="w-8 h-8 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center shrink-0">
              <Check size={18} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Успешно сохранено!</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Данные успешно сохранены и обновлены.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UPDATE STATUS UNLOCK PROMPT MODAL */}
      <AnimatePresence>
        {isUnlockConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans"
            id="status-unlock-modal-overlay"
            onClick={() => setIsUnlockConfirmOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-left"
              onClick={(e) => e.stopPropagation()}
              id="status-unlock-modal-box"
            >
              <div className="bg-amber-600 text-white px-6 py-4 flex items-center gap-3">
                <AlertCircle size={22} className="shrink-0" />
                <h3 className="text-sm font-black tracking-wider uppercase font-sans">Предупреждение об изменении</h3>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed font-sans font-medium">
                  Вы уверены, что хотите разрешить исправление проданных квартир? Это может привести к расхождениям в официальных данных.
                </p>
                <div className="flex gap-2 font-sans">
                  <button
                    type="button"
                    onClick={() => setIsUnlockConfirmOpen(false)}
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all uppercase text-center cursor-pointer"
                  >
                    Нет
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUnlockSoldEdits(true);
                      setIsUnlockConfirmOpen(false);
                    }}
                    className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all uppercase text-center cursor-pointer"
                  >
                    Да / Продолжить
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UPDATE STATUS SAVE PREVIEW LIST MODAL */}
      <AnimatePresence>
        {isSaveConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans"
            id="status-save-modal-overlay"
            onClick={() => setIsSaveConfirmOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white border border-slate-205 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-left"
              onClick={(e) => e.stopPropagation()}
              id="status-save-modal-box"
            >
              <div className="bg-[#024F33] text-white px-6 py-4 flex items-center gap-3">
                <CheckCircle size={22} className="shrink-0" />
                <h3 className="text-sm font-black tracking-wider uppercase font-sans">Подтверждение изменения статусов</h3>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-500 font-bold font-sans">
                  Пожалуйста, проверьте список изменений перед сохранением:
                </p>

                <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-lg p-3 bg-slate-50 space-y-2.5">
                  {tempChangesList.map((ch, idx) => {
                    const oldLabel = ch.oldStatus === 'sold' ? 'Продано' : ch.oldStatus === 'booked' ? 'Забронировано' : 'Свободно';
                    const newLabel = ch.newStatus === 'sold' ? 'Продано' : ch.newStatus === 'booked' ? 'Забронировано' : 'Свободно';
                    
                    return (
                      <div key={idx} className="text-xs border-b border-slate-200/60 pb-2 last:border-0 last:pb-0 font-sans">
                        <div className="font-extrabold text-slate-800">
                          🏢 Этаж {ch.floorNum} — Помещение №{ch.aptNum} ({ch.aptName})
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[9px] font-bold">{oldLabel}</span>
                          <span className="text-slate-400 font-bold font-mono">→</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                            ch.newStatus === 'sold' ? 'bg-red-100 text-red-800' : 
                            ch.newStatus === 'booked' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-705'
                          }`}>{newLabel}</span>
                          
                          {ch.newStatus === 'sold' && ch.buyerName && (
                            <span className="text-slate-600 font-extrabold ml-1 bg-red-50 text-red-800 px-1.5 py-0.5 rounded text-[10px]">
                              👥 Покупатель: {ch.buyerName}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-sans font-semibold">
                  Вы уверены в правильности этих данных? При нажатии "Подтвердить" статусы будут сохранены на сайте, а уведомление будет отправлено в бота.
                </p>

                <div className="flex gap-2 font-sans pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSaveConfirmOpen(false)}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all uppercase text-center cursor-pointer font-sans"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitStatusChanges}
                    className="flex-1 py-3 px-4 bg-[#024F33] hover:bg-[#013522] text-white font-bold text-xs rounded-xl transition-all uppercase text-center cursor-pointer font-sans"
                  >
                    Подтвердить и сохранить
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* DUPLICATE FLOOR SETTINGS MODAL */}
        {duplicateModalFloor && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
            onClick={() => setDuplicateModalFloor(null)}
            id="duplicate-floor-modal-overlay"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden text-left"
              onClick={(e) => e.stopPropagation()}
              id="duplicate-floor-modal-box"
            >
              {/* Modal Header */}
              <div className="bg-[#0F172A] text-white p-4 sm:p-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded bg-[#D97706] text-white flex items-center justify-center shrink-0">
                    <Copy size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider">
                      Копирование этажа {duplicateModalFloor.floorNumber}
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      {currentBlocks.find(b => b.id === (duplicateModalFloor.blockId || currentBlocks[0]?.id))?.name || 'Блок'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDuplicateModalFloor(null)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer text-xl font-bold leading-none"
                  title="Назад"
                >
                  &times;
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                
                {/* Information box */}
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-md text-xs text-amber-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 uppercase text-[11px] text-amber-950">
                    <Info size={14} className="text-[#D97706]" />
                    <span>Настройки, которые будут скопированы:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-700 pl-1 font-medium">
                    <li>Общая планировка этажа (изображение и настройки фона)</li>
                    <li>Количество квартир/коммерции ({duplicateModalFloor.apartments?.length || 0} шт.)</li>
                    <li>Планировка, площадь (м²) и статусы помещений</li>
                  </ul>
                </div>

                {/* Target Floors Selection List */}
                <div>
                  {(() => {
                    const blockId = duplicateModalFloor.blockId || currentBlocks[0]?.id;
                    const otherFloors = (localSettings.floors || [])
                      .filter(f => (f.blockId || currentBlocks[0]?.id) === blockId && f.id !== duplicateModalFloor.id)
                      .sort((a, b) => b.floorNumber - a.floorNumber);

                    if (otherFloors.length === 0) {
                      return (
                        <div className="p-6 border border-dashed border-slate-200 rounded text-center text-slate-400 text-xs italic">
                          В этом блоке нет других этажей. Пожалуйста, сначала добавьте новые этажи.
                        </div>
                      );
                    }

                    const isAllSelected = otherFloors.length > 0 && otherFloors.every(f => selectedTargetFloorIds.includes(f.id));

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                            Выбор этажей для копирования:
                          </span>
                          <button
                            type="button"
                            onClick={() => isAllSelected ? handleDeselectAllTargets() : handleSelectAllTargets(otherFloors)}
                            className="text-[11px] text-[#D97706] hover:underline font-bold uppercase cursor-pointer"
                          >
                            {isAllSelected ? 'Отменить все' : 'Выбрать все'}
                          </button>
                        </div>

                        <div className="border border-slate-200 rounded-md divide-y divide-slate-100 max-h-56 overflow-y-auto bg-slate-50/50">
                          {otherFloors.map(targetFloor => {
                            const isChecked = selectedTargetFloorIds.includes(targetFloor.id);
                            return (
                              <label 
                                key={targetFloor.id} 
                                className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                                  isChecked ? 'bg-amber-50/60' : 'hover:bg-slate-100/80'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleTargetFloor(targetFloor.id)}
                                    className="w-4 h-4 accent-[#D97706] rounded cursor-pointer"
                                  />
                                  <div>
                                    <span className="text-xs font-bold text-[#0F172A] block">
                                      Этаж {targetFloor.floorNumber} {targetFloor.isShopFloor ? '(Коммерция)' : '(Жилой)'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono block">
                                      {targetFloor.apartments?.length || 0} пом. {targetFloor.floorPlanUrl ? '• Есть план' : '• Без плана'}
                                    </span>
                                  </div>
                                </div>

                                {isChecked && (
                                  <span className="text-[10px] font-bold text-[#D97706] bg-amber-100 px-2 py-0.5 rounded uppercase">
                                    Выбрано
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-500">
                  Выбрано: <strong className="text-[#0F172A]">{selectedTargetFloorIds.length}</strong> этажей
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDuplicateModalFloor(null)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded transition-colors uppercase tracking-wider cursor-pointer"
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyFloorDuplication}
                    disabled={selectedTargetFloorIds.length === 0}
                    className="px-5 py-2 bg-[#D97706] hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded transition-colors uppercase tracking-wider cursor-pointer flex items-center gap-1.5 shadow-xs"
                    id="btn-confirm-duplicate-floors"
                  >
                    <Copy size={13} />
                    <span>Сохранить</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
