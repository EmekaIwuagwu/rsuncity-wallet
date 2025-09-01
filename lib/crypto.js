// Republic of Suncity Wallet - Cryptographic Utilities

class SuncityCrypto {
  constructor() {
    this.bech32Prefix = 'sunc';
    this.hdPath = "m/44'/118'/0'/0/0"; // Cosmos standard derivation path
    this.bech32Charset = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  }

  // Generate secure random mnemonic
  async generateMnemonic() {
    // BIP39 word list (first 100 words for demo - full list would have 2048)
    const words = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
      'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
      'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
      'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
      'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'agent', 'agree',
      'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol',
      'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha',
      'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among', 'amount',
      'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry', 'animal',
      'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique', 'anxiety',
      'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arcade',
      'arch', 'arctic', 'area', 'arena', 'argue', 'arm', 'armed', 'armor',
      'army', 'around', 'arrange', 'arrest', 'arrive', 'arrow', 'art', 'article',
      'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset', 'assist', 'assume',
      'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction'
    ];
    
    const mnemonic = [];
    for (let i = 0; i < 24; i++) {
      const randomIndex = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / (0xffffffff + 1) * words.length);
      mnemonic.push(words[randomIndex]);
    }
    
    return mnemonic.join(' ');
  }

  // Validate mnemonic phrase
  validateMnemonic(mnemonic) {
    if (!mnemonic || typeof mnemonic !== 'string') {
      return false;
    }
    
    const words = mnemonic.trim().split(/\s+/);
    const isValidLength = words.length === 12 || words.length === 24;
    
    // Basic word validation (in real implementation, check against BIP39 wordlist)
    const hasValidWords = words.every(word => 
      word.length >= 3 && /^[a-z]+$/.test(word)
    );
    
    return isValidLength && hasValidWords;
  }

  // Derive private key from mnemonic
  async derivePrivateKey(mnemonic, hdPath = this.hdPath) {
    // Convert mnemonic to seed (mock implementation)
    const mnemonicBytes = new TextEncoder().encode(mnemonic);
    const seedHash = await this.sha256(mnemonicBytes);
    
    // Derive private key using HD path (simplified)
    const pathBytes = new TextEncoder().encode(hdPath);
    const combinedBytes = new Uint8Array(seedHash.byteLength + pathBytes.byteLength);
    combinedBytes.set(new Uint8Array(seedHash), 0);
    combinedBytes.set(pathBytes, seedHash.byteLength);
    
    const privateKeyHash = await this.sha256(combinedBytes);
    return this.arrayToHex(new Uint8Array(privateKeyHash.slice(0, 32)));
  }

  // Generate public key from private key (mock secp256k1)
  async getPublicKey(privateKeyHex) {
    const privateKeyBytes = this.hexToArray(privateKeyHex);
    
    // Mock secp256k1 public key generation
    const publicKey = new Uint8Array(33);
    publicKey[0] = 0x02; // Compressed public key prefix
    
    // Simple transformation for demo (not real secp256k1)
    for (let i = 1; i < 33; i++) {
      publicKey[i] = (privateKeyBytes[(i - 1) % 32] + i) % 256;
    }
    
    return this.arrayToHex(publicKey);
  }

  // Generate Bech32 address from public key
  async getAddress(publicKeyHex) {
    const publicKeyBytes = this.hexToArray(publicKeyHex);
    
    // Hash the public key (SHA256 + RIPEMD160)
    const sha256Hash = await this.sha256(publicKeyBytes);
    const addressBytes = new Uint8Array(20); // Mock RIPEMD160
    
    // Simple hash for demo
    for (let i = 0; i < 20; i++) {
      addressBytes[i] = new Uint8Array(sha256Hash)[i];
    }
    
    return this.bech32Encode(this.bech32Prefix, addressBytes);
  }

  // Bech32 encoding implementation
  bech32Encode(prefix, data) {
    const combined = this.bech32CreateChecksum(prefix, data);
    const encoded = combined.map(byte => this.bech32Charset[byte]).join('');
    return prefix + '1' + encoded;
  }

  bech32CreateChecksum(prefix, data) {
    const prefixBytes = this.bech32ExpandPrefix(prefix);
    const values = prefixBytes.concat(this.convertBits(data, 8, 5)).concat([0, 0, 0, 0, 0, 0]);
    const checksum = this.bech32Polymod(values) ^ 1;
    
    const result = [];
    for (let i = 0; i < 6; i++) {
      result.push((checksum >> (5 * (5 - i))) & 31);
    }
    
    return this.convertBits(data, 8, 5).concat(result);
  }

  bech32ExpandPrefix(prefix) {
    const result = [];
    for (let i = 0; i < prefix.length; i++) {
      result.push(prefix.charCodeAt(i) >> 5);
    }
    result.push(0);
    for (let i = 0; i < prefix.length; i++) {
      result.push(prefix.charCodeAt(i) & 31);
    }
    return result;
  }

  bech32Polymod(values) {
    const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    let chk = 1;
    
    for (const value of values) {
      const top = chk >> 25;
      chk = (chk & 0x1ffffff) << 5 ^ value;
      for (let i = 0; i < 5; i++) {
        chk ^= ((top >> i) & 1) ? GENERATOR[i] : 0;
      }
    }
    return chk;
  }

  convertBits(data, fromBits, toBits) {
    let acc = 0;
    let bits = 0;
    const result = [];
    const maxAcc = (1 << toBits) - 1;
    
    for (const value of data) {
      acc = (acc << fromBits) | value;
      bits += fromBits;
      while (bits >= toBits) {
        bits -= toBits;
        result.push((acc >> bits) & maxAcc);
      }
    }
    
    if (bits > 0) {
      result.push((acc << (toBits - bits)) & maxAcc);
    }
    
    return result;
  }

  // Sign transaction (mock ECDSA)
  async signTransaction(privateKeyHex, txBytes) {
    const privateKeyBytes = this.hexToArray(privateKeyHex);
    const txHash = await this.sha256(txBytes);
    
    // Mock ECDSA signature (64 bytes: r + s)
    const signature = new Uint8Array(64);
    const hashBytes = new Uint8Array(txHash);
    
    // Simple signature generation for demo
    for (let i = 0; i < 32; i++) {
      signature[i] = (hashBytes[i] + privateKeyBytes[i % 32]) % 256; // r component
      signature[i + 32] = (hashBytes[i] ^ privateKeyBytes[i % 32]) % 256; // s component
    }
    
    return this.arrayToHex(signature);
  }

  // Verify signature (mock)
  async verifySignature(publicKeyHex, signature, message) {
    // Mock verification - would use actual secp256k1 verification
    const pubKeyBytes = this.hexToArray(publicKeyHex);
    const sigBytes = this.hexToArray(signature);
    const msgBytes = new TextEncoder().encode(message);
    const msgHash = await this.sha256(msgBytes);
    
    // Simple verification check for demo
    return pubKeyBytes.length === 33 && sigBytes.length === 64;
  }

  // Encryption/Decryption for storage
  async encrypt(data, password) {
    const key = await this.deriveKeyFromPassword(password);
    const iv = crypto.getRandomValues(new Uint8Array(16));
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key.slice(0, 32),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    const dataBytes = new TextEncoder().encode(JSON.stringify(data));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      cryptoKey,
      dataBytes
    );
    
    return {
      encrypted: this.arrayToHex(new Uint8Array(encrypted)),
      iv: this.arrayToHex(iv),
      salt: this.arrayToHex(key.slice(32, 48)) // Use part of derived key as salt
    };
  }

  async decrypt(encryptedData, password) {
    const key = await this.deriveKeyFromPassword(password, this.hexToArray(encryptedData.salt));
    const iv = this.hexToArray(encryptedData.iv);
    const encrypted = this.hexToArray(encryptedData.encrypted);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key.slice(0, 32),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        cryptoKey,
        encrypted
      );
      
      const dataString = new TextDecoder().decode(decrypted);
      return JSON.parse(dataString);
    } catch (error) {
      throw new Error('Invalid password or corrupted data');
    }
  }

  // Derive key from password using PBKDF2
  async deriveKeyFromPassword(password, salt = null) {
    if (!salt) {
      salt = crypto.getRandomValues(new Uint8Array(16));
    }
    
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      384 // 48 bytes: 32 for key + 16 for salt
    );
    
    const result = new Uint8Array(derivedBits);
    // Append salt for later use
    const combined = new Uint8Array(48);
    combined.set(result.slice(0, 32), 0);
    combined.set(salt, 32);
    
    return combined;
  }

  // Utility functions
  async sha256(data) {
    return await crypto.subtle.digest('SHA-256', data);
  }

  arrayToHex(array) {
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  hexToArray(hex) {
    const result = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      result[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return result;
  }

  // Generate random bytes
  randomBytes(length) {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  // Format amounts
  formatAmount(amount, decimals = 6) {
    return (parseInt(amount) / Math.pow(10, decimals)).toFixed(decimals);
  }

  parseAmount(amount, decimals = 6) {
    return Math.floor(parseFloat(amount) * Math.pow(10, decimals)).toString();
  }

  // Validate address format
  isValidAddress(address) {
    if (!address || typeof address !== 'string') return false;
    if (!address.startsWith(this.bech32Prefix + '1')) return false;
    if (address.length < 39 || address.length > 83) return false;
    
    // Check bech32 charset
    const data = address.slice(this.bech32Prefix.length + 1);
    return data.split('').every(char => this.bech32Charset.includes(char));
  }

  // Key derivation for HD wallets
  async deriveChildKey(parentKey, index) {
    const parentBytes = this.hexToArray(parentKey);
    const indexBytes = new Uint8Array(4);
    
    // Convert index to bytes (big-endian)
    for (let i = 0; i < 4; i++) {
      indexBytes[3 - i] = (index >> (i * 8)) & 0xff;
    }
    
    const combined = new Uint8Array(parentBytes.length + indexBytes.length);
    combined.set(parentBytes, 0);
    combined.set(indexBytes, parentBytes.length);
    
    const childKeyHash = await this.sha256(combined);
    return this.arrayToHex(new Uint8Array(childKeyHash.slice(0, 32)));
  }

  // Create transaction hash
  async createTxHash(txBytes) {
    const hash = await this.sha256(txBytes);
    return this.arrayToHex(new Uint8Array(hash));
  }

  // Cosmos-specific amino encoding (simplified)
  aminoEncode(obj) {
    // Simplified amino encoding for demo
    return new TextEncoder().encode(JSON.stringify(obj));
  }

  // Create wallet from entropy
  async createWalletFromEntropy(entropy) {
    if (entropy.length < 16) {
      throw new Error('Entropy must be at least 128 bits');
    }
    
    // Generate mnemonic from entropy (simplified)
    const mnemonic = await this.generateMnemonic();
    const privateKey = await this.derivePrivateKey(mnemonic);
    const publicKey = await this.getPublicKey(privateKey);
    const address = await this.getAddress(publicKey);
    
    return {
      mnemonic,
      privateKey,
      publicKey,
      address
    };
  }

  // Validate private key
  isValidPrivateKey(privateKey) {
    if (!privateKey || typeof privateKey !== 'string') return false;
    if (privateKey.length !== 64) return false;
    return /^[0-9a-fA-F]{64}$/.test(privateKey);
  }

  // Generate keypair
  async generateKeypair() {
    const mnemonic = await this.generateMnemonic();
    return this.createWalletFromMnemonic(mnemonic);
  }

  async createWalletFromMnemonic(mnemonic) {
    if (!this.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }
    
    const privateKey = await this.derivePrivateKey(mnemonic);
    const publicKey = await this.getPublicKey(privateKey);
    const address = await this.getAddress(publicKey);
    
    return {
      mnemonic,
      privateKey,
      publicKey,
      address
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SuncityCrypto;
} else {
  // Browser environment
  window.SuncityCrypto = SuncityCrypto;
}