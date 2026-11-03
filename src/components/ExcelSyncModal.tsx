import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  FileCheck, 
  Layers, 
  ArrowRight,
  Database,
  RefreshCw,
  FileText
} from 'lucide-react';
import { 
  exportCompleteGreenspotWorkbook, 
  downloadExcelTemplate, 
  parseUploadedExcelFile, 
  ParsedExcelResult 
} from '../utils/excelManager';
import { MaterialProduct, Batch, InventoryMovement, ProductionOrder, ValorizationCertificate } from '../types';
import { useToast } from './Toast';

interface ExcelSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    materials: MaterialProduct[];
    batches: Batch[];
    movements: InventoryMovement[];
    productionOrders: ProductionOrder[];
    certificates: ValorizationCertificate[];
  };
  onImportMaterials?: (materials: any[]) => Promise<void>;
  onImportBatches?: (batches: any[]) => Promise<void>;
  onApplyStockAdjustments?: (adjustments: { code: string; newStock: number }[]) => Promise<void>;
}

export const ExcelSyncModal: React.FC<ExcelSyncModalProps> = ({
  isOpen,
  onClose,
  data,
  onImportMaterials,
  onImportBatches,
  onApplyStockAdjustments
}) => {
  const { success, error: toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'templates'>('export');
  const [isExporting, setIsExporting] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [parseResult, setParseResult] = useState<ParsedExcelResult | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const handleExportFullDatabase = () => {
    try {
      setIsExporting(true);
      exportCompleteGreenspotWorkbook(data);
      success(
        'Libro Excel Generado',
        `Se exportaron ${data.materials.length} materiales, ${data.batches.length} lotes y ${data.movements.length} movimientos a .xlsx`
      );
    } catch (err: any) {
      toastError('Error al exportar', err.message || 'No se pudo generar el Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    try {
      setIsProcessingFile(true);
      const res = await parseUploadedExcelFile(file);
      setParseResult(res);
      if (res.validRows.length > 0) {
        success('Archivo Excel analizado', `Se detectaron ${res.validRows.length} filas válidas`);
      } else {
        toastError('Planilla sin datos válidos', res.errors[0] || 'Revise las columnas');
      }
    } catch (err: any) {
      toastError('Error al leer Excel', err.message || 'El archivo está dañado');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.validRows.length === 0) return;

    try {
      setIsApplying(true);

      if (parseResult.type === 'inventory' && onImportMaterials) {
        await onImportMaterials(parseResult.validRows);
        success('Inventario Sincronizado', `${parseResult.validRows.length} materiales importados desde Excel`);
      } else if (parseResult.type === 'batches' && onImportBatches) {
        await onImportBatches(parseResult.validRows);
        success('Lotes Sincronizados', `${parseResult.validRows.length} lotes de báscula ingresados desde Excel`);
      } else if (parseResult.type === 'adjustments' && onApplyStockAdjustments) {
        const adjustments = parseResult.validRows.map(r => ({
          code: r.material_code,
          newStock: r.new_stock
        }));
        await onApplyStockAdjustments(adjustments);
        success('Ajustes Aplicados', `${adjustments.length} stocks actualizados desde Excel`);
      } else {
        success('Datos Cargados', `${parseResult.validRows.length} filas procesadas con éxito`);
      }

      setParseResult(null);
      onClose();
    } catch (err: any) {
      toastError('Error al guardar datos', err.message || 'Ocurrió un error al persistir');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Descansado y Minimalista */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900">
                  Sincronización Nativa con Excel (.xlsx)
                </h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                  MS Excel & Google Sheets
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Respalda o sincroniza toda la operación de Greenspot directamente con tus planillas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas Simplificadas */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'export'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>1. Descargar Todo a Excel</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'import'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>2. Cargar Planilla Excel</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'templates'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>3. Plantillas Oficiales</span>
          </button>
        </div>

        {/* Contenido de la Pestaña Activa */}
        <div className="p-6">
          {/* TAB 1: EXPORTACIÓN COMPLETA */}
          {activeTab === 'export' && (
            <div className="space-y-5">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-700" />
                  Descargar Base de Datos Completa en Excel
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Genera un libro oficial <strong>.xlsx</strong> con todas las tablas de Greenspot en hojas independientes, listo para auditar, compartir con jefaturas o manipular en tu equipo:
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-700 pt-1">
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Hoja 1: Catálogo y Stock ({data.materials.length} ítems)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Hoja 2: Lotes y Trazabilidad ({data.batches.length} lotes)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Hoja 3: Kardex de Movimientos ({data.movements.length} movs)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Hoja 4: Balance de Masa & Rendimiento</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 col-span-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Hoja 5: Certificados Ley REP Oficiales ({data.certificates.length} certs)</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cerrar
                </button>

                <button
                  onClick={handleExportFullDatabase}
                  disabled={isExporting}
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold flex items-center gap-2.5 shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? 'Generando Excel...' : 'Descargar Libro Completo (.xlsx)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORTACIÓN / SUBIDA */}
          {activeTab === 'import' && (
            <div className="space-y-5">
              <input 
                type="file" 
                ref={fileInputRef} 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileChange} 
                className="hidden" 
              />

              {!parseResult ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-slate-50 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-slate-600 group-hover:text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-2xs group-hover:scale-105 transition-transform">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-1">
                    Haz clic para seleccionar tu planilla Excel (.xlsx)
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                    Detecta automáticamente planillas de inventario, pesaje de lotes o ajustes de conteo físico
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Resumen del archivo analizado */}
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Planilla detectada: {
                          parseResult.type === 'inventory' ? 'Catálogo de Inventario' :
                          parseResult.type === 'batches' ? 'Pesaje y Lotes de Camión' :
                          parseResult.type === 'adjustments' ? 'Ajustes Físicos de Stock' : 'Datos Genéricos'
                        }</span>
                      </div>
                      <p className="text-xs text-emerald-800">
                        Se encontraron <strong>{parseResult.validRows.length} filas listas para importar</strong>.
                      </p>
                    </div>

                    <button
                      onClick={() => setParseResult(null)}
                      className="text-xs font-semibold text-emerald-900 hover:underline"
                    >
                      Cambiar archivo
                    </button>
                  </div>

                  {/* Vista Previa de Filas */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold sticky top-0">
                        <tr>
                          {Object.keys(parseResult.validRows[0] || {}).slice(0, 4).map((k) => (
                            <th key={k} className="p-2.5 capitalize">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {parseResult.validRows.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            {Object.values(row).slice(0, 4).map((val: any, vIdx) => (
                              <td key={vIdx} className="p-2.5 truncate max-w-[140px] text-slate-800">
                                {String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setParseResult(null)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      disabled={isApplying}
                      onClick={handleConfirmImport}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-xs transition-colors"
                    >
                      {isApplying ? 'Importando...' : 'Confirmar e Integrar a la Base de Datos'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PLANTILLAS OFICIALES */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Descarga las plantillas estándar en Excel con las columnas exactas que la plataforma interpreta automáticamente:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <h5 className="font-bold text-sm text-slate-900 mb-1">1. Inventario & Catálogo</h5>
                    <p className="text-xs text-slate-500 mb-3">
                      Código, nombre, polímero, categoría, stocks y factores CO2.
                    </p>
                  </div>
                  <button
                    onClick={() => downloadExcelTemplate('inventory')}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar .xlsx</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <h5 className="font-bold text-sm text-slate-900 mb-1">2. Pesaje & Lotes</h5>
                    <p className="text-xs text-slate-500 mb-3">
                      Patente, chofer, pesos bruto y tara, origen marino y empresa.
                    </p>
                  </div>
                  <button
                    onClick={() => downloadExcelTemplate('batches')}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar .xlsx</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <h5 className="font-bold text-sm text-slate-900 mb-1">3. Conteo Físico Silos</h5>
                    <p className="text-xs text-slate-500 mb-3">
                      Actualización masiva de inventario real post toma física.
                    </p>
                  </div>
                  <button
                    onClick={() => downloadExcelTemplate('adjustments')}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar .xlsx</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
