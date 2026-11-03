import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { ValorizationCertificate } from '../types';

export async function generateCertificatePdf(cert: ValorizationCertificate): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Background and borders
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Top header banner - Greenspot Emerald & Dark Slate
  doc.setFillColor(5, 46, 22);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Eco-Accent stripe
  doc.setFillColor(22, 163, 74);
  doc.rect(0, 42, pageWidth, 4, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('GREENSPOT', 20, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(187, 247, 208);
  doc.text('CIRCULAR PLASTICS | SUR DE CHILE & PATAGONIA', 20, 30);
  doc.text('Red Resiter Economía Circular de Triple Impacto', 20, 36);

  // Certificate Code badge
  doc.setFillColor(22, 101, 52);
  doc.roundedRect(pageWidth - 75, 12, 55, 20, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICADO OFICIAL', pageWidth - 70, 19);
  doc.setFontSize(11);
  doc.setTextColor(134, 239, 172);
  doc.text(cert.certificate_code, pageWidth - 70, 27);

  // Document Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('CERTIFICADO DE VALORIZACIÓN Y TRAZABILIDAD', 20, 62);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Acreditación de Reciclaje y Destino Final de Residuos Plásticos Industriales (Ley REP)', 20, 70);

  // Date
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Fecha de Emisión: ${cert.issue_date}`, pageWidth - 75, 70);

  // Client Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(20, 78, pageWidth - 40, 38, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(22, 101, 52);
  doc.text('INFORMACIÓN DE LA EMPRESA GENERADORA', 26, 86);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Razón Social: ${cert.stakeholder?.name || 'Cliente Certificado'}`, 26, 94);
  doc.text(`RUT: ${cert.stakeholder?.tax_id || 'N/A'}`, 26, 102);
  doc.text(`Sector / Rubro: ${cert.stakeholder?.industry_sector || 'Acuicultura'}`, 26, 110);
  doc.text(`Ciudad: ${cert.stakeholder?.city || 'Puerto Montt'}, Región de Los Lagos`, 110, 94);
  doc.text(`Dirección: ${cert.stakeholder?.address || 'Instalaciones Marítimas'}`, 110, 102);

  // Material Details Box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(20, 122, pageWidth - 40, 42, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(22, 101, 52);
  doc.text('DETALLE DEL RESIDUO PLÁSTICO VALORIZADO', 26, 130);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Tipo de Residuo: ${cert.waste_type}`, 26, 138);
  doc.text(`Lote Asociado: ${cert.batch?.batch_number || 'Lote de Proceso'}`, 26, 146);
  doc.text(`Zona Origen: ${cert.batch?.marine_origin_zone || 'Región de Los Lagos'}`, 26, 154);
  doc.text(`Masa Neta Valorizada:`, 110, 138);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(22, 163, 74);
  doc.text(`${Number(cert.total_kg_valorized).toLocaleString('es-CL')} KG  (${(Number(cert.total_kg_valorized) / 1000).toFixed(2)} TON)`, 110, 146);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Destino: ${cert.final_destination_product}`, 110, 154);

  // Triple Impact KPI Cards
  const cardY = 170;
  const cardWidth = (pageWidth - 40 - 15) / 4;

  // 1. CO2
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(20, cardY, cardWidth, 34, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(22, 101, 52);
  doc.text(`${Number(cert.co2_avoided_kg).toLocaleString('es-CL')}`, 25, cardY + 14);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Kg CO2eq Evitados', 25, cardY + 22);
  doc.text('Huella Atmosférica', 25, cardY + 28);

  // 2. Agua
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(20 + cardWidth + 5, cardY, cardWidth, 34, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(3, 105, 161);
  doc.text(`${Number(cert.water_saved_liters).toLocaleString('es-CL')}`, 25 + cardWidth + 5, cardY + 14);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Litros de Agua Ahorrados', 25 + cardWidth + 5, cardY + 22);
  doc.text('Recursos Hídricos', 25 + cardWidth + 5, cardY + 28);

  // 3. Petróleo
  doc.setFillColor(254, 252, 232);
  doc.setDrawColor(254, 240, 138);
  doc.roundedRect(20 + (cardWidth + 5) * 2, cardY, cardWidth, 34, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(161, 98, 7);
  doc.text(`${Number(cert.oil_saved_barrels).toLocaleString('es-CL')}`, 25 + (cardWidth + 5) * 2, cardY + 14);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Barriles Petróleo Crudo', 25 + (cardWidth + 5) * 2, cardY + 22);
  doc.text('Fósil Virgen Ahorrado', 25 + (cardWidth + 5) * 2, cardY + 28);

  // 4. Circularidad
  doc.setFillColor(250, 245, 255);
  doc.setDrawColor(233, 213, 255);
  doc.roundedRect(20 + (cardWidth + 5) * 3, cardY, cardWidth, 34, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(126, 34, 206);
  doc.text('100% CIRCULAR', 25 + (cardWidth + 5) * 3, cardY + 14);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Economía Local', 25 + (cardWidth + 5) * 3, cardY + 22);
  doc.text('Cero Vertedero', 25 + (cardWidth + 5) * 3, cardY + 28);

  // Legal declaration text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const legalText = 
    "Greenspot SpA certifica bajo los estándares de la Ley N° 20.920 (Marco para la Gestión de Residuos, Responsabilidad " +
    "Extendida del Productor y Fomento al Reciclaje) que los materiales indicados fueron recibidos, clasificados, acondicionados y " +
    "transformados íntegramente en materia prima circular de alta calidad o eco-productos en nuestras plantas de la Región de Los Lagos, " +
    "evitando su disposición en rellenos sanitarios, mares o vertederos ilegales de la Patagonia.";
  doc.text(doc.splitTextToSize(legalText, pageWidth - 40), 20, 214);

  // QR Code generation
  try {
    const qrDataUrl = await QRCode.toDataURL(`https://greenspot.cl/verify?cert=${cert.certificate_code}&hash=${cert.qr_verification_code}`, {
      margin: 1,
      width: 120
    });
    doc.addImage(qrDataUrl, 'PNG', 20, 238, 30, 30);
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Escanee para verificar autenticidad', 20, 272);
    doc.text(`Hash: ${cert.qr_verification_code}`, 20, 276);
  } catch (err) {
    console.warn('Error generando QR en PDF:', err);
  }

  // Signature line
  doc.setDrawColor(148, 163, 184);
  doc.line(pageWidth - 95, 256, pageWidth - 20, 256);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(cert.signer_name || 'Benjamín González', pageWidth - 95, 262);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(cert.signer_title || 'Director General Greenspot / Red Resiter', pageWidth - 95, 267);
  doc.text('Planta Puerto Montt - Región de Los Lagos, Chile', pageWidth - 95, 272);

  // Footer
  doc.setFillColor(241, 245, 249);
  doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Greenspot SpA - www.greenspot.cl - contacto@greenspot.cl - Sistema de Trazabilidad Integral', pageWidth / 2, pageHeight - 5, { align: 'center' });

  // Trigger download
  doc.save(`${cert.certificate_code}_Greenspot_Certificado.pdf`);
}
