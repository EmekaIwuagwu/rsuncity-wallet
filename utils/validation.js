// Republic of Suncity Wallet - Validation Utilities

class SuncityValidator {
  constructor() {
    this.bech32Prefix = 'sunc';
    this.bech32Charset = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  }

  // Address validation
  isValidAddress(address) {
    if (!address || typeof address !== 'string') {
      return { valid: false, error: 'Address is required and must be a string' };
    }

    // Check prefix
    if (!address.startsWith(this.bech32Prefix + '1')) {
      return { valid: false, error: `Address must start with ${this.bech32Prefix}1` };
    }

    // Check length
    if (address.length < 39 || address.length > 83) {
      return { valid: false, error: 'Invalid address length' };
    }

    // Check characters
    const data = address.slice(this.bech32Prefix.length + 1);
    const invalidChars = data.split('').filter(char => !this.bech32Charset.includes(char));
    
    if (invalidChars.length > 0) {
      return { valid: false, error: `Invalid characters in address: ${invalidChars.join(', ')}` };
    }

    // Basic bech32 checksum validation (simplified)
    if (!this.validateBech32Checksum(address)) {
      return { valid: false, error: 'Invalid address checksum' };
    }

    return { valid: true };
  }

  // Bech32 checksum validation (simplified)
  validateBech32Checksum(address) {
    try {
      const [prefix, data] = address.split('1');
      return prefix === this.bech32Prefix && data.length >= 6;
    } catch (error) {
      return false;
    }
  }

  // Amount validation
  isValidAmount(amount, options = {}) {
    const {
      allowZero = false,
      maxDecimals = 6,
      minAmount = '0',
      maxAmount = null
    } = options;

    if (!amount && amount !== 0 && amount !== '0') {
      return { valid: false, error: 'Amount is required' };
    }

    // Convert to string for processing
    const amountStr = amount.toString().trim();

    // Check for valid number format
    if (!/^\d*\.?\d*$/.test(amountStr)) {
      return { valid: false, error: 'Amount must be a valid number' };
    }

    const numAmount = parseFloat(amountStr);

    // Check if it's a valid number
    if (isNaN(numAmount)) {
      return { valid: false, error: 'Amount must be a valid number' };
    }

    // Check for negative numbers
    if (numAmount < 0) {
      return { valid: false, error: 'Amount cannot be negative' };
    }

    // Check for zero if not allowed
    if (!allowZero && numAmount === 0) {
      return { valid: false, error: 'Amount must be greater than zero' };
    }

    // Check decimal places
    const decimalParts = amountStr.split('.');
    if (decimalParts.length > 2) {
      return { valid: false, error: 'Invalid decimal format' };
    }

    if (decimalParts.length === 2 && decimalParts[1].length > maxDecimals) {
      return { valid: false, error: `Amount cannot have more than ${maxDecimals} decimal places` };
    }

    // Check minimum amount
    if (parseFloat(minAmount) > numAmount) {
      return { valid: false, error: `Amount must be at least ${minAmount}` };
    }

    // Check maximum amount
    if (maxAmount && parseFloat(maxAmount) < numAmount) {
      return { valid: false, error: `Amount cannot exceed ${maxAmount}` };
    }

    return { valid: true, amount: numAmount };
  }

  // Mnemonic validation
  isValidMnemonic(mnemonic) {
    if (!mnemonic || typeof mnemonic !== 'string') {
      return { valid: false, error: 'Mnemonic is required and must be a string' };
    }

    const words = mnemonic.trim().toLowerCase().split(/\s+/);

    // Check word count
    if (words.length !== 12 && words.length !== 24) {
      return { valid: false, error: 'Mnemonic must contain 12 or 24 words' };
    }

    // Check for empty words
    const emptyWords = words.filter(word => !word || word.length === 0);
    if (emptyWords.length > 0) {
      return { valid: false, error: 'Mnemonic contains empty words' };
    }

    // Check word format (basic validation)
    const invalidWords = words.filter(word => !/^[a-z]+$/.test(word) || word.length < 3);
    if (invalidWords.length > 0) {
      return { valid: false, error: `Invalid words in mnemonic: ${invalidWords.join(', ')}` };
    }

    // Check for duplicate words
    const uniqueWords = [...new Set(words)];
    if (uniqueWords.length !== words.length) {
      return { valid: false, error: 'Mnemonic contains duplicate words' };
    }

    return { valid: true, wordCount: words.length, words };
  }

  // Password validation
  isValidPassword(password, options = {}) {
    const {
      minLength = 8,
      requireUppercase = true,
      requireLowercase = true,
      requireNumber = true,
      requireSpecial = false,
      maxLength = 128
    } = options;

    if (!password || typeof password !== 'string') {
      return { valid: false, error: 'Password is required and must be a string' };
    }

    const checks = {
      length: password.length >= minLength && password.length <= maxLength,
      uppercase: !requireUppercase || /[A-Z]/.test(password),
      lowercase: !requireLowercase || /[a-z]/.test(password),
      number: !requireNumber || /\d/.test(password),
      special: !requireSpecial || /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    const failedChecks = [];

    if (!checks.length) {
      failedChecks.push(`Password must be between ${minLength} and ${maxLength} characters`);
    }
    if (!checks.uppercase) {
      failedChecks.push('Password must contain at least one uppercase letter');
    }
    if (!checks.lowercase) {
      failedChecks.push('Password must contain at least one lowercase letter');
    }
    if (!checks.number) {
      failedChecks.push('Password must contain at least one number');
    }
    if (!checks.special) {
      failedChecks.push('Password must contain at least one special character');
    }

    if (failedChecks.length > 0) {
      return { valid: false, error: failedChecks.join('. '), checks };
    }

    // Calculate password strength
    let strength = 0;
    if (password.length >= 12) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 1;
    if (password.length >= 16) strength += 1;

    const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const strengthLabel = strengthLabels[Math.min(strength, strengthLabels.length - 1)];

    return { 
      valid: true, 
      strength, 
      strengthLabel,
      checks 
    };
  }

  // Transaction validation
  isValidTransaction(txData) {
    const errors = [];

    // Validate sender address
    if (!txData.from) {
      errors.push('Sender address is required');
    } else {
      const fromValidation = this.isValidAddress(txData.from);
      if (!fromValidation.valid) {
        errors.push(`Invalid sender address: ${fromValidation.error}`);
      }
    }

    // Validate recipient address
    if (!txData.to) {
      errors.push('Recipient address is required');
    } else {
      const toValidation = this.isValidAddress(txData.to);
      if (!toValidation.valid) {
        errors.push(`Invalid recipient address: ${toValidation.error}`);
      }
    }

    // Check if sender and recipient are the same
    if (txData.from && txData.to && txData.from === txData.to) {
      errors.push('Sender and recipient addresses cannot be the same');
    }

    // Validate amount
    if (!txData.amount) {
      errors.push('Amount is required');
    } else {
      const amountValidation = this.isValidAmount(txData.amount);
      if (!amountValidation.valid) {
        errors.push(`Invalid amount: ${amountValidation.error}`);
      }
    }

    // Validate memo (optional)
    if (txData.memo && typeof txData.memo !== 'string') {
      errors.push('Memo must be a string');
    } else if (txData.memo && txData.memo.length > 256) {
      errors.push('Memo cannot exceed 256 characters');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : null
    };
  }

  // Land registration validation
  isValidLandRegistration(landData) {
    const errors = [];

    // Required fields
    const requiredFields = [
      'landRegistrationNumber',
      'ownerAddress',
      'locationAddress',
      'ownerName',
      'purchaseDate'
    ];

    requiredFields.forEach(field => {
      if (!landData[field] || landData[field].toString().trim() === '') {
        errors.push(`${this.camelToTitle(field)} is required`);
      }
    });

    // Validate owner address
    if (landData.ownerAddress) {
      const addressValidation = this.isValidAddress(landData.ownerAddress);
      if (!addressValidation.valid) {
        errors.push(`Invalid owner address: ${addressValidation.error}`);
      }
    }

    // Validate land registration number format
    if (landData.landRegistrationNumber && !/^[A-Z0-9]{3,20}$/.test(landData.landRegistrationNumber)) {
      errors.push('Land registration number must be 3-20 alphanumeric characters');
    }

    // Validate purchase date
    if (landData.purchaseDate) {
      const dateValidation = this.isValidDate(landData.purchaseDate);
      if (!dateValidation.valid) {
        errors.push(`Invalid purchase date: ${dateValidation.error}`);
      }
    }

    // Validate email if provided
    if (landData.emailAddress) {
      const emailValidation = this.isValidEmail(landData.emailAddress);
      if (!emailValidation.valid) {
        errors.push(`Invalid email address: ${emailValidation.error}`);
      }
    }

    // Validate phone if provided
    if (landData.phoneNumber) {
      const phoneValidation = this.isValidPhone(landData.phoneNumber);
      if (!phoneValidation.valid) {
        errors.push(`Invalid phone number: ${phoneValidation.error}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : null
    };
  }

  // Citizen registration validation
  isValidCitizenRegistration(citizenData) {
    const errors = [];

    // Required fields
    const requiredFields = [
      'personalRegistrationNumber',
      'address',
      'dateOfBirth',
      'gender'
    ];

    requiredFields.forEach(field => {
      if (!citizenData[field] || citizenData[field].toString().trim() === '') {
        errors.push(`${this.camelToTitle(field)} is required`);
      }
    });

    // Validate citizen address (wallet address)
    if (citizenData.address) {
      const addressValidation = this.isValidAddress(citizenData.address);
      if (!addressValidation.valid) {
        errors.push(`Invalid citizen address: ${addressValidation.error}`);
      }
    }

    // Validate personal registration number
    if (citizenData.personalRegistrationNumber && !/^[A-Z0-9]{5,20}$/.test(citizenData.personalRegistrationNumber)) {
      errors.push('Personal registration number must be 5-20 alphanumeric characters');
    }

    // Validate date of birth
    if (citizenData.dateOfBirth) {
      const dobValidation = this.isValidDateOfBirth(citizenData.dateOfBirth);
      if (!dobValidation.valid) {
        errors.push(`Invalid date of birth: ${dobValidation.error}`);
      }
    }

    // Validate gender
    if (citizenData.gender && !['M', 'F', 'Male', 'Female', 'Other'].includes(citizenData.gender)) {
      errors.push('Gender must be M, F, Male, Female, or Other');
    }

    // Validate email if provided
    if (citizenData.emailAddress) {
      const emailValidation = this.isValidEmail(citizenData.emailAddress);
      if (!emailValidation.valid) {
        errors.push(`Invalid email address: ${emailValidation.error}`);
      }
    }

    // Validate phone if provided
    if (citizenData.telephoneNumber) {
      const phoneValidation = this.isValidPhone(citizenData.telephoneNumber);
      if (!phoneValidation.valid) {
        errors.push(`Invalid telephone number: ${phoneValidation.error}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : null
    };
  }

  // Proposal validation
  isValidProposal(proposalData) {
    const errors = [];

    // Required fields
    if (!proposalData.title || proposalData.title.trim() === '') {
      errors.push('Proposal title is required');
    } else if (proposalData.title.length > 200) {
      errors.push('Proposal title cannot exceed 200 characters');
    }

    if (!proposalData.description || proposalData.description.trim() === '') {
      errors.push('Proposal description is required');
    } else if (proposalData.description.length > 2000) {
      errors.push('Proposal description cannot exceed 2000 characters');
    }

    // Validate voting period
    if (proposalData.votingPeriod && proposalData.votingPeriod < 86400) {
      errors.push('Voting period must be at least 24 hours (86400 seconds)');
    } else if (proposalData.votingPeriod && proposalData.votingPeriod > 2592000) {
      errors.push('Voting period cannot exceed 30 days (2592000 seconds)');
    }

    // Validate options
    if (proposalData.options && Array.isArray(proposalData.options)) {
      if (proposalData.options.length < 2) {
        errors.push('Proposal must have at least 2 voting options');
      } else if (proposalData.options.length > 10) {
        errors.push('Proposal cannot have more than 10 voting options');
      }

      // Check for empty or invalid options
      const invalidOptions = proposalData.options.filter(option => 
        !option || typeof option !== 'string' || option.trim() === ''
      );
      if (invalidOptions.length > 0) {
        errors.push('All voting options must be non-empty strings');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : null
    };
  }

  // Email validation
  isValidEmail(email) {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email is required and must be a string' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    if (email.length > 254) {
      return { valid: false, error: 'Email address is too long' };
    }

    return { valid: true };
  }

  // Phone validation
  isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return { valid: false, error: 'Phone number is required and must be a string' };
    }

    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return { valid: false, error: 'Phone number must contain 7-15 digits' };
    }

    return { valid: true };
  }

  // Date validation
  isValidDate(dateString) {
    if (!dateString) {
      return { valid: false, error: 'Date is required' };
    }

    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Invalid date format' };
    }

    // Check if date is not in the future
    if (date > new Date()) {
      return { valid: false, error: 'Date cannot be in the future' };
    }

    return { valid: true, date };
  }

  // Date of birth validation
  isValidDateOfBirth(dateString) {
    const dateValidation = this.isValidDate(dateString);
    
    if (!dateValidation.valid) {
      return dateValidation;
    }

    const birthDate = dateValidation.date;
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    
    // Check minimum age (18 years)
    if (age < 18) {
      return { valid: false, error: 'Must be at least 18 years old' };
    }

    // Check maximum reasonable age (150 years)
    if (age > 150) {
      return { valid: false, error: 'Invalid birth date - age cannot exceed 150 years' };
    }

    return { valid: true, age, date: birthDate };
  }

  // URL validation
  isValidURL(url) {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: 'URL is required and must be a string' };
    }

    try {
      new URL(url);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  // Utility functions
  camelToTitle(camelCase) {
    return camelCase
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  // Sanitize input
  sanitizeInput(input, options = {}) {
    if (typeof input !== 'string') {
      return input;
    }

    const {
      trim = true,
      toLowerCase = false,
      toUpperCase = false,
      removeSpecialChars = false,
      maxLength = null
    } = options;

    let sanitized = input;

    if (trim) {
      sanitized = sanitized.trim();
    }

    if (toLowerCase) {
      sanitized = sanitized.toLowerCase();
    }

    if (toUpperCase) {
      sanitized = sanitized.toUpperCase();
    }

    if (removeSpecialChars) {
      sanitized = sanitized.replace(/[^\w\s-]/gi, '');
    }

    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  // Batch validation
  validateBatch(data, validationRules) {
    const results = {};
    const errors = [];

    Object.keys(validationRules).forEach(field => {
      const value = data[field];
      const rules = validationRules[field];

      try {
        const result = this.validateField(value, rules);
        results[field] = result;
        
        if (!result.valid) {
          errors.push(`${field}: ${result.error}`);
        }
      } catch (error) {
        results[field] = { valid: false, error: error.message };
        errors.push(`${field}: ${error.message}`);
      }
    });

    return {
      valid: errors.length === 0,
      results,
      errors: errors.length > 0 ? errors : null
    };
  }

  validateField(value, rules) {
    for (const rule of rules) {
      const result = this[rule.method](value, rule.options);
      if (!result.valid) {
        return result;
      }
    }
    return { valid: true };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SuncityValidator;
} else {
  // Browser environment
  window.SuncityValidator = SuncityValidator;
}