import React, { useState } from 'react';
import { AIModelId, AISubscriptionInfo, OrchestrationMode } from '../types';
import { 
  Send, Sparkles, Zap, RefreshCw, GitMerge, 
  Paperclip
} from 'lucide-react';

interface Props {
  subscriptions: Record<AIModelId, AISubscriptionInfo>;
  isProcessing: boolean;
  isSynthesizing?: boolean;
  onSendPrompt: (prompt: string, mode: OrchestrationMode) => void;
  onCancel?: () => void;
  attachedFilesCount?: number;
  hasContext?: boolean;
}

export const OrchestrationBar: React.FC<Props> = ({
  subscriptions,
  isProcessing,
  isSynthesizing,
  onSendPrompt,
  onCancel,
  attachedFilesCount = 0,
  hasContext = false,
}) => {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<OrchestrationMode>('parallel');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isProcessing || isSynthesizing) return;
    onSendPrompt(prompt.trim(), mode);
    setPrompt('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const quickPrompts = [
    'Construir componente completo con tipado TypeScript',
    'Auditar vulnerabilidades y optimizar rendimiento',
    'Crear API REST con validación estricta y manejo de errores',
    'Comparar 3 alternativas de arquitectura para este proyecto'
  ];

  return (
    <div className="bg-slate-900 border-t border-slate-800 p-3 sm:p-4 sticky bottom-0 z-30 shadow-2xl bg-slate-950/95 backdrop-blur-md">
      <div className="max-w-[1700px] mx-auto space-y-2.5">
        {/* Orchestration Mode Bar & Status */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Mode Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setMode('parallel')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                mode === 'parallel'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Ejecución en Vivo (Streaming)</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('consensus')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                mode === 'consensus'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>Sintetizar Consenso Real</span>
            </button>
          </div>

          {/* Quick status pill */}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Streaming SSE Activo
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-[11px] text-slate-400">
              Atajo: <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400 font-mono text-[10px]">Ctrl+Enter</kbd>
            </span>
          </div>
        </div>

        {/* Input Textarea & Send button */}
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Escribe tu instrucción técnica... (Enter o Ctrl+Enter para enviar)"
            className="w-full pl-4 pr-44 py-3 rounded-2xl bg-slate-900 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/80 resize-none leading-relaxed shadow-inner"
          />

          <div className="absolute right-2.5 flex items-center gap-2">
            {(isProcessing || isSynthesizing) && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-md"
                title="Cancelar generación en curso"
              >
                Cancelar
              </button>
            )}

            <button
              id="btn-orchestrator-submit"
              type="submit"
              disabled={!prompt.trim() || isProcessing || isSynthesizing}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isProcessing || isSynthesizing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Transmitiendo...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'consensus' ? 'Consensuar' : 'Transmitir'}</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick prompt suggestions */}
        <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] text-slate-500 font-medium shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Sugerencias:
          </span>
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPrompt(q)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 whitespace-nowrap transition-colors text-[11px] cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
