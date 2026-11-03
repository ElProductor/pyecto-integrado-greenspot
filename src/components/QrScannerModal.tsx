import React, { useState, useEffect } from 'react';
import { 
  Scan, 
  X, 
  CheckCircle2, 
  Layers, 
  Scale, 
  Building2, 
  ArrowRight, 
  Camera, 
  Volume2, 
  VolumeX, 
  RefreshCw 
} from 'lucide-react';
import { Batch, BatchStatus } from '../types';
import { useToast } from './Toast';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: Batch[];
  onUpdateBatchStatus: (id: string, status: BatchStatus) => Promise<void>;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  batches,
  onUpdateBatchStatus
}) => {
  const { success } = useToast();
  const [selectedBatchId, setSelectedBatchId] = useState<string>(batches[0]?.id || '');
  const [isScanning, setIsScanning] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scannedBatch, setScannedBatch] = useState<Batch | null>(null);

  // Play subtle electronic confirmation chime via Web Audio API
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.12); // E6 note
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // AudioContext not allowed or disabled
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsScanning(true);
      setScannedBatch(null);
      // Auto-trigger a scan discovery after 1.2s for interactive delight
      const timer = setTimeout(() => {
        handleTriggerScan(batches[0]?.id);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, batches]);

  if (!isOpen) return null;

  const handleTriggerScan = (batchIdToFind?: string) => {
    const id = batchIdToFind || selectedBatchId;
    const found = batches.find((b) => b.id === id) || batches[0];
    if (found) {
      playBeep();
      setScannedBatch(found);
      setIsScanning(false);
    }
  };

  const handleAdvanceStatus = async (nextStatus: BatchStatus) => {
    if (!scannedBatch) return;
    await onUpdateBatchStatus(scannedBatch.id, nextStatus);
    success('Lote actualizado en báscula/patio', `${scannedBatch.batch_number} avanzado a ${nextStatus}`);
    setScannedBatch({ ...scannedBatch, status: nextStatus });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-[#121316] rounded-2xl max-w-lg w-full border border-neutral-200/80 dark:border-neutral-800 shadow-elevated overflow-hidden animate-[fadeIn_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800/80">
          <div className="flex items-center gap-2">
            <Scan className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Lector QR de Báscula & Patio
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg text-xs"
              title={soundEnabled ? 'Silenciar confirmación' : 'Activar sonido'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport Simulation */}
        <div className="p-5 space-y-4">
          <div className="relative h-56 bg-neutral-950 rounded-xl overflow-hidden flex flex-col items-center justify-center border border-neutral-800">
            {/* Camera Viewfinder Reticle */}
            <div className="relative w-44 h-44 border-2 border-emerald-500/50 rounded-2xl flex items-center justify-center">
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />

              {/* Laser Scanning Line Animation */}
              {isScanning && (
                <div className="absolute left-2 right-2 h-0.5 bg-emerald-400 shadow-[0_0_8px_#10b981] animate-[bounce_2s_infinite]" />
              )}

              {scannedBatch ? (
                <div className="text-center p-2 bg-emerald-950/80 backdrop-blur-xs rounded-xl border border-emerald-500/40">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1" />
                  <span className="font-mono text-xs font-bold text-white block">
                    {scannedBatch.batch_number}
                  </span>
                  <span className="text-[10px] text-emerald-300">QR Verificado</span>
                </div>
              ) : (
                <div className="text-center text-[11px] text-neutral-400">
                  <Camera className="w-6 h-6 mx-auto mb-1 opacity-50 text-emerald-400" />
                  <span>Enfocando etiqueta QR...</span>
                </div>
              )}
            </div>

            <div className="absolute bottom-2 text-[10px] font-mono text-neutral-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>SENSOR ÓPTICO ACTIVO - PLANTA PUERTO MONTT</span>
            </div>
          </div>

          {/* Selector de Simulación Rápida de Lotes */}
          <div className="flex items-center gap-2">
            <select
              value={selectedBatchId}
              onChange={(e) => {
                setSelectedBatchId(e.target.value);
                setIsScanning(true);
                setTimeout(() => handleTriggerScan(e.target.value), 400);
              }}
              className="flex-1 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs text-neutral-800 dark:text-neutral-200"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  Simular QR: {b.batch_number} ({b.material?.name?.slice(0, 24)}...)
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setIsScanning(true);
                setTimeout(() => handleTriggerScan(), 500);
              }}
              className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg text-xs font-medium flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Re-escanear</span>
            </button>
          </div>

          {/* Batch Information Card */}
          {scannedBatch && (
            <div className="p-4 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-200/80 dark:border-neutral-800 space-y-3 text-xs">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-bold text-sm text-neutral-900 dark:text-neutral-100">
                    {scannedBatch.batch_number}
                  </span>
                  <div className="text-neutral-600 dark:text-neutral-400 font-medium">
                    {scannedBatch.material?.name}
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Estado: {scannedBatch.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-500">
                <div>
                  <span>Generador: </span>
                  <strong className="text-neutral-800 dark:text-neutral-200">{scannedBatch.supplier?.name}</strong>
                </div>
                <div>
                  <span>Peso Báscula: </span>
                  <strong className="text-neutral-800 dark:text-neutral-200">{scannedBatch.current_weight_kg.toLocaleString('es-CL')} kg</strong>
                </div>
                <div className="col-span-2">
                  <span>Origen Marino: </span>
                  <span className="text-neutral-700 dark:text-neutral-300">{scannedBatch.marine_origin_zone || 'Seno de Reloncaví'}</span>
                </div>
              </div>

              {/* Acciones Rápidas de Operador */}
              <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800/80 flex items-center justify-between">
                <span className="text-[11px] text-neutral-400">Acción en planta:</span>

                {scannedBatch.status === 'received' && (
                  <button
                    onClick={() => handleAdvanceStatus('washing_sorting')}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <span>Pasar a Lavado</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}

                {scannedBatch.status === 'washing_sorting' && (
                  <button
                    onClick={() => handleAdvanceStatus('shredded')}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <span>Pasar a Molienda</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}

                {scannedBatch.status === 'shredded' && (
                  <button
                    onClick={() => handleAdvanceStatus('pelletized')}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <span>Pasar a Peletizado</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}

                {scannedBatch.status === 'pelletized' && (
                  <button
                    onClick={() => handleAdvanceStatus('dispatched')}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <span>Despachar a Cliente</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}

                {scannedBatch.status === 'dispatched' && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Lote Despachado
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
