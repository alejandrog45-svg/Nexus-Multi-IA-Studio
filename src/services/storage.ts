import { AIMessage, AttachedFile, ImageRule, MediaLibraryItem } from '../types';
import { ChatMetricRecord } from './aiOrchestrator';

export interface NexusAppState {
  messages: AIMessage[];
  files: AttachedFile[];
  projectContext: string;
  imageRules: ImageRule[];
  libraryItems: MediaLibraryItem[];
  metrics: ChatMetricRecord[];
  savedAt: string;
}

const DB_NAME = 'NexusStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';
const STATE_KEY = 'current_workspace_state';

class IndexedDBStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB no está disponible en este entorno.'));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  async saveState(state: Omit<NexusAppState, 'savedAt'>): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const payload: NexusAppState = {
        ...state,
        savedAt: new Date().toISOString(),
      };

      await new Promise<void>((resolve, reject) => {
        const req = store.put(payload, STATE_KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[IndexedDB] Error al guardar estado:', err);
    }
  }

  async loadState(): Promise<NexusAppState | null> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      return new Promise<NexusAppState | null>((resolve, reject) => {
        const req = store.get(STATE_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[IndexedDB] Error al cargar estado:', err);
      return null;
    }
  }

  exportBackup(state: NexusAppState): void {
    const jsonStr = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_respaldo_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  parseBackup(jsonString: string): NexusAppState {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('El archivo de respaldo no tiene un formato JSON válido.');
    }
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      files: Array.isArray(parsed.files) ? parsed.files : [],
      projectContext: typeof parsed.projectContext === 'string' ? parsed.projectContext : '',
      imageRules: Array.isArray(parsed.imageRules) ? parsed.imageRules : [],
      libraryItems: Array.isArray(parsed.libraryItems) ? parsed.libraryItems : [],
      metrics: Array.isArray(parsed.metrics) ? parsed.metrics : [],
      savedAt: parsed.savedAt || new Date().toISOString(),
    };
  }
}

export const persistentStorage = new IndexedDBStorage();
