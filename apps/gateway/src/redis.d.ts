declare module "redis" {
  export function createClient(options?: Record<string, unknown>): any;
}
