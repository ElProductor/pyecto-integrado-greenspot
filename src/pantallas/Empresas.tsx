import React, { useState } from 'react';
import { useApp } from '../logica/contexto';
import { num } from '../logica/formato';
import { esGeneradora, esCliente, kilosEntregados, kilosComprados } from '../logica/reglas';
import { Titulo, Pestanas } from '../componentes/Comunes';

export const Empresas: React.FC = () => {
  const { D, setDlg, setPanel } = useApp();
  const [f, setF] = useState<'gen' | 'cli'>('gen'), [q, setQ] = useState(''), t = q.toLowerCase(), gen = f === 'gen';
  const lista = D.emp.filter(e => (gen ? esGeneradora(e) : esCliente(e)) && (!t || `${e.name} ${e.tax_id} ${e.city}`.toLowerCase().includes(t)));
  return <>
    <Titulo t="Empresas"><button className="btn pri" onClick={() => setDlg({ t: 'form', nombre: 'empresa' })}>Nueva empresa</button></Titulo>
    <Pestanas valor={f} set={setF} ops={[['gen', 'Generadoras', D.emp.filter(esGeneradora).length], ['cli', 'Clientes', D.emp.filter(esCliente).length]]} />
    <div className="barraTabla"><input className="buscar" placeholder="Buscar por nombre, RUT o ciudad" value={q} onChange={e => setQ(e.target.value)} /></div>
    <table><thead><tr><th>Nombre</th><th className="opc">RUT</th><th className="opc">Ciudad</th><th className="opc">Correo</th><th className="der">{gen ? 'Kilos entregados' : 'Kilos comprados'}</th></tr></thead>
      <tbody>{lista.length ? lista.map(e => (
        <tr key={e.id} className="clic" onClick={() => setPanel({ t: 'emp', id: e.id })}>
          <td>{e.name}</td><td className="opc tn">{e.tax_id}</td><td className="opc">{e.city}</td><td className="opc sec">{e.contact_email || '—'}</td>
          <td className="der tn">{num(gen ? kilosEntregados(D, e.id) : kilosComprados(D, e.name))}</td>
        </tr>)) : <tr className="vacio"><td colSpan={5}>Ninguna empresa coincide.</td></tr>}</tbody></table>
  </>;
};
