import type { FastifyPluginAsync } from 'fastify';
import { one, query } from '../db';
import { calcularImportes } from '../importes';

type FacturaBody = {
  tipo: 'emitida' | 'recibida';
  numero?: string;
  fecha: string;
  contraparte?: string;
  contraparte_nif?: string;
  concepto?: string;
  categoria?: string;
  base_imponible: number;
  iva_pct?: number;
  irpf_pct?: number;
  documento_id?: number | null;
};

const routes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string }; Querystring: { tipo?: string; anio?: string; trimestre?: string } }>(
    '/clientes/:id/facturas',
    async (req) => {
      const { tipo, anio, trimestre } = req.query;
      return query(
        `select f.*, d.nombre as documento_nombre
           from facturas f
           left join documentos d on d.id = f.documento_id
          where f.cliente_id = $1
            and ($2::text is null or f.tipo = $2)
            and ($3::int is null or extract(year from f.fecha) = $3)
            and ($4::int is null or extract(quarter from f.fecha) = $4)
          order by f.fecha desc, f.id desc`,
        [req.params.id, tipo || null, anio || null, trimestre || null],
      );
    },
  );

  app.post<{ Params: { id: string }; Body: FacturaBody }>('/clientes/:id/facturas', async (req, reply) => {
    const b = req.body;
    if (!b?.fecha || b.base_imponible == null || !['emitida', 'recibida'].includes(b.tipo)) {
      return reply.code(400).send({ error: 'tipo, fecha y base_imponible son obligatorios' });
    }
    const base = Number(b.base_imponible);
    const ivaPct = Number(b.iva_pct ?? 21);
    const irpfPct = Number(b.irpf_pct ?? 0);
    const { iva_importe, irpf_importe, total } = calcularImportes(base, ivaPct, irpfPct);

    const factura = await one(
      `insert into facturas (cliente_id, tipo, numero, fecha, contraparte, contraparte_nif, concepto, categoria,
                             base_imponible, iva_pct, iva_importe, irpf_pct, irpf_importe, total, documento_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) returning *`,
      [
        req.params.id, b.tipo, b.numero, b.fecha, b.contraparte, b.contraparte_nif, b.concepto, b.categoria,
        base, ivaPct, iva_importe, irpfPct, irpf_importe, total, b.documento_id ?? null,
      ],
    );
    if (b.documento_id) {
      await query(`update documentos set estado = 'procesado' where id = $1`, [b.documento_id]);
    }
    return reply.code(201).send(factura);
  });

  app.delete<{ Params: { id: string } }>('/facturas/:id', async (req, reply) => {
    const borrada = await one<{ documento_id: number | null }>('delete from facturas where id = $1 returning documento_id', [req.params.id]);
    if (borrada?.documento_id) {
      await query(
        `update documentos set estado = 'subido'
          where id = $1 and not exists (select 1 from facturas where documento_id = $1)`,
        [borrada.documento_id],
      );
    }
    return reply.code(204).send();
  });
};

export default routes;
