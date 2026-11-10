import React from 'react';
import * as XLSX from 'xlsx';
import { Ctx, useApp } from '../logica/contexto';
import { NOMBRE_ETAPA, certDe, nombreBod, bodegas, stockEn, claseMov, NOMBRE_MOV, signoMov, anulado, vigente } from '../logica/reglas';
import { Titulo } from '../componentes/Comunes';

/* ---------- reportes en Excel ---------- */
type Reporte = 'Inventario' | 'Movimientos' | 'Lotes' | 'Certificados';
export function descargar(r: Reporte, D: Ctx['D']) {
  const B = bodegas(D);
  const filas: Record<string, unknown>[] =
    r === 'Inventario' ? D.mat.map(m => ({ Código: m.code, Material: m.name, Tipo: m.polymer_type, ...Object.fromEntries(B.map(b => [nombreBod(b), stockEn(D, m.id, b.id)])), Total: Number(m.current_stock), Unidad: m.unit, Mínimo: Number(m.minimum_stock) }))
      : r === 'Movimientos' ? D.mov.map(m => ({ Fecha: new Date(m.created_at).toLocaleString('es-CL'), Tipo: NOMBRE_MOV[claseMov(m)], Material: m.material?.name, Cantidad: signoMov(m) * Number(m.quantity) || Number(m.quantity), Unidad: m.unit, Desde: m.from_warehouse ? nombreBod(m.from_warehouse) : '', Hacia: m.to_warehouse ? nombreBod(m.to_warehouse) : '', Referencia: m.reference_doc || '', Usuario: m.operator_name, Estado: anulado(D, m) ? 'Anulado' : vigente(D, m) !== Number(m.quantity) ? 'Corregido' : '' }))
        : r === 'Lotes' ? D.lotes.map(l => ({ Lote: l.batch_number, Material: l.material?.name, Empresa: l.supplier?.name || '', Origen: l.marine_origin_zone || '', Etapa: NOMBRE_ETAPA[l.status], 'Kilos ingreso': Number(l.initial_weight_kg), 'Kilos actuales': Number(l.current_weight_kg), Ingreso: new Date(l.reception_date).toLocaleDateString('es-CL'), Certificado: certDe(D, l)?.certificate_code || '' }))
          : D.cert.map(x => ({ 'N°': x.certificate_code, Empresa: x.stakeholder?.name, RUT: x.stakeholder?.tax_id, Lote: x.batch?.batch_number || '', Residuo: x.waste_type, Kilos: Number(x.total_kg_valorized), 'CO2eq evitado (kg)': Number(x.co2_avoided_kg), Fecha: x.issue_date }));
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), r);
  XLSX.writeFile(libro, `Greenspot-${r}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export const Reportes: React.FC = () => {
  const { D, aviso } = useApp();
  const rep: [Reporte, string][] = [['Inventario', 'Kilos por material y bodega'], ['Movimientos', 'Entradas, salidas, traslados y correcciones'], ['Lotes', 'Recorrido y kilos de cada lote'], ['Certificados', 'Para declarar en la Ley REP']];
  return <>
    <Titulo t="Reportes" />
    <table><thead><tr><th>Reporte</th><th className="opc">Contenido</th><th /></tr></thead>
      <tbody>{rep.map(([r, d]) => <tr key={r}><td>{r}</td><td className="opc sec">{d}</td><td className="der"><button className="btn chico" onClick={() => { descargar(r, D); aviso(`Descargado «${r}» en Excel`); }}>Descargar Excel</button></td></tr>)}</tbody></table>
  </>;
};
