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

## Avance de mejoras 2026-10-21 (un commit por mejora, todas verificadas con `npm test`: 29/29, lint y build OK)
- HECHAS: #1 instalacion reproducible, #2 servir dist/ (`npm start`), #3 rotacion de modelos + contador + cache + `/api/quota`, #4 gancho de cuota simulada solo en dev + estado "conectado" honesto, #5 metricas con modelo y tokens reales, #6 (ver abajo), #7 pruebas E2E (IndexedDB, respaldo, carpeta local), #8 filtro de archivos sensibles (cliente y servidor).
- BUG REAL CORREGIDO: `/api/stream` cortaba la respuesta porque escuchaba `req.on('close')` (en Node moderno se dispara al leer el cuerpo). Ahora usa `res`.
- Verificado solo contra un Gemini FALSO local (`GEMINI_BASE_URL`); falta 1 prueba con clave real (consume 1 de las ~20 diarias).
- #6 HECHA: Groq (Llama) alimenta la tarjeta Meta AI y OpenRouter (Gemma) es respaldo automatico de Gemini sin cuota, siempre rotulados con proveedor y modelo reales; claves solo en .env.local (GROQ_API_KEY, OPENROUTER_API_KEY). Probado con proveedores falsos y demo en vivo en Chrome; FALTA probar con claves reales (el .env.local no existia en la carpeta del proyecto al terminar).
- #10 HECHA (elegida por el dueno tras 3 informes de investigacion web): agente local `server/localAgent.ts` para Claude Code y Codex con la suscripcion del propio usuario. Opt-in `LOCAL_AGENT=1`. 44/44 pruebas con CLIs falsas. Codex: se usa el `codex.exe` que trae la app ChatGPT de escritorio (codex-cli 0.163.0-alpha.10.2, "Logged in using ChatGPT", flags --sandbox/--skip-git-repo-check/--ephemeral verificados en su --help; no hace falta reparar el npm de W:). PRUEBA REAL HECHA (2026-10-21): ChatGPT respondio "OK" via codex.exe, exit 0, 38,8 s, 9538 tokens; detalle y defecto pendiente (la respuesta llega mezclada con la cabecera de Codex) en `docs/PRUEBA_REAL_CODEX_2026-10-21.md`. PENDIENTE: `claude auth login` y corregir el defecto de la cabecera (usar --output-last-message).
- #11 HECHA (variante realista, sin IA): Compositor de Flyer (`src/components/FlyerComposerModal.tsx`, `src/services/flyerComposer.ts`). Detecta la franja libre de la imagen base, conserva la imagen ORIGINAL pixel a pixel (informe de 0 pixeles modificados), reusa recortes exactos del logo original y solo dibuja texto que escribe el usuario (por defecto, datos que ya salen en el flyer; contacto vacio). Si no hay franja anade una banda. 52 pruebas. Salida de ejemplo en `.local/variantes/` (fuera de git). Tipografia aproximada (Arial Black), no la de marca.
- Vias descartadas/aplazadas: iframes (X-Frame-Options), extension propia que automatiza las webs (va contra los terminos de Anthropic), CDP (Chrome 136+ exige perfil dedicado).
- PENDIENTES (requieren decision del dueno): #9 Ollama (descarga/instalacion), #10 agente local de CLIs (riesgo alto), #11 imagen real.
- Tests: `test/` (unitarias, integracion con Gemini falso, E2E con Chromium headless de W: `playwright-browsers`). No usar herramientas de navegador de E:.

## CIERRE FINAL 2026-10-21: leer `docs/estado-sesion-2026-10-21.md` (pendientes, git sin subir y siguiente prompt). Suite 52/52, lint y build OK. Carpeta `obsoletos/` creada (bun.lock). NO hacer push hasta que el dueno mueva sus claves de `.env.example` a `.env.local`.

## Cierre de sesion 2026-10-21 (preparacion; sin deploy)
- Commit inicial `c09d883` en `main` (push OK, repo estaba vacio). No hay deploy: solo preparacion.
- `npm run lint` OK. `npm install` falla por ERESOLVE (esbuild ^0.25 vs peer de vite 8) y el build solo pasa instalando `react-is` aparte. En W: usar `npm install --legacy-peer-deps --cache "W:\PROYECTOS CUENTA ALEJANDROG45\herramientas-portables\npm-cache-nexus"` (el npm portable apunta a `E:\npm-cache` por defecto).
- Real: proxy Express (/api/chat, /api/stream en codigo), clave solo en servidor, IndexedDB y sandbox en codigo. NO verificado en ejecucion: stream, imagen, IndexedDB, File System Access. Solo Gemini es IA real; ChatGPT/Claude/Meta = Modo Asistido manual.
- Diagnostico, riesgos y plan de 11 mejoras: `docs/DIAGNOSTICO_2026-10-21.md`. Estado y siguiente prompt: `docs/estado-sesion-2026-10-21.md`.
- Inventario de herramientas/cuentas (con correos): `.local/` (ignorado por git; no subir).
