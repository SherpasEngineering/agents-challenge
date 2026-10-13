-- Esquema de la app de asesoría. Se aplica al crear el contenedor y en cada `npm run seed`.

create table asesores (
  id serial primary key,
  nombre text not null,
  email text not null unique
);

create table clientes (
  id serial primary key,
  asesor_id int references asesores(id),
  nombre text not null,                       -- razón social o nombre del autónomo
  nif text,
  tipo text not null default 'autonomo',      -- autonomo | sociedad
  sector text,
  email text,
  telefono text,
  notas text,
  created_at timestamptz not null default now()
);

create table documentos (
  id serial primary key,
  cliente_id int not null references clientes(id) on delete cascade,
  nombre text not null,
  s3_key text not null,                       -- clave en el bucket de MinIO
  content_type text,
  tamano_bytes int,
  estado text not null default 'subido',      -- subido | procesado
  subido_en timestamptz not null default now()
);

create table facturas (
  id serial primary key,
  cliente_id int not null references clientes(id) on delete cascade,
  tipo text not null,                         -- emitida (venta) | recibida (gasto)
  numero text,
  fecha date not null,
  contraparte text,                           -- a quién se factura / quién factura
  contraparte_nif text,
  concepto text,
  categoria text,
  base_imponible numeric(12,2) not null,
  iva_pct numeric(5,2) not null default 21,
  iva_importe numeric(12,2) not null,
  irpf_pct numeric(5,2) not null default 0,
  irpf_importe numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  documento_id int references documentos(id) on delete set null,
  origen text not null default 'manual',      -- manual | importada
  created_at timestamptz not null default now()
);

-- Resultados trimestrales que mete el asesor (salen de la contabilidad, no solo de facturas).
create table resultados (
  id serial primary key,
  cliente_id int not null references clientes(id) on delete cascade,
  anio int not null,
  trimestre int not null check (trimestre between 1 and 4),
  ingresos numeric(12,2) not null default 0,
  gastos numeric(12,2) not null default 0,
  iva_repercutido numeric(12,2) not null default 0,
  iva_soportado numeric(12,2) not null default 0,
  notas text,
  unique (cliente_id, anio, trimestre)
);

create index on facturas (cliente_id, fecha);
create index on documentos (cliente_id);
