import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { fakerES as faker } from '@faker-js/faker';
import { config } from '../src/config';
import { pool } from '../src/db';
import { calcularImportes } from '../src/importes';
import { ensureBucket, s3 } from '../src/storage';
import { asesores, cif, dni, ejemplos, perfiles, type Perfil, type Proveedor } from './datos';
import { totalesFactura, type FacturaPdf, type Linea, type Parte } from './pdf';

faker.seed(2026);

const HOY = '2026-10-10';
const MESES = (() => {
  const out: string[] = [];
  for (let y = 2025; y <= 2026; y++) for (let m = 1; m <= 12; m++) out.push(`${y}-${String(m).padStart(2, '0')}`);
  return out.filter((ym) => ym <= HOY.slice(0, 7));
})();
const MES_ACTUAL = HOY.slice(0, 7);

const r2 = (n: number) => Math.round(n * 100) / 100;
const rnd = (min: number, max: number) => faker.number.float({ min, max, fractionDigits: 2 });
const chance = (p: number) => faker.datatype.boolean({ probability: p });
const cuantas = (porMes: number) => Math.floor(porMes) + (chance(porMes % 1) ? 1 : 0);
const diasMes = (ym: string) => new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)), 0).getDate();
const dia = (ym: string, d: number) => `${ym}-${String(d).padStart(2, '0')}`;
const masDias = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const trimestreDe = (iso: string) => `${iso.slice(0, 4)}-${Math.ceil(Number(iso.slice(5, 7)) / 3)}`;
const esEmpresa = (p: Parte) => /^[A-Z]/.test(p.nif ?? '');

type Gen = { tipo: 'emitida' | 'recibida'; factura: FacturaPdf; categoria: string };

function lineas(base: number, conceptos: string[]): Linea[] {
  const n = Math.min(conceptos.length, faker.number.int({ min: 1, max: 3 }));
  const elegidos = faker.helpers.arrayElements(conceptos, n);
  const out: Linea[] = [];
  let resto = base;
  elegidos.forEach((concepto, i) => {
    const precio = i === n - 1 ? r2(resto) : r2(resto * rnd(0.3, 0.6));
    resto -= precio;
    out.push({ concepto, cantidad: 1, precio });
  });
  return out;
}

function partesVentas(p: Perfil): Parte[] {
  const out: Parte[] = [];
  const n = p.ventas.a === 'particulares' ? 20 : 10;
  for (let i = 0; i < n; i++) {
    const direccion = `${faker.location.streetAddress()}, ${faker.location.zipCode('46###')} ${faker.location.city()}`;
    const empresa = p.ventas.a === 'empresas' || (p.ventas.a === 'mixto' && chance(0.5));
    const nombre = empresa ? faker.company.name() : faker.person.fullName();
    const nif = empresa
      ? cif(nombre.includes('S.A.') ? 'A' : 'B', faker.number.int({ min: 1000000, max: 9999999 }))
      : dni(faker.number.int({ min: 10000000, max: 79999999 }));
    out.push({ nombre, nif, direccion });
  }
  return out;
}

function generar(p: Perfil): Gen[] {
  const out: Gen[] = [];
  const yo: Parte = { nombre: p.cliente.nombre, nif: p.cliente.nif, direccion: p.cliente.direccion };
  const compradores = partesVentas(p);
  // Este mes, lo de los emisores de reto/ejemplos queda sin meter: así subir un ejemplo no duplica nada.
  const omitirEmisores = new Set(
    ejemplos.filter((e) => e.cliente === p.cliente.nombre).flatMap((e) => e.facturas.map((f) => f.pdf.emisor.nif)),
  );
  const seq = new Map<string, number>();
  const siguiente = (clave: string, inicio: number) => {
    const n = (seq.get(clave) ?? inicio) + 1;
    seq.set(clave, n);
    return n;
  };

  for (const ym of MESES) {
    const y = ym.slice(0, 4);
    const actual = ym === MES_ACTUAL;
    const maxDia = actual ? Number(HOY.slice(8)) : diasMes(ym);
    const omitir = (nif?: string) => actual && omitirEmisores.has(nif ?? '');

    const v = p.ventas;
    const nVentas = omitir(yo.nif) ? 0 : cuantas(v.porMes * (p.factorVentas?.(ym) ?? 1) * rnd(0.85, 1.15) * (maxDia / diasMes(ym)));
    // La numeración de las emitidas tiene que ser correlativa con la fecha.
    const fechas = Array.from({ length: nVentas }, () => dia(ym, faker.number.int({ min: 1, max: maxDia }))).sort();
    for (const fecha of fechas) {
      const receptor = faker.helpers.arrayElement(compradores);
      const base = r2(rnd(...v.importe) * (p.factorVentas?.(ym) ?? 1) ** 0.3);
      const irpf = v.irpf_pct && esEmpresa(receptor) && chance(v.irpfProb ?? 1) ? v.irpf_pct : 0;
      out.push({
        tipo: 'emitida', categoria: 'ventas',
        factura: {
          layout: v.layout, numero: `${v.serie}-${y}-${String(siguiente(`${v.serie}${y}`, 0)).padStart(3, '0')}`,
          fecha, vencimiento: masDias(fecha, 30), emisor: yo, receptor, lineas: lineas(base, v.conceptos),
          iva_pct: v.iva_pct, irpf_pct: irpf,
        },
      });
    }

    for (const prov of p.proveedores) {
      if (omitir(prov.nif)) continue;
      const n = cuantas(prov.porMes * (actual && prov.importe[0] !== prov.importe[1] ? maxDia / diasMes(ym) : 1));
      for (let i = 0; i < n; i++) out.push(recibida(p, prov, ym, maxDia, yo, siguiente));
    }
  }
  return out;
}

function recibida(
  p: Perfil, prov: Proveedor, ym: string, maxDia: number, yo: Parte,
  siguiente: (clave: string, inicio: number) => number,
): Gen {
  const fijo = prov.importe[0] === prov.importe[1];
  const base = r2(rnd(...prov.importe) * (p.factorGasto?.(prov.categoria, ym) ?? 1));
  const fecha = dia(ym, fijo ? 1 : faker.number.int({ min: 1, max: maxDia }));
  const y = ym.slice(0, 4);
  const numero = `${prov.prefijo}${y}/${String(siguiente(`${prov.nif}${y}`, faker.number.int({ min: 10, max: 900 }))).padStart(4, '0')}`;
  const mes = new Date(`${ym}-15`).toLocaleString('es-ES', { month: 'long' });
  const ls = fijo
    ? [{ concepto: `${prov.conceptos[0]} - ${mes} ${y}`, cantidad: 1, precio: base }]
    : prov.layout === 'ticket'
      ? [{ concepto: prov.conceptos[0].toUpperCase(), cantidad: r2(base / 1.2), precio: 1.2 }]
      : lineas(base, prov.conceptos);
  return {
    tipo: 'recibida', categoria: prov.categoria,
    factura: {
      layout: prov.layout, numero, fecha, emisor: prov, receptor: prov.layout === 'ticket' ? undefined : yo,
      lineas: ls, iva_pct: prov.iva_pct, irpf_pct: prov.irpf_pct,
    },
  };
}

async function vaciarBucket() {
  let token: string | undefined;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: config.s3.bucket, ContinuationToken: token }));
    const objetos = (res.Contents ?? []).map((o) => ({ Key: o.Key! }));
    if (objetos.length) await s3.send(new DeleteObjectsCommand({ Bucket: config.s3.bucket, Delete: { Objects: objetos } }));
    token = res.NextContinuationToken;
  } while (token);
}

async function main() {
  const schema = readFileSync(fileURLToPath(new URL('../../db/schema.sql', import.meta.url)), 'utf8');
  const db = await pool.connect();
  await db.query('drop schema public cascade; create schema public;');
  await db.query(schema);
  await ensureBucket();
  await vaciarBucket();

  const asesorIds: number[] = [];
  for (const a of asesores) {
    const { rows } = await db.query('insert into asesores (nombre, email) values ($1, $2) returning id', [a.nombre, a.email]);
    asesorIds.push(rows[0].id);
  }

  let totalFacturas = 0;
  for (const p of perfiles) {
    const c = p.cliente;
    const { rows } = await db.query(
      `insert into clientes (asesor_id, nombre, nif, tipo, sector, email, telefono, notas, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
      [asesorIds[p.asesor], c.nombre, c.nif, c.tipo, c.sector, c.email, c.telefono, c.notas ?? null, '2025-01-10'],
    );
    const clienteId = rows[0].id as number;
    const gens = generar(p);
    const porTrimestre = new Map<string, { ventas: number; ivaRep: number; compras: number; ivaSop: number }>();

    for (const g of gens) {
      const f = g.factura;
      const t = totalesFactura(f);
      const imp = calcularImportes(t.base, f.iva_pct, f.irpf_pct ?? 0);
      const contraparte = g.tipo === 'emitida' ? f.receptor! : f.emisor;
      await db.query(
        `insert into facturas (cliente_id, tipo, numero, fecha, contraparte, contraparte_nif, concepto, categoria,
                               base_imponible, iva_pct, iva_importe, irpf_pct, irpf_importe, total, origen)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          clienteId, g.tipo, f.numero, f.fecha, contraparte.nombre, contraparte.nif ?? null,
          f.lineas.map((l) => l.concepto).join(', '), g.categoria, t.base, f.iva_pct, imp.iva_importe,
          f.irpf_pct ?? 0, imp.irpf_importe, imp.total, f.fecha < '2026-01-01' ? 'importada' : 'manual',
        ],
      );
      totalFacturas++;

      const q = porTrimestre.get(trimestreDe(f.fecha)) ?? { ventas: 0, ivaRep: 0, compras: 0, ivaSop: 0 };
      if (g.tipo === 'emitida') {
        q.ventas += t.base;
        q.ivaRep += imp.iva_importe;
      } else {
        q.compras += t.base;
        q.ivaSop += imp.iva_importe;
      }
      porTrimestre.set(trimestreDe(f.fecha), q);
    }

    for (const [clave, q] of porTrimestre) {
      const [anio, trimestre] = clave.split('-').map(Number);
      const cerrado = anio === 2025 || trimestre <= 2 || (trimestre === 3 && p.cierreQ3);
      if (!cerrado) continue;
      const mesesQ = MESES.filter((ym) => trimestreDe(`${ym}-01`) === clave);
      const sinFactura = p.ventasSinFacturaPct
        * p.ventas.porMes * ((p.ventas.importe[0] + p.ventas.importe[1]) / 2)
        * mesesQ.reduce((s, ym) => s + (p.factorVentas?.(ym) ?? 1), 0) * rnd(0.9, 1.1);
      await db.query(
        `insert into resultados (cliente_id, anio, trimestre, ingresos, gastos, iva_repercutido, iva_soportado, notas)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          clienteId, anio, trimestre, r2(q.ventas + sinFactura), r2(q.compras + p.otrosGastosTrimestre * rnd(0.95, 1.05)),
          r2(q.ivaRep + (sinFactura * p.ventas.iva_pct) / 100), r2(q.ivaSop), p.notasResultados?.[clave] ?? null,
        ],
      );
    }
    console.log(`  ${c.nombre}: ${gens.length} facturas`);
  }

  db.release();
  await pool.end();
  console.log(`\nOK: ${perfiles.length} clientes, ${totalFacturas} facturas. Sin documentos: los PDFs se suben desde la app.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
