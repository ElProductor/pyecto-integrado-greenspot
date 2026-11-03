import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Package, 
  Upload, 
  Edit3,
  Trash2,
  SlidersHorizontal,
  X,
  Sparkles,
  Lock
} from 'lucide-react';
import { MaterialProduct, PolymerType, CategoryType, UnitMeasure } from '../types';
import { uploadFileToStorage } from '../lib/storage';
import { useToast } from '../components/Toast';
import { useIAM } from '../context/IAMContext';

interface InventoryViewProps {
  materials: MaterialProduct[];
  onSaveMaterial: (material: Omit<MaterialProduct, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdateStock: (id: string, newStock: number) => Promise<void>;
  onUpdateMaterial?: (id: string, updates: Partial<MaterialProduct>) => Promise<void>;
  onDeleteMaterial?: (id: string) => Promise<void>;
  initialFilterCritical?: boolean;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  materials,
  onSaveMaterial,
  onUpdateStock,
  onUpdateMaterial,
  onDeleteMaterial,
  initialFilterCritical = false
}) => {
  const { success } = useToast();
  const { permissions, isOperator } = useIAM();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPolymer, setSelectedPolymer] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [onlyCritical, setOnlyCritical] = useState<boolean>(initialFilterCritical);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modal Nuevo Material
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal Edición Técnica (porque el pellet siempre cambia: MFI, densidad, color)
  const [editingMaterial, setEditingMaterial] = useState<MaterialProduct | null>(null);
  const [editName, setEditName] = useState('');
  const [editPolymer, setEditPolymer] = useState<PolymerType>('HDPE');
  const [editCategory, setEditCategory] = useState<CategoryType>('pellet');
  const [editColor, setEditColor] = useState('');
  const [editMfi, setEditMfi] = useState<number | ''>('');
  const [editDensity, setEditDensity] = useState<number | ''>('');
  const [editStock, setEditStock] = useState<number>(0);
  const [editMinStock, setEditMinStock] = useState<number>(1000);
  const [editCost, setEditCost] = useState<number>(0.3);
  const [editPrice, setEditPrice] = useState<number>(1.2);
  const [editCo2, setEditCo2] = useState<number>(1.85);
  const [editDescription, setEditDescription] = useState('');

  // Modal Ajuste Rápido de Stock Físico
  const [adjustingMaterial, setAdjustingMaterial] = useState<MaterialProduct | null>(null);
  const [newPhysicalStock, setNewPhysicalStock] = useState<number>(0);

  // Form State para Nuevo Material
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPolymer, setFormPolymer] = useState<PolymerType>('HDPE');
  const [formCategory, setFormCategory] = useState<CategoryType>('pellet');
  const [formUnit, setFormUnit] = useState<UnitMeasure>('kg');
  const [formColor, setFormColor] = useState('Negro');
  const [formMinStock, setFormMinStock] = useState(1000);
  const [formCurrentStock, setFormCurrentStock] = useState(0);
  const [formCost, setFormCost] = useState(0.25);
  const [formPrice, setFormPrice] = useState(0.95);
  const [formCo2Factor, setFormCo2Factor] = useState(1.85);
  const [formMfi, setFormMfi] = useState<number | ''>(6.5);
  const [formDensity, setFormDensity] = useState<number | ''>(0.955);

  const handleOpenEdit = (m: MaterialProduct) => {
    setEditingMaterial(m);
    setEditName(m.name);
    setEditPolymer(m.polymer_type);
    setEditCategory(m.category);
    setEditColor(m.color);
    setEditMfi(m.mfi_melt_flow_index ?? '');
    setEditDensity(m.density_g_cm3 ?? '');
    setEditStock(m.current_stock);
    setEditMinStock(m.minimum_stock);
    setEditCost(m.unit_cost_usd);
    setEditPrice(m.unit_price_usd);
    setEditCo2(m.co2_factor_kg);
    setEditDescription(m.description || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial || !onUpdateMaterial) return;

    await onUpdateMaterial(editingMaterial.id, {
      name: editName,
      polymer_type: editPolymer,
      category: editCategory,
      color: editColor,
      mfi_melt_flow_index: editMfi !== '' ? Number(editMfi) : null,
      density_g_cm3: editDensity !== '' ? Number(editDensity) : null,
      current_stock: Number(editStock),
      minimum_stock: Number(editMinStock),
      unit_cost_usd: Number(editCost),
      unit_price_usd: Number(editPrice),
      co2_factor_kg: Number(editCo2),
      description: editDescription
    });

    success('Ficha técnica actualizada', `Los parámetros de ${editName} han sido actualizados`);
    setEditingMaterial(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveMaterial({
      code: formCode || `MAT-${Date.now().toString().slice(-4)}`,
      name: formName,
      description: formDescription,
      polymer_type: formPolymer,
      category: formCategory,
      unit: formUnit,
      color: formColor,
      minimum_stock: Number(formMinStock),
      current_stock: Number(formCurrentStock),
      unit_cost_usd: Number(formCost),
      unit_price_usd: Number(formPrice),
      co2_factor_kg: Number(formCo2Factor),
      mfi_melt_flow_index: formMfi !== '' ? Number(formMfi) : null,
      density_g_cm3: formDensity !== '' ? Number(formDensity) : null,
      is_active: true
    });

    setIsModalOpen(false);
    setFormCode('');
    setFormName('');
    setFormDescription('');
  };

  const handleSaveStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingMaterial) return;
    await onUpdateStock(adjustingMaterial.id, Number(newPhysicalStock));
    success('Stock actualizado', `${adjustingMaterial.name} corregido a ${newPhysicalStock.toLocaleString('es-CL')} ${adjustingMaterial.unit}`);
    setAdjustingMaterial(null);
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPolymer = selectedPolymer === 'ALL' || m.polymer_type === selectedPolymer;
    const matchesCategory = selectedCategory === 'ALL' || m.category === selectedCategory;
    const matchesCritical = !onlyCritical || m.current_stock <= m.minimum_stock;
    return matchesSearch && matchesPolymer && matchesCategory && matchesCritical;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Limpio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-300">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Plásticos & Silos
          </h1>
          <p className="text-sm text-slate-700 font-medium mt-1">
            Parámetros técnicos editables: MFI, densidad, formulación de pellets y stock
          </p>
        </div>

        {permissions.canEditTechnicalSpecs && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Material / Pellet</span>
          </button>
        )}
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-xl p-4 border border-slate-300 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por código, nombre o color del pellet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:bg-white"
            />
          </div>

          <select
            value={selectedPolymer}
            onChange={(e) => setSelectedPolymer(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-800"
          >
            <option value="ALL">Todos los Polímeros</option>
            <option value="HDPE">HDPE (Alta Densidad)</option>
            <option value="EPS">EPS (Plumavit)</option>
            <option value="PP">PP (Polipropileno)</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-800"
          >
            <option value="ALL">Todas las Categorías</option>
            <option value="raw_material">Materia Prima / Boyas</option>
            <option value="in_process">En Proceso / Flakes</option>
            <option value="pellet">Pellets Reciclados</option>
            <option value="finished_product">Eco-Madera</option>
          </select>

          <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-lg self-start">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-700'
              }`}
            >
              Tabla
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-700'
              }`}
            >
              Tarjetas
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyCritical}
              onChange={(e) => setOnlyCritical(e.target.checked)}
              className="rounded border-slate-400 text-amber-700 focus:ring-0"
            />
            <span>Mostrar sólo materiales con stock bajo mínimo</span>
          </label>
          <span className="text-slate-500">• {filteredMaterials.length} materiales en catálogo</span>
        </div>
      </div>

      {/* Tabla con Opciones Editables */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase tracking-wider text-xs">
                <tr>
                  <th className="p-4">Material / Código</th>
                  <th className="p-4">Polímero</th>
                  <th className="p-4">Detalle Técnico (MFI & Densidad)</th>
                  <th className="p-4 text-right">Stock Actual</th>
                  {permissions.canViewFinancials && (
                    <th className="p-4 text-right">Precio Venta</th>
                  )}
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredMaterials.map((m) => {
                  const isCritical = m.current_stock <= m.minimum_stock;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-sm">{m.name}</div>
                        <div className="font-mono text-xs text-slate-600 mt-0.5">
                          {m.code} • Color: <span className="font-bold text-slate-800">{m.color}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-bold font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-900 text-xs border border-slate-300">
                          {m.polymer_type}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-700 font-medium">
                        <div>
                          MFI: <strong className="text-slate-900 font-mono">{m.mfi_melt_flow_index ?? 'N/A'} g/10min</strong>
                        </div>
                        <div>
                          Densidad: <strong className="text-slate-900 font-mono">{m.density_g_cm3 ?? 'N/A'} g/cm³</strong>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className={`font-mono font-bold text-base ${isCritical ? 'text-amber-800' : 'text-slate-900'}`}>
                          {m.current_stock.toLocaleString('es-CL')} {m.unit}
                        </span>
                        {isCritical && (
                          <span className="block text-xs font-bold text-amber-800">Bajo Stock</span>
                        )}
                      </td>
                      {permissions.canViewFinancials && (
                        <td className="p-4 text-right font-mono font-bold text-emerald-800">
                          USD ${m.unit_price_usd.toFixed(2)}/kg
                        </td>
                      )}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setAdjustingMaterial(m);
                              setNewPhysicalStock(m.current_stock);
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors"
                          >
                            Ajustar Kilos
                          </button>

                          {permissions.canEditTechnicalSpecs && (
                            <button
                              onClick={() => handleOpenEdit(m)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Editar Ficha</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Vista en Tarjetas */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMaterials.map((m) => {
            const isCritical = m.current_stock <= m.minimum_stock;
            return (
              <div 
                key={m.id}
                className="bg-white rounded-xl border border-slate-300 p-5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-500">{m.code}</span>
                      <h3 className="font-bold text-slate-900 text-base mt-0.5">{m.name}</h3>
                    </div>
                    <span className="font-bold font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-900 text-xs border border-slate-300">
                      {m.polymer_type}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mb-3 line-clamp-2 font-medium">
                    {m.description || 'Pellet circular certificado Greenspot'}
                  </p>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-700 mb-4">
                    <div className="flex justify-between">
                      <span>Stock Actual:</span>
                      <strong className={`font-mono text-sm ${isCritical ? 'text-amber-800' : 'text-slate-900'}`}>
                        {m.current_stock.toLocaleString('es-CL')} {m.unit}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>MFI (Fluidez):</span>
                      <span className="font-mono font-bold text-slate-900">{m.mfi_melt_flow_index ?? 'N/A'} g/10min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Color / Densidad:</span>
                      <span className="font-bold text-slate-800">{m.color} • {m.density_g_cm3 ?? 'N/A'} g/cm³</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setAdjustingMaterial(m);
                      setNewPhysicalStock(m.current_stock);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold"
                  >
                    Ajustar Kilos
                  </button>

                  {permissions.canEditTechnicalSpecs && (
                    <button
                      onClick={() => handleOpenEdit(m)}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar Ficha</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Editar Ficha Técnica Completa (Pellet siempre cambia) */}
      {editingMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-300 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Editar Ficha Técnica • {editingMaterial.code}
                </h2>
                <p className="text-xs text-slate-600 font-medium">
                  Modifica propiedades físicas, MFI, densidad y valores del pellet
                </p>
              </div>
              <button
                onClick={() => setEditingMaterial(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Comercial del Material</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Polímero</label>
                  <select
                    value={editPolymer}
                    onChange={(e) => setEditPolymer(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
                  >
                    <option value="HDPE">HDPE</option>
                    <option value="EPS">EPS (Plumavit)</option>
                    <option value="PP">PP</option>
                    <option value="LDPE">LDPE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
                  >
                    <option value="raw_material">Materia Prima</option>
                    <option value="in_process">En Proceso (Flakes)</option>
                    <option value="pellet">Pellet Reciclado</option>
                    <option value="finished_product">Eco-Producto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Color del Pellet</label>
                  <input
                    type="text"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900"
                  />
                </div>
              </div>

              {/* Parámetros Críticos Industriales: MFI y Densidad */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-300 space-y-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Propiedades de Laboratorio & Fluidez
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      MFI (Melt Flow Index g/10min)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={editMfi}
                      onChange={(e) => setEditMfi(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="ej: 6.5 para inyección, 0.8 para tubería"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-sm font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Densidad (g/cm³)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={editDensity}
                      onChange={(e) => setEditDensity(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="ej: 0.955"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-sm font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stock Actual (kg)</label>
                  <input
                    type="number"
                    value={editStock}
                    onChange={(e) => setEditStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-sm font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Costo Unit (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editCost}
                    onChange={(e) => setEditCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-sm font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Precio Venta (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-sm font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción / Aplicación Recomendada</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="ej: Grado inyección para cajas de cosecha salmoneras y bins..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                {onDeleteMaterial && permissions.canDeleteRecords ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm(`¿Estás seguro de eliminar el material ${editingMaterial.name}?`)) {
                        await onDeleteMaterial(editingMaterial.id);
                        setEditingMaterial(null);
                      }
                    }}
                    className="px-3 py-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Ficha</span>
                  </button>
                ) : <div />}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingMaterial(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-sm shadow"
                  >
                    Guardar Cambios de Ficha
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Ajuste Rápido de Stock Físico */}
      {adjustingMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-300">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Ajuste de Conteo Físico
            </h3>
            <p className="text-xs text-slate-600 font-medium mb-4">
              {adjustingMaterial.name} ({adjustingMaterial.code})
            </p>

            <form onSubmit={handleSaveStockAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kilos Reales ({adjustingMaterial.unit})
                </label>
                <input
                  type="number"
                  step="50"
                  required
                  value={newPhysicalStock}
                  onChange={(e) => setNewPhysicalStock(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-base font-bold text-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingMaterial(null)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"
                >
                  Guardar Kilos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Crear Nuevo Material */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-300 my-8">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Crear Nuevo Material o Pellet
            </h2>
            <p className="text-xs text-slate-600 font-medium mb-4">
              Ingreso al catálogo de plásticos de Greenspot
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs font-medium">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Código</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="ej: PEL-HDPE-02"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Comercial</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="ej: Pellet HDPE Inyección Gris"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Polímero</label>
                  <select
                    value={formPolymer}
                    onChange={(e) => setFormPolymer(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="HDPE">HDPE</option>
                    <option value="EPS">EPS (Plumavit)</option>
                    <option value="PP">PP</option>
                    <option value="LDPE">LDPE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="raw_material">Materia Prima</option>
                    <option value="in_process">En Proceso</option>
                    <option value="pellet">Pellet Reciclado</option>
                    <option value="finished_product">Eco-Producto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Color</label>
                  <input
                    type="text"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">MFI (g/10min)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formMfi}
                    onChange={(e) => setFormMfi(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Densidad (g/cm³)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={formDensity}
                    onChange={(e) => setFormDensity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow"
                >
                  Guardar Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
