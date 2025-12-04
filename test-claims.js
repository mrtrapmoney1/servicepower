#!/usr/bin/env node

/**
 * Simple test script for ServicePower Claims API
 *
 * This script tests the Claims API locally without needing Firebase deployment
 */

const fetch = require("node-fetch");

// Configuration
const API_URL = "https://upgdev.servicepower.com:8443/services/claim/v1/retrieval";
const DEFAULT_USER_ID = "met11106";
const DEFAULT_PASSWORD = "B314@ezp!!";

// Helper to mask password
const maskPassword = (password) => {
  if (!password || password.length < 4) return "****";
  return password.substring(0, 2) + "****" + password.substring(password.length - 2);
};

// Main test function
async function testClaimsAPI() {
  // Get credentials from command line args or use defaults
  const userId = process.argv[2] || DEFAULT_USER_ID;
  const password = process.argv[3] || DEFAULT_PASSWORD;

  console.log("=".repeat(60));
  console.log("ServicePower Claims API Test");
  console.log("=".repeat(60));
  console.log(`API URL: ${API_URL}`);
  console.log(`User ID: ${userId}`);
  console.log(`Password: ${maskPassword(password)}`);
  console.log("=".repeat(60));
  console.log();

  // Build request body
  const requestBody = {
    authentication: {
      userId: userId,
      password: password
    }
    // Optional: Add search parameters
    // manufacturerName: "",
    // serviceCenterNumber: "",
    // claimIdentifier: "",
    // claimNumber: "",
    // callNumber: "",
  };

  console.log("Request Body:");
  console.log(JSON.stringify({
    ...requestBody,
    authentication: {
      userId: requestBody.authentication.userId,
      password: maskPassword(requestBody.authentication.password)
    }
  }, null, 2));
  console.log();

  try {
    console.log("Sending request...");
    const startTime = Date.now();

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const duration = Date.now() - startTime;
    console.log(`Response received in ${duration}ms`);
    console.log(`HTTP Status: ${response.status} ${response.statusText}`);
    console.log();

    // Get response body
    const responseText = await response.text();

    // Try to parse as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.log("❌ Response is not valid JSON");
      console.log("Raw Response:");
      console.log(responseText);
      process.exit(1);
    }

    // Check for errors
    if (!response.ok) {
      console.log("❌ HTTP Error");
      console.log(JSON.stringify(responseData, null, 2));
      process.exit(1);
    }

    if (responseData.responseCode === "ER" || responseData.messages) {
      console.log("❌ API Error");
      console.log(`Response Code: ${responseData.responseCode}`);
      if (responseData.transactionId) {
        console.log(`Transaction ID: ${responseData.transactionId}`);
      }
      if (responseData.messages) {
        console.log("Messages:");
        responseData.messages.forEach((msg, i) => {
          console.log(`  ${i + 1}. ${msg.message}`);
        });
      }
      process.exit(1);
    }

    // Success!
    console.log("✅ SUCCESS!");
    console.log();
    console.log(`Response Code: ${responseData.responseCode}`);
    console.log(`Transaction ID: ${responseData.transactionId}`);

    if (responseData.claims) {
      console.log(`Claims Found: ${responseData.claims.length}`);
      console.log();

      if (responseData.claims.length > 0) {
        console.log("First Claim Details:");
        const firstClaim = responseData.claims[0];
        console.log(JSON.stringify(firstClaim, null, 2));
      }
    } else {
      console.log("No claims found in response");
    }

    console.log();
    console.log("Full Response:");
    console.log(JSON.stringify(responseData, null, 2));

  } catch (error) {
    console.log();
    console.log("❌ ERROR");
    console.log(`Error Type: ${error.name}`);
    console.log(`Message: ${error.message}`);

    if (error.code) {
      console.log(`Code: ${error.code}`);
    }

    if (error.errno) {
      console.log(`Errno: ${error.errno}`);
    }

    // Provide helpful hints
    if (error.code === 'ENOTFOUND' || error.errno === 'ENOTFOUND') {
      console.log();
      console.log("💡 Hint: Cannot reach the API server. Check:");
      console.log("   - Internet connectivity");
      console.log("   - VPN connection (if required)");
      console.log("   - Firewall settings");
    } else if (error.code === 'ECONNREFUSED') {
      console.log();
      console.log("💡 Hint: Connection refused. The server may be down or blocking connections.");
    } else if (error.code === 'ETIMEDOUT') {
      console.log();
      console.log("💡 Hint: Connection timeout. The server is not responding.");
    }

    process.exit(1);
  }
}

// Run the test
console.log();
testClaimsAPI();
