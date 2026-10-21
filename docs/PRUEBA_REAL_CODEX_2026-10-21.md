# Prueba real del agente local con ChatGPT (Codex) - 2026-10-21

Primera ejecucion REAL (no simulada) del agente local de CLIs. Una sola vez, autorizada por el dueno, confirmada por el dueno en el dialogo nativo de Chrome.

## Condiciones
- Servidor: `LOCAL_AGENT=1 npm start` en el puerto 3950, sin CLIs falsas ni claves.
- Estado detectado por el servidor: `codex` instalado y con sesion ("Logged in using ChatGPT"); `claude` instalado pero SIN sesion (`loggedIn=false`).
- CLI usada: `codex.exe` que trae la app ChatGPT de escritorio (`%LOCALAPPDATA%\OpenAI\Codex\bin\896a0166b774037a\codex.exe`, codex-cli 0.163.0-alpha.10.2), detectada sola por `bundledCodexExe`.
- Comando ejecutado: `codex.exe exec --sandbox read-only --skip-git-repo-check --ephemeral -` (texto por stdin, carpeta `.local/agent-scratch`, sin claves del servidor).
- Mensaje: "Responde solo con la palabra: OK" mas el contexto de ejemplo de la app (2 archivos de muestra). 928 caracteres en total.
- La tarjeta de ChatGPT paso sola de Modo Asistido a "Instruccion directa a ChatGPT (OpenAI)".

## Resultado
| Dato | Valor |
|---|---|
| Respuesta final | `OK` (correcta) |
| Auditoria (`.local/agent-audit.log`) | `agent=codex promptChars=928 exit=0 ms=38758 timedOut=false` (sin contenido del prompt) |
| Modelo que uso Codex | `gpt-5.6-luna`, provider `openai`, sandbox `read-only`, approval `never` |
| Tokens que informo Codex | 9538 (muy por encima de lo que pesa el mensaje: incluye las instrucciones propias del agente) |
| Latencia | 38,8 s |
| Etiqueta en la tarjeta | "Codex (CLI local) · tu suscripcion" |

Las 4 barreras funcionaron con la CLI real: solo mismo origen, token, comando fijo y confirmacion antes de ejecutar (la ejecucion ocurrio despues del "Aceptar" del dueno).

## Hallazgos (NO corregidos; el dueno pidio dejarlo asi)
1. **La respuesta llega mezclada con la cabecera de Codex.** El mensaje mostrado incluye el banner (`OpenAI Codex v0.163...`, workdir, model, session id), el eco del prompt (`user ...`) y `tokens used`, y la respuesta (`OK`) esta al final. Causa: `runCli` en `server/localAgent.ts` agrega stderr (hasta 2000 caracteres) al texto y Codex imprime ahi su cabecera.
   Arreglo propuesto: usar `--output-last-message <archivo>` (existe en `codex exec --help`) o separar stdout de stderr y devolver solo la respuesta final; luego una prueba con la CLI falsa que imprima ruido por stderr.
2. **Costo de tokens alto para un mensaje trivial (9538).** Considerar enviar contexto solo si el usuario lo pide; hoy la app incluye por defecto el contexto y los archivos marcados.
3. **Latencia de ~39 s** por un "OK". Normal para el arranque de un agente; mostrar un indicador de espera mas claro y mantener el limite de 120 s.
4. **Metricas:** la tarjeta del dashboard registra 0 tokens para las CLIs (el agente no los parsea); depende del arreglo 1.
5. **Claude:** sigue sin sesion en el CLI; su tarjeta permanece en Modo Asistido hasta `claude auth login`.

## Como volver a ejecutar
1. `LOCAL_AGENT=1` en `.env.local` (o `LOCAL_AGENT=1 npm start`).
2. Abrir la app, escribir en la tarjeta de ChatGPT y aceptar el dialogo con el comando exacto.

## Estado en que se dejo la sesion
Servidor real corriendo en `http://127.0.0.1:3950` y la pestana de Chrome abierta, por orden del dueno. Para detenerlo: cerrar el proceso `node` de `server.ts` (o `taskkill` al arbol del `npm start`). GitHub sigue en `c51b87c`: hay commits locales sin subir (ver `docs/estado-sesion-2026-10-21.md`).
