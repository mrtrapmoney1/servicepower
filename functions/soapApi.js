const functions = require("firebase-functions");
const fetch = require("node-fetch");
const xml2js = require("xml2js");

// ServicePower SOAP API URLs
const SOAP_URLS = {
  staging: "https://fssstag.servicepower.com/sms/services/SPDService",
  production: "https://fss.servicepower.com/sms/services/SPDService"
};

// Helper to parse XML to JSON
const parseXml = (xml) => {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

// Helper to mask password
const maskPassword = (password) => {
  if (!password || password.length < 4) return "****";
  return password.substring(0, 2) + "****" + password.substring(password.length - 2);
};

// Helper function to format dates as YYYY-MM-DD
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to extract and format error information from SOAP response
const extractSoapError = (jsonResponse, credentials) => {
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
        detail: fault.detail,
        attemptedCredentials: credentials ? {
          UserID: credentials.userId,
          Password: maskPassword(credentials.password),
          SvcrAcct: credentials.svcrAcct
        } : undefined
      }
    };
  }

  // Check for application-level errors in response body
  const callInfoResponse = soapBody?.['getCallInfoResponce'] ||
                          soapBody?.['getCallInfoSearchResponse'] ||
                          soapBody?.['getCallInfoResponse'];

  if (callInfoResponse?.ErrorInfo) {
    const errorInfo = callInfoResponse.ErrorInfo;
    const errorCode = errorInfo.Code;
    const errorDescription = errorInfo.Description;
    const errorCause = errorInfo.Cause;

    let statusCode = 500;
    let hint = undefined;

    if (errorCode === 'SP005' || errorDescription?.includes('Password')) {
      statusCode = 401;
      hint = "Authentication failed. Check that UserID, Password, and SvcrAcct are correct.";
    } else if (errorCode === 'SP001' || errorDescription?.includes('not found')) {
      statusCode = 404;
    } else if (errorCode === 'SP002' || errorDescription?.includes('Invalid')) {
      statusCode = 400;
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
        attemptedCredentials: credentials ? {
          UserID: credentials.userId,
          Password: maskPassword(credentials.password),
          SvcrAcct: credentials.svcrAcct
        } : undefined
      }
    };
  }

  return null;
};

/**
 * SOAP API - Get ServicePower call data
 */
exports.getServicePowerData = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const config = functions.config();
    const userId = req.body?.userId || req.query.userId ||
                   config.servicepower?.userid || process.env.SP_USER_ID || "met11106";
    const password = req.body?.password || req.query.password ||
                     config.servicepower?.password || process.env.SP_PASSWORD || "B314@ezp!!";
    const svcrAcct = req.body?.svcrAcct || req.query.svcrAcct ||
                     config.servicepower?.svcracct || process.env.SP_SVCRACCT || userId;

    const environment = req.query.environment || req.body?.environment || "staging";
    const soapUrl = SOAP_URLS[environment] || SOAP_URLS.staging;

    const today = new Date();
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(today.getDate() - 10);

    const fromDate = req.query.fromDate || formatDate(tenDaysAgo);
    const toDate = req.query.toDate || formatDate(today);
    const callNo = req.query.callNo || '';
    const versionNo = req.query.versionNo || '';

    console.log(`Fetching ServicePower SOAP data from ${fromDate} to ${toDate}`);
    console.log("Using credentials - UserID:", userId, "SvcrAcct:", svcrAcct);
    console.log("SOAP URL:", soapUrl);

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

    const response = await fetch(soapUrl, {
      method: "POST",
      body: soapBody,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "urn:SPDServicerService#getCallInfoSearch"
      },
    });

    if (!response.ok) {
      console.error(`ServicePower API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error("Error response:", errorText);
      res.status(response.status).json({
        error: `ServicePower API returned ${response.status}`,
        details: errorText,
        attemptedCredentials: {
          UserID: userId,
          Password: maskPassword(password),
          SvcrAcct: svcrAcct
        }
      });
      return;
    }

    const textResponse = await response.text();
    console.log("Raw ServicePower Response:", textResponse.substring(0, 500) + "...");

    const jsonResponse = await parseXml(textResponse);

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

/**
 * SOAP API - Test connection
 */
exports.testSoapConnection = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const userId = req.body?.userId || req.query.userId || "met11106";
    const password = req.body?.password || req.query.password || "B314@ezp!!";
    const svcrAcct = req.body?.svcrAcct || req.query.svcrAcct || userId;
    const soapUrl = SOAP_URLS.staging;

    console.log("=== TESTING SOAP CONNECTION ===");
    console.log("UserID:", userId);
    console.log("Password:", maskPassword(password));
    console.log("SvcrAcct:", svcrAcct);
    console.log("SOAP URL:", soapUrl);

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
               <FromDateTime>2024-01-01</FromDateTime>
               <ToDateTime>2024-01-02</ToDateTime>
               <Callno></Callno>
               <Versionno></Versionno>
            </urn:getCallInfoSearch>
         </soapenv:Body>
      </soapenv:Envelope>
    `;

    console.log("Sending SOAP request...");

    const response = await fetch(soapUrl, {
      method: "POST",
      body: soapBody,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "urn:SPDServicerService#getCallInfoSearch"
      },
    });

    console.log("Response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("HTTP Error response:", errorText);
      res.status(response.status).json({
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: errorText,
        attemptedCredentials: {
          UserID: userId,
          Password: maskPassword(password),
          SvcrAcct: svcrAcct
        }
      });
      return;
    }

    const textResponse = await response.text();
    console.log("Raw SOAP Response:", textResponse.substring(0, 500));

    const jsonResponse = await parseXml(textResponse);

    const errorResult = extractSoapError(jsonResponse, { userId, password, svcrAcct });
    if (errorResult) {
      console.error("SOAP Error:", errorResult.error);
      res.status(errorResult.statusCode).json({
        success: false,
        ...errorResult.error
      });
      return;
    }

    console.log("✓ Connection successful!");
    res.json({
      success: true,
      message: "Successfully connected to ServicePower SOAP API!",
      usedCredentials: {
        UserID: userId,
        Password: maskPassword(password),
        SvcrAcct: svcrAcct
      },
      response: jsonResponse
    });

  } catch (error) {
    console.error("Exception occurred:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
