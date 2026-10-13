// "As of" date baked in at build, so every page and card agrees.
// Vite defines __BUILD_DATE__; plain Node scripts fall back to today.
export const TODAY: string = typeof __BUILD_DATE__ === 'string' ? __BUILD_DATE__ : new Date().toISOString().slice(0, 10)
