import type { ContratoPdf, FacturaPdf, Linea, Parte } from './pdf';

// NIF/CIF con dígito de control válido, para que se puedan validar.
export function cif(letra: 'A' | 'B' | 'F' | 'J', n: number) {
  const d = String(n).padStart(7, '0');
  let suma = 0;
  for (let i = 0; i < 7; i++) {
    const v = Number(d[i]);
    if (i % 2 === 0) {
      const x = v * 2;
      suma += Math.floor(x / 10) + (x % 10);
    } else suma += v;
  }
  return `${letra}${d}${(10 - (suma % 10)) % 10}`;
}
export function dni(n: number) {
  return `${String(n).padStart(8, '0')}${'TRWAGMYFPDXBNJZSQVHLCKE'[n % 23]}`;
}

export type Layout = FacturaPdf['layout'];

export type Proveedor = Parte & {
  nif: string;
  categoria: string;
  conceptos: string[];
  importe: [number, number]; // base imponible por factura
  porMes: number; // facturas al mes (fracción = probabilidad)
  iva_pct: number;
  irpf_pct?: number;
  layout: Layout;
  prefijo: string;
};

export type Perfil = {
  cliente: Parte & { nif: string; tipo: 'autonomo' | 'sociedad'; sector: string; email: string; telefono: string; notas?: string };
  asesor: number;
  ventas: {
    porMes: number;
    importe: [number, number];
    iva_pct: number;
    irpf_pct?: number;
    irpfProb?: number; // solo a empresas se aplica retención
    conceptos: string[];
    a: 'empresas' | 'particulares' | 'mixto';
    serie: string;
    layout: Layout;
  };
  ventasSinFacturaPct: number; // caja / TPV que no pasa por factura
  otrosGastosTrimestre: number; // nóminas, SS, amortizaciones...
  proveedores: Proveedor[];
  factorVentas?: (ym: string) => number;
  factorGasto?: (categoria: string, ym: string) => number;
  cierreQ3?: boolean; // el asesor ya ha cerrado el 3T 2026
  notasResultados?: Record<string, string>; // '2026-2' -> nota
};

export const asesores = [
  { nombre: 'Carmen Navarro', email: 'carmen@asesoria-demo.es' },
  { nombre: 'Sofía Ramos', email: 'sofia@asesoria-demo.es' },
];

// ---- Proveedores comunes ----
const luz = (min: number, max: number): Proveedor => ({
  nombre: 'Eléctrica Levantina SA', nif: cif('A', 4612873), direccion: 'Av. de Aragón 30, 46021 Valencia',
  categoria: 'suministros', conceptos: ['Consumo energía eléctrica', 'Término de potencia', 'Alquiler equipos de medida'],
  importe: [min, max], porMes: 1, iva_pct: 21, layout: 'moderna', prefijo: 'EL',
});
const agua: Proveedor = {
  nombre: 'Aguas de la Huerta SA', nif: cif('A', 4600217), direccion: 'C/ Gran Vía Ramón y Cajal 7, 46007 Valencia',
  categoria: 'suministros', conceptos: ['Suministro de agua bimestral', 'Canon de saneamiento'],
  importe: [45, 140], porMes: 0.5, iva_pct: 10, layout: 'clasica', prefijo: 'AH',
};
const telefono = (min: number, max: number): Proveedor => ({
  nombre: 'Onda Telecom SL', nif: cif('B', 9876321), direccion: 'C/ Colón 60, 46004 Valencia',
  categoria: 'telefonía', conceptos: ['Fibra 1Gb + 2 líneas móviles', 'Cuota mensual tarifa negocio'],
  importe: [min, max], porMes: 1, iva_pct: 21, layout: 'moderna', prefijo: 'OT',
});
const seguro = (min: number, max: number): Proveedor => ({
  nombre: 'Seguros Prisma SA', nif: cif('A', 2873410), direccion: 'Paseo de la Castellana 120, 28046 Madrid',
  categoria: 'seguros', conceptos: ['Póliza multirriesgo comercio', 'Seguro responsabilidad civil'],
  importe: [min, max], porMes: 1 / 3, iva_pct: 0, layout: 'clasica', prefijo: 'SP',
});
const alquiler = (renta: number, local: string): Proveedor => ({
  nombre: 'Inmobiliaria Arco SL', nif: cif('B', 4621358), direccion: 'C/ Sorní 12, 46004 Valencia',
  categoria: 'alquiler', conceptos: [`Alquiler local ${local}`],
  importe: [renta, renta], porMes: 1, iva_pct: 21, irpf_pct: 19, layout: 'clasica', prefijo: 'ARCO-',
});
const gasolina = (min: number, max: number, porMes: number): Proveedor => ({
  nombre: 'Gasolineras Ruta SL', nif: cif('B', 9812004), direccion: 'Ctra. CV-35 km 4, 46980 Paterna',
  categoria: 'combustible', conceptos: ['Gasóleo A', 'Gasolina 95'],
  importe: [min, max], porMes, iva_pct: 21, layout: 'ticket', prefijo: 'T',
});

const bar: Parte = { nombre: 'Bar Restaurante La Esquina SL', nif: cif('B', 4688432), direccion: 'C/ Cuba 45, 46006 Valencia' };

const verano = (ym: string) => (['06', '07', '08'].includes(ym.slice(5)) ? 1.4 : 1);

export const perfiles: Perfil[] = [
  {
    cliente: { nombre: bar.nombre, nif: bar.nif!, tipo: 'sociedad', sector: 'hostelería', email: 'laesquinaruzafa@gmail.com', telefono: '963 74 55 12', direccion: bar.direccion!, notas: 'Terraza en verano. Casi todo cobro en caja/TPV.' },
    asesor: 1,
    ventas: { porMes: 2, importe: [300, 1500], iva_pct: 10, conceptos: ['Menú evento empresa', 'Catering'], a: 'empresas', serie: 'BLE', layout: 'clasica' },
    ventasSinFacturaPct: 9,
    otrosGastosTrimestre: 21000,
    proveedores: [
      { nombre: 'Distribuciones Bebidas Mediterráneo SL', nif: cif('B', 4602714), direccion: 'Pol. Ind. Vara de Quart, 46014 Valencia', categoria: 'compras', conceptos: ['Barril cerveza 30L', 'Refrescos (cajas)', 'Agua mineral', 'Vino de la casa'], importe: [900, 2400], porMes: 2, iva_pct: 21, layout: 'clasica', prefijo: 'DBM' },
      { nombre: 'Carnes Selectas Pozo SL', nif: cif('B', 4633118), direccion: 'Mercavalencia, Nave 3, 46013 Valencia', categoria: 'compras', conceptos: ['Ternera', 'Pollo de corral', 'Embutido ibérico'], importe: [800, 2050], porMes: 2, iva_pct: 10, layout: 'moderna', prefijo: 'CSP' },
      { nombre: 'Frutas Selectas del Sur SL', nif: cif('B', 4699120), direccion: 'Mercavalencia, Nave 14, 46013 Valencia', categoria: 'compras', conceptos: ['Fruta y verdura semanal'], importe: [300, 900], porMes: 2, iva_pct: 4, layout: 'clasica', prefijo: 'FS' },
      luz(650, 850), agua, telefono(50, 65), seguro(500, 600), alquiler(1350, 'C/ Cuba 45'),
    ],
    factorVentas: verano,
    factorGasto: (cat, ym) => (cat === 'suministros' && ym >= '2026-07' && ym <= '2026-08' ? 1.9 : cat === 'compras' ? verano(ym) : 1),
    notasResultados: { '2025-3': 'Temporada de terraza buena.' },
  },
  {
    cliente: { nombre: 'Laura Martín Ortega', nif: dni(20456789), tipo: 'autonomo', sector: 'diseño gráfico', email: 'hola@lauramartin.studio', telefono: '644 120 987', direccion: 'C/ Literato Azorín 9, 46006 Valencia' },
    asesor: 0,
    ventas: { porMes: 3, importe: [400, 2400], iva_pct: 21, irpf_pct: 15, irpfProb: 1, conceptos: ['Diseño de identidad corporativa', 'Maquetación catálogo', 'Diseño web (fase 1)', 'Ilustraciones campaña'], a: 'empresas', serie: 'LM', layout: 'moderna' },
    ventasSinFacturaPct: 0,
    otrosGastosTrimestre: 950, // cuota de autónomos
    proveedores: [
      { nombre: 'Pixelia Software SL', nif: cif('B', 2894410), direccion: 'C/ Ribera 5, 46002 Valencia', categoria: 'software', conceptos: ['Suscripción mensual', 'Licencia de uso'], importe: [60, 75], porMes: 1, iva_pct: 21, layout: 'moderna', prefijo: 'SW' },
      { nombre: 'Coworking Ruzafa SL', nif: cif('B', 9855610), direccion: 'C/ Cádiz 70, 46006 Valencia', categoria: 'alquiler', conceptos: ['Puesto fijo coworking'], importe: [220, 220], porMes: 1, iva_pct: 21, layout: 'moderna', prefijo: 'CR' },
      telefono(35, 45),
      { nombre: 'Papelería Folio SL', nif: cif('B', 4630098), direccion: 'C/ Russafa 22, 46004 Valencia', categoria: 'material', conceptos: ['Material de oficina', 'Impresión pruebas color'], importe: [20, 140], porMes: 0.4, iva_pct: 21, layout: 'ticket', prefijo: 'PF' },
    ],
  },
  {
    cliente: { nombre: 'Talleres Mecánicos Brío SL', nif: cif('B', 4677013), tipo: 'sociedad', sector: 'automoción', email: 'taller@talleresbrio.es', telefono: '961 55 30 44', direccion: 'C/ Mecánica 4, Pol. Ind. Fuente del Jarro, 46988 Paterna', notas: 'Dos mecánicos en plantilla.' },
    asesor: 0,
    ventas: { porMes: 8, importe: [300, 3000], iva_pct: 21, conceptos: ['Cambio de aceite y filtros', 'Sustitución pastillas de freno', 'Reparación embrague', 'Revisión pre-ITV', 'Cambio de neumáticos'], a: 'mixto', serie: 'TB', layout: 'clasica' },
    ventasSinFacturaPct: 0.05,
    otrosGastosTrimestre: 14000,
    proveedores: [
      { nombre: 'Recambios Norte SA', nif: cif('A', 4802551), direccion: 'C/ Laguna 8, 48013 Bilbao', categoria: 'compras', conceptos: ['Pastillas de freno', 'Filtros aceite/aire', 'Kit embrague', 'Discos de freno'], importe: [600, 2600], porMes: 2, iva_pct: 21, layout: 'clasica', prefijo: 'RN' },
      { nombre: 'Neumáticos Ruedalia SL', nif: cif('B', 4644120), direccion: 'Av. Tres Cruces 90, 46014 Valencia', categoria: 'compras', conceptos: ['Neumáticos 205/55 R16', 'Neumáticos 225/45 R17'], importe: [500, 1900], porMes: 1, iva_pct: 21, layout: 'moderna', prefijo: 'NR' },
      luz(450, 800), telefono(60, 80), seguro(900, 1100), gasolina(40, 90, 1),
    ],
    factorVentas: (ym) => (ym >= '2026-04' && ym <= '2026-06' ? 0.6 : 1),
    notasResultados: { '2026-2': 'Bajada de facturación por obras en el acceso al polígono (abril-junio).' },
    cierreQ3: true,
  },
  {
    cliente: { nombre: 'Transportes Rápidos Levante SL', nif: cif('B', 4682290), tipo: 'sociedad', sector: 'transporte', email: 'admin@trlevante.es', telefono: '961 22 90 80', direccion: 'Pol. Ind. Sedaví, C/ 5 nº 12, 46910 Sedaví', notas: '3 camiones. El gasoil es uno de los gastos principales.' },
    asesor: 1,
    ventas: { porMes: 6, importe: [1200, 5000], iva_pct: 21, conceptos: ['Transporte de mercancía Valencia-Madrid', 'Ruta reparto semanal', 'Transporte palés Valencia-Barcelona'], a: 'empresas', serie: 'TRL', layout: 'clasica' },
    ventasSinFacturaPct: 0,
    otrosGastosTrimestre: 24000,
    proveedores: [
      gasolina(850, 1150, 4),
      { nombre: 'Neumáticos Ruedalia SL', nif: cif('B', 4644120), direccion: 'Av. Tres Cruces 90, 46014 Valencia', categoria: 'mantenimiento', conceptos: ['Neumáticos camión 315/70 R22.5'], importe: [1200, 3400], porMes: 0.3, iva_pct: 21, layout: 'moderna', prefijo: 'NR' },
      seguro(3500, 4200), telefono(120, 150),
      { nombre: 'Autopistas del Mediterráneo SA', nif: cif('A', 8209731), direccion: 'Av. Diagonal 600, 08021 Barcelona', categoria: 'peajes', conceptos: ['Peajes vía-T (resumen mensual)'], importe: [400, 900], porMes: 1, iva_pct: 21, layout: 'clasica', prefijo: 'AM' },
    ],
    factorGasto: (cat, ym) => {
      if (cat !== 'combustible' || ym < '2026-01') return 1;
      return 1 + 0.025 * Number(ym.slice(5));
    },
  },
];

// ---- Ejemplos del reto: PDFs con la extracción esperada ----
const cliente = (nombre: string) => {
  const p = perfiles.find((x) => x.cliente.nombre === nombre)!;
  return { nombre: p.cliente.nombre, nif: p.cliente.nif, direccion: p.cliente.direccion };
};
const prov = (clienteNombre: string, proveedor: string) =>
  perfiles.find((x) => x.cliente.nombre === clienteNombre)!.proveedores.find((p) => p.nombre === proveedor)!;

export type Ejemplo = {
  fichero: string;
  cliente: string;
  facturas: { categoria: string; concepto?: string; pdf: FacturaPdf }[]; // lo que tendría que salir del PDF
  paginas?: number[]; // qué facturas salen en el PDF y en qué orden (se pueden repetir)
  notas: string[];
};

const laura = cliente('Laura Martín Ortega');
const transportes = cliente('Transportes Rápidos Levante SL');
const arco = prov(bar.nombre, 'Inmobiliaria Arco SL');
const bebidas = prov(bar.nombre, 'Distribuciones Bebidas Mediterráneo SL');
const gasolinera = prov(transportes.nombre, 'Gasolineras Ruta SL');
const autopistas = prov(transportes.nombre, 'Autopistas del Mediterráneo SA');
const lauraProv = (nombre: string) => prov(laura.nombre, nombre);

// Un paso por la vía-T por línea: 3 camiones, días laborables de septiembre 2026.
const peajesSeptiembre = (() => {
  const camiones = ['4821 LKD', '1937 MBF', '6604 MCX'];
  const tramos: [string, number][] = [
    ['AP-7 Sagunto – Puçol', 3.95], ['AP-7 Valencia Sur – Silla', 2.35], ['AP-7 Castellón Norte – Torreblanca', 6.4],
    ['AP-2 Zaragoza – Fraga', 9.8], ['AP-7 Girona Norte – La Jonquera', 7.15], ['AP-68 Logroño – Haro', 5.6],
  ];
  const out: Linea[] = [];
  for (let d = 1; d <= 30; d++) {
    const dow = new Date(Date.UTC(2026, 8, d)).getUTCDay();
    if (dow === 0 || dow === 6) continue;
    camiones.forEach((camion, i) => {
      for (let k = 0; k < ((d + i) % 3) + 1; k++) {
        const [tramo, precio] = tramos[(d * 3 + i * 5 + k * 7) % tramos.length];
        out.push({ concepto: `${String(d).padStart(2, '0')}/09 · ${camion} · ${tramo}`, cantidad: 1, precio });
      }
    });
  }
  return out;
})();

export const ejemplos: Ejemplo[] = [
  {
    fichero: '01-alquiler-con-retencion.pdf',
    cliente: bar.nombre,
    notas: [
      'El cliente de la asesoría es el RECEPTOR: es una factura recibida (gasto).',
      'Lleva retención de IRPF del 19% (alquiler de local): el total es base + IVA - IRPF.',
    ],
    facturas: [{
      categoria: 'alquiler',
      pdf: {
        layout: 'clasica', numero: 'ARCO-2026/0187', fecha: '2026-10-01', vencimiento: '2026-10-05',
        emisor: arco, receptor: bar,
        lineas: [{ concepto: 'Alquiler local C/ Cuba 45 - octubre 2026', cantidad: 1, precio: 1350 }],
        iva_pct: 21, irpf_pct: 19, forma_pago: 'Transferencia a ES12 2100 0418 4502 0005 1332',
        pie: 'Inmobiliaria Arco SL · Inscrita en el Registro Mercantil de Valencia, Tomo 8812, Folio 44, Hoja V-112233',
      },
    }],
  },
  {
    fichero: '02-factura-emitida-autonoma.pdf',
    cliente: laura.nombre,
    notas: [
      'Aquí el cliente de la asesoría es el EMISOR: es una factura emitida (ingreso), no un gasto.',
      'Autónoma que factura a empresa: retención IRPF 15%.',
    ],
    facturas: [{
      categoria: 'ventas',
      pdf: {
        layout: 'moderna', numero: 'LM-2026-029', fecha: '2026-10-06', vencimiento: '2026-11-05',
        emisor: laura,
        receptor: { nombre: 'Bodegas Terra Alta Coop. V.', nif: cif('F', 4615820), direccion: 'Camí Vell 2, 46340 Requena' },
        lineas: [
          { concepto: 'Rediseño etiqueta gama reserva', cantidad: 1, precio: 1200 },
          { concepto: 'Adaptaciones etiqueta (3 formatos)', cantidad: 3, precio: 150 },
          { concepto: 'Ficha de producto para web', cantidad: 4, precio: 85 },
        ],
        iva_pct: 21, irpf_pct: 15,
        forma_pago: 'Pago por transferencia a 30 días: ES91 0081 0216 7400 0123 4567',
      },
    }],
  },
  {
    fichero: '03-ticket-gasolinera.pdf',
    cliente: transportes.nombre,
    notas: [
      'Factura simplificada (ticket): no tiene datos del receptor.',
      'El total incluye IVA; la base y la cuota vienen en el desglose del pie.',
    ],
    facturas: [{
      categoria: 'combustible',
      pdf: {
        layout: 'ticket', numero: 'T26-0094412', fecha: '2026-10-07',
        emisor: gasolinera,
        lineas: [{ concepto: 'GASOLEO A  SURT.04', cantidad: 312.4, precio: 1.198 }],
        iva_pct: 21, forma_pago: 'TARJETA FLOTA **** 4410',
      },
    }],
  },
  {
    fichero: '04-varios-tipos-iva.pdf',
    cliente: bar.nombre,
    notas: [
      'Una sola factura con DOS tipos de IVA (21% y 10%).',
      'El esquema actual de `facturas` solo tiene un iva_pct: ¿cómo lo guardarías?',
    ],
    facturas: [{
      categoria: 'compras',
      pdf: {
        layout: 'clasica', numero: 'DBM 26/3391', fecha: '2026-10-08', vencimiento: '2026-11-07',
        emisor: bebidas, receptor: bar,
        lineas: [
          { concepto: 'Barril cerveza 30L', cantidad: 4, precio: 89.5, iva_pct: 21 },
          { concepto: 'Vino de la casa (caja 6 ud)', cantidad: 3, precio: 27, iva_pct: 21 },
          { concepto: 'Refrescos surtidos (caja 24 ud)', cantidad: 5, precio: 16.8, iva_pct: 10 },
          { concepto: 'Agua mineral 50cl (caja 24 ud)', cantidad: 6, precio: 6.2, iva_pct: 10 },
        ],
        iva_pct: 21, forma_pago: 'Domiciliación bancaria a 30 días',
      },
    }],
  },
  {
    fichero: '06-factura-larga-peajes.pdf',
    cliente: transportes.nombre,
    notas: [
      `Una factura de varias páginas: ${peajesSeptiembre.length} líneas, un paso de peaje por línea.`,
      'Cada página acaba con "Suma y sigue": son subtotales, no el total.',
      'La cabecera (emisor, receptor, número) solo está en la página 1. Los totales solo en la última.',
      'La suma de las líneas tiene que dar la base imponible.',
    ],
    facturas: [{
      categoria: 'peajes',
      concepto: `Peajes vía-T septiembre 2026 (${peajesSeptiembre.length} pasos)`,
      pdf: {
        layout: 'clasica', numero: 'AM2026/0604', fecha: '2026-10-02', vencimiento: '2026-10-17',
        emisor: autopistas, receptor: transportes, lineas: peajesSeptiembre, iva_pct: 21,
        forma_pago: 'Cargo en cuenta asociada a la tarjeta vía-T',
        pie: 'Autopistas del Mediterráneo SA · Detalle de pasos del periodo 01/09/2026 - 30/09/2026',
      },
    }],
  },
  {
    fichero: '07-varias-facturas-un-pdf.pdf',
    cliente: laura.nombre,
    paginas: [0, 1, 2, 3, 2],
    notas: [
      'Un solo PDF con las facturas de gastos de octubre, escaneadas juntas: una factura por página.',
      'La página 5 repite la página 3 (Onda Telecom): hay 4 facturas, no 5.',
      'Mezcla formatos: A4 y un ticket estrecho.',
    ],
    facturas: [
      {
        categoria: 'alquiler',
        pdf: {
          layout: 'moderna', numero: 'CR2026/0505', fecha: '2026-10-01', vencimiento: '2026-10-10',
          emisor: lauraProv('Coworking Ruzafa SL'), receptor: laura,
          lineas: [{ concepto: 'Puesto fijo coworking - octubre 2026', cantidad: 1, precio: 220 }], iva_pct: 21,
        },
      },
      {
        categoria: 'software',
        pdf: {
          layout: 'moderna', numero: 'SW2026/0423', fecha: '2026-10-02',
          emisor: lauraProv('Pixelia Software SL'), receptor: laura,
          lineas: [{ concepto: 'Suscripción mensual plan Pro', cantidad: 1, precio: 69.9 }], iva_pct: 21,
        },
      },
      {
        categoria: 'telefonía',
        pdf: {
          layout: 'moderna', numero: 'OT2026/0686', fecha: '2026-10-06', vencimiento: '2026-10-20',
          emisor: lauraProv('Onda Telecom SL'), receptor: laura,
          lineas: [
            { concepto: 'Cuota mensual tarifa negocio', cantidad: 1, precio: 32.5 },
            { concepto: 'Consumo fuera de tarifa', cantidad: 1, precio: 4.85 },
          ],
          iva_pct: 21,
        },
      },
      {
        categoria: 'material',
        pdf: {
          layout: 'ticket', numero: 'PF2026/0828', fecha: '2026-10-07',
          emisor: lauraProv('Papelería Folio SL'),
          lineas: [
            { concepto: 'PAPEL A3 COUCHE 170G', cantidad: 2, precio: 18.9 },
            { concepto: 'IMPRESION PRUEBA COLOR A3', cantidad: 12, precio: 1.75 },
          ],
          iva_pct: 21, forma_pago: 'TARJETA',
        },
      },
    ],
  },
];

export const contratoEjemplo: { fichero: string; cliente: string; contrato: ContratoPdf; notas: string[] } = {
  fichero: '05-contrato-alquiler.pdf',
  cliente: bar.nombre,
  contrato: {
    arrendador: arco, arrendatario: bar, inmueble: 'C/ Cuba 45', fecha_firma: '2021-10-20',
    inicio: '2021-11-01', duracion_anios: 5, renta_mensual: 1200, fianza_meses: 2,
    actualizacion: 'La renta se actualizará cada 1 de enero conforme a la variación anual del Índice de Precios de Consumo (IPC), con un límite máximo del 3%.',
  },
  notas: [
    'No es una factura: no debe crear ninguna fila en facturas.',
    'Vence el 31/10/2026 (5 años desde el 01/11/2021), prorrogable salvo preaviso de dos meses.',
    'La renta del contrato es 1.200 €, pero las facturas de Arco dicen 1.350 €: se ha actualizado con el IPC. Contrato y facturas no dan la misma cifra.',
  ],
};
