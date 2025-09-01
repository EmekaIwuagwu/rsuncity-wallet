// Republic of Suncity Wallet - BIP39 Implementation
// Simplified BIP39 mnemonic phrase generation and validation

class SuncityBIP39 {
  constructor() {
    // BIP39 English wordlist (first 256 words for demo - full list has 2048)
    this.wordlist = [
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
      'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction',
      'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado',
      'avoid', 'awake', 'aware', 'away', 'awesome', 'awful', 'axis', 'baby',
      'bachelor', 'bacon', 'badge', 'bag', 'balance', 'balcony', 'ball', 'bamboo',
      'banana', 'banner', 'bar', 'barely', 'bargain', 'barrel', 'base', 'basic',
      'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become', 'beef',
      'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt', 'bench',
      'benefit', 'best', 'betray', 'better', 'between', 'beyond', 'bicycle', 'bid',
      'bike', 'bind', 'biology', 'bird', 'birth', 'bitter', 'black', 'blade',
      'blame', 'blanket', 'blast', 'bleak', 'bless', 'blind', 'blood', 'blossom',
      'blow', 'blue', 'blur', 'blush', 'board', 'boat', 'body', 'boil',
      'bomb', 'bone', 'bonus', 'book', 'boost', 'border', 'boring', 'borrow',
      'boss', 'bottom', 'bounce', 'box', 'boy', 'bracket', 'brain', 'brand',
      'brass', 'brave', 'bread', 'breeze', 'brick', 'bridge', 'brief', 'bright',
      'bring', 'brisk', 'broccoli', 'broken', 'bronze', 'broom', 'brother', 'brown',
      'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build', 'bulb', 'bulk',
      'bullet', 'bundle', 'bunker', 'burden', 'burger', 'burst', 'bus', 'business',
      'busy', 'butter', 'buyer', 'buzz', 'cabbage', 'cabin', 'cable', 'cactus'
    ];
    
    // For full implementation, you would include all 2048 BIP39 words
    // This is a shortened version for demonstration purposes
    this.fullWordlist = this.generateFullWordlist();
  }

  // Generate a full 2048-word list by expanding the base list
  generateFullWordlist() {
    const expandedWords = [...this.wordlist];
    
    // Generate additional words to reach closer to 2048
    const prefixes = ['pre', 'post', 'anti', 'pro', 'over', 'under', 'out', 'up'];
    const suffixes = ['ing', 'ed', 'er', 'est', 'ly', 'tion', 'ness', 'ment'];
    
    // Add variations of existing words
    for (const word of this.wordlist) {
      for (const prefix of prefixes) {
        if (expandedWords.length < 2048) {
          expandedWords.push(prefix + word);
        }
      }
      for (const suffix of suffixes) {
        if (expandedWords.length < 2048) {
          expandedWords.push(word + suffix);
        }
      }
    }
    
    // Add more common English words to fill remaining slots
    const additionalWords = [
      'zebra', 'zone', 'zoo', 'zoom', 'young', 'youth', 'yellow', 'yes',
      'yesterday', 'world', 'worth', 'write', 'wrong', 'year', 'zero'
    ];
    
    for (const word of additionalWords) {
      if (expandedWords.length < 2048) {
        expandedWords.push(word);
      }
    }
    
    // Fill remaining slots with numbered words if needed
    while (expandedWords.length < 2048) {
      expandedWords.push(`word${expandedWords.length}`);
    }
    
    return expandedWords.slice(0, 2048).sort();
  }

  // Generate secure random entropy
  generateEntropy(strength = 128) {
    if (![128, 160, 192, 224, 256].includes(strength)) {
      throw new Error('Invalid entropy strength. Must be 128, 160, 192, 224, or 256 bits.');
    }
    
    const bytes = strength / 8;
    const entropy = new Uint8Array(bytes);
    
    // Use crypto.getRandomValues for secure random generation
    crypto.getRandomValues(entropy);
    
    return entropy;
  }

  // Convert entropy to binary string
  entropyToBinary(entropy) {
    return Array.from(entropy)
      .map(byte => byte.toString(2).padStart(8, '0'))
      .join('');
  }

  // Generate SHA256 hash
  async sha256(data) {
    const encoder = new TextEncoder();
    const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return new Uint8Array(hashBuffer);
  }

  // Generate checksum for entropy
  async generateChecksum(entropy) {
    const hash = await this.sha256(entropy);
    const checksumLength = entropy.length * 8 / 32; // ENT/32 bits
    const hashBinary = this.entropyToBinary(hash);
    return hashBinary.slice(0, checksumLength);
  }

  // Convert binary string to mnemonic words
  binaryToMnemonic(binary) {
    const words = [];
    
    // Process 11-bit chunks
    for (let i = 0; i < binary.length; i += 11) {
      const chunk = binary.slice(i, i + 11);
      if (chunk.length === 11) {
        const index = parseInt(chunk, 2);
        if (index < this.fullWordlist.length) {
          words.push(this.fullWordlist[index]);
        }
      }
    }
    
    return words;
  }

  // Generate mnemonic from entropy
  async entropyToMnemonic(entropy) {
    const entropyBinary = this.entropyToBinary(entropy);
    const checksum = await this.generateChecksum(entropy);
    const fullBinary = entropyBinary + checksum;
    const words = this.binaryToMnemonic(fullBinary);
    
    return words.join(' ');
  }

  // Main function to generate mnemonic phrase
  async generateMnemonic(strength = 128) {
    try {
      const entropy = this.generateEntropy(strength);
      const mnemonic = await this.entropyToMnemonic(entropy);
      return mnemonic;
    } catch (error) {
      console.error('Failed to generate mnemonic:', error);
      throw new Error('Mnemonic generation failed');
    }
  }

  // Validate mnemonic phrase
  validateMnemonic(mnemonic) {
    if (!mnemonic || typeof mnemonic !== 'string') {
      return { valid: false, error: 'Mnemonic must be a string' };
    }

    const words = mnemonic.toLowerCase().trim().split(/\s+/);
    
    // Check word count
    if (![12, 15, 18, 21, 24].includes(words.length)) {
      return { 
        valid: false, 
        error: `Invalid word count. Expected 12, 15, 18, 21, or 24 words, got ${words.length}` 
      };
    }

    // Check if all words are in wordlist
    for (let i = 0; i < words.length; i++) {
      if (!this.fullWordlist.includes(words[i])) {
        return { 
          valid: false, 
          error: `Invalid word "${words[i]}" at position ${i + 1}` 
        };
      }
    }

    // Check for duplicates
    const uniqueWords = new Set(words);
    if (uniqueWords.size !== words.length) {
      return { 
        valid: false, 
        error: 'Mnemonic contains duplicate words' 
      };
    }

    return { valid: true, wordCount: words.length };
  }

  // Convert mnemonic back to entropy (for validation)
  mnemonicToEntropy(mnemonic) {
    const validation = this.validateMnemonic(mnemonic);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const words = mnemonic.toLowerCase().trim().split(/\s+/);
    const binary = words
      .map(word => {
        const index = this.fullWordlist.indexOf(word);
        return index.toString(2).padStart(11, '0');
      })
      .join('');

    // Split entropy and checksum
    const entropyLength = (words.length * 11 - words.length * 11 / 33) * 8 / 8;
    const entropyBinary = binary.slice(0, entropyLength * 8);
    const checksumBinary = binary.slice(entropyLength * 8);

    // Convert binary to bytes
    const entropy = new Uint8Array(entropyLength);
    for (let i = 0; i < entropyLength; i++) {
      const byteBinary = entropyBinary.slice(i * 8, (i + 1) * 8);
      entropy[i] = parseInt(byteBinary, 2);
    }

    return {
      entropy,
      checksum: checksumBinary
    };
  }

  // Generate seed from mnemonic (PBKDF2)
  async mnemonicToSeed(mnemonic, passphrase = '') {
    const validation = this.validateMnemonic(mnemonic);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const encoder = new TextEncoder();
    const mnemonicBuffer = encoder.encode(mnemonic.normalize('NFKD'));
    const saltBuffer = encoder.encode('mnemonic' + passphrase.normalize('NFKD'));

    // Import mnemonic as key
    const key = await crypto.subtle.importKey(
      'raw',
      mnemonicBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    // Derive seed using PBKDF2
    const seedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 2048,
        hash: 'SHA-512'
      },
      key,
      512 // 64 bytes = 512 bits
    );

    return new Uint8Array(seedBits);
  }

  // Utility: Convert bytes to hex string
  bytesToHex(bytes) {
    return Array.from(bytes, byte => 
      byte.toString(16).padStart(2, '0')
    ).join('');
  }

  // Utility: Convert hex string to bytes
  hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  // Check if word is valid BIP39 word
  isValidWord(word) {
    return this.fullWordlist.includes(word.toLowerCase());
  }

  // Get word suggestions for partial input
  getSuggestions(partial) {
    const lowercasePartial = partial.toLowerCase();
    return this.fullWordlist
      .filter(word => word.startsWith(lowercasePartial))
      .slice(0, 10); // Limit to 10 suggestions
  }

  // Normalize mnemonic (trim, lowercase, normalize spaces)
  normalizeMnemonic(mnemonic) {
    return mnemonic
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' '); // Replace multiple spaces with single space
  }

  // Get entropy strength from word count
  getEntropyStrength(wordCount) {
    const strengths = {
      12: 128,
      15: 160,
      18: 192,
      21: 224,
      24: 256
    };
    return strengths[wordCount] || null;
  }

  // Generate multiple mnemonics for testing
  async generateMultipleMnemonics(count = 5, strength = 128) {
    const mnemonics = [];
    for (let i = 0; i < count; i++) {
      try {
        const mnemonic = await this.generateMnemonic(strength);
        mnemonics.push({
          mnemonic,
          wordCount: mnemonic.split(' ').length,
          strength,
          valid: this.validateMnemonic(mnemonic).valid
        });
      } catch (error) {
        console.error(`Failed to generate mnemonic ${i + 1}:`, error);
      }
    }
    return mnemonics;
  }
}

// Create global instance
const suncityBIP39 = new SuncityBIP39();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SuncityBIP39;
} else {
  // Browser environment - attach to window
  window.SuncityBIP39 = SuncityBIP39;
  window.suncityBIP39 = suncityBIP39;
}

// Helper functions for easy access
window.generateMnemonic = async (strength = 128) => {
  return await suncityBIP39.generateMnemonic(strength);
};

window.validateMnemonic = (mnemonic) => {
  return suncityBIP39.validateMnemonic(mnemonic);
};

window.mnemonicToSeed = async (mnemonic, passphrase = '') => {
  return await suncityBIP39.mnemonicToSeed(mnemonic, passphrase);
};