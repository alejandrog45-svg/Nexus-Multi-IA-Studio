import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, X, ArrowLeft, Sparkles, ShieldAlert, Cpu } from 'lucide-react';
import { AIModelId, AISubscriptionInfo } from '../types';

export interface WorkflowIntervention {
  id: string;
  title: string;
  question: string;
  details: string;
  fromAI: string;
  options: {
    id: string;
    label: string;
    description: string;
    recommended?: boolean;
  }[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  intervention: WorkflowIntervention | null;
  onResolve: (optionId: string, customFeedback?: string) => void;
  subscriptions: Record<AIModelId, AISubscriptionInfo>;
}

export const UserInterventionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  intervention,
  onResolve,
  subscriptions,
}) => {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [customFeedback, setCustomFeedback] = useState<string>('');

  useEffect(() => {
    if (intervention && intervention.options.length > 0) {
      setSelectedOption(intervention.options[0].id);
    }
  }, [intervention]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !intervention) return null;

  const handleSubmit = () => {
    onResolve(selectedOption, customFeedback);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-2xl flex flex-col shadow-2xl shadow-amber-500/10 overflow-hidden animate-in zoom-in-95 duration-200"
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

        {/* Header with prominent Volver Atrás */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer mr-1"
              title="Volver atrás sin responder"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-semibold text-slate-200">Volver Atrás</span>
            </button>

            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Intervención Requerida del Usuario
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                  EN VIVO
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                El flujo orquestado se ha pausado esperando la decisión de Alejandro.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Cerrar ventana (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] bg-slate-900/50">
          {/* Context Alert box */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span>Solicitado por: {intervention.fromAI}</span>
            </div>
            <h4 className="text-sm font-semibold text-white">
              {intervention.title}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {intervention.question}
            </p>
            {intervention.details && (
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 font-mono text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap">
                {intervention.details}
              </div>
            )}
          </div>

          {/* Options selector */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Selecciona el rumbo a seguir por las 4 IAs:
            </label>
            <div className="space-y-2">
              {intervention.options.map((opt) => {
                const isSelected = selectedOption === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedOption(opt.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/70 text-white shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="pt-0.5 shrink-0">
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-600'
                      }`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{opt.label}</span>
                        {opt.recommended && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.2 rounded font-semibold border border-emerald-500/30">
                            Recomendado
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {opt.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Optional custom instruction */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Instrucción adicional o aclaración de Alejandro (opcional):</span>
              <span className="text-[10px] text-slate-500">Se transmitirá a las 4 IAs</span>
            </label>
            <textarea
              value={customFeedback}
              onChange={(e) => setCustomFeedback(e.target.value)}
              placeholder="Ejemplo: Priorizar la sugerencia de Claude para seguridad, pero usando la sintaxis moderna de Gemini..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Footer with Volver Atrás and Submit */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Volver Atrás / Cancelar</span>
          </button>

          <button
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirmar Decisión y Continuar Flujo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
