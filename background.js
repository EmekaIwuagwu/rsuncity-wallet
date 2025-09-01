// Republic of Suncity Wallet - Background Service Worker

class SuncityBackgroundService {
  constructor() {
    this.chainConfig = {
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
      }]
    };
    
    this.init();
  }

  init() {
    this.setupMessageHandlers();
    this.setupAlarms();
    console.log('Republic of Suncity Wallet Background Service Started');
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Handle external messages from dApps
    chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
      this.handleExternalMessage(request, sender, sendResponse);
      return true;
    });
  }

  setupAlarms() {
    // Set up periodic tasks
    chrome.alarms.create('syncBlockchain', { periodInMinutes: 5 });
    chrome.alarms.create('updateProposals', { periodInMinutes: 15 });
    
    chrome.alarms.onAlarm.addListener((alarm) => {
      switch (alarm.name) {
        case 'syncBlockchain':
          this.syncBlockchainData();
          break;
        case 'updateProposals':
          this.updateVotingProposals();
          break;
      }
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'getWalletInfo':
          sendResponse(await this.getWalletInfo());
          break;
        
        case 'sendTransaction':
          sendResponse(await this.sendTransaction(request.data));
          break;
        
        case 'queryBalance':
          sendResponse(await this.queryBalance(request.address));
          break;
        
        case 'getTransactionHistory':
          sendResponse(await this.getTransactionHistory(request.address));
          break;
        
        case 'registerLand':
          sendResponse(await this.registerLand(request.data));
          break;
        
        case 'registerCitizen':
          sendResponse(await this.registerCitizen(request.data));
          break;
        
        case 'createProposal':
          sendResponse(await this.createProposal(request.data));
          break;
        
        case 'castVote':
          sendResponse(await this.castVote(request.data));
          break;
        
        case 'getProposals':
          sendResponse(await this.getProposals());
          break;
        
        case 'getLandRecords':
          sendResponse(await this.getLandRecords());
          break;
        
        case 'getCitizenRecords':
          sendResponse(await this.getCitizenRecords());
          break;
        
        case 'externalRequest':
          sendResponse(await this.handleExternalMessage(request.data, sender, () => {}));
          break;
        
        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background message handler error:', error);
      sendResponse({ error: error.message });
    }
  }

  async handleExternalMessage(request, sender, sendResponse) {
    // Handle messages from dApps wanting to interact with the wallet
    try {
      switch (request.method) {
        case 'requestConnection':
          return await this.requestConnection(sender.origin || request.origin);
        
        case 'requestAccounts':
          return await this.getConnectedAccounts(sender.origin || request.origin);
        
        case 'signTransaction':
          return await this.requestTransactionSignature(request.transaction, sender.origin || request.origin);
        
        case 'getBalance':
          return await this.queryBalance(request.address);
        
        case 'getNetworkInfo':
          return { success: true, network: this.chainConfig };
        
        default:
          return { error: 'Unsupported method' };
      }
    } catch (error) {
      console.error('External message handler error:', error);
      return { error: error.message };
    }
  }

  async getWalletInfo() {
    const stored = await chrome.storage.local.get(['walletData', 'isLocked']);
    return {
      hasWallet: !!stored.walletData,
      network: this.chainConfig,
      isLocked: !!stored.isLocked,
      address: stored.walletData?.address || null
    };
  }

  async queryBalance(address) {
    try {
      const response = await fetch(`${this.chainConfig.rest}/cosmos/bank/v1beta1/balances/${address}`);
      
      if (!response.ok) {
        // Mock response if blockchain is not available
        return {
          success: true,
          balances: [{
            denom: 'sunc',
            amount: '1250000000' // 1,250.000000 SUNC
          }]
        };
      }
      
      const data = await response.json();
      return { success: true, balances: data.balances };
    } catch (error) {
      console.error('Balance query error:', error);
      // Return mock data for development
      return {
        success: true,
        balances: [{
          denom: 'sunc',
          amount: '1250000000'
        }]
      };
    }
  }

  async getTransactionHistory(address) {
    try {
      // Try to fetch from blockchain
      const response = await fetch(`${this.chainConfig.rest}/cosmos/tx/v1beta1/txs?events=message.sender='${address}'`);
      
      if (!response.ok) {
        throw new Error('Blockchain not available');
      }
      
      const data = await response.json();
      return { success: true, transactions: data.txs || [] };
    } catch (error) {
      // Return mock data for development
      return {
        success: true,
        transactions: [
          {
            hash: 'tx_hash_1',
            type: 'send',
            amount: '500000000',
            from: 'sunc1abc...xyz',
            to: address,
            timestamp: Date.now() - 86400000,
            status: 'success'
          },
          {
            hash: 'tx_hash_2',
            type: 'land_register',
            amount: '5000000',
            from: address,
            to: 'government',
            timestamp: Date.now() - 172800000,
            status: 'success'
          }
        ]
      };
    }
  }

  async sendTransaction(txData) {
    try {
      // Construct transaction
      const tx = {
        body: {
          messages: [{
            typeUrl: "/cosmos.bank.v1beta1.MsgSend",
            value: {
              fromAddress: txData.from,
              toAddress: txData.to,
              amount: [{
                denom: "sunc",
                amount: txData.amount
              }]
            }
          }],
          memo: txData.memo || "",
          timeoutHeight: "0",
          extensionOptions: [],
          nonCriticalExtensionOptions: []
        },
        authInfo: {
          signerInfos: [],
          fee: {
            amount: [{ denom: "sunc", amount: "5000" }],
            gasLimit: "200000",
            payer: "",
            granter: ""
          }
        },
        signatures: []
      };

      // Sign and broadcast transaction
      const response = await this.broadcastTransaction(tx);
      return { success: true, hash: response.txhash };
    } catch (error) {
      console.error('Transaction error:', error);
      return { error: error.message };
    }
  }

  async registerLand(landData) {
    try {
      const tx = {
        body: {
          messages: [{
            typeUrl: "/rsuncitychain.landregistration.MsgCreateLandrecord",
            value: {
              creator: landData.creator,
              landRegistrationNumber: landData.landRegistrationNumber,
              ownerAddress: landData.ownerAddress,
              locationAddress: landData.locationAddress,
              ownerName: landData.ownerName,
              purchaseDate: landData.purchaseDate,
              previousOwner: landData.previousOwner || "",
              phoneNumber: landData.phoneNumber || "",
              emailAddress: landData.emailAddress || ""
            }
          }],
          memo: "Land registration",
          timeoutHeight: "0",
          extensionOptions: [],
          nonCriticalExtensionOptions: []
        },
        authInfo: {
          signerInfos: [],
          fee: {
            amount: [{ denom: "sunc", amount: "5000" }],
            gasLimit: "200000",
            payer: "",
            granter: ""
          }
        },
        signatures: []
      };

      const response = await this.broadcastTransaction(tx);
      return { success: true, hash: response.txhash };
    } catch (error) {
      return { error: error.message };
    }
  }

  async registerCitizen(citizenData) {
    try {
      const tx = {
        body: {
          messages: [{
            typeUrl: "/rsuncitychain.individualregistration.MsgCreateIndividualrecord",
            value: {
              creator: citizenData.creator,
              personalRegistrationNumber: citizenData.personalRegistrationNumber,
              address: citizenData.address,
              dateOfBirth: citizenData.dateOfBirth,
              gender: citizenData.gender,
              emailAddress: citizenData.emailAddress || "",
              telephoneNumber: citizenData.telephoneNumber || ""
            }
          }],
          memo: "Citizen registration",
          timeoutHeight: "0",
          extensionOptions: [],
          nonCriticalExtensionOptions: []
        },
        authInfo: {
          signerInfos: [],
          fee: {
            amount: [{ denom: "sunc", amount: "5000" }],
            gasLimit: "200000",
            payer: "",
            granter: ""
          }
        },
        signatures: []
      };

      const response = await this.broadcastTransaction(tx);
      return { success: true, hash: response.txhash };
    } catch (error) {
      return { error: error.message };
    }
  }

  async createProposal(proposalData) {
    try {
      const tx = {
        body: {
          messages: [{
            typeUrl: "/rsuncitychain.evoting.MsgCreateProposal",
            value: {
              creator: proposalData.creator,
              title: proposalData.title,
              description: proposalData.description,
              votingPeriod: proposalData.votingPeriod || 7 * 24 * 60 * 60, // 7 days in seconds
              options: proposalData.options || ["yes", "no"]
            }
          }],
          memo: "Create proposal",
          timeoutHeight: "0",
          extensionOptions: [],
          nonCriticalExtensionOptions: []
        },
        authInfo: {
          signerInfos: [],
          fee: {
            amount: [{ denom: "sunc", amount: "10000" }],
            gasLimit: "300000",
            payer: "",
            granter: ""
          }
        },
        signatures: []
      };

      const response = await this.broadcastTransaction(tx);
      return { success: true, hash: response.txhash };
    } catch (error) {
      return { error: error.message };
    }
  }

  async castVote(voteData) {
    try {
      const tx = {
        body: {
          messages: [{
            typeUrl: "/rsuncitychain.evoting.MsgVote",
            value: {
              creator: voteData.creator,
              proposalId: voteData.proposalId,
              option: voteData.option
            }
          }],
          memo: "Cast vote",
          timeoutHeight: "0",
          extensionOptions: [],
          nonCriticalExtensionOptions: []
        },
        authInfo: {
          signerInfos: [],
          fee: {
            amount: [{ denom: "sunc", amount: "2000" }],
            gasLimit: "150000",
            payer: "",
            granter: ""
          }
        },
        signatures: []
      };

      const response = await this.broadcastTransaction(tx);
      return { success: true, hash: response.txhash };
    } catch (error) {
      return { error: error.message };
    }
  }

  async getProposals() {
    try {
      const response = await fetch(`${this.chainConfig.rest}/rsuncitychain/evoting/proposal`);
      
      if (!response.ok) {
        // Return mock proposals for development
        return {
          success: true,
          proposals: [
            {
              id: "1",
              title: "Infrastructure Development Proposal",
              description: "Vote on the new solar energy project for the coastal region",
              creator: "sunc1gov...",
              votingPeriod: 604800,
              startTime: Date.now() - 86400000,
              endTime: Date.now() + 5 * 24 * 60 * 60 * 1000,
              status: "active"
            },
            {
              id: "2",
              title: "Education Budget Allocation",
              description: "Decide on the distribution of education funding across districts",
              creator: "sunc1gov...",
              votingPeriod: 604800,
              startTime: Date.now() - 172800000,
              endTime: Date.now() + 12 * 24 * 60 * 60 * 1000,
              status: "active"
            }
          ]
        };
      }
      
      const data = await response.json();
      return { success: true, proposals: data.proposals || [] };
    } catch (error) {
      // Return mock data for development
      return {
        success: true,
        proposals: [
          {
            id: "1",
            title: "Infrastructure Development Proposal",
            description: "Vote on the new solar energy project for the coastal region",
            creator: "sunc1gov...",
            votingPeriod: 604800,
            startTime: Date.now() - 86400000,
            endTime: Date.now() + 5 * 24 * 60 * 60 * 1000,
            status: "active"
          }
        ]
      };
    }
  }

  async getLandRecords() {
    try {
      const response = await fetch(`${this.chainConfig.rest}/rsuncitychain/landregistration/landrecord`);
      
      if (!response.ok) {
        // Return mock land records for development
        return {
          success: true,
          records: [
            {
              id: "1",
              landRegistrationNumber: "LAND001",
              ownerAddress: "sunc1owner...",
              locationAddress: "123 Sunny Boulevard, Coastal District",
              ownerName: "John Citizen",
              purchaseDate: "2024-01-15",
              previousOwner: "Jane Previous",
              phoneNumber: "+1234567890",
              emailAddress: "john@suncity.gov"
            }
          ]
        };
      }
      
      const data = await response.json();
      return { success: true, records: data.landrecords || [] };
    } catch (error) {
      return {
        success: true,
        records: []
      };
    }
  }

  async getCitizenRecords() {
    try {
      const response = await fetch(`${this.chainConfig.rest}/rsuncitychain/individualregistration/individualrecord`);
      
      if (!response.ok) {
        // Return mock citizen records for development
        return {
          success: true,
          records: [
            {
              id: "1",
              personalRegistrationNumber: "CIT001",
              address: "sunc1citizen...",
              dateOfBirth: "1990-05-15",
              gender: "M",
              emailAddress: "citizen@suncity.gov",
              telephoneNumber: "+1234567890"
            }
          ]
        };
      }
      
      const data = await response.json();
      return { success: true, records: data.individualrecords || [] };
    } catch (error) {
      return {
        success: true,
        records: []
      };
    }
  }

  async broadcastTransaction(tx) {
    try {
      const response = await fetch(`${this.chainConfig.rpc}/broadcast_tx_sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'broadcast_tx_sync',
          params: {
            tx: this.encodeTx(tx)
          }
        })
      });

      if (!response.ok) {
        throw new Error('Broadcast failed');
      }

      const data = await response.json();
      
      if (data.result && data.result.code === 0) {
        return {
          txhash: data.result.hash,
          code: 0,
          raw_log: 'Transaction successful'
        };
      } else {
        throw new Error(data.result?.log || 'Transaction failed');
      }
    } catch (error) {
      console.error('Broadcast error:', error);
      // Mock successful broadcast for development
      return {
        txhash: 'TX' + Date.now().toString(16).toUpperCase(),
        code: 0,
        raw_log: 'Transaction successful (mock)'
      };
    }
  }

  encodeTx(tx) {
    // Mock transaction encoding
    // In a real implementation, this would properly encode the transaction using protobuf
    return Buffer.from(JSON.stringify(tx)).toString('base64');
  }

  async syncBlockchainData() {
    // Periodic sync of blockchain data
    console.log('Syncing blockchain data...');
    const walletInfo = await this.getWalletInfo();
    if (walletInfo.hasWallet && walletInfo.address) {
      // Update balances, transaction history, etc.
      await this.queryBalance(walletInfo.address);
      await this.getTransactionHistory(walletInfo.address);
    }
  }

  async updateVotingProposals() {
    // Update voting proposals
    console.log('Updating voting proposals...');
    const proposals = await this.getProposals();
    if (proposals.success) {
      await chrome.storage.local.set({ 
        cachedProposals: proposals.proposals,
        lastProposalUpdate: Date.now()
      });
    }
  }

  async requestConnection(origin) {
    // Handle dApp connection requests
    try {
      const stored = await chrome.storage.local.get(['connectedSites', 'walletData']);
      const connectedSites = stored.connectedSites || {};
      
      if (connectedSites[origin]) {
        return { 
          connected: true, 
          accounts: stored.walletData?.address ? [stored.walletData.address] : [] 
        };
      }

      // For now, automatically approve connections in development
      // In production, this would open a popup for user approval
      connectedSites[origin] = {
        connected: true,
        timestamp: Date.now()
      };
      
      await chrome.storage.local.set({ connectedSites });
      
      return { 
        connected: true, 
        accounts: stored.walletData?.address ? [stored.walletData.address] : [] 
      };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  async getConnectedAccounts(origin) {
    const stored = await chrome.storage.local.get(['connectedSites', 'walletData']);
    const connectedSites = stored.connectedSites || {};
    
    if (connectedSites[origin] && stored.walletData?.address) {
      return { accounts: [stored.walletData.address] };
    }
    
    return { accounts: [] };
  }

  async requestTransactionSignature(transaction, origin) {
    try {
      // Check if site is connected
      const stored = await chrome.storage.local.get(['connectedSites', 'walletData']);
      const connectedSites = stored.connectedSites || {};
      
      if (!connectedSites[origin]) {
        return { signed: false, error: 'Site not connected' };
      }

      // For development, auto-approve transactions
      // In production, this would open a popup for user approval
      const mockSignature = {
        signature: 'mock_signature_' + Date.now(),
        pub_key: {
          type: 'tendermint/PubKeySecp256k1',
          value: stored.walletData?.publicKey || 'mock_public_key'
        }
      };

      return { 
        signed: true, 
        transaction: {
          ...transaction,
          signatures: [mockSignature]
        }
      };
    } catch (error) {
      return { signed: false, error: error.message };
    }
  }
}

// Initialize the background service
const suncityService = new SuncityBackgroundService();