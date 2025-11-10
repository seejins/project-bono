import { PropsWithChildren } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface PageTransitionProps {
  className?: string;
}

export const PageTransition = ({
  children,
  className,
}: PropsWithChildren<PageTransitionProps>) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={clsx('will-change-[transform,opacity]', className)}
    >
      {children}
    </motion.div>
  );
};

