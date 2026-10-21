import React, { useState, useEffect } from 'react';
import { GeneratedImage, ImageRule, AIModelId, AISubscriptionInfo } from '../types';
import { 
  X, Sparkles, Sliders, Image as ImageIcon, 
  Copy, Check, ArrowLeft, AlertCircle, ExternalLink 
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  rules: ImageRule[];
  onOpenRules: () => void;
  onSaveToLibrary: (img: GeneratedImage) => void;
  subscriptions: Record<AIModelId, AISubscriptionInfo>;
}

export const ImageStudioModal: React.FC<Props> = ({
  isOpen,
  onClose,
  rules,
  onOpenRules,
}) => {
  const [prompt, setPrompt] = useState('Un paisaje cyberpunk futurista con una torre holográfica brillante reflejada en un lago cristalino a medianoche');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('16:9');
  const [format, setFormat] = useState<'png' | 'jpg'>('png');
  const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('4K');
  const [style, setStyle] = useState('Cinemático Fotorealista');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeRulesList = rules.filter(r => r.enabled);

  const getFullCompiledPrompt = () => {
    const rulesText = activeRulesList.map(r => `- ${r.title}: ${r.description}`).join('\n');
    return `[PROMPT PRINCIPAL]: ${prompt}\n[ESTILO]: ${style}\n[ASPECT RATIO]: ${aspectRatio}\n[RESOLUCIÓN]: ${resolution}\n[REGLAS ACTIVAS]:\n${rulesText}`;
  };

  const handleCopyFullPrompt = () => {
    navigator.clipboard.writeText(getFullCompiledPrompt());
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Universal Back Banner */}
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
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white flex items-center gap-2">
                Estudio de Generación de Imágenes
                <span className="text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                  No disponible con clave gratuita
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Diseñador de directivas visuales y comprobación real de cuota del modelo de imagen.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenRules}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Reglas ({activeRulesList.length})</span>
            </button>

            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Volver Atrás</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-900/50">
          {/* Honest Technical Limitation Notice */}
          <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-900/50 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-rose-300">
                Generación Directa con IA No Disponible con esta Clave de Desarrollador
              </h4>
              <p className="text-slate-300 leading-relaxed">
                Verificación técnica: Los modelos de imagen en Google AI Studio (<code>imagen-3.0-generate-002</code> y <code>gemini-*-image</code>) devuelven <strong>HTTP 429 Quota Exceeded</strong> en la capa gratuita o exigen facturación empresarial en Vertex AI / Google Cloud Enterprise.
              </p>
              <p className="text-slate-400 text-[11px] pt-1">
                Para respetar la regla estricta de no simular nada con dibujos ficticios en canvas, la generación sintética ha sido eliminada. Puedes componer tu prompt estructurado con las reglas activas abajo y copiarlo directamente a cualquier generador compatible.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Prompt and Configuration */}
            <div className="lg:col-span-7 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Descripción visual / Prompt técnico:
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed resize-none"
                  placeholder="Describe detalladamente el sujeto, entorno, iluminación y estilo..."
                />
              </div>

              {/* Controls Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 block font-medium">Aspect Ratio</label>
                  <select
                    value={aspectRatio}
                    onChange={(e: any) => setAspectRatio(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="16:9">16:9 (Horizontal)</option>
                    <option value="1:1">1:1 (Cuadrado)</option>
                    <option value="9:16">9:16 (Vertical)</option>
                    <option value="4:3">4:3 (Fotografía)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 block font-medium">Resolución</label>
                  <select
                    value={resolution}
                    onChange={(e: any) => setResolution(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="1K">1K (Standard)</option>
                    <option value="2K">2K (High)</option>
                    <option value="4K">4K (Ultra)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 block font-medium">Formato</label>
                  <select
                    value={format}
                    onChange={(e: any) => setFormat(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="png">PNG (Sin pérdida)</option>
                    <option value="jpg">JPG (Web)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 block font-medium">Estilo</label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="Cinemático Fotorealista">Cinemático</option>
                    <option value="Arte Conceptual Cyberpunk">Cyberpunk</option>
                    <option value="Render 3D Octane / Unreal">Render 3D</option>
                    <option value="Minimalista Vectorial">Vectorial</option>
                  </select>
                </div>
              </div>

              {/* Active Rules Applied Preview */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Reglas Aplicadas Automáticamente ({activeRulesList.length}):</span>
                  <button onClick={onOpenRules} className="text-amber-400 text-[11px] hover:underline">
                    Editar reglas
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeRulesList.map((r) => (
                    <span
                      key={r.id}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300"
                    >
                      {r.title}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Compiled Prompt Ready for External Generators */}
            <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Prompt Técnico Consolidado
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Para Imagen / Midjourney</span>
                </div>

                <pre className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                  {getFullCompiledPrompt()}
                </pre>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleCopyFullPrompt}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                >
                  {copiedPrompt ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedPrompt ? 'Prompt Copiado al Portapapeles' : 'Copiar Prompt Optimizado'}</span>
                </button>

                <p className="text-[10px] text-slate-500 text-center">
                  Copia y pega este prompt en Google Imagen 3 o tu generador preferido.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>Transparencia: Cero imágenes simuladas en canvas local.</span>
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
