// Genera reto/ejemplos/: los PDFs de ejemplo y lo que esperaríamos sacar de cada uno.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { contratoEjemplo, ejemplos, perfiles } from './datos';
import { contratoAlquilerPdf, facturaPdf, totalesFactura, variasFacturasPdf, type FacturaPdf } from './pdf';

const dir = fileURLToPath(new URL('../../reto/ejemplos/', import.meta.url));
mkdirSync(dir, { recursive: true });

const clienteDe = (nombre: string) => {
  const c = perfiles.find((p) => p.cliente.nombre === nombre)!.cliente;
  return { nombre: c.nombre, nif: c.nif };
};
const guardar = (fichero: string, pdf: Buffer, esperado: object) => {
  writeFileSync(`${dir}${fichero}`, pdf);
  writeFileSync(`${dir}${fichero.replace(/\.pdf$/, '.esperado.json')}`, JSON.stringify(esperado, null, 2) + '\n');
  console.log(`  ${fichero}`);
};

function esperada(f: FacturaPdf, clienteNif: string, categoria: string, concepto?: string) {
  const t = totalesFactura(f);
  const emitida = f.emisor.nif === clienteNif;
  const contraparte = emitida ? f.receptor : f.emisor;
  return {
    tipo: emitida ? 'emitida' : 'recibida',
    numero: f.numero,
    fecha: f.fecha,
    vencimiento: f.vencimiento ?? null,
    contraparte: contraparte?.nombre ?? null,
    contraparte_nif: contraparte?.nif ?? null,
    concepto: concepto ?? f.lineas.map((l) => l.concepto).join(', '),
    categoria,
    base_imponible: t.base,
    iva_pct: t.desglose.length === 1 ? t.desglose[0].pct : null,
    iva_importe: t.iva,
    irpf_pct: f.irpf_pct ?? 0,
    irpf_importe: t.irpf,
    total: t.total,
    desglose_iva: t.desglose,
    lineas: f.lineas.map((l) => ({ ...l, iva_pct: l.iva_pct ?? f.iva_pct })),
  };
}

for (const e of ejemplos) {
  const cliente = clienteDe(e.cliente);
  const pdf = e.paginas
    ? await variasFacturasPdf(e.paginas.map((i) => e.facturas[i].pdf))
    : await facturaPdf(e.facturas[0].pdf);
  guardar(e.fichero, pdf, {
    fichero: e.fichero,
    cliente_asesoria: cliente,
    facturas_esperadas: e.facturas.map((f) => esperada(f.pdf, cliente.nif, f.categoria, f.concepto)),
    notas: e.notas,
  });
}

const c = contratoEjemplo.contrato;
guardar(contratoEjemplo.fichero, await contratoAlquilerPdf(c), {
  fichero: contratoEjemplo.fichero,
  cliente_asesoria: clienteDe(contratoEjemplo.cliente),
  facturas_esperadas: [],
  tipo_documento: 'contrato_alquiler',
  datos_clave: {
    arrendador: { nombre: c.arrendador.nombre, nif: c.arrendador.nif },
    inmueble: c.inmueble,
    fecha_firma: c.fecha_firma,
    inicio: c.inicio,
    fin: '2026-10-31',
    renta_mensual: c.renta_mensual,
    fianza_meses: c.fianza_meses,
  },
  notas: contratoEjemplo.notas,
});
