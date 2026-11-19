'use client';

import { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { IconArrowDown } from '@tabler/icons-react';
import { RangoliInner, RangoliOuter } from './Rangoli';

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const GOLD = '#B8893B';

/** Fine gold dust in the plate column: position, size (px), depth (how much it moves with cursor and scroll), twinkle timing */
const DUST = [
  { x: '8%', y: '18%', size: 4, depth: 1.4, dur: 9, delay: 0, phone: true },
  { x: '18%', y: '72%', size: 3, depth: 0.7, dur: 11, delay: 2.5, phone: false },
  { x: '30%', y: '8%', size: 2, depth: 0.5, dur: 8, delay: 1.2, phone: false },
  { x: '26%', y: '44%', size: 5, depth: 1.8, dur: 10, delay: 4, phone: true },
  { x: '52%', y: '90%', size: 3, depth: 1.1, dur: 12, delay: 0.6, phone: true },
  { x: '62%', y: '4%', size: 4, depth: 1.5, dur: 9.5, delay: 3.1, phone: false },
  { x: '84%', y: '14%', size: 2.5, depth: 0.6, dur: 10.5, delay: 5, phone: true },
  { x: '92%', y: '48%', size: 4.5, depth: 1.7, dur: 8.5, delay: 1.8, phone: false },
  { x: '78%', y: '84%', size: 3, depth: 0.9, dur: 11.5, delay: 3.8, phone: true },
  { x: '40%', y: '96%', size: 2, depth: 0.5, dur: 9, delay: 6, phone: false },
  { x: '96%', y: '78%', size: 3.5, depth: 1.3, dur: 10, delay: 2.2, phone: false },
  { x: '12%', y: '94%', size: 2.5, depth: 1, dur: 12.5, delay: 4.6, phone: false },
];

/** Soft steam clouds over the curries: position on the plate, size, timing, sideways drift */
const STEAM = [
  { left: '18%', top: '8%', w: '26%', dur: 6.5, delay: 0, drift: '-14%' },
  { left: '42%', top: '0%', w: '30%', dur: 7.5, delay: 2.2, drift: '12%' },
  { left: '64%', top: '12%', w: '24%', dur: 7, delay: 4.1, drift: '-10%' },
];

/**
 * Home hero. Warm editorial look: a large serif headline that rises in line by line, a gold shimmer on the italic line,
 * a steel thali that spins in, floats over its own shadow, turns slowly, tilts toward the cursor (sways on phones) and turns
 * further as you scroll; soft steam, a glint around the rim, drifting gold dust, a gold rangoli turning behind the plate and fine grain.
 * Motion is transform and opacity only, and switches off for people who ask for reduced motion.
 */
export default function HeroBanner() {
  const stage = useRef<HTMLDivElement>(null);

  // Cursor parallax: written straight to CSS variables (no React re-render per mouse move)
  useEffect(() => {
    const el = stage.current;
    if (!el || typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--px', x.toFixed(3));
        el.style.setProperty('--py', y.toFixed(3));
      });
    };
    const onLeave = () => {
      el.style.setProperty('--px', '0');
      el.style.setProperty('--py', '0');
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  // Scroll progress through the hero (0 at the top, 1 once it has scrolled away), only while it is on screen
  useEffect(() => {
    const el = stage.current;
    if (!el || typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let visible = true;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
      el.style.setProperty('--sy', p.toFixed(3));
    };
    const onScroll = () => {
      if (visible && !raf) raf = requestAnimationFrame(update);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) onScroll();
    });
    io.observe(el);
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const scrollToMenu = () => {
    const el = document.getElementById('menu-search');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const rise = (delay: number) => ({
    opacity: 0,
    transform: 'translateY(28px)',
    filter: 'blur(8px)',
    animation: `heroRise 1100ms ${EASE} ${delay}ms forwards`,
  });

  return (
    <Box
      ref={stage}
      component="section"
      aria-label="NikFoods"
      sx={{
        '--px': 0,
        '--py': 0,
        '--sy': 0,
        position: 'relative',
        isolation: 'isolate',
        overflow: 'hidden',
        height: { xs: 232, sm: 330, md: 500 },
        mb: { xs: 0, md: 1 },
        background:
          'radial-gradient(60% 90% at 82% 48%, #F6E3B4 0%, rgba(246,227,180,0) 70%), radial-gradient(40% 60% at 6% 0%, #FFF6E2 0%, rgba(255,246,226,0) 70%), linear-gradient(180deg, #FBF6EC 0%, #F8F0E1 100%)',
        borderBottom: '1px solid rgba(184, 137, 59, 0.28)',
        '@keyframes heroRise': { to: { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' } },
        '@keyframes plateIn': {
          from: { opacity: 0, transform: 'translate3d(60px, 20px, 0) scale(0.86) rotate(-6deg)', filter: 'blur(10px)' },
          to: { opacity: 1, transform: 'translate3d(0,0,0) scale(1) rotate(0)', filter: 'blur(0)' },
        },
        '@keyframes plateFloat': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        '@keyframes orbit': { to: { transform: 'rotate(360deg)' } },
        '@keyframes shimmer': { to: { backgroundPosition: '-200% 0' } },
        '@keyframes plateSpin': { to: { transform: 'rotate(360deg)' } },
        '@keyframes steamRise': {
          '0%': { opacity: 0, transform: 'translate3d(0, 20%, 0) scale(0.6, 0.5)' },
          '30%': { opacity: 0.85 },
          '65%': { opacity: 0.5, transform: 'translate3d(var(--drift), -30%, 0) scale(1, 0.95)' },
          '100%': { opacity: 0, transform: 'translate3d(calc(var(--drift) * -0.5), -78%, 0) scale(1.45, 1.3)' },
        },
        '@keyframes dustFloat': {
          '0%,100%': { opacity: 0.15, transform: 'translate3d(0, 0, 0) scale(0.8)' },
          '50%': { opacity: 1, transform: 'translate3d(6px, -22px, 0) scale(1.1)' },
        },
        '@keyframes rimGlint': { '0%': { transform: 'rotate(0deg)', opacity: 0 }, '8%': { opacity: 1 }, '30%': { opacity: 1 }, '38%,100%': { transform: 'rotate(250deg)', opacity: 0 } },
        '@keyframes shadowFloat': { '0%,100%': { transform: 'scale(1)', opacity: 0.55 }, '50%': { transform: 'scale(0.88)', opacity: 0.38 } },
        '@keyframes lineUp': { from: { transform: 'translateY(105%)' }, to: { transform: 'translateY(0)' } },
        '@keyframes discIn': { from: { transform: 'rotate(-150deg)' }, to: { transform: 'rotate(0deg)' } },
        '@keyframes tiltSway': {
          '0%,100%': { transform: 'rotateX(6deg) rotateY(-8deg)' },
          '50%': { transform: 'rotateX(-5deg) rotateY(9deg)' },
        },
        '@media (hover: none), (pointer: coarse)': { '& .heroTilt': { animation: 'tiltSway 9s ease-in-out infinite' } },
        '@keyframes glowBreath': { '0%,100%': { opacity: 0.75 }, '50%': { opacity: 1 } },
        '@media (prefers-reduced-motion: reduce)': {
          '& *': { animation: 'none !important', opacity: '1 !important', transform: 'none !important', filter: 'none !important' },
          '& .heroSteam': { display: 'none' },
        },
      }}
    >
      {/* Fine grain so the flat cream feels like paper (fixed to the hero, never scrolls) */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          opacity: 0.5,
          mixBlendMode: 'multiply',
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .45  0 0 0 0 .32  0 0 0 0 .12  0 0 0 .07 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
      {/* Brand pattern, faint */}
      <Box
        aria-hidden
        sx={{ position: 'absolute', inset: 0, backgroundImage: 'url(/images/pattern-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.16 }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2.5, sm: 3, md: 4 },
          display: 'grid',
          gridTemplateColumns: { xs: '1.15fr 1fr', md: '1.3fr 1fr' },
          alignItems: 'center',
          gap: { xs: 1, md: 2 },
        }}
      >
        {/* Words */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 1.25, md: 2.25 },
            position: 'relative',
            zIndex: 2,
            transform: 'translate3d(0, calc(var(--sy) * -34px), 0)',
            opacity: 'calc(1 - var(--sy) * 0.5)',
          }}
        >
          <Typography
            component="h1"
            sx={{
              fontFamily: 'var(--font-display), Georgia, serif',
              fontWeight: 600,
              fontSize: { xs: '1.55rem', sm: '2.4rem', md: '3rem', lg: '3.6rem' },
              lineHeight: { xs: 1.08, md: 1.02 },
              letterSpacing: '-0.02em',
              color: '#1F1712',
            }}
          >
            <Box component="span" sx={{ display: 'block', overflow: 'hidden', pb: '0.06em', mb: '-0.06em' }}>
              <Box component="span" sx={{ display: 'block', whiteSpace: { sm: 'nowrap' }, transform: 'translateY(105%)', animation: `lineUp 1100ms ${EASE} 150ms forwards` }}>
                Your American Source for
              </Box>
            </Box>
            <Box component="span" sx={{ display: 'block', overflow: 'hidden', pb: '0.1em' }}>
            <Box
              component="span"
              sx={{
                display: 'block',
                fontStyle: 'italic',
                fontWeight: 500,
                textWrap: 'balance',
                pb: '0.08em',
                transform: 'translateY(105%)',
                // a slow gold light passes over the italic line
                backgroundImage: 'linear-gradient(100deg, #7A561A 0%, #A9772A 30%, #E2BC6A 48%, #A9772A 66%, #7A561A 100%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: '#8A6420',
                animation: `lineUp 1100ms ${EASE} 300ms forwards, shimmer 7s linear 1.6s infinite`,
              }}
            >
              Delicious Indian Food.
            </Box>
            </Box>
          </Typography>

          <Typography
            sx={{
              ...rise(460),
              display: { xs: 'none', sm: 'block' },
              fontSize: { sm: '0.95rem', md: '1.0625rem' },
              color: '#5C4F40',
              maxWidth: 470,
              lineHeight: 1.7,
              textWrap: 'pretty',
            }}
          >
            Order your favorite curries, biryanis, and more for convenient delivery across Greater Seattle Region and we do free deliveries too!
          </Typography>

          {/* Button in a button: the arrow sits in its own circle and nudges on hover */}
          <Box
            component="button"
            type="button"
            onClick={scrollToMenu}
            sx={{
              ...rise(600),
              display: { xs: 'none', md: 'inline-flex' },
              alignSelf: 'flex-start',
              alignItems: 'center',
              gap: 1.5,
              mt: 0.5,
              pl: 2.75,
              pr: 0.75,
              py: 0.75,
              border: 0,
              borderRadius: 999,
              cursor: 'pointer',
              color: '#FBF1DA',
              fontFamily: 'inherit',
              fontSize: 14.5,
              fontWeight: 600,
              letterSpacing: '0.01em',
              background: 'linear-gradient(135deg, #2B1F14 0%, #14100C 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,236,196,0.16), 0 14px 26px -12px rgba(40,26,10,0.6)',
              transition: `transform 500ms ${EASE}, box-shadow 500ms ${EASE}`,
              '&:hover': { boxShadow: 'inset 0 1px 0 rgba(255,236,196,0.22), 0 18px 30px -12px rgba(40,26,10,0.7)' },
              '&:hover .heroArrow': { transform: 'translateY(2px) scale(1.06)' },
              '&:active': { transform: 'scale(0.98)' },
              '&:focus-visible': { outline: '2px solid #C9A24B', outlineOffset: 3 },
            }}
          >
            See the menu
            <Box
              className="heroArrow"
              aria-hidden
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: '#2B1F14',
                background: 'linear-gradient(135deg, #E9C878 0%, #C9A24B 100%)',
                transition: `transform 500ms ${EASE}`,
              }}
            >
              <IconArrowDown size={17} stroke={1.75} />
            </Box>
          </Box>
        </Box>

        {/* Plate */}
        <Box sx={{ position: 'relative', height: '100%', display: 'grid', placeItems: 'center' }}>
          {/* slow warm glow that breathes */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              width: { xs: 190, sm: 300, md: 520 },
              height: { xs: 190, sm: 300, md: 520 },
              borderRadius: '50%',
              right: { xs: -40, sm: -25, md: -40 },
              transform: 'translate3d(calc(var(--px) * -18px), calc(var(--py) * -14px), 0)',
              transition: `transform 900ms ${EASE}`,
            }}
          >
            <Box
              sx={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(236,190,98,0.55) 0%, rgba(236,190,98,0) 68%)',
                animation: 'glowBreath 6s ease-in-out infinite',
              }}
            />
          </Box>
          {/* a fine gold rangoli behind the plate, turning slowly the other way */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              width: { xs: 236, sm: 360, md: 560 },
              height: { xs: 236, sm: 360, md: 560 },
              right: { xs: -63, sm: -55, md: -60 },
              transform: 'translate3d(calc(var(--px) * -10px), calc(var(--py) * -8px + var(--sy) * 20px), 0)',
              transition: `transform 1000ms ${EASE}`,
              opacity: 0,
              animation: `heroRise 1800ms ${EASE} 500ms forwards`,
            }}
          >
            <Box sx={{ position: 'absolute', inset: 0, animation: 'orbit 200s linear infinite reverse' }}>
              <RangoliOuter />
            </Box>
            <Box sx={{ position: 'absolute', inset: 0, animation: 'orbit 90s linear infinite' }}>
              <RangoliInner />
            </Box>
          </Box>

          {/* gold dust drifting at different depths */}
          {DUST.map((d, i) => (
            <Box
              key={i}
              aria-hidden
              sx={{
                display: { xs: d.phone ? 'block' : 'none', sm: 'block' },
                position: 'absolute',
                left: d.x,
                top: d.y,
                width: d.size,
                height: d.size,
                zIndex: d.depth > 1.2 ? 3 : 1,
                transform: `translate3d(calc(var(--px) * ${d.depth * 30}px), calc(var(--py) * ${d.depth * 24}px + var(--sy) * ${-d.depth * 70}px), 0)`,
                transition: `transform 1000ms ${EASE}`,
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 35%, #FFF0C2, #D6A84E 60%, rgba(214,168,78,0) 100%)',
                  boxShadow: `0 0 ${d.size * 2.5}px ${d.size * 0.6}px rgba(232,192,104,0.55)`,
                  opacity: 0,
                  animation: `dustFloat ${d.dur}s ease-in-out ${1.6 + d.delay}s infinite`,
                }}
              />
            </Box>
          ))}

          {/* the plate: spins in, floats, tilts toward the cursor (sways by itself on phones) and turns as you scroll */}
          <Box
            sx={{
              position: 'absolute',
              right: { xs: -20, sm: 7, md: 40 },
              width: { xs: 150, sm: 236, md: 360 },
              height: { xs: 150, sm: 236, md: 360 },
              perspective: '900px',
              transform: 'translate3d(calc(var(--px) * 22px), calc(var(--py) * 16px + var(--sy) * 46px), 0) scale(calc(1 - var(--sy) * 0.08))',
              transition: `transform 700ms ${EASE}`,
              zIndex: 2,
            }}
          >
            {/* contact shadow on the 'table': shrinks and fades as the plate floats up */}
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                left: '12%',
                right: '12%',
                bottom: '-9%',
                height: '14%',
                borderRadius: '50%',
                background: 'radial-gradient(closest-side, rgba(70,40,12,0.42), rgba(70,40,12,0))',
                filter: 'blur(6px)',
                animation: 'shadowFloat 7s ease-in-out 1.8s infinite',
                zIndex: -1,
              }}
            />

            <Box sx={{ width: '100%', height: '100%', animation: `plateIn 1600ms ${EASE} 150ms both` }}>
              <Box sx={{ width: '100%', height: '100%', animation: 'plateFloat 7s ease-in-out 1.8s infinite' }}>
                <Box
                  className="heroTilt"
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    transformStyle: 'preserve-3d',
                    transform: 'rotateX(calc(var(--py) * -14deg)) rotateY(calc(var(--px) * 16deg))',
                    transition: `transform 800ms ${EASE}`,
                  }}
                >
                  {/* a glint of light that runs around the rim every few seconds */}
                  <Box
                    aria-hidden
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      pointerEvents: 'none',
                      background: 'conic-gradient(from 0deg, rgba(255,226,170,0) 0deg, rgba(255,226,170,0.9) 14deg, rgba(255,226,170,0) 30deg, rgba(255,226,170,0) 360deg)',
                      WebkitMask: 'radial-gradient(closest-side, transparent 91%, #000 93%, #000 99%, transparent 100%)',
                      mask: 'radial-gradient(closest-side, transparent 91%, #000 93%, #000 99%, transparent 100%)',
                      opacity: 0,
                      animation: 'rimGlint 9s cubic-bezier(0.45, 0, 0.2, 1) 3s infinite',
                    }}
                  />
                  {/* the thali: spins in on arrival, turns slowly forever, and a little more as you scroll */}
                  <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', boxShadow: '0 30px 40px -14px rgba(60,35,10,0.45), 0 10px 18px -8px rgba(60,35,10,0.35)' }}>
                    <Box sx={{ width: '100%', height: '100%', transform: 'rotate(calc(var(--sy) * 110deg))' }}>
                      <Box sx={{ width: '100%', height: '100%', animation: `discIn 1900ms ${EASE} 150ms both` }}>
                        <Box
                          component="img"
                          src="/images/thali-plate-disc.webp"
                          alt="Indian thali"
                          fetchPriority="high"
                          width={760}
                          height={760}
                          sx={{ display: 'block', width: '100%', height: '100%', animation: 'plateSpin 120s linear 2s infinite', willChange: 'transform' }}
                        />
                      </Box>
                    </Box>
                  </Box>
                  {/* light: a shine that slides against the tilt, plus the rim's inner shadow */}
                  <Box
                    aria-hidden
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      pointerEvents: 'none',
                      background: 'radial-gradient(80% 80% at 75% 85%, rgba(30,14,6,0.16) 0%, rgba(30,14,6,0) 60%)',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: '-30%',
                        background: 'radial-gradient(35% 28% at 38% 30%, rgba(255,250,236,0.22) 0%, rgba(255,250,236,0) 70%)',
                        transform: 'translate3d(calc(var(--px) * -22%), calc(var(--py) * -22%), 0)',
                        transition: `transform 800ms ${EASE}`,
                      }}
                    />
                  </Box>
                  {/* steam curling off the hot dishes, lifted toward the viewer */}
                  {STEAM.map((w, i) => (
                    <Box
                      key={i}
                      className="heroSteam"
                      aria-hidden
                      sx={{
                        '--drift': w.drift,
                        position: 'absolute',
                        left: w.left,
                        top: w.top,
                        width: w.w,
                        height: '50%',
                        opacity: 0,
                        pointerEvents: 'none',
                        mixBlendMode: 'screen',
                        filter: 'blur(9px)',
                        background:
                          'radial-gradient(40% 30% at 50% 70%, rgba(255,246,230,0.75) 0%, rgba(255,246,230,0) 70%), radial-gradient(30% 26% at 42% 38%, rgba(255,246,230,0.55) 0%, rgba(255,246,230,0) 72%), radial-gradient(26% 22% at 58% 12%, rgba(255,246,230,0.4) 0%, rgba(255,246,230,0) 75%)',
                        animation: `steamRise ${w.dur}s cubic-bezier(0.3, 0.1, 0.3, 1) ${2.4 + w.delay}s infinite`,
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>

          </Box>
        </Box>
      </Box>
    </Box>
  );
}

