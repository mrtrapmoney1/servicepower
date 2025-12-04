#!/usr/bin/env node

/**
 * Example: Get a specific claim by claim number
 */

const fetch = require("node-fetch");

const API_URL = "https://upgdev.servicepower.com:8443/services/claim/v1/retrieval";

async function getClaimByNumber(claimNumber) {
  const requestBody = {
    authentication: {
      userId: "met11106",
      password: "B314@ezp!!"
    },
    claimNumber: claimNumber  // e.g., "12345"
  };

  console.log(`Searching for claim: ${claimNumber}`);
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
      console.log(`Claims Found: ${data.claims ? data.claims.length : 0}\n`);

      if (data.claims && data.claims.length > 0) {
        console.log("Claim Details:");
        console.log(JSON.stringify(data.claims[0], null, 2));
      }
    } else {
      console.log("❌ Error:");
      console.log(JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.log("❌ Connection Error:");
    console.log(error.message);
  }
}

// Get claim number from command line or use example
const claimNumber = process.argv[2] || "12345";
getClaimByNumber(claimNumber);
