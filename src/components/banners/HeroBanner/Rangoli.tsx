import { useId } from 'react';

/*
 * A fine gold rangoli drawn around the hero plate (the plate covers the middle, so the design lives in a band from
 * radius 132 to 198 of a 400 x 400 box). Two layers: the outer lotus ring and the inner bead ring, which the hero turns in
 * opposite directions. Everything is computed once; no images.
 */

const C = 200;
const polar = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
};
const n = (v: number) => v.toFixed(2);

/** A petal pointing outward at angle deg, from radius r0 to r1, with half-width w (in degrees at the widest point) */
function petal(deg: number, r0: number, r1: number, w: number) {
  const [x0, y0] = polar(r0, deg);
  const [xa, ya] = polar(r0 + (r1 - r0) * 0.45, deg - w);
  const [xb, yb] = polar(r0 + (r1 - r0) * 0.45, deg + w);
  const [xt, yt] = polar(r1, deg);
  const [xc, yc] = polar(r1 - (r1 - r0) * 0.12, deg - w * 0.35);
  const [xd, yd] = polar(r1 - (r1 - r0) * 0.12, deg + w * 0.35);
  return `M${n(x0)} ${n(y0)} C${n(xa)} ${n(ya)} ${n(xc)} ${n(yc)} ${n(xt)} ${n(yt)} C${n(xd)} ${n(yd)} ${n(xb)} ${n(yb)} ${n(x0)} ${n(y0)}Z`;
}

/** Small scallops (arcs bulging outward) all the way round at radius r */
function scallops(r: number, count: number, depth: number) {
  let d = '';
  for (let i = 0; i < count; i++) {
    const a0 = (360 / count) * i;
    const a1 = a0 + 360 / count;
    const [x0, y0] = polar(r, a0);
    const [xm, ym] = polar(r + depth, (a0 + a1) / 2);
    const [x1, y1] = polar(r, a1);
    d += `${i === 0 ? `M${n(x0)} ${n(y0)}` : ''} Q${n(xm)} ${n(ym)} ${n(x1)} ${n(y1)}`;
  }
  return d;
}

export function RangoliOuter() {
  const id = useId().replace(/:/g, '');
  const LOTUS = 16;
  const step = 360 / LOTUS;
  return (
    <svg viewBox="0 0 400 400" width="100%" height="100%" fill="none" aria-hidden>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E3C27A" />
          <stop offset="0.5" stopColor="#B8893B" />
          <stop offset="1" stopColor="#D9B064" />
        </linearGradient>
        <radialGradient id={`f${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.7" stopColor="#E9C878" stopOpacity="0" />
          <stop offset="0.86" stopColor="#E9C878" stopOpacity="0.16" />
          <stop offset="1" stopColor="#E9C878" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* faint gold wash under the petals */}
      <circle cx={C} cy={C} r={196} fill={`url(#f${id})`} />

      <g stroke={`url(#g${id})`} strokeLinecap="round" strokeLinejoin="round">
        {/* base circles */}
        <circle cx={C} cy={C} r={146} strokeWidth={0.9} opacity={0.7} />
        <path d={scallops(146, 48, 4.5)} strokeWidth={0.8} opacity={0.65} />

        {/* big lotus petals: outline, inner petal, centre vein and a bead at the tip */}
        {Array.from({ length: LOTUS }, (_, i) => {
          const a = step * i;
          const [tx, ty] = polar(191, a);
          return (
            <g key={`l${i}`}>
              <path d={petal(a, 150, 187, 7.2)} strokeWidth={1} fill="rgba(233,200,120,0.07)" />
              <path d={petal(a, 155, 178, 3.6)} strokeWidth={0.7} opacity={0.75} />
              <path d={`M${polar(158, a).map(n).join(' ')} L${polar(172, a).map(n).join(' ')}`} strokeWidth={0.6} opacity={0.6} />
              <circle cx={tx} cy={ty} r={1.7} fill="#C9A24B" stroke="none" />
            </g>
          );
        })}

        {/* small buds between the lotus petals, with a dot above each */}
        {Array.from({ length: LOTUS }, (_, i) => {
          const a = step * i + step / 2;
          const [dx, dy] = polar(180, a);
          return (
            <g key={`b${i}`}>
              <path d={petal(a, 151, 171, 4)} strokeWidth={0.8} opacity={0.8} />
              <circle cx={dx} cy={dy} r={1.1} fill="#C9A24B" stroke="none" opacity={0.85} />
            </g>
          );
        })}

        {/* outer dotted ring: big and small beads */}
        <circle cx={C} cy={C} r={196} strokeWidth={0.6} opacity={0.35} />
      </g>
      <g fill="#C9A24B" stroke="none">
        {Array.from({ length: 64 }, (_, i) => {
          const [x, y] = polar(196, (360 / 64) * i);
          return <circle key={`d${i}`} cx={x} cy={y} r={i % 4 === 0 ? 1.9 : 0.9} opacity={i % 4 === 0 ? 0.9 : 0.6} />;
        })}
      </g>
    </svg>
  );
}

export function RangoliInner() {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 400 400" width="100%" height="100%" fill="none" aria-hidden>
      <defs>
        <linearGradient id={`h${id}`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E3C27A" />
          <stop offset="1" stopColor="#B8893B" />
        </linearGradient>
      </defs>
      <g stroke={`url(#h${id})`} strokeLinecap="round">
        <circle cx={C} cy={C} r={139} strokeWidth={0.7} opacity={0.6} />
        <circle cx={C} cy={C} r={134} strokeWidth={0.5} strokeDasharray="1 3.2" opacity={0.7} />
        {/* tiny diamonds strung around the plate */}
        {Array.from({ length: 36 }, (_, i) => {
          const a = 10 * i;
          const p = [polar(142.5, a), polar(139, a + 1.6), polar(135.5, a), polar(139, a - 1.6)];
          return <path key={i} d={`M${p.map(([x, y]) => `${n(x)} ${n(y)}`).join(' L')}Z`} strokeWidth={0.6} fill="rgba(201,162,75,0.35)" />;
        })}
      </g>
    </svg>
  );
}
