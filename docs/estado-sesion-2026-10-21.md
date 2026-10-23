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
3. Agente local: Codex YA funciona (prueba real hecha, ver `docs/PRUEBA_REAL_CODEX_2026-10-21.md`; usa el codex.exe de la app ChatGPT, no hace falta reparar npm). Faltan: `claude auth login` y corregir que la respuesta de Codex llega con su cabecera (usar `--output-last-message`).
4. Prueba real con claves: 1 llamada a `/api/stream` y 1 a Groq (consume cuota minima).
5. #9 Ollama (descarga/instalacion; decision del dueno).
6. Retirar `callGeminiWithBackoff` (sin uso) en una sesion aparte; ver `obsoletos/MANIFIESTO.md`.
7. Borrar `_respaldos/nexus-zip-extraido-2026-10-21` cuando el dueno lo autorice.

## Siguiente prompt sugerido
"Retomar Nexus-Multi-IA-Studio: ya movi mis claves a .env.local. Verifica solo nombres, haz el push de los commits pendientes y luego una prueba real de /api/stream y Groq."

## CIERRE 2026-10-23
- Material `entregas_vigentes` (copia del otro proyecto): referencias cambiadas solo en 10 textos (`docs/CAMBIO_REFERENCIAS_2026-10-23.md`); variantes V6 (pie) y V7 (diseno completo, 6 piezas) en `src/assets/images/entregas_vigentes/` (SIN seguimiento de git); `scripts/generar_v6.mjs` y `scripts/generar_v7.mjs`; prueba `test/entregas.test.ts`. 58/58 pruebas en main local.
- **Subido a la rama del PR #1** (`ccr-64f7adeb-uacsbu`, commit `f0db68d`, avance normal): solo CLAUDE.md (seccion nueva), `docs/CAMBIO_REFERENCIAS_2026-10-23.md`, `scripts/generar_v7.mjs` y `test/entregas.test.ts`. Sin imagenes ni videos. NO se subio `generar_v6.mjs` (depende del Compositor, que solo existe en main local). En esa rama: 20 pruebas OK, 5 omitidas (el material no esta alli), lint y build OK.
- `main` sigue con **7 commits locales sin subir** (GitHub en `c51b87c`) y `.env.example` con claves reales sin tocar: el push de main espera a que el dueno las mueva a `.env.local`.
- Pendiente: decidir si el material se publica (repo publico), `claude auth login`, 46 imagenes de BORRADORES, #9 Ollama, E2E a veces fallan por carga si quedan procesos huerfanos (matar headless antes de correr la suite).
