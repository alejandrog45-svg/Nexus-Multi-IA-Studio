# Cambio de referencias al otro proyecto en `entregas_vigentes` (2026-10-23)

`src/assets/images/entregas_vigentes/` es una COPIA de material de otro proyecto (la Ferreteria). El original no se toca. Se cambiaron solo las referencias que apuntaban a la estructura de ese otro proyecto, en los archivos de texto de la copia.

## Que se cambio (10 archivos de texto)
| Archivo | Cambio | Cantidad |
|---|---|---|
| `V1_*/MANIFIESTO.json`, `V2_*/MANIFIESTO.json` | `"archivo": "entregas_vigentes/..."` -> `"archivo": "src/assets/images/entregas_vigentes/..."` (ahora resuelve desde la raiz de ESTE repo) | 12 |
| `V1_*/MANIFIESTO.json`, `V2_*/MANIFIESTO.json` | `"origen": "finales/..."` -> `"origen": "externo:finales/..."` | 12 |
| `V3_*`, `V4_*`, `V5_*` `/MANIFIESTO.json` | `"source": "MATERIAL ANIVERSARIO 2026\\..."` y `"source": "web/..."` -> prefijo `externo:` | 204 (172 + 32) |
| `V1_*/README.md`, `V2_*/README.md` | "los originales siguen en `finales/`" -> "...en el proyecto de origen (`externo:finales/`)" | 2 |
| `V3_*`, `V4_*`, `V5_*` `/README.md` | "Se regenera con `scripts/generar_*.py`" -> "... del proyecto de origen (script no incluido en este repo)" | 3 |

El prefijo `externo:` marca una ruta que apunta al proyecto de origen y NO existe en este repo; conserva la trazabilidad.

## Que NO se toco
Imagenes, videos, nombres de archivo y carpeta, los `sha256`, las marcas y textos de las piezas (por ejemplo `www.oviedo.cl`: es contenido del flyer), `NUEVO MATERIAL/cuadros_extraidos/manifiesto.json`, el `README.md` raiz, y el original en el otro proyecto. Los `source` que son nombres de archivo de esta misma carpeta (`01_flyer_oviedo_...jpg`, `IMG-2025...jpg`) tampoco: resuelven aqui.

## Verificacion
- Los 5 `MANIFIESTO.json` siguen siendo JSON valido.
- Los 19 `sha256` con archivo asociado coinciden con las imagenes reales (0 distintos, 0 no hallados).
- Ningun binario fue modificado por este cambio (las fechas recientes de `NUEVO MATERIAL` y V5 son de la extraccion/copia anterior, 01:45-02:18).

## Respaldo
`W:\PROYECTOS CUENTA ALEJANDROG45\_respaldos\entregas-textos_2026-10-23\` (copia exacta de los 12 textos, misma estructura). Para revertir, copiar de vuelta.

## Nota de git
`entregas_vigentes/` (528 MB: 189 PNG, 2 mp4 de ~105 MB, 165 fotogramas) esta SIN seguimiento de git. No esta en la rama del PR #1. Subirla a un repo publico es una decision aparte (ver CLAUDE.md).
