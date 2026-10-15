/**
 * SWI Registry
 * Manages and retrieves structural fingerprints for SWI modules.
 */

class SWIRegistry {
  private static _instance: SWIRegistry;
  private fingerprints: Record<string, string> = {
    'cek-core': '0x7f3a2b1c9d8e',
    'guardian-node': '0x1a2b3c4d5e6f',
    'vector-sync': '0x9a8b7c6d5e4f',
    'monitor-ui': '0xdeadbeef1234'
  };

  constructor() {
    if (SWIRegistry._instance) return SWIRegistry._instance;
    SWIRegistry._instance = this;
  }

  /**
   * Retrieves the expected structural fingerprint for a given module.
   */
  public getStructuralFingerprint(moduleId: string): string {
    return this.fingerprints[moduleId] || '0x000000000000';
  }

  /**
   * Updates a fingerprint in the registry (e.g., during an authorized patch).
   * Also used to simulate drift for testing.
   */
  public updateFingerprint(moduleId: string, fingerprint: string) {
    this.fingerprints[moduleId] = fingerprint;
  }

  /**
   * Lists all registered modules.
   */
  public getRegisteredModules(): string[] {
    return Object.keys(this.fingerprints);
  }
}

export const swiRegistry = new SWIRegistry();
