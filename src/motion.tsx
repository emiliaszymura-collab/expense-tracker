import React, { useRef } from 'react';
import { motion, useInView, Variants, HTMLMotionProps } from 'framer-motion';

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
