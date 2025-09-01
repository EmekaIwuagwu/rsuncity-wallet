// Republic of Suncity Wallet - Storage Utilities

class SuncityStorage {
  constructor() {
    this.storagePrefix = 'suncity_';
    this.encryptionEnabled = true;
  }

  // Get storage key with prefix
  getStorageKey(key) {
    return this.storagePrefix + key;
  }

  // Store wallet data securely
  async storeWalletData(walletData, password) {
    try {
      if (!walletData || !password) {
        throw new Error('Wallet data and password are required');
      }

      // Import crypto utilities
      const crypto = new SuncityCrypto();
      
      // Encrypt sensitive data
      const encryptedData = await crypto.encrypt({
        mnemonic: walletData.mnemonic,
        privateKey: walletData.privateKey
      }, password);

      // Store encrypted data and non-sensitive metadata
      const storageData = {
        encrypted: encryptedData,
        publicKey: walletData.publicKey,
        address: walletData.address,
        created: walletData.created || Date.now(),
        imported: walletData.imported || false,
        version: '1.0.0'
      };

      await this.setItem('walletData', storageData);
      await this.setItem('isLocked', false);
      
      // Store password hash for verification (in production, use proper hashing)
      const passwordHash = await this.hashPassword(password);
      await this.setItem('passwordHash', passwordHash);

      return { success: true };
    } catch (error) {
      console.error('Failed to store wallet data:', error);
      throw new Error('Failed to store wallet data: ' + error.message);
    }
  }

  // Retrieve and decrypt wallet data
  async getWalletData(password) {
    try {
      const storageData = await this.getItem('walletData');
      if (!storageData) {
        return null;
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password);
      if (!isValidPassword) {
        throw new Error('Invalid password');
      }

      // Import crypto utilities
      const crypto = new SuncityCrypto();
      
      // Decrypt sensitive data
      const decryptedData = await crypto.decrypt(storageData.encrypted, password);

      return {
        mnemonic: decryptedData.mnemonic,
        privateKey: decryptedData.privateKey,
        publicKey: storageData.publicKey,
        address: storageData.address,
        created: storageData.created,
        imported: storageData.imported
      };
    } catch (error) {
      console.error('Failed to retrieve wallet data:', error);
      throw new Error('Failed to retrieve wallet data: ' + error.message);
    }
  }

  // Lock wallet
  async lockWallet() {
    await this.setItem('isLocked', true);
    await this.removeItem('sessionData');
  }

  // Unlock wallet
  async unlockWallet(password) {
    try {
      const isValidPassword = await this.verifyPassword(password);
      if (!isValidPassword) {
        throw new Error('Invalid password');
      }

      await this.setItem('isLocked', false);
      await this.setItem('sessionData', {
        unlocked: true,
        timestamp: Date.now()
      });

      return { success: true };
    } catch (error) {
      throw new Error('Failed to unlock wallet: ' + error.message);
    }
  }

  // Check if wallet is locked
  async isWalletLocked() {
    const isLocked = await this.getItem('isLocked');
    return isLocked !== false; // Default to locked if not set
  }

  // Store network configuration
  async storeNetworkConfig(config) {
    await this.setItem('networkConfig', {
      ...config,
      updated: Date.now()
    });
  }

  // Get network configuration
  async getNetworkConfig() {
    const config = await this.getItem('networkConfig');
    return config || {
      chainId: "rsuncitychain",
      chainName: "Republic of Suncity",
      rpc: "http://localhost:26657",
      rest: "http://localhost:1317",
      bech32Config: {
        bech32PrefixAccAddr: "sunc",
        bech32PrefixAccPub: "suncpub"
      },
      currencies: [{
        coinDenom: "SUNC",
        coinMinimalDenom: "sunc",
        coinDecimals: 6
      }]
    };
  }

  // Store transaction history
  async storeTransactionHistory(address, transactions) {
    const key = `txHistory_${address}`;
    await this.setItem(key, {
      transactions,
      updated: Date.now(),
      address
    });
  }

  // Get transaction history
  async getTransactionHistory(address) {
    const key = `txHistory_${address}`;
    const data = await this.getItem(key);
    return data?.transactions || [];
  }

  // Store connected sites
  async storeConnectedSites(sites) {
    await this.setItem('connectedSites', sites);
  }

  // Get connected sites
  async getConnectedSites() {
    return await this.getItem('connectedSites') || {};
  }

  // Add connected site
  async addConnectedSite(origin, permissions = {}) {
    const sites = await this.getConnectedSites();
    sites[origin] = {
      connected: true,
      timestamp: Date.now(),
      permissions,
      ...permissions
    };
    await this.storeConnectedSites(sites);
  }

  // Remove connected site
  async removeConnectedSite(origin) {
    const sites = await this.getConnectedSites();
    delete sites[origin];
    await this.storeConnectedSites(sites);
  }

  // Store proposals cache
  async storeProposals(proposals) {
    await this.setItem('cachedProposals', {
      proposals,
      lastUpdate: Date.now()
    });
  }

  // Get proposals cache
  async getProposals() {
    const data = await this.getItem('cachedProposals');
    if (!data) return { proposals: [], lastUpdate: 0 };
    
    // Check if cache is stale (older than 15 minutes)
    const isStale = (Date.now() - data.lastUpdate) > 15 * 60 * 1000;
    return {
      proposals: data.proposals || [],
      lastUpdate: data.lastUpdate,
      isStale
    };
  }

  // Store land records cache
  async storeLandRecords(records) {
    await this.setItem('cachedLandRecords', {
      records,
      lastUpdate: Date.now()
    });
  }

  // Get land records cache
  async getLandRecords() {
    const data = await this.getItem('cachedLandRecords');
    return data?.records || [];
  }

  // Store citizen records cache
  async storeCitizenRecords(records) {
    await this.setItem('cachedCitizenRecords', {
      records,
      lastUpdate: Date.now()
    });
  }

  // Get citizen records cache
  async getCitizenRecords() {
    const data = await this.getItem('cachedCitizenRecords');
    return data?.records || [];
  }

  // Store user preferences
  async storePreferences(preferences) {
    const existing = await this.getPreferences();
    const updated = {
      ...existing,
      ...preferences,
      updated: Date.now()
    };
    await this.setItem('userPreferences', updated);
  }

  // Get user preferences
  async getPreferences() {
    return await this.getItem('userPreferences') || {
      theme: 'default',
      currency: 'SUNC',
      language: 'en',
      notifications: true,
      autoLock: 30, // minutes
      showTestNetworks: false
    };
  }

  // Store balance cache
  async storeBalance(address, balance) {
    const key = `balance_${address}`;
    await this.setItem(key, {
      balance,
      updated: Date.now(),
      address
    });
  }

  // Get balance cache
  async getBalance(address) {
    const key = `balance_${address}`;
    const data = await this.getItem(key);
    
    if (!data) return null;
    
    // Check if balance is stale (older than 30 seconds)
    const isStale = (Date.now() - data.updated) > 30 * 1000;
    return {
      balance: data.balance,
      updated: data.updated,
      isStale
    };
  }

  // Password utilities
  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async verifyPassword(password) {
    try {
      const storedHash = await this.getItem('passwordHash');
      if (!storedHash) return false;
      
      const currentHash = await this.hashPassword(password);
      return currentHash === storedHash;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  // Storage interface methods
  async setItem(key, value) {
    const storageKey = this.getStorageKey(key);
    try {
      await chrome.storage.local.set({ [storageKey]: value });
    } catch (error) {
      console.error(`Failed to set storage item ${key}:`, error);
      throw error;
    }
  }

  async getItem(key) {
    const storageKey = this.getStorageKey(key);
    try {
      const result = await chrome.storage.local.get([storageKey]);
      return result[storageKey];
    } catch (error) {
      console.error(`Failed to get storage item ${key}:`, error);
      return null;
    }
  }

  async removeItem(key) {
    const storageKey = this.getStorageKey(key);
    try {
      await chrome.storage.local.remove([storageKey]);
    } catch (error) {
      console.error(`Failed to remove storage item ${key}:`, error);
      throw error;
    }
  }

  async clear() {
    try {
      // Get all storage keys with our prefix
      const allItems = await chrome.storage.local.get(null);
      const keysToRemove = Object.keys(allItems).filter(key => 
        key.startsWith(this.storagePrefix)
      );
      
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
      }
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw error;
    }
  }

  // Backup and restore
  async createBackup() {
    try {
      const allItems = await chrome.storage.local.get(null);
      const walletData = {};
      
      // Only backup wallet-related data
      Object.keys(allItems).forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          walletData[key] = allItems[key];
        }
      });

      return {
        version: '1.0.0',
        timestamp: Date.now(),
        data: walletData
      };
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  }

  async restoreFromBackup(backupData) {
    try {
      if (!backupData || !backupData.data) {
        throw new Error('Invalid backup data');
      }

      // Clear existing data first
      await this.clear();

      // Restore data
      await chrome.storage.local.set(backupData.data);

      return { success: true };
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      throw error;
    }
  }

  // Storage space management
  async getStorageInfo() {
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES;
      
      return {
        bytesInUse,
        quota,
        percentUsed: (bytesInUse / quota) * 100
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return {
        bytesInUse: 0,
        quota: 0,
        percentUsed: 0
      };
    }
  }

  // Clean up old data
  async cleanupOldData() {
    try {
      const allItems = await chrome.storage.local.get(null);
      const keysToRemove = [];
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

      Object.keys(allItems).forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          const item = allItems[key];
          
          // Remove old transaction history
          if (key.includes('txHistory_') && item.updated && item.updated < oneWeekAgo) {
            keysToRemove.push(key);
          }
          
          // Remove old balance cache
          if (key.includes('balance_') && item.updated && item.updated < oneWeekAgo) {
            keysToRemove.push(key);
          }
          
          // Remove old proposal cache
          if (key.includes('cachedProposals') && item.lastUpdate && item.lastUpdate < oneWeekAgo) {
            keysToRemove.push(key);
          }
        }
      });

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log(`Cleaned up ${keysToRemove.length} old storage items`);
      }

      return { removed: keysToRemove.length };
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
      throw error;
    }
  }

  // Migration utilities
  async migrateData(fromVersion, toVersion) {
    try {
      console.log(`Migrating data from version ${fromVersion} to ${toVersion}`);
      
      // Add migration logic here as needed
      // For now, just update version
      const preferences = await this.getPreferences();
      preferences.version = toVersion;
      await this.storePreferences(preferences);
      
      return { success: true };
    } catch (error) {
      console.error('Data migration failed:', error);
      throw error;
    }
  }

  // Session management
  async createSession(sessionData) {
    const session = {
      ...sessionData,
      created: Date.now(),
      expires: Date.now() + (30 * 60 * 1000) // 30 minutes
    };
    await this.setItem('currentSession', session);
    return session;
  }

  async getSession() {
    const session = await this.getItem('currentSession');
    
    if (!session) return null;
    
    // Check if session has expired
    if (Date.now() > session.expires) {
      await this.removeItem('currentSession');
      return null;
    }
    
    return session;
  }

  async extendSession() {
    const session = await this.getSession();
    if (session) {
      session.expires = Date.now() + (30 * 60 * 1000); // Extend by 30 minutes
      await this.setItem('currentSession', session);
    }
    return session;
  }

  async destroySession() {
    await this.removeItem('currentSession');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SuncityStorage;
} else {
  // Browser environment
  window.SuncityStorage = SuncityStorage;
}