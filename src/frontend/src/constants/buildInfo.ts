// Build identifier that changes with each frontend build
export const BUILD_ID = import.meta.env.VITE_BUILD_ID || 
  (typeof document !== 'undefined' ? document.lastModified : new Date().toISOString());
