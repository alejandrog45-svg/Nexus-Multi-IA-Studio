import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  AIModelId, AISubscriptionInfo, AttachedFile, AIMessage, 
  ViewLayout, OrchestrationMode, ImageRule, GeneratedImage, MediaLibraryItem, AppNotification 
} from './types';
import { Header } from './components/Header';
import { SubscriberAccountModal } from './components/SubscriberAccountModal';
import { FileManager } from './components/FileManager';
import { ContextWorkspace } from './components/ContextWorkspace';
import { SplitViewGrid } from './components/SplitViewGrid';
import { ChatUnifiedFeed } from './components/ChatUnifiedFeed';
import { OrchestrationBar } from './components/OrchestrationBar';
import { CodeSandboxModal } from './components/CodeSandboxModal';
import { FocusDocumentModal } from './components/FocusDocumentModal';
import { ImageStudioModal } from './components/ImageStudioModal';
import { ImageRulesModal } from './components/ImageRulesModal';
import { MediaLibraryModal, INITIAL_LIBRARY_ITEMS } from './components/MediaLibraryModal';
import { SecurityAuthModal } from './components/SecurityAuthModal';
import { AnalyticsDashboardModal } from './components/AnalyticsDashboardModal';
import { NotificationCenter, ToastBannerContainer } from './components/NotificationCenter';
import { UserInterventionModal, WorkflowIntervention } from './components/UserInterventionModal';
import { DEFAULT_IMAGE_RULES } from './services/imageStudioEngine';
import { orchestrator, metricsStore } from './services/aiOrchestrator';
import { soundEffects } from './services/soundEffects';
import { persistentStorage } from './services/storage';
import { 
  ChevronDown, ChevronUp, Zap, X
} from 'lucide-react';

const INITIAL_SUBSCRIPTIONS: Record<AIModelId, AISubscriptionInfo> = {
  gemini: {
    id: 'gemini',
    name: 'Gemini (Google AI)',
    planName: 'Backend Proxy SSE',
    company: 'Google',
    color: '#4f46e5',
    accentBg: 'bg-indigo-500/10',
    badgeBorder: 'border-indigo-500/30',
    avatarIcon: '✨',
    connected: true,
    authMethod: 'subscription_session',
    autoSync: true,
    status: 'active',
    lastActive: 'Streaming SSE activo',
    capabilities: [
      'Razonamiento y código con gemini-3.5-flash',
      'Streaming Server-Sent Events token a token',
      'Clave resguardada exclusivamente en el servidor backend'
    ]
  },
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT (OpenAI)',
    planName: 'Modo Asistido / Web',
    company: 'OpenAI',
    color: '#10a37f',
    accentBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/30',
    avatarIcon: '🧠',
    connected: false,
    authMethod: 'web_connector',
    autoSync: false,
    status: 'idle',
    lastActive: 'Sin sesión directa (Modo Asistido)',
    capabilities: [
      'Copia de prompt optimizado con un clic',
      'Apertura directa de chatgpt.com',
      'Integración manual de respuestas al workspace'
    ]
  },
  claude: {
    id: 'claude',
    name: 'Claude (Anthropic)',
    planName: 'Modo Asistido / Web',
    company: 'Anthropic',
    color: '#d97706',
    accentBg: 'bg-amber-500/10',
    badgeBorder: 'border-amber-500/30',
    avatarIcon: '⚡',
    connected: false,
    authMethod: 'web_connector',
    autoSync: false,
    status: 'idle',
    lastActive: 'Sin sesión directa (Modo Asistido)',
    capabilities: [
      'Copia de prompt estructurado para auditoría de código',
      'Apertura directa de claude.ai',
      'Pegado de respuestas revisadas'
    ]
  },
  meta: {
    id: 'meta',
    name: 'Meta AI (Llama)',
    planName: 'Modo Asistido / Web',
    company: 'Meta',
    color: '#0284c7',
    accentBg: 'bg-sky-500/10',
    badgeBorder: 'border-sky-500/30',
    avatarIcon: '🦙',
    connected: false,
    authMethod: 'web_connector',
    autoSync: false,
    status: 'idle',
    lastActive: 'Sin sesión directa (Modo Asistido)',
    capabilities: [
      'Copia de prompt para benchmarks y optimizaciones',
      'Apertura directa de meta.ai',
      'Incorporación al workspace'
    ]
  }
};

const INITIAL_FILES: AttachedFile[] = [
  {
    id: 'file_demo_1',
    name: 'AppArchitecture.ts',
    size: 1420,
    type: 'text/typescript',
    content: `// Arquitectura inicial del proyecto para análisis multi-IA
export interface UserSession {
  userId: string;
  role: 'admin' | 'subscriber' | 'guest';
  activeSubscriptions: string[];
}

export class MultiServiceDispatcher {
  async dispatch(taskName: string) {
    console.log("Iniciando despacho colaborativo:", taskName);
    return { status: "ready" };
  }
}`,
    isText: true,
    uploadedAt: '12:00:00',
    includedInContext: true,
    language: 'ts'
  },
  {
    id: 'file_demo_2',
    name: 'Especificaciones_Proyecto.md',
    size: 980,
    type: 'text/markdown',
    content: `# Especificaciones del Proyecto
- Sincronización transparente sin datos simulados.
- Gemini opera a través del backend seguro con streaming SSE.
- Persistencia real en IndexedDB del navegador.
- Acceso a carpetas del PC mediante File System Access API.`,
    isText: true,
    uploadedAt: '12:01:00',
    includedInContext: true,
    language: 'md'
  }
];

export default function App() {
  // Global States
  const [subscriptions, setSubscriptions] = useState<Record<AIModelId, AISubscriptionInfo>>(INITIAL_SUBSCRIPTIONS);
  const [files, setFiles] = useState<AttachedFile[]>(INITIAL_FILES);
  const [projectContext, setProjectContext] = useState<string>(
    'Desarrollar una aplicación web robusta, modular y transparente. Gemini genera respuestas reales con streaming SSE y las demás IAs se incorporan vía Modo Asistido.'
  );
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [layout, setLayout] = useState<ViewLayout>('split_4');
  const userEmail = 'Sesión Local';

  // Persistence loaded flag
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'notif_welcome',
      title: 'Núcleo Real con Streaming SSE',
      message: 'Nexus Multi-IA Studio conectado al backend seguro con soporte para streaming y persistencia IndexedDB.',
      type: 'system',
      timestamp: new Date().toLocaleTimeString(),
      read: false,
    }
  ]);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  // Active intervention modal state
  const [activeIntervention, setActiveIntervention] = useState<WorkflowIntervention | null>(null);

  // Image Rules & Media Library States
  const [imageRules, setImageRules] = useState<ImageRule[]>(DEFAULT_IMAGE_RULES);
  const [libraryItems, setLibraryItems] = useState<MediaLibraryItem[]>(INITIAL_LIBRARY_ITEMS);

  // Modals
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState(false);
  const [isImageRulesOpen, setIsImageRulesOpen] = useState(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isAnalyticsDashboardOpen, setIsAnalyticsDashboardOpen] = useState(false);
  const [sandboxCode, setSandboxCode] = useState<string | null>(null);
  const [sandboxSource, setSandboxSource] = useState<string>('');
  const [focusedMessage, setFocusedMessage] = useState<AIMessage | null>(null);
  const [showContextAndFiles, setShowContextAndFiles] = useState(true);
  const [activeTab, setActiveTab] = useState<'context' | 'files'>('context');

  // Processing & Streaming cancellation
  const [isProcessing, setIsProcessing] = useState<Record<AIModelId, boolean>>({
    gemini: false,
    chatgpt: false,
    claude: false,
    meta: false,
  });
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const activeAbortController = useRef<AbortController | null>(null);

  // Load from IndexedDB on initial mount
  useEffect(() => {
    persistentStorage.loadState().then((saved) => {
      if (saved) {
        if (Array.isArray(saved.messages) && saved.messages.length > 0) {
          setMessages(saved.messages);
        }
        if (Array.isArray(saved.files) && saved.files.length > 0) {
          setFiles(saved.files);
        }
        if (saved.projectContext) {
          setProjectContext(saved.projectContext);
        }
        if (Array.isArray(saved.imageRules) && saved.imageRules.length > 0) {
          setImageRules(saved.imageRules);
        }
        if (Array.isArray(saved.libraryItems) && saved.libraryItems.length > 0) {
          setLibraryItems(saved.libraryItems);
        }
        if (Array.isArray(saved.metrics) && saved.metrics.length > 0) {
          metricsStore.setRecords(saved.metrics);
        }
      }
      setIsStorageLoaded(true);
    }).catch((err) => {
      console.warn('Error cargando IndexedDB:', err);
      setIsStorageLoaded(true);
    });
  }, []);

  // Auto-save to IndexedDB (debounced)
  useEffect(() => {
    if (!isStorageLoaded) return;

    const timer = setTimeout(() => {
      persistentStorage.saveState({
        messages,
        files,
        projectContext,
        imageRules,
        libraryItems,
        metrics: metricsStore.getRecords(),
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [messages, files, projectContext, imageRules, libraryItems, isStorageLoaded]);

  // Notifications helper
  const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toLocaleTimeString(),
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev]);

    if (notification.type === 'intervention_needed') {
      soundEffects.playWarning();
    } else {
      soundEffects.playNotification();
    }
  }, []);

  // Health check against /api/health
  const handleCheckGeminiHealth = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) return false;
      const data = await res.json();
      return data.status === 'ok' && data.keyConfigured === true;
    } catch {
      return false;
    }
  };

  // Which free support providers have a key on the server (Groq powers the Meta AI / Llama card)
  useEffect(() => {
    fetch('/api/providers')
      .then(r => (r.ok ? r.json() : null))
      .then((data) => {
        const groq = data?.providers?.find((p: any) => p.id === 'groq');
        if (!groq?.configured) return;
        setSubscriptions(prev => ({
          ...prev,
          meta: {
            ...prev.meta,
            connected: true,
            status: 'active',
            planName: `Groq gratis · ${groq.model}`,
            lastActive: 'Clave de Groq configurada en el servidor (sin llamada de prueba)',
          },
        }));
      })
      .catch(() => { /* sin backend: la tarjeta sigue en Modo Asistido */ });
  }, []);

  useEffect(() => {
    handleCheckGeminiHealth().then((ok) => {
      setSubscriptions(prev => ({
        ...prev,
        gemini: {
          ...prev.gemini,
          connected: ok,
          status: ok ? 'active' : 'error',
          lastActive: ok ? 'Servidor activo y clave configurada (sin llamada de prueba)' : 'Sin clave configurada o backend caído',
        }
      }));
    });
  }, []);

  const handleUpdateSubscription = (id: AIModelId, updates: Partial<AISubscriptionInfo>) => {
    setSubscriptions(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates }
    }));
  };

  // File Handlers
  const handleAddFile = (newFile: AttachedFile) => {
    setFiles(prev => [newFile, ...prev]);
  };

  const handleUpdateFile = (id: string, updates: Partial<AttachedFile>) => {
    setFiles(prev => prev.map(f => (f.id === id ? { ...f, ...updates } : f)));
  };

  const handleDeleteFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleToggleFileContext = (id: string) => {
    setFiles(prev =>
      prev.map(f => (f.id === id ? { ...f, includedInContext: !f.includedInContext } : f))
    );
  };

  // Media Library
  const handleSaveGeneratedImageToLibrary = (img: GeneratedImage) => {
    const newItem: MediaLibraryItem = {
      id: `lib_gen_${img.id}`,
      name: `${img.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.${img.format}`,
      type: 'image',
      format: img.format.toUpperCase(),
      size: 2048000,
      url: img.url,
      date: img.timestamp,
      tags: [img.style, img.aspectRatio, 'Nexus'],
      source: 'generated'
    };
    setLibraryItems(prev => [newItem, ...prev]);
  };

  const handleAddLibraryItem = (item: MediaLibraryItem) => {
    setLibraryItems(prev => [item, ...prev]);
  };

  const handleDeleteLibraryItem = (id: string) => {
    setLibraryItems(prev => prev.filter(i => i.id !== id));
  };

  // Assisted Mode Paste
  const handleAssistedPaste = (modelId: AIModelId, content: string) => {
    const newMsg: AIMessage = {
      id: `msg_assisted_${modelId}_${Date.now()}`,
      modelId,
      senderName: `${subscriptions[modelId].name} [Modo Asistido]`,
      content,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages(prev => [...prev, newMsg]);

    addNotification({
      title: 'Respuesta Incorporada',
      message: `Se añadió respuesta en la columna de ${subscriptions[modelId].name} vía Modo Asistido.`,
      type: 'ai_finished',
      modelId,
      sourceAI: subscriptions[modelId].name,
    });
  };

  // Cancel in-flight streaming
  const handleCancelStreaming = () => {
    if (activeAbortController.current) {
      activeAbortController.current.abort();
      activeAbortController.current = null;
      setIsProcessing({ gemini: false, chatgpt: false, claude: false, meta: false });
      setIsSynthesizing(false);
      addNotification({
        title: 'Generación Cancelada',
        message: 'La transmisión fue interrumpida por el usuario.',
        type: 'system',
      });
    }
  };

  // Send prompt to Gemini with SSE streaming
  const handleSendToSingleModel = async (modelId: AIModelId, customPrompt: string) => {
    const userMsg: AIMessage = {
      id: `msg_user_${Date.now()}`,
      modelId: 'user',
      senderName: 'Usuario',
      content: customPrompt,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages(prev => [...prev, userMsg]);

    if (modelId === 'gemini') {
      setIsProcessing(prev => ({ ...prev, gemini: true }));
      const aiMsgId = `msg_gemini_${Date.now()}`;

      // Insert placeholder streaming message
      const aiMsg: AIMessage = {
        id: aiMsgId,
        modelId: 'gemini',
        senderName: subscriptions.gemini.name,
        content: '',
        timestamp: new Date().toLocaleTimeString(),
        isStreaming: true,
      };
      setMessages(prev => [...prev, aiMsg]);

      const controller = new AbortController();
      activeAbortController.current = controller;

      try {
        const result = await orchestrator.generateGeminiStreamResponse(
          customPrompt,
          projectContext,
          files,
          messages,
          (chunk) => {
            setMessages(prev =>
              prev.map(m => m.id === aiMsgId ? { ...m, content: m.content + chunk } : m)
            );
          },
          controller.signal
        );

        // If Gemini's quota ran out, the server answered with a free backup model: say so in the card.
        const backupModel = result.modelUsed?.startsWith('openrouter:') ? result.modelUsed.slice('openrouter:'.length) : null;
        setMessages(prev =>
          prev.map(m => m.id === aiMsgId
            ? { ...m, isStreaming: false, ...(backupModel ? { senderName: `Respaldo (sin cuota de Gemini) · ${backupModel} vía OpenRouter` } : {}) }
            : m)
        );

        addNotification({
          title: 'Streaming Completado',
          message: `Gemini transmitió su respuesta (${result.latencyMs} ms).`,
          type: 'ai_finished',
          modelId: 'gemini',
          sourceAI: 'Gemini',
        });
      } catch (err: any) {
        setMessages(prev =>
          prev.map(m => m.id === aiMsgId ? { 
            ...m, 
            content: m.content ? m.content + `\n\n[Transmisión detenida: ${err.message}]` : `[Error: ${err.message}]`,
            isStreaming: false 
          } : m)
        );

        addNotification({
          title: err.name === 'AbortError' ? 'Petición Cancelada' : 'Error de Consulta',
          message: err.message || 'Error al comunicar con Gemini.',
          type: 'intervention_needed',
          modelId: 'gemini',
          actionLabel: 'Revisar',
        });
      } finally {
        activeAbortController.current = null;
        setIsProcessing(prev => ({ ...prev, gemini: false }));
      }
    } else if (modelId === 'meta' && subscriptions.meta.connected) {
      // Llama (Meta) served by Groq through the backend; the real provider is shown in the sender name.
      setIsProcessing(prev => ({ ...prev, meta: true }));
      try {
        const result = await orchestrator.generateProviderResponse('groq', customPrompt, projectContext, files);
        setMessages(prev => [...prev, {
          id: `msg_meta_${Date.now()}`,
          modelId: 'meta',
          senderName: `${subscriptions.meta.name} · ${result.modelUsed} vía Groq`,
          content: result.text,
          timestamp: new Date().toLocaleTimeString(),
        }]);
        addNotification({
          title: 'Respuesta recibida',
          message: `Llama respondió vía Groq (${result.latencyMs} ms).`,
          type: 'ai_finished',
          modelId: 'meta',
          sourceAI: 'Meta AI',
        });
      } catch (err: any) {
        addNotification({
          title: 'Error de Consulta',
          message: err.message || 'Error al comunicar con Groq.',
          type: 'intervention_needed',
          modelId: 'meta',
          actionLabel: 'Revisar',
        });
      } finally {
        setIsProcessing(prev => ({ ...prev, meta: false }));
      }
    } else {
      addNotification({
        title: 'Modo Asistido Requerido',
        message: `${subscriptions[modelId].name} no cuenta con clave de API directa. Usa el botón "Abrir en ${subscriptions[modelId].company}".`,
        type: 'intervention_needed',
        modelId,
        sourceAI: subscriptions[modelId].name,
      });
    }
  };

  // Cross-interaction
  const handleCrossInteract = async (fromModel: AIModelId, toModel: AIModelId, snippet: string) => {
    const prompt = `Revisa minuciosamente el código y la solución generada por ${subscriptions[fromModel].name}. Identifica vulnerabilidades, optimizaciones y propón la versión mejorada:\n\n${snippet.slice(0, 2000)}`;
    
    const userMsg: AIMessage = {
      id: `msg_user_cross_${Date.now()}`,
      modelId: 'user',
      senderName: 'Interacción Cruzada',
      content: `Solicitud a ${subscriptions[toModel].name}: Auditar respuesta de ${subscriptions[fromModel].name}`,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages(prev => [...prev, userMsg]);

    if (toModel === 'gemini') {
      setIsProcessing(prev => ({ ...prev, gemini: true }));
      const aiMsgId = `msg_gemini_reply_${Date.now()}`;
      setMessages(prev => [
        ...prev,
        {
          id: aiMsgId,
          modelId: 'gemini',
          senderName: subscriptions.gemini.name,
          content: '',
          timestamp: new Date().toLocaleTimeString(),
          inReplyTo: fromModel,
          isStreaming: true,
        }
      ]);

      const controller = new AbortController();
      activeAbortController.current = controller;

      try {
        const result = await orchestrator.generateGeminiStreamResponse(
          prompt,
          projectContext,
          files,
          messages,
          (chunk) => {
            setMessages(prev =>
              prev.map(m => m.id === aiMsgId ? { ...m, content: m.content + chunk } : m)
            );
          },
          controller.signal,
          snippet
        );

        setMessages(prev =>
          prev.map(m => m.id === aiMsgId ? { ...m, isStreaming: false } : m)
        );

        addNotification({
          title: 'Auditoría Finalizada',
          message: `Gemini revisó el aporte de ${subscriptions[fromModel].name}.`,
          type: 'ai_finished',
          modelId: 'gemini',
          sourceAI: 'Gemini',
        });
      } catch (err: any) {
        setMessages(prev =>
          prev.map(m => m.id === aiMsgId ? { ...m, isStreaming: false } : m)
        );
        addNotification({
          title: 'Error en Auditoría',
          message: err.message || 'Fallo al procesar revisión en Gemini.',
          type: 'intervention_needed',
        });
      } finally {
        activeAbortController.current = null;
        setIsProcessing(prev => ({ ...prev, gemini: false }));
      }
    } else {
      addNotification({
        title: 'Modo Asistido',
        message: `Para auditar con ${subscriptions[toModel].name}, copia el fragmento y pégalo en su interfaz web.`,
        type: 'intervention_needed',
        modelId: toModel,
      });
    }
  };

  // Orchestrate prompt
  const handleOrchestratedSend = async (userPrompt: string, mode: OrchestrationMode) => {
    const userMsg: AIMessage = {
      id: `msg_user_${Date.now()}`,
      modelId: 'user',
      senderName: 'Tú (Usuario)',
      content: userPrompt,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages(prev => [...prev, userMsg]);

    if (mode === 'consensus') {
      setIsSynthesizing(true);
      try {
        const realResponses: { modelId: AIModelId; modelName: string; text: string }[] = [];
        
        (['gemini', 'chatgpt', 'claude', 'meta'] as AIModelId[]).forEach(mId => {
          const modelMsgs = messages.filter(m => m.modelId === mId);
          if (modelMsgs.length > 0) {
            realResponses.push({
              modelId: mId,
              modelName: subscriptions[mId].name,
              text: modelMsgs[modelMsgs.length - 1].content,
            });
          }
        });

        // Add current Gemini response
        try {
          setIsProcessing(prev => ({ ...prev, gemini: true }));
          const geminiRes = await orchestrator.generateGeminiResponse(userPrompt, projectContext, files, messages);
          
          const geminiMsg: AIMessage = {
            id: `msg_gemini_${Date.now()}`,
            modelId: 'gemini',
            senderName: subscriptions.gemini.name,
            content: geminiRes.text,
            timestamp: new Date().toLocaleTimeString(),
          };
          setMessages(prev => [...prev, geminiMsg]);

          realResponses.push({
            modelId: 'gemini',
            modelName: subscriptions.gemini.name,
            text: geminiRes.text,
          });
        } finally {
          setIsProcessing(prev => ({ ...prev, gemini: false }));
        }

        const synthesisText = await orchestrator.generateConsensusSynthesis(
          userPrompt,
          realResponses,
          projectContext
        );

        const consensusMsg: AIMessage = {
          id: `msg_consensus_${Date.now()}`,
          modelId: 'system',
          senderName: 'Consenso Técnico Multi-IA',
          content: synthesisText,
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages(prev => [...prev, consensusMsg]);

        addNotification({
          title: 'Síntesis de Consenso Generada',
          message: 'Se consolidaron las respuestas reales disponibles en una solución unificada.',
          type: 'consensus_ready',
        });
      } catch (err: any) {
        addNotification({
          title: 'Error de Consenso',
          message: err.message || 'No fue posible completar la síntesis.',
          type: 'intervention_needed',
        });
      } finally {
        setIsSynthesizing(false);
      }
      return;
    }

    // Default mode: streaming call to Gemini
    setIsProcessing(prev => ({ ...prev, gemini: true }));
    const aiMsgId = `msg_gemini_${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        id: aiMsgId,
        modelId: 'gemini',
        senderName: subscriptions.gemini.name,
        content: '',
        timestamp: new Date().toLocaleTimeString(),
        isStreaming: true,
      }
    ]);

    const controller = new AbortController();
    activeAbortController.current = controller;

    try {
      const geminiResult = await orchestrator.generateGeminiStreamResponse(
        userPrompt,
        projectContext,
        files,
        messages,
        (chunk) => {
          setMessages(prev =>
            prev.map(m => m.id === aiMsgId ? { ...m, content: m.content + chunk } : m)
          );
        },
        controller.signal
      );

      setMessages(prev =>
        prev.map(m => m.id === aiMsgId ? { ...m, isStreaming: false } : m)
      );

      addNotification({
        title: 'Streaming Completado',
        message: `Análisis real completado en ${geminiResult.latencyMs} ms.`,
        type: 'ai_finished',
        modelId: 'gemini',
        sourceAI: 'Gemini',
      });
    } catch (err: any) {
      setMessages(prev =>
        prev.map(m => m.id === aiMsgId ? { ...m, isStreaming: false } : m)
      );
      addNotification({
        title: err.name === 'AbortError' ? 'Petición Cancelada' : 'Error de Respuesta',
        message: err.message || 'Error al conectar con la API de Gemini.',
        type: 'intervention_needed',
        modelId: 'gemini',
      });
    } finally {
      activeAbortController.current = null;
      setIsProcessing(prev => ({ ...prev, gemini: false }));
    }
  };

  // Global Keyboard Shortcuts (Ctrl+Enter, Ctrl+Shift+I, Ctrl+B)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';

      // Ctrl + Shift + I: Open Image Studio
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
        e.preventDefault();
        setIsImageStudioOpen(prev => !prev);
        return;
      }

      // Ctrl + B: Toggle Context Panel (ignore if typing in input/textarea)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'B' || e.key === 'b') && !e.shiftKey) {
        if (!isInput) {
          e.preventDefault();
          setShowContextAndFiles(prev => !prev);
          return;
        }
      }

      // Ctrl + Enter: Trigger send
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const submitBtn = document.getElementById('btn-orchestrator-submit');
        if (submitBtn) {
          e.preventDefault();
          submitBtn.click();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Backup & Restore Handlers
  const handleBackupWorkspace = () => {
    persistentStorage.exportBackup({
      messages,
      files,
      projectContext,
      imageRules,
      libraryItems,
      metrics: metricsStore.getRecords(),
      savedAt: new Date().toISOString(),
    });
    addNotification({
      title: 'Respaldo Descargado',
      message: 'Se descargó el archivo JSON con todo el estado del Workspace.',
      type: 'system',
    });
  };

  const handleRestoreFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const restored = persistentStorage.parseBackup(content);
        setMessages(restored.messages);
        setFiles(restored.files);
        setProjectContext(restored.projectContext);
        setImageRules(restored.imageRules);
        setLibraryItems(restored.libraryItems);
        metricsStore.setRecords(restored.metrics);

        addNotification({
          title: 'Workspace Restaurado',
          message: `Se restauraron exitosamente ${restored.messages.length} mensajes y ${restored.files.length} archivos.`,
          type: 'system',
        });
      } catch (err: any) {
        alert('Error al restaurar archivo: ' + err.message);
      }
    };
    reader.readAsText(file);
    if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Hidden input for restoring JSON backup */}
      <input
        ref={restoreFileInputRef}
        type="file"
        accept=".json"
        onChange={handleRestoreFileSelected}
        className="hidden"
      />

      {/* Top Main Navigation Header */}
      <Header
        subscriptions={subscriptions}
        onOpenSubscriptionsModal={() => setIsSubModalOpen(true)}
        onOpenImageStudio={() => setIsImageStudioOpen(true)}
        onOpenMediaLibrary={() => setIsMediaLibraryOpen(true)}
        onOpenSecurityAuth={() => setIsSecurityModalOpen(true)}
        onOpenAnalyticsDashboard={() => setIsAnalyticsDashboardOpen(true)}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        unreadNotificationsCount={unreadCount}
        userEmail={userEmail}
        layout={layout}
        onChangeLayout={setLayout}
        onClearSession={() => {
          if (window.confirm('¿Seguro que deseas vaciar el historial de mensajes de la sesión?')) {
            setMessages([]);
            addNotification({
              title: 'Historial Limpiado',
              message: 'Se reinició el historial de mensajes.',
              type: 'system',
            });
          }
        }}
        onExportSession={() => {
          const exportContent = messages.map(m => `### ${m.senderName} (${m.timestamp})\n${m.content}\n`).join('\n---\n\n');
          const blob = new Blob([`# Historial Nexus Multi-IA\n\n${exportContent}`], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `sesion_nexus_${Date.now()}.md`;
          a.click();
          URL.revokeObjectURL(url);
        }}
        onBackupJson={handleBackupWorkspace}
        onRestoreJson={() => restoreFileInputRef.current?.click()}
        isProcessing={Object.values(isProcessing).some(Boolean) || isSynthesizing}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-[1750px] w-full mx-auto p-3 sm:p-4 flex flex-col gap-3 overflow-hidden">
        {/* Collapsible Context & Files Drawer */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all">
          <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowContextAndFiles(!showContextAndFiles)}
                className="flex items-center gap-1.5 font-bold text-slate-200 hover:text-amber-400 transition-colors cursor-pointer"
              >
                {showContextAndFiles ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span>Espacio de Contexto & Archivos ({files.length})</span>
              </button>

              <div className="hidden sm:flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActiveTab('context')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    activeTab === 'context' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Contexto General
                </button>
                <button
                  onClick={() => setActiveTab('files')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    activeTab === 'files' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Archivos Adjuntos ({files.filter(f => f.includedInContext).length} activos)
                </button>
              </div>
            </div>

            <span className="text-[10px] text-slate-500 hidden md:inline">
              Atajo: <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400 font-mono">Ctrl+B</kbd> para alternar
            </span>
          </div>

          {showContextAndFiles && (
            <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 max-h-[300px] overflow-y-auto bg-slate-900/60">
              <div className="lg:col-span-6">
                <ContextWorkspace
                  context={projectContext}
                  onChangeContext={setProjectContext}
                  attachedFilesCount={files.filter(f => f.includedInContext).length}
                />
              </div>
              <div className="lg:col-span-6">
                <FileManager
                  files={files}
                  onAddFile={handleAddFile}
                  onUpdateFile={handleUpdateFile}
                  onDeleteFile={handleDeleteFile}
                  onToggleContext={handleToggleFileContext}
                />
              </div>
            </div>
          )}
        </div>

        {/* View Layout Selection Area */}
        <div className="flex-1 min-h-[460px] overflow-hidden">
          {layout === 'split_4' ? (
            <SplitViewGrid
              subscriptions={subscriptions}
              messages={messages}
              isProcessing={isProcessing}
              onSendToModel={handleSendToSingleModel}
              onCrossInteract={handleCrossInteract}
              onOpenSandbox={(code, src) => {
                setSandboxCode(code);
                setSandboxSource(src);
              }}
              onFocusMessage={setFocusedMessage}
              onAssistedPaste={handleAssistedPaste}
            />
          ) : (
            <ChatUnifiedFeed
              messages={messages}
              subscriptions={subscriptions}
              onOpenSandbox={(code, src) => {
                setSandboxCode(code);
                setSandboxSource(src);
              }}
              onFocusMessage={setFocusedMessage}
            />
          )}
        </div>

        {/* Bottom Multi-IA Orchestration Bar */}
        <OrchestrationBar
          subscriptions={subscriptions}
          isProcessing={Object.values(isProcessing).some(Boolean)}
          isSynthesizing={isSynthesizing}
          onSendPrompt={handleOrchestratedSend}
          onCancel={handleCancelStreaming}
        />
      </main>

      {/* Real-time Notification Banner Toasts */}
      <ToastBannerContainer
        toasts={notifications.filter(n => !n.read)}
        onDismiss={(id) => {
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        }}
        onOpenCenter={() => setIsNotificationCenterOpen(true)}
      />

      {/* Real-time Notification Center Modal */}
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={() => {
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }}
        onClearAll={() => setNotifications([])}
        onDismissNotification={(id) => {
          setNotifications(prev => prev.filter(n => n.id !== id));
        }}
        onActionClick={(notif) => {
          if (notif.modelId === 'gemini') {
            setIsSubModalOpen(true);
          }
        }}
      />

      {/* User Intervention Modal */}
      <UserInterventionModal
        isOpen={!!activeIntervention}
        onClose={() => setActiveIntervention(null)}
        intervention={activeIntervention}
        onResolve={(optId, feedback) => {
          addNotification({
            title: 'Intervención Resuelta',
            message: `Decisión confirmada: ${optId}. ${feedback ? `Nota: ${feedback}` : ''}`,
            type: 'system',
          });
          setActiveIntervention(null);
        }}
        subscriptions={subscriptions}
      />

      {/* Subscriber Account Modal */}
      <SubscriberAccountModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        subscriptions={subscriptions}
        onUpdateSubscription={handleUpdateSubscription}
        onCheckGeminiHealth={handleCheckGeminiHealth}
      />

      {/* Safe Code Sandbox Modal */}
      {sandboxCode && (
        <CodeSandboxModal
          isOpen={!!sandboxCode}
          onClose={() => setSandboxCode(null)}
          initialCode={sandboxCode}
          sourceAI={sandboxSource}
        />
      )}

      {/* Focus Message Modal */}
      {focusedMessage && (
        <FocusDocumentModal
          message={focusedMessage}
          onClose={() => setFocusedMessage(null)}
          subscriptions={subscriptions}
          onOpenSandbox={(code, src) => {
            setFocusedMessage(null);
            setSandboxCode(code);
            setSandboxSource(src);
          }}
        />
      )}

      {/* Image Studio Modal */}
      <ImageStudioModal
        isOpen={isImageStudioOpen}
        onClose={() => setIsImageStudioOpen(false)}
        rules={imageRules}
        onOpenRules={() => setIsImageRulesOpen(true)}
        onSaveToLibrary={handleSaveGeneratedImageToLibrary}
        subscriptions={subscriptions}
      />

      {/* Image Rules & Instructions Modal */}
      <ImageRulesModal
        isOpen={isImageRulesOpen}
        onClose={() => setIsImageRulesOpen(false)}
        rules={imageRules}
        onUpdateRules={setImageRules}
      />

      {/* Media and Assets Library Modal */}
      <MediaLibraryModal
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        items={libraryItems}
        onAddItem={handleAddLibraryItem}
        onDeleteItem={handleDeleteLibraryItem}
        onSelectForStudio={() => {
          setIsMediaLibraryOpen(false);
          setIsImageStudioOpen(true);
        }}
      />

      {/* Security Verification Modal */}
      <SecurityAuthModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        userEmail={userEmail}
        subscriptions={subscriptions}
      />

      {/* Analytics Dashboard Modal */}
      <AnalyticsDashboardModal
        isOpen={isAnalyticsDashboardOpen}
        onClose={() => setIsAnalyticsDashboardOpen(false)}
        subscriptions={subscriptions}
      />
    </div>
  );
}
