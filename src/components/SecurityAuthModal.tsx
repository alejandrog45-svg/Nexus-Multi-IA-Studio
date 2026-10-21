import React, { useEffect } from 'react';
import { AIModelId, AISubscriptionInfo } from '../types';
import { 
  X, ShieldAlert, Lock, CheckCircle2, 
  ArrowLeft, ChevronLeft, User, Info, Check
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  subscriptions: Record<AIModelId, AISubscriptionInfo>;
}

export const SecurityAuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  subscriptions,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden"
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
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shadow-sm">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  Seguridad y Sesión
                </h3>
                <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-bold">
                  Sesión local, sin autenticación
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Almacenamiento exclusivo en tu navegador. Sin servidores de credenciales externos.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Volver atrás"
          >
            <ChevronLeft className="w-4 h-4 text-amber-400" />
            <span>Volver</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh] bg-slate-900/60">
          {/* Transparent Status Banner */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Modo de Operación
                </span>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Espacio de Trabajo Local</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">Autenticación Externa</span>
              <span className="text-xs font-semibold text-amber-400">Sin login remoto</span>
            </div>
          </div>

          {/* Real Providers Status */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-300">
              Estado de Canales y Proveedores:
            </div>

            {(['gemini', 'chatgpt', 'claude', 'meta'] as AIModelId[]).map((id) => {
              const sub = subscriptions[id];
              return (
                <div
                  key={id}
                  className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">{sub.avatarIcon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{sub.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {id === 'gemini' 
                          ? 'Backend Proxy Express en /api/chat (Clave segura en servidor)'
                          : 'Sin sesión activa (Modo asistido disponible)'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {sub.connected ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-400">Conectado</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-slate-600" />
                        <span className="text-xs font-semibold text-slate-400">No Conectado</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Real Security Guarantees */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300">
            <div className="font-semibold flex items-center gap-1.5 text-white">
              <Info className="w-4 h-4 text-amber-400" />
              Garantías de Seguridad Reales:
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
              <li>La clave de API de Gemini se almacena exclusivamente en variables de entorno del servidor backend (Node.js) y nunca se expone en el código descargado por el navegador.</li>
              <li>El entorno de previsualización de código (Sandbox) se ejecuta en un iframe aislado con política restrictiva sin <code>allow-same-origin</code>.</li>
              <li>No se piden ni se guardan contraseñas de Google, OpenAI, Anthropic ni Meta.</li>
            </ul>
          </div>
        </div>

        {/* Footer with Back Button */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>← Volver Atrás al Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
};
