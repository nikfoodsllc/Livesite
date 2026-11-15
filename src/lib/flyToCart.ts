/**
 * A small round copy of the dish photo flies from the button that was tapped to the cart bar at the bottom of the screen,
 * along a gentle arc. Purely decorative: skipped for people who prefer reduced motion, and it removes itself when done.
 */
export function flyToCart(from: Element | null, imageUrl?: string): void {
  if (typeof window === 'undefined' || !from || typeof Element.prototype.animate !== 'function') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const r = from.getBoundingClientRect();
  const SIZE = 46;
  const startX = r.left + r.width / 2 - SIZE / 2;
  const startY = r.top + r.height / 2 - SIZE / 2;
  // the cart bar is always centred near the bottom edge
  const endX = window.innerWidth / 2 - SIZE / 2;
  const endY = window.innerHeight - 44 - SIZE / 2;

  const dot = document.createElement('div');
  dot.setAttribute('aria-hidden', 'true');
  Object.assign(dot.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: `${SIZE}px`,
    height: `${SIZE}px`,
    borderRadius: '50%',
    zIndex: '1400',
    pointerEvents: 'none',
    background: imageUrl ? `#E9C878 url("${imageUrl.replace(/"/g, '%22')}") center / cover no-repeat` : 'linear-gradient(135deg, #E9C878, #C9A24B)',
    boxShadow: '0 0 0 2px #E9C878, 0 12px 24px -6px rgba(20,10,0,0.55)',
    willChange: 'transform, opacity',
  } as Partial<CSSStyleDeclaration>);
  document.body.appendChild(dot);

  const midX = (startX + endX) / 2;
  const midY = Math.min(startY, endY) - 70; // the arc rises first
  const anim = dot.animate(
    [
      { transform: `translate(${startX}px, ${startY}px) scale(1)`, opacity: 1, offset: 0 },
      { transform: `translate(${midX}px, ${midY}px) scale(0.8)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${endX}px, ${endY}px) scale(0.3)`, opacity: 0.15, offset: 1 },
    ],
    { duration: 780, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' }
  );
  const done = () => dot.remove();
  anim.onfinish = done;
  anim.oncancel = done;
}
