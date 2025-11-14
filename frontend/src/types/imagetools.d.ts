// Type declarations for vite-imagetools
// This allows TypeScript to recognize image imports with query parameters

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

// Catch-all for vite-imagetools query parameters
// TypeScript module resolution doesn't strip query params, so we need a generic catch-all
declare module '*?*' {
  const src: string;
  export default src;
}

// More specific patterns for common vite-imagetools queries
declare module '*.jpg?*' {
  const src: string;
  export default src;
}

declare module '*.jpeg?*' {
  const src: string;
  export default src;
}

declare module '*.png?*' {
  const src: string;
  export default src;
}

declare module '*.webp?*' {
  const src: string;
  export default src;
}

