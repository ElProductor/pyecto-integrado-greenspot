import { jsPDF } from 'jspdf';
import type { ValorizationCertificate } from '../datos/tipos';

/** Datos sin los cuales el certificado no se emite (nunca se rellenan con valores inventados). */
export function faltantesCertificado(cert: ValorizationCertificate): string[] {
  const f: [string, unknown][] = [
    ['empresa generadora', cert.stakeholder?.name], ['RUT de la empresa', cert.stakeholder?.tax_id],
    ['lote', cert.batch?.batch_number], ['tipo de residuo', cert.waste_type],
    ['kilos valorizados', Number(cert.total_kg_valorized) > 0], ['firmante', cert.signer_name?.trim()]
  ];
  return f.filter(([, v]) => !v).map(([n]) => n);
}

const kg = (n: number) => Number(n).toLocaleString('es-CL', { maximumFractionDigits: 2 }) + ' kg';

export async function generateCertificatePdf(cert: ValorizationCertificate): Promise<void> {
  const faltan = faltantesCertificado(cert);
  if (faltan.length) throw new Error('faltan datos obligatorios: ' + faltan.join(', '));

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), M = 20;
  const gris = () => doc.setTextColor(90, 100, 95), negro = () => doc.setTextColor(25, 30, 28);
  const linea = (y: number) => { doc.setDrawColor(200, 206, 202); doc.line(M, y, W - M, y); };

  // Encabezado
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); negro();
  doc.text('Greenspot SpA', M, 24);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); gris();
  doc.text(`N° ${cert.certificate_code}`, W - M, 20, { align: 'right' });
  doc.text(`Fecha de emisión: ${new Date(cert.issue_date + 'T12:00').toLocaleDateString('es-CL')}`, W - M, 26, { align: 'right' });
  doc.setDrawColor(47, 107, 79); doc.setLineWidth(0.8); doc.line(M, 32, W - M, 32); doc.setLineWidth(0.2);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); negro();
  doc.text('Certificado de valorización de residuos', M, 46);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); gris();
  doc.text('Ley N° 20.920 (Responsabilidad Extendida del Productor)', M, 52);

  // Filas etiqueta / valor; las opcionales vacías no se imprimen
  let y = 66;
  const seccion = (t: string) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(10); negro(); doc.text(t.toUpperCase(), M, y); y += 3; linea(y); y += 7; };
  const fila = (k: string, v?: string | null) => {
    if (!v) return;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); gris(); doc.text(k, M, y);
    negro(); doc.text(doc.splitTextToSize(v, W - M - 75), 75, y); y += 7;
  };

  seccion('Empresa generadora');
  fila('Razón social', cert.stakeholder!.name);
  fila('RUT', cert.stakeholder!.tax_id);
  fila('Dirección', [cert.stakeholder?.address, cert.stakeholder?.city].filter(Boolean).join(', '));
  y += 4;

  seccion('Residuo valorizado');
  fila('Lote', cert.batch!.batch_number);
  fila('Tipo de residuo', cert.waste_type);
  fila('Zona de origen', cert.batch?.marine_origin_zone);
  fila('Fecha de recepción', cert.batch?.reception_date ? new Date(cert.batch.reception_date).toLocaleDateString('es-CL') : null);
  fila('Kilos valorizados', kg(cert.total_kg_valorized));
  fila('Operación', cert.final_destination_product);
  if (Number(cert.co2_avoided_kg) > 0) fila('CO2eq evitado (estimado)', kg(cert.co2_avoided_kg) + ', según el factor del material en el catálogo');
  y += 6;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); negro();
  const decl = `Greenspot SpA declara que recibió el residuo indicado de la empresa generadora y lo valorizó mediante ${cert.final_destination_product.toLowerCase()}, en el marco de la Ley N° 20.920.`;
  doc.text(doc.splitTextToSize(decl, W - 2 * M), M, y);

  doc.setDrawColor(120, 128, 124); doc.line(W - 95, 256, W - M, 256);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); negro();
  doc.text(cert.signer_name, W - 95, 262);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); gris();
  if (cert.signer_title) doc.text(cert.signer_title, W - 95, 267);

  doc.save(`${cert.certificate_code}_Greenspot_Certificado.pdf`);
}
