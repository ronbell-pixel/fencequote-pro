import { register } from "node:module";
register(
  "data:text/javascript," +
    encodeURIComponent(`
      export async function resolve(specifier, context, next) {
        if (specifier === "cloudflare:workers")
          return { url: new URL("./cloudflare-workers-stub.mjs", ${JSON.stringify(import.meta.url)}).href, shortCircuit: true };
        return next(specifier, context);
      }`),
);
