import {afterEach, describe, expect, it} from "vitest";
import {ASSET_COMMAND, fetchAsset} from "../src/assets.ts";

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

describe("the command which puts the assets there", () => {
  // One command puts all of them there, whichever table asked: they travel with a release, and
  // a checkout takes them from the release it is.
  it("is the one command of the resources", () => {
    expect(ASSET_COMMAND).toBe("npm run assets");
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
      /assets\/perfusion\/solver\/model\.json.*404.*npm run assets/s);
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
    expect(message).toContain("npm run assets");
    expect(message).not.toContain("<!doctype");
  });
});
