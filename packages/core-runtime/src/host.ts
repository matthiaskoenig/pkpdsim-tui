/**
 * Loading the browser host of sbmlsim-core. The host is a classic script that installs itself
 * as `globalThis.sbmlsimCore` and hands out the Web Worker the compiled models run in, so it is
 * loaded by a script element rather than imported.
 */

import type {CoreHost} from "./types.ts";

declare global {
  // eslint-disable-next-line no-var
  var sbmlsimCore: CoreHost | undefined;
}

const loading = new Map<string, Promise<CoreHost>>();

/** The host, loading it from `url` once however often it is asked for. */
export function loadCoreHost(url: string | URL): Promise<CoreHost> {
  const href = String(url);
  const existing = loading.get(href);
  if (existing !== undefined) return existing;
  const promise = new Promise<CoreHost>((resolve, reject) => {
    if (globalThis.sbmlsimCore !== undefined) {
      resolve(globalThis.sbmlsimCore);
      return;
    }
    const script = document.createElement("script");
    script.src = href;
    script.async = true;
    script.addEventListener("load", () => {
      const host = globalThis.sbmlsimCore;
      if (host === undefined) {
        reject(new Error(`${href} loaded but installed no sbmlsim-core host.`));
        return;
      }
      resolve(host);
    });
    script.addEventListener("error", () => {
      loading.delete(href);
      reject(new Error(`Could not load the sbmlsim-core runtime from ${href}. Run "npm run sync".`));
    });
    document.head.appendChild(script);
  });
  loading.set(href, promise);
  return promise;
}
