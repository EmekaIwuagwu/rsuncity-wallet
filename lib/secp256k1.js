// Republic of Suncity Wallet - Secp256k1 Cryptographic Library
// Simplified implementation for educational purposes

class Secp256k1 {
  constructor() {
    // secp256k1 curve parameters
    this.p = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');
    this.n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
    this.gx = BigInt('0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798');
    this.gy = BigInt('0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8');
    this.a = BigInt(0);
    this.b = BigInt(7);
  }

  // Modular arithmetic helpers
  modInverse(a, m) {
    if (a < 0n) a = (a % m + m) % m;
    
    let lm = 1n, hm = 0n;
    let low = a % m, high = m;
    
    while (low > 1n) {
      const ratio = high / low;
      const nm = hm - lm * ratio;
      const nw = high - low * ratio;
      hm = lm;
      high = low;
      lm = nm;
      low = nw;
    }
    
    return lm % m;
  }

  modPow(base, exp, mod) {
    if (mod === 1n) return 0n;
    let result = 1n;
    base = base % mod;
    while (exp > 0n) {
      if (exp % 2n === 1n) {
        result = (result * base) % mod;
      }
      exp = exp / 2n;
      base = (base * base) % mod;
    }
    return result;
  }

  // Point operations on the elliptic curve
  pointAdd(p1, p2) {
    if (!p1) return p2;
    if (!p2) return p1;
    
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    
    if (x1 === x2) {
      if (y1 === y2) {
        return this.pointDouble([x1, y1]);
      } else {
        return null; // Point at infinity
      }
    }
    
    const dx = (x2 - x1 + this.p) % this.p;
    const dy = (y2 - y1 + this.p) % this.p;
    const s = (dy * this.modInverse(dx, this.p)) % this.p;
    
    const x3 = (s * s - x1 - x2 + 2n * this.p) % this.p;
    const y3 = (s * (x1 - x3) - y1 + 2n * this.p) % this.p;
    
    return [x3, y3];
  }

  pointDouble(point) {
    const [x, y] = point;
    const s = ((3n * x * x + this.a) * this.modInverse(2n * y, this.p)) % this.p;
    const x3 = (s * s - 2n * x + this.p) % this.p;
    const y3 = (s * (x - x3) - y + 2n * this.p) % this.p;
    
    return [x3, y3];
  }

  pointMultiply(k, point = [this.gx, this.gy]) {
    if (k === 0n) return null;
    if (k === 1n) return point;
    
    let result = null;
    let addend = point;
    
    while (k > 0n) {
      if (k & 1n) {
        result = this.pointAdd(result, addend);
      }
      addend = this.pointDouble(addend);
      k >>= 1n;
    }
    
    return result;
  }

  // Convert between different formats
  bytesToHex(bytes) {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  bigIntToBytes(bigint, length = 32) {
    const bytes = new Uint8Array(length);
    for (let i = length - 1; i >= 0; i--) {
      bytes[i] = Number(bigint & 0xFFn);
      bigint >>= 8n;
    }
    return bytes;
  }

  bytesToBigInt(bytes) {
    let result = 0n;
    for (const byte of bytes) {
      result = (result << 8n) + BigInt(byte);
    }
    return result;
  }

  // Generate a random private key
  generatePrivateKey() {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    
    // Ensure the key is within valid range [1, n-1]
    let privateKey = this.bytesToBigInt(randomBytes);
    while (privateKey >= this.n || privateKey === 0n) {
      crypto.getRandomValues(randomBytes);
      privateKey = this.bytesToBigInt(randomBytes);
    }
    
    return this.bigIntToBytes(privateKey);
  }

  // Derive public key from private key
  getPublicKey(privateKey, compressed = true) {
    const privKeyBigInt = this.bytesToBigInt(privateKey);
    const point = this.pointMultiply(privKeyBigInt);
    
    if (!point) throw new Error('Invalid private key');
    
    const [x, y] = point;
    const xBytes = this.bigIntToBytes(x);
    
    if (compressed) {
      const prefix = (y % 2n === 0n) ? 0x02 : 0x03;
      const result = new Uint8Array(33);
      result[0] = prefix;
      result.set(xBytes, 1);
      return result;
    } else {
      const yBytes = this.bigIntToBytes(y);
      const result = new Uint8Array(65);
      result[0] = 0x04;
      result.set(xBytes, 1);
      result.set(yBytes, 33);
      return result;
    }
  }

  // Hash function (simplified SHA256 implementation)
  async sha256(data) {
    return await crypto.subtle.digest('SHA-256', data);
  }

  // Sign a message hash
  async sign(messageHash, privateKey, options = {}) {
    const { canonical = true, extraEntropy = null } = options;
    
    const privKeyBigInt = this.bytesToBigInt(privateKey);
    const msgHashBigInt = this.bytesToBigInt(new Uint8Array(messageHash));
    
    let k, r, s;
    let attempts = 0;
    
    do {
      // Generate deterministic k (simplified RFC 6979)
      k = await this.generateK(messageHash, privateKey, attempts);
      const kPoint = this.pointMultiply(k);
      
      if (!kPoint) continue;
      
      r = kPoint[0] % this.n;
      if (r === 0n) {
        attempts++;
        continue;
      }
      
      const kInv = this.modInverse(k, this.n);
      s = (kInv * (msgHashBigInt + r * privKeyBigInt)) % this.n;
      
      if (s === 0n) {
        attempts++;
        continue;
      }
      
      // Ensure canonical signature (low S value)
      if (canonical && s > this.n / 2n) {
        s = this.n - s;
      }
      
      break;
    } while (attempts < 256);
    
    if (attempts >= 256) {
      throw new Error('Unable to generate signature');
    }
    
    // Return signature in DER format
    return this.encodeDER(r, s);
  }

  // Verify a signature
  async verify(signature, messageHash, publicKey) {
    try {
      const { r, s } = this.decodeDER(signature);
      
      if (r >= this.n || s >= this.n || r === 0n || s === 0n) {
        return false;
      }
      
      const msgHashBigInt = this.bytesToBigInt(new Uint8Array(messageHash));
      const pubPoint = this.decodePublicKey(publicKey);
      
      if (!pubPoint) return false;
      
      const w = this.modInverse(s, this.n);
      const u1 = (msgHashBigInt * w) % this.n;
      const u2 = (r * w) % this.n;
      
      const point1 = this.pointMultiply(u1);
      const point2 = this.pointMultiply(u2, pubPoint);
      const resultPoint = this.pointAdd(point1, point2);
      
      if (!resultPoint) return false;
      
      return (resultPoint[0] % this.n) === r;
    } catch (error) {
      return false;
    }
  }

  // Generate deterministic k (simplified)
  async generateK(messageHash, privateKey, counter = 0) {
    const data = new Uint8Array(messageHash.byteLength + privateKey.length + 1);
    data.set(new Uint8Array(messageHash), 0);
    data.set(privateKey, messageHash.byteLength);
    data[data.length - 1] = counter;
    
    const hash = await this.sha256(data);
    let k = this.bytesToBigInt(new Uint8Array(hash));
    
    // Ensure k is in valid range
    k = k % (this.n - 1n) + 1n;
    
    return k;
  }

  // Decode public key from bytes
  decodePublicKey(publicKey) {
    if (publicKey.length === 33) {
      // Compressed format
      const prefix = publicKey[0];
      const x = this.bytesToBigInt(publicKey.slice(1));
      
      // Calculate y coordinate
      const ySquared = (this.modPow(x, 3n, this.p) + this.b) % this.p;
      let y = this.modPow(ySquared, (this.p + 1n) / 4n, this.p);
      
      // Choose correct y based on prefix
      if ((y % 2n === 0n && prefix === 0x03) || (y % 2n === 1n && prefix === 0x02)) {
        y = this.p - y;
      }
      
      return [x, y];
    } else if (publicKey.length === 65 && publicKey[0] === 0x04) {
      // Uncompressed format
      const x = this.bytesToBigInt(publicKey.slice(1, 33));
      const y = this.bytesToBigInt(publicKey.slice(33));
      return [x, y];
    }
    
    throw new Error('Invalid public key format');
  }

  // Encode signature in DER format
  encodeDER(r, s) {
    const rBytes = this.bigIntToBytes(r);
    const sBytes = this.bigIntToBytes(s);
    
    // Remove leading zeros, but keep one if the first bit is set
    let rStart = 0;
    while (rStart < rBytes.length - 1 && rBytes[rStart] === 0) {
      rStart++;
    }
    if (rBytes[rStart] & 0x80) rStart--;
    
    let sStart = 0;
    while (sStart < sBytes.length - 1 && sBytes[sStart] === 0) {
      sStart++;
    }
    if (sBytes[sStart] & 0x80) sStart--;
    
    const rDER = rBytes.slice(rStart);
    const sDER = sBytes.slice(sStart);
    
    const result = new Uint8Array(6 + rDER.length + sDER.length);
    let pos = 0;
    
    result[pos++] = 0x30; // SEQUENCE
    result[pos++] = result.length - 2; // Total length
    result[pos++] = 0x02; // INTEGER (r)
    result[pos++] = rDER.length;
    result.set(rDER, pos);
    pos += rDER.length;
    result[pos++] = 0x02; // INTEGER (s)
    result[pos++] = sDER.length;
    result.set(sDER, pos);
    
    return result;
  }

  // Decode signature from DER format
  decodeDER(signature) {
    let pos = 0;
    
    if (signature[pos++] !== 0x30) {
      throw new Error('Invalid DER signature');
    }
    
    const totalLength = signature[pos++];
    if (signature[pos++] !== 0x02) {
      throw new Error('Invalid DER signature');
    }
    
    const rLength = signature[pos++];
    const r = this.bytesToBigInt(signature.slice(pos, pos + rLength));
    pos += rLength;
    
    if (signature[pos++] !== 0x02) {
      throw new Error('Invalid DER signature');
    }
    
    const sLength = signature[pos++];
    const s = this.bytesToBigInt(signature.slice(pos, pos + sLength));
    
    return { r, s };
  }

  // Utility methods for wallet integration
  isValidPrivateKey(privateKey) {
    if (privateKey.length !== 32) return false;
    const privKeyBigInt = this.bytesToBigInt(privateKey);
    return privKeyBigInt > 0n && privKeyBigInt < this.n;
  }

  isValidPublicKey(publicKey) {
    try {
      const point = this.decodePublicKey(publicKey);
      // Verify the point is on the curve
      const [x, y] = point;
      const left = (y * y) % this.p;
      const right = (x * x * x + this.b) % this.p;
      return left === right;
    } catch {
      return false;
    }
  }

  // Create recoverable signature (for Ethereum-style recovery)
  async signRecoverable(messageHash, privateKey) {
    const signature = await this.sign(messageHash, privateKey);
    const { r, s } = this.decodeDER(signature);
    
    // Find recovery ID
    const msgHashBigInt = this.bytesToBigInt(new Uint8Array(messageHash));
    const publicKey = this.getPublicKey(privateKey, false);
    
    for (let recovery = 0; recovery < 4; recovery++) {
      const recoveredKey = this.recoverPublicKey(messageHash, r, s, recovery);
      if (recoveredKey && this.bytesToHex(recoveredKey) === this.bytesToHex(publicKey)) {
        return {
          r: this.bigIntToBytes(r),
          s: this.bigIntToBytes(s),
          recovery
        };
      }
    }
    
    throw new Error('Unable to create recoverable signature');
  }

  // Recover public key from signature
  recoverPublicKey(messageHash, r, s, recovery) {
    try {
      const msgHashBigInt = this.bytesToBigInt(new Uint8Array(messageHash));
      
      // Calculate point R
      let x = r;
      if (recovery >= 2) {
        x += this.n;
      }
      
      if (x >= this.p) return null;
      
      const ySquared = (this.modPow(x, 3n, this.p) + this.b) % this.p;
      let y = this.modPow(ySquared, (this.p + 1n) / 4n, this.p);
      
      if (y % 2n !== BigInt(recovery % 2)) {
        y = this.p - y;
      }
      
      const R = [x, y];
      const rInv = this.modInverse(r, this.n);
      
      const point1 = this.pointMultiply((this.n - msgHashBigInt) % this.n, [this.gx, this.gy]);
      const point2 = this.pointMultiply(s, R);
      const point = this.pointAdd(point1, point2);
      
      if (!point) return null;
      
      const finalPoint = this.pointMultiply(rInv, point);
      if (!finalPoint) return null;
      
      return this.getPublicKey(this.bigIntToBytes(finalPoint[0]), false);
    } catch {
      return null;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Secp256k1;
} else {
  // Browser environment
  window.Secp256k1 = Secp256k1;
}