import React, { useState, useEffect, useRef } from 'react';
import { Play, RefreshCw, Copy, Check, Code, ArrowLeft, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialCode: string;
  sourceAI: string;
}

export const CodeSandboxModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialCode,
  sourceAI,
}) => {
  const [code, setCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Extract clean code without markdown backticks
  const cleanCode = code
    .replace(/^```[a-z]*\n/i, '')
    .replace(/\n```$/, '');

  const sendCodeToIframe = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ code: cleanCode, source: sourceAI }, '*');
    }
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(sendCodeToIframe, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, code]);

  if (!isOpen) return null;

  const sandboxHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #020617; color: #f8fafc; font-family: system-ui, sans-serif; padding: 16px; margin: 0; }
  </style>
</head>
<body>
  <div class="max-w-3xl mx-auto space-y-3">
    <div class="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
      <span class="font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">Sandbox Aislado</span>
      <span id="source-badge" class="text-slate-400">Esperando ejecución...</span>
    </div>
    <div id="output" class="space-y-1.5 font-mono text-xs">
      <div class="text-slate-500 italic">Listo para ejecutar código. Presiona Re-ejecutar si no carga automáticamente.</div>
    </div>
  </div>
  <script>
    window.addEventListener('message', function(event) {
      if (!event.data || typeof event.data.code !== 'string') return;
      var out = document.getElementById('output');
      var badge = document.getElementById('source-badge');
      if (event.data.source) badge.textContent = 'Fuente: ' + event.data.source;
      out.innerHTML = '';

      var log = function(msg) {
        var el = document.createElement('div');
        el.className = 'p-2 rounded bg-slate-900 border border-slate-800 text-emerald-400 whitespace-pre-wrap';
        el.textContent = '> ' + (typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg));
        out.appendChild(el);
      };

      try {
        var fn = new Function('console', 'log', event.data.code);
        fn({ log: log, error: log, warn: log, info: log }, log);
      } catch (err) {
        var errEl = document.createElement('div');
        errEl.className = 'p-3 rounded bg-rose-950/80 border border-rose-900 text-rose-300 whitespace-pre-wrap';
        errEl.textContent = 'Error de ejecución: ' + err.message;
        out.appendChild(errEl);
      }
    });
  </script>
</body>
</html>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
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
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Sandbox de Ejecución Aislada
                <span className="text-[11px] font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                  Fuente: {sourceAI}
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={sendCodeToIframe}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              Re-ejecutar
            </button>

            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              Copiar Código
            </button>

            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer ml-1"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Volver Atrás</span>
            </button>
          </div>
        </div>

        {/* Content Body: Left is Code Editor, Right is Live Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 flex-1 overflow-hidden">
          {/* Code Editor */}
          <div className="border-r border-slate-800 bg-slate-950 flex flex-col overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span>Código Fuente</span>
              <span className="text-[10px] text-slate-500">Editable</span>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full flex-1 p-4 bg-slate-950 font-mono text-xs text-slate-200 resize-none focus:outline-none leading-relaxed select-text"
            />
          </div>

          {/* Safe Iframe with NO allow-same-origin and PostMessage execution */}
          <div className="bg-slate-950 flex flex-col overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Consola de Salida
              </span>
              <span className="text-[10px] text-slate-500">Iframe sin allow-same-origin</span>
            </div>
            <iframe
              ref={iframeRef}
              title="Code Preview Sandbox"
              srcDoc={sandboxHtml}
              sandbox="allow-scripts"
              onLoad={sendCodeToIframe}
              className="w-full flex-1 border-0 bg-slate-950"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-2.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">
            Presiona ESC o haz clic en Volver Atrás para regresar
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
};
