import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Integridad del material copiado en src/assets/images/entregas_vigentes (puede no existir en otro equipo: entonces se omite).
const ROOT = path.resolve('src/assets/images/entregas_vigentes');
const opts = { skip: fs.existsSync(ROOT) ? false : 'entregas_vigentes no esta en este equipo' };
const VERSIONES = fs.existsSync(ROOT) ? fs.readdirSync(ROOT).filter((d) => /^V\d+_/.test(d) && fs.existsSync(path.join(ROOT, d, 'MANIFIESTO.json'))) : [];

const sha = (f: string) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const leer = (v: string) => JSON.parse(fs.readFileSync(path.join(ROOT, v, 'MANIFIESTO.json'), 'utf8'));
function* objetos(x: any): Generator<any> {
  if (Array.isArray(x)) for (const i of x) yield* objetos(i);
  else if (x && typeof x === 'object') { yield x; for (const k of Object.keys(x)) yield* objetos(x[k]); }
}
function resolver(v: string, rel: string): string | null {
  const r = rel.replace(/\\\\/g, '\\').replace(/\\/g, '/');
  return [path.resolve(r), path.join(ROOT, v, r), path.join(ROOT, r), path.join(ROOT, '01_OVIEDO_FORMATOS', r)].find((p) => fs.existsSync(p)) || null;
}

test('hay al menos las versiones V1 a V5 con manifiesto JSON valido', opts, () => {
  for (const v of ['V1_diseno_anterior', 'V2_logos_nuevos_y_enfasis', 'V3_original_con_marcas_y_redes', 'V4_feed_ancho_completo', 'V5_fondos_nuevos_fachada']) {
    assert.ok(VERSIONES.includes(v), `falta ${v}`);
    assert.doesNotThrow(() => leer(v));
  }
});

test('cada sha256 de los manifiestos coincide con su archivo (la copia esta integra)', opts, () => {
  let comprobados = 0;
  for (const v of VERSIONES) {
    for (const o of objetos(leer(v))) {
      if (typeof o.archivo === 'string' && typeof o.sha256 === 'string') {
        const f = resolver(v, o.archivo);
        assert.ok(f, `${v}: no se encuentra ${o.archivo}`);
        assert.equal(sha(f as string), o.sha256, `${v}: hash distinto para ${o.archivo}`);
        comprobados++;
      }
    }
  }
  assert.ok(comprobados >= 19, `solo se comprobaron ${comprobados} hashes`);
});

test('las rutas que apuntan al otro proyecto estan marcadas con externo: o ya no existen', opts, () => {
  const externas = /^(finales[\\/]|MATERIAL ANIVERSARIO 2026|web[\\/])/;
  for (const v of VERSIONES) {
    for (const o of objetos(leer(v))) {
      for (const k of ['origen', 'source']) {
        if (typeof o[k] === 'string') assert.ok(!externas.test(o[k]), `${v}: ${k} sin marcar: ${o[k]}`);
      }
      if (typeof o.archivo === 'string') assert.ok(!/^entregas_vigentes\//.test(o.archivo), `${v}: archivo relativo a otro proyecto: ${o.archivo}`);
    }
    const readme = fs.readFileSync(path.join(ROOT, v, 'README.md'), 'utf8');
    for (const linea of readme.split(/\r?\n/)) {
      if (/scripts\/generar_v[35]\.py/.test(linea)) assert.match(linea, /proyecto de origen/, `${v}: README menciona un script que no esta aqui`);
      if (/`finales\/`/.test(linea)) assert.match(linea, /proyecto de origen/, `${v}: README menciona finales/ sin aclarar`);
    }
  }
});

test('V7: diseno completo de V5 intacto (0 px fuera de la zona de foto), plantilla y foto con hash correcto', opts, () => {
  if (!VERSIONES.includes('V7_diseno_completo_fotos_borradores')) return;
  const m = leer('V7_diseno_completo_fotos_borradores');
  assert.ok(m.piezas.length >= 6);
  for (const p of m.piezas) {
    assert.equal(p.pixeles_modificados_fuera_de_zona_foto, 0, `${p.archivo} cambia el diseno fuera de la foto`);
    const pl = p.recursos.find((r: any) => r.role === 'plantilla_diseno_completo');
    assert.equal(pl.sha256, sha(path.join(ROOT, pl.source)), 'la plantilla V5 cambio');
    const ft = p.recursos.find((r: any) => r.role === 'foto_nueva');
    const f = path.resolve(ft.source);
    if (fs.existsSync(f)) assert.equal(ft.sha256, sha(f), 'la foto de BORRADORES cambio'); // BORRADORES puede no estar en otro equipo
  }
});

test('V6: cada pieza declara 0 pixeles modificados en la zona original y su original existe', opts, () => {
  if (!VERSIONES.includes('V6_pie_original_compositor')) return;
  const m = leer('V6_pie_original_compositor');
  assert.ok(m.piezas.length >= 4);
  for (const p of m.piezas) {
    assert.equal(p.pixeles_modificados_zona_original, 0, `${p.archivo} modifica la zona original`);
    const orig = fs.existsSync(path.join(ROOT, '01_OVIEDO_FORMATOS', p.original_intacto));
    assert.ok(orig, `no existe el original ${p.original_intacto}`);
    const fr = p.recursos.find((r: any) => r.role === 'flyer_original');
    assert.equal(fr.sha256, sha(path.join(ROOT, '01_OVIEDO_FORMATOS', p.original_intacto)), 'el flyer original cambio');
  }
});
