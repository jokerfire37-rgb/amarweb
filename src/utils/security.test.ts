import { describe, expect, it } from "vitest";
import { describeCmsPermissionError, isSafeHttpUrl, isValidEmail, isValidPhone, validateFieldLength } from "./security";

describe("security utilities", () => {
  it("accepts only http and https URLs", () => {
    expect(isSafeHttpUrl("https://example.com")).toBe(true);
    expect(isSafeHttpUrl("http://example.com/path?q=1")).toBe(true);
    expect(isSafeHttpUrl("https://res.cloudinary.com/demo/image/upload/v1234/test.jpg")).toBe(true);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/plain,hello")).toBe(false);
    expect(isSafeHttpUrl("not-a-url")).toBe(false);
  });

  it("maps Firebase permission errors to the admin-session message", () => {
    const message = describeCmsPermissionError({ code: "permission-denied" });
    expect(message).toBe("Your admin session does not have permission to edit CMS content. Please sign out and sign in again.");
  });

  it("validates email formats", () => {
    expect(isValidEmail("admin@example.com")).toBe(true);
    expect(isValidEmail("bad-email")).toBe(false);
    expect(isValidEmail(" ")).toBe(false);
  });

  it("validates phone formats", () => {
    expect(isValidPhone("+91 94824 86971")).toBe(true);
    expect(isValidPhone("12345")).toBe(true);
    expect(isValidPhone("abc")).toBe(false);
  });

  it("enforces maximum field length", () => {
    expect(validateFieldLength("hello", 10)).toBe(true);
    expect(validateFieldLength("hello", 4)).toBe(false);
  });
});
