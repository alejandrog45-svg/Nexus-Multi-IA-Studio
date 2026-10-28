# Plan de trabajo estricto — Nexus Multi-IA Studio

Fecha: 2026-10-27  
Cuenta: `alejandrog45@gmail.com` / `alejandrog45-svg`  
Modo: una tarea por vez, antirretroceso y sin secretos.

## Regla de orden

No se ejecuta un paso posterior si el anterior no dejó evidencia documentada. Cada paso debe registrar: archivos revisados, resultado, riesgos y siguiente acción.

## Paso 1 — Preservar y mapear

Estado: COMPLETADO.  
Evidencia: `docs/MAPA_PARIDAD_2026-10-27.md`.  
Resultado: local, GitHub `main`, PR #1 y cambios sin seguimiento quedaron identificados.

## Paso 2 — Clasificar diferencias

Estado: COMPLETADO.  
Evidencia: sección “Clasificación funcional frente al PR #1” del mapa.  
Resultado: la implementación funcional avanzada está en el `main` local; el PR aporta principalmente configuración Render y portón de acceso.

## Paso 3 — Elegir fuente oficial

Estado: PENDIENTE DE DECISIÓN.  
Opciones:

1. Usar `main` local como base y recuperar solo `render.yaml` y el portón revisado.
2. Continuar desde el PR #1 y reincorporar las mejoras funcionales locales.
3. Crear una rama de integración independiente, recomendada para evitar retroceso.

No hacer merge ni push hasta elegir una opción.

## Paso 4 — Preparar rama de integración

Acciones permitidas después de elegir fuente:

- crear rama independiente;
- preservar `main` local y PR #1;
- integrar servidor Express y configuración Render;
- mantener pruebas existentes;
- excluir `.env*`, secretos y materiales grandes no aprobados.

## Paso 5 — Validar sin consumir IA

- ejecutar lint;
- ejecutar pruebas unitarias, integración y E2E disponibles;
- construir `dist`;
- comprobar `/api/health`, `/api/providers`, `/api/quota`, `/api/chat` y `/api/stream` con dobles de prueba;
- registrar resultados antes de cualquier despliegue.

## Paso 6 — Preparar despliegue Render

- verificar `render.yaml` contra el servidor final;
- configurar secretos solo desde el panel, sin leerlos ni imprimirlos;
- confirmar que el servicio arranca desde la raíz del proyecto;
- comprobar `/api/health`.

## Paso 7 — Verificar Nexus completo

- comprobar interfaz completa React;
- comprobar persistencia local;
- comprobar compositor;
- comprobar biblioteca;
- comprobar estados honestos de proveedores;
- no llamar a proveedores reales durante la validación inicial.

## Paso 8 — Conectar V2 sin mezclar fuentes

- mantener Cloudflare V2 para compositor, materiales y Drive;
- enlazar Nexus solo hacia el backend validado;
- no copiar el servidor Express dentro de `public`;
- no tocar Sites original, V1 ni Worker MCP.

## Paso 9 — Actualizar GitHub

- revisar el diff final;
- confirmar cuenta y rama;
- excluir secretos y materiales no aprobados;
- hacer push solo con autorización expresa para ese conjunto exacto;
- actualizar el PR o crear uno nuevo.

## Paso 10 — Cierre y relevo

Registrar:

- commit final;
- URL de despliegue;
- rutas verificadas;
- pruebas realizadas;
- conexiones activas y desconectadas;
- archivos que no deben tocarse;
- siguiente paso para Claude y Codex.

## Bloqueos actuales

- No hay fuente oficial elegida entre `main` local y PR #1.
- Hay cambios locales no confirmados en `.env.example`.
- Hay materiales grandes sin seguimiento.
- No existe todavía un despliegue verificado del Nexus Express completo.

## Próxima tarea única

Elegir la fuente oficial y, con esa decisión, preparar la rama de integración sin hacer push ni despliegue todavía.
