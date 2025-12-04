const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const xml2js = require("xml2js");

admin.initializeApp();

// FIXED: Switched to the DEVELOPMENT (STAGING) API URL for safe testing.
const SOAP_URL = "https://fssstag.servicepower.com/sms/services/SPDService";

const parseXml = (xml) => {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

// Helper function to mask password for logging (shows first 2 and last 2 chars)
const maskPassword = (password) => {
  if (!password || password.length <= 4) return '****';
  return password.substring(0, 2) + '****' + password.substring(password.length - 2);
};

// Helper function to extract error information from SOAP response
const extractSoapError = (jsonResponse, credentials = null) => {
  const soapBody = jsonResponse['soapenv:Envelope']?.['soapenv:Body'];

  // Check for SOAP fault
  if (soapBody?.['soapenv:Fault']) {
    const fault = soapBody['soapenv:Fault'];
    return {
      isFault: true,
      statusCode: 500,
      error: {
        type: "SOAP Fault",
        faultcode: fault.faultcode,
        faultstring: fault.faultstring,
        detail: fault.detail
      }
    };
  }

  // Check for application-level errors in response body
  // ServicePower uses different response element names (note the typo "Responce")
  const callInfoResponse = soapBody?.['getCallInfoResponce'] ||
                          soapBody?.['getCallInfoSearchResponse'] ||
                          soapBody?.['getCallInfoResponse'];

  if (callInfoResponse?.ErrorInfo) {
    const errorInfo = callInfoResponse.ErrorInfo;
    const errorCode = errorInfo.Code;
    const errorDescription = errorInfo.Description;
    const errorCause = errorInfo.Cause;

    // Determine appropriate HTTP status code based on error type
    let statusCode = 500;
    let hint = undefined;
    let attemptedCredentials = undefined;

    if (errorCode === 'SP005' || errorDescription?.includes('Password')) {
      statusCode = 401; // Unauthorized for authentication errors
      hint = "Please verify your ServicePower credentials are correct in Firebase config.";

      // Include attempted credentials for debugging
      if (credentials) {
        attemptedCredentials = {
          UserID: credentials.userId || '(not set)',
          Password: maskPassword(credentials.password),
          SvcrAcct: credentials.svcrAcct || '(not set)'
        };
      }
    } else if (errorCode === 'SP001' || errorDescription?.includes('not found')) {
      statusCode = 404; // Not found
    } else if (errorCode === 'SP002' || errorDescription?.includes('Invalid')) {
      statusCode = 400; // Bad request for validation errors
    }

    return {
      isFault: false,
      statusCode,
      error: {
        type: "ServicePower API Error",
        code: errorCode,
        description: errorDescription,
        cause: errorCause,
        hint,
        attemptedCredentials
      }
    };
  }

  return null; // No error found
};

// Helper function to format dates as YYYY-MM-DD
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

exports.getServicePowerData = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    // Get credentials from environment variables (Firebase Functions config)
    // Set these using: firebase functions:config:set servicepower.userid="your_user_id"
    const config = functions.config();
    const userId = config.servicepower?.userid || process.env.SP_USER_ID;
    const password = config.servicepower?.password || process.env.SP_PASSWORD;
    const svcrAcct = config.servicepower?.svcracct || process.env.SP_SVCRACCT || userId;

    if (!userId || !password) {
      console.error("Missing credentials. Please set Firebase config or environment variables.");
      res.status(500).json({
        error: "Server configuration error: Missing ServicePower credentials",
        hint: "Run: firebase functions:config:set servicepower.userid=XXX servicepower.password=XXX"
      });
      return;
    }

    // Get date range from query parameters or use defaults
    const today = new Date();
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(today.getDate() - 10);

    const fromDate = req.query.fromDate || formatDate(tenDaysAgo);
    const toDate = req.query.toDate || formatDate(today);
    const callNo = req.query.callNo || '';
    const versionNo = req.query.versionNo || '';

    console.log(`Fetching ServicePower data from ${fromDate} to ${toDate}`);

    // Credentials wrapped in CDATA to handle special characters safely
    const soapBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:SPDServicerService">
         <soapenv:Header/>
         <soapenv:Body>
            <urn:getCallInfoSearch>
               <UserInfo>
                  <UserID><![CDATA[${userId}]]></UserID>
                  <Password><![CDATA[${password}]]></Password>
                  <SvcrAcct><![CDATA[${svcrAcct}]]></SvcrAcct>
               </UserInfo>
               <FromDateTime>${fromDate}</FromDateTime>
               <ToDateTime>${toDate}</ToDateTime>
               <Callno>${callNo}</Callno>
               <Versionno>${versionNo}</Versionno>
            </urn:getCallInfoSearch>
         </soapenv:Body>
      </soapenv:Envelope>
    `;

    const response = await fetch(SOAP_URL, {
      method: "POST",
      body: soapBody,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        // FIXED: Added proper SOAPAction header (was empty before, causing failures)
        "SOAPAction": "urn:SPDServicerService#getCallInfoSearch"
      },
    });

    if (!response.ok) {
      console.error(`ServicePower API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error("Error response:", errorText);
      res.status(response.status).json({
        error: `ServicePower API returned ${response.status}`,
        details: errorText
      });
      return;
    }

    const textResponse = await response.text();

    // Log the raw response for debugging in Firebase console
    console.log("Raw ServicePower Response:", textResponse.substring(0, 500) + "...");

    const jsonResponse = await parseXml(textResponse);

    // Check for errors in SOAP response (both SOAP faults and application-level errors)
    const errorResult = extractSoapError(jsonResponse, { userId, password, svcrAcct });
    if (errorResult) {
      console.error(`${errorResult.error.type}:`, errorResult.error);
      res.status(errorResult.statusCode).json(errorResult.error);
      return;
    }

    res.json({
      status: "success",
      data: jsonResponse,
      metadata: {
        fromDate,
        toDate,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error connecting to ServicePower:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});