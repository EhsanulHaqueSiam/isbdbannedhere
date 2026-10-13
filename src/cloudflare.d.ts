// The slice of the Workers runtime the app uses; bindings are declared in wrangler.jsonc. Optional because local
// dev and prerender may run without them. Full generated types: `pnpm wrangler types`.
declare module 'cloudflare:workers' {
  interface D1Statement {
    bind(...values: unknown[]): D1Statement
    first<T>(): Promise<T | null>
    run(): Promise<{ meta: { changes: number } }>
  }
  export const env: {
    DB?: { prepare(sql: string): D1Statement }
    AI?: { run(model: string, input: object): Promise<{ response?: unknown }> }
    SUBMIT_LIMIT?: { limit(o: { key: string }): Promise<{ success: boolean }> }
    /** Secret mixed into the IP hash (`wrangler secret put IP_SALT`). */
    IP_SALT?: string
  }
  export function waitUntil(promise: Promise<unknown>): void
}
