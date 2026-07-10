import { beforeAll, describe, expect, it } from "vitest";
import { decryptField, encryptField, isEncrypted } from "./crypto";

beforeAll(() => {
  process.env.FIELD_ENCRYPTION_KEY = "a".repeat(64);
});

describe("field encryption", () => {
  it("round-trips utf8 content", () => {
    const secret = JSON.stringify({ iban: "GB29NWBK60161331926819", note: "宝" });
    expect(decryptField(encryptField(secret))).toBe(secret);
  });

  it("produces a fresh IV per call", () => {
    expect(encryptField("same")).not.toBe(encryptField("same"));
  });

  it("is tamper-evident (GCM auth tag)", () => {
    const blob = encryptField("secret");
    const parts = blob.split(":");
    const data = Buffer.from(parts[2], "base64");
    data[0] ^= 0xff;
    parts[2] = data.toString("base64");
    expect(() => decryptField(parts.join(":"))).toThrow();
  });

  it("rejects malformed blobs and unknown key ids", () => {
    expect(() => decryptField("nonsense")).toThrow("Malformed encrypted field");
    expect(() => decryptField("v9:a:b:c")).toThrow("Malformed encrypted field");
  });

  it("identifies encrypted blobs", () => {
    expect(isEncrypted(encryptField("x"))).toBe(true);
    expect(isEncrypted("GB29NWBK60161331926819")).toBe(false);
  });
});
