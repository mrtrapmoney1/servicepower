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

// Helper function to format dates as CCYYMMDD (ServicePower standard format)
// Example: December 4, 2025 -> "20251204"
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
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
    const mfgId = config.servicepower?.mfgid || process.env.SP_MFG_ID || '';

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

    // Dates can be passed as CCYYMMDD (20251204) or will be formatted automatically
    const fromDate = req.query.fromDate || formatDate(tenDaysAgo);
    const toDate = req.query.toDate || formatDate(today);
    const callNo = req.query.callNo || '';
    const versionNo = req.query.versionNo || '';
    const manufacturerName = req.query.manufacturerName || mfgId;

    console.log(`Fetching ServicePower data from ${fromDate} to ${toDate}`,
                manufacturerName ? `for manufacturer: ${manufacturerName}` : '');

    // Credentials wrapped in CDATA to handle special characters safely
    // Date format: CCYYMMDD (e.g., 20251204) per ServicePower API specification
    const soapBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:SPDServicerService">
         <soapenv:Header/>
         <soapenv:Body>
            <urn:getCallInfoSearch>
               <UserInfo>
                  <UserID><![CDATA[${userId}]]></UserID>
                  <Password><![CDATA[${password}]]></Password>
                  <SvcrAcct><![CDATA[${svcrAcct}]]></SvcrAcct>${manufacturerName ? `
                  <MfgId><![CDATA[${manufacturerName}]]></MfgId>` : ''}
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

    // Check for SOAP faults
    if (jsonResponse['soapenv:Envelope']?.['soapenv:Body']?.['soapenv:Fault']) {
      const fault = jsonResponse['soapenv:Envelope']['soapenv:Body']['soapenv:Fault'];
      console.error("SOAP Fault:", fault);
      res.status(500).json({
        error: "SOAP Fault",
        faultcode: fault.faultcode,
        faultstring: fault.faultstring,
        detail: fault.detail
      });
      return;
    }

    // Extract the response body
    const responseBody = jsonResponse['soapenv:Envelope']?.['soapenv:Body'];
    const callInfoResponse = responseBody?.['ns1:getCallInfoSearchResponse'] || responseBody;

    // Check for ServicePower API error response (responseCode: "ER")
    // Per documentation: OK = success, ER = error
    if (callInfoResponse?.responseCode === 'ER' || callInfoResponse?.ResponseCode === 'ER') {
      const messages = callInfoResponse.messages || callInfoResponse.Messages || [];
      const errorData = callInfoResponse.errorData || callInfoResponse.ErrorData;

      console.error("ServicePower API Error:", {
        responseCode: callInfoResponse.responseCode || callInfoResponse.ResponseCode,
        messages,
        errorData
      });

      res.status(400).json({
        error: "ServicePower API Error",
        responseCode: "ER",
        messages: Array.isArray(messages) ? messages : [messages],
        errorData: errorData ? {
          code: errorData.code,
          description: errorData.description,
          cause: errorData.cause
        } : undefined
      });
      return;
    }

    res.json({
      status: "success",
      data: jsonResponse,
      metadata: {
        fromDate,
        toDate,
        responseCode: callInfoResponse?.responseCode || callInfoResponse?.ResponseCode || 'OK',
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