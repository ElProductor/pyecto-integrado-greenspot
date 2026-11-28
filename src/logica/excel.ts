import readXlsxFile from 'read-excel-file/universal';
import writeXlsxFile, { type Cell, type Row, type SheetData } from 'write-excel-file/universal';

export type FilaExcel = Record<string, unknown>;
export type LibroExcel = Record<string, FilaExcel[]>;

function aCelda(v: unknown): Cell {
  if (v === undefined || v === null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' || typeof v === 'boolean' || v instanceof Date) return v;
  return String(v);
}

/** Convierte cada hoja de un archivo .xlsx en un arreglo de filas indexado por encabezado (compatible con tabla vacía = ''). */
export async function leerHojasExcel(buf: ArrayBuffer): Promise<LibroExcel> {
  const sheets = await readXlsxFile(buf);
  const libro: LibroExcel = {};
  for (const s of sheets) {
    if (!s.data.length) { libro[s.sheet] = []; continue; }
    const headers = s.data[0].map(h => (h == null ? '' : String(h).trim()));
    const rows: FilaExcel[] = [];
    for (let i = 1; i < s.data.length; i++) {
      const raw = s.data[i];
      const obj: FilaExcel = {};
      let tieneDato = false;
      for (let c = 0; c < headers.length; c++) {
        const key = headers[c];
        if (!key) continue;
        const val = raw[c] === undefined || raw[c] === null ? '' : raw[c];
        if (val !== '') tieneDato = true;
        obj[key] = val;
      }
      if (tieneDato) rows.push(obj);
    }
    libro[s.sheet] = rows;
  }
  return libro;
}

/** Construye un libro .xlsx multihoja en memoria con formato homogéneo. */
export async function generarBufferExcel(hojas: { nombre: string; filas: FilaExcel[] }[]): Promise<Uint8Array> {
  const sheets: { sheet: string; data: SheetData }[] = hojas.map(h => {
    if (!h.filas.length) {
      return { sheet: h.nombre, data: [[{ value: 'Sin registros en el período' }]] };
    }
    const keys: string[] = [];
    for (const f of h.filas) {
      for (const k of Object.keys(f)) {
        if (!keys.includes(k)) keys.push(k);
      }
    }
    const headerRow: Row = keys.map(k => ({ value: k, fontWeight: 'bold' }));
    const dataRows: Row[] = h.filas.map(f => keys.map(k => aCelda(f[k])));
    return { sheet: h.nombre, data: [headerRow, ...dataRows] };
  });
  const blob = await writeXlsxFile(sheets).toBlob();
  return new Uint8Array(await blob.arrayBuffer());
}

/** Genera y descarga el libro .xlsx en el navegador (o lo escribe en disco en pruebas Node). */
export async function descargarExcel(hojas: { nombre: string; filas: FilaExcel[] }[], archivo: string): Promise<void> {
  const bytes = await generarBufferExcel(hojas);
  if (typeof document !== 'undefined') {
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const url = URL.createObjectURL(new Blob([ab], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = archivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const modName = 'node:fs';
  const fs = await import(/* @vite-ignore */ modName);
  fs.writeFileSync(archivo, bytes);
}
