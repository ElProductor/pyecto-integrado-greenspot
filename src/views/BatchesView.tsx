import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  ArrowRight, 
  Building2, 
  Scale, 
  Calendar, 
  CheckCircle2, 
  Printer,
  Edit3,
  Trash2,
  X,
  Truck
} from 'lucide-react';
import QRCode from 'qrcode';
import { Batch, MaterialProduct, Stakeholder, Warehouse, BatchStatus } from '../types';
import { useToast } from '../components/Toast';
import { useIAM } from '../context/IAMContext';

interface BatchesViewProps {
  batches: Batch[];
  materials: MaterialProduct[];
  stakeholders: Stakeholder[];
  warehouses: Warehouse[];
  onSaveBatch: (batch: Omit<Batch, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdateStatus: (id: string, status: BatchStatus) => Promise<void>;
  onUpdateBatch?: (id: string, updates: Partial<Batch>) => Promise<void>;
  onDeleteBatch?: (id: string) => Promise<void>;
  isNewBatchModalOpen: boolean;
  setIsNewBatchModalOpen: (open: boolean) => void;
}

export const BatchesView: React.FC<BatchesViewProps> = ({
  batches,
  materials,
  stakeholders,
  warehouses,
  onSaveBatch,
  onUpdateStatus,
  onUpdateBatch,
  onDeleteBatch,
  isNewBatchModalOpen,
  setIsNewBatchModalOpen
}) => {
  const { success } = useToast();
  const { permissions } = useIAM();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal Etiqueta Imprimible
  const [selectedQrBatch, setSelectedQrBatch] = useState<Batch | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Modal Edición de Lote & Transporte
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [editMaterialId, setEditMaterialId] = useState('');
  const [editSupplierId, setEditSupplierId] = useState('');
  const [editWeight, setEditWeight] = useState<number>(0);
  const [editImpurity, setEditImpurity] = useState<number>(2.0);
  const [editOrigin, setEditOrigin] = useState('');
  const [editStatus, setEditStatus] = useState<BatchStatus>('received');
  const [editNotes, setEditNotes] = useState('');

  // Form State para Nuevo Lote
  const [formNumber, setFormNumber] = useState(`LOTE-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [formMaterialId, setFormMaterialId] = useState(materials[0]?.id || '');
  const [formSupplierId, setFormSupplierId] = useState(stakeholders[0]?.id || '');
  const [formWarehouseId, setFormWarehouseId] = useState(warehouses[0]?.id || '');
  const [formWeight, setFormWeight] = useState(12000);
  const [formImpurity, setFormImpurity] = useState(2.0);
  const [formOrigin, setFormOrigin] = useState('Centro Isla Llancahué, Fiordo Comau');
  const [formNotes, setFormNotes] = useState('');

  const handleOpenEdit = (batch: Batch) => {
    setEditingBatch(batch);
    setEditMaterialId(batch.material_id);
    setEditSupplierId(batch.supplier_id || '');
    setEditWeight(batch.current_weight_kg);
    setEditImpurity(batch.impurity_percentage);
    setEditOrigin(batch.marine_origin_zone || '');
    setEditStatus(batch.status);
    setEditNotes(batch.notes || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch || !onUpdateBatch) return;

    await onUpdateBatch(editingBatch.id, {
      material_id: editMaterialId,
      supplier_id: editSupplierId || undefined,
      current_weight_kg: Number(editWeight),
      impurity_percentage: Number(editImpurity),
      marine_origin_zone: editOrigin,
      status: editStatus,
      notes: editNotes
    });

    success('Lote actualizado', `Los datos de transporte y peso de ${editingBatch.batch_number} fueron modificados`);
    setEditingBatch(null);
  };

  const handleOpenQr = async (batch: Batch) => {
    setSelectedQrBatch(batch);
    try {
      const qrUrl = await QRCode.toDataURL(
        `GREENSPOT-LOTE:${batch.batch_number}|KG:${batch.current_weight_kg}|MAT:${batch.material?.name}`,
        { width: 220, margin: 1 }
      );
      setQrCodeDataUrl(qrUrl);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveBatch({
      batch_number: formNumber,
      material_id: formMaterialId,
      supplier_id: formSupplierId || undefined,
      warehouse_id: formWarehouseId || undefined,
      initial_weight_kg: Number(formWeight),
      current_weight_kg: Number(formWeight),
      impurity_percentage: Number(formImpurity),
      reception_date: new Date().toISOString(),
      status: 'received',
      marine_origin_zone: formOrigin,
      notes: formNotes
    });

    setIsNewBatchModalOpen(false);
    setFormNumber(`LOTE-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const filteredBatches = batches.filter((b) => {
    const matchesSearch = 
      b.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.marine_origin_zone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || b.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const nextStatusMap: Record<BatchStatus, { next: BatchStatus; label: string } | null> = {
    received: { next: 'washing_sorting', label: '1. Pasar a Lavado' },
    washing_sorting: { next: 'shredded', label: '2. Pasar a Molienda' },
    shredded: { next: 'pelletized', label: '3. Pasar a Peletizado' },
    pelletized: { next: 'dispatched', label: '4. Despachar a Cliente' },
    dispatched: null,
    quarantine: { next: 'washing_sorting', label: 'Reingresar a Lavado' }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-300">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Lotes, Transporte & Trazabilidad
          </h1>
          <p className="text-sm text-slate-700 mt-1 font-medium">
            Entradas de camión, patentes, kilos netos de báscula y centro marino de origen (100% editable)
          </p>
        </div>

        <button
          onClick={() => setIsNewBatchModalOpen(true)}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Recepcionar Nuevo Lote</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl p-4 border border-slate-300 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por lote (ej: LOTE-2026), origen marino, o empresa salmonera..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:bg-white focus:outline-hidden"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-800"
        >
          <option value="ALL">Todos los Estados</option>
          <option value="received">Recepcionados (Patio)</option>
          <option value="washing_sorting">En Lavado</option>
          <option value="shredded">En Molienda</option>
          <option value="pelletized">Peletizados</option>
          <option value="dispatched">Despachados</option>
        </select>
      </div>

      {/* Grid de Lotes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredBatches.map((batch) => {
          const statusInfo = nextStatusMap[batch.status];

          return (
            <div 
              key={batch.id}
              className="bg-white rounded-xl border border-slate-300 p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-200 px-2.5 py-0.5 rounded border border-slate-300">
                        {batch.batch_number}
                      </span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300">
                        {batch.status === 'received' && '1. En Patio'}
                        {batch.status === 'washing_sorting' && '2. En Lavado'}
                        {batch.status === 'shredded' && '3. En Molienda'}
                        {batch.status === 'pelletized' && '4. Peletizado'}
                        {batch.status === 'dispatched' && '5. Despachado'}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {batch.material?.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(batch)}
                      className="p-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-800 font-bold text-xs flex items-center gap-1 transition-colors"
                      title="Editar transporte, chofer y kilos del lote"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleOpenQr(batch)}
                      className="p-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-800 font-bold text-xs flex items-center gap-1 transition-colors"
                      title="Imprimir etiqueta para big bag"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-700" />
                      <span>Rótulo</span>
                    </button>
                  </div>
                </div>

                {/* Detalles de Origen y Transporte */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-medium">Empresa Generadora:</span>
                    <strong className="text-slate-900">{batch.supplier?.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-medium">Origen Marino:</span>
                    <span className="font-bold text-slate-800">{batch.marine_origin_zone || 'Patagonia'}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-200">
                    <span className="text-slate-600 font-medium">Peso Neto Limpio:</span>
                    <span className="text-xl font-extrabold text-slate-900 font-mono">
                      {batch.current_weight_kg.toLocaleString('es-CL')} kg
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600 font-medium">
                    <span>Merma biofouling: {batch.impurity_percentage}%</span>
                    <span>Recepción: {new Date(batch.reception_date).toLocaleDateString('es-CL')}</span>
                  </div>
                </div>

                {batch.notes && (
                  <p className="text-xs text-slate-600 italic mb-3 font-medium">
                    "{batch.notes}"
                  </p>
                )}
              </div>

              {/* Botón de Avance de Etapa */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Control de Trazabilidad</span>

                {statusInfo ? (
                  <button
                    onClick={() => onUpdateStatus(batch.id, statusInfo.next)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>{statusInfo.label}</span>
                  </button>
                ) : (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded border border-emerald-300">
                    Lote Despachado a Cliente
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal 1: Editar Lote & Transporte (Camión, chofer, kilos, origen) */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-300 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Editar Lote & Transporte • {editingBatch.batch_number}
                </h2>
                <p className="text-xs text-slate-600 font-medium">
                  Modifica kilos, empresa generadora, merma y notas de calidad
                </p>
              </div>
              <button
                onClick={() => setEditingBatch(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Material Asignado</label>
                <select
                  value={editMaterialId}
                  onChange={(e) => setEditMaterialId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.polymer_type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Empresa Generadora (Salmonera)</label>
                <select
                  value={editSupplierId}
                  onChange={(e) => setEditSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900"
                >
                  {stakeholders.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} (RUT: {s.tax_id})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kilos Netos Limpios (kg)</label>
                  <input
                    type="number"
                    step="50"
                    required
                    value={editWeight}
                    onChange={(e) => setEditWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-sm font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">% Merma / Biofouling</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editImpurity}
                    onChange={(e) => setEditImpurity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-sm font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Centro Marino de Origen</label>
                  <input
                    type="text"
                    value={editOrigin}
                    onChange={(e) => setEditOrigin(e.target.value)}
                    placeholder="ej: Centro Llancahué, Fiordo Comau"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estado en Planta</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
                  >
                    <option value="received">1. Recepcionado en Patio</option>
                    <option value="washing_sorting">2. En Lavado</option>
                    <option value="shredded">3. En Molienda</option>
                    <option value="pelletized">4. Peletizado</option>
                    <option value="dispatched">5. Despachado</option>
                    <option value="quarantine">En Cuarentena</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notas de Transporte & Calidad</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Detalles del chofer, patente, o impurezas encontradas..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                {onDeleteBatch && permissions.canDeleteRecords ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm(`¿Estás seguro de eliminar el lote ${editingBatch.batch_number}?`)) {
                        await onDeleteBatch(editingBatch.id);
                        setEditingBatch(null);
                      }
                    }}
                    className="px-3 py-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Lote</span>
                  </button>
                ) : <div />}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingBatch(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-sm shadow"
                  >
                    Guardar Cambios de Lote
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Etiqueta de Big Bag / Pallet */}
      {selectedQrBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-xl border border-slate-300">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Rótulo de Trazabilidad para Big Bag
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Lote: {selectedQrBatch.batch_number}
            </p>

            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="QR Lote" className="mx-auto mb-4 border border-slate-300 p-2 rounded-xl" />
            ) : null}

            <div className="text-xs text-left p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 mb-4 font-medium">
              <div>Material: <strong className="text-slate-900">{selectedQrBatch.material?.name}</strong></div>
              <div>Peso: <strong className="text-slate-900">{selectedQrBatch.current_weight_kg.toLocaleString('es-CL')} kg</strong></div>
              <div>Origen: {selectedQrBatch.marine_origin_zone || 'Patagonia'}</div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedQrBatch(null)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Cerrar Rótulo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Recepcionar Nuevo Lote */}
      {isNewBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-300 my-8">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Recepcionar Nuevo Lote de Pasivos
            </h2>
            <p className="text-xs text-slate-600 font-medium mb-4">
              Ingreso de boyas, cabos o plumavit desde centros de cultivo
            </p>

            <form onSubmit={handleBatchSubmit} className="space-y-3.5 text-xs font-medium">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">N° de Lote</label>
                <input
                  type="text"
                  required
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Material</label>
                <select
                  value={formMaterialId}
                  onChange={(e) => setFormMaterialId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.polymer_type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Empresa Salmonera (Generador)</label>
                <select
                  value={formSupplierId}
                  onChange={(e) => setFormSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold"
                >
                  {stakeholders.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kilos Netos (kg)</label>
                  <input
                    type="number"
                    required
                    value={formWeight}
                    onChange={(e) => setFormWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">% Merma / Agua</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formImpurity}
                    onChange={(e) => setFormImpurity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Centro Marino de Origen</label>
                <input
                  type="text"
                  value={formOrigin}
                  onChange={(e) => setFormOrigin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notas de Recepción</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewBatchModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow"
                >
                  Ingresar Lote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
