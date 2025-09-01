// Republic of Suncity Wallet - Formatting Utilities

class SuncityFormatter {
  constructor() {
    this.defaultDecimals = 6;
    this.currencySymbol = 'SUNC';
    this.locale = 'en-US';
  }

  // Format token amounts
  formatAmount(amount, options = {}) {
    const {
      decimals = this.defaultDecimals,
      symbol = this.currencySymbol,
      showSymbol = true,
      showFullPrecision = false,
      useThousandsSeparator = true,
      minDecimals = null,
      maxDecimals = null
    } = options;

    if (!amount && amount !== 0) {
      return showSymbol ? `0 ${symbol}` : '0';
    }

    let numAmount;
    
    // Handle different input types
    if (typeof amount === 'string') {
      // If it's a string representation of wei/micro units
      if (/^\d+$/.test(amount)) {
        numAmount = parseInt(amount) / Math.pow(10, decimals);
      } else {
        numAmount = parseFloat(amount);
      }
    } else {
      numAmount = parseFloat(amount);
    }

    if (isNaN(numAmount)) {
      return showSymbol ? `0 ${symbol}` : '0';
    }

    // Determine decimal places to show
    let decimalPlaces = decimals;
    
    if (!showFullPrecision) {
      // For display, show fewer decimals for readability
      if (numAmount >= 1000) {
        decimalPlaces = 2;
      } else if (numAmount >= 1) {
        decimalPlaces = 4;
      } else {
        decimalPlaces = 6;
      }
    }

    if (minDecimals !== null) {
      decimalPlaces = Math.max(decimalPlaces, minDecimals);
    }
    
    if (maxDecimals !== null) {
      decimalPlaces = Math.min(decimalPlaces, maxDecimals);
    }

    // Format the number
    const formatOptions = {
      minimumFractionDigits: showFullPrecision ? decimals : 0,
      maximumFractionDigits: decimalPlaces,
      useGrouping: useThousandsSeparator
    };

    const formattedAmount = numAmount.toLocaleString(this.locale, formatOptions);
    
    return showSymbol ? `${formattedAmount} ${symbol}` : formattedAmount;
  }

  // Parse amount from string to micro units
  parseAmount(amount, decimals = this.defaultDecimals) {
    if (!amount && amount !== 0) {
      return '0';
    }

    const numAmount = parseFloat(amount.toString().replace(/[^\d.-]/g, ''));
    
    if (isNaN(numAmount)) {
      return '0';
    }

    // Convert to micro units
    const microAmount = Math.floor(numAmount * Math.pow(10, decimals));
    return microAmount.toString();
  }

  // Format balance with appropriate precision
  formatBalance(balance, options = {}) {
    const {
      showZeroBalance = true,
      shortFormat = false,
      includeUSD = false,
      usdRate = null
    } = options;

    const formattedSunc = this.formatAmount(balance, {
      ...options,
      showFullPrecision: false
    });

    if (!showZeroBalance && parseFloat(balance || 0) === 0) {
      return '';
    }

    let result = formattedSunc;

    // Add short format for large amounts
    if (shortFormat) {
      const numBalance = parseFloat(balance || 0);
      if (numBalance >= 1000000) {
        result = this.formatAmount(numBalance / 1000000, {
          maxDecimals: 2,
          symbol: 'M SUNC'
        });
      } else if (numBalance >= 1000) {
        result = this.formatAmount(numBalance / 1000, {
          maxDecimals: 2,
          symbol: 'K SUNC'
        });
      }
    }

    // Add USD value if requested and rate is available
    if (includeUSD && usdRate) {
      const usdValue = parseFloat(balance || 0) * usdRate;
      const formattedUSD = this.formatCurrency(usdValue, 'USD');
      result += ` (${formattedUSD})`;
    }

    return result;
  }

  // Format currency values
  formatCurrency(amount, currency = 'USD', options = {}) {
    const {
      showSymbol = true,
      decimals = 2
    } = options;

    if (!amount && amount !== 0) {
      return showSymbol ? '$0.00' : '0.00';
    }

    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount)) {
      return showSymbol ? '$0.00' : '0.00';
    }

    const formatOptions = {
      style: showSymbol ? 'currency' : 'decimal',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    };

    return numAmount.toLocaleString(this.locale, formatOptions);
  }

  // Format addresses with truncation
  formatAddress(address, options = {}) {
    const {
      startChars = 6,
      endChars = 4,
      separator = '...',
      showFull = false
    } = options;

    if (!address || typeof address !== 'string') {
      return '';
    }

    if (showFull || address.length <= startChars + endChars + separator.length) {
      return address;
    }

    return `${address.slice(0, startChars)}${separator}${address.slice(-endChars)}`;
  }

  // Format transaction hashes
  formatTxHash(hash, options = {}) {
    const {
      startChars = 8,
      endChars = 6,
      separator = '...',
      uppercase = true
    } = options;

    if (!hash) {
      return '';
    }

    let formattedHash = hash;
    
    if (uppercase) {
      formattedHash = formattedHash.toUpperCase();
    }

    return this.formatAddress(formattedHash, {
      startChars,
      endChars,
      separator
    });
  }

  // Format dates and times
  formatDate(date, options = {}) {
    const {
      format = 'full', // 'full', 'date', 'time', 'relative'
      timezone = 'local',
      showSeconds = false
    } = options;

    if (!date) {
      return '';
    }

    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    switch (format) {
      case 'date':
        return dateObj.toLocaleDateString(this.locale);
      
      case 'time':
        const timeOptions = {
          hour: '2-digit',
          minute: '2-digit'
        };
        if (showSeconds) {
          timeOptions.second = '2-digit';
        }
        return dateObj.toLocaleTimeString(this.locale, timeOptions);
      
      case 'relative':
        return this.formatRelativeTime(dateObj);
      
      case 'full':
      default:
        return dateObj.toLocaleString(this.locale, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: showSeconds ? '2-digit' : undefined
        });
    }
  }

  // Format relative time (e.g., "2 hours ago")
  formatRelativeTime(date) {
    const now = new Date();
    const dateObj = date instanceof Date ? date : new Date(date);
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) {
      return diffInSeconds <= 1 ? 'just now' : `${diffInSeconds} seconds ago`;
    } else if (diffInMinutes < 60) {
      return diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
    } else if (diffInDays < 30) {
      return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
    } else {
      return this.formatDate(dateObj, { format: 'date' });
    }
  }

  // Format duration (e.g., voting period)
  formatDuration(seconds, options = {}) {
    const {
      shortFormat = false,
      showSeconds = false
    } = options;

    if (!seconds || seconds < 0) {
      return '0 seconds';
    }

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const parts = [];

    if (days > 0) {
      parts.push(shortFormat ? `${days}d` : `${days} day${days !== 1 ? 's' : ''}`);
    }
    
    if (hours > 0) {
      parts.push(shortFormat ? `${hours}h` : `${hours} hour${hours !== 1 ? 's' : ''}`);
    }
    
    if (minutes > 0 && (days === 0 || shortFormat)) {
      parts.push(shortFormat ? `${minutes}m` : `${minutes} minute${minutes !== 1 ? 's' : ''}`);
    }
    
    if (showSeconds && remainingSeconds > 0 && days === 0 && hours === 0) {
      parts.push(shortFormat ? `${remainingSeconds}s` : `${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`);
    }

    if (parts.length === 0) {
      return showSeconds ? '0 seconds' : '< 1 minute';
    }

    return parts.join(shortFormat ? ' ' : ', ');
  }

  // Format transaction types
  formatTransactionType(type) {
    const typeMap = {
      'send': 'Send',
      'receive': 'Receive',
      'delegate': 'Delegate',
      'undelegate': 'Undelegate',
      'vote': 'Vote',
      'land_register': 'Land Registration',
      'citizen_register': 'Citizen Registration',
      'proposal_create': 'Create Proposal',
      'proposal_vote': 'Vote on Proposal'
    };

    return typeMap[type] || this.capitalizeFirst(type.replace(/_/g, ' '));
  }

  // Format transaction status
  formatTransactionStatus(status) {
    const statusMap = {
      'success': { text: 'Success', class: 'success' },
      'pending': { text: 'Pending', class: 'pending' },
      'failed': { text: 'Failed', class: 'error' },
      'cancelled': { text: 'Cancelled', class: 'warning' }
    };

    return statusMap[status] || { text: 'Unknown', class: 'default' };
  }

  // Format proposal status
  formatProposalStatus(status) {
    const statusMap = {
      'active': { text: 'Active', class: 'active' },
      'passed': { text: 'Passed', class: 'success' },
      'rejected': { text: 'Rejected', class: 'error' },
      'expired': { text: 'Expired', class: 'warning' }
    };

    return statusMap[status] || { text: status, class: 'default' };
  }

  // Format percentages
  formatPercentage(value, options = {}) {
    const {
      decimals = 1,
      showSign = false
    } = options;

    if (!value && value !== 0) {
      return '0%';
    }

    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      return '0%';
    }

    const formatted = numValue.toFixed(decimals);
    const sign = showSign && numValue > 0 ? '+' : '';
    
    return `${sign}${formatted}%`;
  }

  // Format large numbers with abbreviations
  formatLargeNumber(value, options = {}) {
    const {
      decimals = 1,
      useFullForm = false
    } = options;

    if (!value && value !== 0) {
      return '0';
    }

    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      return '0';
    }

    if (useFullForm || Math.abs(numValue) < 1000) {
      return numValue.toLocaleString(this.locale);
    }

    const abbreviations = [
      { value: 1e12, symbol: 'T', name: 'trillion' },
      { value: 1e9, symbol: 'B', name: 'billion' },
      { value: 1e6, symbol: 'M', name: 'million' },
      { value: 1e3, symbol: 'K', name: 'thousand' }
    ];

    for (const abbr of abbreviations) {
      if (Math.abs(numValue) >= abbr.value) {
        const abbreviated = (numValue / abbr.value).toFixed(decimals);
        return `${abbreviated}${abbr.symbol}`;
      }
    }

    return numValue.toFixed(decimals);
  }

  // Format file sizes
  formatFileSize(bytes) {
    if (!bytes || bytes === 0) {
      return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, unitIndex)).toFixed(1);
    
    return `${size} ${units[unitIndex]}`;
  }

  // Format network fee
  formatNetworkFee(fee, options = {}) {
    const {
      showUSD = false,
      usdRate = null,
      gasUsed = null,
      gasPrice = null
    } = options;

    let result = this.formatAmount(fee, { showFullPrecision: true });

    if (gasUsed && gasPrice) {
      result += ` (${gasUsed.toLocaleString()} gas @ ${gasPrice} SUNC/gas)`;
    }

    if (showUSD && usdRate) {
      const usdValue = parseFloat(fee) * usdRate;
      result += ` ≈ ${this.formatCurrency(usdValue)}`;
    }

    return result;
  }

  // Format voting results
  formatVotingResults(votesFor, votesAgainst, totalVotes = null) {
    if (!totalVotes) {
      totalVotes = votesFor + votesAgainst;
    }

    if (totalVotes === 0) {
      return {
        forPercentage: '0%',
        againstPercentage: '0%',
        totalVotes: '0 votes'
      };
    }

    const forPercentage = this.formatPercentage((votesFor / totalVotes) * 100);
    const againstPercentage = this.formatPercentage((votesAgainst / totalVotes) * 100);
    const formattedTotal = this.formatLargeNumber(totalVotes) + ' vote' + (totalVotes !== 1 ? 's' : '');

    return {
      forPercentage,
      againstPercentage,
      totalVotes: formattedTotal,
      forVotes: this.formatLargeNumber(votesFor),
      againstVotes: this.formatLargeNumber(votesAgainst)
    };
  }

  // Utility formatting functions
  capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  capitalizeWords(str) {
    if (!str) return '';
    return str.split(' ')
      .map(word => this.capitalizeFirst(word))
      .join(' ');
  }

  camelToTitle(camelCase) {
    if (!camelCase) return '';
    return camelCase
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  // Format input placeholder text
  getAmountPlaceholder(decimals = this.defaultDecimals) {
    return '0.' + '0'.repeat(decimals);
  }

  // Format error messages for display
  formatErrorMessage(error) {
    if (typeof error === 'string') {
      return error;
    }

    if (error && error.message) {
      return error.message;
    }

    return 'An unknown error occurred';
  }

  // Format success messages
  formatSuccessMessage(type, data = {}) {
    const messages = {
      'transaction_sent': 'Transaction sent successfully!',
      'wallet_created': 'Wallet created successfully!',
      'wallet_imported': 'Wallet imported successfully!',
      'land_registered': 'Land registered successfully!',
      'citizen_registered': 'Citizen registered successfully!',
      'vote_cast': `Vote cast successfully on "${data.proposalTitle}"!`,
      'proposal_created': 'Proposal created successfully!'
    };

    return messages[type] || 'Operation completed successfully!';
  }

  // Format validation error lists
  formatValidationErrors(errors) {
    if (!errors || !Array.isArray(errors)) {
      return '';
    }

    if (errors.length === 1) {
      return errors[0];
    }

    return 'Please fix the following errors:\n• ' + errors.join('\n• ');
  }

  // Format QR code data
  formatQRCodeData(address, options = {}) {
    const {
      amount = null,
      memo = null,
      protocol = 'suncity'
    } = options;

    let qrData = `${protocol}:${address}`;
    const params = [];

    if (amount) {
      params.push(`amount=${amount}`);
    }

    if (memo) {
      params.push(`memo=${encodeURIComponent(memo)}`);
    }

    if (params.length > 0) {
      qrData += '?' + params.join('&');
    }

    return qrData;
  }

  // Set locale for formatting
  setLocale(locale) {
    this.locale = locale;
  }

  // Get current locale
  getLocale() {
    return this.locale;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SuncityFormatter;
} else {
  // Browser environment
  window.SuncityFormatter = SuncityFormatter;
}