import React, { useState } from 'react';
import { Scale, X, Check, Calculator, ArrowRight } from 'lucide-react';
import { MaterialProduct, Stakeholder, Warehouse } from '../types';
import { useToast } from './Toast';

interface WeighingModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: MaterialProduct[];
  stakeholders: Stakeholder[];
  warehouses: Warehouse[];
  onSaveBatch: (batchData: any) => Promise<void>;
}

export const WeighingModal: React.FC<WeighingModalProps> = ({
  isOpen,
  onClose,
  materials,
  stakeholders,
  warehouses,
  onSaveBatch
}) => {
  const { success } = useToast();

  const [truckPlate, setTruckPlate] = useState('HJ-8492');
  const [driverName, setDriverName] = useState('Juan Carlos Ruiz');
  const [grossWeight, setGrossWeight] = useState<number>(28400); // Peso Bruto (Camión Cargado)
  const [tareWeight, setTareWeight] = useState<number>(14200);  // Tara (Camión Vacío)
  const [impurityPct, setImpurityPct] = useState<number>(2.0);  // % Impureza / Agua

  const [materialId, setMaterialId] = useState(materials[0]?.id || '');
  const [supplierId, setSupplierId] = useState(stakeholders[0]?.id || '');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [originZone, setOriginZone] = useState('Centro Marino Fiordo Comau');

  if (!isOpen) return null;

  // Cálculos automáticos de pesaje industrial
  const netWeight = Math.max(0, grossWeight - tareWeight);
  const impurityKg = Math.round((netWeight * impurityPct) / 100);
  const cleanValorizableKg = Math.max(0, netWeight - impurityKg);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (netWeight <= 0) {
      alert('El peso bruto debe ser mayor a la tara del camión.');
      return;
    }

    const batchNumber = `LOTE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await onSaveBatch({
      batch_number: batchNumber,
      material_id: materialId,
      supplier_id: supplierId || undefined,
      warehouse_id: warehouseId || undefined,
      initial_weight_kg: cleanValorizableKg,
      current_weight_kg: cleanValorizableKg,
      impurity_percentage: impurityPct,
      reception_date: new Date().toISOString(),
      status: 'received',
      marine_origin_zone: originZone,
      notes: `Pesaje de camión patente ${truckPlate} - Chofer: ${driverName}. Bruto: ${grossWeight}kg, Tara: ${tareWeight}kg, Neto: ${netWeight}kg.`
    });

    success('Pesaje completado y registrado', `Lote ${batchNumber} por ${cleanValorizableKg.toLocaleString('es-CL')} kg netos ingresado a patio`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header simple y claro */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
              <Scale className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Calculadora & Ticket de Báscula
              </h2>
              <p className="text-xs text-slate-500">
                Pesaje oficial de camiones y tolvas en portería
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario limpio */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patente del Camión
              </label>
              <input
                type="text"
                required
                value={truckPlate}
                onChange={(e) => setTruckPlate(e.target.value.toUpperCase())}
                placeholder="ej: AB-1234"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:bg-white focus:outline-hidden focus:border-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chofer / Transportista
              </label>
              <input
                type="text"
                required
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Nombre completo"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:border-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Empresa Generadora
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden"
              >
                {stakeholders.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Material Declarado
              </label>
              <select
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden"
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.polymer_type})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Centro Marino / Origen
            </label>
            <input
              type="text"
              value={originZone}
              onChange={(e) => setOriginZone(e.target.value)}
              placeholder="ej: Centro Llancahué, Fiordo Comau"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:border-slate-400"
            />
          </div>

          {/* Cálculos de Báscula */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  1. Peso Bruto (kg)
                </label>
                <input
                  type="number"
                  step="50"
                  required
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  2. Tara Camión (kg)
                </label>
                <input
                  type="number"
                  step="50"
                  required
                  value={tareWeight}
                  onChange={(e) => setTareWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  % Merma / Agua
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={impurityPct}
                  onChange={(e) => setImpurityPct(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-800"
                />
              </div>
            </div>

            {/* Resultado Final Destacado */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">Peso Neto Valorizable:</span>
                <span className="text-xl font-extrabold text-slate-900 font-mono">
                  {cleanValorizableKg.toLocaleString('es-CL')} kg
                </span>
                <span className="text-xs text-slate-500 ml-1">
                  ({(cleanValorizableKg / 1000).toFixed(2)} Toneladas)
                </span>
              </div>

              <div className="text-right text-xs text-slate-500">
                <span>Neto báscula: {netWeight.toLocaleString('es-CL')} kg</span>
                <div className="text-slate-400">Descuento merma: -{impurityKg.toLocaleString('es-CL')} kg</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm transition-colors shadow-xs"
            >
              Registrar Lote de Báscula
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
