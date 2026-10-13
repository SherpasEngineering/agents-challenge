import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const envFile = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const env = process.env;

export const config = {
  port: Number(env.API_PORT ?? 3000),
  databaseUrl: env.DATABASE_URL ?? `postgres://asesoria:asesoria@localhost:${env.PG_PORT ?? 5432}/asesoria`,
  s3: {
    endpoint: env.S3_ENDPOINT ?? `http://localhost:${env.MINIO_PORT ?? 9000}`,
    accessKeyId: env.S3_ACCESS_KEY ?? 'minioadmin',
    secretAccessKey: env.S3_SECRET_KEY ?? 'minioadmin',
    bucket: env.S3_BUCKET ?? 'documentos',
  },
};
