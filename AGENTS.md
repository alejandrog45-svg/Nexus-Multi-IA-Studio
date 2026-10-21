# AGENTS.md - Nexus-Multi-IA-Studio

Mismas reglas que `CLAUDE.md` (leer ese archivo primero). Resumen para Codex y otros agentes:

- Proyecto: React 19 + Vite + Tailwind 4 + Express (`server.ts`) + `@google/genai`. Repo `alejandrog45-svg/Nexus-Multi-IA-Studio`.
- Disco W: unicamente (nunca D). No leer ni imprimir `.env*`, tokens ni llaves.
- Cuenta de trabajo: `alejandrog45` (GitHub via `W:\PROYECTOS CUENTA ALEJANDROG45\herramientas-portables\gh.cmd`). Antes de push: `git config user.email`.
- Safe Change: `TOCO / ARCHIVO / RAZON / NO TOCO` antes de cada cambio; no reescribir lo que funciona; no debilitar validaciones.
- Costo cero. Un prompt = una funcion. Sin force push.
- Cuota Gemini gratuita ~20 req/dia por modelo: no llamar a APIs de IA sin orden expresa.
- Archivos nuevos: nada suelto en la raiz; temporales fuera del repo; inventarios con cuentas en `.local/` (ignorado).
