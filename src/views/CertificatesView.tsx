import React, { useState } from 'react';
import { 
  Plus, 
  Download, 
  Search, 
  FileCheck2, 
  Calendar, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { ValorizationCertificate, Stakeholder, Batch } from '../types';
import { generateCertificatePdf } from '../utils/pdfGenerator';
import { useToast } from '../components/Toast';

interface CertificatesViewProps {
  certificates: ValorizationCertificate[];
  stakeholders: Stakeholder[];
  batches: Batch[];
  onSaveCertificate: (cert: Omit<ValorizationCertificate, 'id' | 'created_at'>) => Promise<void>;
  isNewCertModalOpen: boolean;
  setIsNewCertModalOpen: (open: boolean) => void;
}

export const CertificatesView: React.FC<CertificatesViewProps> = ({
  certificates,
  stakeholders,
  batches,
  onSaveCertificate,
  isNewCertModalOpen,
  setIsNewCertModalOpen
}) => {
  const { success } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Form State
  const [formCode, setFormCode] = useState(`CERT-REP-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [formStakeholderId, setFormStakeholderId] = useState(stakeholders[0]?.id || '');
  const [formBatchId, setFormBatchId] = useState(batches[0]?.id || '');
  const [formWasteType, setFormWasteType] = useState('Boyas y Flotadores Marinos HDPE en Desuso');
  const [formKg, setFormKg] = useState(14500);
  const [formDestination, setFormDestination] = useState('Pellet Reciclado Greenspot HDPE Inyección Negro');

  const handleDownloadPdf = async (cert: ValorizationCertificate) => {
    try {
      setDownloadingId(cert.id);
      await generateCertificatePdf(cert);
      success('Certificado PDF descargado', `Archivo ${cert.certificate_code} guardado`);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const kg = Number(formKg);
    const co2 = kg * 1.85;
    const water = kg * 5.0;
    const oil = kg * 0.002;

    await onSaveCertificate({
      certificate_code: formCode,
      stakeholder_id: formStakeholderId,
      batch_id: formBatchId || null,
      issue_date: new Date().toISOString().slice(0, 10),
      waste_type: formWasteType,
      total_kg_valorized: kg,
      co2_avoided_kg: Math.round(co2),
      water_saved_liters: Math.round(water),
      oil_saved_barrels: Number(oil.toFixed(2)),
      final_destination_product: formDestination,
      signer_name: 'Benjamín González - Dirección General Greenspot',
      signer_title: 'Greenspot / Red Resiter Economía Circular',
      qr_verification_code: `GREENSPOT-VERIFY-REP-${Date.now().toString().slice(-6)}`
    });

    setIsNewCertModalOpen(false);
    setFormCode(`CERT-REP-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const filtered = certificates.filter((c) =>
    c.certificate_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.stakeholder?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.waste_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Certificados Oficiales de Disposición Final
            </h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Ley REP 20.920
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Acreditación de reciclaje de pasivos acuícolas para declaraciones ante la SMA
          </p>
        </div>

        <button
          onClick={() => setIsNewCertModalOpen(true)}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Emitir Certificado REP</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código de certificado, empresa salmonera..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden"
          />
        </div>
      </div>

      {/* Grid de Certificados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((cert) => {
          const isDownloading = downloadingId === cert.id;

          return (
            <div 
              key={cert.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg">
                      {cert.certificate_code}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-base mt-2">
                      {cert.stakeholder?.name}
                    </h3>
                    <div className="text-xs text-slate-400 font-mono">
                      RUT: {cert.stakeholder?.tax_id}
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Válido REP
                  </span>
                </div>

                <div className="text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 space-y-1.5">
                  <div>
                    <span className="text-slate-400">Residuo: </span>
                    <strong className="text-slate-800">{cert.waste_type}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Destino Final: </span>
                    <span className="font-semibold text-emerald-800">{cert.final_destination_product}</span>
                  </div>
                </div>

                {/* 3 Métricas Claras */}
                <div className="grid grid-cols-3 gap-3 text-center mb-4">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-base font-extrabold text-slate-900 font-mono block">
                      {(cert.total_kg_valorized / 1000).toFixed(1)} t
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Recicladas</span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-base font-extrabold text-emerald-700 font-mono block">
                      {(cert.co2_avoided_kg / 1000).toFixed(1)} t
                    </span>
                    <span className="text-xs text-slate-500 font-medium">CO2eq Evit.</span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-base font-extrabold text-sky-700 font-mono block">
                      {(cert.water_saved_liters / 1000).toFixed(0)} m³
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Agua Preserv.</span>
                  </div>
                </div>
              </div>

              {/* Botón Descargar PDF */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Emitido: {cert.issue_date}
                </span>

                <button
                  onClick={() => handleDownloadPdf(cert)}
                  disabled={isDownloading}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloading ? 'Generando PDF...' : 'Descargar Certificado Oficial PDF'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Emitir Certificado */}
      {isNewCertModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 my-8">
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              Emitir Certificado Ley REP
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Acreditación oficial conforme a la Ley N° 20.920
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Código Oficial</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Empresa Generadora</label>
                  <select
                    value={formStakeholderId}
                    onChange={(e) => setFormStakeholderId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    {stakeholders.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Residuo Plástico</label>
                <input
                  type="text"
                  required
                  value={formWasteType}
                  onChange={(e) => setFormWasteType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kilos Netos Valorizados</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formKg}
                    onChange={(e) => setFormKg(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CO2eq Evitado Estimado</label>
                  <input
                    type="text"
                    disabled
                    value={`${Math.round(formKg * 1.85).toLocaleString('es-CL')} kg CO2eq`}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Destino Final de Transformación</label>
                <input
                  type="text"
                  required
                  value={formDestination}
                  onChange={(e) => setFormDestination(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewCertModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl"
                >
                  Emitir Certificado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
