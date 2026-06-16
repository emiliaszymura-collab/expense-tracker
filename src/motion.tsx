import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView, animate, Variants, HTMLMotionProps } from 'framer-motion';

// Apple-like buttery easing
export const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

// ── Page transition (used with <AnimatePresence mode="wait"> in App) ──
export const pageVariants: Variants = {
  initial: { opacity: 0, y: -16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 16 },
};
export const pageTransition = { duration: 0.4, ease: EASE };

// ── Stagger: cards cascade in, +60ms each ──
export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

// Stagger container — wrap a group of <Stagger.Item> (or motion.div variants=staggerItem)
export function Stagger({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <motion.div className={className} style={style} variants={staggerContainer} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}
export function StaggerItem({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <motion.div className={className} style={style} variants={staggerItem}>
      {children}
    </motion.div>
  );
}

// ── Scroll reveal: fades/slides in when it enters the viewport ──
export function Reveal({ children, delay = 0, className, style }: { children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

// ── Animated number: counts up from 0 to value ──
export function AnimatedNumber({ value, format, duration = 1 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, { duration, ease: EASE, onUpdate: v => setDisplay(v) });
    return () => controls.stop();
  }, [value, duration]);
  return <>{format ? format(display) : Math.round(display).toString()}</>;
}

// ── Success burst: checkmark + subtle confetti (KROK 9) ──
const CONFETTI_COLORS = ['#0071e3', '#34c759', '#ff9500', '#af52de', '#ff2d55', '#5ac8fa'];
export function ConfettiCheck({ show }: { show: boolean }) {
  if (!show) return null;
  const particles = Array.from({ length: 16 });
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 2000 }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 18 }}
        style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46, color: '#fff', boxShadow: '0 8px 30px rgba(52,199,89,0.4)' }}
      >✓</motion.div>
      {particles.map((_, i) => {
        const ang = (i / particles.length) * Math.PI * 2;
        const dist = 90 + Math.random() * 50;
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{ position: 'absolute', width: 10, height: 10, borderRadius: 2, background: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }}
          />
        );
      })}
    </motion.div>
  );
}

// ── Spring button: scale 0.96 on tap with bounce ──
type MotionButtonProps = HTMLMotionProps<'button'> & { children: React.ReactNode };
export function MotionButton({ children, ...props }: MotionButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
