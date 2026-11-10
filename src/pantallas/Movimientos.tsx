import React, { useState } from 'react';
import { useApp } from '../logica/contexto';
import { cant, fecha } from '../logica/formato';
import { ClaseMov, claseMov, NOMBRE_MOV, signoMov, detalleMov, anulado, vigente } from '../logica/reglas';
import { Titulo, Pestanas } from '../componentes/Comunes';
import { descargar } from './Reportes';

export const Movimientos: React.FC = () => {
  const { D, esAdmin, setDlg, setPanel } = useApp();
  const [f, setF] = useState<'todo' | ClaseMov>('todo');
  const lista = D.mov.filter(m => f === 'todo' || claseMov(m) === f);
  return <>
    <Titulo t="Movimientos">
      {esAdmin && <button className="btn" onClick={() => descargar('Movimientos', D)}>Exportar</button>}
      <button className="btn pri" onClick={() => setDlg({ t: 'flujo', f: 'mov' })}>Registrar movimiento</button>
    </Titulo>
    <Pestanas valor={f} set={setF} ops={[['todo', 'Todos'], ['entra', 'Entradas'], ['sale', 'Salidas'], ['mover', 'Traslados'], ['prod', 'Producción'], ['contar', 'Correcciones'], ['anula', 'Anulaciones']]} />
    <table><thead><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th className="der">Cantidad</th><th className="opc">Usuario</th></tr></thead>
      <tbody>{lista.length ? lista.map(m => {
        const s = signoMov(m), an = anulado(D, m), v = vigente(D, m);
        return <tr key={m.id} className={'clic' + (an ? ' anulada' : '')} onClick={() => setPanel({ t: 'mov', id: m.id })}><td className="sec">{fecha(m.created_at)}</td>
          <td>{NOMBRE_MOV[claseMov(m)]}{an ? <div className="estado rojo" style={{ fontSize: 12 }}>Anulado</div> : v !== Number(m.quantity) && <div className="estado ambar" style={{ fontSize: 12 }}>Corregido</div>}</td><td className="det">{detalleMov(m)}</td>
          <td className="der tn" style={s < 0 && !an ? { color: 'var(--rojo)' } : undefined}>{s > 0 ? '+' : s < 0 ? '−' : ''}{cant(an ? m.quantity : v, m.unit)}</td>
          <td className="opc sec">{m.operator_name}</td></tr>;
      }) : <tr className="vacio"><td colSpan={5}>Sin movimientos de este tipo.</td></tr>}</tbody></table>
  </>;
};
