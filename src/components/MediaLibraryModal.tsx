import React, { useState, useRef, useEffect } from 'react';
import { MediaLibraryItem } from '../types';
import { 
  X, FolderPlus, Download, Trash2, Image as ImageIcon, 
  FileCode, FileText, Search, Filter, Sparkles, Check, 
  ExternalLink, Eye, ArrowUpRight, ArrowLeft 
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: MediaLibraryItem[];
  onAddItem: (item: MediaLibraryItem) => void;
  onDeleteItem: (id: string) => void;
  onSelectForStudio?: (url: string) => void;
}

export const INITIAL_LIBRARY_ITEMS: MediaLibraryItem[] = [
  {
    id: 'lib_img_1',
    name: 'Estudio_Multi_IA_Masterpiece.jpg',
    type: 'image',
    format: 'JPG / PNG',
    size: 2450000,
    url: '/src/assets/images/multi_ai_studio_showcase_1792558522719.jpg',
    date: 'Hoy, 21:55',
    tags: ['4K', 'Cinemático', '4 IAs', 'Holográfico'],
    source: 'generated'
  },
  {
    id: 'lib_img_2',
    name: 'Workspace_Cyber_Futurista.jpg',
    type: 'image',
    format: 'JPG / PNG',
    size: 1980000,
    url: '/src/assets/images/futuristic_cyber_workspace_1792558524584.jpg',
    date: 'Hoy, 21:55',
    tags: ['Sci-Fi', 'Código', 'Volumétrico'],
    source: 'generated'
  },
  {
    id: 'lib_img_3',
    name: 'Paisaje_Cinematico_Crepusculo.jpg',
    type: 'image',
    format: 'JPG / PNG',
    size: 2210000,
    url: '/src/assets/images/cinematic_nature_artwork_1792558523456.jpg',
    date: 'Hoy, 21:55',
    tags: ['Naturaleza', 'Fotorealismo', 'Bioluminiscente'],
    source: 'generated'
  }
];

export const MediaLibraryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  items,
  onAddItem,
  onDeleteItem,
  onSelectForStudio,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'image' | 'code' | 'document'>('all');
  const [previewItem, setPreviewItem] = useState<MediaLibraryItem | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const isImg = file.type.startsWith('image/');
      const isCode = /\.(js|jsx|ts|tsx|py|html|css|json|md|sql)$/i.test(file.name);
      const reader = new FileReader();

      reader.onload = (event) => {
        const url = event.target?.result as string;
        const newItem: MediaLibraryItem = {
          id: `lib_item_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          name: file.name,
          type: isImg ? 'image' : isCode ? 'code' : 'document',
          format: file.name.split('.').pop()?.toUpperCase() || 'BIN',
          size: file.size,
          url: url,
          date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tags: [isImg ? 'Imagen' : isCode ? 'Código' : 'Documento', 'Subido'],
          source: 'uploaded'
        };
        onAddItem(newItem);
      };

      if (isImg) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsDataURL(file);
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || item.type === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const downloadMedia = (item: MediaLibraryItem, targetExt: 'png' | 'jpg' | 'raw') => {
    const a = document.createElement('a');
    a.href = item.url;
    if (targetExt === 'png' || targetExt === 'jpg') {
      const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
      a.download = `${baseName}.${targetExt}`;
    } else {
      a.download = item.name;
    }
    a.click();
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Navigation Banner with Prominent Back Button */}
        <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>← Volver Atrás al Workspace</span>
          </button>

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Presiona <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400 font-mono text-[10px]">ESC</kbd> o haz clic afuera para salir
          </span>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Cerrar y volver (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Biblioteca Multimedia y de Archivos
                <span className="text-[11px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-medium">
                  {items.length} Elementos Guardados
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Almacén seguro de imágenes creadas por las 4 IAs y archivos cargados listos para descargar en PNG o JPG.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10 cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Agregar a la Biblioteca</span>
            </button>

            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Volver Atrás</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                selectedCategory === 'all' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({items.length})
            </button>
            <button
              onClick={() => setSelectedCategory('image')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                selectedCategory === 'image' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Imágenes ({items.filter(i => i.type === 'image').length})
            </button>
            <button
              onClick={() => setSelectedCategory('code')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                selectedCategory === 'code' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Código ({items.filter(i => i.type === 'code').length})
            </button>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nombre o etiqueta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Media Grid */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-900/50">
          {filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2">
              <FolderPlus className="w-12 h-12 stroke-1 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">No se encontraron elementos</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Agrega archivos o guarda imágenes generadas en el estudio para verlas en tu biblioteca permanente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  {/* Thumbnail / Preview */}
                  <div className="h-44 bg-slate-900 relative overflow-hidden flex items-center justify-center">
                    {item.type === 'image' ? (
                      <img
                        src={item.url}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : item.type === 'code' ? (
                      <div className="w-full h-full p-4 font-mono text-[11px] text-slate-400 bg-slate-950 overflow-hidden leading-relaxed">
                        <FileCode className="w-8 h-8 text-amber-400 mb-2" />
                        <div className="text-xs font-semibold text-white">{item.name}</div>
                        <span className="text-[10px] text-slate-500">Archivo de código fuente</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <FileText className="w-10 h-10 stroke-1 mb-2 text-indigo-400" />
                        <span className="text-xs text-slate-300">{item.name}</span>
                      </div>
                    )}

                    {/* Tag badge */}
                    <div className="absolute top-2 left-2 flex gap-1">
                      <span className="bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-semibold text-amber-400 border border-slate-800">
                        {item.format}
                      </span>
                    </div>

                    {/* Quick view button overlay */}
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs text-white font-medium cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Ver Detalles</span>
                    </button>
                  </div>

                  {/* Info and Actions */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate" title={item.name}>
                          {item.name}
                        </h4>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{formatBytes(item.size)}</span>
                          <span>•</span>
                          <span>{item.date}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-900 transition-colors shrink-0"
                        title="Eliminar de biblioteca"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Download Buttons for PNG / JPG */}
                    <div className="pt-2 border-t border-slate-850 flex items-center justify-between gap-1.5">
                      {item.type === 'image' ? (
                        <>
                          <button
                            onClick={() => downloadMedia(item, 'png')}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            title="Descargar en formato PNG sin pérdida"
                          >
                            <Download className="w-3 h-3" />
                            PNG
                          </button>

                          <button
                            onClick={() => downloadMedia(item, 'jpg')}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            title="Descargar en formato JPG optimizado"
                          >
                            <Download className="w-3 h-3" />
                            JPG
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => downloadMedia(item, 'raw')}
                          className="w-full py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium flex items-center justify-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          Descargar Archivo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>Archivos e imágenes almacenados en almacenamiento local permanente del navegador.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
};
