import React, { useState } from 'react';
import { 
  Cog, 
  Plus, 
  Search, 
  Scale, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Layers,
  ArrowRight
} from 'lucide-react';
import { ProductionOrder, MaterialProduct } from '../types';
import { useToast } from '../components/Toast';

interface ProductionViewProps {
  orders: ProductionOrder[];
  materials: MaterialProduct[];
  onSaveOrder: (order: Omit<ProductionOrder, 'id'>) => Promise<void>;
  isNewModalOpen: boolean;
  setIsNewModalOpen: (open: boolean) => void;
}

export const ProductionView: React.FC<ProductionViewProps> = ({
  orders,
  materials,
  onSaveOrder,
  isNewModalOpen,
  setIsNewModalOpen
}) => {
  const { success } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [orderNumber, setOrderNumber] = useState(`OP-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [lineName, setLineName] = useState('Línea de Extrusión y Peletizado 2 (Trapén)');
  const [inputId, setInputId] = useState(materials[4]?.id || materials[0]?.id || '');
  const [outputId, setOutputId] = useState(materials[6]?.id || materials[0]?.id || '');
  const [inputKg, setInputKg] = useState(10000);
  const [outputKg, setOutputKg] = useState(9600);
  const [scrapKg, setScrapKg] = useState(400);
  const [supervisor, setSupervisor] = useState('Hugo Mansilla (Jefe de Turno)');

  const calculatedYield = inputKg > 0 ? Number(((outputKg / inputKg) * 100).toFixed(1)) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveOrder({
      order_number: orderNumber,
      line_name: lineName,
      input_material_id: inputId,
      output_material_id: outputId,
      input_weight_kg: Number(inputKg),
      output_weight_kg: Number(outputKg),
      scrap_weight_kg: Number(scrapKg),
      yield_percentage: calculatedYield,
      status: 'in_progress',
      start_date: new Date().toISOString(),
      supervisor_name: supervisor
    });

    success('Orden de producción iniciada', `OP ${orderNumber} ingresada al sistema con balance de masa`);
    setIsNewModalOpen(false);
    setOrderNumber(`OP-2026-${Math.floor(100 + Math.random() * 900)}`);
  };

  const filtered = orders.filter(
    (o) =>
      o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.line_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.supervisor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Líneas de Producción & Balance de Masa
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Molienda & Extrusión
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Control de rendimiento (Yield %), transformación de flakes a pellets y balance de materia prima
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Orden de Producción</span>
        </button>
      </div>

      {/* KPI Cards de Manufactura */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-sm font-medium text-slate-500 block mb-2">Rendimiento Medio Planta</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">95.8%</span>
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" /> +1.2% este mes
            </span>
          </div>
          <span className="text-xs text-slate-400 mt-2 block">Meta operativa industrial: &gt; 94.0%</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-sm font-medium text-slate-500 block mb-2">Pellet Fabricado Activo</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">33.2</span>
            <span className="text-sm font-semibold text-slate-500">Toneladas</span>
          </div>
          <span className="text-xs text-slate-400 mt-2 block">Filtrado en doble husillo a malla 80</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-sm font-medium text-slate-500 block mb-2">Mermas Reinyectadas (Scrap)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">1.5</span>
            <span className="text-sm font-semibold text-slate-500">Toneladas (4.2%)</span>
          </div>
          <span className="text-xs text-emerald-700 font-semibold mt-2 block">100% Cero residuo a vertedero</span>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por N° orden (ej: OP-2026), línea de producción o supervisor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:border-slate-400"
          />
        </div>
      </div>

      {/* Tarjetas de Órdenes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((op) => (
          <div 
            key={op.id}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      {op.order_number}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      op.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {op.status === 'completed' ? 'Completada' : 'En Ejecución'}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{op.line_name}</h3>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 block font-medium">Rendimiento</span>
                  <span className="text-xl font-extrabold text-emerald-700 font-mono">{op.yield_percentage}%</span>
                </div>
              </div>

              {/* Flujo de Materiales Entrada -> Salida */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 mb-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block">Materia Prima Consumida:</span>
                    <span className="font-semibold text-slate-800">{op.input_material?.name || 'Insumo'}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">{op.input_weight_kg.toLocaleString('es-CL')} kg</span>
                </div>

                <div className="flex items-center justify-center text-slate-400">
                  <ArrowRight className="w-4 h-4" />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block">Pellet o Producto Obtenido:</span>
                    <span className="font-semibold text-emerald-700">{op.output_material?.name || 'Pellet'}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-700">{op.output_weight_kg.toLocaleString('es-CL')} kg</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Supervisor: <strong className="text-slate-800 font-semibold">{op.supervisor_name}</strong></span>
              <span>Merma de proceso: {op.scrap_weight_kg.toLocaleString('es-CL')} kg</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nueva Orden de Producción */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Iniciar Orden de Producción
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Cálculo y balance de masa en línea de molienda y extrusora
            </p>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">N° Orden</label>
                <input
                  type="text"
                  required
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Línea de Producción</label>
                <input
                  type="text"
                  required
                  value={lineName}
                  onChange={(e) => setLineName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Materia Prima (Flakes/Scrap)</label>
                <select
                  value={inputId}
                  onChange={(e) => setInputId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.current_stock.toLocaleString('es-CL')} {m.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pellet o Producto Resultante</label>
                <select
                  value={outputId}
                  onChange={(e) => setOutputId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kilos Entrada</label>
                  <input
                    type="number"
                    required
                    value={inputKg}
                    onChange={(e) => setInputKg(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kilos Pellet Obtenido</label>
                  <input
                    type="number"
                    required
                    value={outputKg}
                    onChange={(e) => setOutputKg(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-800 flex justify-between items-center font-semibold">
                <span>Rendimiento Estimado:</span>
                <span className="text-sm font-bold">{calculatedYield}%</span>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-600 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg"
                >
                  Confirmar Orden
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
