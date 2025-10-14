// Environment and credential management utility
const crypto = require('crypto');

class CredentialManager {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  // Simple obfuscation for production (basic XOR cipher)
  obfuscate(text, key = 'jouster_beff_2024') {
    if (!text || text.includes('your_')) return text;

    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return Buffer.from(result, 'binary').toString('base64');
  }

  // Deobfuscate for production
  deobfuscate(obfuscatedText, key = 'jouster_beff_2024') {
    if (!obfuscatedText || obfuscatedText.includes('your_')) return obfuscatedText;

    try {
      const encrypted = Buffer.from(obfuscatedText, 'base64').toString('binary');
      let result = '';
      for (let i = 0; i < encrypted.length; i++) {
        result += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return result;
    } catch (error) {
      console.warn('Failed to deobfuscate credential, using as-is');
      return obfuscatedText;
    }
  }

  // Get credential based on environment
  getCredential(envVar, obfuscatedVar = null) {
    if (this.isDevelopment) {
      // In development, use plain text from .env
      return process.env[envVar];
    } else if (this.isProduction && obfuscatedVar && process.env[obfuscatedVar]) {
      // In production, use obfuscated credential
      return this.deobfuscate(process.env[obfuscatedVar]);
    } else {
      // Fallback to regular env var
      return process.env[envVar];
    }
  }

  // Validate all required credentials are present
  validateCredentials() {
    const required = [
      'INSTAGRAM_APP_ID',
      'INSTAGRAM_APP_SECRET',
      'INSTAGRAM_ACCESS_TOKEN',
      'INSTAGRAM_USER_ID',
      'FACEBOOK_PAGE_ID',
      'FACEBOOK_PAGE_ACCESS_TOKEN'
    ];

    const missing = [];
    const configured = {};

    required.forEach(key => {
      const value = this.getCredential(key, `${key}_OBFUSCATED`);
      if (!value || value.includes('your_')) {
        missing.push(key);
      } else {
        configured[key] = value.substring(0, 8) + '...'; // Show first 8 chars for verification
      }
    });

    return {
      isValid: missing.length === 0,
      missing,
      configured,
      environment: process.env.NODE_ENV || 'development'
    };
  }

  // Get all Instagram API credentials
  getInstagramCredentials() {
    return {
      appId: this.getCredential('INSTAGRAM_APP_ID', 'INSTAGRAM_APP_ID_OBFUSCATED'),
      appSecret: this.getCredential('INSTAGRAM_APP_SECRET', 'INSTAGRAM_APP_SECRET_OBFUSCATED'),
      accessToken: this.getCredential('INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_ACCESS_TOKEN_OBFUSCATED'),
      userId: this.getCredential('INSTAGRAM_USER_ID', 'INSTAGRAM_USER_ID_OBFUSCATED'),
      pageId: this.getCredential('FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_ID_OBFUSCATED'),
      pageAccessToken: this.getCredential('FACEBOOK_PAGE_ACCESS_TOKEN', 'FACEBOOK_PAGE_ACCESS_TOKEN_OBFUSCATED')
    };
  }
}

module.exports = CredentialManager;
