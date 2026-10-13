# Reto: IA en el panel de asesoría

App interna para asesores de autónomos y pymes: clientes, facturas, resultados trimestrales y gráficas ([README](README.md) para arrancarla). Queremos meter **dos IAs** y que nos digas **cómo lo harías**.

**No hay que implementar nada.** Buscamos un análisis: opciones, puntos fuertes y débiles, qué recomiendas y por qué.

## Restricción: la IA es un servicio aparte

Hay **dos máquinas**:

- **Máquina 1, la app:** API, web, Postgres y MinIO (este repo).
- **Máquina 2, el servicio de IA:** las dos IAs, extracción y chat, en un mismo servicio.

Nada de código de IA en `api/` ni en `web/`. La app sigue siendo la dueña de los datos y de la pantalla, y si la máquina de IA cae o va lenta, la app sigue funcionando.

---

## IA 1: extracción de PDFs

En Facturas → "Añadir desde PDF" el asesor sube PDFs. El botón "Extraer con IA" (hoy desactivado) los tiene que convertir en filas de `facturas` ([`db/schema.sql`](db/schema.sql)). La pantalla nos importa poco: **nos importa el pipeline**.

En [`reto/ejemplos/`](reto/ejemplos/) hay 7 PDFs, cada uno con lo que esperamos sacar (`.esperado.json`, formato orientativo):

| Ejemplo | Cliente | Lo difícil |
| --- | --- | --- |
| `01-alquiler-con-retencion` | Bar | Retención de IRPF: total = base + IVA − IRPF |
| `02-factura-emitida-autonoma` | Laura | El cliente es el emisor: es un ingreso, no un gasto |
| `03-ticket-gasolinera` | Transportes | Sin receptor; el total incluye el IVA |
| `04-varios-tipos-iva` | Bar | Dos tipos de IVA; el esquema solo tiene un `iva_pct` |
| `05-contrato-alquiler` | Bar | No es una factura: no sale ninguna fila |
| `06-factura-larga-peajes` | Transportes | 5 páginas, 132 líneas, "Suma y sigue" en cada página, totales en la última |
| `07-varias-facturas-un-pdf` | Laura | 4 facturas en un PDF, una página repetida |

Lo que queremos que pienses:

- **PDFs largos:** ¿todo de golpe, página a página o por trozos? ¿Cómo sabes dónde empieza y acaba cada factura? ¿Cómo juntas la cabecera (página 1) con los totales (última página)?
- **¿PDF directo o preprocesado?** Pasar el PDF o las imágenes a un modelo multimodal, o sacar antes el texto (capa de texto, OCR, Markdown) y pasar solo eso. Calidad, tokens, coste y latencia de cada opción. ¿Cambia la respuesta si el PDF es un escaneo?
- **Velocidad:** ¿qué se puede paralelizar? ¿Síncrono o en cola? ¿Cuánto tardaría el 06?
- **Coste:** por documento y al mes, con tus supuestos de volumen. Modelo grande o pequeño, cascadas, caché, cuándo no hace falta un LLM.
- **Qué hace el modelo y qué hace el código:** IVA, IRPF, totales, desglose, NIF, fechas, emitida o recibida... ¿Qué calculas o compruebas de forma determinista? ¿Qué haces cuando no cuadra?
- **Duplicados** y **documentos que no son facturas**.

---

## IA 2: chat del asesor

Una burbuja en toda la app (la carcasa está abajo a la derecha) que sabe en qué cliente y pestaña está el asesor. Aquí nos importa **cómo llega a todos los datos y cómo actúa sobre la app**.

Cosas que le pedirían:

- "¿Cómo va Talleres Brío este año comparado con 2025?"
- "¿Qué clientes de mi cartera están en pérdidas?"
- "¿Qué IVA le va a salir al bar en el 3T?" (no está cerrado: solo hay facturas)
- "¿Cuándo vence el contrato del local del bar?" (sube antes el ejemplo 05)
- "Crea la factura de este PDF" · "Añade los resultados del 3T: ingresos 46.000, gastos 39.000"
- "Llévame a las facturas recibidas del 2T de Transportes Rápidos"

Lo que queremos que pienses:

- **Acceso a los datos:** tools sobre nuestra API, text-to-SQL contra Postgres, RAG sobre los documentos, MCP... ¿Qué usarías para qué? ¿Cómo evitas que se invente cifras? Ojo: resultados y facturas **no cuadran a propósito**; tiene que saber de qué fuente sale cada cifra.
- **Actuar sobre la app:** navegar, rellenar, crear, borrar. ¿Quién ejecuta la acción, quién comprueba los permisos (un asesor solo ve sus clientes) y cuándo pide confirmación?
- **Protocolos:** cómo hablan la web, la API y el servicio de IA (REST, MCP, function calling, colas, SSE o WebSocket para el streaming). Quién llama a quién y cómo se autentican.

---

## Qué te pedimos

Para cada IA:

1. **2–3 enfoques**, con puntos fuertes y débiles.
2. **Tu recomendación**: qué harías primero y qué después.
3. **Un diagrama** de cómo hablan la app y el servicio de IA.
4. **Qué no harías** y por qué.

Si te da tiempo, elige alguno de estos: privacidad (datos fiscales, RGPD), prompt injection desde un PDF, cómo sabes que funciona (evals), observabilidad.

## Entregable y calendario

- **Formato libre**: Markdown, HTML, slides, un diagrama... **Que se lea en unos 20 minutos**: mejor una tabla y un diagrama que diez páginas.
- **Puedes usar IA, pero el documento tiene que ser tuyo.** Lo vamos a discutir y tienes que poder defender cada decisión.
- Si pruebas algo (un prompt o un script contra los ejemplos 06 y 07), cuéntanos qué viste. Es opcional.

1. **Hoy** recibes el reto: **24 h** para investigar y preparar una primera versión.
2. **Sesión con nosotros**: nos lo cuentas y te damos feedback.
3. **24 h** más para entregar la versión final.

Valoramos **criterio** (elegir y descartar con motivos), **autonomía**, **claridad** (que podamos decir "tira por ahí") y **honestidad** (qué no sabes y qué habría que probar).

## El repo en un minuto

- Esquema: [`db/schema.sql`](db/schema.sql). API: [`api/src/routes/`](api/src/routes/).
- La IA se enchufaría en "Extraer con IA" de [`FacturasTab.tsx`](web/src/components/FacturasTab.tsx) y en [`ChatBurbuja.tsx`](web/src/components/ChatBurbuja.tsx).
- Datos: 4 clientes, enero 2025 a octubre 2026, sin PDFs. Detalles en el [README](README.md#los-datos-de-ejemplo).
