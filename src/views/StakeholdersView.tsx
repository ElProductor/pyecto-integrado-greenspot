import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  Leaf, 
  Flame, 
  Award,
  CheckCircle2
} from 'lucide-react';
import { Stakeholder, StakeholderType } from '../types';

interface StakeholdersViewProps {
  stakeholders: Stakeholder[];
  onSaveStakeholder: (stakeholder: Omit<Stakeholder, 'id' | 'created_at'>) => Promise<void>;
}

export const StakeholdersView: React.FC<StakeholdersViewProps> = ({
  stakeholders,
  onSaveStakeholder
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<StakeholderType>('generator_supplier');
  const [taxId, setTaxId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+56 ');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Puerto Montt');
  const [sector, setSector] = useState('Acuicultura (Salmonicultura)');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveStakeholder({
      name,
      type,
      tax_id: taxId,
      contact_email: email,
      contact_phone: phone,
      address,
      city,
      industry_sector: sector,
      notes
    });

    setIsModalOpen(false);
    setName('');
    setTaxId('');
    setEmail('');
    setNotes('');
  };

  const filtered = stakeholders.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.tax_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.industry_sector.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Empresas Asociadas (Generadores & Clientes)
          </h1>
          <p className="text-sm text-slate-500">
            Salmoneras, pesqueras, mitilicultores y compradores de pellet circular y eco-madera
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Empresa</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por razón social, RUT chileno, o sector productivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Grid de Empresas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((s) => {
          return (
            <div 
              key={s.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-slate-500">
                      RUT: {s.tax_id}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-base mt-0.5">
                      {s.name}
                    </h3>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    s.type === 'generator_supplier' 
                      ? 'bg-blue-100 text-blue-700' 
                      : s.type === 'buyer_customer' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {s.type === 'generator_supplier' && 'Generador Ley REP'}
                    {s.type === 'buyer_customer' && 'Comprador Pellet'}
                    {s.type === 'both' && 'Generador & Comprador'}
                  </span>
                </div>

                <div className="text-xs text-emerald-700 font-semibold mb-3 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  <span>{s.industry_sector}</span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{s.contact_email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{s.contact_phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{s.city}, {s.address}</span>
                  </div>
                </div>

                {s.notes && (
                  <p className="text-xs text-slate-500 italic mb-3">
                    "{s.notes}"
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Convenio Marco Greenspot</span>
                <span className="text-emerald-700 font-bold">Trazabilidad Activa</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Registrar Empresa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h2 className="text-xl font-extrabold text-slate-900">
                Registrar Empresa / Generador
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Razón Social</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Salmones Antártica S.A."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Relación</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as StakeholderType)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="generator_supplier">Generador de Residuos (Acuícola)</option>
                    <option value="buyer_customer">Comprador de Pellets / Eco-Productos</option>
                    <option value="both">Ambos (Economía Circular Cerrada)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">RUT Empresa</label>
                  <input
                    type="text"
                    required
                    placeholder="76.123.456-7"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email de Contacto</label>
                  <input
                    type="email"
                    required
                    placeholder="sustentabilidad@empresa.cl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ciudad</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rubro / Sector</label>
                  <input
                    type="text"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dirección Planta o Base</label>
                <input
                  type="text"
                  placeholder="ej: Camino Chinquihue Km 9"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notas de Convenio</label>
                <textarea
                  rows={2}
                  placeholder="Tipo de residuos que entrega habitualmente, frecuencia de retiro..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm"
                >
                  Guardar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
