import type { FastifyPluginAsync } from 'fastify';
import { one, query } from '../db';

type ResultadoBody = {
  anio: number;
  trimestre: number;
  ingresos: number;
  gastos: number;
  iva_repercutido?: number;
  iva_soportado?: number;
  notas?: string;
};

const routes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>('/clientes/:id/resultados', async (req) =>
    query(
      `select *, ingresos - gastos as resultado, iva_repercutido - iva_soportado as iva_a_pagar
         from resultados where cliente_id = $1 order by anio desc, trimestre desc`,
      [req.params.id],
    ),
  );

  // Crea o reemplaza el resultado de un trimestre.
  app.put<{ Params: { id: string }; Body: ResultadoBody }>('/clientes/:id/resultados', async (req, reply) => {
    const b = req.body;
    if (!b?.anio || !b?.trimestre) return reply.code(400).send({ error: 'anio y trimestre son obligatorios' });
    return one(
      `insert into resultados (cliente_id, anio, trimestre, ingresos, gastos, iva_repercutido, iva_soportado, notas)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (cliente_id, anio, trimestre) do update
         set ingresos = excluded.ingresos, gastos = excluded.gastos, iva_repercutido = excluded.iva_repercutido,
             iva_soportado = excluded.iva_soportado, notas = excluded.notas
       returning *`,
      [req.params.id, b.anio, b.trimestre, b.ingresos ?? 0, b.gastos ?? 0, b.iva_repercutido ?? 0, b.iva_soportado ?? 0, b.notas],
    );
  });

  app.delete<{ Params: { id: string } }>('/resultados/:id', async (req, reply) => {
    await query('delete from resultados where id = $1', [req.params.id]);
    return reply.code(204).send();
  });
};

export default routes;
