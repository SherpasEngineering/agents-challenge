import PDFDocument from 'pdfkit';

export type Parte = { nombre: string; nif?: string; direccion?: string };
export type Linea = { concepto: string; cantidad: number; precio: number; iva_pct?: number };

export type FacturaPdf = {
  layout: 'clasica' | 'moderna' | 'ticket';
  numero: string;
  fecha: string; // YYYY-MM-DD
  vencimiento?: string;
  emisor: Parte;
  receptor?: Parte; // las facturas simplificadas (tickets) no lo llevan
  lineas: Linea[];
  iva_pct: number; // tipo por defecto de las líneas
  irpf_pct?: number;
  forma_pago?: string;
  pie?: string;
};

const eur = (n: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' €';
const fechaEs = (iso: string) => iso.split('-').reverse().join('/');
const r2 = (n: number) => Math.round(n * 100) / 100;

export function totalesFactura(f: Pick<FacturaPdf, 'lineas' | 'iva_pct' | 'irpf_pct'>) {
  const porIva = new Map<number, number>();
  for (const l of f.lineas) {
    const pct = l.iva_pct ?? f.iva_pct;
    porIva.set(pct, r2((porIva.get(pct) ?? 0) + l.cantidad * l.precio));
  }
  const desglose = [...porIva].map(([pct, base]) => ({ pct, base, cuota: r2((base * pct) / 100) }));
  const base = r2(desglose.reduce((s, d) => s + d.base, 0));
  const iva = r2(desglose.reduce((s, d) => s + d.cuota, 0));
  const irpf = r2((base * (f.irpf_pct ?? 0)) / 100);
  return { desglose, base, iva, irpf, total: r2(base + iva - irpf) };
}

function render(build: (doc: PDFKit.PDFDocument) => void, opts: PDFKit.PDFDocumentOptions, numerar = false): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ ...opts, bufferPages: numerar });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    build(doc);
    if (numerar) numerarPaginas(doc);
    doc.end();
  });
}

function numerarPaginas(doc: PDFKit.PDFDocument) {
  const { start, count } = doc.bufferedPageRange();
  if (count < 2) return;
  for (let i = start; i < start + count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0; // si no, escribir bajo el margen abre otra página
    doc.font('Helvetica').fontSize(8).fillColor('#666').text(`Página ${i + 1} de ${count}`, 50, 815, { width: 495, align: 'right' });
  }
}

const A4 = { size: 'A4', margin: 50 } as const;
const TICKET = { size: [226, 340], margin: 14 };

function dibujar(doc: PDFKit.PDFDocument, f: FacturaPdf) {
  if (f.layout === 'ticket') ticket(doc, f);
  else if (f.layout === 'clasica') clasica(doc, f);
  else moderna(doc, f);
}

export function facturaPdf(f: FacturaPdf): Promise<Buffer> {
  return render((d) => dibujar(d, f), f.layout === 'ticket' ? TICKET : A4, f.layout !== 'ticket');
}

// Varias facturas en un solo PDF, como cuando el cliente escanea todo el mes junto.
export function variasFacturasPdf(fs: FacturaPdf[]): Promise<Buffer> {
  return render((doc) => {
    for (const f of fs) {
      doc.addPage(f.layout === 'ticket' ? TICKET : A4);
      dibujar(doc, f);
    }
  }, { autoFirstPage: false });
}

function clasica(doc: PDFKit.PDFDocument, f: FacturaPdf) {
  const t = totalesFactura(f);
  doc.font('Helvetica-Bold').fontSize(22).text('FACTURA', 50, 50);
  doc.font('Helvetica').fontSize(10).text(`Nº ${f.numero}`, 50, 80).text(`Fecha: ${fechaEs(f.fecha)}`);
  if (f.vencimiento) doc.text(`Vencimiento: ${fechaEs(f.vencimiento)}`);

  doc.font('Helvetica-Bold').text(f.emisor.nombre, 330, 50, { width: 215 });
  doc.font('Helvetica').text(`NIF: ${f.emisor.nif ?? ''}`, { width: 215 }).text(f.emisor.direccion ?? '', { width: 215 });

  if (f.receptor) {
    doc.rect(50, 140, 495, 62).stroke('#999');
    doc.font('Helvetica-Bold').fontSize(9).text('CLIENTE', 60, 148);
    doc.font('Helvetica').fontSize(10).text(f.receptor.nombre, 60, 162).text(`NIF: ${f.receptor.nif ?? ''}`);
    doc.text(f.receptor.direccion ?? '');
  }

  let y = 225;
  const multiIva = t.desglose.length > 1;
  const cabecera = () => {
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Concepto', 50, y).text('Cant.', 330, y).text('Precio', 380, y);
    if (multiIva) doc.text('IVA', 440, y);
    doc.text('Importe', 485, y);
    doc.moveTo(50, y + 14).lineTo(545, y + 14).stroke('#333');
    doc.font('Helvetica').fontSize(9);
    y += 22;
  };
  cabecera();
  let acumulado = 0;
  for (const l of f.lineas) {
    if (y > 735) {
      doc.font('Helvetica-Bold').text('Suma y sigue', 330, y + 6).text(eur(acumulado), 460, y + 6, { width: 85, align: 'right' });
      doc.addPage();
      doc.font('Helvetica').fontSize(9).fillColor('#666').text(`${f.emisor.nombre} · Factura Nº ${f.numero} (continuación)`, 50, 50);
      doc.fillColor('black');
      y = 80;
      cabecera();
    }
    const importe = r2(l.cantidad * l.precio);
    doc.text(l.concepto, 50, y, { width: 270 });
    doc.text(String(l.cantidad), 330, y).text(eur(l.precio), 370, y);
    if (multiIva) doc.text(`${l.iva_pct ?? f.iva_pct}%`, 440, y);
    doc.text(eur(importe), 475, y);
    acumulado = r2(acumulado + importe);
    y += 18;
  }
  if (y > 640) {
    doc.addPage();
    y = 60;
  }

  y += 20;
  const fila = (label: string, valor: string, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 10);
    doc.text(label, 330, y).text(valor, 460, y, { width: 85, align: 'right' });
    y += 16;
  };
  fila('Base imponible', eur(t.base));
  for (const d of t.desglose) fila(`IVA ${d.pct}%${multiIva ? ` s/ ${eur(d.base)}` : ''}`, eur(d.cuota));
  if (t.irpf) fila(`Retención IRPF ${f.irpf_pct}%`, `-${eur(t.irpf)}`);
  fila('TOTAL', eur(t.total), true);

  if (f.forma_pago) doc.font('Helvetica').fontSize(9).text(`Forma de pago: ${f.forma_pago}`, 50, y + 30);
  if (f.pie) doc.fontSize(8).fillColor('#666').text(f.pie, 50, 760, { width: 495, align: 'center' });
}

function moderna(doc: PDFKit.PDFDocument, f: FacturaPdf) {
  const t = totalesFactura(f);
  doc.rect(0, 0, 595, 90).fill('#1f4e79');
  doc.fillColor('white').font('Helvetica-Bold').fontSize(18).text(f.emisor.nombre, 50, 30, { width: 330 });
  doc.font('Helvetica').fontSize(9).text(`${f.emisor.nif ?? ''} · ${f.emisor.direccion ?? ''}`, 50, 56, { width: 330 });
  doc.font('Helvetica-Bold').fontSize(11).text(`Factura ${f.numero}`, 380, 32, { width: 165, align: 'right' });
  doc.font('Helvetica').fontSize(9).text(`Emitida el ${fechaEs(f.fecha)}`, 380, 50, { width: 165, align: 'right' });

  doc.fillColor('black');
  if (f.receptor) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#1f4e79').text('FACTURAR A', 50, 120);
    doc.fillColor('black').font('Helvetica').fontSize(10).text(f.receptor.nombre, 50, 134);
    doc.text(`CIF/NIF ${f.receptor.nif ?? ''}`).text(f.receptor.direccion ?? '');
  }
  if (f.vencimiento) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#1f4e79').text('VENCE', 400, 120, { width: 145, align: 'right' });
    doc.fillColor('black').font('Helvetica').fontSize(10).text(fechaEs(f.vencimiento), 400, 134, { width: 145, align: 'right' });
  }

  let y = 210;
  for (const l of f.lineas) {
    doc.font('Helvetica-Bold').fontSize(10).text(l.concepto, 50, y, { width: 360 });
    doc.font('Helvetica').fontSize(9).fillColor('#555').text(`${l.cantidad} x ${eur(l.precio)}`, 50, y + 14);
    doc.fillColor('black').fontSize(10).text(eur(r2(l.cantidad * l.precio)), 420, y, { width: 125, align: 'right' });
    doc.moveTo(50, y + 30).lineTo(545, y + 30).stroke('#ddd');
    y += 40;
  }

  y += 10;
  const fila = (label: string, valor: string) => {
    doc.font('Helvetica').fontSize(10).text(label, 300, y).text(valor, 420, y, { width: 125, align: 'right' });
    y += 16;
  };
  fila('Subtotal', eur(t.base));
  for (const d of t.desglose) fila(`IVA (${d.pct}%)`, eur(d.cuota));
  if (t.irpf) fila(`IRPF (-${f.irpf_pct}%)`, `-${eur(t.irpf)}`);
  doc.rect(300, y + 4, 245, 30).fill('#1f4e79');
  doc.fillColor('white').font('Helvetica-Bold').fontSize(12).text('TOTAL A PAGAR', 310, y + 13);
  doc.text(eur(t.total), 420, y + 13, { width: 115, align: 'right' });
  doc.fillColor('black');

  if (f.forma_pago) doc.font('Helvetica').fontSize(9).text(f.forma_pago, 50, y + 60, { width: 495 });
  if (f.pie) doc.fontSize(8).fillColor('#888').text(f.pie, 50, 770, { width: 495 });
}

function ticket(doc: PDFKit.PDFDocument, f: FacturaPdf) {
  const t = totalesFactura(f);
  const w = 198;
  doc.font('Courier-Bold').fontSize(10).text(f.emisor.nombre.toUpperCase(), { width: w, align: 'center' });
  doc.font('Courier').fontSize(8).text(f.emisor.direccion ?? '', { width: w, align: 'center' });
  doc.text(`NIF ${f.emisor.nif ?? ''}`, { width: w, align: 'center' });
  doc.moveDown().text('FACTURA SIMPLIFICADA', { width: w, align: 'center' });
  doc.text(`N.${f.numero}  ${fechaEs(f.fecha)}`, { width: w, align: 'center' });
  doc.moveDown().text('-'.repeat(38));
  for (const l of f.lineas) {
    doc.text(`${l.concepto}`, { width: w });
    doc.text(`  ${l.cantidad} x ${l.precio.toFixed(3)}`.padEnd(24) + eur(r2(l.cantidad * l.precio)).padStart(14), { width: w });
  }
  doc.text('-'.repeat(38));
  doc.font('Courier-Bold').fontSize(10).text(`TOTAL ${eur(t.total).padStart(25)}`, { width: w });
  doc.font('Courier').fontSize(8).moveDown();
  for (const d of t.desglose) doc.text(`IVA ${d.pct}%  BASE ${eur(d.base)}  CUOTA ${eur(d.cuota)}`, { width: w });
  doc.moveDown().text(f.forma_pago ?? 'TARJETA', { width: w, align: 'center' });
  doc.text(f.pie ?? 'GRACIAS POR SU VISITA', { width: w, align: 'center' });
}

export type ContratoPdf = {
  arrendador: Parte;
  arrendatario: Parte;
  inmueble: string;
  fecha_firma: string;
  inicio: string;
  duracion_anios: number;
  renta_mensual: number;
  fianza_meses: number;
  actualizacion: string;
};

export function contratoAlquilerPdf(c: ContratoPdf): Promise<Buffer> {
  return render(
    (doc) => {
      doc.font('Helvetica-Bold').fontSize(14).text('CONTRATO DE ARRENDAMIENTO DE LOCAL DE NEGOCIO', { align: 'center' });
      doc.moveDown(2).font('Helvetica').fontSize(10);
      const p = (s: string) => doc.text(s, { align: 'justify' }).moveDown();
      p(`En Valencia, a ${fechaEs(c.fecha_firma)}.`);
      doc.font('Helvetica-Bold').text('REUNIDOS').moveDown().font('Helvetica');
      p(`De una parte, ${c.arrendador.nombre}, con NIF ${c.arrendador.nif}, y domicilio en ${c.arrendador.direccion}, en adelante "LA ARRENDADORA".`);
      p(`De otra parte, ${c.arrendatario.nombre}, con NIF ${c.arrendatario.nif}, y domicilio en ${c.arrendatario.direccion}, en adelante "LA ARRENDATARIA".`);
      doc.font('Helvetica-Bold').text('CLÁUSULAS').moveDown().font('Helvetica');
      p(`PRIMERA. Objeto. LA ARRENDADORA cede en arrendamiento a LA ARRENDATARIA el local sito en ${c.inmueble}, para uso exclusivo de la actividad comercial de LA ARRENDATARIA.`);
      p(`SEGUNDA. Duración. El contrato tendrá una duración de ${c.duracion_anios} años a contar desde el ${fechaEs(c.inicio)}, prorrogable por periodos anuales salvo preaviso por escrito con dos meses de antelación.`);
      p(`TERCERA. Renta. La renta mensual se fija en ${eur(c.renta_mensual)} más el IVA correspondiente, a la que se aplicará la retención de IRPF legalmente establecida. Se abonará dentro de los cinco primeros días de cada mes mediante transferencia bancaria.`);
      p(`CUARTA. Actualización. ${c.actualizacion}`);
      p(`QUINTA. Fianza. LA ARRENDATARIA entrega en este acto ${c.fianza_meses} mensualidades de renta en concepto de fianza, que será devuelta a la finalización del contrato.`);
      p('SEXTA. Gastos. Los gastos de comunidad e IBI serán a cargo de LA ARRENDADORA. Los suministros (luz, agua, gas, telecomunicaciones) serán a cargo de LA ARRENDATARIA.');
      p('SÉPTIMA. Obras. LA ARRENDATARIA no podrá realizar obras que modifiquen la estructura del local sin consentimiento previo y por escrito de LA ARRENDADORA.');
      const y = doc.y + 30;
      doc.text('LA ARRENDADORA', 80, y);
      doc.text('LA ARRENDATARIA', 380, y);
    },
    { size: 'A4', margin: 60 },
  );
}
