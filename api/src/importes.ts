const r2 = (n: number) => Math.round(n * 100) / 100;

export function calcularImportes(base: number, ivaPct: number, irpfPct = 0) {
  const iva_importe = r2((base * ivaPct) / 100);
  const irpf_importe = r2((base * irpfPct) / 100);
  return { iva_importe, irpf_importe, total: r2(base + iva_importe - irpf_importe) };
}
