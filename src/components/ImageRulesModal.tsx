import React, { useState, useEffect } from 'react';
import { ImageRule } from '../types';
import { 
  X, Plus, Check, ShieldCheck, Sparkles, Trash2, 
  BookOpen, Sliders, AlertCircle, CheckCircle2, BookmarkCheck, ArrowLeft 
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  rules: ImageRule[];
  onUpdateRules: (newRules: ImageRule[]) => void;
}

const PRESET_RULE_SETS: { name: string; desc: string; rules: ImageRule[] }[] = [
  {
    name: 'Fotografía Publicitaria & Comercial',
    desc: 'Enfocado en fidelidad de marca, iluminación de estudio limpia y colores vibrantes.',
    rules: [
      {
        id: 'r_pub_1',
        title: 'Iluminación de Estudio Profesional Softbox',
        description: 'Luz difusa sin sombras duras, reflejos controlados y acabado nítido.',
        category: 'style',
        enabled: true,
        priority: 'mandatory'
      },
      {
        id: 'r_pub_2',
        title: 'Calidad 4K con Texturas Macro',
        description: 'Detalles minuciosos en materiales, metales, telas o piel sin desenfoque artificial.',
        category: 'quality',
        enabled: true,
        priority: 'mandatory'
      },
      {
        id: 'r_pub_3',
        title: 'Fondo Minimalista Aislado',
        description: 'Separación evidente de sujeto sobre fondo degradado elegante o monocromo.',
        category: 'composition',
        enabled: true,
        priority: 'recommended'
      }
    ]
  },
  {
    name: 'Cine & Ciencia Ficción (Sci-Fi)',
    desc: 'Atmósferas épicas, rayos volumétricos, efectos anamórficos y contrastes cyberpunk.',
    rules: [
      {
        id: 'r_scifi_1',
        title: 'Lentes Anamórficos & Destellos Cinematográficos',
        description: 'Efecto de grano de película de 35mm, destellos de lente horizontales azul/ámbar.',
        category: 'style',
        enabled: true,
        priority: 'mandatory'
      },
      {
        id: 'r_scifi_2',
        title: 'Niebla Volumétrica y Humo de Fondo',
        description: 'Haces de luz visibles atravesando la niebla con profundidad de campo atmosférica.',
        category: 'composition',
        enabled: true,
        priority: 'mandatory'
      },
      {
        id: 'r_scifi_3',
        title: 'Sin Texturas Planas ni Colores Lavados',
        description: 'Negativos profundos, alto rango dinámico (HDR) y gradación cinematográfica.',
        category: 'negative',
        enabled: true,
        priority: 'mandatory'
      }
    ]
  }
];

export const ImageRulesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  rules,
  onUpdateRules,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<ImageRule['category']>('quality');
  const [newPriority, setNewPriority] = useState<ImageRule['priority']>('mandatory');
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggleRule = (id: string) => {
    onUpdateRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleDeleteRule = (id: string) => {
    onUpdateRules(rules.filter(r => r.id !== id));
  };

  const handleAddCustomRule = () => {
    if (!newTitle.trim()) return;

    const newRule: ImageRule = {
      id: `rule_custom_${Date.now()}`,
      title: newTitle.trim(),
      description: newDesc.trim() || 'Regla personalizada del usuario para el motor de generación.',
      category: newCategory,
      enabled: true,
      priority: newPriority
    };

    onUpdateRules([newRule, ...rules]);
    setNewTitle('');
    setNewDesc('');
    setIsAdding(false);
    showNotice('Regla guardada correctamente en el sistema.');
  };

  const handleApplyPreset = (presetRules: ImageRule[], name: string) => {
    onUpdateRules([...presetRules, ...rules.filter(r => !presetRules.some(pr => pr.id === r.id))]);
    showNotice(`Conjunto de reglas "${name}" aplicado y guardado.`);
  };

  const showNotice = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
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
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Menú de Reglas e Instrucciones de Imagen
                <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                  Guardado Persistente
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Las 4 IAs (Gemini, ChatGPT, Claude y Meta) auditan y respetan estas directrices antes de renderizar cada imagen.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Volver Atrás</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Notice */}
        {feedbackNotice && (
          <div className="bg-emerald-950/70 border-b border-emerald-900 px-6 py-2 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackNotice}</span>
          </div>
        )}

        {/* Presets Bar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="font-medium text-slate-300">Cargar Paquetes Rápidos:</span>
          </div>
          <div className="flex items-center gap-2">
            {PRESET_RULE_SETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleApplyPreset(p.rules, p.name)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
              >
                <BookmarkCheck className="w-3 h-3 text-amber-400" />
                <span>{p.name.split(' ')[0]}</span>
              </button>
            ))}
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold flex items-center gap-1 transition-colors cursor-pointer text-[11px] ml-1"
            >
              <Plus className="w-3 h-3" />
              <span>Agregar Nueva Regla</span>
            </button>
          </div>
        </div>

        {/* Add custom rule form */}
        {isAdding && (
          <div className="p-5 border-b border-slate-800 bg-slate-950/90 space-y-3 animate-in fade-in">
            <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              Crear Regla Personalizada Guardable
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Título de la regla (ej. Paleta Pastel Suave, Lente Macro 85mm...)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
              />

              <div className="flex items-center gap-2">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="quality">Calidad / Render</option>
                  <option value="style">Estilo Visual</option>
                  <option value="composition">Composición</option>
                  <option value="negative">Negativa (Prohibido)</option>
                  <option value="format">Formato / Salida</option>
                </select>

                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="mandatory">Obligatoria</option>
                  <option value="recommended">Recomendada</option>
                </select>
              </div>
            </div>

            <textarea
              placeholder="Descripción de la regla y directrices que deben obedecer las 4 IAs..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddCustomRule}
                disabled={!newTitle.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-40"
              >
                Guardar Regla
              </button>
            </div>
          </div>
        )}

        {/* Rules List */}
        <div className="flex-1 p-6 overflow-y-auto space-y-3 bg-slate-900/60">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Reglas Activas: {rules.filter(r => r.enabled).length} de {rules.length}</span>
            <span className="text-[11px] text-amber-400">Verificadas por Claude Code y Gemini</span>
          </div>

          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                rule.enabled
                  ? 'bg-slate-950/80 border-slate-750 text-slate-200'
                  : 'bg-slate-950/30 border-slate-850 opacity-60 text-slate-500'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => handleToggleRule(rule.id)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 accent-amber-500 mt-0.5 cursor-pointer"
                />

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{rule.title}</span>
                    <span className={`text-[10px] px-2 py-0.2 rounded-full border ${
                      rule.priority === 'mandatory'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {rule.priority === 'mandatory' ? 'Obligatoria' : 'Recomendada'}
                    </span>
                    <span className="text-[10px] text-slate-500 capitalize bg-slate-900 px-2 py-0.2 rounded border border-slate-800">
                      {rule.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{rule.description}</p>
                </div>
              </div>

              <button
                onClick={() => handleDeleteRule(rule.id)}
                className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800/80 transition-colors"
                title="Eliminar regla"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Todas las reglas activas se transmiten automáticamente a las 4 IAs.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
          >
            Listo y Guardado
          </button>
        </div>
      </div>
    </div>
  );
};
