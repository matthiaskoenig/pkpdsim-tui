import {afterEach, describe, expect, it} from "vitest";
import {assetCommand, fetchAsset} from "../src/assets.ts";

const real = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = real;
});

/** A server which answers every request with the same thing. */
function answers(response: Response): void {
  globalThis.fetch = (() => Promise.resolve(response.clone())) as unknown as typeof fetch;
}

const CARDIOVASCULAR = new URL("http://localhost:5173/assets/cardiovascular/solver/config.json");
const PERFUSION = new URL("http://localhost:5173/assets/perfusion/solver/model.json");

describe("the command which writes an asset", () => {
  it("is the one of the table the file belongs to", () => {
    expect(assetCommand(CARDIOVASCULAR)).toBe("npm run sync");
    expect(assetCommand(new URL("http://localhost/assets/lobes/runtime/engine.wasm")))
      .toBe("npm run sync");
    expect(assetCommand(new URL("http://localhost/assets/glimepiride/solver/model.wasm")))
      .toBe("npm run export:glimepiride");
    expect(assetCommand(PERFUSION)).toBe("npm run export:perfusion");
  });
});

describe("fetching an asset", () => {
  it("hands over the answer when the file is there", async () => {
    answers(new Response("{}", {status: 200, headers: {"content-type": "application/json"}}));
    expect(await (await fetchAsset(CARDIOVASCULAR)).text()).toBe("{}");
  });

  it("names the file and the command when it is not there", async () => {
    answers(new Response("Not found", {status: 404}));
    await expect(fetchAsset(PERFUSION)).rejects.toThrow(
      /assets\/perfusion\/solver\/model\.json.*404.*npm run export:perfusion/s);
  });

  // A development server answers a path it does not know with the page of the application, so
  // a model which was never copied in arrives as a page of HTML with a 200 beside it. That is a
  // missing file like any other, and it has to be said before a parser further down says
  // something about an unexpected character instead.
  it("is a missing file as well when the server answers with the page", async () => {
    answers(new Response("<!doctype html>\n<html lang=\"en\">", {
      status: 200, headers: {"content-type": "text/html"},
    }));
    const failed = await fetchAsset(CARDIOVASCULAR).catch((error: unknown) => error);
    expect(failed).toBeInstanceOf(Error);
    const message = (failed as Error).message;
    expect(message).toContain("/assets/cardiovascular/solver/config.json");
    expect(message).toContain("npm run sync");
    expect(message).not.toContain("<!doctype");
  });
});
