# Asesoría · Panel

App interna para asesores de autónomos y pequeñas empresas. Cada asesor lleva una cartera de clientes y, por cliente:

- registra facturas emitidas (ventas) y recibidas (gastos), a mano o subiendo el PDF,
- cierra los resultados de cada trimestre,
- ve gráficas del cliente.

> El reto está en [`CHALLENGE.md`](CHALLENGE.md).

## Arrancar

Requisitos: Node 22+ y Docker.

```bash
docker compose up -d   # Postgres + MinIO
npm install
npm run seed           # datos de ejemplo (borra y recrea todo)
npm run dev            # API en :3000 y web en :5173
```

Abre http://localhost:5173.

| Servicio | Dónde | Credenciales |
| --- | --- | --- |
| Web | http://localhost:5173 | — |
| API | http://localhost:3000/api | — |
| Postgres | `localhost:5432`, base `asesoria` | `asesoria` / `asesoria` |
| MinIO (S3) | `localhost:9000`, consola http://localhost:9001, bucket `documentos` | `minioadmin` / `minioadmin` |

¿Algún puerto ocupado? Copia `.env.example` a `.env`, cambia el puerto y vuelve a levantar `docker compose` y `npm run dev`.

## Qué hay

```
db/schema.sql        esquema de Postgres
api/                 Fastify + TypeScript (SQL a pelo con pg, S3 con aws-sdk)
  src/routes/        clientes, facturas, resultados, documentos
  scripts/seed.ts    genera clientes, facturas y resultados (sin PDFs)
  scripts/pdf.ts     plantillas de factura (3 formatos) y contrato de alquiler, para reto/ejemplos
web/                 React + Vite + recharts
  src/pages/         listado y ficha de cliente
  src/components/    pestañas de la ficha y la burbuja de chat (vacía)
reto/ejemplos/       PDFs de ejemplo + extracción esperada (para el reto)
```

## Los datos de ejemplo

- 2 asesores y 4 clientes ficticios (Valencia): un bar, una diseñadora autónoma, un taller y una empresa de transportes.
- Facturas de enero 2025 a octubre 2026 (~970) y resultados trimestrales. Hoy es el 10/10/2026: octubre está a medias.
- **Sin PDFs**: las facturas no tienen documento y MinIO está vacío. Para probar el flujo de PDF, sube los de `reto/ejemplos/` en su cliente (Facturas → Añadir desde PDF). Ninguno está metido como factura.
- El **3T 2026 solo está cerrado en el taller**: en el resto hay facturas pero no resultados.
- Resultados y facturas **no cuadran a propósito**: los resultados salen de la contabilidad (cobros en caja, nóminas, cuotas de autónomos...) y las facturas son solo facturas.

`npm run seed` es determinista: siempre genera lo mismo.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | API + web con recarga |
| `npm run seed` | Borra Postgres y el bucket y vuelve a generar los datos |
| `npm run ejemplos` | Regenera `reto/ejemplos/` |
| `npm run typecheck` | Comprueba tipos en api y web |
