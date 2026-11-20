import React from 'react';
import { useApp } from '../logica/contexto';
import { num, cant, toneladas } from '../logica/formato';
import { enProceso, sinCert, bajoMinimo, kgEnPlanta, bodegasLlenas, nombreBod } from '../logica/reglas';
import { Titulo, TablaLotes } from '../componentes/Comunes';

export const Inicio: React.FC = () => {
  const { D, esAdmin, setDlg, ir } = useApp();
  const proc = D.lotes.filter(enProceso);
  if (!esAdmin) return <><Titulo t="Lotes en proceso"><button className="btn pri" onClick={() => setDlg({ t: 'flujo', f: 'camion' })}>Registrar camión</button></Titulo><TablaLotes lista={proc} /></>;
  const bajos = D.mat.filter(bajoMinimo), sc = sinCert(D), llenas = bodegasLlenas(D);
  const certKg = D.cert.reduce((a, x) => a + Number(x.total_kg_valorized), 0);
  return <>
    <Titulo t="Inicio" />
    <div className="cifras">
      <div><small>Stock en planta</small><b className="tn">{toneladas(kgEnPlanta(D))}</b><span>t</span></div>
      <div><small>Lotes en proceso</small><b>{proc.length}</b></div>
      <div><small>Kilos certificados</small><b className="tn">{toneladas(certKg)}</b><span>t</span></div>
      <div><small>Certificados emitidos</small><b>{D.cert.length}</b></div>
    </div>
    {(bajos.length > 0 || sc.length > 0 || llenas.length > 0) && <><h2>Requiere atención</h2><div className="atencion">
      {llenas.map(({ b, kg }) => <div key={b.id}><i className="punto rojo" /><span>{nombreBod(b)} al {Math.round(kg / (10 * Number(b.capacity_tons)))} % de su capacidad ({toneladas(kg)} de {num(Number(b.capacity_tons))} t)</span><button className="btn chico" onClick={() => ir('mat')}>Ver</button></div>)}
      {bajos.map(m => <div key={m.id}><i className="punto" /><span>Stock bajo el mínimo: {m.name} ({cant(m.current_stock, m.unit)} de {num(m.minimum_stock)})</span><button className="btn chico" onClick={() => ir('mat')}>Ver</button></div>)}
      {sc.length > 0 && <div><i className="punto rojo" /><span>{sc.length} {sc.length === 1 ? 'lote despachado' : 'lotes despachados'} sin certificado</span><button className="btn chico" onClick={() => setDlg({ t: 'flujo', f: 'cert' })}>Emitir</button></div>}
    </div></>}
    <h2>Lotes en proceso</h2><TablaLotes lista={proc} />
  </>;
};
