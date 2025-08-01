// src/utils/extensionUtils.js

/**
 * Check if the Only Tokens extension is available
 * @returns {boolean} True if extension is available
 */
export const isOnlyTokensExtensionAvailable = () => {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return false;
    }

    // Check if the extension is available
    const hasExtension = !!(window.only && window.only.cosmos);
    
    // Also check for any Chrome extension injection
    const hasChromeExtension = !!(window.chrome && window.chrome.runtime);
    
    console.log('Extension check:', { hasExtension, hasChromeExtension });
    
    return hasExtension;
  } catch (error) {
    console.error('Error checking Only Tokens extension:', error);
    return false;
  }
};

/**
 * Get the Only Tokens extension interface
 * @returns {Object|null} The extension interface or null if not available
 */
export const getOnlyTokensExtension = () => {
  try {
    if (isOnlyTokensExtensionAvailable()) {
      return window.only.cosmos;
    }
    return null;
  } catch (error) {
    console.error('Error getting Only Tokens extension:', error);
    return null;
  }
};

/**
 * Wait for the extension to be available
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} True if extension becomes available
 */
export const waitForExtension = (timeout = 5000) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkExtension = () => {
      if (isOnlyTokensExtensionAvailable()) {
        resolve(true);
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        resolve(false);
        return;
      }
      
      setTimeout(checkExtension, 100);
    };
    
    checkExtension();
  });
};

/**
 * Enable the extension for a specific chain
 * @param {string} chainId - The chain ID to enable
 * @returns {Promise<Object>} The offline signer
 */
export const enableExtensionForChain = async (chainId) => {
  const extension = getOnlyTokensExtension();
  if (!extension) {
    throw new Error('Only Tokens extension is not available');
  }
  
  await extension.enable(chainId);
  return extension.getOfflineSigner(chainId);
};

/**
 * Get account information from the extension
 * @param {string} chainId - The chain ID
 * @returns {Promise<Array>} Array of accounts
 */
export const getAccounts = async (chainId) => {
  const offlineSigner = await enableExtensionForChain(chainId);
  return await offlineSigner.getAccounts();
};

/**
 * Debug function to log extension status
 */
export const debugExtensionStatus = () => {
  console.log('=== Only Tokens Extension Debug ===');
  console.log('Window object available:', typeof window !== 'undefined');
  console.log('window.only available:', !!window.only);
  console.log('window.only.cosmos available:', !!(window.only && window.only.cosmos));
  console.log('window.chrome available:', !!window.chrome);
  console.log('window.chrome.runtime available:', !!(window.chrome && window.chrome.runtime));
  
  if (window.only && window.only.cosmos) {
    console.log('Extension methods:', Object.keys(window.only.cosmos));
  }
  
  // Check for any injected scripts by extensions
  const scripts = document.querySelectorAll('script');
  const extensionScripts = Array.from(scripts).filter(script => 
    script.src && (script.src.includes('chrome-extension') || script.src.includes('extension'))
  );
  console.log('Extension scripts found:', extensionScripts.length);
  
  console.log('==================================');
};

/**
 * Try to establish communication with the extension
 * @returns {Promise<boolean>} True if communication is established
 */
export const tryEstablishExtensionCommunication = async () => {
  try {
    // Try to send a message to the extension
    if (window.chrome && window.chrome.runtime) {
      console.log('Attempting to communicate with Chrome extension...');
      
      // This is a generic approach - the actual extension ID would be needed
      // For now, we'll just check if the extension interface becomes available
      return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 10;
        
        const checkExtension = () => {
          attempts++;
          if (isOnlyTokensExtensionAvailable()) {
            console.log('Extension communication established');
            resolve(true);
            return;
          }
          
          if (attempts >= maxAttempts) {
            console.log('Failed to establish extension communication');
            resolve(false);
            return;
          }
          
          setTimeout(checkExtension, 500);
        };
        
        checkExtension();
      });
    }
    
    return false;
  } catch (error) {
    console.error('Error establishing extension communication:', error);
    return false;
  }
}; 