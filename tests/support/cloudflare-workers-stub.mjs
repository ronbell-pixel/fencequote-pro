// Stand-in for the `cloudflare:workers` module when unit-testing outside workerd.
export const env = globalThis.__TEST_ENV__ ?? (globalThis.__TEST_ENV__ = {});
