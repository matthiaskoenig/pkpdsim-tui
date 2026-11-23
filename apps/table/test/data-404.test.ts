import {mkdir, mkdtemp, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join} from "node:path";
import {describe, expect, it} from "vitest";
import {dataFile, missingData} from "../data-404.ts";

describe("the file a request asks for", () => {
  it("is the path under the folders of the exported models and the clips", () => {
    expect(dataFile("/assets/cardiovascular/solver/config.json"))
      .toBe("/assets/cardiovascular/solver/config.json");
    expect(dataFile("/assets/lobes/runtime/engine.wasm?t=1759"))
      .toBe("/assets/lobes/runtime/engine.wasm");
    expect(dataFile("/audio/en/manifest.json")).toBe("/audio/en/manifest.json");
    expect(dataFile("/people/matthias-koenig.webp")).toBe("/people/matthias-koenig.webp");
  });

  it("is nothing for the page itself, its bundle and its sources", () => {
    expect(dataFile("/")).toBeUndefined();
    expect(dataFile("/?app=cardiovascular&lang=en")).toBeUndefined();
    expect(dataFile("/bundle/src-BvOmqOYo.js")).toBeUndefined();
    expect(dataFile("/src/main.ts")).toBeUndefined();
    expect(dataFile("/simulator/")).toBeUndefined();
  });

  it("is nothing for a path which climbs out of those folders", () => {
    expect(dataFile("/assets/../../etc/passwd")).toBeUndefined();
    expect(dataFile("/assets/%2e%2e/%2e%2e/etc/passwd")).toBeUndefined();
  });
});

/** A request and the answer it is given, as the middleware of a server sees them. */
function asked(url: string): {
  request: {url: string};
  answer: {status?: number; body?: string; passed: boolean};
} {
  return {request: {url}, answer: {passed: false}};
}

async function folder(files: readonly string[]): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "pkpdsim-tui-public-"));
  for (const file of files) {
    await mkdir(dirname(join(directory, file)), {recursive: true});
    await writeFile(join(directory, file), "{}");
  }
  return directory;
}

describe("a request for a file which is not there", () => {
  it("is answered with a 404 and not with the page of the application", async () => {
    const directory = await folder(["assets/cardiovascular/solver/config.json"]);
    const asks = asked("/assets/glimepiride/solver/model.json");
    const sent: {status: number; body: string}[] = [];
    missingData(directory)(
      asks.request as never,
      {
        statusCode: 0,
        setHeader: () => undefined,
        end: (body: string) => sent.push({status: 404, body}),
      } as never,
      () => {
        asks.answer.passed = true;
      },
    );
    expect(asks.answer.passed).toBe(false);
    expect(sent[0]?.body).toContain("/assets/glimepiride/solver/model.json");
  });

  it("is left to the server when the file is there", async () => {
    const directory = await folder(["assets/cardiovascular/solver/config.json"]);
    let passed = false;
    missingData(directory)(
      {url: "/assets/cardiovascular/solver/config.json"} as never,
      {end: () => undefined, setHeader: () => undefined} as never,
      () => {
        passed = true;
      },
    );
    expect(passed).toBe(true);
  });
});
