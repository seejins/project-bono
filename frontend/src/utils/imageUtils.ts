/**
 * Image utility functions for optimized image loading
 */

/**
 * Check if an image element is in the viewport
 */
export const isInViewport = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

/**
 * Create an IntersectionObserver for lazy loading images
 */
export const createImageObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
): IntersectionObserver => {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px', // Start loading 50px before entering viewport
    threshold: 0.01,
    ...options,
  };

  return new IntersectionObserver(callback, defaultOptions);
};

/**
 * Hook-like utility to lazy load images using IntersectionObserver
 * Returns a ref to attach to the image element
 */
export const useLazyImage = (
  src: string,
  onLoad?: () => void
): { ref: (element: HTMLImageElement | null) => void; isLoaded: boolean } => {
  let observer: IntersectionObserver | null = null;
  let imageElement: HTMLImageElement | null = null;
  let loaded = false;

  const setRef = (element: HTMLImageElement | null) => {
    if (imageElement && observer) {
      observer.unobserve(imageElement);
    }

    imageElement = element;

    if (element && !loaded) {
      observer = createImageObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !loaded) {
            loaded = true;
            if (element.dataset.src) {
              element.src = element.dataset.src;
              element.removeAttribute('data-src');
            }
            if (onLoad) {
              onLoad();
            }
            if (observer) {
              observer.unobserve(element);
            }
          }
        });
      });

      observer.observe(element);
    }
  };

  return { ref: setRef, isLoaded: loaded };
};

