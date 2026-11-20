import React, { useState } from 'react';
import type { Batch } from '../datos/tipos';
import { useApp } from '../logica/contexto';
import { loteAnulado, enProceso } from '../logica/reglas';
import { Titulo, Pestanas, TablaLotes } from '../componentes/Comunes';

export const Lotes: React.FC = () => {
  const { D, setDlg } = useApp();
  const [f, setF] = useState<'proceso' | 'desp' | 'todos'>('proceso'), [q, setQ] = useState('');
  const np = D.lotes.filter(enProceso).length, t = q.toLowerCase();
  const desp = (l: Batch) => l.status === 'dispatched' && !loteAnulado(l);
  const lista = D.lotes.filter(l => (f === 'todos' || (f === 'proceso' ? enProceso(l) : desp(l))) &&
    (!t || `${l.batch_number} ${l.supplier?.name} ${l.material?.name}`.toLowerCase().includes(t)));
  return <>
    <Titulo t="Lotes"><button className="btn pri" onClick={() => setDlg({ t: 'flujo', f: 'camion' })}>Registrar camión</button></Titulo>
    <Pestanas valor={f} set={setF} ops={[['proceso', 'En proceso', np], ['desp', 'Despachados', D.lotes.filter(desp).length], ['todos', 'Todos']]} />
    <div className="barraTabla"><input className="buscar" placeholder="Buscar lote, empresa o material" value={q} onChange={e => setQ(e.target.value)} /></div>
    <TablaLotes lista={lista} completa />
  </>;
};
