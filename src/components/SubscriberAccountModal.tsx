import React, { useState, useEffect } from 'react';
import { AISubscriptionInfo, AIModelId } from '../types';
import { 
  X, CheckCircle, ShieldCheck, RefreshCw, Sparkles, 
  ExternalLink, AlertCircle, ArrowLeft, Copy, Check, Globe
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  subscriptions: Record<AIModelId, AISubscriptionInfo>;
  onUpdateSubscription: (id: AIModelId, updates: Partial<AISubscriptionInfo>) => void;
  onCheckGeminiHealth: () => Promise<boolean>;
}

export const SubscriberAccountModal: React.FC<Props> = ({
  isOpen,
  onClose,
  subscriptions,
  onUpdateSubscription,
  onCheckGeminiHealth,
}) => {
  const [selectedModel, setSelectedModel] = useState<AIModelId>('chatgpt');
  const [isChecking, setIsChecking] = useState(false);
  const [copiedModel, setCopiedModel] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const current = subscriptions[selectedModel];

  const handleTestHealth = async () => {
    setIsChecking(true);
    if (selectedModel === 'gemini') {
      const ok = await onCheckGeminiHealth();
      onUpdateSubscription('gemini', {
        connected: ok,
        status: ok ? 'active' : 'error',
        lastActive: ok ? 'Servidor activo y clave configurada (sin llamada de prueba)' : 'Sin clave configurada o backend caído',
      });
    } else {
      // External models require bridge or extension in Phase 6
      onUpdateSubscription(selectedModel, {
        connected: false,
        status: 'idle',
        lastActive: 'Sin puente local activo (Usar Modo Asistido)',
      });
    }
    setIsChecking(false);
  };

  const handleCopyAssisted = (url: string) => {
    navigator.clipboard.writeText('Trabajando en Nexus Multi-IA Studio.');
    setCopiedModel(selectedModel);
    setTimeout(() => setCopiedModel(null), 2000);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
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
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Estado Real de Conectores IA
                <span className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-medium">
                  Auditoría Real
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Verificación honesta de conectividad. Solo los modelos con canal activo se marcan como conectados.
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

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Models Navigation Sidebar */}
          <div className="md:col-span-4 border-r border-slate-800 bg-slate-950/40 p-4 space-y-2 overflow-y-auto">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
              Proveedores
            </p>
            {(Object.keys(subscriptions) as AIModelId[]).map((id) => {
              const sub = subscriptions[id];
              const isSelected = selectedModel === id;

              return (
                <button
                  key={id}
                  onClick={() => setSelectedModel(id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-slate-800/90 border-amber-500/50 shadow-md text-white'
                      : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">{sub.avatarIcon}</span>
                    <div className="truncate">
                      <div className="font-semibold text-sm truncate flex items-center gap-1.5">
                        {sub.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {sub.company}
                      </div>
                    </div>
                  </div>

                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    sub.connected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-600'
                  }`} />
                </button>
              );
            })}

            <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Política de Transparencia
              </div>
              <p className="text-[11px] leading-relaxed">
                Ninguna respuesta es inventada. Gemini se ejecuta directamente a través del backend seguro. Para las IAs sin API propia configurada, dispones del Modo Asistido.
              </p>
            </div>
          </div>

          {/* Model Configuration Detail */}
          <div className="md:col-span-8 p-6 overflow-y-auto space-y-6 bg-slate-900/60">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{current.avatarIcon}</span>
                <div>
                  <h3 className="text-xl font-bold text-white">{current.name}</h3>
                  <p className="text-xs text-slate-400 font-medium">{current.company}</p>
                </div>
              </div>

              <div>
                {current.connected ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle className="w-3.5 h-3.5" />
                    CONECTADO
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                    NO CONECTADO
                  </span>
                )}
              </div>
            </div>

            {/* Status card */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-slate-300">
                Detalles del Conector:
              </div>

              <div className="space-y-1.5 text-xs text-slate-400">
                <div>
                  <span className="text-slate-500">Método de conexión: </span>
                  <span className="text-slate-200 font-medium">
                    {selectedModel === 'gemini' 
                      ? 'Proxy Backend Express (/api/chat) con clave en servidor' 
                      : 'Modo Asistido (Copia manual al portapapeles y enlace a web)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Última comprobación: </span>
                  <span className="text-slate-300 font-mono text-[11px]">{current.lastActive || 'Sin comprobación previa'}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={handleTestHealth}
                  disabled={isChecking}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-amber-400' : ''}`} />
                  <span>Probar Conectividad</span>
                </button>

                {selectedModel !== 'gemini' && (
                  <button
                    onClick={() => handleCopyAssisted(
                      selectedModel === 'chatgpt' ? 'https://chatgpt.com' :
                      selectedModel === 'claude' ? 'https://claude.ai' : 'https://www.meta.ai'
                    )}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    {copiedModel === selectedModel ? <Check className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                    <span>Abrir en {current.company} (Modo Asistido)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Explanation */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-400 space-y-2">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Seguridad de Credenciales
              </div>
              <p className="leading-relaxed">
                Esta aplicación <strong>nunca almacena ni solicita contraseñas o tokens privados</strong> de OpenAI, Anthropic o Meta. La comunicación con proveedores externos solo se realiza mediante APIs oficiales autorizadas o tu propia sesión en el navegador a través del modo asistido.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            Configuración local en navegador. Sin telemetría de terceros.
          </span>
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
