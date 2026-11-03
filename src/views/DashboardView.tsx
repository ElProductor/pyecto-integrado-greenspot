import React, { useState } from 'react';
import { 
  Leaf, 
  Boxes, 
  Layers, 
  Plus, 
  ArrowRight, 
  Scale, 
  FileSpreadsheet,
  Truck,
  Play,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { 
  KpiMetrics, 
  MaterialProduct, 
  Batch, 
  InventoryMovement, 
  BatchStatus 
} from '../types';
import { TabType } from '../components/Sidebar';
import { useToast } from '../components/Toast';

interface DashboardViewProps {
  metrics: KpiMetrics | null;
  materials: MaterialProduct[];
  batches: Batch[];
  movements: InventoryMovement[];
  onNavigate: (tab: TabType) => void;
  onOpenNewMovement: () => void;
  onOpenWeighing: () => void;
  onOpenExcelSync: () => void;
  onUpdateBatchStatus: (id: string, status: BatchStatus) => Promise<void>;
  onUpdateStock: (id: string, newStock: number) => Promise<void>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  materials,
  batches,
  movements,
  onNavigate,
  onOpenNewMovement,
  onOpenWeighing,
  onOpenExcelSync,
  onUpdateBatchStatus,
  onUpdateStock
}) => {
  const { success } = useToast();
  const [quickAdjustMat, setQuickAdjustMat] = useState<MaterialProduct | null>(null);
  const [adjustKgInput, setAdjustKgInput] = useState<number>(0);

  const activeBatches = batches.filter(b => b.status !== 'dispatched');

  const nextStatusLabel: Record<BatchStatus, { next: BatchStatus; label: string }> = {
    received: { next: 'washing_sorting', label: '1. Pasar a Lavado' },
    washing_sorting: { next: 'shredded', label: '2. Pasar a Molienda' },
    shredded: { next: 'pelletized', label: '3. Pasar a Pelletizado' },
    pelletized: { next: 'dispatched', label: '4. Despachar a Cliente' },
    dispatched: { next: 'dispatched', label: 'Completado' },
    quarantine: { next: 'washing_sorting', label: 'Reingresar a Lavado' }
  };

  const handleAdvanceBatch = async (batch: Batch) => {
    const target = nextStatusLabel[batch.status]?.next;
    if (target) {
      await onUpdateBatchStatus(batch.id, target);
      success('Lote actualizado', `Lote ${batch.batch_number} avanzó a: ${target}`);
    }
  };

  const handleSaveStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdjustMat) return;
    await onUpdateStock(quickAdjustMat.id, Number(adjustKgInput));
    success('Stock corregido', `${quickAdjustMat.name} actualizado a ${adjustKgInput.toLocaleString('es-CL')} kg`);
    setQuickAdjustMat(null);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Header Minimalista con Acciones Claras */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-300">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Panel Principal
          </h1>
          <p className="text-sm text-slate-600 font-medium mt-0.5">
            Operación diaria de valorización de plásticos acuícolas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenExcelSync}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 rounded-xl text-sm font-bold transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Excel</span>
          </button>

          <button
            onClick={onOpenWeighing}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
          >
            <Scale className="w-4 h-4" />
            <span>Recepción en Romana</span>
          </button>

          <button
            onClick={onOpenNewMovement}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Movimiento</span>
          </button>
        </div>
      </div>

      {/* 2. Tres Métricas Grandes, Limpias y Sin Saturación */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Métrica 1 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
            Plástico Valorizado
          </span>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl font-extrabold text-slate-900 font-mono">
              {metrics ? (metrics.totalRecycledKg / 1000).toFixed(1) : '19.7'}
            </span>
            <span className="text-base font-bold text-slate-600">Toneladas</span>
          </div>
          <span className="text-xs text-emerald-800 font-bold block mt-1">
            +{metrics ? (metrics.totalCo2AvoidedKg / 1000).toFixed(1) : '37.7'} t CO2eq evitado
          </span>
        </div>

        {/* Métrica 2 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
            Stock en Silos & Patio
          </span>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl font-extrabold text-slate-900 font-mono">
              {metrics ? (metrics.totalStockKg / 1000).toFixed(1) : '206.3'}
            </span>
            <span className="text-base font-bold text-slate-600">Toneladas</span>
          </div>
          <button
            onClick={() => onNavigate('inventory')}
            className="text-xs font-bold text-slate-700 hover:text-slate-900 hover:underline block mt-1"
          >
            Ver catálogo de materiales →
          </button>
        </div>

        {/* Métrica 3 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
            Lotes en Planta
          </span>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl font-extrabold text-slate-900 font-mono">
              {activeBatches.length}
            </span>
            <span className="text-base font-bold text-slate-600">Lotes Activos</span>
          </div>
          <button
            onClick={() => onNavigate('batches')}
            className="text-xs font-bold text-slate-700 hover:text-slate-900 hover:underline block mt-1"
          >
            Ver trazabilidad de origen →
          </button>
        </div>
      </div>

      {/* 3. Lotes en Turno (Lo más simple para el trabajador: 1 clic por etapa) */}
      <div className="bg-white rounded-2xl border border-slate-300 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Lotes en Proceso
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Avanza el material en planta con un solo clic
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-800 rounded-full border border-slate-300">
            {activeBatches.length} en proceso
          </span>
        </div>

        <div className="divide-y divide-slate-200">
          {activeBatches.slice(0, 4).map((batch) => {
            const statusInfo = nextStatusLabel[batch.status];

            return (
              <div 
                key={batch.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 px-2 rounded-xl transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-200 px-2 py-0.5 rounded border border-slate-300">
                      {batch.batch_number}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300">
                      {batch.status === 'received' && 'En Patio'}
                      {batch.status === 'washing_sorting' && 'En Lavado'}
                      {batch.status === 'shredded' && 'Molido'}
                      {batch.status === 'pelletized' && 'Pelletizado'}
                    </span>
                  </div>
                  <div className="font-bold text-base text-slate-900">
                    {batch.material?.name}
                  </div>
                  <div className="text-xs text-slate-600 font-medium">
                    {batch.supplier?.name} • {batch.marine_origin_zone || 'Patagonia'}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-slate-900 font-mono">
                      {batch.current_weight_kg.toLocaleString('es-CL')} kg
                    </div>
                    <span className="text-xs text-slate-500 font-medium">Neto Báscula</span>
                  </div>

                  {statusInfo && batch.status !== 'dispatched' && (
                    <button
                      onClick={() => handleAdvanceBatch(batch)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-sm shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{statusInfo.label}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Silos de Materia Prima & Conteo Físico Rápido */}
      <div className="bg-white rounded-2xl border border-slate-300 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Silos de Acopio</h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">Inventario rápido con corrección física</p>
          </div>
          <button
            onClick={() => onNavigate('inventory')}
            className="text-xs font-bold text-slate-800 hover:underline flex items-center gap-1"
          >
            <span>Ver inventario completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {materials.slice(0, 4).map((mat) => (
            <div 
              key={mat.id}
              className="p-4 bg-slate-50 rounded-xl border border-slate-300 flex flex-col justify-between"
            >
              <div>
                <span className="font-mono text-xs font-bold text-slate-600 block mb-1">{mat.polymer_type}</span>
                <h4 className="font-bold text-sm text-slate-900 line-clamp-1 mb-1">{mat.name}</h4>
                <div className="font-mono text-xl font-extrabold text-slate-900 mb-3">
                  {mat.current_stock.toLocaleString('es-CL')} <span className="text-xs font-bold text-slate-600">{mat.unit}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setQuickAdjustMat(mat);
                  setAdjustKgInput(mat.current_stock);
                }}
                className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors"
              >
                Corregir Kilos
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Corrección Rápida de Kilos */}
      {quickAdjustMat && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-300">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Corregir Conteo Físico
            </h3>
            <p className="text-xs text-slate-600 font-medium mb-4">
              {quickAdjustMat.name} ({quickAdjustMat.code})
            </p>

            <form onSubmit={handleSaveStockAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kilos Reales ({quickAdjustMat.unit})
                </label>
                <input
                  type="number"
                  step="50"
                  required
                  value={adjustKgInput}
                  onChange={(e) => setAdjustKgInput(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-base font-bold text-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickAdjustMat(null)}
                  className="px-3.5 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
                >
                  Guardar Kilos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
