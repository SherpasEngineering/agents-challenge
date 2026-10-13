import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { config } from './config';
import { ensureBucket } from './storage';
import clientes from './routes/clientes';
import facturas from './routes/facturas';
import resultados from './routes/resultados';
import documentos from './routes/documentos';

const app = Fastify({ logger: { level: 'info' } });

await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });

app.get('/api/health', async () => ({ ok: true }));
await app.register(clientes, { prefix: '/api' });
await app.register(facturas, { prefix: '/api' });
await app.register(resultados, { prefix: '/api' });
await app.register(documentos, { prefix: '/api' });

await ensureBucket();
await app.listen({ port: config.port, host: '0.0.0.0' });
