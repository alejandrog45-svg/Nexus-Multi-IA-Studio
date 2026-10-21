import React, { useState, useEffect } from 'react';
import { AppNotification } from '../types';
import { 
  Bell, CheckCircle2, AlertTriangle, Sparkles, X, 
  Trash2, Volume2, VolumeX, ArrowRight, Bot, ShieldAlert, ArrowLeft 
} from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

interface Props {
  notifications: AppNotification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onDismissNotification: (id: string) => void;
  onActionClick?: (notif: AppNotification) => void;
}

export const NotificationCenter: React.FC<Props> = ({
  notifications,
  isOpen,
  onClose,
  onMarkAllAsRead,
  onClearAll,
  onDismissNotification,
  onActionClick,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(() => soundEffects.isSoundEnabled());
  const [filter, setFilter] = useState<'all' | 'intervention' | 'finished'>('all');

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEffects.setSoundEnabled(next);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'intervention') return n.type === 'intervention_needed';
    if (filter === 'finished') return n.type === 'ai_finished' || n.type === 'consensus_ready';
    return true;
  });

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'intervention_needed':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'ai_finished':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'consensus_ready':
        return <Sparkles className="w-4 h-4 text-indigo-400" />;
      case 'image_ready':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      case 'security_alert':
        return <ShieldAlert className="w-4 h-4 text-sky-400" />;
      default:
        return <Bot className="w-4 h-4 text-slate-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-end p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden mt-12 animate-in slide-in-from-top-4 duration-200"
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

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Cerrar y volver (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Header with Volver Atrás */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                Centro de Notificaciones
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-rose-500 text-white font-bold px-1.5 py-0.2 rounded-full">
                    {unreadCount} nuevas
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">Alertas de finalización e intervenciones de las 4 IAs</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            title="Volver atrás"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>Volver</span>
          </button>
        </div>

        {/* Action bar and filters */}
        <div className="px-5 py-2.5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                filter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('intervention')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                filter === 'intervention' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Intervenciones
            </button>
            <button
              onClick={() => setFilter('finished')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                filter === 'finished' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Completadas
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className="p-1 rounded text-slate-400 hover:text-white"
              title={soundEnabled ? 'Silenciar alertas' : 'Activar sonido de alertas'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            </button>

            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
              >
                Leídas
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                title="Limpiar todo el historial"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-2.5 bg-slate-900/40">
          {filteredNotifications.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-slate-500 space-y-1.5">
              <Bell className="w-8 h-8 stroke-1 text-slate-600 mb-1" />
              <p className="text-xs font-semibold text-slate-400">Sin notificaciones pendientes</p>
              <p className="text-[11px] text-slate-500 max-w-[220px]">
                Recibirás avisos aquí cuando las IAs terminen tareas o requieran tu revisión.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                  !notif.read
                    ? 'bg-slate-950 border-amber-500/30 text-white shadow-md'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                    {getIcon(notif.type)}
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">
                        {notif.title}
                      </span>
                      {!notif.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-slate-400 leading-normal">
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-500">
                      <span>{notif.timestamp}</span>
                      {notif.sourceAI && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400 font-medium">{notif.sourceAI}</span>
                        </>
                      )}
                    </div>

                    {notif.actionLabel && (
                      <div className="pt-1.5">
                        <button
                          onClick={() => {
                            if (onActionClick) onActionClick(notif);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>{notif.actionLabel}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onDismissNotification(notif.id)}
                  className="text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-slate-850 shrink-0"
                  title="Descartar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer with Volver Atrás */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px]">Sistema de alertas en tiempo real activo</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Volver Atrás</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Toast Banner component for instant alerts popping up on screen
export const ToastBannerContainer: React.FC<{
  toasts: AppNotification[];
  onDismiss: (id: string) => void;
  onOpenCenter: () => void;
}> = ({ toasts, onDismiss, onOpenCenter }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.slice(0, 3).map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-slate-900/95 border border-amber-500/40 text-white p-3.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-start justify-between gap-3 animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
              {toast.type === 'intervention_needed' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              ) : toast.type === 'consensus_ready' ? (
                <Sparkles className="w-4 h-4 text-indigo-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                <span>{toast.title}</span>
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 rounded">En vivo</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
                {toast.message}
              </p>
              <div className="text-[10px] text-slate-500 pt-0.5">{toast.timestamp}</div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onOpenCenter}
              className="text-[10px] text-amber-400 hover:underline pt-1"
            >
              Ver todo
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
