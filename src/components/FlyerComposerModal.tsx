import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Save } from 'lucide-react';
import { MediaLibraryItem } from '../types';
import { detectFreeStrip, countDifferentPixels, originalSharePercent, contactLine } from '../services/flyerComposer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: MediaLibraryItem[];
  onSaveToLibrary: (item: MediaLibraryItem) => void;
}

// Texts that already appear in the original Feria 2026 flyer: nothing new is invented.
const DEFAULT_LINES = 'SUCURSAL OVIEDO FERRETERÍAS EL MANZANO\nCarretera H66 KM 60 S/N\n6 DE NOVIEMBRE · HORARIO CONTINUADO';
// Exact crop of the original logo in the base flyer (percentages of the image).
const DEFAULT_LOGO = { x: 32.5, y: 1.2, w: 35.5, h: 8.2 };

interface Report { diff: number; share: number; stripStart: number; stripH: number; extended: boolean; width: number; totalH: number }

export const FlyerComposerModal: React.FC<Props> = ({ isOpen, onClose, items, onSaveToLibrary }) => {
  const images = items.filter(i => i.type === 'image');
  const [selectedId, setSelectedId] = useState<string>('');
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [autoStrip, setAutoStrip] = useState(0);
  const [stripStart, setStripStart] = useState(0);
  const [linesText, setLinesText] = useState(DEFAULT_LINES);
  const [useLogo, setUseLogo] = useState(true);
  const [logo, setLogo] = useState(DEFAULT_LOGO);
  const [contact, setContact] = useState({ instagram: '', facebook: '', whatsapp: '' });
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Default image: the original base flyer if it is in the library
  useEffect(() => {
    if (!isOpen || selectedId || images.length === 0) return;
    const base = images.find(i => /BASE_SIN_EDITAR/i.test(i.name)) || images[0];
    setSelectedId(base.id);
  }, [isOpen, images.length]);

  // Load the selected image and detect the free strip
  useEffect(() => {
    const item = images.find(i => i.id === selectedId);
    if (!isOpen || !item) return;
    setError(null);
    setSaved(false);
    const el = new Image();
    el.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = el.naturalWidth; c.height = el.naturalHeight;
        const ctx = c.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(el, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        const y = detectFreeStrip(data, c.width, c.height);
        setAutoStrip(y);
        setStripStart(y);
        setImg(el);
      } catch (e: any) {
        setError(`No se pudo leer la imagen: ${e.message}`);
      }
    };
    el.onerror = () => setError('No se pudo cargar la imagen seleccionada.');
    el.src = item.url;
  }, [isOpen, selectedId]);

  // Compose: original pixels untouched + text/logo only inside the free strip
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!isOpen || !img || !canvas) return;
    const w = img.naturalWidth, h = img.naturalHeight;
    const extend = h - stripStart < Math.round(h * 0.08);
    const bandH = extend ? Math.round(h * 0.14) : 0;
    const totalH = h + bandH;
    const stripTop = extend ? h : stripStart;
    const stripH = totalH - stripTop;

    canvas.width = w; canvas.height = totalH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, totalH);
    ctx.drawImage(img, 0, 0);

    const pad = w * 0.05;
    const lineY = stripTop + stripH * 0.05;
    ctx.fillStyle = '#d4202a';
    ctx.fillRect(pad, lineY, w - 2 * pad, Math.max(2, w * 0.003));

    let top = lineY + Math.max(10, w * 0.015);
    const bottom = totalH - stripH * 0.04;
    let avail = bottom - top;

    // original logo crop (exact pixels of the source image)
    if (useLogo && avail > 40) {
      const sx = (logo.x / 100) * w, sy = (logo.y / 100) * h, sw = (logo.w / 100) * w, sh = (logo.h / 100) * h;
      const dh = Math.min(avail * 0.42, sh);
      const dw = Math.min(sw * (dh / sh), w * 0.5);
      ctx.drawImage(img, sx, sy, sw, sh, (w - dw) / 2, top, dw, dh);
      top += dh + Math.max(6, w * 0.012);
      avail = bottom - top;
    }

    const lines = linesText.split('\n').map(s => s.trim()).filter(Boolean);
    const cl = contactLine(contact);
    if (cl) lines.push(cl);
    if (lines.length && avail > 10) {
      const spec = lines.map((t, i) => ({ t, size: w * (i === 0 ? 0.036 : 0.029), heavy: i === 0 }));
      const fit = (factor: number) => spec.map(s => {
        let size = s.size * factor;
        const font = (sz: number) => (s.heavy ? `900 ${sz}px "Arial Black","Segoe UI Black",Impact,sans-serif` : `700 ${sz}px "Segoe UI",Arial,sans-serif`);
        ctx.font = font(size);
        const maxW = w - 2 * pad;
        const mw = ctx.measureText(s.t).width;
        if (mw > maxW) size *= maxW / mw;
        return { ...s, size, font: font(size) };
      });
      let factor = 1;
      let laid = fit(factor);
      while (laid.reduce((a, s) => a + s.size * 1.3, 0) > avail && factor > 0.3) { factor *= 0.95; laid = fit(factor); }
      const total = laid.reduce((a, s) => a + s.size * 1.3, 0);
      let y = top + Math.max(0, (avail - total) / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      laid.forEach((s, i) => {
        ctx.font = s.font;
        ctx.fillStyle = i === 0 ? '#ffffff' : '#e8e8e8';
        ctx.fillText(s.t, w / 2, y);
        y += s.size * 1.3;
      });
    }

    // Originality proof: the original area must be pixel-identical to the source image
    const ref = document.createElement('canvas');
    ref.width = w; ref.height = h;
    const rctx = ref.getContext('2d', { willReadFrequently: true })!;
    rctx.drawImage(img, 0, 0);
    const rows = Math.min(stripTop, h);
    const a = ctx.getImageData(0, 0, w, rows).data;
    const b = rctx.getImageData(0, 0, w, rows).data;
    setReport({
      diff: countDifferentPixels(a, b, w, rows),
      share: originalSharePercent(w, h, totalH, stripTop),
      stripStart: stripTop, stripH, extended: extend, width: w, totalH,
    });
    setSaved(false);
  }, [isOpen, img, stripStart, linesText, useLogo, logo, contact]);

  if (!isOpen) return null;
  const selected = images.find(i => i.id === selectedId);

  const handleDownload = () => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VARIANTE_${(selected?.name || 'flyer').replace(/\.[a-z]+$/i, '')}_pie.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selected) return;
    const url = canvas.toDataURL('image/png');
    onSaveToLibrary({
      id: `lib_comp_${Date.now()}`,
      name: `VARIANTE_${selected.name.replace(/\.[a-z]+$/i, '')}_pie.png`,
      type: 'image', format: 'PNG', size: Math.round(url.length * 0.75),
      url, date: new Date().toLocaleTimeString(), tags: ['Compositor', 'sin IA', 'variante'], source: 'generated',
    });
    setSaved(true);
  };

  const num = (v: string) => Math.max(0, Math.min(100, Number(v) || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Compositor de Flyer (sin IA, imágenes reales)</h2>
            <p className="text-[11px] text-slate-400">Conserva tu imagen original píxel a píxel y solo rellena la franja libre con texto que tú controlas.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 cursor-pointer" title="Cerrar"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          <div className="md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-slate-800 p-4 space-y-3 overflow-y-auto text-xs text-slate-300">
            <label className="block space-y-1">
              <span className="font-semibold text-slate-200">Imagen base (de la Biblioteca)</span>
              <select value={selectedId} onChange={(e) => { setImg(null); setSelectedId(e.target.value); }}
                className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white" aria-label="Imagen base">
                {images.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="font-semibold text-slate-200">Inicio de la franja libre (px): {stripStart} <span className="text-slate-500">(detectado: {autoStrip})</span></span>
              <input type="range" min={0} max={img?.naturalHeight || 1} value={stripStart} onChange={(e) => setStripStart(Number(e.target.value))} className="w-full" aria-label="Inicio de la franja libre" />
            </label>

            <label className="block space-y-1">
              <span className="font-semibold text-slate-200">Texto del pie (una línea por renglón)</span>
              <textarea value={linesText} onChange={(e) => setLinesText(e.target.value)} rows={4}
                className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white" aria-label="Texto del pie" />
              <span className="text-[10px] text-slate-500">Por defecto: solo datos que ya aparecen en tu flyer original.</span>
            </label>

            <label className="flex items-center gap-2">
              <input type="checkbox" checked={useLogo} onChange={(e) => setUseLogo(e.target.checked)} />
              <span>Reusar el logo original (recorte exacto de la imagen)</span>
            </label>
            {useLogo && (
              <div className="grid grid-cols-4 gap-1.5">
                {(['x', 'y', 'w', 'h'] as const).map(k => (
                  <label key={k} className="space-y-0.5"><span className="text-[10px] uppercase text-slate-500">{k} %</span>
                    <input type="number" value={logo[k]} step={0.5} onChange={(e) => setLogo(prev => ({ ...prev, [k]: num(e.target.value) }))}
                      className="w-full px-1.5 py-1 rounded bg-slate-950 border border-slate-800 text-white" aria-label={`Logo ${k}`} /></label>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <span className="font-semibold text-slate-200">Contacto (opcional; solo se dibuja lo que escribas)</span>
              {(['instagram', 'facebook', 'whatsapp'] as const).map(k => (
                <input key={k} value={contact[k]} placeholder={k[0].toUpperCase() + k.slice(1)} onChange={(e) => setContact(prev => ({ ...prev, [k]: e.target.value }))}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white" aria-label={`Contacto ${k}`} />
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={handleDownload} disabled={!report} className="flex-1 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"><Download className="w-3.5 h-3.5" />Descargar PNG</button>
              <button onClick={handleSave} disabled={!report} className="flex-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"><Save className="w-3.5 h-3.5" />A la Biblioteca</button>
            </div>
            {saved && <p className="text-emerald-400" role="status">Guardada en la Biblioteca como variante.</p>}
            {error && <p className="text-rose-400" role="alert">{error}</p>}
          </div>

          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-auto p-4 flex justify-center bg-slate-950/60">
              <canvas ref={canvasRef} id="flyer-canvas" className="max-h-full w-auto h-full object-contain rounded-lg border border-slate-800 shadow-lg" style={{ aspectRatio: report ? `${report.width} / ${report.totalH}` : undefined }} />
            </div>
            {report && (
              <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-300 flex flex-wrap gap-x-5 gap-y-1" data-testid="reporte-originalidad">
                <span>Píxeles modificados en la zona original: <b className={report.diff === 0 ? 'text-emerald-400' : 'text-rose-400'} data-testid="pixeles-modificados">{report.diff}</b></span>
                <span>Lienzo original conservado: <b className="text-white">{report.share}%</b></span>
                <span>Franja usada: {report.stripH}px desde y={report.stripStart}{report.extended ? ' (se añadió una banda; no había franja libre)' : ''}</span>
                <span className="text-slate-500">Sin IA: texto, línea y recorte del logo original.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
