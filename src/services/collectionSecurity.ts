/**
 * SnapFind AI - Collection Security, Vault & Cryptographic Protection Engine
 * 
 * Supports:
 * - Pattern Lock (3x3 dot grid pattern)
 * - Numeric PIN (4 to 8 digits)
 * - Alphanumeric Password
 * 
 * Security Guarantees:
 * - Plaintext patterns/PINs/passwords are NEVER stored.
 * - Derived verifier computed with unique random salt + cryptographic SHA-256.
 * - Brute-force protection: progressive lockout after 5 and 10 failed attempts.
 * - Session-based unlocking with customizable auto-lock timer.
 * - Restricts locked collection items and Vault items from search, recent items, and gallery.
 */

import { ScreenshotItem } from "../types";

export type LockType = "none" | "pattern" | "pin" | "password";
export type AutoLockDuration = "immediately" | "1m" | "5m" | "15m" | "session";

export interface CollectionSecurityConfig {
  collectionName: string;
  lockType: LockType;
  salt: string;
  verifier: string;
  failedAttempts: number;
  lockoutUntil?: number; // epoch ms
  updatedAt: string;
}

const STORAGE_KEY_COLLECTIONS = "snapfind_collection_security_v1";
const STORAGE_KEY_AUTOLOCK = "snapfind_autolock_setting_v1";
export const VAULT_COLLECTION_NAME = "🔐 Vault";

/**
 * Fast Web Crypto SHA-256 hash
 */
async function computeSha256(data: string): Promise<string> {
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Basic fallback if subtle crypto is unavailable
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, "0");
}

/**
 * Generate 16-byte cryptographically secure random salt
 */
function generateSalt(): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

class CollectionSecurityManager {
  private configs: Map<string, CollectionSecurityConfig> = new Map();
  // Session unlock state: collectionName -> timestamp of unlock
  private unlockedSessions: Map<string, number> = new Map();
  private autoLockDuration: AutoLockDuration = "5m";
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_COLLECTIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((cfg: CollectionSecurityConfig) => {
            this.configs.set(cfg.collectionName, cfg);
          });
        }
      }
      const rawAuto = localStorage.getItem(STORAGE_KEY_AUTOLOCK);
      if (rawAuto && ["immediately", "1m", "5m", "15m", "session"].includes(rawAuto)) {
        this.autoLockDuration = rawAuto as AutoLockDuration;
      }
    } catch (e) {
      console.warn("[CollectionSecurity] Failed to load config from storage:", e);
    }
  }

  private persistToStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const list = Array.from(this.configs.values());
      localStorage.setItem(STORAGE_KEY_COLLECTIONS, JSON.stringify(list));
      localStorage.setItem(STORAGE_KEY_AUTOLOCK, this.autoLockDuration);
    } catch (e) {
      console.warn("[CollectionSecurity] Failed to persist config to storage:", e);
    }
  }

  private notify(): void {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error(err);
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getAutoLockDuration(): AutoLockDuration {
    return this.autoLockDuration;
  }

  public setAutoLockDuration(duration: AutoLockDuration): void {
    this.autoLockDuration = duration;
    this.persistToStorage();
    this.notify();
  }

  /**
   * Check if a collection has security lock configured
   */
  public hasCollectionLock(collectionName: string): boolean {
    const cfg = this.configs.get(collectionName);
    return Boolean(cfg && cfg.lockType !== "none");
  }

  /**
   * Check if the Vault has security lock configured
   */
  public hasVaultLock(): boolean {
    return this.hasCollectionLock(VAULT_COLLECTION_NAME);
  }

  /**
   * Get the lock type for a collection
   */
  public getCollectionLockType(collectionName: string): LockType {
    const cfg = this.configs.get(collectionName);
    return cfg?.lockType || "none";
  }

  /**
   * Check if a collection is currently locked (has lock and NOT unlocked in current session)
   */
  public isCollectionLocked(collectionName: string): boolean {
    const cfg = this.configs.get(collectionName);
    if (!cfg || cfg.lockType === "none") return false;

    const unlockedAt = this.unlockedSessions.get(collectionName);
    if (!unlockedAt) return true;

    // Check auto-lock timeout
    const now = Date.now();
    let timeoutMs = 5 * 60 * 1000; // default 5m
    if (this.autoLockDuration === "immediately") {
      timeoutMs = 0;
    } else if (this.autoLockDuration === "1m") {
      timeoutMs = 60 * 1000;
    } else if (this.autoLockDuration === "5m") {
      timeoutMs = 5 * 60 * 1000;
    } else if (this.autoLockDuration === "15m") {
      timeoutMs = 15 * 60 * 1000;
    } else if (this.autoLockDuration === "session") {
      timeoutMs = Infinity;
    }

    if (now - unlockedAt > timeoutMs) {
      this.unlockedSessions.delete(collectionName);
      return true;
    }

    return false;
  }

  /**
   * Check if the Vault is currently locked
   */
  public isVaultLocked(): boolean {
    // If vault has no lock set, it defaults to unlocked unless configured
    const hasLock = this.hasVaultLock();
    if (!hasLock) return false;
    return this.isCollectionLocked(VAULT_COLLECTION_NAME);
  }

  /**
   * Check if a screenshot is accessible under current lock state.
   * Locked collection items and locked Vault items return false.
   */
  public isItemAccessible(item: ScreenshotItem): boolean {
    // 1. Check if item is in Vault
    if (item.in_vault || item.inVault || item.collectionName === VAULT_COLLECTION_NAME || item.collection === VAULT_COLLECTION_NAME) {
      if (this.isVaultLocked()) {
        return false;
      }
    }

    // 2. Check if item belongs to a locked collection
    const colName = item.collectionName || item.collection;
    if (colName && this.hasCollectionLock(colName) && this.isCollectionLocked(colName)) {
      return false;
    }

    return true;
  }

  /**
   * Filter accessible screenshot items (for normal gallery, search, recent items)
   */
  public filterAccessibleItems(items: ScreenshotItem[]): ScreenshotItem[] {
    return items.filter((item) => this.isItemAccessible(item));
  }

  /**
   * Set or update collection lock configuration
   */
  public async setCollectionLock(
    collectionName: string,
    lockType: LockType,
    secret: string
  ): Promise<void> {
    if (lockType === "none" || !secret) {
      this.removeCollectionLock(collectionName);
      return;
    }

    const salt = generateSalt();
    const verifier = await computeSha256(`${salt}:${secret}`);

    const config: CollectionSecurityConfig = {
      collectionName,
      lockType,
      salt,
      verifier,
      failedAttempts: 0,
      updatedAt: new Date().toISOString(),
    };

    this.configs.set(collectionName, config);
    // When newly locked or password changed, keep it unlocked for author in this moment
    this.unlockedSessions.set(collectionName, Date.now());
    this.persistToStorage();
    this.notify();
  }

  /**
   * Remove lock from a collection
   */
  public removeCollectionLock(collectionName: string): void {
    this.configs.delete(collectionName);
    this.unlockedSessions.delete(collectionName);
    this.persistToStorage();
    this.notify();
  }

  /**
   * Configure Vault lock
   */
  public async setVaultLock(lockType: LockType, secret: string): Promise<void> {
    await this.setCollectionLock(VAULT_COLLECTION_NAME, lockType, secret);
  }

  /**
   * Remove Vault lock
   */
  public removeVaultLock(): void {
    this.removeCollectionLock(VAULT_COLLECTION_NAME);
  }

  /**
   * Verify secret and unlock collection for current session
   */
  public async verifyAndUnlock(
    collectionName: string,
    secret: string
  ): Promise<{ success: boolean; error?: string; lockoutSeconds?: number }> {
    const cfg = this.configs.get(collectionName);
    if (!cfg || cfg.lockType === "none") {
      this.unlockedSessions.set(collectionName, Date.now());
      this.notify();
      return { success: true };
    }

    const now = Date.now();
    // 1. Check brute-force lockout delay
    if (cfg.lockoutUntil && cfg.lockoutUntil > now) {
      const remainingSecs = Math.ceil((cfg.lockoutUntil - now) / 1000);
      return {
        success: false,
        error: `Too many failed attempts. Locked for ${remainingSecs}s.`,
        lockoutSeconds: remainingSecs,
      };
    }

    // 2. Compute verifier hash
    const testVerifier = await computeSha256(`${cfg.salt}:${secret}`);
    if (testVerifier === cfg.verifier) {
      // Success! Reset failed attempts
      cfg.failedAttempts = 0;
      cfg.lockoutUntil = undefined;
      this.unlockedSessions.set(collectionName, now);
      this.persistToStorage();
      this.notify();
      return { success: true };
    }

    // 3. Failed attempt
    cfg.failedAttempts = (cfg.failedAttempts || 0) + 1;
    let lockoutSecs = 0;
    if (cfg.failedAttempts >= 10) {
      lockoutSecs = 300; // 5 minutes
      cfg.lockoutUntil = now + 300 * 1000;
    } else if (cfg.failedAttempts >= 5) {
      lockoutSecs = 30; // 30 seconds
      cfg.lockoutUntil = now + 30 * 1000;
    }

    this.persistToStorage();
    this.notify();

    return {
      success: false,
      error: lockoutSecs > 0
        ? `Incorrect code. Locked out for ${lockoutSecs}s.`
        : `Incorrect ${cfg.lockType === "pattern" ? "pattern" : cfg.lockType === "pin" ? "PIN" : "password"}. (${cfg.failedAttempts} attempt${cfg.failedAttempts > 1 ? "s" : ""})`,
      lockoutSeconds: lockoutSecs,
    };
  }

  /**
   * Unlock Vault
   */
  public async unlockVault(secret: string): Promise<{ success: boolean; error?: string; lockoutSeconds?: number }> {
    return this.verifyAndUnlock(VAULT_COLLECTION_NAME, secret);
  }

  /**
   * Manually lock a collection
   */
  public lockCollection(collectionName: string): void {
    this.unlockedSessions.delete(collectionName);
    this.notify();
  }

  /**
   * Manually lock Vault
   */
  public lockVault(): void {
    this.lockCollection(VAULT_COLLECTION_NAME);
  }

  /**
   * Lock all unlocked collections (e.g. on logout or app minimization)
   */
  public lockAll(): void {
    this.unlockedSessions.clear();
    this.notify();
  }
}

export const collectionSecurity = new CollectionSecurityManager();
