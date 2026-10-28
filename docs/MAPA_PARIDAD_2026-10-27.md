# Mapa de paridad local/GitHub — 2026-10-27

## Alcance de este paso

Revisión exclusivamente de lectura. No se hicieron cambios de código, ramas, GitHub, Cloudflare, Render ni secretos.

## Identidad verificada

- Cuenta GitHub: `alejandrog45-svg`.
- Repositorio: `alejandrog45-svg/Nexus-Multi-IA-Studio`.
- Rama local inspeccionada: `main`.
- `main` local: `3c7fec097b7ff2653217800b5f69ceb1f320858a`.
- `origin/main`: `c51b87cf49f731ad3e5e7c2b859f94a16df768d6`.
- Diferencia: la copia local tiene 8 commits que no están en `origin/main`.

## Commits presentes solo en el main local

1. `20c0c95` — proveedores Groq/OpenRouter y respaldo de Gemini.
2. `9e6a16f` — agente local para Claude Code y Codex.
3. `603bb23` — compositor de flyers sin IA.
4. `7570b40` — cierre E2E y carpeta de obsoletos.
5. `0faef95` — uso del Codex de la aplicación ChatGPT.
6. `2439478` — documentación de prueba real del agente Codex.
7. `88a6523` — materiales, V6/V7 y pruebas de integridad.
8. `3c7fec0` — cierre de sesión y estado local.

## Archivos funcionales presentes solo en local

- `server/providers.ts`
- `server/localAgent.ts`
- `src/components/FlyerComposerModal.tsx`
- `src/services/flyerComposer.ts`
- `scripts/generar_v6.mjs`
- `scripts/generar_v7.mjs`
- pruebas de proveedores, agentes, compositor, persistencia y entregas.

## Estado de trabajo local

- `.env.example` tiene cambios locales no confirmados. Su contenido no se leyó.
- `src/assets/images/BORRADORES/` está sin seguimiento.
- `src/assets/images/entregas_vigentes/` está sin seguimiento.
- No se autoriza incluir esos elementos en un push hasta revisarlos por separado.

## PR #1 remoto

- Rama: `ccr-64f7adeb-uacsbu`.
- Estado: abierto y borrador.
- HEAD: `f0db68d01c9ade152e4168b6544fb50cf2556b8b`.
- Incluye `render.yaml`, `test/accessGate.test.ts` y un portón opcional `ACCESS_CODE`.
- No contiene todos los 8 commits que están en el `main` local.

## Diagnóstico de fuentes

Actualmente no existe una fuente única sincronizada. La copia local contiene la implementación funcional más avanzada; GitHub `main` es anterior; el PR #1 contiene una preparación distinta para Render.

## Clasificación funcional frente al PR #1

### Conservar para la aplicación completa

- `server/providers.ts`: selección de proveedores y respaldo.
- `server/localAgent.ts`: agente local opt-in.
- `src/App.tsx` y componentes asociados: interfaz Nexus completa.
- `src/services/aiOrchestrator.ts`: llamadas de frontend hacia el backend.
- `src/components/FlyerComposerModal.tsx` y `src/services/flyerComposer.ts`: compositor sin IA.
- pruebas de proveedores, agentes, compositor, integración y E2E.

### Integrar después, con revisión de despliegue

- `render.yaml`: define un servicio Render gratuito, `npm run build`, `npm start` y `/api/health`.
- `test/accessGate.test.ts`: prueba del portón `ACCESS_CODE`.
- Cambios de `server.ts` del PR: deben reconciliarse con los endpoints y mejoras del `main` local.

### No mezclar todavía

- `NEXUS_OVIEDO_STUDIO_V2/public`: es la copia estática del compositor/Drive y no sustituye al servidor Express.
- Nexus original de Sites: fuente externa separada.
- `.env.example`: tiene cambios locales no revisados; no leer valores ni subirlo.
- `BORRADORES/` y `entregas_vigentes/`: materiales grandes sin seguimiento; requieren decisión independiente.

## Resultado del paso 2

El PR #1 no es una versión completa equivalente al `main` local. La ruta correcta de trabajo es reconciliar primero el servidor local avanzado con la configuración Render del PR, conservando las pruebas y sin trasladar secretos ni materiales grandes.

## Regla de no retroceso

No hacer merge, push, reset, limpieza, despliegue ni mover imágenes hasta elegir una fuente oficial y revisar por separado `.env.example` y los materiales no rastreados.

## Próximo paso autorizado

Comparar los archivos funcionales de los 8 commits locales contra el PR #1 y clasificar cada diferencia como: conservar, integrar después, excluir o requiere decisión del dueño.
