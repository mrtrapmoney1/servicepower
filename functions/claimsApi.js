const functions = require("firebase-functions");
const fetch = require("node-fetch");

// ServicePower Claims API URLs
const CLAIMS_URLS = {
  development: {
    northAmerica: "https://upgdev.servicepower.com:8443/services/claim/v1/retrieval",
    europe: "https://claimsqa-eu.servicepower.com/services/claim/v1/retrieval"
  },
  production: {
    northAmerica: "https://claimworks.servicepower.com:8443/services/claim/v1/retrieval",
    europe: "https://claims-eu.servicepower.com/services/claim/v1/retrieval"
  }
};

// Helper to mask password
const maskPassword = (password) => {
  if (!password || password.length < 4) return "****";
  return password.substring(0, 2) + "****" + password.substring(password.length - 2);
};

/**
 * Retrieve claims from ServicePower JSON REST API
 *
 * Query Parameters:
 * - userId: User ID for authentication (default: met11106)
 * - password: Password for authentication (default: B314@ezp!!)
 * - environment: 'development' or 'production' (default: development)
 * - region: 'northAmerica' or 'europe' (default: northAmerica)
 * - manufacturerName: Manufacturer name (optional)
 * - serviceCenterNumber: Service center number (optional)
 * - claimIdentifier: Claim identifier (optional)
 * - claimNumber: Claim number (optional)
 * - callNumber: Call number (optional)
 * - claimBatchNumber: Claim batch number (optional)
 * - claimSequenceNumber: Claim sequence number (optional)
 */
exports.getClaimData = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    // Get credentials - prioritize request params, then config, then defaults
    const config = functions.config();
    const userId = req.body?.userId || req.query.userId ||
                   config.servicepower?.userid || process.env.SP_USER_ID || "met11106";
    const password = req.body?.password || req.query.password ||
                     config.servicepower?.password || process.env.SP_PASSWORD || "B314@ezp!!";

    // Get environment and region settings
    const environment = req.query.environment || req.body?.environment || "development";
    const region = req.query.region || req.body?.region || "northAmerica";

    // Select the appropriate URL
    const apiUrl = CLAIMS_URLS[environment]?.[region];
    if (!apiUrl) {
      res.status(400).json({
        error: "Invalid configuration",
        message: `Invalid environment '${environment}' or region '${region}'`,
        validEnvironments: Object.keys(CLAIMS_URLS),
        validRegions: Object.keys(CLAIMS_URLS.development)
      });
      return;
    }

    // Build the request body based on ServicePower Claims API spec
    const requestBody = {
      authentication: {
        userId: userId,
        password: password
      }
    };

    // Add optional search parameters
    if (req.query.manufacturerName || req.body?.manufacturerName) {
      requestBody.manufacturerName = req.query.manufacturerName || req.body.manufacturerName;
    }
    if (req.query.serviceCenterNumber || req.body?.serviceCenterNumber) {
      requestBody.serviceCenterNumber = req.query.serviceCenterNumber || req.body.serviceCenterNumber;
    }
    if (req.query.claimIdentifier || req.body?.claimIdentifier) {
      requestBody.claimIdentifier = req.query.claimIdentifier || req.body.claimIdentifier;
    }
    if (req.query.claimNumber || req.body?.claimNumber) {
      requestBody.claimNumber = req.query.claimNumber || req.body.claimNumber;
    }
    if (req.query.callNumber || req.body?.callNumber) {
      requestBody.callNumber = req.query.callNumber || req.body.callNumber;
    }
    if (req.query.claimBatchNumber || req.body?.claimBatchNumber) {
      requestBody.claimBatchNumber = parseInt(req.query.claimBatchNumber || req.body.claimBatchNumber);
    }
    if (req.query.claimSequenceNumber || req.body?.claimSequenceNumber) {
      requestBody.claimSequenceNumber = parseInt(req.query.claimSequenceNumber || req.body.claimSequenceNumber);
    }

    console.log("=== CLAIMS API REQUEST ===");
    console.log("API URL:", apiUrl);
    console.log("Environment:", environment);
    console.log("Region:", region);
    console.log("UserID:", userId);
    console.log("Password:", maskPassword(password));
    console.log("Request Body:", JSON.stringify({
      ...requestBody,
      authentication: {
        userId: requestBody.authentication.userId,
        password: maskPassword(requestBody.authentication.password)
      }
    }, null, 2));

    // Make the API request
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    console.log("Response Status:", response.status, response.statusText);

    // Get response body
    const responseText = await response.text();
    console.log("Response Body:", responseText.substring(0, 500));

    // Try to parse as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      // Not JSON, return as text
      res.status(response.status).json({
        status: response.ok ? "success" : "error",
        httpStatus: response.status,
        rawResponse: responseText,
        message: response.ok ? "Response received (not JSON)" : "API request failed"
      });
      return;
    }

    // Check for errors in response
    if (!response.ok) {
      res.status(response.status).json({
        status: "error",
        httpStatus: response.status,
        error: responseData,
        attemptedCredentials: {
          userId: userId,
          password: maskPassword(password)
        },
        apiUrl: apiUrl
      });
      return;
    }

    // Check for application-level errors
    if (responseData.responseCode === "ER" || responseData.messages) {
      res.status(400).json({
        status: "error",
        responseCode: responseData.responseCode,
        messages: responseData.messages,
        transactionId: responseData.transactionId,
        attemptedCredentials: {
          userId: userId,
          password: maskPassword(password)
        }
      });
      return;
    }

    // Success!
    res.json({
      status: "success",
      responseCode: responseData.responseCode,
      transactionId: responseData.transactionId,
      claims: responseData.claims,
      metadata: {
        environment: environment,
        region: region,
        apiUrl: apiUrl,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Exception in getClaimData:", error);
    res.status(500).json({
      status: "error",
      error: "Internal server error",
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Simple test endpoint for Claims API - uses default credentials
 */
exports.testClaimsConnection = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const userId = req.query.userId || "met11106";
    const password = req.query.password || "B314@ezp!!";
    const environment = "development"; // Always use dev for testing
    const region = "northAmerica";
    const apiUrl = CLAIMS_URLS.development.northAmerica;

    console.log("=== TESTING CLAIMS API CONNECTION ===");
    console.log("API URL:", apiUrl);
    console.log("UserID:", userId);
    console.log("Password:", maskPassword(password));

    const requestBody = {
      authentication: {
        userId: userId,
        password: password
      }
    };

    console.log("Sending request...");

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    console.log("Response Status:", response.status, response.statusText);

    const responseText = await response.text();
    console.log("Response:", responseText.substring(0, 500));

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      res.status(response.status).json({
        success: false,
        httpStatus: response.status,
        message: "Server returned non-JSON response",
        rawResponse: responseText
      });
      return;
    }

    if (!response.ok) {
      res.status(response.status).json({
        success: false,
        httpStatus: response.status,
        error: responseData,
        attemptedCredentials: {
          userId: userId,
          password: maskPassword(password)
        }
      });
      return;
    }

    // Check for application errors
    if (responseData.responseCode === "ER" || responseData.messages) {
      res.status(400).json({
        success: false,
        responseCode: responseData.responseCode,
        messages: responseData.messages,
        transactionId: responseData.transactionId,
        attemptedCredentials: {
          userId: userId,
          password: maskPassword(password)
        }
      });
      return;
    }

    // Success!
    res.json({
      success: true,
      message: "Successfully connected to ServicePower Claims API!",
      responseCode: responseData.responseCode,
      transactionId: responseData.transactionId,
      claimsCount: responseData.claims ? responseData.claims.length : 0,
      usedCredentials: {
        userId: userId,
        password: maskPassword(password)
      },
      response: responseData
    });

  } catch (error) {
    console.error("Exception in testClaimsConnection:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
