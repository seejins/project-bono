import { ReactNode, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import logger from '../../utils/logger';

interface DashboardHeroProps {
  imageSrc: string;
  title: string;
  subtitle?: string;
  description?: string;
  topOffset?: number;
  height?: string;
  minHeight?: string;
  overlayClassName?: string;
  content?: ReactNode;
}

interface DashboardPageProps {
  hero: DashboardHeroProps;
  children: ReactNode;
  contentClassName?: string;
  isReady?: boolean;
}

export function DashboardPage({ hero, children, contentClassName, isReady = true }: DashboardPageProps) {
  const {
    imageSrc,
    title,
    subtitle,
    description,
    topOffset = -96,
    height = '45vh',
    minHeight = '360px',
    overlayClassName = 'bg-gradient-to-r from-black/90 via-black/75 to-black/55',
    content,
  } = hero;
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = imageRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setImageLoaded(true);
    } else {
      setImageLoaded(false);
    }
  }, [imageSrc]);

  const heroReady = imageLoaded && isReady;

  return (
    <div className="w-full space-y-8">
      <motion.section
        className="relative -ml-[calc(50vw-50%)] -mr-[calc(50vw-50%)] w-screen overflow-hidden bg-black text-white will-change-[opacity]"
        style={{ marginTop: `${topOffset}px`, height, minHeight }}
        initial={{ opacity: 0 }}
        animate={{ opacity: heroReady ? 1 : 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-0">
          {!heroReady && <div className="absolute inset-0 bg-black" />}
          <img
            ref={imageRef}
            src={imageSrc}
            alt={title}
            className="h-full w-full object-cover"
            loading="eager"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              logger.warn(`Failed to load hero image at ${imageSrc}`);
              setImageLoaded(true);
            }}
          />
          <div className={clsx('absolute inset-0', overlayClassName)} />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/90 via-black/55 to-transparent" />
        </div>

        <div className="relative mx-auto flex h-full w-full max-w-[1600px] flex-col items-center justify-center gap-6 px-10 pb-12 pt-40 text-center lg:px-20 lg:pb-16 lg:pt-40">
          {subtitle && (
            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-white/75 md:text-base">
              {subtitle}
            </p>
          )}
          <h1 className="text-4xl font-black uppercase tracking-[0.2em] md:text-5xl">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
              {description}
            </p>
          )}
          {content}
        </div>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={isReady ? { opacity: 1, y: 0 } : { opacity: 0.4, y: 8 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={clsx(
          'relative z-10 mx-auto w-full max-w-[2048px] -mt-12 min-h-[calc(45vh+35rem)] space-y-6 px-6 pb-12 lg:-mt-16 lg:px-10',
          contentClassName
        )}
      >
        {isReady ? children : null}
      </motion.div>
    </div>
  );
}

