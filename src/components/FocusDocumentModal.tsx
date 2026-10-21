import React, { useState, useEffect } from 'react';
import { AIMessage, AISubscriptionInfo, AIModelId } from '../types';
import { 
  X, Maximize2, Minimize2, Copy, Check, Code, Download, 
  Sparkles, FileText, ZoomIn, ZoomOut, Eye, CheckCircle2, 
  CornerDownRight, Hash, Terminal, ArrowLeft 
} from 'lucide-react';

interface Props {
  message: AIMessage | null;
  onClose: () => void;
  subscriptions: Record<AIModelId, AISubscriptionInfo>;
  onOpenSandbox: (code: string, source: string) => void;
}

export const FocusDocumentModal: React.FC<Props> = ({
  message,
  onClose,
  subscriptions,
  onOpenSandbox,
}) => {
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedBlockIndex, setCopiedBlockIndex] = useState<number | null>(null);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!message) return null;

  const isUser = message.modelId === 'user';
  const isOrchestrator = message.modelId === 'orchestrator';
  const sub = !isUser && !isOrchestrator ? subscriptions[message.modelId as AIModelId] : null;

  // Split content into prose and code blocks
  const parseDocumentBlocks = (raw: string) => {
    const parts = raw.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const firstLineEnd = part.indexOf('\n');
        const lang = part.slice(3, firstLineEnd).trim() || 'code';
        const code = part.slice(firstLineEnd + 1, -3).trim();
        return {
          type: 'code' as const,
          lang,
          code,
          index
        };
      }
      return {
        type: 'prose' as const,
        text: part,
        index
      };
    });
  };

  const blocks = parseDocumentBlocks(message.content);
  const codeBlocks = blocks.filter(b => b.type === 'code');

  const handleCopyAll = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopyCodeBlock = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedBlockIndex(idx);
    setTimeout(() => setCopiedBlockIndex(null), 2000);
  };

  const handleDownloadDoc = () => {
    const blob = new Blob([message.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revision_enfoque_${message.senderName.replace(/\s+/g, '_')}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFontSizeClass = () => {
    if (fontSize === 'sm') return 'text-xs md:text-sm';
    if (fontSize === 'lg') return 'text-base md:text-lg';
    return 'text-sm md:text-base';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-xl flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Top Universal Back Banner */}
      <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <button
          onClick={onClose}
          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>← Volver Atrás al Workspace</span>
        </button>

        <span className="text-[11px] text-slate-400 hidden sm:inline">
          Modo Enfoque Activo • Presiona <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400 font-mono text-[10px]">ESC</kbd> para salir
        </span>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          title="Cerrar y volver (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Top Floating Control Bar */}
      <div className="border-b border-slate-800 bg-slate-900/90 px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl shrink-0">
            {sub?.avatarIcon || (isUser ? '👤' : '✨')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm md:text-base text-white tracking-tight">
                Modo Enfoque: {message.senderName}
              </h2>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                Lectura & Revisión de Código
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{message.timestamp}</span>
              <span>•</span>
              <span>{codeBlocks.length} {codeBlocks.length === 1 ? 'bloque de código' : 'bloques de código'}</span>
              <span>•</span>
              <span>{message.content.length} caracteres</span>
            </div>
          </div>
        </div>

        {/* Reader Controls */}
        <div className="flex items-center gap-2">
          {/* Font size adjustment */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setFontSize('sm')}
              className={`px-2 py-1 rounded text-xs transition-colors ${fontSize === 'sm' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'}`}
              title="Texto Pequeño"
            >
              A-
            </button>
            <button
              onClick={() => setFontSize('base')}
              className={`px-2 py-1 rounded text-xs transition-colors ${fontSize === 'base' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'}`}
              title="Texto Normal"
            >
              A
            </button>
            <button
              onClick={() => setFontSize('lg')}
              className={`px-2 py-1 rounded text-xs transition-colors ${fontSize === 'lg' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'}`}
              title="Texto Grande"
            >
              A+
            </button>
          </div>

          {/* Toggle line numbers */}
          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
              showLineNumbers
                ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Alternar números de línea en código"
          >
            <Hash className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Líneas</span>
          </button>

          {/* Download Markdown */}
          <button
            onClick={handleDownloadDoc}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors"
            title="Descargar Documento en Markdown"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Copy full doc */}
          <button
            onClick={handleCopyAll}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Copiar Todo</span>
          </button>

          {/* Close button with ESC tip */}
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition-colors cursor-pointer ml-2"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Salir (Esc)</span>
          </button>
        </div>
      </div>

      {/* Main Document Body */}
      <div className="flex-1 overflow-y-auto px-4 py-8 md:py-12 bg-slate-950">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Document Cover Header */}
          <div className="border-b border-slate-800 pb-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                Documento de Análisis de Código
              </span>
              {sub && (
                <span className="text-xs text-slate-400">
                  Generado con {sub.planName}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Revisión e Implementación Técnica
            </h1>
            <p className="text-xs text-slate-400">
              Formato optimizado para inspección de código largo, tipado estricto, algoritmos y documentación.
            </p>
          </div>

          {/* Document Rendered Blocks */}
          <div className={`space-y-6 text-slate-200 ${getFontSizeClass()} leading-relaxed`}>
            {blocks.map((block) => {
              if (block.type === 'prose') {
                if (!block.text.trim()) return null;

                return (
                  <div
                    key={block.index}
                    className="whitespace-pre-wrap font-sans text-slate-300 leading-relaxed select-text space-y-2"
                  >
                    {block.text}
                  </div>
                );
              }

              // Code block
              const lines = block.code.split('\n');

              return (
                <div
                  key={block.index}
                  className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-2xl my-6"
                >
                  {/* Code block header bar */}
                  <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-mono font-semibold text-amber-300 uppercase">
                        {block.lang}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        ({lines.length} {lines.length === 1 ? 'línea' : 'líneas'})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyCodeBlock(block.code, block.index)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedBlockIndex === block.index ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Código</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => onOpenSandbox(block.code, message.senderName)}
                        className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-slate-950 flex items-center gap-1.5 shadow-md shadow-amber-500/10 cursor-pointer"
                      >
                        <Code className="w-3.5 h-3.5" />
                        <span>Ejecutar en Sandbox</span>
                      </button>
                    </div>
                  </div>

                  {/* Code Editor / Viewer with line numbers */}
                  <div className="p-4 overflow-x-auto bg-slate-950/70 font-mono text-xs md:text-sm select-text leading-relaxed">
                    <table className="w-full border-collapse">
                      <tbody>
                        {lines.map((line, lIdx) => (
                          <tr key={lIdx} className="hover:bg-slate-900/60 transition-colors">
                            {showLineNumbers && (
                              <td className="w-10 pr-4 text-right text-slate-600 select-none text-[11px] align-top">
                                {lIdx + 1}
                              </td>
                            )}
                            <td className="text-slate-200 whitespace-pre font-mono">
                              {line || '\n'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Document Footer */}
          <div className="pt-10 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Revisión de código en Modo Enfoque completada.</span>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-amber-500/10"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>← Volver Atrás al Workspace Principal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
