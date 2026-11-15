'use client';

import { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { IconArrowDown } from '@tabler/icons-react';

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const GOLD = '#B8893B';

/**
 * Home hero. Warm editorial look: a large serif headline that rises in line by line, a gold shimmer on the italic line,
 * a plate that settles in and then floats and follows the cursor a little, orbiting gold rings, soft steam and fine grain.
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
        '@keyframes steam': {
          '0%': { opacity: 0, transform: 'translateY(26px) scaleX(0.8)' },
          '30%': { opacity: 0.55 },
          '100%': { opacity: 0, transform: 'translateY(-70px) scaleX(1.25)' },
        },
        '@media (prefers-reduced-motion: reduce)': {
          '& *': { animation: 'none !important', opacity: '1 !important', transform: 'none !important', filter: 'none !important' },
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.25, md: 2.25 }, position: 'relative', zIndex: 2 }}>
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
            <Box component="span" sx={{ display: 'block', whiteSpace: { sm: 'nowrap' }, ...rise(160) }}>
              Your American Source for
            </Box>
            <Box
              component="span"
              sx={{
                display: 'block',
                fontStyle: 'italic',
                fontWeight: 500,
                textWrap: 'balance',
                pb: '0.08em',
                ...rise(300),
                // a slow gold light passes over the italic line
                backgroundImage: 'linear-gradient(100deg, #7A561A 0%, #A9772A 30%, #E2BC6A 48%, #A9772A 66%, #7A561A 100%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: '#8A6420',
                animation: `heroRise 1100ms ${EASE} 300ms forwards, shimmer 7s linear 1.6s infinite`,
              }}
            >
              Delicious Indian Food.
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
          {/* slow warm glow */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              width: { xs: 190, sm: 300, md: 520 },
              height: { xs: 190, sm: 300, md: 520 },
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(236,190,98,0.55) 0%, rgba(236,190,98,0) 68%)',
              right: { xs: -50, md: -20 },
              transform: 'translate3d(calc(var(--px) * -18px), calc(var(--py) * -14px), 0)',
              transition: `transform 900ms ${EASE}`,
            }}
          />
          {/* orbiting gold rings with a bead on each */}
          {[
            { size: { xs: 170, sm: 270, md: 440 }, dur: 46, alpha: 0.5, dir: 'normal' },
            { size: { xs: 214, sm: 336, md: 540 }, dur: 70, alpha: 0.26, dir: 'reverse' },
          ].map((r, i) => (
            <Box
              key={i}
              aria-hidden
              sx={{
                position: 'absolute',
                width: r.size,
                height: r.size,
                right: { xs: -30, sm: -10, md: i ? -50 : 0 },
                borderRadius: '50%',
                border: `1px solid rgba(184,137,59,${r.alpha})`,
                animation: `orbit ${r.dur}s linear infinite ${r.dir}`,
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: -4,
                  left: '50%',
                  width: 8,
                  height: 8,
                  marginLeft: -4,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 30% 30%, #F4D58A, #B8893B)',
                  boxShadow: '0 0 12px 2px rgba(226,188,106,0.7)',
                },
              }}
            />
          ))}

          {/* steam */}
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              aria-hidden
              sx={{
                display: { xs: 'none', md: 'block' },
                position: 'absolute',
                top: '14%',
                right: `${28 + i * 17}%`,
                width: 54,
                height: 120,
                borderRadius: '50%',
                background: 'radial-gradient(ellipse, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 70%)',
                filter: 'blur(10px)',
                opacity: 0,
                animation: `steam 5.5s ease-out ${1.4 + i * 1.7}s infinite`,
                zIndex: 3,
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* the plate: settles in, then floats; the wrapper follows the cursor */}
          <Box
            sx={{
              position: 'absolute',
              right: { xs: -14, sm: 0, md: 6 },
              width: { xs: 196, sm: 300, md: 480 },
              height: { xs: 196, sm: 300, md: 480 },
              transform: 'translate3d(calc(var(--px) * 22px), calc(var(--py) * 16px), 0)',
              transition: `transform 700ms ${EASE}`,
              zIndex: 2,
            }}
          >
            <Box sx={{ width: '100%', height: '100%', animation: `plateIn 1500ms ${EASE} 200ms both` }}>
              <Box sx={{ width: '100%', height: '100%', animation: 'plateFloat 7s ease-in-out 1.8s infinite' }}>
                <Box
                  component="img"
                  src="/images/thali-plate.png"
                  alt="Indian thali"
                  fetchPriority="high"
                  sx={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: '62% 42%',
                    filter: 'drop-shadow(0 34px 34px rgba(60, 35, 10, 0.34))',
                    // the picture has yellow shapes baked in that stop at its edge: fade them out there
                    WebkitMaskImage: 'radial-gradient(closest-side at 54% 50%, #000 78%, rgba(0,0,0,0) 100%)',
                    maskImage: 'radial-gradient(closest-side at 54% 50%, #000 78%, rgba(0,0,0,0) 100%)',
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
