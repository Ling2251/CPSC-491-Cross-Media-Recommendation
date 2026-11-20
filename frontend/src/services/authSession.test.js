import { beforeEach, describe, expect, test } from "vitest";
import {
  beginAppSession,
  clearAuthSession,
  persistAuthToken,
  readAuthToken,
} from "./authSession";

describe("authSession", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test("clears legacy unremembered local tokens at startup", () => {
    localStorage.setItem("token", "session-token");

    beginAppSession();

    expect(localStorage.getItem("token")).toBeNull();
  });

  test("keeps a token across browser sessions only when requested", () => {
    localStorage.setItem("token", "remembered-token");
    localStorage.setItem("crossmedia-stay-logged-in", "true");

    beginAppSession();

    expect(localStorage.getItem("token")).toBe("remembered-token");
  });

  test("stores an unremembered token only for the current browser session", () => {
    persistAuthToken("session-token", false);
    beginAppSession();

    expect(readAuthToken()).toBe("session-token");
    expect(localStorage.getItem("token")).toBeNull();

    sessionStorage.clear();
    expect(readAuthToken()).toBeNull();
  });

  test("stores a remembered token persistently", () => {
    persistAuthToken("new-token", true);

    expect(readAuthToken()).toBe("new-token");
    expect(localStorage.getItem("crossmedia-stay-logged-in")).toBe("true");
    expect(sessionStorage.getItem("token")).toBeNull();
  });

  test("clears both token and remember choice on logout", () => {
    persistAuthToken("remembered-token", true);
    sessionStorage.setItem("token", "session-token");

    clearAuthSession();

    expect(localStorage.getItem("token")).toBeNull();
    expect(sessionStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("crossmedia-stay-logged-in")).toBeNull();
  });
});
