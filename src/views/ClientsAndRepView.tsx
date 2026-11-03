import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  FileCheck2, 
  Download, 
  Calendar, 
  ShieldCheck, 
  Edit3, 
  X,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Stakeholder, ValorizationCertificate, Batch, RepTargetCompliance } from '../types';
import { generateCertificatePdf } from '../utils/pdfGenerator';
import { useToast } from '../components/Toast';

interface ClientsAndRepViewProps {
  stakeholders: Stakeholder[];
  certificates: ValorizationCertificate[];
  batches: Batch[];
  repTargets: RepTargetCompliance[];
  onSaveStakeholder: (stakeholder: Omit<Stakeholder, 'id' | 'created_at'>) => Promise<void>;
  onUpdateStakeholder?: (id: string, updates: Partial<Stakeholder>) => Promise<void>;
  onSaveCertificate: (cert: Omit<ValorizationCertificate, 'id' | 'created_at'>) => Promise<void>;
}

export const ClientsAndRepView: React.FC<ClientsAndRepViewProps> = ({
  stakeholders,
  certificates,
  batches,
  repTargets,
  onSaveStakeholder,
  onUpdateStakeholder,
  onSaveCertificate
}) => {
  const { success } = useToast();
  const [activeTab, setActiveTab] = useState<'clients' | 'certificates'>('clients');
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Modal Nuevo Cliente / Salmonera
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+56 9 ');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Puerto Montt');
  const [sector, setSector] = useState('Acuicultura (Salmonicultura)');
  const [notes, setNotes] = useState('');

  // Modal Editar Cliente / Salmonera
  const [editingClient, setEditingClient] = useState<Stakeholder | null>(null);
  const [editName, setEditName] = useState('');
  const [editTaxId, setEditTaxId] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editSector, setEditSector] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Modal Emitir Certificado REP
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [certCode, setCertCode] = useState(`CERT-REP-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [certStakeholderId, setCertStakeholderId] = useState(stakeholders[0]?.id || '');
  const [certBatchId, setCertBatchId] = useState(batches[0]?.id || '');
  const [certWasteType, setCertWasteType] = useState('Boyas y Flotadores Marinos HDPE en Desuso');
  const [certKg, setCertKg] = useState(14500);
  const [certDestination, setCertDestination] = useState('Pellet Reciclado Greenspot HDPE Inyección Negro');

  const handleOpenEditClient = (s: Stakeholder) => {
    setEditingClient(s);
    setEditName(s.name);
    setEditTaxId(s.tax_id);
    setEditEmail(s.contact_email || '');
    setEditPhone(s.contact_phone || '');
    setEditAddress(s.address || '');
    setEditCity(s.city || 'Puerto Montt');
    setEditSector(s.industry_sector || 'Acuicultura');
    setEditNotes(s.notes || '');
  };

  const handleSaveEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !onUpdateStakeholder) return;

    await onUpdateStakeholder(editingClient.id, {
      name: editName,
      tax_id: editTaxId,
      contact_email: editEmail,
      contact_phone: editPhone,
      address: editAddress,
      city: editCity,
      industry_sector: editSector,
      notes: editNotes
    });

    success('Empresa actualizada', `${editName} ha sido modificada`);
    setEditingClient(null);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveStakeholder({
      name,
      type: 'generator_supplier',
      tax_id: taxId,
      contact_email: email,
      contact_phone: phone,
      address,
      city,
      industry_sector: sector,
      notes
    });

    setIsClientModalOpen(false);
    setName('');
    setTaxId('');
    setEmail('');
    setNotes('');
  };

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

  const handleCreateCert = async (e: React.FormEvent) => {
    e.preventDefault();
    const kg = Number(certKg);
    const co2 = kg * 1.85;
    const water = kg * 5.0;
    const oil = kg * 0.002;

    await onSaveCertificate({
      certificate_code: certCode,
      stakeholder_id: certStakeholderId,
      batch_id: certBatchId || null,
      issue_date: new Date().toISOString().slice(0, 10),
      waste_type: certWasteType,
      total_kg_valorized: kg,
      co2_avoided_kg: Math.round(co2),
      water_saved_liters: Math.round(water),
      oil_saved_barrels: Number(oil.toFixed(2)),
      final_destination_product: certDestination,
      signer_name: 'Benjamín González - Dirección General Greenspot',
      signer_title: 'Greenspot / Red Resiter Economía Circular',
      qr_verification_code: `GREENSPOT-VERIFY-REP-${Date.now().toString().slice(-6)}`
    });

    setIsCertModalOpen(false);
    setCertCode(`CERT-REP-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const filteredStakeholders = stakeholders.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.tax_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.industry_sector.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCerts = certificates.filter(c =>
    c.certificate_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.stakeholder?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.waste_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Unificado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-300">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Clientes, Salmoneras & Ley REP
          </h1>
          <p className="text-sm text-slate-700 font-medium mt-1">
            Empresas generadoras, compradores de pellet y emisión de certificados oficiales
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'clients' ? (
            <button
              onClick={() => setIsClientModalOpen(true)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Empresa</span>
            </button>
          ) : (
            <button
              onClick={() => setIsCertModalOpen(true)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Emitir Certificado REP</span>
            </button>
          )}
        </div>
      </div>

      {/* Pestañas de Unificación */}
      <div className="flex border-b border-slate-300 gap-3">
        <button
          onClick={() => setActiveTab('clients')}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'clients'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>1. Empresas Salmoneras & Clientes ({stakeholders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('certificates')}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'certificates'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>2. Certificados Oficiales Ley REP ({certificates.length})</span>
        </button>
      </div>

      {/* Buscador Común */}
      <div className="bg-white rounded-xl p-4 border border-slate-300 shadow-sm">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder={activeTab === 'clients' ? "Buscar por razón social, RUT chileno o sector..." : "Buscar por código de certificado o empresa..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:bg-white focus:outline-hidden"
          />
        </div>
      </div>

      {/* PESTAÑA 1: CLIENTES & SALMONERAS (EDITABLE) */}
      {activeTab === 'clients' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStakeholders.map((s) => {
            const target = repTargets.find(t => t.stakeholder_id === s.id);
            const compliancePct = target ? target.compliance_percentage : 92;

            return (
              <div 
                key={s.id}
                className="bg-white rounded-xl border border-slate-300 p-5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-600">RUT: {s.tax_id}</span>
                      <h3 className="font-bold text-slate-900 text-base mt-0.5">{s.name}</h3>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                      Regulada REP
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-700 font-medium mb-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>{s.contact_email || 'contacto@empresa.cl'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{s.contact_phone || '+56 65 220 0000'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{s.city || 'Puerto Montt'} • {s.industry_sector}</span>
                    </div>
                  </div>

                  {/* Avance Ley REP */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-3">
                    <div className="flex justify-between font-bold mb-1">
                      <span className="text-slate-600">Meta Anual REP:</span>
                      <span className="text-emerald-800">{compliancePct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-emerald-700 h-2 rounded-full" style={{ width: `${Math.min(100, compliancePct)}%` }} />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Cliente Activo</span>
                  <button
                    onClick={() => handleOpenEditClient(s)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar Datos</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PESTAÑA 2: CERTIFICADOS OFICIALES LEY REP */}
      {activeTab === 'certificates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredCerts.map((cert) => {
            const isDownloading = downloadingId === cert.id;

            return (
              <div 
                key={cert.id}
                className="bg-white rounded-xl border border-slate-300 p-6 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-200 border border-slate-300 px-2 py-0.5 rounded">
                        {cert.certificate_code}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base mt-2">
                        {cert.stakeholder?.name}
                      </h3>
                      <div className="text-xs text-slate-600 font-mono font-medium">
                        RUT: {cert.stakeholder?.tax_id}
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Válido SMA
                    </span>
                  </div>

                  <div className="text-xs text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-4 space-y-1 font-medium">
                    <div>Residuo: <strong>{cert.waste_type}</strong></div>
                    <div>Destino Final: <span className="font-bold text-emerald-800">{cert.final_destination_product}</span></div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 text-center mb-4">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-300">
                      <span className="text-sm font-extrabold text-slate-900 font-mono block">
                        {(cert.total_kg_valorized / 1000).toFixed(1)} t
                      </span>
                      <span className="text-xs text-slate-600 font-medium">Recicladas</span>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-slate-300">
                      <span className="text-sm font-extrabold text-emerald-800 font-mono block">
                        {(cert.co2_avoided_kg / 1000).toFixed(1)} t
                      </span>
                      <span className="text-xs text-slate-600 font-medium">CO2eq Evit.</span>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-slate-300">
                      <span className="text-sm font-extrabold text-sky-800 font-mono block">
                        {(cert.water_saved_liters / 1000).toFixed(0)} m³
                      </span>
                      <span className="text-xs text-slate-600 font-medium">Agua Pres.</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Emitido: {cert.issue_date}
                  </span>

                  <button
                    onClick={() => handleDownloadPdf(cert)}
                    disabled={isDownloading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isDownloading ? 'Generando PDF...' : 'Descargar PDF Oficial'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Editar Empresa / Cliente */}
      {editingClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-300 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Editar Datos de la Empresa
              </h2>
              <button onClick={() => setEditingClient(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditClient} className="space-y-3.5 text-xs font-medium">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Razón Social</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">RUT Chileno</label>
                <input
                  type="text"
                  required
                  value={editTaxId}
                  onChange={(e) => setEditTaxId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-sm font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Correo Contacto</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ciudad</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sector Productivo</label>
                  <input
                    type="text"
                    value={editSector}
                    onChange={(e) => setEditSector(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notas / Convenios</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Nueva Empresa */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-300 my-8">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Registrar Empresa Salmonera o Cliente
            </h2>
            <p className="text-xs text-slate-600 font-medium mb-4">
              Incorporación a la red de trazabilidad y Ley REP de Greenspot
            </p>

            <form onSubmit={handleCreateClient} className="space-y-3.5 text-xs font-medium">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Razón Social</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej: Salmones Camanchaca S.A."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">RUT Chileno</label>
                <input
                  type="text"
                  required
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="ej: 76.456.789-0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="medioambiente@empresa.cl"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sector Productivo</label>
                <input
                  type="text"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow"
                >
                  Registrar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Emitir Certificado Ley REP */}
      {isCertModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-300 my-8">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Emitir Certificado Oficial Ley REP 20.920
            </h2>
            <p className="text-xs text-slate-600 font-medium mb-4">
              Documento con firma autorizada para declaraciones ante la SMA
            </p>

            <form onSubmit={handleCreateCert} className="space-y-3.5 text-xs font-medium">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Código Certificado</label>
                  <input
                    type="text"
                    required
                    value={certCode}
                    onChange={(e) => setCertCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Empresa Salmonera</label>
                  <select
                    value={certStakeholderId}
                    onChange={(e) => setCertStakeholderId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold"
                  >
                    {stakeholders.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Pasivo Plástico Valorizado</label>
                <input
                  type="text"
                  required
                  value={certWasteType}
                  onChange={(e) => setCertWasteType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kilos Netos Valorizados</label>
                  <input
                    type="number"
                    required
                    value={certKg}
                    onChange={(e) => setCertKg(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Destino Final del Pellet</label>
                  <input
                    type="text"
                    value={certDestination}
                    onChange={(e) => setCertDestination(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCertModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow"
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
