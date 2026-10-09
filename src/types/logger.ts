import type { AstroIntegrationLogger } from "astro";

/**
 * Minimal logger surface shared across integrations, utils, and tests.
 * Derived from Astro's integration logger so it can never drift from what
 * the astro hooks provide; structural typing keeps test mocks at four
 * methods. Cross-cutting infrastructure (not a domain type), so it lives
 * here rather than colocated with any single module.
 */
export type Logger = Pick<
	AstroIntegrationLogger,
	"info" | "warn" | "error" | "debug"
>;
