import React from 'react';
import { useApp } from '../logica/contexto';
import { Titulo } from '../componentes/Comunes';

export const Configuracion: React.FC = () => {
  const { D, setPanel } = useApp();
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  return <>
    <Titulo t="Configuración" />
    <h2 style={{ marginTop: 0 }}>Usuarios</h2>
    <table><thead><tr><th>Nombre</th><th>Rol</th><th className="opc">Correo</th><th className="opc">Estado</th><th /></tr></thead>
      <tbody>{D.usuarios.map(u => (
        <tr key={u.id} className="clic" onClick={() => setPanel({ t: 'usuario', id: u.id })}>
          <td>{u.full_name}</td><td>{u.role === 'admin' ? 'Administración' : 'Operario'}</td><td className="opc sec">{u.email}</td>
          <td className="opc"><span className={'estado ' + (u.is_active ? 'verde' : '')}>{u.is_active ? 'Activa' : 'Desactivada'}</span></td>
          <td className="der"><button className="btn chico">Editar</button></td>
        </tr>))}</tbody></table>
    <p className="nota">Las cuentas nuevas se crean en Supabase › Authentication › Add user. Entran como operario; aquí se les cambia el rol.</p>
    <h2>Base de datos</h2>
    <table><tbody>
      <tr><td style={{ width: 180 }} className="sec">Estado</td><td><span className="estado verde">Conectada</span></td></tr>
      <tr><td className="sec">Servidor</td><td className="tn">{url?.replace('https://', '')}</td></tr>
      <tr><td className="sec">Registros</td><td>{D.mat.length} materiales · {D.lotes.length} lotes · {D.mov.length} movimientos · {D.emp.length} empresas</td></tr>
    </tbody></table>
  </>;
};
