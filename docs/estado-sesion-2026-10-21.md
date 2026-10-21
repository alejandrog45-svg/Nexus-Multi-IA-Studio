# Estado de sesion 2026-10-21 (cierre)

## Hecho (un commit por mejora; suite de 52 pruebas, lint y build en verde)
- #1 instalacion reproducible, #2 `npm start` sirve dist/, #3 rotacion de modelos + contador + cache + `/api/quota`, #4 gancho de cuota solo en dev y estado "conectado" honesto, #5 metricas reales, #7 pruebas E2E, #8 filtro de archivos sensibles.
- Bug real corregido: `/api/stream` cortaba la respuesta (`req.on('close')` en Node moderno).
- #6 Groq (Llama, tarjeta Meta AI) y OpenRouter (respaldo de Gemini), siempre rotulados con proveedor y modelo reales.
- #10 agente local para Claude Code y Codex con la suscripcion del propio usuario (opt-in `LOCAL_AGENT=1`, mismo origen, token, comandos fijos, confirmacion por ejecucion). Verificado con CLIs falsas, tambien en vivo en Chrome.
- #11 Compositor de Flyer sin IA: imagen original intacta (0 pixeles modificados), logo recortado de la propia imagen, texto solo el que escribe el usuario. Variante de ejemplo: `.local/variantes/VARIANTE_FERIA_2026_pie_datos_originales.png` (fuera de git).
- Carpeta `obsoletos/` creada (bun.lock) con README y MANIFIESTO.
- Investigacion web (3 agentes): iframes imposibles; extension que automatiza las webs va contra terminos de Anthropic (descartada); CDP exige perfil dedicado en Chrome 136+.

## Estado de git (IMPORTANTE para seguir en otro equipo)
- GitHub esta en `c51b87c`. Hay **commits locales sin subir**: #6, #10, #11 y el cierre. No estan en GitHub.
- El push se bloqueo porque el dueno pego claves reales en `.env.example` (GitHub lo detecto). Los commits NO contienen claves; el `.env.example` real queda solo en el disco de W:.
- Para seguir en casa: o se lleva el disco W:, o primero se mueven las claves a `.env.local`, se quitan de `.env.example`, y se autoriza el push (normal, sin force).

## Pendiente
1. Mover claves reales de `.env.example` a `.env.local` y autorizar el push.
2. Decidir las 46 imagenes de `src/assets/images/BORRADORES/` (sin seguimiento de git, intactas; no pertenecen a este proyecto).
3. Agente local con CLIs reales: `claude auth login`; reparar Codex en W: (falta `@openai/codex-win32-x64`) y `codex login`; reverificar flags de `codex exec`.
4. Prueba real con claves: 1 llamada a `/api/stream` y 1 a Groq (consume cuota minima).
5. #9 Ollama (descarga/instalacion; decision del dueno).
6. Retirar `callGeminiWithBackoff` (sin uso) en una sesion aparte; ver `obsoletos/MANIFIESTO.md`.
7. Borrar `_respaldos/nexus-zip-extraido-2026-10-21` cuando el dueno lo autorice.

## Siguiente prompt sugerido
"Retomar Nexus-Multi-IA-Studio: ya movi mis claves a .env.local. Verifica solo nombres, haz el push de los commits pendientes y luego una prueba real de /api/stream y Groq."
