import { describe, it, expect } from "vitest";
import { isAllowedOrigin, corsOptions } from "../src/config/cors.js";

describe("Connectfic-Aligned CORS Security & Origin Validation", () => {
  describe("isAllowedOrigin()", () => {
    it("allows localhost and 127.0.0.1 on arbitrary dev ports", () => {
      expect(isAllowedOrigin("http://localhost:5173")).toBe(true);
      expect(isAllowedOrigin("http://localhost:3000")).toBe(true);
      expect(isAllowedOrigin("https://localhost:5173")).toBe(true);
      expect(isAllowedOrigin("http://127.0.0.1:5173")).toBe(true);
      expect(isAllowedOrigin("http://127.0.0.1:8080")).toBe(true);
    });

    it("allows Framer cloud and canvas domains", () => {
      expect(isAllowedOrigin("https://framer.com")).toBe(true);
      expect(isAllowedOrigin("https://app.framer.com")).toBe(true);
      expect(isAllowedOrigin("https://my-cool-site.framer.app")).toBe(true);
      expect(isAllowedOrigin("https://sandbox.framercanvas.com")).toBe(true);
      expect(isAllowedOrigin("https://project.framer.website")).toBe(true);
      expect(isAllowedOrigin("https://cdn.framerusercontent.com")).toBe(true);
      expect(isAllowedOrigin("https://static.framercdn.com")).toBe(true);
      expect(isAllowedOrigin("https://app.framefic.com")).toBe(true);
    });

    it("allows Qubtic platform domains", () => {
      expect(isAllowedOrigin("https://qubtic.tech")).toBe(true);
      expect(isAllowedOrigin("https://portal.qubtic.tech")).toBe(true);
      expect(isAllowedOrigin("https://qubtic.com")).toBe(true);
    });

    it("rejects unauthorized external origins and spoofed hostnames", () => {
      expect(isAllowedOrigin("https://malicious-site.com")).toBe(false);
      expect(isAllowedOrigin("https://phishing.net")).toBe(false);
      expect(isAllowedOrigin("https://framer.com.attacker.com")).toBe(false);
      expect(isAllowedOrigin("https://qubtic.tech.attacker.org")).toBe(false);
    });
  });

  describe("corsOptions.origin handler", () => {
    it("allows requests with no origin (curl, server-to-server, mobile)", () => {
      let allowed: boolean | undefined;
      let err: Error | null = null;

      (corsOptions.origin as any)(undefined, (e: Error | null, result?: boolean) => {
        err = e;
        allowed = result;
      });

      expect(err).toBeNull();
      expect(allowed).toBe(true);
    });

    it("explicitly allows 'null' origin from Framer sandboxed canvas iframes", () => {
      let allowed: boolean | undefined;
      let err: Error | null = null;

      (corsOptions.origin as any)("null", (e: Error | null, result?: boolean) => {
        err = e;
        allowed = result;
      });

      expect(err).toBeNull();
      expect(allowed).toBe(true);
    });

    it("allows verified Framer origin via CORS callback", () => {
      let allowed: boolean | undefined;
      let err: Error | null = null;

      (corsOptions.origin as any)("https://designer-portfolio.framer.app", (e: Error | null, result?: boolean) => {
        err = e;
        allowed = result;
      });

      expect(err).toBeNull();
      expect(allowed).toBe(true);
    });

    it("rejects untrusted origin with informative CORS error", () => {
      let allowed: boolean | undefined;
      let err: Error | null = null;

      (corsOptions.origin as any)("https://untrusted-source.xyz", (e: Error | null, result?: boolean) => {
        err = e;
        allowed = result;
      });

      expect(err).toBeInstanceOf(Error);
      expect(err?.message).toContain("CORS: origin https://untrusted-source.xyz not allowed");
      expect(allowed).toBeUndefined();
    });
  });
});
