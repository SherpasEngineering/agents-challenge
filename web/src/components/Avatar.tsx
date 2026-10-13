function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export default function Avatar({ nombre, size = 32 }: { nombre: string; size?: number }) {
  const h = hash(nombre);
  const iniciales = nombre.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${h} 70% 62%), hsl(${(h + 50) % 360} 75% 52%))`,
      }}
    >
      {iniciales}
    </span>
  );
}
