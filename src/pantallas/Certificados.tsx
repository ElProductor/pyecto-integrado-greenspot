import React from 'react';
import { useApp } from '../logica/contexto';
import { num } from '../logica/formato';
import { sinCert } from '../logica/reglas';
import { Titulo } from '../componentes/Comunes';

export const Certificados: React.FC = () => {
  const { D, setDlg, setPanel } = useApp();
  const sc = sinCert(D);
  return <>
    <Titulo t="Certificados"><button className="btn pri" disabled={!sc.length} onClick={() => setDlg({ t: 'flujo', f: 'cert' })}>Emitir certificado</button></Titulo>
    {sc.length > 0 && <div className="atencion" style={{ marginBottom: 18 }}><div><i className="punto rojo" /><span>{sc.length === 1 ? '1 lote despachado espera' : `${sc.length} lotes despachados esperan`} certificado: {sc.map(l => l.batch_number).join(', ')}</span></div></div>}
    <table><thead><tr><th>N°</th><th>Empresa</th><th className="opc">Lote</th><th className="der">Kilos</th><th className="opc">Fecha</th><th /></tr></thead>
      <tbody>{D.cert.length ? D.cert.map(x => (
        <tr key={x.id} className="clic" onClick={() => setPanel({ t: 'cert', id: x.id })}>
          <td>{x.certificate_code}</td><td>{x.stakeholder?.name}</td><td className="opc sec">{x.batch?.batch_number || '—'}</td>
          <td className="der tn">{num(x.total_kg_valorized)}</td><td className="opc sec">{new Date(x.issue_date + 'T12:00').toLocaleDateString('es-CL')}</td>
          <td className="der"><button className="btn chico">Ver</button></td>
        </tr>)) : <tr className="vacio"><td colSpan={6}>Aún no hay certificados.</td></tr>}</tbody></table>
  </>;
};
