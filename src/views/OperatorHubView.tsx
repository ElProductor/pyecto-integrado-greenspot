import React, { useState } from 'react';
import { 
  Scale, 
  ArrowRight, 
  Play, 
  CheckCircle2, 
  FileSpreadsheet, 
  Boxes, 
  Layers, 
  Truck, 
  Check, 
  RefreshCw,
  Plus,
  AlertTriangle
} from 'lucide-react';
import { Batch, MaterialProduct, BatchStatus } from '../types';
import { useToast } from '../components/Toast';

interface OperatorHubViewProps {
  batches: Batch[];
  materials: MaterialProduct[];
  onOpenWeighing: () => void;
  onOpenExcelSync: () => void;
  onUpdateBatchStatus: (batchId: string, nextStatus: BatchStatus) => Promise<void>;
  onQuickAdjustStock: (materialId: string, newStock: number) => Promise<void>;
}

export const OperatorHubView: React.FC<OperatorHubViewProps> = ({
  batches,
  materials,
  onOpenWeighing,
  onOpenExcelSync,
  onUpdateBatchStatus,
  onQuickAdjustStock
}) => {
  const { success } = useToast();
  const [quickAdjustItem, setQuickAdjustItem] = useState<MaterialProduct | null>(null);
  const [adjustKgInput, setAdjustKgInput] = useState<number>(0);

  // Lotes activos en planta (excluyendo despachados)
  const activeBatches = batches.filter(b => b.status !== 'dispatched');

  const nextStatusLabel: Record<BatchStatus, { next: BatchStatus; label: string }> = {
    received: { next: 'washing_sorting', label: '1. Enviar a Lavado' },
    washing_sorting: { next: 'shredded', label: '2. Enviar a Molienda' },
    shredded: { next: 'pelletized', label: '3. Enviar a Extrusora (Pellet)' },
    pelletized: { next: 'dispatched', label: '4. Despachar a Cliente' },
    dispatched: { next: 'dispatched', label: 'Completado' },
    quarantine: { next: 'washing_sorting', label: 'Reingresar a Lavado' }
  };

  const handleAdvance = async (batch: Batch) => {
    const target = nextStatusLabel[batch.status]?.next;
    if (target) {
      await onUpdateBatchStatus(batch.id, target);
      success('Etapa Actualizada', `Lote ${batch.batch_number} avanzó a ${target}`);
    }
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdjustItem) return;
    await onQuickAdjustStock(quickAdjustItem.id, Number(adjustKgInput));
    success('Stock Actualizado', `${quickAdjustItem.name} fijado en ${adjustKgInput.toLocaleString('es-CL')} kg`);
    setQuickAdjustItem(null);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Encabezado Unificado para el Trabajador */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Turno en Vivo • Operación de Planta
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Estación de Operación Rápida
            </h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1">
              Plataforma simplificada: ingresa camiones, avanza etapas de producción y sincroniza con Excel en 1 solo paso.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenExcelSync}
              className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-xl text-sm font-bold shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Sincronizar Excel</span>
            </button>

            <button
              onClick={onOpenWeighing}
              className="flex items-center gap-2.5 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-extrabold shadow-xs transition-colors"
            >
              <Truck className="w-5 h-5" />
              <span>Llegada de Camión (Báscula)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Bloques Clave de Operación en Pantalla Única */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Paso 1: Recepción de Camiones */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold mb-4">
              <Scale className="w-6 h-6 text-emerald-700" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Paso 1 • Portería y Patio
            </span>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Pesaje Oficial de Entrada
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Registra patentes de camiones con boyas o plumavit. El sistema calcula peso neto, descuenta merma y genera el lote automáticamente.
            </p>
          </div>

          <button
            onClick={onOpenWeighing}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-colors"
          >
            <span>Abrir Ticket de Pesaje</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Paso 2: Flujo de Planta (Lavado / Molienda / Extrusora) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold mb-4">
              <Layers className="w-6 h-6 text-emerald-700" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Paso 2 • Línea Productiva
            </span>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Pases Rápidos de Etapa
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Hay <strong>{activeBatches.length} lotes activos</strong> en el patio. Puedes avanzar cada lote de lavado a molienda y pellet con 1 solo toque abajo.
            </p>
          </div>

          <div className="text-xs font-semibold text-emerald-800 bg-emerald-50/70 p-3 rounded-xl border border-emerald-100 flex items-center justify-between">
            <span>Rendimiento estándar:</span>
            <strong>&gt; 95% Yield</strong>
          </div>
        </div>

        {/* Paso 3: Conexión con Excel y Reportes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold mb-4">
              <FileSpreadsheet className="w-6 h-6 text-emerald-700" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Paso 3 • Manipulación en Excel
            </span>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Libros de Turno .xlsx
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Exporta la base de datos completa a Excel o sube planillas para actualizar stocks masivos sin digitar manualmente.
            </p>
          </div>

          <button
            onClick={onOpenExcelSync}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-xl text-sm font-bold transition-colors"
          >
            <span>Gestionar Archivos Excel</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lotes en Proceso con Botón de Avance Directo (Sin formularios engorrosos) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Lotes en Proceso en Planta (Control de 1 Toque)
            </h2>
            <p className="text-sm text-slate-500">
              Haz clic en el botón para avanzar el material a su siguiente etapa productiva
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full">
            {activeBatches.length} Lotes en Turno
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {activeBatches.slice(0, 5).map((batch) => {
            const statusInfo = nextStatusLabel[batch.status];

            return (
              <div 
                key={batch.id} 
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 p-3 rounded-xl transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-extrabold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                      {batch.batch_number}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                      {batch.status === 'received' && 'En Patio / Recepcionado'}
                      {batch.status === 'washing_sorting' && 'En Lavado & Selección'}
                      {batch.status === 'shredded' && 'Molido (Flakes)'}
                      {batch.status === 'pelletized' && 'Peletizado (Listo Despacho)'}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-base">
                    {batch.material?.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    Origen: <strong className="text-slate-700">{batch.supplier?.name}</strong> • {batch.marine_origin_zone || 'Patagonia'}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-mono text-lg font-extrabold text-slate-900">
                      {batch.current_weight_kg.toLocaleString('es-CL')} kg
                    </div>
                    <span className="text-xs text-slate-400">Peso Neto Limpio</span>
                  </div>

                  {statusInfo && batch.status !== 'dispatched' && (
                    <button
                      onClick={() => handleAdvance(batch)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors shrink-0"
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

      {/* Silos de Acopio y Balanza con Ajuste Rápido */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Estado de Silos y Acopio en Planta
            </h2>
            <p className="text-sm text-slate-500">
              Si el conteo físico no coincide, corrígelo con el botón rápido sin salir de esta pantalla
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {materials.slice(0, 4).map((mat) => {
            const isCritical = mat.current_stock <= mat.minimum_stock;
            return (
              <div 
                key={mat.id} 
                className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs font-bold text-slate-500">{mat.polymer_type}</span>
                    {isCritical && (
                      <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Bajo
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 line-clamp-1 mb-1">{mat.name}</h4>
                  <div className="font-mono text-xl font-extrabold text-slate-900 mb-3">
                    {mat.current_stock.toLocaleString('es-CL')} <span className="text-xs font-bold text-slate-500">{mat.unit}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setQuickAdjustItem(mat);
                    setAdjustKgInput(mat.current_stock);
                  }}
                  className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors shadow-2xs"
                >
                  Corregir Kilos
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Corrección Rápida de Kilos en Silo */}
      {quickAdjustItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Corregir Stock de Silo
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {quickAdjustItem.name} ({quickAdjustItem.code})
            </p>

            <form onSubmit={handleSaveStock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kilos Reales Contados ({quickAdjustItem.unit})
                </label>
                <input
                  type="number"
                  step="50"
                  required
                  value={adjustKgInput}
                  onChange={(e) => setAdjustKgInput(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-base font-bold text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickAdjustItem(null)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"
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
