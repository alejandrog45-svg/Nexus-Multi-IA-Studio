import React, { useState } from 'react';
import { AIMessage, AIModelId, AISubscriptionInfo } from '../types';
import { 
  Sparkles, Code, Copy, Check, MessageSquare, Bot, User, 
  ArrowRight, ShieldCheck, Flame, GitMerge, FileCode, Maximize2 
} from 'lucide-react';

interface Props {
  messages: AIMessage[];
  subscriptions: Record<AIModelId, AISubscriptionInfo>;
  onOpenSandbox: (code: string, source: string) => void;
  onSynthesizeConsensus?: () => void;
  isSynthesizing?: boolean;
  onFocusMessage: (msg: AIMessage) => void;
}

export const ChatUnifiedFeed: React.FC<Props> = ({
  messages,
  subscriptions,
  onOpenSandbox,
  onSynthesizeConsensus,
  isSynthesizing = false,
  onFocusMessage,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden shadow-xl">
      {/* Top Banner */}
      <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-sm text-white flex items-center gap-2">
            Línea de Debate y Colaboración Multi-IA
            <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-medium">
              Interacción Continua
            </span>
          </h3>
        </div>

        <button
          onClick={onSynthesizeConsensus}
          disabled={messages.length === 0 || isSynthesizing}
          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-indigo-500 hover:from-amber-400 hover:to-indigo-400 text-slate-950 flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition-all disabled:opacity-40 cursor-pointer"
        >
          <GitMerge className="w-3.5 h-3.5" />
          {isSynthesizing ? 'Consensuando Solución...' : 'Fusionar en Código Definitivo'}
        </button>
      </div>

      {/* Messages stream */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-slate-900/40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-amber-400">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-300">Debate Multi-IA en Espera</p>
              <p className="text-xs text-slate-500 max-w-md mt-1">
                Envía una consulta desde la barra de orquestación inferior. Las 4 IAs debatirán, criticarán y complementarán sus soluciones automáticamente sin requerir que salgas de esta pantalla.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.modelId === 'user';
            const isOrchestrator = msg.modelId === 'orchestrator';
            const sub = !isUser && !isOrchestrator ? subscriptions[msg.modelId as AIModelId] : null;
            const hasCode = msg.content.includes('```');

            if (isUser) {
              return (
                <div key={msg.id} className="flex items-start justify-end gap-3 max-w-3xl ml-auto">
                  <div className="bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-amber-500/30 p-4 rounded-2xl rounded-tr-sm shadow-md">
                    <div className="flex items-center justify-between gap-4 text-[10px] text-amber-400 font-semibold mb-1">
                      <span>TÚ (USUARIO)</span>
                      <span className="text-slate-400 font-normal">{msg.timestamp}</span>
                    </div>
                    <p className="text-sm text-slate-100 whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold shrink-0 mt-1 shadow-md shadow-amber-500/20">
                    <User className="w-4 h-4" />
                  </div>
                </div>
              );
            }

            if (isOrchestrator) {
              return (
                <div key={msg.id} className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 max-w-4xl mx-auto shadow-xl">
                  <div className="flex items-center justify-between text-xs text-indigo-300 pb-2 border-b border-indigo-800/40 mb-3">
                    <span className="font-bold flex items-center gap-1.5 text-amber-400">
                      <Sparkles className="w-4 h-4" />
                      {msg.senderName}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div className="text-xs md:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed select-text font-sans">
                    {msg.content}
                  </div>

                  {hasCode && (
                    <div className="mt-3 pt-3 border-t border-indigo-800/40 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-xs text-slate-300 flex items-center gap-1.5 border border-slate-700"
                      >
                        {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        Copiar Solución Consensuada
                      </button>
                      <button
                        onClick={() => onOpenSandbox(msg.content, 'Consenso Multi-IA')}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-slate-950 flex items-center gap-1.5 shadow-md shadow-amber-500/10 cursor-pointer"
                      >
                        <Code className="w-3.5 h-3.5" />
                        Abrir en Sandbox
                      </button>
                      <button
                        onClick={() => onFocusMessage(msg)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800/60 text-xs font-medium text-indigo-200 border border-indigo-700/60 flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Modo Enfoque de Lectura"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        Modo Enfoque
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={msg.id} className="flex items-start gap-3 max-w-4xl">
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0 mt-1 shadow-md">
                  {sub?.avatarIcon || '🤖'}
                </div>

                <div className="flex-1 bg-slate-950/80 border border-slate-800 p-4 rounded-2xl rounded-tl-sm shadow-md space-y-2">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-850">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{msg.senderName}</span>
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-medium">
                        {sub?.planName}
                      </span>
                      {msg.inReplyTo && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3 text-slate-600" />
                          Respondiendo a debate
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                  </div>

                  <div className="text-xs md:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed select-text font-sans">
                    {msg.content}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-850 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="p-1 px-2.5 rounded bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-400 hover:text-white flex items-center gap-1 border border-slate-800"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        Copiar
                      </button>

                      {hasCode && (
                        <button
                          onClick={() => onOpenSandbox(msg.content, msg.senderName)}
                          className="p-1 px-2.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[11px] font-medium flex items-center gap-1 border border-amber-500/20"
                        >
                          <Code className="w-3 h-3" />
                          Sandbox
                        </button>
                      )}

                      <button
                        onClick={() => onFocusMessage(msg)}
                        className="p-1 px-2.5 rounded bg-indigo-950/50 hover:bg-indigo-900/50 text-indigo-300 text-[11px] font-medium flex items-center gap-1 border border-indigo-900/40 cursor-pointer"
                        title="Abrir en Modo Enfoque (Lectura tipo documento)"
                      >
                        <Maximize2 className="w-3 h-3" />
                        Modo Enfoque
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
