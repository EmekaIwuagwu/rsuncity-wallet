// Republic of Suncity Wallet - Injected Wallet Provider
// This script provides the window.suncity wallet API for dApps

(function() {
  'use strict';

  if (window.suncity) {
    console.log('Republic of Suncity Wallet already injected');
    return;
  }

  class SuncityWalletProvider {
    constructor() {
      this.isConnected = false;
      this.accounts = [];
      this.chainId = 'rsuncitychain';
      this.networkName = 'Republic of Suncity';
      this._requestId = 0;
      this._pendingRequests = new Map();
      this._eventListeners = new Map();
      
      this.setupMessageHandler();
      this.autoDetectConnection();
      console.log('Republic of Suncity Wallet Provider initialized');
    }

    setupMessageHandler() {
      window.addEventListener('message', (event) => {
        if (event.data?.target === 'suncity-wallet-page' && event.data?.id) {
          const request = this._pendingRequests.get(event.data.id);
          if (request) {
            this._pendingRequests.delete(event.data.id);
            if (event.data.response?.error) {
              request.reject(new Error(event.data.response.error));
            } else {
              request.resolve(event.data.response);
            }
          }
        }

        // Handle wallet status changes
        if (event.data?.type === 'SUNCITY_WALLET_STATUS_CHANGED') {
          this.handleStatusChange(event.data.detail);
        }
      });
    }

    async autoDetectConnection() {
      try {
        const response = await this._sendRequest('requestAccounts');
        if (response.accounts && response.accounts.length > 0) {
          this.isConnected = true;
          this.accounts = response.accounts;
          this._emit('connect', { accounts: this.accounts });
        }
      } catch (error) {
        // Silent fail for auto-detection
        console.log('Auto-connection not available');
      }
    }

    handleStatusChange(detail) {
      if (detail.connected && !this.isConnected) {
        this.isConnected = true;
        this.accounts = detail.address ? [detail.address] : [];
        this._emit('connect', { accounts: this.accounts });
      } else if (!detail.connected && this.isConnected) {
        this.isConnected = false;
        this.accounts = [];
        this._emit('disconnect', {});
      }
    }

    async _sendRequest(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++this._requestId;
        this._pendingRequests.set(id, { resolve, reject });
        
        window.postMessage({
          target: 'suncity-wallet-content',
          id: id,
          method: method,
          params: params,
          origin: window.location.origin
        }, '*');

        // Timeout after 30 seconds
        setTimeout(() => {
          if (this._pendingRequests.has(id)) {
            this._pendingRequests.delete(id);
            reject(new Error('Request timeout'));
          }
        }, 30000);
      });
    }

    // Core wallet methods
    async connect() {
      try {
        const response = await this._sendRequest('requestConnection');
        if (response.connected) {
          this.isConnected = true;
          this.accounts = response.accounts || [];
          this._emit('connect', { accounts: this.accounts });
          return this.accounts;
        }
        throw new Error('Connection rejected by user');
      } catch (error) {
        this._emit('disconnect', { error: error.message });
        throw error;
      }
    }

    async disconnect() {
      this.isConnected = false;
      this.accounts = [];
      this._emit('disconnect', {});
      return true;
    }

    async getAccounts() {
      if (!this.isConnected) {
        return [];
      }
      
      try {
        const response = await this._sendRequest('requestAccounts');
        this.accounts = response.accounts || [];
        return this.accounts;
      } catch (error) {
        console.error('Failed to get accounts:', error);
        return [];
      }
    }

    async getBalance(address) {
      try {
        const response = await this._sendRequest('getBalance', { address });
        return response.balances;
      } catch (error) {
        console.error('Failed to get balance:', error);
        throw error;
      }
    }

    async getNetworkInfo() {
      try {
        const response = await this._sendRequest('getNetworkInfo');
        return response.network;
      } catch (error) {
        console.error('Failed to get network info:', error);
        // Return default network info
        return {
          chainId: this.chainId,
          chainName: this.networkName,
          rpc: 'http://localhost:26657',
          rest: 'http://localhost:1317',
          bech32Config: {
            bech32PrefixAccAddr: 'sunc',
            bech32PrefixAccPub: 'suncpub'
          },
          currencies: [{
            coinDenom: 'SUNC',
            coinMinimalDenom: 'sunc',
            coinDecimals: 6
          }],
          feeCurrencies: [{
            coinDenom: 'SUNC',
            coinMinimalDenom: 'sunc',
            coinDecimals: 6,
            gasPriceStep: {
              low: 0.01,
              average: 0.025,
              high: 0.04
            }
          }]
        };
      }
    }

    // Transaction methods
    async sendTokens(toAddress, amount, memo = '') {
      if (!this.isConnected || this.accounts.length === 0) {
        throw new Error('Wallet not connected');
      }

      try {
        const txData = {
          from: this.accounts[0],
          to: toAddress,
          amount: amount,
          memo: memo
        };

        const response = await this._sendRequest('signTransaction', {
          transaction: {
            typeUrl: '/cosmos.bank.v1beta1.MsgSend',
            value: txData
          }
        });

        return response;
      } catch (error) {
        console.error('Failed to send tokens:', error);
        throw error;
      }
    }

    async signTransaction(transaction) {
      if (!this.isConnected || this.accounts.length === 0) {
        throw new Error('Wallet not connected');
      }

      try {
        const response = await this._sendRequest('signTransaction', { transaction });
        return response;
      } catch (error) {
        console.error('Failed to sign transaction:', error);
        throw error;
      }
    }

    async signAndBroadcast(transaction) {
      const signedTx = await this.signTransaction(transaction);
      // In a real implementation, this would broadcast the signed transaction
      return signedTx;
    }

    // Government service methods
    async registerLand(landData) {
      if (!this.isConnected || this.accounts.length === 0) {
        throw new Error('Wallet not connected');
      }

      try {
        const transaction = {
          typeUrl: '/rsuncitychain.landregistration.MsgCreateLandrecord',
          value: {
            creator: this.accounts[0],
            ...landData
          }
        };

        const response = await this._sendRequest('signTransaction', { transaction });
        return response;
      } catch (error) {
        console.error('Failed to register land:', error);
        throw error;
      }
    }

    async registerCitizen(citizenData) {
      if (!this.isConnected || this.accounts.length === 0) {
        throw new Error('Wallet not connected');
      }

      try {
        const transaction = {
          typeUrl: '/rsuncitychain.individualregistration.MsgCreateIndividualrecord',
          value: {
            creator: this.accounts[0],
            ...citizenData
          }
        };

        const response = await this._sendRequest('signTransaction', { transaction });
        return response;
      } catch (error) {
        console.error('Failed to register citizen:', error);
        throw error;
      }
    }

    async castVote(proposalId, option) {
      if (!this.isConnected || this.accounts.length === 0) {
        throw new Error('Wallet not connected');
      }

      try {
        const transaction = {
          typeUrl: '/rsuncitychain.evoting.MsgVote',
          value: {
            creator: this.accounts[0],
            proposalId: proposalId,
            option: option
          }
        };

        const response = await this._sendRequest('signTransaction', { transaction });
        return response;
      } catch (error) {
        console.error('Failed to cast vote:', error);
        throw error;
      }
    }

    async createProposal(proposalData) {
      if (!this.isConnected || this.accounts.length === 0) {
        throw new Error('Wallet not connected');
      }

      try {
        const transaction = {
          typeUrl: '/rsuncitychain.evoting.MsgCreateProposal',
          value: {
            creator: this.accounts[0],
            ...proposalData
          }
        };

        const response = await this._sendRequest('signTransaction', { transaction });
        return response;
      } catch (error) {
        console.error('Failed to create proposal:', error);
        throw error;
      }
    }

    // Query methods
    async getProposals() {
      try {
        const response = await this._sendRequest('getProposals');
        return response.proposals;
      } catch (error) {
        console.error('Failed to get proposals:', error);
        throw error;
      }
    }

    async getLandRecords() {
      try {
        const response = await this._sendRequest('getLandRecords');
        return response.records;
      } catch (error) {
        console.error('Failed to get land records:', error);
        throw error;
      }
    }

    async getCitizenRecords() {
      try {
        const response = await this._sendRequest('getCitizenRecords');
        return response.records;
      } catch (error) {
        console.error('Failed to get citizen records:', error);
        throw error;
      }
    }

    // Event handling
    on(event, callback) {
      if (!this._eventListeners.has(event)) {
        this._eventListeners.set(event, new Set());
      }
      this._eventListeners.get(event).add(callback);
    }

    off(event, callback) {
      if (this._eventListeners.has(event)) {
        this._eventListeners.get(event).delete(callback);
      }
    }

    once(event, callback) {
      const onceCallback = (...args) => {
        callback(...args);
        this.off(event, onceCallback);
      };
      this.on(event, onceCallback);
    }

    _emit(event, data) {
      if (this._eventListeners.has(event)) {
        this._eventListeners.get(event).forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error('Event callback error:', error);
          }
        });
      }

      // Also dispatch as a custom DOM event
      window.dispatchEvent(new CustomEvent(`suncity${event}`, {
        detail: data
      }));
    }

    // Utility methods
    formatAmount(amount, decimals = 6) {
      return (parseInt(amount) / Math.pow(10, decimals)).toFixed(decimals);
    }

    parseAmount(amount, decimals = 6) {
      return Math.floor(parseFloat(amount) * Math.pow(10, decimals)).toString();
    }

    isValidAddress(address) {
      return typeof address === 'string' && address.startsWith('sunc1') && address.length >= 39;
    }

    // Request methods for easier integration
    async request({ method, params }) {
      switch (method) {
        case 'suncity_requestAccounts':
          return this.getAccounts();
        case 'suncity_connect':
          return this.connect();
        case 'suncity_disconnect':
          return this.disconnect();
        case 'suncity_getBalance':
          return this.getBalance(params.address);
        case 'suncity_sendTransaction':
          return this.sendTokens(params.to, params.amount, params.memo);
        case 'suncity_signTransaction':
          return this.signTransaction(params.transaction);
        case 'suncity_registerLand':
          return this.registerLand(params);
        case 'suncity_registerCitizen':
          return this.registerCitizen(params);
        case 'suncity_castVote':
          return this.castVote(params.proposalId, params.option);
        case 'suncity_getProposals':
          return this.getProposals();
        case 'suncity_getLandRecords':
          return this.getLandRecords();
        case 'suncity_getCitizenRecords':
          return this.getCitizenRecords();
        case 'suncity_getNetworkInfo':
          return this.getNetworkInfo();
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    }

    // Promise-based API for async operations
    async enable() {
      return this.connect();
    }

    // Check if the wallet is available
    get isAvailable() {
      return true;
    }

    get isInstalled() {
      return true;
    }
  }

  // Create and expose the wallet provider
  const suncityWallet = new SuncityWalletProvider();

  // Define the wallet provider on window
  Object.defineProperty(window, 'suncity', {
    value: suncityWallet,
    writable: false,
    configurable: false
  });

  // Also expose as window.suncityWallet for backwards compatibility
  Object.defineProperty(window, 'suncityWallet', {
    value: suncityWallet,
    writable: false,
    configurable: false
  });

  // Standard wallet detection
  Object.defineProperty(window, 'isSuncityWallet', {
    value: true,
    writable: false,
    configurable: false
  });

  // EIP-6963 style wallet detection for future compatibility
  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
    detail: {
      info: {
        uuid: 'suncity-wallet-uuid',
        name: 'Republic of Suncity Wallet',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiI+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiNGRkQ3MDAiLz48dGV4dCB4PSIxNiIgeT0iMjEiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMTYiPuKYgDwvdGV4dD48L3N2Zz4=',
        rdns: 'gov.suncity.wallet'
      },
      provider: suncityWallet
    }
  }));

  // Dispatch wallet ready event
  window.dispatchEvent(new CustomEvent('suncityWalletReady', {
    detail: { wallet: suncityWallet }
  }));

  // Cosmos-style provider for compatibility
  Object.defineProperty(window, 'cosmos', {
    value: {
      suncity: suncityWallet
    },
    writable: false,
    configurable: false
  });

  console.log('Republic of Suncity Wallet API injected successfully');
})();