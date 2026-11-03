import * as XLSX from 'xlsx';
import { MaterialProduct, Batch, InventoryMovement, ProductionOrder, ValorizationCertificate } from '../types';

/**
 * Genera y descarga el libro Excel completo de Greenspot con todas las bases de datos en pestañas separadas
 */
export const exportCompleteGreenspotWorkbook = (data: {
  materials: MaterialProduct[];
  batches: Batch[];
  movements: InventoryMovement[];
  productionOrders: ProductionOrder[];
  certificates: ValorizationCertificate[];
}) => {
  const wb = XLSX.utils.book_new();

  // 1. Hoja de Catálogo de Materiales & Stock
  const materialsRows = data.materials.map((m) => ({
    'Código': m.code,
    'Nombre del Material': m.name,
    'Polímero': m.polymer_type,
    'Categoría': m.category,
    'Color': m.color,
    'Stock Actual': m.current_stock,
    'Unidad': m.unit,
    'Stock Mínimo Alerta': m.minimum_stock,
    'Estado Stock': m.current_stock <= m.minimum_stock ? 'CRÍTICO' : 'NORMAL',
    'Costo Unitario (USD)': m.unit_cost_usd,
    'Precio Venta (USD)': m.unit_price_usd,
    'Factor CO2 Ahorrado (kg/kg)': m.co2_factor_kg,
    'Índice Fluidez (MFI g/10min)': m.mfi_melt_flow_index || 'N/A',
    'Densidad (g/cm3)': m.density_g_cm3 || 'N/A',
    'Descripción': m.description || ''
  }));
  const wsMaterials = XLSX.utils.json_to_sheet(materialsRows);
  XLSX.utils.book_append_sheet(wb, wsMaterials, '1. Inventario & Silos');

  // 2. Hoja de Lotes & Trazabilidad Marina
  const batchesRows = data.batches.map((b) => ({
    'N° Lote': b.batch_number,
    'Material': b.material?.name || '',
    'Polímero': b.material?.polymer_type || '',
    'Empresa Generadora': b.supplier?.name || '',
    'RUT Generador': b.supplier?.tax_id || '',
    'Zona Origen Marino': b.marine_origin_zone || 'Patagonia',
    'Bodega / Patio': b.warehouse?.name || '',
    'Kilos Iniciales': b.initial_weight_kg,
    'Kilos Actuales': b.current_weight_kg,
    'Merma Impureza (%)': b.impurity_percentage,
    'Estado Operativo': 
      b.status === 'received' ? '1. Recepcionado' :
      b.status === 'washing_sorting' ? '2. En Lavado' :
      b.status === 'shredded' ? '3. En Molienda' :
      b.status === 'pelletized' ? '4. Peletizado' :
      b.status === 'dispatched' ? '5. Despachado' : b.status,
    'Fecha Recepción': new Date(b.reception_date).toLocaleDateString('es-CL'),
    'Observaciones de Planta': b.notes || ''
  }));
  const wsBatches = XLSX.utils.json_to_sheet(batchesRows);
  XLSX.utils.book_append_sheet(wb, wsBatches, '2. Lotes Trazabilidad');

  // 3. Hoja de Kardex de Movimientos
  const movementsRows = data.movements.map((mov) => ({
    'N° Movimiento': mov.movement_number,
    'Tipo': 
      mov.movement_type === 'reception' ? 'Recepción Báscula' :
      mov.movement_type === 'production_intake' ? 'Consumo Producción' :
      mov.movement_type === 'production_output' ? 'Salida Pelletizado' :
      mov.movement_type === 'internal_transfer' ? 'Traslado Interno' :
      mov.movement_type === 'dispatch' ? 'Despacho Cliente' :
      mov.movement_type === 'waste_adjustment' ? 'Ajuste de Merma' : mov.movement_type,
    'Material': mov.material?.name || '',
    'Cantidad': mov.quantity,
    'Unidad': mov.unit,
    'Patio Origen': mov.from_warehouse?.name || 'Externo / Proveedor',
    'Patio Destino': mov.to_warehouse?.name || 'Externo / Despacho',
    'Operador Responsable': mov.operator_name,
    'Documento Referencia': mov.reference_doc || '',
    'Fecha / Hora': new Date(mov.created_at).toLocaleString('es-CL'),
    'Notas': mov.notes || ''
  }));
  const wsMovements = XLSX.utils.json_to_sheet(movementsRows);
  XLSX.utils.book_append_sheet(wb, wsMovements, '3. Kardex Movimientos');

  // 4. Hoja de Líneas de Producción & Balance de Masa
  const productionRows = data.productionOrders.map((op) => ({
    'N° Orden OP': op.order_number,
    'Línea de Proceso': op.line_name,
    'Materia Prima Consumida': op.input_material?.name || '',
    'Kilos Entrada': op.input_weight_kg,
    'Pellet Obtenido': op.output_material?.name || '',
    'Kilos Pellet Salida': op.output_weight_kg,
    'Kilos Merma (Scrap)': op.scrap_weight_kg,
    'Rendimiento (%)': op.yield_percentage,
    'Estado': op.status === 'completed' ? 'Completada' : 'En Ejecución',
    'Jefe de Turno': op.supervisor_name,
    'Fecha': op.start_date ? new Date(op.start_date).toLocaleDateString('es-CL') : ''
  }));
  const wsProduction = XLSX.utils.json_to_sheet(productionRows);
  XLSX.utils.book_append_sheet(wb, wsProduction, '4. Balance de Masa');

  // 5. Hoja de Certificados Ley REP
  const certRows = data.certificates.map((cert) => ({
    'Código Certificado': cert.certificate_code,
    'Empresa Regulada': cert.stakeholder?.name || '',
    'RUT': cert.stakeholder?.tax_id || '',
    'Tipo de Pasivo Plástico': cert.waste_type,
    'Kilos Valorizados': cert.total_kg_valorized,
    'Toneladas': (cert.total_kg_valorized / 1000).toFixed(2),
    'CO2 Evitado (kg)': cert.co2_avoided_kg,
    'Agua Preservada (Litros)': cert.water_saved_liters,
    'Petróleo Equivalente Ahorrado (Barriles)': cert.oil_saved_barrels,
    'Destino Final Producto': cert.final_destination_product,
    'Fecha Emisión': cert.issue_date,
    'Código Verificación QR': cert.qr_verification_code
  }));
  const wsCerts = XLSX.utils.json_to_sheet(certRows);
  XLSX.utils.book_append_sheet(wb, wsCerts, '5. Certificados Ley REP');

  // Descarga directa del archivo .xlsx con timestamp
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Greenspot_Base_Datos_Completa_${dateStr}.xlsx`);
};

/**
 * Descarga una plantilla de Excel formateada para que el operario ingrese datos rápidamente
 */
export const downloadExcelTemplate = (type: 'inventory' | 'batches' | 'adjustments') => {
  const wb = XLSX.utils.book_new();

  if (type === 'inventory') {
    const templateRows = [
      {
        'Código': 'RAW-HDPE-BOYAS',
        'Nombre': 'Boyas y Flotadores Marinos HDPE 400L',
        'Polímero (HDPE/EPS/PP)': 'HDPE',
        'Categoría (raw_material/in_process/pellet/finished_product)': 'raw_material',
        'Color': 'Negro',
        'Stock Actual': 18500,
        'Unidad (kg/ton/unidades)': 'kg',
        'Stock Mínimo': 3000,
        'Costo USD': 0.15,
        'Precio Venta USD': 0.75,
        'Factor CO2': 1.85,
        'Descripción': 'Boyas salmoneras recuperadas de Chiloé y Fiordo Comau'
      },
      {
        'Código': 'PEL-HDPE-INJ-01',
        'Nombre': 'Pellet HDPE Reciclado Inyección Gris',
        'Polímero (HDPE/EPS/PP)': 'HDPE',
        'Categoría (raw_material/in_process/pellet/finished_product)': 'pellet',
        'Color': 'Gris',
        'Stock Actual': 9400,
        'Unidad (kg/ton/unidades)': 'kg',
        'Stock Mínimo': 2000,
        'Costo USD': 0.45,
        'Precio Venta USD': 1.25,
        'Factor CO2': 1.85,
        'Descripción': 'Pellet de alto rendimiento para inyección de cajones'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Inventario');
    XLSX.writeFile(wb, 'Plantilla_Inventario_Greenspot.xlsx');
  } else if (type === 'batches') {
    const templateRows = [
      {
        'N° Lote': 'LOTE-2026-8801',
        'Código Material': 'RAW-HDPE-BOYAS',
        'RUT Empresa Generadora': '76.123.456-7',
        'Patente Camión': 'HJ-8492',
        'Chofer': 'Carlos Vera',
        'Zona Origen Marina': 'Centro Fiordo Comau',
        'Peso Bruto (kg)': 28400,
        'Tara Camión (kg)': 14200,
        'Merma Impureza (%)': 2.0,
        'Observaciones': 'Recepción en patio Trapén'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Pesaje Lotes');
    XLSX.writeFile(wb, 'Plantilla_Pesaje_Lotes_Greenspot.xlsx');
  } else {
    const templateRows = [
      {
        'Código Material': 'RAW-HDPE-BOYAS',
        'Nombre Material': 'Boyas y Flotadores Marinos HDPE 400L',
        'Stock Físico Conteo Real (kg)': 19200,
        'Motivo Ajuste': 'Conteo físico fin de turno Patio 1'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Ajuste Stock');
    XLSX.writeFile(wb, 'Plantilla_Ajuste_Stock_Greenspot.xlsx');
  }
};

export interface ParsedExcelResult {
  sheetNames: string[];
  type: 'inventory' | 'batches' | 'adjustments' | 'unknown';
  validRows: any[];
  errors: string[];
}

/**
 * Lee y parsea un archivo Excel (.xlsx, .xls) subido por el usuario
 */
export const parseUploadedExcelFile = async (file: File): Promise<ParsedExcelResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawJson || rawJson.length === 0) {
          resolve({
            sheetNames: wb.SheetNames,
            type: 'unknown',
            validRows: [],
            errors: ['La hoja de Excel está vacía o no tiene filas válidas.']
          });
          return;
        }

        const sample = rawJson[0];
        const keys = Object.keys(sample);

        // Detectar tipo de planilla automáticamente
        let detectedType: 'inventory' | 'batches' | 'adjustments' | 'unknown' = 'unknown';

        if (keys.some(k => k.toLowerCase().includes('polímero') || k.toLowerCase().includes('stock actual'))) {
          detectedType = 'inventory';
        } else if (keys.some(k => k.toLowerCase().includes('patente') || k.toLowerCase().includes('bruto') || k.toLowerCase().includes('origen marina'))) {
          detectedType = 'batches';
        } else if (keys.some(k => k.toLowerCase().includes('conteo real') || k.toLowerCase().includes('ajuste'))) {
          detectedType = 'adjustments';
        }

        const validRows: any[] = [];
        const errors: string[] = [];

        rawJson.forEach((row, idx) => {
          const rowNum = idx + 2; // Por el header

          if (detectedType === 'inventory') {
            const code = row['Código'] || row['Codigo'] || row['code'];
            const name = row['Nombre'] || row['Nombre del Material'] || row['name'];
            const polymer = (row['Polímero (HDPE/EPS/PP)'] || row['Polímero'] || row['Polimero'] || 'HDPE').toString().toUpperCase().trim();
            const stock = Number(row['Stock Actual'] ?? row['Stock'] ?? 0);
            const unit = (row['Unidad (kg/ton/unidades)'] || row['Unidad'] || 'kg').toString().toLowerCase().trim();

            if (!name) {
              errors.push(`Fila ${rowNum}: Falta el nombre del material.`);
              return;
            }

            validRows.push({
              code: code || `MAT-${Math.floor(1000 + Math.random() * 9000)}`,
              name,
              polymer_type: ['HDPE', 'EPS', 'PP'].includes(polymer) ? polymer : 'HDPE',
              category: row['Categoría'] || 'raw_material',
              color: row['Color'] || 'Negro',
              current_stock: isNaN(stock) ? 0 : stock,
              unit: ['kg', 'ton', 'unidades', 'm3'].includes(unit) ? unit : 'kg',
              minimum_stock: Number(row['Stock Mínimo'] || 1000),
              unit_cost_usd: Number(row['Costo USD'] || 0.2),
              unit_price_usd: Number(row['Precio Venta USD'] || 0.8),
              co2_factor_kg: Number(row['Factor CO2'] || 1.85),
              description: row['Descripción'] || ''
            });
          } else if (detectedType === 'batches') {
            const batchNumber = row['N° Lote'] || row['Lote'] || `LOTE-2026-${Math.floor(1000 + Math.random() * 9000)}`;
            const materialCode = row['Código Material'] || row['Material'] || '';
            const supplierTaxId = row['RUT Empresa Generadora'] || row['RUT'] || '';
            const gross = Number(row['Peso Bruto (kg)'] || row['Bruto'] || 0);
            const tare = Number(row['Tara Camión (kg)'] || row['Tara'] || 0);
            const net = Math.max(0, gross - tare);
            const impurity = Number(row['Merma Impureza (%)'] || 2.0);

            validRows.push({
              batch_number: batchNumber,
              material_identifier: materialCode,
              supplier_tax_id: supplierTaxId,
              truck_plate: row['Patente Camión'] || row['Patente'] || '',
              driver_name: row['Chofer'] || '',
              marine_origin_zone: row['Zona Origen Marina'] || row['Origen'] || 'Centro Acuícola Patagonia',
              gross_weight: gross,
              tare_weight: tare,
              net_weight: net > 0 ? net : (Number(row['Kilos']) || 10000),
              impurity_percentage: impurity,
              notes: row['Observaciones'] || ''
            });
          } else if (detectedType === 'adjustments') {
            const materialCode = row['Código Material'] || row['Codigo'] || row['Material'] || '';
            const newStock = Number(row['Stock Físico Conteo Real (kg)'] || row['Stock'] || row['Conteo'] || 0);
            const reason = row['Motivo Ajuste'] || 'Ajuste masivo desde planilla Excel';

            validRows.push({
              material_code: materialCode,
              new_stock: newStock,
              reason
            });
          } else {
            // Planilla genérica
            validRows.push(row);
          }
        });

        resolve({
          sheetNames: wb.SheetNames,
          type: detectedType,
          validRows,
          errors
        });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
