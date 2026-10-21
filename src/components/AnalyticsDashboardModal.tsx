import React, { useState, useEffect } from 'react';
import { 
  X, BarChart3, Clock, Zap, Cpu, 
  CheckCircle2, Download, AlertCircle, ArrowLeft, RefreshCw 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, LineChart, Line
} from 'recharts';
import { AIModelId, AISubscriptionInfo } from '../types';
import { metricsStore, ChatMetricRecord } from '../services/aiOrchestrator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  subscriptions: Record<AIModelId, AISubscriptionInfo>;
}

export const AnalyticsDashboardModal: React.FC<Props> = ({
  isOpen,
  onClose,
}) => {
  const [records, setRecords] = useState<ChatMetricRecord[]>([]);

  useEffect(() => {
    if (isOpen) {
      setRecords(metricsStore.getRecords());
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRefresh = () => {
    setRecords(metricsStore.getRecords());
  };

  const totals = metricsStore.getTotals();
  const hasData = records.length > 0;

  // Prepare chart data from real records
  const latencyChartData = records.slice(0, 10).reverse().map((r, i) => ({
    name: `#${i + 1} (${r.timestamp})`,
    latencia: r.latencyMs,
    tokens: r.totalTokens,
  }));

  const tokensByModelMap: Record<string, number> = {};
  records.forEach(r => {
    tokensByModelMap[r.model] = (tokensByModelMap[r.model] || 0) + r.totalTokens;
  });

  const tokensChartData = Object.entries(tokensByModelMap).map(([model, tokens]) => ({
    model,
    tokens,
  }));

  const handleExportReport = () => {
    const report = {
      title: 'Reporte de Métricas Reales Medidas - Nexus Multi-IA',
      timestamp: new Date().toISOString(),
      totales: totals,
      registros: records,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metricas_reales_nexus_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
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
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white flex items-center gap-2">
                Telemetría y Métricas Reales
                <span className="text-[10px] bg-slate-800 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  Medido en Vivo
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Datos calculados en tiempo de ejecución: tokens reales reportados por la API y latencias con performance.now().
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="Refrescar métricas"
            >
              <RefreshCw className="w-4 h-4 text-amber-400" />
            </button>

            {hasData && (
              <button
                onClick={handleExportReport}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Exportar JSON</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Volver Atrás</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-900/50">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Tokens Medidos</span>
                <Cpu className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {hasData ? totals.totalTokens.toLocaleString() : 'sin datos'}
              </div>
              <p className="text-[11px] text-slate-400">
                {hasData ? `${totals.requestCount} llamadas registradas` : 'Realiza una consulta para medir'}
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Latencia Media</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {hasData && totals.avgLatency > 0 ? `${totals.avgLatency} ms` : 'sin datos'}
              </div>
              <p className="text-[11px] text-slate-400">
                Medido de ida y vuelta vía proxy
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Llamadas Exitosas</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {hasData ? `${totals.successCount} / ${totals.requestCount}` : 'sin datos'}
              </div>
              <p className="text-[11px] text-slate-400">
                {hasData && totals.requestCount > 0 
                  ? `${Math.round((totals.successCount / totals.requestCount) * 100)}% tasa de éxito`
                  : 'Sin peticiones en esta sesión'}
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Modelo Principal</span>
                <Zap className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-xl font-bold text-white truncate">
                {hasData ? records[0].model : 'sin datos'}
              </div>
              <p className="text-[11px] text-slate-400">
                Verificado con models.list()
              </p>
            </div>
          </div>

          {!hasData ? (
            <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Sin datos de telemetría aún</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No hay métricas simuladas ni inventadas. En cuanto envíes una instrucción a Gemini desde la barra inferior o pruebes un prompt, verás aquí el conteo exacto de tokens y el tiempo de respuesta.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-white">Latencia por Petición (ms)</h3>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={latencyChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                        />
                        <Line type="monotone" dataKey="latencia" stroke="#f59e0b" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-white">Tokens Consumidos por Modelo</h3>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tokensChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="model" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                        />
                        <Bar dataKey="tokens" fill="#6366f1" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Recent Logs Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white">Historial de Llamadas Reales</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">Hora</th>
                        <th className="py-2 px-3">Modelo</th>
                        <th className="py-2 px-3">Prompt Tokens</th>
                        <th className="py-2 px-3">Output Tokens</th>
                        <th className="py-2 px-3">Total Tokens</th>
                        <th className="py-2 px-3">Latencia</th>
                        <th className="py-2 px-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {records.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-900/50">
                          <td className="py-2 px-3 text-slate-400">{r.timestamp}</td>
                          <td className="py-2 px-3 font-mono text-slate-200">{r.model}</td>
                          <td className="py-2 px-3 text-slate-300">{r.promptTokens}</td>
                          <td className="py-2 px-3 text-slate-300">{r.candidatesTokens}</td>
                          <td className="py-2 px-3 font-bold text-amber-400">{r.totalTokens}</td>
                          <td className="py-2 px-3 text-slate-300">{r.latencyMs} ms</td>
                          <td className="py-2 px-3">
                            {r.success ? (
                              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-semibold border border-emerald-500/20">
                                200 OK
                              </span>
                            ) : (
                              <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded font-semibold border border-rose-500/20" title={r.error}>
                                Error
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>Solo se muestran eventos de red efectivamente computados.</span>
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
