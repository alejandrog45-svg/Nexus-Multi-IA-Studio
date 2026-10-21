# Nexus Multi-IA Studio

Estudio multi-IA en espanol (React 19 + Vite + Tailwind 4 + Express + `@google/genai`). Origen: app de Google AI Studio.
Leer `CLAUDE.md` (reglas y estado) y `docs/DIAGNOSTICO_2026-10-21.md` (plan de mejoras).

## Requisitos
Node 22+ (en este equipo: el portable de `W:\PROYECTOS CUENTA ALEJANDROG45\herramientas-portables\nodejs-portable`).

## Uso
```
npm ci
copy .env.example .env.local     # y poner GEMINI_API_KEY (solo en el servidor; .env* esta ignorado por git)
npm run dev                      # desarrollo (Vite + servidor)
npm run build && npm start       # produccion: sirve dist/
npm run lint                     # tsc --noEmit
npm test                         # unitarias + integracion (Gemini falso) + E2E (Chromium headless)
```
En W: usar `npm ... --cache "W:\PROYECTOS CUENTA ALEJANDROG45\herramientas-portables\npm-cache-nexus"` (el npm portable apunta por defecto a `E:\npm-cache`).

## Cuota gratuita de Gemini
~20 solicitudes/dia por modelo. El servidor rota entre `GEMINI_MODELS`, cuenta el uso diario (`GET /api/quota`), bloquea modelos con 429 y cachea respuestas identicas.

## Estructura
`src/` interfaz y servicios del cliente · `server.ts` API + estatico · `server/` logica de cuota y cache · `test/` pruebas · `docs/` diagnostico y estado · `obsoletos/` (al cerrar) lo que ya no es parte del flujo.
