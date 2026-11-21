import {describe, expect, it} from "vitest";

import {createSessionIds} from "../src/sessions.mjs";

describe("the session ids of the surface", () => {
  it("counts up from one", () => {
    const sessions = createSessionIds();
    expect(sessions.idFor("token:a")).toBe(1);
    expect(sessions.idFor("token:b")).toBe(2);
    expect(sessions.next).toBe(3);
  });

  it("is the same id for as long as the object is on the surface", () => {
    const sessions = createSessionIds();
    const id = sessions.idFor("token:a");
    expect(sessions.idFor("token:a")).toBe(id);
    expect(sessions.idFor("token:a")).toBe(id);
    expect(sessions.size).toBe(1);
  });

  it("never hands out the id of an object that has left", () => {
    const sessions = createSessionIds();
    const first = sessions.idFor("token:a");
    sessions.release("token:a");
    expect(sessions.has("token:a")).toBe(false);
    const second = sessions.idFor("token:a");
    expect(second).not.toBe(first);
    expect(second).toBeGreaterThan(first);
  });

  it("releases everything that retain does not name", () => {
    const sessions = createSessionIds();
    sessions.idFor("token:a");
    sessions.idFor("token:b");
    const kept = sessions.idFor("pointer:c");
    sessions.retain(["pointer:c"]);
    expect(sessions.entries()).toEqual([["pointer:c", kept]]);
    expect(sessions.idFor("token:a")).toBe(4);
  });

  it("keeps counting after a control page that took its keys with it", () => {
    const sessions = createSessionIds();
    sessions.idFor("token:token-1");
    sessions.clear();
    expect(sessions.size).toBe(0);
    expect(sessions.idFor("token:token-1")).toBe(2);
  });
});
