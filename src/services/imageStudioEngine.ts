import { GeneratedImage, ImageRule } from '../types';

export const DEFAULT_IMAGE_RULES: ImageRule[] = [
  {
    id: 'rule_quality_4k',
    title: 'Calidad Ultra-Alta & Fidelidad',
    description: 'Renderizado fotográfico nítido, sin compresión visible ni ruido.',
    category: 'quality',
    enabled: true,
    priority: 'mandatory'
  },
  {
    id: 'rule_cinematic_light',
    title: 'Iluminación Cinematográfica & Volumétrica',
    description: 'Graduación de color profesional, reflejos realistas y sombras suaves.',
    category: 'style',
    enabled: true,
    priority: 'mandatory'
  },
  {
    id: 'rule_no_artifacts',
    title: 'Restricción Negativa: Sin Deformaciones',
    description: 'Evitar texto borroso, caras asimétricas y fondos distorsionados.',
    category: 'negative',
    enabled: true,
    priority: 'mandatory'
  },
  {
    id: 'rule_strict_composition',
    title: 'Composición y Regla de los Tercios',
    description: 'Encuadre equilibrado y separación clara entre sujeto y fondo.',
    category: 'composition',
    enabled: true,
    priority: 'recommended'
  }
];

export class ImageStudioEngine {
  /**
   * Honest check for image generation capability.
   * Free-tier AI Studio keys return 429 quota exhaustion or require Vertex AI Enterprise billing.
   */
  async checkImageGenerationSupport(): Promise<{ available: boolean; reason: string }> {
    return {
      available: false,
      reason: 'La cuota de generación de imágenes con IA para esta clave de Google AI Studio está restringida (Código 429 / Requiere cuenta con facturación en Google Cloud para Imagen 3 / Gemini Image).',
    };
  }
}

export const imageEngine = new ImageStudioEngine();
