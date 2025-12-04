/**
 * ServicePower Firebase Functions - Main Entry Point
 *
 * This file exports all Firebase Cloud Functions for ServicePower integration.
 * Functions are organized into separate modules:
 * - soapApi.js: SOAP API functions (getServicePowerData, testSoapConnection)
 * - claimsApi.js: JSON REST API functions (getClaimData, testClaimsConnection)
 */

const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Import SOAP API functions
const soapApi = require("./soapApi");

// Import Claims REST API functions
const claimsApi = require("./claimsApi");

// ===== SOAP API ENDPOINTS =====
// For fetching call information using ServicePower's SOAP API

// Main SOAP endpoint - Get call information
exports.getServicePowerData = soapApi.getServicePowerData;

// Test SOAP connection
exports.testSoapConnection = soapApi.testSoapConnection;

// Backward compatibility alias
exports.testConnection = soapApi.testSoapConnection;

// ===== JSON REST API ENDPOINTS =====
// For fetching claims using ServicePower's JSON REST API

// Main Claims endpoint - Retrieve claims
exports.getClaimData = claimsApi.getClaimData;

// Test Claims API connection
exports.testClaimsConnection = claimsApi.testClaimsConnection;
