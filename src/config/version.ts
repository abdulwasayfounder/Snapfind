/**
 * SnapFind AI - Centralized Single Source of Truth for App Version & Identification
 *
 * Rules:
 * 1. Single app version / versionCode source for the entire app.
 * 2. Every release must have a higher versionCode (v1.0.0 -> v1.0.1 -> v1.1.0 -> v2.0.0).
 * 3. Never downgrade automatically.
 */

export const APP_VERSION = "1.0.0";
export const APP_VERSION_NAME = `v${APP_VERSION}`;
export const APP_VERSION_CODE = 1;
export const APP_NAME = "SnapFind AI";
export const APP_PACKAGE_ID = "com.snapfind.ai";

// Default GitHub repository for public releases.
// Can be customized via VITE_GITHUB_REPO env variable.
export const OFFICIAL_GITHUB_REPO =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GITHUB_REPO) ||
  "SnapFind-AI/SnapFind";

export interface ParsedSemver {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  raw: string;
}

/**
 * Cleanly normalizes version string by removing leading 'v', trimming whitespace,
 * and extracting standard major.minor.patch numeric parts.
 */
export function parseSemver(versionStr: string | null | undefined): ParsedSemver {
  if (!versionStr || typeof versionStr !== "string") {
    return { major: 0, minor: 0, patch: 0, raw: "0.0.0" };
  }

  const clean = versionStr.trim().replace(/^[vV]/, "");
  const [mainPart, ...preParts] = clean.split("-");
  const [majStr, minStr, patchStr] = mainPart.split(".");

  const major = parseInt(majStr, 10) || 0;
  const minor = parseInt(minStr, 10) || 0;
  const patch = parseInt(patchStr, 10) || 0;

  return {
    major,
    minor,
    patch,
    prerelease: preParts.join("-") || undefined,
    raw: versionStr.trim(),
  };
}

/**
 * Standard semver comparator:
 * returns:
 *   1 if v1 > v2 (v1 is newer)
 *  -1 if v1 < v2 (v1 is older)
 *   0 if v1 === v2
 */
export function compareSemver(v1: string, v2: string): number {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);

  if (p1.major > p2.major) return 1;
  if (p1.major < p2.major) return -1;

  if (p1.minor > p2.minor) return 1;
  if (p1.minor < p2.minor) return -1;

  if (p1.patch > p2.patch) return 1;
  if (p1.patch < p2.patch) return -1;

  return 0;
}

/**
 * Strictly checks if remote version is newer than current installed version.
 * Never allows downgrade.
 */
export function isNewerVersion(remoteVersion: string, currentVersion: string = APP_VERSION): boolean {
  if (!remoteVersion) return false;
  return compareSemver(remoteVersion, currentVersion) > 0;
}

/**
 * Display helper: formats version as 'v1.0.1'
 */
export function formatVersionDisplay(versionStr: string | null | undefined): string {
  if (!versionStr) return APP_VERSION_NAME;
  const trimmed = versionStr.trim();
  return trimmed.startsWith("v") || trimmed.startsWith("V") ? trimmed : `v${trimmed}`;
}
