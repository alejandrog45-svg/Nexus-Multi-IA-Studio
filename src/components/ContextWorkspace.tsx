import React, { useState, useEffect, useRef } from 'react';
import { ContextVersion } from '../types';
import { 
  Sparkles, Layers, BookOpen, Trash2, Check, Copy, 
  History, RotateCcw, Save, Undo, Redo, Eye, ArrowLeft, 
  Clock, Tag, AlertCircle, CheckCircle2, ChevronRight 
} from 'lucide-react';

interface Props {
  context: string;
  onChangeContext: (val: string) => void;
  attachedFilesCount: number;
}

const CONTEXT_PRESETS = [
  {
    name: 'Desarrollo Full-Stack',
    desc: 'React, TypeScript, Tailwind, Node.js y buenas prácticas de arquitectura.',
    template: `[OBJETIVO]: Desarrollar una solución Full-Stack robusta, reactiva y escalable.
[STACK]: TypeScript 5+, React 19, Tailwind CSS 4, Node.js / Express.
[REGLAS]:
1. Tipado estricto sin usar 'any'.
2. Separación de responsabilidades: componentes limpios, hooks modulares.
3. Manejo resiliente de errores y estados de carga.
4. Código listo para producción sin dependencias obsoletas.`
  },
  {
    name: 'Auditoría y Refactor',
    desc: 'Enfocado en seguridad, rendimiento, pruebas y edge-cases.',
    template: `[OBJETIVO]: Auditar y refactorizar el código existente para máxima seguridad y legibilidad.
[ENFOQUE]:
1. Detección de posibles memory leaks o renders innecesarios.
2. Inmutabilidad y blindaje de tipos de datos.
3. Mejora de tiempos de ejecución y menor consumo de memoria.
4. Proponer soluciones alternativas para comparar antes de aplicar cambios.`
  },
  {
    name: 'E-commerce & SaaS',
    desc: 'Pasarelas, carritos, autenticación, base de datos y UI pulida.',
    template: `[OBJETIVO]: Construir una plataforma de comercio / SaaS con flujo de checkout y gestión de usuarios.
[REQUISITOS]:
1. Experiencia de usuario ultra fluida e intuitiva.
2. Estados sincronizados en tiempo real y persistencia local/remota.
3. Validación estricta en formularios y transacciones.
4. Diseño responsivo optimizado para móviles y escritorio.`
  }
];

const STORAGE_KEY = 'nexus_context_versions_v1';

export const ContextWorkspace: React.FC<Props> = ({
  context,
  onChangeContext,
  attachedFilesCount,
}) => {
  const [copied, setCopied] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [newVersionTitle, setNewVersionTitle] = useState('');
  const [previewVersion, setPreviewVersion] = useState<ContextVersion | null>(null);
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null);

  // Undo / Redo internal stack
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Persistent version history
  const [versions, setVersions] = useState<ContextVersion[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Could not read versions from localStorage', e);
    }

    // Default initial version
    const now = new Date();
    return [
      {
        id: 'ver_initial',
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        dateFormatted: now.toLocaleDateString(),
        title: 'Versión Inicial del Proyecto',
        content: context,
        characterCount: context.length,
        wordCount: context.trim() ? context.trim().split(/\s+/).length : 0,
        tag: 'initial'
      }
    ];
  });

  // Save versions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
    } catch (e) {
      console.warn('Could not save versions to localStorage', e);
    }
  }, [versions]);

  // Debounced auto-snapshot when user pauses typing significant changes
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>(context);

  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    // Only auto-save if content changed by at least 30 chars or 5 seconds passed
    const diff = Math.abs(context.length - lastSavedContentRef.current.length);
    if (diff > 25 && context.trim().length > 0) {
      autoSaveTimerRef.current = setTimeout(() => {
        saveSnapshot('Autoguardado Automático', 'auto');
        lastSavedContentRef.current = context;
      }, 5000);
    }

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [context]);

  const saveSnapshot = (title: string, tag: 'manual' | 'auto' | 'template' | 'initial') => {
    const now = new Date();
    const newVer: ContextVersion = {
      id: `ver_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      dateFormatted: now.toLocaleDateString(),
      title: title.trim() || `Punto de control (${now.toLocaleTimeString()})`,
      content: context,
      characterCount: context.length,
      wordCount: context.trim() ? context.trim().split(/\s+/).length : 0,
      tag: tag
    };

    setVersions(prev => [newVer, ...prev.slice(0, 49)]); // keep up to 50 versions
    lastSavedContentRef.current = context;
  };

  const handleManualSave = () => {
    if (!newVersionTitle.trim()) return;
    saveSnapshot(newVersionTitle, 'manual');
    setNewVersionTitle('');
    setSaveModalOpen(false);
    setRestoreNotice('Punto de control guardado en el historial.');
    setTimeout(() => setRestoreNotice(null), 3000);
  };

  const handleApplyPreset = (template: string, name: string) => {
    // Record current in undo stack
    setUndoStack(prev => [...prev, context]);
    setRedoStack([]);

    onChangeContext(template);
    setShowPresets(false);

    // Create a version snapshot for the template application
    const now = new Date();
    const newVer: ContextVersion = {
      id: `ver_${Date.now()}`,
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      dateFormatted: now.toLocaleDateString(),
      title: `Plantilla: ${name}`,
      content: template,
      characterCount: template.length,
      wordCount: template.trim().split(/\s+/).length,
      tag: 'template'
    };
    setVersions(prev => [newVer, ...prev]);
    lastSavedContentRef.current = template;

    setRestoreNotice(`Plantilla "${name}" aplicada y registrada en el historial.`);
    setTimeout(() => setRestoreNotice(null), 3500);
  };

  const handleRestoreVersion = (ver: ContextVersion) => {
    setUndoStack(prev => [...prev, context]);
    setRedoStack([]);

    onChangeContext(ver.content);
    setPreviewVersion(null);
    lastSavedContentRef.current = ver.content;

    setRestoreNotice(`Restaurada la versión: "${ver.title}" (${ver.timestamp}).`);
    setTimeout(() => setRestoreNotice(null), 4000);
  };

  const handleDeleteVersion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setVersions(prev => prev.filter(v => v.id !== id));
    if (previewVersion?.id === id) setPreviewVersion(null);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(u => u.slice(0, -1));
    setRedoStack(r => [...r, context]);
    onChangeContext(prev);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(r => r.slice(0, -1));
    setUndoStack(u => [...u, context]);
    onChangeContext(next);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(context);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTagBadge = (tag: ContextVersion['tag']) => {
    switch (tag) {
      case 'manual':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">Manual</span>;
      case 'template':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Plantilla</span>;
      case 'auto':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Auto</span>;
      case 'initial':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-300">Inicial</span>;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
      {/* Top Bar */}
      <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="font-semibold text-sm text-white flex items-center gap-2">
              Contexto Universal del Proyecto
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                Compartido por las 4 IAs
              </span>
            </h3>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Undo / Redo */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 mr-1">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Deshacer cambio (Undo)"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Rehacer cambio (Redo)"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Save Version checkpoint */}
          <button
            onClick={() => {
              setNewVersionTitle(`Punto de control ${versions.length + 1}`);
              setSaveModalOpen(true);
            }}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Guardar estado actual como versión"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Guardar Versión</span>
          </button>

          {/* Toggle History Drawer */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
              showHistory
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Ver historial de versiones anteriores"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>Historial ({versions.length})</span>
          </button>

          {/* Presets */}
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Plantillas</span>
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Copiar Contexto"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {context && (
            <button
              onClick={() => {
                setUndoStack(prev => [...prev, context]);
                onChangeContext('');
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Borrar Contexto"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Restore Notice Toast */}
      {restoreNotice && (
        <div className="bg-emerald-950/60 border-b border-emerald-900/60 px-5 py-2 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{restoreNotice}</span>
        </div>
      )}

      {/* Manual Save Version Modal / Form */}
      {saveModalOpen && (
        <div className="bg-slate-950 border-b border-slate-800 p-4 animate-in fade-in duration-150 flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px]">
            <label className="text-xs font-medium text-amber-400 block mb-1">
              Nombre de este punto de control / versión:
            </label>
            <input
              type="text"
              value={newVersionTitle}
              onChange={(e) => setNewVersionTitle(e.target.value)}
              placeholder="Ej. Reglas de tipado v2, Enfoque seguridad backend..."
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleManualSave();
              }}
            />
          </div>
          <div className="flex items-center gap-2 self-end">
            <button
              onClick={() => setSaveModalOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              onClick={handleManualSave}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Guardar en Historial
            </button>
          </div>
        </div>
      )}

      {/* Preset Drawer */}
      {showPresets && (
        <div className="bg-slate-950/90 border-b border-slate-800 p-4 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in duration-150">
          {CONTEXT_PRESETS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(p.template, p.name)}
              className="text-left p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-amber-500/40 transition-all group cursor-pointer"
            >
              <div className="text-xs font-semibold text-white group-hover:text-amber-400 flex items-center justify-between mb-1">
                {p.name}
                <Sparkles className="w-3 h-3 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">{p.desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* Main Workspace Body with Version History Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-[220px]">
        {/* Context Textarea Area */}
        <div className={`${showHistory ? 'lg:col-span-7' : 'lg:col-span-12'} p-4 flex flex-col bg-slate-900/40 border-r border-slate-800/80 transition-all`}>
          <textarea
            value={context}
            onChange={(e) => {
              setUndoStack(prev => [...prev.slice(-20), context]);
              setRedoStack([]);
              onChangeContext(e.target.value);
            }}
            placeholder="Escribe aquí el contexto de lo que quieres que hagan las IAs (arquitectura deseada, objetivos, tecnologías, reglas de estilo, directrices de la empresa, etc.). Cada versión se guarda automáticamente en el historial para que puedas regresar a cualquier estado anterior."
            className="w-full flex-1 min-h-[160px] p-3 rounded-xl bg-slate-950 border border-slate-800 font-sans text-xs md:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/80 leading-relaxed resize-none"
          />

          {/* Status indicator bar */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span>{context.length} caracteres</span>
              <span>•</span>
              <span>{context.trim() ? context.trim().split(/\s+/).length : 0} palabras</span>
              <span>•</span>
              <span className={attachedFilesCount > 0 ? 'text-amber-400 font-medium' : 'text-slate-500'}>
                {attachedFilesCount} {attachedFilesCount === 1 ? 'archivo activo' : 'archivos activos'} en contexto
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                {versions.length} {versions.length === 1 ? 'versión registrada' : 'versiones registradas'}
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Autoguardado y sincronización activos
              </span>
            </div>
          </div>
        </div>

        {/* Version History Drawer (Right Column) */}
        {showHistory && (
          <div className="lg:col-span-5 bg-slate-950 flex flex-col max-h-[380px] overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header of Drawer */}
            <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-semibold text-white">Historial de Versiones</h4>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cerrar
              </button>
            </div>

            {/* If a version is selected for preview */}
            {previewVersion ? (
              <div className="flex-1 flex flex-col p-3 overflow-hidden bg-slate-950">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <button
                    onClick={() => setPreviewVersion(null)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Volver a la lista
                  </button>

                  <button
                    onClick={() => handleRestoreVersion(previewVersion)}
                    className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restaurar este estado
                  </button>
                </div>

                <div className="py-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white truncate max-w-[200px]">
                      {previewVersion.title}
                    </span>
                    {getTagBadge(previewVersion.tag)}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{previewVersion.dateFormatted} {previewVersion.timestamp}</span>
                    <span>•</span>
                    <span>{previewVersion.characterCount} caracteres</span>
                  </div>
                </div>

                <div className="flex-1 p-2 bg-slate-900 rounded-lg border border-slate-800 overflow-y-auto text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed select-text">
                  {previewVersion.content || '(Versión con contenido vacío)'}
                </div>
              </div>
            ) : (
              /* Versions List */
              <div className="flex-1 p-3 overflow-y-auto space-y-2">
                {versions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6">
                    <History className="w-8 h-8 mb-2 stroke-1 text-slate-600" />
                    <p className="text-xs font-medium text-slate-400">Sin versiones aún</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Guarda puntos de control o redacta contenido para generar versiones automáticas.
                    </p>
                  </div>
                ) : (
                  versions.map((ver) => {
                    const isCurrent = ver.content === context;

                    return (
                      <div
                        key={ver.id}
                        onClick={() => setPreviewVersion(ver)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between ${
                          isCurrent
                            ? 'bg-slate-900 border-amber-500/40 text-white'
                            : 'bg-slate-900/50 hover:bg-slate-900 border-slate-850 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                              {ver.title}
                              {isCurrent && (
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded-full">
                                  Actual
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>{ver.timestamp}</span>
                              <span>•</span>
                              <span>{ver.characterCount} caracteres</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {getTagBadge(ver.tag)}
                            <button
                              onClick={(e) => handleDeleteVersion(ver.id, e)}
                              className="p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Eliminar del historial"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Quick preview snippet & Restore button */}
                        <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
                          <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                            {ver.content.slice(0, 50)}...
                          </p>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestoreVersion(ver);
                            }}
                            className="text-[11px] font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restaurar
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
