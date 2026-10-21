import React from 'react';
import { AIModelId, AISubscriptionInfo, ViewLayout } from '../types';
import { 
  Layers, ShieldCheck, LayoutGrid, Columns, MessageSquare, 
  Download, Trash2, Cpu, Sparkles, Image as ImageIcon, 
  FolderPlus, Lock, BarChart3, Bell
} from 'lucide-react';

interface Props {
  subscriptions: Record<AIModelId, AISubscriptionInfo>;
  onOpenSubscriptionsModal: () => void;
  onOpenImageStudio: () => void;
  onOpenComposer: () => void;
  onOpenMediaLibrary: () => void;
  onOpenSecurityAuth: () => void;
  onOpenAnalyticsDashboard: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
  userEmail: string;
  layout: ViewLayout;
  onChangeLayout: (layout: ViewLayout) => void;
  onClearSession: () => void;
  onExportSession: () => void;
  onBackupJson: () => void;
  onRestoreJson: () => void;
  isProcessing: boolean;
}

export const Header: React.FC<Props> = ({
  subscriptions,
  onOpenSubscriptionsModal,
  onOpenImageStudio,
  onOpenComposer,
  onOpenMediaLibrary,
  onOpenSecurityAuth,
  onOpenAnalyticsDashboard,
  onOpenNotifications,
  unreadNotificationsCount,
  layout,
  onChangeLayout,
  onClearSession,
  onExportSession,
  onBackupJson,
  onRestoreJson,
}) => {
  const connectedCount = Object.values(subscriptions).filter(s => s.connected).length;

  return (
    <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
      <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-emerald-500 p-0.5 shadow-lg shadow-amber-500/10">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-amber-400" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-white tracking-tight">
                Nexus Multi-IA Studio
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                PRO PLATFORM
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>Gemini (Backend Seguro)</span>
              <span>•</span>
              <span className="text-slate-300 font-medium">Modo Transparente</span>
            </p>
          </div>
        </div>

        {/* 4 Models Real Status Badges */}
        <div className="hidden xl:flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
          {(Object.keys(subscriptions) as AIModelId[]).map((id) => {
            const sub = subscriptions[id];
            return (
              <button
                key={id}
                onClick={onOpenSubscriptionsModal}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs hover:bg-slate-800 transition-colors cursor-pointer group"
                title={`${sub.name}: ${sub.connected ? 'Conectado' : 'No Conectado (Modo Asistido)'}`}
              >
                <span>{sub.avatarIcon}</span>
                <span className="font-medium text-slate-200 text-[11px] group-hover:text-amber-400 transition-colors">
                  {sub.name.split(' ')[0]}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  sub.connected ? 'bg-emerald-400 shadow-xs shadow-emerald-400/80' : 'bg-slate-600'
                }`} />
              </button>
            );
          })}
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2">
          {/* Notifications Center Trigger */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Centro de Notificaciones en Tiempo Real"
          >
            <Bell className="w-4 h-4 text-amber-400" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Create Images Multi-AI Trigger */}
          <button
            onClick={onOpenImageStudio}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 border border-amber-500/30 text-amber-300 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Estudio de Imagen</span>
          </button>

          {/* Deterministic flyer composer (no AI, real images) */}
          <button
            onClick={onOpenComposer}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Compositor de Flyer: tu imagen original + pie de texto, sin IA"
          >
            <ImageIcon className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Compositor</span>
          </button>

          {/* Media Library Trigger */}
          <button
            onClick={onOpenMediaLibrary}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Biblioteca</span>
          </button>

          {/* Analytics Dashboard Trigger */}
          <button
            onClick={onOpenAnalyticsDashboard}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Dashboard de telemetría y métricas reales"
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Métricas</span>
          </button>

          {/* Security & Local Session Badge */}
          <button
            onClick={onOpenSecurityAuth}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Seguridad: Sesión local segura"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline font-mono text-[11px]">Sesión Local</span>
          </button>

          {/* Connectors Status */}
          <button
            onClick={onOpenSubscriptionsModal}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">Conectores</span>
            <span className="bg-slate-800 px-1.5 py-0.2 rounded text-[10px] text-slate-400">
              {connectedCount}/4
            </span>
          </button>

          {/* Layout Switcher */}
          <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800">
            <button
              onClick={() => onChangeLayout('split_4')}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                layout === 'split_4' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Cuadrícula 4 IAs"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onChangeLayout('split_2')}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                layout === 'split_2' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="División Dual 2 IAs"
            >
              <Columns className="w-4 h-4" />
            </button>
            <button
              onClick={() => onChangeLayout('unified_feed')}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                layout === 'unified_feed' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Feed Unificado"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>

          {/* Backup (.json) & Restore */}
          <button
            onClick={onBackupJson}
            className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
            title="Respaldar todo el Workspace en archivo .json"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Respaldar</span>
          </button>

          <button
            onClick={onRestoreJson}
            className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
            title="Restaurar Workspace desde archivo .json"
          >
            <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Restaurar</span>
          </button>

          {/* Export Markdown & Reset */}
          <button
            onClick={onExportSession}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors"
            title="Exportar Respuestas en Markdown"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={onClearSession}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors"
            title="Limpiar Sesión"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
