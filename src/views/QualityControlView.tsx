import React, { useState } from 'react';
import { 
  FlaskConical, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Scale, 
  Calendar,
  Layers,
  Sparkles,
  Award
} from 'lucide-react';
import { QualityControlTest, Batch } from '../types';
import { useToast } from '../components/Toast';

interface QualityControlViewProps {
  tests: QualityControlTest[];
  batches: Batch[];
  onSaveTest: (test: Omit<QualityControlTest, 'id' | 'created_at'>) => Promise<void>;
  isNewModalOpen: boolean;
  setIsNewModalOpen: (open: boolean) => void;
}

export const QualityControlView: React.FC<QualityControlViewProps> = ({
  tests,
  batches,
  onSaveTest,
  isNewModalOpen,
  setIsNewModalOpen
}) => {
  const { success } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTest, setSelectedTest] = useState<QualityControlTest | null>(null);

  // Form State
  const [testNumber, setTestNumber] = useState(`QC-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [batchId, setBatchId] = useState(batches[0]?.id || '');
  const [testerName, setTesterName] = useState('Ing. Loreto Oyarzún (Jefa de Calidad)');
  const [mfi, setMfi] = useState(0.85);
  const [density, setDensity] = useState(0.954);
  const [moisture, setMoisture] = useState(0.06);
  const [ash, setAsh] = useState(0.12);
  const [tensile, setTensile] = useState(26.0);
  const [status, setStatus] = useState<'approved' | 'rejected' | 'conditional'>('approved');
  const [notes, setNotes] = useState('Cumple con especificaciones de inyección industrial.');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveTest({
      test_number: testNumber,
      batch_id: batchId,
      tester_name: testerName,
      test_date: new Date().toISOString(),
      mfi_measured: Number(mfi),
      density_measured: Number(density),
      moisture_percentage: Number(moisture),
      ash_content_percentage: Number(ash),
      tensile_strength_mpa: Number(tensile),
      status,
      notes
    });

    success('Ensayo de laboratorio registrado', `Ensayo ${testNumber} guardado y evaluado`);
    setIsNewModalOpen(false);
    setTestNumber(`QC-2026-${Math.floor(100 + Math.random() * 900)}`);
  };

  const filtered = tests.filter(
    (t) =>
      t.test_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tester_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.batch?.batch_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Control de Calidad & Laboratorio de Polímeros
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Certificación COA
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Medición de MFI (Índice de Fluidez), humedad residual, densidad y pureza para garantizar pellets de calidad virgen
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Ensayo de Calidad</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Tasa de Aprobación Lotes</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">98.5%</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Alta Pureza
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Filtrado continuo en malla 80</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">MFI Promedio (HDPE Inyección)</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">0.83</span>
            <span className="text-xs font-semibold text-slate-500">g/10 min (190°C)</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Rango óptimo para inyección de cajones</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Humedad Residual</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">&lt; 0.08%</span>
            <span className="text-xs font-semibold text-emerald-600 font-bold">Secado Óptimo</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Evita burbujas en termoformado</span>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por N° ensayo, evaluador, lote de pellet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-1 focus:ring-slate-400"
          />
        </div>
      </div>

      {/* Grid de Ensayos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((test) => (
          <div 
            key={test.id}
            className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {test.test_number}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      test.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : test.status === 'conditional'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {test.status === 'approved' && 'Aprobado para Venta'}
                      {test.status === 'conditional' && 'Observado'}
                      {test.status === 'rejected' && 'Rechazado a Molienda'}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Lote Evaluado: {test.batch?.batch_number || 'Lote de Planta'}
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedTest(test)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg"
                >
                  Ver COA
                </button>
              </div>

              {/* Medidas Técnicas de Laboratorio */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">MFI Fluidez:</span>
                  <span className="font-bold text-slate-800">{test.mfi_measured} g/10min</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Densidad:</span>
                  <span className="font-bold text-slate-800">{test.density_measured} g/cm³</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Humedad:</span>
                  <span className="font-bold text-slate-800">{test.moisture_percentage}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Cenizas:</span>
                  <span className="font-bold text-slate-800">{test.ash_content_percentage}%</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 block font-medium">Tracción / Ruptura:</span>
                  <span className="font-bold text-emerald-700">{test.tensile_strength_mpa} MPa</span>
                </div>
              </div>

              {test.notes && (
                <p className="text-xs text-slate-500 italic mb-2">
                  "{test.notes}"
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Laboratorista: <strong className="text-slate-700">{test.tester_name}</strong></span>
              <span>{new Date(test.test_date).toLocaleDateString('es-CL')}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Ficha COA */}
      {selectedTest && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Certificado de Análisis (COA)
                </span>
                <h3 className="text-base font-bold text-slate-900">{selectedTest.test_number}</h3>
              </div>
              <button 
                onClick={() => setSelectedTest(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Lote Asociado:</span>
                  <span className="font-bold text-slate-800">{selectedTest.batch?.batch_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Norma Aplicada:</span>
                  <span className="font-bold text-slate-800">ASTM D1238 / ISO 1133</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Resultado Global:</span>
                  <span className="font-bold text-emerald-700 uppercase">{selectedTest.status}</span>
                </div>
              </div>

              <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-[10px] text-slate-600 uppercase font-bold">
                  <tr>
                    <th className="p-2">Parámetro</th>
                    <th className="p-2 text-right">Valor Medido</th>
                    <th className="p-2 text-right">Tolerancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  <tr>
                    <td className="p-2 font-medium">Índice Fluidez (MFI)</td>
                    <td className="p-2 text-right font-bold">{selectedTest.mfi_measured} g/10min</td>
                    <td className="p-2 text-right text-slate-400">0.7 - 1.0</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Densidad</td>
                    <td className="p-2 text-right font-bold">{selectedTest.density_measured} g/cm³</td>
                    <td className="p-2 text-right text-slate-400">0.95 - 0.96</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Humedad Residual</td>
                    <td className="p-2 text-right font-bold">{selectedTest.moisture_percentage}%</td>
                    <td className="p-2 text-right text-slate-400">&lt; 0.10%</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Resistencia Tracción</td>
                    <td className="p-2 text-right font-bold">{selectedTest.tensile_strength_mpa} MPa</td>
                    <td className="p-2 text-right text-slate-400">&gt; 22.0</td>
                  </tr>
                </tbody>
              </table>

              <div className="pt-2 text-[11px] text-slate-500">
                Aprobado por: <strong>{selectedTest.tester_name}</strong> - Planta Puerto Montt.
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedTest(null)}
                className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg text-xs"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Ensayo */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Nuevo Ensayo de Laboratorio
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Ingreso de parámetros físicos y mecánicos de pellets
            </p>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">N° Ensayo</label>
                  <input
                    type="text"
                    required
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lote a Evaluar</label>
                  <select
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>{b.batch_number}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Evaluador / Laboratorista</label>
                <input
                  type="text"
                  required
                  value={testerName}
                  onChange={(e) => setTesterName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">MFI (g/10min)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={mfi}
                    onChange={(e) => setMfi(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Densidad (g/cm³)</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={density}
                    onChange={(e) => setDensity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Humedad (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={moisture}
                    onChange={(e) => setMoisture(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Resistencia Tracción (MPa)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tensile}
                    onChange={(e) => setTensile(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dictamen Calidad</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold"
                  >
                    <option value="approved">Aprobado para Venta</option>
                    <option value="conditional">Condicional / Observado</option>
                    <option value="rejected">Rechazado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
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
                  Guardar Ensayo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
