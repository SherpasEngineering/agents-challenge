import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { one, query } from '../db';
import { deleteObject, getObject, putObject } from '../storage';

const routes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>('/clientes/:id/documentos', async (req) =>
    query(
      `select d.*, (select count(*)::int from facturas f where f.documento_id = d.id) as num_facturas
         from documentos d where d.cliente_id = $1 order by d.subido_en desc`,
      [req.params.id],
    ),
  );

  app.post<{ Params: { id: string } }>('/clientes/:id/documentos', async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: 'Falta el fichero' });
    const buffer = await file.toBuffer();
    const key = `clientes/${req.params.id}/${randomUUID()}-${file.filename}`;
    await putObject(key, buffer, file.mimetype);
    const doc = await one(
      `insert into documentos (cliente_id, nombre, s3_key, content_type, tamano_bytes)
       values ($1, $2, $3, $4, $5) returning *`,
      [req.params.id, file.filename, key, file.mimetype, buffer.length],
    );
    return reply.code(201).send(doc);
  });

  app.get<{ Params: { id: string } }>('/documentos/:id/archivo', async (req, reply) => {
    const doc = await one('select * from documentos where id = $1', [req.params.id]);
    if (!doc) return reply.code(404).send({ error: 'Documento no encontrado' });
    const stream = await getObject(doc.s3_key);
    return reply
      .type(doc.content_type ?? 'application/octet-stream')
      .header('content-disposition', `inline; filename*=UTF-8''${encodeURIComponent(doc.nombre)}`)
      .send(stream);
  });

  app.delete<{ Params: { id: string } }>('/documentos/:id', async (req, reply) => {
    const doc = await one('delete from documentos where id = $1 returning s3_key', [req.params.id]);
    if (doc) await deleteObject(doc.s3_key);
    return reply.code(204).send();
  });
};

export default routes;
