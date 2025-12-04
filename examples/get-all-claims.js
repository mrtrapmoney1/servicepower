#!/usr/bin/env node

/**
 * Example: Get all claims (no search filters)
 */

const fetch = require("node-fetch");

const API_URL = "https://upgdev.servicepower.com:8443/services/claim/v1/retrieval";

async function getAllClaims() {
  const requestBody = {
    authentication: {
      userId: "met11106",
      password: "B314@ezp!!"
    }
    // No search parameters - should return all claims you have access to
  };

  console.log("Retrieving all claims...");
  console.log("Sending request...\n");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (data.responseCode === "OK") {
      console.log("✅ SUCCESS!");
      console.log(`Transaction ID: ${data.transactionId}`);
      console.log(`Total Claims Found: ${data.claims ? data.claims.length : 0}\n`);

      if (data.claims && data.claims.length > 0) {
        console.log("First 3 Claims:");
        data.claims.slice(0, 3).forEach((claim, i) => {
          console.log(`\n--- Claim ${i + 1} ---`);
          console.log(`Claim Number: ${claim.claimNumber}`);
          console.log(`Claim Identifier: ${claim.claimIdentifier}`);
          console.log(`Status: ${claim.claimStatusDescription} (${claim.claimStatusCode})`);
          console.log(`Brand: ${claim.brandName}`);
          console.log(`Model: ${claim.modelNumber}`);
          console.log(`Payment Amount: $${claim.paymentAmount}`);
          console.log(`Servicer: ${claim.servicerName}`);
        });

        console.log("\n\nFull Details of First Claim:");
        console.log(JSON.stringify(data.claims[0], null, 2));
      } else {
        console.log("No claims found. This means:");
        console.log("✅ Authentication succeeded");
        console.log("✅ API connection worked");
        console.log("ℹ️  Just no claims available for this account");
      }
    } else {
      console.log("❌ Error:");
      console.log(JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.log("❌ Connection Error:");
    console.log(error.message);

    if (error.code === 'EAI_AGAIN' || error.code === 'ENOTFOUND') {
      console.log("\n💡 This might be a network issue. Make sure:");
      console.log("   - You have internet connectivity");
      console.log("   - VPN is connected (if required)");
      console.log("   - Firewall allows outbound connections");
    }
  }
}

getAllClaims();
