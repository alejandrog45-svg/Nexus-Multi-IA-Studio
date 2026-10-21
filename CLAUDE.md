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

## Cierre de sesion
(se completa al final de la sesion de preparacion)
