import { describe, expect, it } from "vitest";
import { normalizeUsername, passwordStrength, usernameInvalidReason } from "./usernameRules";

describe("usernameRules", () => {
  it("normalizes case and space", () => {
    expect(normalizeUsername("  HyunM  ")).toBe("hyunm");
  });

  it("rejects reserved and odd characters in Korean", () => {
    expect(usernameInvalidReason("ab")).toMatch(/3자/);
    expect(usernameInvalidReason("admin")).toMatch(/쓸 수 없어요/);
    expect(usernameInvalidReason("안녕")).toMatch(/영문/);
    expect(usernameInvalidReason("ok_user")).toMatch(/숫자만/);
    expect(usernameInvalidReason("abcdefghijk")).toMatch(/10자/);
    expect(usernameInvalidReason("okuser")).toBeNull();
  });
});

describe("passwordStrength", () => {
  it("maps length and variety to three moss bars", () => {
    expect(passwordStrength("").level).toBe(0);
    expect(passwordStrength("short").label).toBe("약함");
    expect(passwordStrength("abcdefgh").label).toBe("약함");
    expect(passwordStrength("abcdefg1").label).toBe("괜찮음");
    expect(passwordStrength("abcdefghij1").label).toBe("든든함");
  });
});
