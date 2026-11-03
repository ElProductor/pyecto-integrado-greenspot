import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  Edit3, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertTriangle,
  Fish,
  ShoppingBag,
  Truck,
  Filter
} from 'lucide-react';
import { Stakeholder, StakeholderType } from '../types';
import { useToast } from '../components/Toast';
import { useIAM } from '../context/IAMContext';

interface ClientsViewProps {
  stakeholders: Stakeholder[];
  onSaveStakeholder: (stakeholder: Omit<Stakeholder, 'id' | 'created_at'>) => Promise<void>;
  onUpdateStakeholder: (id: string, updates: Partial<Stakeholder>) => Promise<void>;
  onDeleteStakeholder: (id: string) => Promise<void>;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  stakeholders,
  onSaveStakeholder,
  onUpdateStakeholder,
  onDeleteStakeholder
}) => {
  const { success, error: toastError } = useToast();
  const { permissions, isAdmin } = useIAM();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Modal Nuevo Cliente
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTaxId, setNewTaxId] = useState('');
  const [newType, setNewType] = useState<StakeholderType>('generator_supplier');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('+56 9 ');
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState('Puerto Montt');
  const [newSector, setNewSector] = useState('Acuicultura (Salmonicultura)');
  const [newNotes, setNewNotes] = useState('');

  // Modal Editar Cliente
  const [editingClient, setEditingClient] = useState<Stakeholder | null>(null);
  const [editName, setEditName] = useState('');
  const [editTaxId, setEditTaxId] = useState('');
  const [editType, setEditType] = useState<StakeholderType>('generator_supplier');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editSector, setEditSector] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Modal Confirmar Eliminación
  const [deletingClient, setDeletingClient] = useState<Stakeholder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Manejadores
  const handleOpenEdit = (s: Stakeholder) => {
    setEditingClient(s);
    setEditName(s.name);
    setEditTaxId(s.tax_id);
    setEditType(s.type || 'generator_supplier');
    setEditEmail(s.contact_email || '');
    setEditPhone(s.contact_phone || '');
    setEditAddress(s.address || '');
    setEditCity(s.city || 'Puerto Montt');
    setEditSector(s.industry_sector || 'Acuicultura');
    setEditNotes(s.notes || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    try {
      await onUpdateStakeholder(editingClient.id, {
        name: editName,
        tax_id: editTaxId,
        type: editType,
        contact_email: editEmail,
        contact_phone: editPhone,
        address: editAddress,
        city: editCity,
        industry_sector: editSector,
        notes: editNotes
      });
      success('Empresa actualizada', `${editName} ha sido modificada correctamente`);
      setEditingClient(null);
    } catch (err) {
      toastError('Error al actualizar', 'No se pudieron guardar los cambios');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newTaxId.trim()) {
      toastError('Campos requeridos', 'Ingresa la razón social y el RUT');
      return;
    }

    try {
      await onSaveStakeholder({
        name: newName.trim(),
        tax_id: newTaxId.trim(),
        type: newType,
        contact_email: newEmail.trim(),
        contact_phone: newPhone.trim(),
        address: newAddress.trim(),
        city: newCity.trim(),
        industry_sector: newSector.trim(),
        notes: newNotes.trim()
      });

      success('Cliente registrado', `${newName} se incorporó al registro`);
      setIsCreateModalOpen(false);
      // Limpiar formulario
      setNewName('');
      setNewTaxId('');
      setNewEmail('');
      setNewPhone('+56 9 ');
      setNewAddress('');
      setNewNotes('');
    } catch (err) {
      toastError('Error al registrar', 'No se pudo crear la empresa');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingClient) return;
    try {
      setIsDeleting(true);
      await onDeleteStakeholder(deletingClient.id);
      success('Empresa eliminada', `${deletingClient.name} fue removida del registro`);
      setDeletingClient(null);
    } catch (err) {
      toastError('Error al eliminar', 'No se pudo eliminar la empresa');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtrado
  const filtered = stakeholders.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.tax_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.industry_sector.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'ALL' || s.type === filterType;
    return matchesSearch && matchesType;
  });

  const generatorCount = stakeholders.filter(s => s.type === 'generator_supplier' || s.type === 'both').length;
  const buyerCount = stakeholders.filter(s => s.type === 'buyer_customer' || s.type === 'both').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header con botón Agregar Empresa */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-300">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Building2 className="w-8 h-8 text-slate-800" />
            <span>Clientes & Empresas</span>
          </h1>
          <p className="text-sm text-slate-700 font-medium mt-1">
            Gestión de salmoneras generadoras de plástico, compradores de pellet y gestores logísticos
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Nuevo Cliente</span>
        </button>
      </div>

      {/* 2. Tarjetas de Resumen Minimalistas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Total Empresas
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {stakeholders.length}
            </span>
            <span className="text-xs font-bold text-slate-600">registradas</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Generadores (Salmoneras)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-emerald-800 font-mono">
              {generatorCount}
            </span>
            <span className="text-xs font-bold text-slate-600">proveedores de residuos</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Compradores de Pellet
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-blue-800 font-mono">
              {buyerCount}
            </span>
            <span className="text-xs font-bold text-slate-600">clientes de producto circular</span>
          </div>
        </div>
      </div>

      {/* 3. Barra de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, RUT, ciudad o sector..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
              filterType === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todos ({stakeholders.length})
          </button>
          <button
            onClick={() => setFilterType('generator_supplier')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
              filterType === 'generator_supplier'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Salmoneras / Generadores
          </button>
          <button
            onClick={() => setFilterType('buyer_customer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
              filterType === 'buyer_customer'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Compradores de Pellet
          </button>
        </div>
      </div>

      {/* 4. Lista de Empresas / Tarjetas Nítidas */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-300">
          <Building2 className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <p className="text-base font-bold text-slate-800">No se encontraron empresas</p>
          <p className="text-sm text-slate-500 mt-1">Prueba cambiando el término de búsqueda o agrega una nueva empresa</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800"
          >
            + Registrar Empresa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((s) => {
            const isSalmonera = s.type === 'generator_supplier' || s.industry_sector.toLowerCase().includes('salmon') || s.industry_sector.toLowerCase().includes('acui');
            const isBuyer = s.type === 'buyer_customer';

            return (
              <div 
                key={s.id}
                className="bg-white rounded-xl border border-slate-300 p-5 shadow-2xs hover:border-slate-400 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Encabezado Tarjeta */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-800 font-extrabold text-sm shrink-0">
                        {s.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                          {s.name}
                        </h3>
                        <p className="text-xs font-mono font-bold text-slate-600">
                          RUT: {s.tax_id}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Editar empresa"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {permissions.canDeleteRecords && (
                        <button
                          onClick={() => setDeletingClient(s)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar empresa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Badges de Clasificación */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {isSalmonera && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
                        <Fish className="w-3 h-3 text-emerald-700" />
                        <span>Salmonera / Generador</span>
                      </span>
                    )}
                    {isBuyer && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-900 border border-blue-300">
                        <ShoppingBag className="w-3 h-3 text-blue-700" />
                        <span>Comprador de Pellet</span>
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                      {s.industry_sector}
                    </span>
                  </div>

                  {/* Datos de Contacto */}
                  <div className="space-y-1.5 text-xs text-slate-700 font-medium">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{s.contact_email || 'Sin correo registrado'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{s.contact_phone || 'Sin teléfono'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{s.address || s.city || 'Puerto Montt, Chile'}</span>
                    </div>
                  </div>
                </div>

                {/* Footer de Tarjeta con Notas / Convenio */}
                <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Convenio: </span>
                  <span className="italic">{s.notes || 'Retiro de boyas, flotadores y cabos en centro acuícola'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: REGISTRAR NUEVO CLIENTE */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-300 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-300 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-slate-800" />
                <h3 className="font-extrabold text-base text-slate-900">
                  Registrar Nueva Empresa / Cliente
                </h3>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-500 hover:text-slate-800 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Razón Social de la Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Salmones Australis S.A."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:outline-hidden focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    RUT Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="76.123.456-7"
                    value={newTaxId}
                    onChange={(e) => setNewTaxId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono font-bold focus:outline-hidden focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tipo de Empresa *
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as StakeholderType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:outline-hidden focus:border-slate-800"
                  >
                    <option value="generator_supplier">Salmonera / Generador (Entrega plástico)</option>
                    <option value="buyer_customer">Comprador de Pellet Reciclado</option>
                    <option value="both">Ambos (Generador y Comprador)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="sustentabilidad@salmonera.cl"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:outline-hidden focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Teléfono Planta
                  </label>
                  <input
                    type="text"
                    placeholder="+56 9 8765 4321"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:outline-hidden focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Ciudad / Base
                  </label>
                  <input
                    type="text"
                    placeholder="Puerto Montt, Dalcahue, Castro..."
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:outline-hidden focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Sector Industrial
                  </label>
                  <input
                    type="text"
                    placeholder="Acuicultura / Salmonicultura"
                    value={newSector}
                    onChange={(e) => setNewSector(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:outline-hidden focus:border-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Dirección Instalaciones / Planta
                  </label>
                  <input
                    type="text"
                    placeholder="Ruta 5 Sur Km 1025, Parque Industrial"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:outline-hidden focus:border-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Notas / Convenio de Retiro o Venta
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ej. Retiro quincenal de boyas HDPE 1200L y redes de fondeo PP."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:outline-hidden focus:border-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow transition-colors"
                >
                  Guardar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR CLIENTE */}
      {editingClient && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-300 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-300 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-5 h-5 text-slate-800" />
                <h3 className="font-extrabold text-base text-slate-900">
                  Editar Ficha de Empresa: {editingClient.name}
                </h3>
              </div>
              <button 
                onClick={() => setEditingClient(null)}
                className="text-slate-500 hover:text-slate-800 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:outline-hidden focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    RUT *
                  </label>
                  <input
                    type="text"
                    required
                    value={editTaxId}
                    onChange={(e) => setEditTaxId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono font-bold focus:outline-hidden focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tipo de Empresa *
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as StakeholderType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:outline-hidden focus:border-slate-800"
                  >
                    <option value="generator_supplier">Salmonera / Generador (Entrega)</option>
                    <option value="buyer_customer">Comprador de Pellet</option>
                    <option value="both">Ambos (Generador y Comprador)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:outline-hidden focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:outline-hidden focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Ciudad / Base
                  </label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:outline-hidden focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Sector Industrial
                  </label>
                  <input
                    type="text"
                    value={editSector}
                    onChange={(e) => setEditSector(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:outline-hidden focus:border-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:outline-hidden focus:border-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Notas / Convenio
                  </label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:outline-hidden focus:border-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRMAR ELIMINACIÓN */}
      {deletingClient && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-300 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-extrabold text-lg text-slate-900">
                ¿Eliminar esta empresa?
              </h3>
            </div>

            <p className="text-sm text-slate-600">
              Estás a punto de eliminar a <strong className="text-slate-900">{deletingClient.name}</strong> (RUT: {deletingClient.tax_id}) de la base de datos de Greenspot.
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
              Nota: Si esta empresa tiene lotes o certificados asociados, los registros históricos conservarán el código pero la empresa ya no aparecerá en el catálogo activo.
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingClient(null)}
                className="px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow transition-colors"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Empresa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
