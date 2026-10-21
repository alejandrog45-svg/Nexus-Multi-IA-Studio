import React, { useState } from 'react';
import { AIModelId, AISubscriptionInfo, AIMessage } from '../types';
import { 
  Play, Copy, Check, ExternalLink, Bot, AlertCircle, 
  Send, Code, Maximize2, ShieldAlert
} from 'lucide-react';

interface Props {
  subscriptions: Record<AIModelId, AISubscriptionInfo>;
  messages: AIMessage[];
  isProcessing: Record<AIModelId, boolean>;
  onSendToModel: (modelId: AIModelId, customPrompt: string) => void;
  onCrossInteract: (fromModel: AIModelId, toModel: AIModelId, snippet: string) => void;
  onOpenSandbox: (code: string, source: string) => void;
  onFocusMessage: (msg: AIMessage) => void;
  onAssistedPaste?: (modelId: AIModelId, content: string) => void;
}

export const SplitViewGrid: React.FC<Props> = ({
  subscriptions,
  messages,
  isProcessing,
  onSendToModel,
  onCrossInteract,
  onOpenSandbox,
  onFocusMessage,
  onAssistedPaste,
}) => {
  const [individualPrompts, setIndividualPrompts] = useState<Record<AIModelId, string>>({
    gemini: '',
    chatgpt: '',
    claude: '',
    meta: '',
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [assistedInputOpen, setAssistedInputOpen] = useState<AIModelId | null>(null);
  const [pastedContent, setPastedContent] = useState('');

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Direct cards: Gemini always; the others only when connected (Meta via Groq key, Claude/ChatGPT via their logged-in local CLI).
  const isDirectModel = (modelId: AIModelId) =>
    modelId === 'gemini' || subscriptions[modelId].connected;

  const handleIndividualSubmit = (modelId: AIModelId) => {
    const text = individualPrompts[modelId]?.trim();
    if (!text) return;

    if (isDirectModel(modelId)) {
      onSendToModel(modelId, text);
      setIndividualPrompts(prev => ({ ...prev, [modelId]: '' }));
    } else {
      // For external models, copy prompt and open provider web
      handleAssistedAction(modelId, text);
    }
  };

  const handleAssistedAction = (modelId: AIModelId, promptText?: string) => {
    const textToCopy = promptText || individualPrompts[modelId] || 'Genera una solución técnica para este proyecto.';
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(`prompt_${modelId}`);
    setTimeout(() => setCopiedId(null), 2500);

    const urls: Record<AIModelId, string> = {
      gemini: 'https://aistudio.google.com',
      chatgpt: 'https://chatgpt.com',
      claude: 'https://claude.ai',
      meta: 'https://www.meta.ai',
    };
    window.open(urls[modelId], '_blank', 'noopener,noreferrer');
  };

  const handleSavePastedResponse = (modelId: AIModelId) => {
    if (!pastedContent.trim()) return;
    if (onAssistedPaste) {
      onAssistedPaste(modelId, pastedContent.trim());
    }
    setPastedContent('');
    setAssistedInputOpen(null);
  };

  const models: AIModelId[] = ['gemini', 'chatgpt', 'claude', 'meta'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-full">
      {models.map((modelId) => {
        const sub = subscriptions[modelId];
        const modelMessages = messages.filter(m => m.modelId === modelId);
        const loading = isProcessing[modelId];
        const isConnected = sub.connected;

        return (
          <div
            key={modelId}
            className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-lg transition-all hover:border-slate-700/80"
          >
            {/* Model Card Header */}
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-2xl">{sub.avatarIcon}</span>
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-white truncate flex items-center gap-1.5">
                    {sub.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium truncate">
                    {sub.company}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {isConnected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    CONECTADO
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    NO CONECTADO
                  </span>
                )}
              </div>
            </div>

            {/* Content Message Stream */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-900/30">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
                  <p className="text-xs text-slate-300 font-medium">
                    Consultando API real de {sub.name}...
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Procesando a través del backend proxy
                  </p>
                </div>
              ) : !isConnected && !isDirectModel(modelId) ? (
                <div className="h-full flex flex-col items-center justify-center p-5 text-center text-slate-400 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-200">
                      Sin sesión ni API configurada
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed max-w-[220px]">
                      Para evitar respuestas inventadas, este proveedor no genera texto simulado. Usa el modo asistido con tu cuenta en la web.
                    </p>
                  </div>

                  <button
                    onClick={() => handleAssistedAction(modelId)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir {sub.company} (Modo Asistido)</span>
                  </button>

                  {assistedInputOpen !== modelId ? (
                    <button
                      onClick={() => setAssistedInputOpen(modelId)}
                      className="text-[11px] text-amber-400 hover:underline pt-1"
                    >
                      + Pegar respuesta obtenida de {sub.company}
                    </button>
                  ) : (
                    <div className="w-full space-y-2 pt-2 border-t border-slate-800 text-left">
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        Pegar respuesta externa:
                      </span>
                      <textarea
                        value={pastedContent}
                        onChange={(e) => setPastedContent(e.target.value)}
                        placeholder={`Pega aquí el texto generado en ${sub.company}...`}
                        rows={3}
                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none font-mono"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setAssistedInputOpen(null)}
                          className="px-2 py-1 text-[11px] text-slate-400 hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSavePastedResponse(modelId)}
                          className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 text-[11px] font-bold"
                        >
                          Incorporar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Render any messages previously pasted or recorded */}
                  {modelMessages.length > 0 && (
                    <div className="w-full text-left pt-3 border-t border-slate-800 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        Respuestas incorporadas ({modelMessages.length})
                      </span>
                      {modelMessages.map((msg) => (
                        <div key={msg.id} className="p-2 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300">
                          <p className="line-clamp-3">{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : modelMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500">
                  <Bot className="w-8 h-8 stroke-1 text-slate-600 mb-2" />
                  <p className="text-xs font-medium text-slate-400">En espera de instrucción</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
                    Envía una orden desde la barra inferior para consultar la API de Gemini.
                  </p>
                </div>
              ) : (
                modelMessages.map((msg) => {
                  const hasCode = msg.content.includes('```');

                  return (
                    <div
                      key={msg.id}
                      className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs text-slate-200 select-text"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1.5 border-b border-slate-850">
                        <span className="font-semibold text-amber-400/90">{msg.senderName}</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div className="whitespace-pre-wrap leading-relaxed font-sans text-xs">
                        {msg.content}
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-850 text-[11px]">
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-2">
                          {hasCode && (
                            <button
                              onClick={() => onOpenSandbox(msg.content, msg.senderName)}
                              className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium"
                              title="Ejecutar en Sandbox Seguro"
                            >
                              <Code className="w-3.5 h-3.5" />
                              <span>Sandbox</span>
                            </button>
                          )}

                          <button
                            onClick={() => onFocusMessage(msg)}
                            className="text-slate-400 hover:text-slate-200"
                            title="Expandir en pantalla completa"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Individual Model Input Bar */}
            <div className="p-2.5 border-t border-slate-800 bg-slate-950/90">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder={
                    isDirectModel(modelId)
                      ? `Instrucción directa a ${sub.name}...`
                      : `Copiar prompt para ${sub.company}...`
                  }
                  value={individualPrompts[modelId]}
                  onChange={(e) =>
                    setIndividualPrompts(prev => ({ ...prev, [modelId]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleIndividualSubmit(modelId);
                  }}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/80"
                />

                <button
                  onClick={() => handleIndividualSubmit(modelId)}
                  disabled={loading}
                  className="p-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50 cursor-pointer"
                  title={isDirectModel(modelId) ? `Enviar a ${sub.name}` : 'Copiar y abrir en proveedor'}
                >
                  {isDirectModel(modelId) ? (
                    <Send className="w-3.5 h-3.5" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
