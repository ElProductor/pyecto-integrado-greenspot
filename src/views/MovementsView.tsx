import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  ArrowDownRight, 
  ArrowUpRight, 
  Download, 
  User, 
  FileText
} from 'lucide-react';
import { 
  InventoryMovement, 
  MaterialProduct, 
  Warehouse, 
  Batch, 
  MovementType, 
  UnitMeasure 
} from '../types';

interface MovementsViewProps {
  movements: InventoryMovement[];
  materials: MaterialProduct[];
  warehouses: Warehouse[];
  batches: Batch[];
  onRecordMovement: (movement: Omit<InventoryMovement, 'id'>) => Promise<void>;
  isNewMovementModalOpen: boolean;
  setIsNewMovementModalOpen: (open: boolean) => void;
}

export const MovementsView: React.FC<MovementsViewProps> = ({
  movements,
  materials,
  warehouses,
  batches,
  onRecordMovement,
  isNewMovementModalOpen,
  setIsNewMovementModalOpen
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Form State
  const [formNumber, setFormNumber] = useState(`MOV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [formType, setFormType] = useState<MovementType>('reception');
  const [formMaterialId, setFormMaterialId] = useState(materials[0]?.id || '');
  const [formFromWarehouse, setFormFromWarehouse] = useState<string>('');
  const [formToWarehouse, setFormToWarehouse] = useState<string>(warehouses[0]?.id || '');
  const [formQuantity, setFormQuantity] = useState(2500);
  const [formUnit, setFormUnit] = useState<UnitMeasure>('kg');
  const [formOperator, setFormOperator] = useState('Rodrigo Cárdenas (Jefe Patio)');
  const [formDoc, setFormDoc] = useState('Guía de Despacho N° 78192');
  const [formNotes, setFormNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRecordMovement({
      movement_number: formNumber,
      movement_type: formType,
      material_id: formMaterialId,
      batch_id: null,
      from_warehouse_id: formFromWarehouse || null,
      to_warehouse_id: formToWarehouse || null,
      quantity: Number(formQuantity),
      unit: formUnit,
      operator_name: formOperator,
      reference_doc: formDoc,
      notes: formNotes,
      created_at: new Date().toISOString()
    });

    setIsNewMovementModalOpen(false);
    setFormNumber(`MOV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleExportCsv = () => {
    const headers = ['N° Movimiento', 'Tipo', 'Material', 'Cantidad', 'Unidad', 'Origen', 'Destino', 'Operador', 'Doc Ref', 'Fecha'];
    const rows = filteredMovements.map(m => [
      m.movement_number,
      m.movement_type,
      `"${m.material?.name || ''}"`,
      m.quantity,
      m.unit,
      `"${m.from_warehouse?.name || 'Externo'}"`,
      `"${m.to_warehouse?.name || 'Externo'}"`,
      `"${m.operator_name}"`,
      `"${m.reference_doc || ''}"`,
      new Date(m.created_at).toLocaleDateString('es-CL')
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Kardex_Greenspot_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredMovements = movements.filter((m) => {
    const matchesSearch = 
      m.movement_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.material?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.operator_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.reference_doc?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || m.movement_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Kardex de Movimientos de Planta
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro de entradas, consumos a extrusión, mermas y despachos
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl text-sm font-semibold shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Descargar CSV</span>
          </button>

          <button
            onClick={() => setIsNewMovementModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Movimiento</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por N° movimiento, guía de despacho, operador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700"
        >
          <option value="ALL">Todos los Movimientos</option>
          <option value="reception">Recepción / Entrada</option>
          <option value="production_intake">Consumo a Planta</option>
          <option value="production_output">Producción de Pellet</option>
          <option value="dispatch">Despacho / Venta</option>
          <option value="internal_transfer">Traslado Interno</option>
        </select>
      </div>

      {/* Tabla Kardex de Alta Legibilidad */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-xs">
              <tr>
                <th className="p-4">N° / Fecha</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Material</th>
                <th className="p-4 text-right">Cantidad</th>
                <th className="p-4">Origen → Destino</th>
                <th className="p-4">Doc. Referencia</th>
                <th className="p-4">Operador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.map((mov) => {
                const isPositive = ['reception', 'production_output'].includes(mov.movement_type);
                return (
                  <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-mono font-bold text-slate-900">{mov.movement_number}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {new Date(mov.created_at).toLocaleDateString('es-CL')}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                        {mov.movement_type === 'reception' && 'Recepción'}
                        {mov.movement_type === 'dispatch' && 'Despacho'}
                        {mov.movement_type === 'production_intake' && 'Consumo Planta'}
                        {mov.movement_type === 'production_output' && 'Producción Pellet'}
                        {mov.movement_type === 'internal_transfer' && 'Traslado'}
                        {mov.movement_type === 'waste_adjustment' && 'Merma'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{mov.material?.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{mov.material?.polymer_type}</div>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`font-mono font-extrabold text-base ${isPositive ? 'text-emerald-700' : 'text-slate-800'}`}>
                        {isPositive ? '+' : '-'}{mov.quantity.toLocaleString('es-CL')} {mov.unit}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 text-xs">
                      <span className="font-medium">{mov.from_warehouse?.name || 'Proveedor'}</span>
                      <span className="mx-1 text-slate-400">→</span>
                      <span className="font-bold text-slate-800">{mov.to_warehouse?.name || 'Cliente'}</span>
                    </td>
                    <td className="p-4 text-slate-700 text-xs font-medium">
                      {mov.reference_doc || '-'}
                    </td>
                    <td className="p-4 text-slate-600 text-xs font-medium">
                      {mov.operator_name}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Movimiento */}
      {isNewMovementModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 my-8">
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              Registrar Movimiento en Kardex
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Ajusta automáticamente el inventario en planta
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">N° Movimiento</label>
                  <input
                    type="text"
                    required
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Operación</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="reception">Recepción de Residuos</option>
                    <option value="production_intake">Consumo a Planta (Molienda)</option>
                    <option value="production_output">Producción de Pellet</option>
                    <option value="dispatch">Despacho / Venta</option>
                    <option value="internal_transfer">Traslado entre Bodegas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Material</label>
                <select
                  value={formMaterialId}
                  onChange={(e) => setFormMaterialId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Stock: {m.current_stock.toLocaleString('es-CL')} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bodega Origen</label>
                  <select
                    value={formFromWarehouse}
                    onChange={(e) => setFormFromWarehouse(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="">(Ninguna / Entrada Externa)</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bodega Destino</label>
                  <select
                    value={formToWarehouse}
                    onChange={(e) => setFormToWarehouse(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="">(Ninguna / Despacho Externo)</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cantidad (kg)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Guía / Documento</label>
                  <input
                    type="text"
                    required
                    value={formDoc}
                    onChange={(e) => setFormDoc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Operador / Supervisor</label>
                <input
                  type="text"
                  required
                  value={formOperator}
                  onChange={(e) => setFormOperator(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewMovementModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl"
                >
                  Confirmar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
