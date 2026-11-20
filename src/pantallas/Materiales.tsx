import React, { useState } from 'react';
import { useApp } from '../logica/contexto';
import { num, cant } from '../logica/formato';
import { nombreBod, bodegas, stockEn, bajoMinimo } from '../logica/reglas';
import { Titulo } from '../componentes/Comunes';

export const Materiales: React.FC = () => {
  const { D, esAdmin, setDlg, setPanel } = useApp();
  const [q, setQ] = useState(''), [bajo, setBajo] = useState(false), t = q.toLowerCase(), B = bodegas(D);
  const lista = D.mat.filter(m => (!bajo || bajoMinimo(m)) && (!t || `${m.name} ${m.code} ${m.polymer_type}`.toLowerCase().includes(t)));
  return <>
    <Titulo t="Materiales">{esAdmin && <button className="btn" onClick={() => setDlg({ t: 'form', nombre: 'material' })}>Nuevo material</button>}</Titulo>
    <div className="barraTabla"><input className="buscar" placeholder="Buscar material" value={q} onChange={e => setQ(e.target.value)} />
      <label className="chk"><input type="checkbox" checked={bajo} onChange={e => setBajo(e.target.checked)} />Solo bajo el mínimo</label></div>
    <table><thead><tr><th>Material</th>{esAdmin && <th className="opc">Código</th>}<th className="opc">Tipo</th>{B.map(b => <th key={b.id} className="der opc">{nombreBod(b)}</th>)}<th className="der">Total</th><th /></tr></thead>
      <tbody>{lista.length ? lista.map(m => (
        <tr key={m.id} className={esAdmin ? 'clic' : ''} onClick={() => esAdmin && setPanel({ t: 'mat', id: m.id })}>
          <td>{m.name}{bajoMinimo(m) && <div className="estado rojo" style={{ fontSize: 12 }}>Bajo el mínimo</div>}</td>
          {esAdmin && <td className="opc sec">{m.code}</td>}<td className="opc">{m.polymer_type}</td>
          {B.map(b => { const x = stockEn(D, m.id, b.id); return <td key={b.id} className="der tn opc">{x ? num(x) : <span className="sec">—</span>}</td>; })}
          <td className="der tn"><b style={{ fontWeight: 600 }}>{cant(m.current_stock, m.unit)}</b></td>
          <td className="der">{esAdmin && <button className="btn chico" onClick={e => { e.stopPropagation(); setDlg({ t: 'flujo', f: 'contar', pre: m.id }); }}>Corregir</button>}</td>
        </tr>)) : <tr className="vacio"><td colSpan={9}>Ningún material coincide.</td></tr>}</tbody></table>
  </>;
};
