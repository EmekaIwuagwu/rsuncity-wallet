// Republic of Suncity Wallet - Content Script
// This script runs on all web pages and injects the wallet provider

(function() {
  'use strict';

  // Inject the wallet provider script into the page
  function injectWalletProvider() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('content/inject.js');
    script.onload = function() {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  }

  // Message relay between injected script and extension
  function setupMessageRelay() {
    // Listen for messages from the injected script
    window.addEventListener('message', (event) => {
      // Only accept messages from the same origin
      if (event.source !== window) return;
      
      // Only handle messages intended for the wallet
      if (event.data?.target !== 'suncity-wallet-content') return;

      // Relay message to the background script
      chrome.runtime.sendMessage({
        action: 'externalRequest',
        data: event.data
      }, (response) => {
        // Send response back to the injected script
        window.postMessage({
          target: 'suncity-wallet-page',
          id: event.data.id,
          response: response
        }, '*');
      });
    });

    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.target === 'page') {
        // Forward message to the injected script
        window.postMessage({
          target: 'suncity-wallet-page',
          data: request.data
        }, '*');
        sendResponse({ received: true });
      }
    });
  }

  // Detect if the page is a Republic of Suncity dApp
  function detectSuncityDApp() {
    // Look for specific meta tags or content that indicates this is a Suncity dApp
    const metaTags = document.querySelectorAll('meta[name*="suncity"], meta[content*="suncity"]');
    const hasChainIdMeta = document.querySelector('meta[name="blockchain-chain-id"][content="rsuncitychain"]');
    const hasSuncityContent = document.body && document.body.innerHTML.toLowerCase().includes('suncity');
    
    return metaTags.length > 0 || hasChainIdMeta || hasSuncityContent;
  }

  // Enhanced provider injection for Suncity dApps
  function enhancedInjection() {
    if (detectSuncityDApp()) {
      console.log('Republic of Suncity dApp detected - Enhanced wallet provider loaded');
      
      // Add visual indicator that wallet is available
      addWalletIndicator();
      
      // Auto-announce wallet availability
      setTimeout(() => {
        window.postMessage({
          type: 'SUNCITY_WALLET_AVAILABLE',
          detail: {
            chainId: 'rsuncitychain',
            chainName: 'Republic of Suncity'
          }
        }, '*');
      }, 1000);
    }
  }

  // Add visual indicator for wallet availability
  function addWalletIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'suncity-wallet-indicator';
    indicator.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #87CEEB, #FFD700);
        color: #1a1a1a;
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: Inter, Roboto, sans-serif;
      " onmouseover="this.style.transform='scale(1.05)'" 
         onmouseout="this.style.transform='scale(1)'">
        ☀ Suncity Wallet Connected
      </div>
    `;
    
    // Remove after 5 seconds
    document.body.appendChild(indicator);
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.style.opacity = '0';
        indicator.style.transform = 'translateX(100%)';
        setTimeout(() => indicator.remove(), 300);
      }
    }, 5000);
    
    // Click to open wallet
    indicator.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openWallet' });
    });
  }

  // Monitor for dynamic content changes
  function setupDynamicMonitoring() {
    // Watch for new script tags that might indicate wallet requests
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check for wallet-related scripts or components
            if (node.tagName === 'SCRIPT' && 
                (node.src?.includes('wallet') || 
                 node.innerHTML?.includes('suncity') || 
                 node.innerHTML?.includes('wallet'))) {
              console.log('Wallet-related script detected');
              enhancedInjection();
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Handle wallet connection status changes
  function handleWalletStatusChange() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.walletData) {
        // Notify page about wallet status change
        window.postMessage({
          type: 'SUNCITY_WALLET_STATUS_CHANGED',
          detail: {
            connected: !!changes.walletData.newValue,
            address: changes.walletData.newValue?.address
          }
        }, '*');
      }
    });
  }

  // Security: Validate message origins
  function isValidOrigin(origin) {
    // Allow localhost for development
    if (origin.startsWith('http://localhost') || 
        origin.startsWith('https://localhost') ||
        origin.startsWith('http://127.0.0.1') ||
        origin.startsWith('https://127.0.0.1')) {
      return true;
    }
    
    // Allow official Suncity domains (add your domains here)
    const allowedDomains = [
      'suncity.gov',
      'republic-of-suncity.com',
      'suncitychain.io'
    ];
    
    return allowedDomains.some(domain => 
      origin.includes(domain)
    );
  }

  // Enhanced message validation
  function validateMessage(data) {
    // Basic structure validation
    if (!data || typeof data !== 'object') return false;
    
    // Required fields validation
    if (data.target === 'suncity-wallet-content') {
      return data.id && data.method;
    }
    
    return true;
  }

  // Enhanced setup with security
  function secureSetupMessageRelay() {
    window.addEventListener('message', (event) => {
      // Security checks
      if (event.source !== window) return;
      if (!isValidOrigin(event.origin)) {
        console.warn('Suncity Wallet: Message from unauthorized origin blocked:', event.origin);
        return;
      }
      if (!validateMessage(event.data)) return;
      
      // Only handle messages intended for the wallet
      if (event.data?.target !== 'suncity-wallet-content') return;

      // Add origin to the request for security tracking
      const requestData = {
        ...event.data,
        origin: event.origin,
        timestamp: Date.now()
      };

      // Relay message to the background script
      chrome.runtime.sendMessage({
        action: 'externalRequest',
        data: requestData
      }, (response) => {
        // Send response back to the injected script
        window.postMessage({
          target: 'suncity-wallet-page',
          id: event.data.id,
          response: response || { error: 'No response from wallet' }
        }, '*');
      });
    });

    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.target === 'page') {
        // Forward message to the injected script
        window.postMessage({
          target: 'suncity-wallet-page',
          data: request.data
        }, '*');
        sendResponse({ received: true });
      }
    });
  }

  // Initialize when DOM is ready
  function initialize() {
    injectWalletProvider();
    secureSetupMessageRelay();
    handleWalletStatusChange();
    
    // Wait for DOM to be fully loaded before enhanced features
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        enhancedInjection();
        setupDynamicMonitoring();
      });
    } else {
      enhancedInjection();
      setupDynamicMonitoring();
    }
  }

  // Prevent multiple injections
  if (window.suncityWalletContentScriptLoaded) {
    console.log('Republic of Suncity Wallet content script already loaded');
    return;
  }
  
  window.suncityWalletContentScriptLoaded = true;
  initialize();
  
  console.log('Republic of Suncity Wallet content script loaded');
})();