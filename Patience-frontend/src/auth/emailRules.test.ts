import { describe, expect, it } from "vitest";
import { emailInvalidReason, normalizeEmail } from "./emailRules";

describe("emailRules", () => {
  it("normalizes and rejects bad shape", () => {
    expect(normalizeEmail("  A@B.CO  ")).toBe("a@b.co");
    expect(emailInvalidReason("not-mail")).toMatch(/형식/);
    expect(emailInvalidReason("ok@mail.com")).toBeNull();
  });
});
