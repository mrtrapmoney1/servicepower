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

exports.getServicePowerData = functions.https.onRequest(async (req, res) => {
  
  // Credentials wrapped in CDATA to handle special characters safely
  const soapBody = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:SPDServicerService">
       <soapenv:Header/>
       <soapenv:Body>
          <urn:getCallInfoSearch>
             <UserInfo>
                <UserID><![CDATA[met11106]]></UserID>
                <Password><![CDATA[B314@ezp!!]]></Password>
                <SvcrAcct><![CDATA[met11106]]></SvcrAcct>
             </UserInfo>
             <FromDateTime>2025-11-25</FromDateTime>
             <ToDateTime>2025-12-05</ToDateTime>
             <Callno></Callno>
             <Versionno></Versionno>
          </urn:getCallInfoSearch>
       </soapenv:Body>
    </soapenv:Envelope>
  `;

  try {
    const response = await fetch(SOAP_URL, {
      method: "POST",
      body: soapBody,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "" 
      },
    });

    const textResponse = await response.text();
    
    // Log the raw response for debugging in Firebase console
    console.log("Raw ServicePower Response:", textResponse);

    const jsonResponse = await parseXml(textResponse);

    res.json({ status: "success", data: jsonResponse });

  } catch (error) {
    console.error("Error connecting to ServicePower:", error);
    res.status(500).send({ error: error.toString() });
  }
});