import React, { useState } from 'react';
import { apiService } from '../datos/api';
import type { StakeholderType, MaterialProduct } from '../datos/tipos';
import { useApp } from '../logica/contexto';
import { RUT_OK } from '../logica/formato';

export const FormEmpresa: React.FC<{ id?: string }> = ({ id }) => {
  const c = useApp(), ant = c.D.emp.find(e => e.id === id);
  const [f, setF] = useState({ name: ant?.name || '', tax_id: ant?.tax_id || '', type: (ant?.type || 'generator_supplier') as StakeholderType, city: ant?.city || '', contact_email: ant?.contact_email || '', contact_phone: ant?.contact_phone || '' });
  const [enviado, setEnviado] = useState(false), [error, setError] = useState('');
  const mal = { name: !f.name.trim(), tax_id: !RUT_OK.test(f.tax_id.trim()), contact_email: !!f.contact_email && !/^\S+@\S+\.\S+$/.test(f.contact_email) };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const guardar = async () => {
    setEnviado(true); if (Object.values(mal).some(Boolean)) return;
    const datos = { ...f, name: f.name.trim(), tax_id: f.tax_id.trim() };
    try {
      if (ant) await apiService.updateStakeholder(ant.id, datos);
      else await apiService.createStakeholder({ ...datos, address: '', industry_sector: '' });
      await c.recargar(); c.setDlg(null); c.aviso(ant ? 'Empresa actualizada' : 'Empresa creada');
    } catch (e) { setError((e as Error).message); }
  };
  const C = (k: keyof typeof mal) => 'campo' + (enviado && mal[k] ? ' mal' : '');
  return <div className="dlg">
    <div className="dc"><small>Empresas</small><h3>{ant ? 'Editar empresa' : 'Nueva empresa'}</h3></div>
    <div className="db">
      <div className={C('name')}><label htmlFor="en">Nombre</label><input id="en" autoFocus value={f.name} onChange={set('name')} /><div className="ayuda">{enviado && mal.name ? 'Escribe el nombre.' : ''}</div></div>
      <div className="fila2">
        <div className={C('tax_id')}><label htmlFor="er">RUT</label><input id="er" placeholder="76.123.456-7" value={f.tax_id} onChange={set('tax_id')} /><div className="ayuda">{enviado && mal.tax_id ? 'Formato: 76.123.456-7' : ''}</div></div>
        <div className="campo"><label htmlFor="et">Tipo</label><select id="et" value={f.type} onChange={set('type')}><option value="generator_supplier">Generadora</option><option value="buyer_customer">Cliente</option><option value="both">Ambas</option></select></div>
      </div>
      <div className="fila2">
        <div className="campo"><label htmlFor="ec">Ciudad</label><input id="ec" value={f.city} onChange={set('city')} /></div>
        <div className="campo"><label htmlFor="ef">Teléfono</label><input id="ef" value={f.contact_phone} onChange={set('contact_phone')} /></div>
      </div>
      <div className={C('contact_email')}><label htmlFor="ee">Correo</label><input id="ee" type="email" value={f.contact_email} onChange={set('contact_email')} /><div className="ayuda">{enviado && mal.contact_email ? 'Correo no válido.' : ''}</div></div>
      {error && <div className="resultado mal"><span>{error}</span></div>}
    </div>
    <div className="dp"><button className="btn" onClick={() => c.setDlg(null)}>Cancelar</button><button className="btn pri" onClick={guardar}>Guardar</button></div>
  </div>;
};

export const FormMaterial: React.FC = () => {
  const c = useApp();
  const [f, setF] = useState({ code: '', name: '', polymer_type: 'HDPE', category: 'raw_material', unit: 'kg', minimum_stock: '0' });
  const [enviado, setEnviado] = useState(false), [error, setError] = useState('');
  const mal = { code: !f.code.trim() || c.D.mat.some(m => m.code.toLowerCase() === f.code.trim().toLowerCase()), name: !f.name.trim(), minimum_stock: !/^\d+$/.test(f.minimum_stock) };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const guardar = async () => {
    setEnviado(true); if (Object.values(mal).some(Boolean)) return;
    try {
      await apiService.createMaterial({
        code: f.code.trim(), name: f.name.trim(), description: '', polymer_type: f.polymer_type as MaterialProduct['polymer_type'], category: f.category as MaterialProduct['category'],
        unit: f.unit as MaterialProduct['unit'], color: '', minimum_stock: +f.minimum_stock, current_stock: 0, unit_cost_usd: 0, unit_price_usd: 0, co2_factor_kg: 1.5, is_active: true
      }, c.usuario);
      await c.recargar(); c.setDlg(null); c.aviso('Material creado. El stock entra con «Registrar movimiento».');
    } catch (e) { setError((e as Error).message); }
  };
  const C = (k: keyof typeof mal) => 'campo' + (enviado && mal[k] ? ' mal' : '');
  return <div className="dlg">
    <div className="dc"><small>Materiales</small><h3>Nuevo material</h3></div>
    <div className="db">
      <div className="fila2">
        <div className={C('code')}><label htmlFor="mc">Código</label><input id="mc" autoFocus value={f.code} onChange={set('code')} /><div className="ayuda">{enviado && mal.code ? (f.code.trim() ? 'Ese código ya existe.' : 'Escribe un código.') : ''}</div></div>
        <div className={C('name')}><label htmlFor="mn">Nombre</label><input id="mn" value={f.name} onChange={set('name')} /><div className="ayuda">{enviado && mal.name ? 'Escribe el nombre.' : ''}</div></div>
      </div>
      <div className="fila2">
        <div className="campo"><label htmlFor="mp">Tipo de plástico</label><select id="mp" value={f.polymer_type} onChange={set('polymer_type')}>{['HDPE', 'LDPE', 'PP', 'EPS', 'PET', 'OTHER'].map(p => <option key={p} value={p}>{p === 'OTHER' ? 'Otro' : p}</option>)}</select></div>
        <div className="campo"><label htmlFor="mk">Categoría</label><select id="mk" value={f.category} onChange={set('category')}>
          <option value="raw_material">Materia prima</option><option value="in_process">En proceso</option><option value="pellet">Pellet</option><option value="finished_product">Producto terminado</option><option value="supplies">Insumos</option></select></div>
      </div>
      <div className="fila2">
        <div className="campo"><label htmlFor="mu">Unidad</label><select id="mu" value={f.unit} onChange={set('unit')}><option value="kg">Kilos</option><option value="units">Unidades</option></select></div>
        <div className={C('minimum_stock')}><label htmlFor="mm">Stock mínimo</label><input id="mm" inputMode="numeric" value={f.minimum_stock} onChange={set('minimum_stock')} /></div>
      </div>
      {error && <div className="resultado mal"><span>{error}</span></div>}
    </div>
    <div className="dp"><button className="btn" onClick={() => c.setDlg(null)}>Cancelar</button><button className="btn pri" onClick={guardar}>Guardar</button></div>
  </div>;
};
