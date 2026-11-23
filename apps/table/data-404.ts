/**
 * A file of `public` which is not there answers with a 404, and not with the page.
 *
 * The exported models, the reference data and the recorded clips are plain files under `public`,
 * served by the development server and by the preview of the build. Both of them answer a path
 * they do not know with `index.html`, because the application is one page: a model which was
 * never copied in therefore arrives as a page of HTML with a 200 beside it, and the table fails
 * on an unexpected character of the page rather than on the file it asked for. The folders of
 * data hold files and never a page, so a request for one of them is answered here.
 */

import {existsSync} from "node:fs";
import {join, posix, resolve} from "node:path";
import type {Connect, Plugin} from "vite";

/** The folders of `public` which hold files and never a page. */
const FOLDERS = ["/assets/", "/audio/", "/people/"];

/** Which file a request asks for, or nothing when it asks for none of those folders. */
export function dataFile(url: string): string | undefined {
  const asked = (url.split("?")[0] ?? "").split("#")[0] ?? "";
  let path: string;
  try {
    path = decodeURIComponent(asked);
  } catch {
    return undefined;
  }
  // A backslash is no separator of a URL, and a path which carries one is not followed.
  if (path.includes("\\")) return undefined;
  // The path of a request is the path of a URL, with forward slashes on every platform, so it
  // is normalised as one: the `normalize` of this platform would make a path of Windows out of
  // it, and none of the folders of data would be recognised there. It is normalised first, so
  // that a path which climbs out of the folders is not one of them.
  const file = posix.normalize(path);
  if (!FOLDERS.some(folder => file.startsWith(folder))) return undefined;
  return file;
}

/** The answer to a request for a file of the data folders, under the directory which holds them. */
export function missingData(directory: string): Connect.NextHandleFunction {
  return (request, response, next) => {
    const file = dataFile(request.url ?? "");
    // The path of the URL becomes a path of this platform, segment by segment.
    if (file === undefined || existsSync(join(directory, ...file.split("/")))) {
      next();
      return;
    }
    response.statusCode = 404;
    response.setHeader("content-type", "text/plain; charset=utf-8");
    response.end(`${file} is not in ${directory}.\n`);
  };
}

/** The plugin, on the development server and on the preview of the build alike. */
export function dataNotFound(): Plugin {
  return {
    name: "data-not-found",
    configureServer: server => {
      server.middlewares.use(missingData(server.config.publicDir));
    },
    configurePreviewServer: server => {
      const config = server.config;
      server.middlewares.use(missingData(resolve(config.root, config.build.outDir)));
    },
  };
}
