import { StorageProvider, StorageProviderType } from "./types";
import { IndexedDBStorageProvider } from "./IndexedDBStorageProvider";
import { SQLiteStorageProvider } from "./SQLiteStorageProvider";
import { Capacitor } from "@capacitor/core";

class StorageManagerService {
  private activeProvider: StorageProvider | null = null;
  private activeType: StorageProviderType = "indexeddb";
  private isInitialized: boolean = false;

  constructor() {
    this.selectDefaultProvider();
  }

  private selectDefaultProvider(): void {
    if (Capacitor.isNativePlatform()) {
      this.activeType = "sqlite";
      this.activeProvider = new SQLiteStorageProvider();
    } else {
      this.activeType = "indexeddb";
      this.activeProvider = new IndexedDBStorageProvider();
    }
  }

  public getProvider(): StorageProvider {
    if (!this.activeProvider) {
      this.selectDefaultProvider();
    }
    return this.activeProvider!;
  }

  public getProviderType(): StorageProviderType {
    return this.activeType;
  }

  public setProviderType(type: StorageProviderType): StorageProvider {
    if (type === "sqlite") {
      this.activeType = "sqlite";
      this.activeProvider = new SQLiteStorageProvider();
    } else {
      this.activeType = "indexeddb";
      this.activeProvider = new IndexedDBStorageProvider();
    }
    this.isInitialized = false;
    return this.activeProvider;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    const provider = this.getProvider();
    await provider.initialize();
    this.isInitialized = true;
  }
}

export const StorageManager = new StorageManagerService();
export const storageProvider = StorageManager.getProvider();
