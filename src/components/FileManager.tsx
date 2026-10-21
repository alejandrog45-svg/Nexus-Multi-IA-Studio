import React, { useState, useRef } from 'react';
import { AttachedFile } from '../types';
import { 
  Upload, FileText, Code2, Plus, 
  Trash2, Edit3, Check, X, Download, FolderOpen, 
  CheckSquare, Square, Eye, AlertCircle, Save, GitCompare
} from 'lucide-react';

interface Props {
  files: AttachedFile[];
  onAddFile: (file: AttachedFile) => void;
  onUpdateFile: (id: string, updates: Partial<AttachedFile>) => void;
  onDeleteFile: (id: string) => void;
  onToggleContext: (id: string) => void;
}

export const FileManager: React.FC<Props> = ({
  files,
  onAddFile,
  onUpdateFile,
  onDeleteFile,
  onToggleContext,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(files[0]?.id || null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFileContent, setEditFileContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [localFolderHandle, setLocalFolderHandle] = useState<any>(null);
  const [folderName, setFolderName] = useState<string | null>(null);

  const currentFile = files.find(f => f.id === selectedFileId);

  // File System Access API: Open Local Folder
  const handleOpenLocalDirectory = async () => {
    if (!('showDirectoryPicker' in window)) {
      alert('Tu navegador no soporta la File System Access API nativa. Puedes usar el botón de Cargar Archivos para seleccionar múltiples archivos.');
      return;
    }

    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      setLocalFolderHandle(dirHandle);
      setFolderName(dirHandle.name);

      // Iterate through files in directory
      let loadedCount = 0;
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          // Ignore heavy binaries / hidden files
          if (entry.name.startsWith('.') || entry.name.includes('lock') || entry.name.endsWith('.bin')) continue;
          
          try {
            const file = await entry.getFile();
            if (file.size > 1024 * 1024) continue; // max 1MB per file

            const text = await file.text();
            const newFile: AttachedFile = {
              id: `local_${entry.name}_${Date.now()}`,
              name: entry.name,
              size: file.size,
              type: file.type || 'text/plain',
              content: text,
              isText: true,
              uploadedAt: new Date().toLocaleTimeString(),
              includedInContext: loadedCount < 5, // auto-include first 5 in context
              language: entry.name.split('.').pop() || 'text',
            };
            onAddFile(newFile);
            loadedCount++;
          } catch (e) {
            console.warn(`Could not read ${entry.name}:`, e);
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Directory access error:', err);
      }
    }
  };

  // Standard File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    Array.from(uploadedFiles).forEach((file) => {
      const isText = file.type.startsWith('text/') || 
        /\.(js|jsx|ts|tsx|py|html|css|json|md|csv|sql|env|xml|yaml|yml|sh|c|cpp|rs|go|php)$/i.test(file.name);

      const reader = new FileReader();

      if (isText) {
        reader.onload = (event) => {
          const content = event.target?.result as string || '';
          const newFile: AttachedFile = {
            id: `file_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            name: file.name,
            size: file.size,
            type: file.type || 'text/plain',
            content,
            isText: true,
            uploadedAt: new Date().toLocaleTimeString(),
            includedInContext: true,
            language: file.name.split('.').pop() || 'text'
          };
          onAddFile(newFile);
        };
        reader.readAsText(file);
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Start editing with diff tracking
  const handleStartEditing = () => {
    if (!currentFile) return;
    setOriginalContent(currentFile.content);
    setEditFileContent(currentFile.content);
    setIsEditing(true);
  };

  // Save changes via Diff Confirmation
  const handleSaveWithDiff = () => {
    if (!currentFile) return;
    if (editFileContent === originalContent) {
      setIsEditing(false);
      return;
    }
    setShowDiffModal(true);
  };

  const confirmApplyDiff = () => {
    if (currentFile) {
      onUpdateFile(currentFile.id, { content: editFileContent });
    }
    setShowDiffModal(false);
    setIsEditing(false);
  };

  const handleCreateNewFile = () => {
    if (!newFileName.trim()) return;
    const newFile: AttachedFile = {
      id: `file_custom_${Date.now()}`,
      name: newFileName.trim(),
      size: newFileContent.length,
      type: 'text/plain',
      content: newFileContent,
      isText: true,
      uploadedAt: new Date().toLocaleTimeString(),
      includedInContext: true,
      language: newFileName.split('.').pop() || 'text'
    };
    onAddFile(newFile);
    setSelectedFileId(newFile.id);
    setNewFileName('');
    setNewFileContent('');
    setIsCreatingNew(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden shadow-lg">
      {/* Header with Local Folder & Upload triggers */}
      <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-slate-200">
            Archivos del Proyecto ({files.length})
          </span>
          {folderName && (
            <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono">
              📁 {folderName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleOpenLocalDirectory}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
            title="Abrir carpeta local con File System Access API"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Abrir Carpeta</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 font-medium text-[11px] flex items-center gap-1 cursor-pointer transition-colors border border-slate-700"
            title="Cargar archivos individuales"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Cargar</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => setIsCreatingNew(true)}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Crear archivo nuevo"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main split: File list on left, viewer/editor on right */}
      <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
        {/* File List */}
        <div className="md:col-span-5 border-r border-slate-800 bg-slate-950/40 p-2 overflow-y-auto space-y-1">
          {files.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs space-y-2">
              <FolderOpen className="w-8 h-8 text-slate-600 mx-auto" />
              <p>Sin archivos cargados.</p>
              <p className="text-[10px]">Abre una carpeta de tu PC o sube archivos para inyectarlos al contexto de las IAs.</p>
            </div>
          ) : (
            files.map((file) => {
              const isSelected = file.id === selectedFileId;
              return (
                <div
                  key={file.id}
                  onClick={() => {
                    setSelectedFileId(file.id);
                    setIsEditing(false);
                  }}
                  className={`p-2 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800 text-white font-medium border border-slate-700'
                      : 'text-slate-300 hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Code2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onToggleContext(file.id)}
                      className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                      title={file.includedInContext ? 'Incluido en contexto de las IAs' : 'Excluido del contexto'}
                    >
                      {file.includedInContext ? (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </button>

                    <button
                      onClick={() => onDeleteFile(file.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Eliminar archivo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Content Viewer / Editor */}
        <div className="md:col-span-7 bg-slate-900/60 p-3 flex flex-col overflow-hidden">
          {isCreatingNew ? (
            <div className="flex flex-col h-full space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white">Nuevo Archivo</span>
                <button onClick={() => setIsCreatingNew(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="Nombre con extensión (ej. componente.tsx)..."
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
              />
              <textarea
                value={newFileContent}
                onChange={(e) => setNewFileContent(e.target.value)}
                placeholder="Contenido inicial..."
                className="flex-1 w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsCreatingNew(false)}
                  className="px-3 py-1 rounded text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateNewFile}
                  className="px-3 py-1 rounded bg-amber-500 text-slate-950 text-xs font-bold"
                >
                  Crear e Incluir
                </button>
              </div>
            </div>
          ) : currentFile ? (
            <div className="flex flex-col h-full space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white font-mono">{currentFile.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">({currentFile.size} bytes)</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveWithDiff}
                        className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Save className="w-3 h-3" />
                        <span>Ver Diffs y Guardar</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleStartEditing}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3 text-amber-400" />
                      <span>Editar</span>
                    </button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <textarea
                  value={editFileContent}
                  onChange={(e) => setEditFileContent(e.target.value)}
                  className="flex-1 w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 font-mono resize-none focus:outline-none leading-relaxed"
                />
              ) : (
                <pre className="flex-1 w-full p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 font-mono overflow-auto whitespace-pre-wrap select-text leading-relaxed">
                  {currentFile.content || '(Archivo vacío)'}
                </pre>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Selecciona un archivo para ver o editar su contenido.
            </div>
          )}
        </div>
      </div>

      {/* Diff Confirmation Modal before writing */}
      {showDiffModal && currentFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl flex flex-col max-h-[85vh] shadow-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white">Vista Previa de Diferencias (Diff) — {currentFile.name}</span>
              </div>
              <button onClick={() => setShowDiffModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 grid grid-cols-2 gap-4 flex-1 overflow-hidden bg-slate-950 text-xs font-mono">
              <div className="flex flex-col overflow-hidden border border-slate-800 rounded-xl p-2 bg-slate-900/40">
                <span className="text-[10px] text-rose-400 font-bold pb-1 block">Original (-):</span>
                <pre className="flex-1 overflow-auto text-slate-400 whitespace-pre-wrap">{originalContent}</pre>
              </div>

              <div className="flex flex-col overflow-hidden border border-slate-800 rounded-xl p-2 bg-slate-900/40">
                <span className="text-[10px] text-emerald-400 font-bold pb-1 block">Modificado (+):</span>
                <pre className="flex-1 overflow-auto text-emerald-300 whitespace-pre-wrap">{editFileContent}</pre>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Se requiere confirmación explícita antes de aplicar cambios.</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDiffModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmApplyDiff}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirmar y Guardar Cambios</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
