// Republic of Suncity Wallet - Main Popup JavaScript

class SuncityWalletUI {
    constructor() {
        this.currentScreen = 'loading';
        this.wallet = null;
        this.currentMnemonic = '';
        this.verificationWords = [];
        this.selectedWords = [];
        
        this.init();
    }

    async init() {
        console.log('Initializing Republic of Suncity Wallet UI...');
        this.setupEventListeners();
        await this.checkWalletStatus();
    }

    async checkWalletStatus() {
        try {
            // Check if wallet exists in storage
            const result = await chrome.storage.local.get(['walletData', 'isLocked']);
            
            setTimeout(() => {
                if (result.walletData && !result.isLocked) {
                    // Wallet exists and is unlocked
                    this.loadWalletData(result.walletData);
                    this.showScreen('main-wallet');
                } else if (result.walletData && result.isLocked) {
                    // Wallet exists but is locked - show unlock screen
                    this.showScreen('unlock'); // We'll implement this later
                } else {
                    // No wallet exists - show welcome screen
                    this.showScreen('welcome');
                }
            }, 1500); // Show loading for 1.5 seconds
            
        } catch (error) {
            console.error('Error checking wallet status:', error);
            this.showScreen('welcome');
        }
    }

    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Show target screen
        const targetScreen = document.getElementById(`${screenName}-screen`);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            this.currentScreen = screenName;
        }
    }

    setupEventListeners() {
        // Welcome screen buttons
        document.getElementById('create-wallet-btn').addEventListener('click', () => {
            this.showScreen('create-wallet');
        });

        document.getElementById('import-wallet-btn').addEventListener('click', () => {
            this.showScreen('import-wallet');
        });

        // Back buttons
        document.getElementById('back-to-welcome').addEventListener('click', () => {
            this.showScreen('welcome');
        });

        document.getElementById('back-to-welcome-import').addEventListener('click', () => {
            this.showScreen('welcome');
        });

        // Create wallet flow
        this.setupCreateWalletListeners();
        
        // Import wallet flow
        this.setupImportWalletListeners();
        
        // Main wallet interface
        this.setupMainWalletListeners();
        
        // Navigation tabs
        this.setupTabNavigation();
        
        // Modals
        this.setupModalListeners();
    }

    setupCreateWalletListeners() {
        const newPasswordInput = document.getElementById('new-password');
        const confirmPasswordInput = document.getElementById('confirm-password');
        const continueBtn = document.getElementById('continue-to-mnemonic');

        // Password validation
        [newPasswordInput, confirmPasswordInput].forEach(input => {
            input.addEventListener('input', () => {
                this.validatePassword();
            });
        });

        continueBtn.addEventListener('click', () => {
            if (this.validatePassword()) {
                this.generateMnemonic();
                this.showStep(2);
            }
        });

        document.getElementById('continue-to-verify').addEventListener('click', () => {
            this.setupMnemonicVerification();
            this.showStep(3);
        });

        document.getElementById('create-wallet-final').addEventListener('click', async () => {
            if (this.verifyMnemonicSelection()) {
                await this.createWallet();
            }
        });
    }

    setupImportWalletListeners() {
        const importMnemonic = document.getElementById('import-mnemonic');
        const importPassword = document.getElementById('import-password');
        const importConfirmPassword = document.getElementById('import-confirm-password');
        const importBtn = document.getElementById('import-wallet-final');

        [importMnemonic, importPassword, importConfirmPassword].forEach(input => {
            input.addEventListener('input', () => {
                this.validateImportForm();
            });
        });

        importBtn.addEventListener('click', async () => {
            await this.importWallet();
        });
    }

    setupMainWalletListeners() {
        // Send and Receive buttons
        document.getElementById('send-btn').addEventListener('click', () => {
            this.showModal('send');
        });

        document.getElementById('receive-btn').addEventListener('click', () => {
            this.showModal('receive');
        });

        // Government services
        document.querySelectorAll('[data-service]').forEach(card => {
            card.addEventListener('click', (e) => {
                const service = e.currentTarget.getAttribute('data-service');
                this.openGovernmentService(service);
            });
        });

        // Settings
        document.querySelectorAll('[data-setting]').forEach(setting => {
            setting.addEventListener('click', (e) => {
                const settingType = e.currentTarget.getAttribute('data-setting');
                this.openSetting(settingType);
            });
        });

        // Refresh proposals
        document.getElementById('refresh-proposals').addEventListener('click', () => {
            this.loadProposals();
        });
    }

    setupTabNavigation() {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Remove active class from all tabs and panels
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
                
                // Add active class to clicked tab and show corresponding panel
                e.target.classList.add('active');
                const targetTab = e.target.getAttribute('data-tab');
                document.getElementById(`${targetTab}-tab`).classList.remove('hidden');
                
                // Load data for specific tabs
                if (targetTab === 'voting') {
                    this.loadProposals();
                } else if (targetTab === 'wallet') {
                    this.refreshWalletData();
                }
            });
        });
    }

    setupModalListeners() {
        // Send modal
        document.getElementById('close-send-modal').addEventListener('click', () => {
            this.hideModal('send');
        });

        document.getElementById('cancel-send').addEventListener('click', () => {
            this.hideModal('send');
        });

        document.getElementById('confirm-send').addEventListener('click', () => {
            this.sendTokens();
        });

        // Receive modal
        document.getElementById('close-receive-modal').addEventListener('click', () => {
            this.hideModal('receive');
        });

        document.getElementById('copy-address-btn').addEventListener('click', () => {
            this.copyAddress();
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.add('hidden');
            }
        });
    }

    validatePassword() {
        const password = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const continueBtn = document.getElementById('continue-to-mnemonic');
        
        // Check requirements
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            number: /\d/.test(password)
        };

        // Update requirement indicators
        Object.keys(requirements).forEach(req => {
            const element = document.querySelector(`[data-req="${req}"]`);
            if (requirements[req]) {
                element.classList.add('valid');
                element.querySelector('.req-icon').textContent = '✓';
            } else {
                element.classList.remove('valid');
                element.querySelector('.req-icon').textContent = '✗';
            }
        });

        // Enable continue button if all requirements met and passwords match
        const isValid = Object.values(requirements).every(Boolean) && 
                        password === confirmPassword && 
                        confirmPassword.length > 0;
        
        continueBtn.disabled = !isValid;
        return isValid;
    }

    generateMnemonic() {
        // Generate 24-word mnemonic (mock implementation)
        const words = [
            'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
            'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
            'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
            'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
            'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'agent', 'agree',
            'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol'
        ];

        this.currentMnemonic = [];
        for (let i = 0; i < 24; i++) {
            this.currentMnemonic.push(words[Math.floor(Math.random() * words.length)]);
        }

        // Display mnemonic
        const mnemonicDisplay = document.getElementById('mnemonic-display');
        mnemonicDisplay.innerHTML = '';
        
        this.currentMnemonic.forEach((word, index) => {
            const wordElement = document.createElement('div');
            wordElement.className = 'mnemonic-word';
            wordElement.textContent = word;
            wordElement.setAttribute('data-index', index + 1);
            mnemonicDisplay.appendChild(wordElement);
        });
    }

    setupMnemonicVerification() {
        // Select 6 random positions for verification
        this.verificationWords = [];
        const positions = [];
        
        while (positions.length < 6) {
            const pos = Math.floor(Math.random() * 24);
            if (!positions.includes(pos)) {
                positions.push(pos);
            }
        }
        
        positions.sort((a, b) => a - b);
        this.verificationWords = positions.map(pos => ({
            position: pos,
            word: this.currentMnemonic[pos]
        }));

        // Create word slots
        const wordSlots = document.getElementById('word-slots');
        wordSlots.innerHTML = '';
        
        this.verificationWords.forEach((item, index) => {
            const slot = document.createElement('div');
            slot.className = 'word-slot';
            slot.setAttribute('data-position', item.position);
            slot.setAttribute('data-index', index);
            slot.innerHTML = `<small>#${item.position + 1}</small>`;
            wordSlots.appendChild(slot);
        });

        // Create shuffled word options
        const wordOptions = document.getElementById('word-options');
        wordOptions.innerHTML = '';
        
        const allOptions = [...this.verificationWords.map(item => item.word)];
        
        // Add some random words as distractors
        const words = [
            'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
            'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid'
        ];
        
        while (allOptions.length < 12) {
            const randomWord = words[Math.floor(Math.random() * words.length)];
            if (!allOptions.includes(randomWord)) {
                allOptions.push(randomWord);
            }
        }

        // Shuffle options
        allOptions.sort(() => Math.random() - 0.5);
        
        allOptions.forEach(word => {
            const option = document.createElement('div');
            option.className = 'word-option';
            option.textContent = word;
            option.addEventListener('click', () => this.selectWord(word, option));
            wordOptions.appendChild(option);
        });

        this.selectedWords = [];
    }

    selectWord(word, element) {
        if (element.classList.contains('used')) return;
        
        if (this.selectedWords.length < 6) {
            const currentSlot = document.querySelector(`[data-index="${this.selectedWords.length}"]`);
            currentSlot.textContent = word;
            currentSlot.classList.add('filled');
            
            this.selectedWords.push(word);
            element.classList.add('used');
            
            if (this.selectedWords.length === 6) {
                document.getElementById('create-wallet-final').disabled = false;
            }
        }
    }

    verifyMnemonicSelection() {
        for (let i = 0; i < this.verificationWords.length; i++) {
            if (this.selectedWords[i] !== this.verificationWords[i].word) {
                this.showNotification('Incorrect word selection. Please try again.', 'error');
                return false;
            }
        }
        return true;
    }

    async createWallet() {
        try {
            const password = document.getElementById('new-password').value;
            
            // Mock wallet creation
            const walletData = {
                mnemonic: this.currentMnemonic.join(' '),
                address: 'sunc1qjsj8k2lm9xrtvn3p4k6j8h9g7f5d4c3b2a1z9x8y7w6v5',
                publicKey: 'suncpub1addwnpepqt2rj4...mockpubkey',
                encrypted: true,
                created: Date.now()
            };

            // Store encrypted wallet data
            await chrome.storage.local.set({
                walletData: walletData,
                isLocked: false,
                password: password // In real implementation, this should be hashed
            });

            this.wallet = walletData;
            this.showNotification('Wallet created successfully!', 'success');
            
            setTimeout(() => {
                this.showScreen('main-wallet');
                this.loadWalletData(walletData);
            }, 1000);
            
        } catch (error) {
            console.error('Wallet creation error:', error);
            this.showNotification('Failed to create wallet. Please try again.', 'error');
        }
    }

    validateImportForm() {
        const mnemonic = document.getElementById('import-mnemonic').value.trim();
        const password = document.getElementById('import-password').value;
        const confirmPassword = document.getElementById('import-confirm-password').value;
        const importBtn = document.getElementById('import-wallet-final');

        const words = mnemonic.split(/\s+/);
        const isValidMnemonic = words.length === 12 || words.length === 24;
        const isValidPassword = password.length >= 8 && password === confirmPassword;

        importBtn.disabled = !isValidMnemonic || !isValidPassword;
    }

    async importWallet() {
        try {
            const mnemonic = document.getElementById('import-mnemonic').value.trim();
            const password = document.getElementById('import-password').value;

            // Mock wallet import
            const walletData = {
                mnemonic: mnemonic,
                address: 'sunc1imported8k2lm9xrtvn3p4k6j8h9g7f5d4c3b2a1z9',
                publicKey: 'suncpub1imported...mockpubkey',
                encrypted: true,
                imported: Date.now()
            };

            await chrome.storage.local.set({
                walletData: walletData,
                isLocked: false,
                password: password
            });

            this.wallet = walletData;
            this.showNotification('Wallet imported successfully!', 'success');
            
            setTimeout(() => {
                this.showScreen('main-wallet');
                this.loadWalletData(walletData);
            }, 1000);
            
        } catch (error) {
            console.error('Wallet import error:', error);
            this.showNotification('Failed to import wallet. Please check your recovery phrase.', 'error');
        }
    }

    loadWalletData(walletData) {
        this.wallet = walletData;
        
        // Update address display
        const addressDisplay = document.getElementById('user-address');
        const fullAddress = walletData.address;
        addressDisplay.textContent = fullAddress.slice(0, 10) + '...' + fullAddress.slice(-6);
        addressDisplay.title = fullAddress;
        
        // Update balance (mock)
        document.getElementById('balance-amount').textContent = '1,250.000000';
        
        // Load transaction history
        this.loadTransactionHistory();
        
        // Update receive modal address
        document.getElementById('copy-address').value = fullAddress;
    }

    async refreshWalletData() {
        if (!this.wallet) return;

        try {
            // Mock balance refresh
            const mockBalance = (Math.random() * 2000 + 500).toFixed(6);
            document.getElementById('balance-amount').textContent = mockBalance;
            
            this.loadTransactionHistory();
        } catch (error) {
            console.error('Failed to refresh wallet data:', error);
        }
    }

    loadTransactionHistory() {
        const transactionList = document.getElementById('transaction-list');
        
        // Mock transaction data
        const mockTransactions = [
            {
                type: 'Received',
                address: 'sunc1abc...xyz789',
                amount: '+500.000000 SUNC',
                hash: 'tx_hash_1',
                timestamp: Date.now() - 86400000
            },
            {
                type: 'Sent',
                address: 'sunc1def...uvw456',
                amount: '-250.000000 SUNC',
                hash: 'tx_hash_2',
                timestamp: Date.now() - 172800000
            },
            {
                type: 'Land Registration',
                address: 'Property #12345',
                amount: '-5.000000 SUNC',
                hash: 'tx_hash_3',
                timestamp: Date.now() - 259200000
            }
        ];

        transactionList.innerHTML = '';
        
        if (mockTransactions.length === 0) {
            transactionList.innerHTML = '<div class="empty-state"><p>No transactions yet</p></div>';
            return;
        }

        mockTransactions.forEach(tx => {
            const txElement = document.createElement('div');
            txElement.className = 'transaction-item';
            txElement.innerHTML = `
                <div class="transaction-info">
                    <div class="transaction-type">${tx.type}</div>
                    <div class="transaction-address">${tx.address}</div>
                </div>
                <div class="transaction-amount ${tx.amount.startsWith('-') ? 'negative' : ''}">${tx.amount}</div>
            `;
            transactionList.appendChild(txElement);
        });
    }

    async loadProposals() {
        const proposalsList = document.getElementById('proposals-list');
        
        // Mock proposal data
        const mockProposals = [
            {
                id: 1,
                title: 'Infrastructure Development Proposal',
                description: 'Vote on the new solar energy project for the coastal region',
                votesFor: 342,
                votesAgainst: 128,
                endDate: Date.now() + 5 * 24 * 60 * 60 * 1000 // 5 days from now
            },
            {
                id: 2,
                title: 'Education Budget Allocation',
                description: 'Decide on the distribution of education funding across districts',
                votesFor: 156,
                votesAgainst: 89,
                endDate: Date.now() + 12 * 24 * 60 * 60 * 1000 // 12 days from now
            }
        ];

        proposalsList.innerHTML = '';
        
        if (mockProposals.length === 0) {
            proposalsList.innerHTML = `
                <div class="empty-state">
                    <p>No active proposals</p>
                    <button class="btn btn-secondary" id="refresh-proposals">Refresh Proposals</button>
                </div>
            `;
            return;
        }

        mockProposals.forEach(proposal => {
            const daysLeft = Math.ceil((proposal.endDate - Date.now()) / (24 * 60 * 60 * 1000));
            const totalVotes = proposal.votesFor + proposal.votesAgainst;
            
            const proposalElement = document.createElement('div');
            proposalElement.className = 'service-card';
            proposalElement.innerHTML = `
                <div class="service-title">${proposal.title}</div>
                <div class="service-description">${proposal.description}</div>
                <div style="margin-top: 12px; display: flex; gap: 8px;">
                    <button class="btn btn-primary vote-btn" data-proposal="${proposal.id}" data-vote="yes" style="flex: 1; padding: 8px;">
                        Vote Yes
                    </button>
                    <button class="btn btn-secondary vote-btn" data-proposal="${proposal.id}" data-vote="no" style="flex: 1; padding: 8px;">
                        Vote No
                    </button>
                </div>
                <div style="margin-top: 8px; font-size: 11px; color: #6c757d;">
                    Ends in ${daysLeft} days • ${totalVotes} votes cast
                </div>
            `;
            
            // Add vote button listeners
            const voteButtons = proposalElement.querySelectorAll('.vote-btn');
            voteButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    this.castVote(proposal.id, btn.dataset.vote, proposal.title);
                });
            });
            
            proposalsList.appendChild(proposalElement);
        });
    }

    async castVote(proposalId, vote, proposalTitle) {
        try {
            // Mock voting
            this.showNotification(`Voted ${vote.toUpperCase()} on "${proposalTitle}"`, 'success');
            
            // Refresh proposals after voting
            setTimeout(() => {
                this.loadProposals();
            }, 1000);
            
        } catch (error) {
            console.error('Voting error:', error);
            this.showNotification('Failed to cast vote. Please try again.', 'error');
        }
    }

    showStep(stepNumber) {
        document.querySelectorAll('.step').forEach(step => {
            step.classList.add('hidden');
        });
        document.getElementById(`step-${stepNumber}`).classList.remove('hidden');
    }

    showModal(modalType) {
        const modal = document.getElementById(`${modalType}-modal`);
        modal.classList.remove('hidden');
        
        if (modalType === 'receive' && this.wallet) {
            document.getElementById('copy-address').value = this.wallet.address;
        }
    }

    hideModal(modalType) {
        const modal = document.getElementById(`${modalType}-modal`);
        modal.classList.add('hidden');
        
        // Clear form data
        if (modalType === 'send') {
            document.getElementById('send-address').value = '';
            document.getElementById('send-amount').value = '';
            document.getElementById('send-memo').value = '';
        }
    }

    async sendTokens() {
        const address = document.getElementById('send-address').value;
        const amount = document.getElementById('send-amount').value;
        const memo = document.getElementById('send-memo').value;

        if (!address || !amount || parseFloat(amount) <= 0) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        if (!address.startsWith('sunc1') || address.length < 39) {
            this.showNotification('Invalid recipient address', 'error');
            return;
        }

        try {
            // Mock transaction sending
            this.showNotification('Transaction sent successfully!', 'success');
            this.hideModal('send');
            
            // Refresh wallet data
            setTimeout(() => {
                this.refreshWalletData();
            }, 1000);
            
        } catch (error) {
            console.error('Send transaction error:', error);
            this.showNotification('Failed to send transaction', 'error');
        }
    }

    copyAddress() {
        const addressInput = document.getElementById('copy-address');
        addressInput.select();
        document.execCommand('copy');
        this.showNotification('Address copied to clipboard!', 'success');
    }

    openGovernmentService(service) {
        const services = {
            'land': 'Land Registration Service',
            'citizen': 'Citizen Registration Service',
            'records': 'Public Records Search'
        };
        this.showNotification(`Opening ${services[service]}...`, 'info');
        
        // Here you would open dedicated service pages/modals
        // For now, we'll just show a notification
    }

    openSetting(setting) {
        const settings = {
            'network': 'Network Configuration',
            'security': 'Security Settings',
            'export': 'Private Key Export',
            'about': 'About Republic of Suncity'
        };
        this.showNotification(`Opening ${settings[setting]}...`, 'info');
    }

    showNotification(message, type = 'success') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize the wallet UI when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.suncityWalletUI = new SuncityWalletUI();
});