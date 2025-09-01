// Republic of Suncity Wallet - Cosmos SDK Integration

class SuncityCosmosSDK {
  constructor(config = {}) {
    this.config = {
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
      }],
      feeCurrencies: [{
        coinDenom: "SUNC",
        coinMinimalDenom: "sunc",
        coinDecimals: 6,
        gasPriceStep: {
          low: 0.01,
          average: 0.025,
          high: 0.04
        }
      }],
      ...config
    };

    this.api = new SuncityAPI(this.config);
    this.crypto = new SuncityCrypto();
    this.formatter = new SuncityFormatter();
  }

  // Create a basic transaction structure
  createTransaction(messages, fee, memo = '', timeoutHeight = '0') {
    return {
      body: {
        messages: messages,
        memo: memo,
        timeoutHeight: timeoutHeight,
        extensionOptions: [],
        nonCriticalExtensionOptions: []
      },
      authInfo: {
        signerInfos: [],
        fee: fee
      },
      signatures: []
    };
  }

  // Create a send message
  createMsgSend(fromAddress, toAddress, amount) {
    return {
      typeUrl: "/cosmos.bank.v1beta1.MsgSend",
      value: {
        fromAddress: fromAddress,
        toAddress: toAddress,
        amount: Array.isArray(amount) ? amount : [amount]
      }
    };
  }

  // Create a land registration message
  createMsgCreateLandRecord(creator, landData) {
    return {
      typeUrl: "/rsuncitychain.landregistration.MsgCreateLandrecord",
      value: {
        creator: creator,
        landRegistrationNumber: landData.landRegistrationNumber,
        ownerAddress: landData.ownerAddress,
        locationAddress: landData.locationAddress,
        ownerName: landData.ownerName,
        purchaseDate: landData.purchaseDate,
        previousOwner: landData.previousOwner || "",
        phoneNumber: landData.phoneNumber || "",
        emailAddress: landData.emailAddress || ""
      }
    };
  }

  // Create a citizen registration message
  createMsgCreateIndividualRecord(creator, citizenData) {
    return {
      typeUrl: "/rsuncitychain.individualregistration.MsgCreateIndividualrecord",
      value: {
        creator: creator,
        personalRegistrationNumber: citizenData.personalRegistrationNumber,
        address: citizenData.address,
        dateOfBirth: citizenData.dateOfBirth,
        gender: citizenData.gender,
        emailAddress: citizenData.emailAddress || "",
        telephoneNumber: citizenData.telephoneNumber || ""
      }
    };
  }

  // Create a voting message
  createMsgVote(creator, proposalId, option) {
    return {
      typeUrl: "/rsuncitychain.evoting.MsgVote",
      value: {
        creator: creator,
        proposalId: proposalId,
        option: option
      }
    };
  }

  // Create a proposal message
  createMsgCreateProposal(creator, proposalData) {
    return {
      typeUrl: "/rsuncitychain.evoting.MsgCreateProposal",
      value: {
        creator: creator,
        title: proposalData.title,
        description: proposalData.description,
        votingPeriod: proposalData.votingPeriod || 604800, // 7 days default
        options: proposalData.options || ["yes", "no"]
      }
    };
  }

  // Create fee object
  createFee(amount, gasLimit, payer = "", granter = "") {
    return {
      amount: Array.isArray(amount) ? amount : [amount],
      gasLimit: gasLimit.toString(),
      payer: payer,
      granter: granter
    };
  }

  // Create coin object
  createCoin(denom, amount) {
    return {
      denom: denom,
      amount: amount.toString()
    };
  }

  // Estimate gas for transaction
  async estimateGas(messages, memo = '') {
    try {
      // Create a temporary transaction for simulation
      const tempFee = this.createFee(
        this.createCoin("sunc", "5000"),
        "200000"
      );
      
      const tempTx = this.createTransaction(messages, tempFee, memo);
      
      // Simulate the transaction
      const simulation = await this.api.simulateTransaction(tempTx);
      
      if (simulation.success && simulation.gas_info) {
        const gasWanted = parseInt(simulation.gas_info.gas_wanted);
        const gasUsed = parseInt(simulation.gas_info.gas_used);
        
        // Add buffer to gas estimation (20% more than used)
        const estimatedGas = Math.ceil(gasUsed * 1.2);
        
        return {
          success: true,
          gasWanted: gasWanted,
          gasUsed: gasUsed,
          estimatedGas: estimatedGas
        };
      }
      
      throw new Error('Gas estimation failed');
    } catch (error) {
      console.error('Gas estimation error:', error);
      
      // Return default gas estimates
      return {
        success: true,
        gasWanted: 200000,
        gasUsed: 150000,
        estimatedGas: 180000,
        fromDefault: true
      };
    }
  }

  // Calculate fee based on gas and gas price
  calculateFee(gasAmount, gasPrice = 'average') {
    const gasPriceStep = this.config.feeCurrencies[0].gasPriceStep;
    let pricePerGas;

    switch (gasPrice) {
      case 'low':
        pricePerGas = gasPriceStep.low;
        break;
      case 'high':
        pricePerGas = gasPriceStep.high;
        break;
      case 'average':
      default:
        pricePerGas = gasPriceStep.average;
        break;
    }

    // Calculate fee amount in micro units
    const feeAmount = Math.ceil(gasAmount * pricePerGas * Math.pow(10, 6));

    return this.createCoin("sunc", feeAmount.toString());
  }

  // Build and sign transaction
  async buildAndSignTransaction(messages, signerData, memo = '', gasPrice = 'average') {
    try {
      // Estimate gas
      const gasEstimation = await this.estimateGas(messages, memo);
      const gasLimit = gasEstimation.estimatedGas;

      // Calculate fee
      const feeAmount = this.calculateFee(gasLimit, gasPrice);
      const fee = this.createFee(feeAmount, gasLimit);

      // Create transaction
      const tx = this.createTransaction(messages, fee, memo);

      // Add signer info
      tx.authInfo.signerInfos = [{
        publicKey: {
          typeUrl: "/cosmos.crypto.secp256k1.PubKey",
          value: this.base64Encode(this.hexToUint8Array(signerData.publicKey))
        },
        modeInfo: {
          single: {
            mode: "SIGN_MODE_DIRECT"
          }
        },
        sequence: signerData.sequence || "0"
      }];

      // Create sign doc
      const signDoc = this.createSignDoc(
        tx.body,
        tx.authInfo,
        this.config.chainId,
        signerData.accountNumber || "0"
      );

      // Sign the transaction
      const signature = await this.signTransaction(signDoc, signerData.privateKey);
      tx.signatures = [signature];

      return {
        success: true,
        transaction: tx,
        txBytes: this.encodeTx(tx),
        fee: feeAmount,
        gasLimit: gasLimit
      };

    } catch (error) {
      console.error('Transaction building error:', error);
      throw error;
    }
  }

  // Create sign document
  createSignDoc(txBody, authInfo, chainId, accountNumber) {
    return {
      bodyBytes: this.encodeTxBody(txBody),
      authInfoBytes: this.encodeAuthInfo(authInfo),
      chainId: chainId,
      accountNumber: accountNumber
    };
  }

  // Sign transaction
  async signTransaction(signDoc, privateKey) {
    try {
      // Encode sign doc for signing
      const signBytes = this.encodeSignDoc(signDoc);
      
      // Sign with private key
      const signature = await this.crypto.signTransaction(privateKey, signBytes);
      
      return this.base64Encode(this.hexToUint8Array(signature));
    } catch (error) {
      console.error('Transaction signing error:', error);
      throw error;
    }
  }

  // Broadcast signed transaction
  async broadcastTransaction(txBytes, mode = 'sync') {
    try {
      let broadcastMode;
      switch (mode) {
        case 'async':
          broadcastMode = 'BROADCAST_MODE_ASYNC';
          break;
        case 'sync':
          broadcastMode = 'BROADCAST_MODE_SYNC';
          break;
        case 'block':
          broadcastMode = 'BROADCAST_MODE_BLOCK';
          break;
        default:
          broadcastMode = 'BROADCAST_MODE_SYNC';
      }

      const result = await this.api.broadcastTransaction(txBytes, broadcastMode);
      
      if (result.success && result.code === 0) {
        return {
          success: true,
          txhash: result.txhash,
          height: result.height,
          rawLog: result.raw_log
        };
      } else {
        throw new Error(result.raw_log || 'Transaction failed');
      }
    } catch (error) {
      console.error('Broadcast error:', error);
      throw error;
    }
  }

  // Complete transaction flow: build, sign, and broadcast
  async sendTransaction(messages, signerData, options = {}) {
    const {
      memo = '',
      gasPrice = 'average',
      broadcastMode = 'sync'
    } = options;

    try {
      // Build and sign transaction
      const signedTx = await this.buildAndSignTransaction(
        messages,
        signerData,
        memo,
        gasPrice
      );

      // Broadcast transaction
      const broadcastResult = await this.broadcastTransaction(
        signedTx.txBytes,
        broadcastMode
      );

      return {
        success: true,
        txhash: broadcastResult.txhash,
        fee: signedTx.fee,
        gasUsed: signedTx.gasLimit
      };

    } catch (error) {
      console.error('Send transaction error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // High-level transaction methods

  // Send tokens
  async sendTokens(fromAddress, toAddress, amount, signerData, options = {}) {
    const { memo = '', gasPrice = 'average' } = options;

    // Create amount object
    const coinAmount = this.createCoin("sunc", this.formatter.parseAmount(amount));

    // Create send message
    const sendMsg = this.createMsgSend(fromAddress, toAddress, coinAmount);

    return await this.sendTransaction([sendMsg], signerData, {
      memo,
      gasPrice
    });
  }

  // Register land
  async registerLand(creator, landData, signerData, options = {}) {
    const { memo = 'Land registration', gasPrice = 'average' } = options;

    const landMsg = this.createMsgCreateLandRecord(creator, landData);

    return await this.sendTransaction([landMsg], signerData, {
      memo,
      gasPrice
    });
  }

  // Register citizen
  async registerCitizen(creator, citizenData, signerData, options = {}) {
    const { memo = 'Citizen registration', gasPrice = 'average' } = options;

    const citizenMsg = this.createMsgCreateIndividualRecord(creator, citizenData);

    return await this.sendTransaction([citizenMsg], signerData, {
      memo,
      gasPrice
    });
  }

  // Cast vote
  async castVote(creator, proposalId, option, signerData, options = {}) {
    const { memo = 'Cast vote', gasPrice = 'average' } = options;

    const voteMsg = this.createMsgVote(creator, proposalId, option);

    return await this.sendTransaction([voteMsg], signerData, {
      memo,
      gasPrice
    });
  }

  // Create proposal
  async createProposal(creator, proposalData, signerData, options = {}) {
    const { memo = 'Create proposal', gasPrice = 'high' } = options;

    const proposalMsg = this.createMsgCreateProposal(creator, proposalData);

    return await this.sendTransaction([proposalMsg], signerData, {
      memo,
      gasPrice
    });
  }

  // Query methods (delegated to API)
  async queryBalance(address) {
    return await this.api.queryBalance(address);
  }

  async queryAccount(address) {
    return await this.api.queryAccount(address);
  }

  async queryTransaction(txHash) {
    return await this.api.queryTransaction(txHash);
  }

  async queryTransactions(address, options = {}) {
    return await this.api.queryTransactions(address, options);
  }

  async queryProposals(options = {}) {
    return await this.api.queryProposals(options);
  }

  async queryLandRecords(options = {}) {
    return await this.api.queryLandRecords(options);
  }

  async queryCitizenRecords(options = {}) {
    return await this.api.queryCitizenRecords(options);
  }

  // Wallet management methods
  async createWallet(password) {
    try {
      // Generate mnemonic
      const mnemonic = await this.crypto.generateMnemonic();
      
      // Derive keys
      const privateKey = await this.crypto.derivePrivateKey(mnemonic);
      const publicKey = await this.crypto.getPublicKey(privateKey);
      const address = await this.crypto.getAddress(publicKey);

      // Create wallet object
      const wallet = {
        mnemonic,
        privateKey,
        publicKey,
        address,
        created: Date.now()
      };

      // Store encrypted wallet
      const storage = new SuncityStorage();
      await storage.storeWalletData(wallet, password);

      return {
        success: true,
        address: address,
        publicKey: publicKey
      };

    } catch (error) {
      console.error('Wallet creation error:', error);
      throw error;
    }
  }

  async importWallet(mnemonic, password) {
    try {
      // Validate mnemonic
      const validator = new SuncityValidator();
      const mnemonicValidation = validator.isValidMnemonic(mnemonic);
      
      if (!mnemonicValidation.valid) {
        throw new Error('Invalid mnemonic: ' + mnemonicValidation.error);
      }

      // Derive keys
      const privateKey = await this.crypto.derivePrivateKey(mnemonic);
      const publicKey = await this.crypto.getPublicKey(privateKey);
      const address = await this.crypto.getAddress(publicKey);

      // Create wallet object
      const wallet = {
        mnemonic,
        privateKey,
        publicKey,
        address,
        imported: Date.now()
      };

      // Store encrypted wallet
      const storage = new SuncityStorage();
      await storage.storeWalletData(wallet, password);

      return {
        success: true,
        address: address,
        publicKey: publicKey
      };

    } catch (error) {
      console.error('Wallet import error:', error);
      throw error;
    }
  }

  // Utility methods

  // Encode transaction for broadcasting
  encodeTx(tx) {
    // Simplified encoding - in real implementation would use protobuf
    return new TextEncoder().encode(JSON.stringify(tx));
  }

  // Encode transaction body
  encodeTxBody(txBody) {
    return new TextEncoder().encode(JSON.stringify(txBody));
  }

  // Encode auth info
  encodeAuthInfo(authInfo) {
    return new TextEncoder().encode(JSON.stringify(authInfo));
  }

  // Encode sign document
  encodeSignDoc(signDoc) {
    return new TextEncoder().encode(JSON.stringify(signDoc));
  }

  // Convert hex string to Uint8Array
  hexToUint8Array(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  // Convert Uint8Array to base64
  base64Encode(bytes) {
    return btoa(String.fromCharCode.apply(null, bytes));
  }

  // Convert base64 to Uint8Array
  base64Decode(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  // Get network information
  getNetworkInfo() {
    return { ...this.config };
  }

  // Update network configuration
  updateNetwork(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.api.updateConfig(this.config);
  }

  // Check network connectivity
  async checkConnectivity() {
    return await this.api.healthCheck();
  }

  // Get transaction URL for block explorers
  getTxUrl(txHash, explorerUrl = null) {
    return this.api.buildTxUrl(txHash, explorerUrl);
  }

  // Get address URL for block explorers
  getAddressUrl(address, explorerUrl = null) {
    return this.api.buildAddressUrl(address, explorerUrl);
  }

  // Parse transaction for display
  parseTransaction(tx) {
    return this.api.parseTransactionMessages(tx);
  }

  // Format amounts for display
  formatAmount(amount, options = {}) {
    return this.formatter.formatAmount(amount, options);
  }

  // Format address for display
  formatAddress(address, options = {}) {
    return this.formatter.formatAddress(address, options);
  }

  // Validate address
  validateAddress(address) {
    const validator = new SuncityValidator();
    return validator.isValidAddress(address);
  }

  // Validate transaction data
  validateTransaction(txData) {
    const validator = new SuncityValidator();
    return validator.isValidTransaction(txData);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SuncityCosmosSDK;
} else {
  // Browser environment
  window.SuncityCosmosSDK = SuncityCosmosSDK;
}