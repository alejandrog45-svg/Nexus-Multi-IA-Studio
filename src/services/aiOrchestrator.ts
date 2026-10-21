import { AIModelId, AIMessage, AttachedFile } from '../types';

export interface ChatMetricRecord {
  id: string;
  model: string;
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  latencyMs: number;
  timestamp: string;
  success: boolean;
  error?: string;
}

// In-memory real telemetry store
class MetricsStore {
  private records: ChatMetricRecord[] = [];

  addRecord(record: ChatMetricRecord) {
    this.records.unshift(record);
    if (this.records.length > 100) this.records.pop();
  }

  getRecords(): ChatMetricRecord[] {
    return [...this.records];
  }

  setRecords(records: ChatMetricRecord[]) {
    if (Array.isArray(records)) {
      this.records = [...records];
    }
  }

  getTotals() {
    const totalTokens = this.records.reduce((acc, r) => acc + r.totalTokens, 0);
    const successful = this.records.filter(r => r.success);
    const avgLatency = successful.length > 0 
      ? Math.round(successful.reduce((acc, r) => acc + r.latencyMs, 0) / successful.length)
      : 0;

    return {
      totalTokens,
      requestCount: this.records.length,
      successCount: successful.length,
      avgLatency,
    };
  }

  clear() {
    this.records = [];
  }
}

export const metricsStore = new MetricsStore();

export const AI_PROFILES: Record<AIModelId, {
  name: string;
  role: string;
  personality: string;
  strengths: string[];
  avatar: string;
  providerUrl: string;
}> = {
  gemini: {
    name: 'Gemini (Google AI)',
    role: 'Arquitecto y Razonamiento Multimodal',
    personality: 'Analítico, estructurado, visión holística, optimización de código y síntesis.',
    strengths: ['Ventana de contexto amplia', 'Análisis de documentos y código', 'Lógica estructurada'],
    avatar: '✨',
    providerUrl: 'https://aistudio.google.com'
  },
  chatgpt: {
    name: 'ChatGPT (OpenAI)',
    role: 'Especialista en Algoritmos y Patrones',
    personality: 'Pragmático, experto en arquitectura modular y patrones de diseño limpios.',
    strengths: ['Desarrollo Full-stack', 'Refactorización precisa', 'Explicaciones ejecutables'],
    avatar: '🧠',
    providerUrl: 'https://chatgpt.com'
  },
  claude: {
    name: 'Claude (Anthropic)',
    role: 'Ingeniero de Software Senior & Reviewer',
    personality: 'Meticuloso, enfocado en código robusto, tipado estricto, seguridad y auditoría.',
    strengths: ['Detección de vulnerabilidades', 'Tipado estricto TypeScript', 'Auditoría exhaustiva'],
    avatar: '⚡',
    providerUrl: 'https://claude.ai'
  },
  meta: {
    name: 'Meta AI (Llama)',
    role: 'Innovador & Estratega Open-Source',
    personality: 'Ágil, propenso a soluciones de alto rendimiento y arquitecturas modernas.',
    strengths: ['Soluciones optimizadas', 'Creatividad y benchmarking', 'Código abierto'],
    avatar: '🦙',
    providerUrl: 'https://www.meta.ai'
  }
};

export class AIOrchestratorService {
  /**
   * Generates a real streaming response from Gemini via backend SSE proxy (/api/stream)
   * Delivers tokens in real time via onChunk callback.
   * Can be aborted cleanly using an AbortSignal.
   */
  async generateGeminiStreamResponse(
    prompt: string,
    context: string,
    files: AttachedFile[],
    previousHistory: AIMessage[],
    onChunk: (textChunk: string) => void,
    signal?: AbortSignal,
    crossContext?: string
  ): Promise<{ text: string; latencyMs: number }> {
    const startTime = performance.now();
    let accumulatedText = '';
    let modelUsed = '';
    let usage: any = null;

    try {
      const response = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          context,
          files: files.filter(f => f.includedInContext),
          history: previousHistory.slice(-6),
          crossContext,
        }),
        signal,
      });

      if (!response.ok) {
        let errorMsg = `Error del servidor (${response.status})`;
        try {
          const errData = await response.json();
          errorMsg = errData.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      if (!response.body) {
        throw new Error('La respuesta del servidor no contiene un flujo de datos legible.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const data = JSON.parse(dataStr);
              if (data.error) {
                throw new Error(data.error);
              }
              if (data.text) {
                accumulatedText += data.text;
                onChunk(data.text);
              }
              if (data.done) {
                modelUsed = data.modelUsed || modelUsed;
                usage = data.usageMetadata || null;
              }
            } catch (pErr: any) {
              if (pErr.message && !pErr.message.includes('JSON')) {
                throw pErr;
              }
            }
          }
        }
      }

      const latencyMs = Math.round(performance.now() - startTime);

      // Real token counts come from the server's usageMetadata; only estimate (and say so) when absent.
      const hasUsage = !!usage;
      metricsStore.addRecord({
        id: `metric_${Date.now()}`,
        model: `${modelUsed || 'gemini'} (SSE${hasUsage ? '' : ', tokens estimados'})`,
        promptTokens: hasUsage ? usage.promptTokenCount || 0 : Math.round(prompt.length / 4),
        candidatesTokens: hasUsage ? usage.candidatesTokenCount || 0 : Math.round(accumulatedText.length / 4),
        totalTokens: hasUsage ? usage.totalTokenCount || 0 : Math.round((prompt.length + accumulatedText.length) / 4),
        latencyMs,
        timestamp: new Date().toLocaleTimeString(),
        success: true,
      });

      return { text: accumulatedText, latencyMs };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      if (err.name === 'AbortError') {
        throw new Error('Petición cancelada por el usuario.');
      }
      metricsStore.addRecord({
        id: `metric_${Date.now()}`,
        model: 'gemini (SSE)',
        promptTokens: 0,
        candidatesTokens: 0,
        totalTokens: 0,
        latencyMs,
        timestamp: new Date().toLocaleTimeString(),
        success: false,
        error: err.message || 'Error en streaming',
      });
      throw err;
    }
  }

  /**
   * Generates a standard non-streaming response from Gemini via backend proxy (/api/chat)
   */
  async generateGeminiResponse(
    prompt: string,
    context: string,
    files: AttachedFile[],
    previousHistory: AIMessage[],
    crossContext?: string
  ): Promise<{ text: string; latencyMs: number; usageMetadata: any }> {
    const startTime = performance.now();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          context,
          files: files.filter(f => f.includedInContext),
          history: previousHistory.slice(-6),
          crossContext,
        }),
      });

      const data = await response.json();
      const latencyMs = Math.round(performance.now() - startTime);

      if (!response.ok) {
        const errorMsg = data.error || `Error del servidor (${response.status})`;
        metricsStore.addRecord({
          id: `metric_${Date.now()}`,
          model: 'gemini-3.5-flash',
          promptTokens: 0,
          candidatesTokens: 0,
          totalTokens: 0,
          latencyMs,
          timestamp: new Date().toLocaleTimeString(),
          success: false,
          error: errorMsg,
        });
        throw new Error(errorMsg);
      }

      const totalTokens = data.usageMetadata?.totalTokenCount || 0;
      metricsStore.addRecord({
        id: `metric_${Date.now()}`,
        model: data.modelUsed || 'gemini-3.5-flash',
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        candidatesTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens,
        latencyMs,
        timestamp: new Date().toLocaleTimeString(),
        success: true,
      });

      return {
        text: data.text,
        latencyMs,
        usageMetadata: data.usageMetadata,
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      if (!err.message?.includes('Error del servidor') && !err.message?.includes('cuota')) {
        metricsStore.addRecord({
          id: `metric_${Date.now()}`,
          model: 'gemini-3.5-flash',
          promptTokens: 0,
          candidatesTokens: 0,
          totalTokens: 0,
          latencyMs,
          timestamp: new Date().toLocaleTimeString(),
          success: false,
          error: err.message || 'Error de conexión',
        });
      }
      throw err;
    }
  }

  /**
   * Generates a consensus synthesis by asking Gemini to evaluate real responses
   * from active AIs. If fewer than 2 valid responses exist, returns an honest refusal.
   */
  async generateConsensusSynthesis(
    userPrompt: string,
    realResponses: { modelId: AIModelId; modelName: string; text: string }[],
    context?: string
  ): Promise<string> {
    const valid = realResponses.filter(r => r.text && r.text.trim().length > 10);

    if (valid.length < 2) {
      const names = valid.map(v => v.modelName).join(', ') || 'ninguna';
      return `### ⚠️ No es posible generar consenso automático\n\nPara contrastar y sintetizar un consenso real se requieren las respuestas de **al menos 2 IAs distintas**.\n\nActualmente solo se cuenta con respuesta real de: **${names}**.\n\n*Recomendación:* Utiliza el **Modo Asistido** en las tarjetas de ChatGPT, Claude o Meta para pegar sus aportes reales en el contexto antes de sintetizar.`;
    }

    const compiledResponses = valid
      .map(v => `=== RESPUESTA DE ${v.modelName.toUpperCase()} ===\n${v.text}`)
      .join('\n\n');

    const synthesisPrompt = `Actúa como árbitro y arquitecto técnico principal.
El usuario solicitó: "${userPrompt}"

A continuación tienes las respuestas REALES generadas por los modelos participantes:
${compiledResponses}

${context ? `Contexto del proyecto: ${context}\n` : ''}

Tu tarea:
1. Compara las soluciones: identifica puntos de acuerdo y discrepancias reales entre las respuestas.
2. Evalúa cuál ofrece el mejor balance de mantenibilidad, robustez y tipado.
3. Genera una solución final consolidada con código TypeScript/JavaScript limpio que resuelva la solicitud del usuario incorporando lo mejor de cada respuesta.`;

    const result = await this.generateGeminiResponse(synthesisPrompt, context || '', [], []);
    return `## 🤝 SÍNTESIS DE CONSENSO MULTI-IA (Generada con datos reales)\n\n${result.text}`;
  }
}

export const orchestrator = new AIOrchestratorService();
