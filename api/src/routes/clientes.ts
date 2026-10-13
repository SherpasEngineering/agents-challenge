import type { FastifyPluginAsync } from 'fastify';
import { one, query } from '../db';
import { deleteObject } from '../storage';

type Id = { Params: { id: string } };

type ClienteBody = {
  nombre: string;
  nif?: string;
  tipo?: 'autonomo' | 'sociedad';
  sector?: string;
  email?: string;
  telefono?: string;
  notas?: string;
  asesor_id?: number | null;
};

const routes: FastifyPluginAsync = async (app) => {
  app.get('/asesores', async () => query('select * from asesores order by nombre'));

  app.get<{ Querystring: { q?: string } }>('/clientes', async (req) => {
    const q = req.query.q?.trim();
    return query(
      `select c.id, c.nombre, c.nif, c.tipo, c.sector, a.nombre as asesor,
              (select count(*)::int from facturas f where f.cliente_id = c.id) as num_facturas,
              (select count(*)::int from documentos d where d.cliente_id = c.id) as num_documentos
         from clientes c
         left join asesores a on a.id = c.asesor_id
        where $1::text is null or c.nombre ilike '%' || $1 || '%' or c.nif ilike '%' || $1 || '%'
        order by c.nombre`,
      [q || null],
    );
  });

  app.get<Id>('/clientes/:id', async (req, reply) => {
    const cliente = await one(
      `select c.*, a.nombre as asesor from clientes c left join asesores a on a.id = c.asesor_id where c.id = $1`,
      [req.params.id],
    );
    if (!cliente) return reply.code(404).send({ error: 'Cliente no encontrado' });
    return cliente;
  });

  app.post<{ Body: ClienteBody }>('/clientes', async (req, reply) => {
    const b = req.body;
    if (!b?.nombre) return reply.code(400).send({ error: 'nombre es obligatorio' });
    const cliente = await one(
      `insert into clientes (nombre, nif, tipo, sector, email, telefono, notas, asesor_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
      [b.nombre, b.nif, b.tipo ?? 'autonomo', b.sector, b.email, b.telefono, b.notas, b.asesor_id ?? null],
    );
    return reply.code(201).send(cliente);
  });

  app.put<Id & { Body: ClienteBody }>('/clientes/:id', async (req, reply) => {
    const b = req.body;
    const cliente = await one(
      `update clientes set nombre = $2, nif = $3, tipo = $4, sector = $5, email = $6, telefono = $7,
              notas = $8, asesor_id = $9
        where id = $1 returning *`,
      [req.params.id, b.nombre, b.nif, b.tipo ?? 'autonomo', b.sector, b.email, b.telefono, b.notas, b.asesor_id ?? null],
    );
    if (!cliente) return reply.code(404).send({ error: 'Cliente no encontrado' });
    return cliente;
  });

  app.delete<Id>('/clientes/:id', async (req, reply) => {
    const docs = await query<{ s3_key: string }>('select s3_key from documentos where cliente_id = $1', [req.params.id]);
    await query('delete from clientes where id = $1', [req.params.id]);
    await Promise.allSettled(docs.map((d) => deleteObject(d.s3_key)));
    return reply.code(204).send();
  });

  // Datos para las gráficas de la pestaña "Resumen".
  app.get<Id & { Querystring: { anio?: string } }>('/clientes/:id/resumen', async (req) => {
    const anio = Number(req.query.anio ?? new Date().getFullYear());
    const resultados = await query(
      `select anio, trimestre, ingresos, gastos, ingresos - gastos as resultado,
              iva_repercutido - iva_soportado as iva_a_pagar
         from resultados where cliente_id = $1 order by anio, trimestre`,
      [req.params.id],
    );
    const facturasPorTrimestre = await query(
      `select extract(year from fecha)::int as anio, extract(quarter from fecha)::int as trimestre,
              coalesce(sum(base_imponible) filter (where tipo = 'emitida'), 0)::float as ventas,
              coalesce(sum(base_imponible) filter (where tipo = 'recibida'), 0)::float as compras
         from facturas where cliente_id = $1
        group by 1, 2 order by 1, 2`,
      [req.params.id],
    );
    const gastosPorCategoria = await query(
      `select coalesce(categoria, 'sin categoría') as categoria, sum(base_imponible)::float as total
         from facturas
        where cliente_id = $1 and tipo = 'recibida' and extract(year from fecha) = $2
        group by 1 order by 2 desc`,
      [req.params.id, anio],
    );
    return { anio, resultados, facturasPorTrimestre, gastosPorCategoria };
  });
};

export default routes;
