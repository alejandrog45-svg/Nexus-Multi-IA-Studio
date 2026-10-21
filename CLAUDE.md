# CLAUDE.md - Nexus-Multi-IA-Studio

## Que es
App "Centro de Creacion en Espanol" / "Nexus Multi-IA Studio", generada en Google AI Studio. Estudio multi-IA (chat orquestado, imagen, sandbox de codigo, biblioteca de medios, analitica) en espanol.
- Repo: https://github.com/alejandrog45-svg/Nexus-Multi-IA-Studio (publico: NUNCA subir secretos)
- Ruta: `W:\PROYECTOS CUENTA ALEJANDROG45\Nexus-Multi-IA-Studio`
- Cuenta: Google `alejandrog45@gmail.com`, GitHub `alejandrog45-svg` (usar `herramientas-portables\gh.cmd`)

## Stack
React 19 + Vite + Tailwind 4 + Express (`server.ts`, proxy a Gemini) + `@google/genai`. Scripts: `npm run dev` (tsx server.ts), `npm run lint` (tsc --noEmit), `npm run build` (vite build).

## Reglas del dueno
- NUNCA usar el disco D. Todo en W:.
- No tocar credenciales ni `.env`; la clave `GEMINI_API_KEY` vive solo en servidor (`.env.local`, ignorado por git).
- Safe Change: antes de cada cambio `TOCO / ARCHIVO / RAZON / NO TOCO`, respaldo previo, nunca debilitar validaciones.
- Costo cero (sin servicios de pago).
- Un prompt = una funcion.
- Sin force push. Un push = un proyecto; comprobar `git config user.email` antes.

## Restriccion de cuota Gemini
Plan gratuito: ~20 solicitudes/dia por modelo (error 429 real). Repartir entre modelos, cachear y usar proveedores gratuitos de apoyo. No hacer llamadas a IA en sesiones de diagnostico.

## Estado actual (2026-10-21, preparacion)
- Fase 1 construida segun el agente anterior: proxy Express, sin clave en cliente, estados honestos, metricas reales.
- Fase 2 incompleta: `/api/stream` sin verificar, imagen sin verificar por cuota, persistencia IndexedDB y File System Access sin probar.
- Esta sesion solo preparo el proyecto y diagnostico; no se implemento nada. Detalle del diagnostico: ver cierre abajo.

## Avance de mejoras 2026-10-21 (un commit por mejora, todas verificadas con `npm test`: 19/19, lint y build OK)
- HECHAS: #1 instalacion reproducible, #2 servir dist/ (`npm start`), #3 rotacion de modelos + contador + cache + `/api/quota`, #4 gancho de cuota simulada solo en dev + estado "conectado" honesto, #5 metricas con modelo y tokens reales, #7 pruebas E2E (IndexedDB, respaldo, carpeta local), #8 filtro de archivos sensibles (cliente y servidor).
- BUG REAL CORREGIDO: `/api/stream` cortaba la respuesta porque escuchaba `req.on('close')` (en Node moderno se dispara al leer el cuerpo). Ahora usa `res`.
- Verificado solo contra un Gemini FALSO local (`GEMINI_BASE_URL`); falta 1 prueba con clave real (consume 1 de las ~20 diarias).
- PENDIENTES (requieren decision del dueno): #6 Groq/OpenRouter (hay que crear claves gratuitas), #9 Ollama (descarga/instalacion), #10 agente local de CLIs (riesgo alto), #11 imagen real.
- Tests: `test/` (unitarias, integracion con Gemini falso, E2E con Chromium headless de W: `playwright-browsers`). No usar herramientas de navegador de E:.

## Cierre de sesion 2026-10-21 (preparacion; sin deploy)
- Commit inicial `c09d883` en `main` (push OK, repo estaba vacio). No hay deploy: solo preparacion.
- `npm run lint` OK. `npm install` falla por ERESOLVE (esbuild ^0.25 vs peer de vite 8) y el build solo pasa instalando `react-is` aparte. En W: usar `npm install --legacy-peer-deps --cache "W:\PROYECTOS CUENTA ALEJANDROG45\herramientas-portables\npm-cache-nexus"` (el npm portable apunta a `E:\npm-cache` por defecto).
- Real: proxy Express (/api/chat, /api/stream en codigo), clave solo en servidor, IndexedDB y sandbox en codigo. NO verificado en ejecucion: stream, imagen, IndexedDB, File System Access. Solo Gemini es IA real; ChatGPT/Claude/Meta = Modo Asistido manual.
- Diagnostico, riesgos y plan de 11 mejoras: `docs/DIAGNOSTICO_2026-10-21.md`. Estado y siguiente prompt: `docs/estado-sesion-2026-10-21.md`.
- Inventario de herramientas/cuentas (con correos): `.local/` (ignorado por git; no subir).

## Revision 2026-10-21 (sesion en la nube, desde el celular)
- Repo en `main` = rama de trabajo (`c51b87c`); sin PR ni deploy. `npm ci --legacy-peer-deps`, lint y build OK; `npm test`: 19 pruebas, 16 OK, 0 fallan (3 omitidas, E2E sin Chromium de W:).
- URL publica: NO existe. Desde el contenedor no se puede exponer un puerto. La app necesita servidor Node (proxy Gemini), por lo que GitHub Pages no sirve. Opcion gratuita pendiente de decision: Render / Cloud Run con `GEMINI_API_KEY` como variable de entorno. Riesgo: URL publica = cualquiera gasta la cuota (~20/dia); anadir proteccion de acceso antes de publicar.
- Nota: `E:` y `W:` no son accesibles desde la nube; la carpeta de conocimiento del negocio se actualiza al volver al PC.
- Preparado para Render gratis (2026-10-21, sin desplegar): `render.yaml` define SOLO el servicio nuevo `nexus-multi-ia-studio` (plan free); no toca `oviedo-whatsapp-bot` ni `plataforma-anuncios-stg`. `server.ts` tiene portón opcional: con `ACCESS_CODE` todo pide contraseña (Basic, cualquier usuario) salvo `/api/health`. Variables `GEMINI_API_KEY` y `ACCESS_CODE` se escriben solo en el panel de Render. Pruebas: 17 OK, 0 fallan, 3 omitidas.
