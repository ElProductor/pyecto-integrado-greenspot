import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, TabType } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { InventoryView } from './views/InventoryView';
import { BatchesView } from './views/BatchesView';
import { ClientsView } from './views/ClientsView';
import { CertificatesView } from './views/CertificatesView';
import { MovementsView } from './views/MovementsView';
import { SupabaseSettingsView } from './views/SupabaseSettingsView';
import { CommandPalette } from './components/CommandPalette';
import { WeighingModal } from './components/WeighingModal';
import { ExcelSyncModal } from './components/ExcelSyncModal';
import { ToastProvider, useToast } from './components/Toast';
import { IAMProvider, useIAM } from './context/IAMContext';
import { RoleSwitcherModal } from './components/RoleSwitcherModal';
import { apiService } from './services/api';
import { 
  MaterialProduct, 
  Batch, 
  InventoryMovement, 
  Warehouse, 
  Stakeholder, 
  ValorizationCertificate, 
  ProductionOrder,
  RepTargetCompliance,
  KpiMetrics,
  BatchStatus
} from './types';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { success, error: toastError } = useToast();
  const { role, permissions, isOperator } = useIAM();
  // Un solo panel principal unificado sin redundancias
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);

  // Protección de rutas según permisos IAM (Operario solo puede ver Panel, Inventario y Lotes)
  useEffect(() => {
    if (isOperator && (currentTab === 'clients' || currentTab === 'certificates' || currentTab === 'supabase')) {
      setCurrentTab('dashboard');
    }
  }, [isOperator, currentTab]);

  // Estados principales
  const [materials, setMaterials] = useState<MaterialProduct[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [certificates, setCertificates] = useState<ValorizationCertificate[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [repTargets, setRepTargets] = useState<RepTargetCompliance[]>([]);
  const [metrics, setMetrics] = useState<KpiMetrics | null>(null);

  // Modales prácticos industriales
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isWeighingModalOpen, setIsWeighingModalOpen] = useState(false);
  const [isExcelSyncModalOpen, setIsExcelSyncModalOpen] = useState(false);
  const [isNewMovementModalOpen, setIsNewMovementModalOpen] = useState(false);
  const [isNewBatchModalOpen, setIsNewBatchModalOpen] = useState(false);
  const [isNewCertModalOpen, setIsNewCertModalOpen] = useState(false);
  const [filterCriticalInInventory, setFilterCriticalInInventory] = useState(false);

  // Carga inicial
  const loadData = async () => {
    try {
      setLoading(true);
      const [mats, bats, movs, whs, stks, certs, prod, rep, kpi] = await Promise.all([
        apiService.getMaterials(),
        apiService.getBatches(),
        apiService.getMovements(),
        apiService.getWarehouses(),
        apiService.getStakeholders(),
        apiService.getCertificates(),
        apiService.getProductionOrders(),
        apiService.getRepTargets(),
        apiService.getKpiMetrics()
      ]);

      setMaterials(mats);
      setBatches(bats);
      setMovements(movs);
      setWarehouses(whs);
      setStakeholders(stks);
      setCertificates(certs);
      setProductionOrders(prod);
      setRepTargets(rep);
      setMetrics(kpi);
    } catch (err) {
      console.error('Error cargando datos de Greenspot:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Ctrl/Cmd+K abre y cierra la paleta de comandos
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Handlers: si falla, avisa y relanza para que el formulario quede abierto con sus datos
  const run = async (action: () => Promise<unknown>, title: string, detail?: string) => {
    try {
      await action();
      success(title, detail);
    } catch (err: any) {
      toastError('No se pudo guardar', err?.message || String(err));
      throw err;
    } finally {
      await loadData();
    }
  };

  const handleSaveMaterial = (newMat: Omit<MaterialProduct, 'id' | 'created_at' | 'updated_at'>) =>
    run(() => apiService.createMaterial(newMat), 'Material registrado con éxito', `${newMat.name} agregado al catálogo`);

  // El ajuste físico queda en el kardex como entrada o merma, no como sobrescritura del stock
  const handleUpdateStock = (id: string, newStock: number) => {
    const mat = materials.find(m => m.id === id);
    const delta = mat ? newStock - mat.current_stock : 0;
    if (!mat || delta === 0) return Promise.resolve();
    return run(() => apiService.recordMovement({
      movement_number: `AJU-${Date.now()}`,
      movement_type: delta > 0 ? 'reception' : 'waste_adjustment',
      material_id: id,
      batch_id: null,
      from_warehouse_id: null,
      to_warehouse_id: null,
      quantity: Math.abs(delta),
      unit: mat.unit,
      operator_name: role === 'operator' ? 'Operario de planta' : 'Administrador',
      reference_doc: 'Ajuste por conteo físico',
      created_at: new Date().toISOString()
    }), 'Inventario actualizado', 'Ajuste registrado en el kardex');
  };

  const handleSaveBatch = (newBatch: Omit<Batch, 'id' | 'created_at' | 'updated_at'>) =>
    run(() => apiService.createBatch(newBatch), 'Lote recepcionado', `Lote ${newBatch.batch_number} ingresado con pesaje`);

  const handleUpdateBatchStatus = (id: string, status: BatchStatus) =>
    run(() => apiService.updateBatchStatus(id, status), 'Estado de lote actualizado', `Avanzado a: ${status}`);

  const handleRecordMovement = (newMov: Omit<InventoryMovement, 'id'>) =>
    run(async () => {
      const mat = materials.find(m => m.id === newMov.material_id);
      const sale = ['dispatch', 'production_intake', 'waste_adjustment', 'internal_transfer'].includes(newMov.movement_type);
      if (sale && mat && newMov.quantity > mat.current_stock) {
        throw new Error(`Stock insuficiente: hay ${mat.current_stock.toLocaleString('es-CL')} ${mat.unit} de ${mat.name}`);
      }
      return apiService.recordMovement(newMov);
    },'Movimiento registrado en Kardex', `${newMov.movement_number} - Balance actualizado`);

  const handleSaveStakeholder = (newStk: Omit<Stakeholder, 'id' | 'created_at'>) =>
    run(() => apiService.createStakeholder(newStk), 'Empresa registrada', `${newStk.name} incorporada a la red de trazabilidad`);

  const handleSaveCertificate = (newCert: Omit<ValorizationCertificate, 'id' | 'created_at'>) =>
    run(() => apiService.createCertificate(newCert), 'Certificado REP emitido', `${newCert.certificate_code} acreditado`);

  const handleUpdateMaterial = (id: string, updates: Partial<MaterialProduct>) =>
    run(() => apiService.updateMaterial(id, updates), 'Material actualizado', 'Ficha técnica y parámetros guardados');

  const handleUpdateBatch = (id: string, updates: Partial<Batch>) =>
    run(() => apiService.updateBatch(id, updates), 'Lote actualizado', 'Pesaje y datos de transporte modificados');

  const handleUpdateStakeholder = (id: string, updates: Partial<Stakeholder>) =>
    run(() => apiService.updateStakeholder(id, updates), 'Empresa actualizada', 'Datos del cliente/proveedor guardados');

  const handleDeleteStakeholder = (id: string) =>
    run(() => apiService.deleteStakeholder(id), 'Empresa eliminada', 'El cliente fue removido de la base de datos');

  const handleDeleteBatch = (id: string) =>
    run(() => apiService.deleteBatch(id), 'Lote eliminado', 'El lote fue removido de trazabilidad');

  const handleDeleteMaterial = (id: string) =>
    run(() => apiService.deleteMaterial(id), 'Material eliminado', 'El producto fue removido del inventario');

  // Handlers para Importación Masiva desde Excel Nativo (.xlsx)
  const handleImportMaterials = async (importedMaterials: any[]) => {
    for (const mat of importedMaterials) {
      // Si el material ya existe por código, actualizamos su stock, si no lo creamos
      const existing = materials.find(m => m.code.toUpperCase() === mat.code.toUpperCase());
      if (existing) {
        await apiService.updateMaterial(existing.id, {
          current_stock: mat.current_stock,
          unit_cost_usd: mat.unit_cost_usd,
          unit_price_usd: mat.unit_price_usd
        });
      } else {
        await apiService.createMaterial(mat);
      }
    }
    await loadData();
  };

  const handleImportBatches = async (importedBatches: any[]) => {
    for (const b of importedBatches) {
      // Buscar material y proveedor por nombre o código
      const matchedMat = materials.find(m => 
        m.code.toLowerCase() === b.material_identifier.toLowerCase() ||
        m.name.toLowerCase().includes(b.material_identifier.toLowerCase())
      ) || materials[0];

      const matchedStk = stakeholders.find(s => 
        s.tax_id.replace(/\./g, '').replace(/-/g, '') === b.supplier_tax_id.replace(/\./g, '').replace(/-/g, '')
      ) || stakeholders[0];

      await apiService.createBatch({
        batch_number: b.batch_number,
        material_id: matchedMat ? matchedMat.id : materials[0].id,
        supplier_id: matchedStk ? matchedStk.id : undefined,
        warehouse_id: warehouses[0]?.id || undefined,
        initial_weight_kg: Number(b.net_weight),
        current_weight_kg: Number(b.net_weight),
        impurity_percentage: Number(b.impurity_percentage || 2.0),
        reception_date: new Date().toISOString(),
        status: 'received',
        marine_origin_zone: b.marine_origin_zone || 'Centro Acuícola Patagonia',
        notes: `Importado de Excel. Patente: ${b.truck_plate || 'N/A'}. Chofer: ${b.driver_name || 'N/A'}`
      });
    }
    await loadData();
  };

  const handleApplyStockAdjustments = async (adjustments: { code: string; newStock: number }[]) => {
    for (const adj of adjustments) {
      const match = materials.find(m => 
        m.code.toUpperCase() === adj.code.toUpperCase() || 
        m.name.toUpperCase().includes(adj.code.toUpperCase())
      );
      if (match) {
        await apiService.updateMaterial(match.id, { current_stock: adj.newStock });
      }
    }
    await loadData();
  };

  const openNewMovement = () => {
    setCurrentTab('movements');
    setIsNewMovementModalOpen(true);
  };

  const handleViewInventoryWithAlerts = () => {
    setFilterCriticalInInventory(true);
    setCurrentTab('inventory');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* Sidebar Limpio y Descansado (Fondo Claro, sin contraste pesado) */}
      <Sidebar 
        currentTab={currentTab} 
        onSelectTab={(tab) => {
          if (tab === 'inventory') setFilterCriticalInInventory(false);
          setCurrentTab(tab);
        }} 
        metrics={metrics}
        onOpenWeighing={() => setIsWeighingModalOpen(true)}
        onOpenExcelSync={() => setIsExcelSyncModalOpen(true)}
      />

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50">
        <Navbar 
          onOpenSettings={() => setCurrentTab('supabase')}
          onOpenWeighing={() => setIsWeighingModalOpen(true)}
          onOpenExcelSync={() => setIsExcelSyncModalOpen(true)}
          criticalAlertsCount={metrics?.criticalStockAlertsCount || 0}
          onViewInventoryWithAlerts={handleViewInventoryWithAlerts}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
              <p className="text-sm font-semibold">Cargando inventario Greenspot...</p>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView 
                  metrics={metrics}
                  materials={materials}
                  batches={batches}
                  movements={movements}
                  onNavigate={(tab) => {
                    if (tab === 'inventory') setFilterCriticalInInventory(false);
                    setCurrentTab(tab);
                  }}
                  onOpenNewMovement={openNewMovement}
                  onOpenWeighing={() => setIsWeighingModalOpen(true)}
                  onOpenExcelSync={() => setIsExcelSyncModalOpen(true)}
                  onUpdateBatchStatus={handleUpdateBatchStatus}
                  onUpdateStock={handleUpdateStock}
                />
              )}

              {currentTab === 'inventory' && (
                <InventoryView 
                  materials={materials}
                  onSaveMaterial={handleSaveMaterial}
                  onUpdateStock={handleUpdateStock}
                  onUpdateMaterial={handleUpdateMaterial}
                  onDeleteMaterial={handleDeleteMaterial}
                  initialFilterCritical={filterCriticalInInventory}
                />
              )}

              {currentTab === 'batches' && (
                <BatchesView 
                  batches={batches}
                  materials={materials}
                  stakeholders={stakeholders}
                  warehouses={warehouses}
                  onSaveBatch={handleSaveBatch}
                  onUpdateStatus={handleUpdateBatchStatus}
                  onUpdateBatch={handleUpdateBatch}
                  onDeleteBatch={handleDeleteBatch}
                  isNewBatchModalOpen={isNewBatchModalOpen}
                  setIsNewBatchModalOpen={setIsNewBatchModalOpen}
                />
              )}

              {currentTab === 'movements' && (
                <MovementsView 
                  movements={movements}
                  materials={materials}
                  warehouses={warehouses}
                  batches={batches}
                  onRecordMovement={handleRecordMovement}
                  isNewMovementModalOpen={isNewMovementModalOpen}
                  setIsNewMovementModalOpen={setIsNewMovementModalOpen}
                />
              )}

              {currentTab === 'clients' && (
                <ClientsView 
                  stakeholders={stakeholders}
                  onSaveStakeholder={handleSaveStakeholder}
                  onUpdateStakeholder={handleUpdateStakeholder}
                  onDeleteStakeholder={handleDeleteStakeholder}
                />
              )}

              {currentTab === 'certificates' && (
                <CertificatesView 
                  certificates={certificates}
                  stakeholders={stakeholders}
                  batches={batches}
                  onSaveCertificate={handleSaveCertificate}
                  isNewCertModalOpen={isNewCertModalOpen}
                  setIsNewCertModalOpen={setIsNewCertModalOpen}
                />
              )}

              {currentTab === 'supabase' && (
                <SupabaseSettingsView 
                  onRefreshData={loadData}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Buscador Rápido de Inventario */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTab={(tab) => {
          if (tab === 'inventory') setFilterCriticalInInventory(false);
          setCurrentTab(tab);
        }}
        materials={materials}
        batches={batches}
        onOpenNewBatch={() => setIsWeighingModalOpen(true)}
        onOpenNewMovement={openNewMovement}
        onOpenNewCert={() => { setCurrentTab('certificates'); setIsNewCertModalOpen(true); }}
        onOpenExcelSync={() => setIsExcelSyncModalOpen(true)}
      />

      {/* Calculadora & Pesaje de Báscula Industrial */}
      <WeighingModal
        isOpen={isWeighingModalOpen}
        onClose={() => setIsWeighingModalOpen(false)}
        materials={materials}
        stakeholders={stakeholders}
        warehouses={warehouses}
        onSaveBatch={handleSaveBatch}
      />

      {/* Sincronización y Manipulación Nativa con Excel (.xlsx) */}
      <ExcelSyncModal
        isOpen={isExcelSyncModalOpen}
        onClose={() => setIsExcelSyncModalOpen(false)}
        data={{
          materials,
          batches,
          movements,
          productionOrders,
          certificates
        }}
        onImportMaterials={handleImportMaterials}
        onImportBatches={handleImportBatches}
        onApplyStockAdjustments={handleApplyStockAdjustments}
      />

      {/* Modal Switcher de Roles y Acceso (IAM) */}
      <RoleSwitcherModal />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <IAMProvider>
        <AppContent />
      </IAMProvider>
    </ToastProvider>
  );
}
