# Quick Start - Get Claims Now! 🚀

## 🎯 Three Ways to Get Claims

### 1. Get ALL Claims (Simplest)

```bash
node examples/get-all-claims.js
```

This retrieves **all claims** you have access to with your credentials.

**What You'll See:**
```
✅ SUCCESS!
Transaction ID: abc123xyz789
Total Claims Found: 25

--- Claim 1 ---
Claim Number: CLM00012345
Status: Approved
Brand: Samsung
Payment Amount: $250.50
```

---

### 2. Get a Specific Claim by Number

```bash
node examples/get-claim-by-number.js CLM00012345
```

Replace `CLM00012345` with your actual claim number.

---

### 3. Use the Full Test Script

```bash
node test-claims.js
```

This includes detailed error reporting and debugging info.

---

## 📋 Example Claim Response

Check out `examples/example-claim-response.json` to see what a real response looks like:

```json
{
  "status": "success",
  "responseCode": "OK",
  "claims": [
    {
      "claimNumber": "CLM00012345",
      "claimStatusDescription": "Approved",
      "brandName": "Samsung",
      "modelNumber": "RF28R7351SR",
      "paymentAmount": 250.50,
      "servicerName": "ABC Appliance Repair",
      ...
    }
  ]
}
```

### Claim Fields Explained

| Field | Description | Example |
|-------|-------------|---------|
| `claimNumber` | ServiceClaims assigned number | "CLM00012345" |
| `claimIdentifier` | Your manufacturer ID | "MANUF-2024-001" |
| `claimStatusCode` | Status code | "A" (Approved) |
| `claimStatusDescription` | Status in words | "Approved" |
| `brandName` | Product brand | "Samsung" |
| `productName` | Product type | "Refrigerator" |
| `modelNumber` | Model number | "RF28R7351SR" |
| `serialNumber` | Serial number | "SN123456789" |
| `paymentAmount` | Total payment | 250.50 |
| `paymentDate` | Payment date | 20241115 (YYYYMMDD) |
| `paidLaborAmount` | Labor costs paid | 150.00 |
| `paidPartsAmount` | Parts costs paid | 75.50 |
| `servicerName` | Service company | "ABC Appliance Repair" |

---

## 🎨 Using in Your Own Code

### Simple Node.js Example

```javascript
const fetch = require("node-fetch");

async function getClaims() {
  const response = await fetch(
    "https://upgdev.servicepower.com:8443/services/claim/v1/retrieval",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        authentication: {
          userId: "met11106",
          password: "B314@ezp!!"
        }
      })
    }
  );

  const data = await response.json();

  if (data.responseCode === "OK") {
    console.log(`Found ${data.claims.length} claims`);
    return data.claims;
  } else {
    console.error("Error:", data.messages);
    return [];
  }
}

getClaims();
```

---

## 🔍 Search Options

You can search by **ONE** of these:

### By Claim Number
```javascript
{
  authentication: { userId: "...", password: "..." },
  claimNumber: "CLM00012345"
}
```

### By Claim Identifier (Your ID)
```javascript
{
  authentication: { userId: "...", password: "..." },
  claimIdentifier: "MANUF-2024-001"
}
```

### By Call Number
```javascript
{
  authentication: { userId: "...", password: "..." },
  callNumber: "CALL-2024-0001"
}
```

### By Batch + Sequence Number
```javascript
{
  authentication: { userId: "...", password: "..." },
  claimBatchNumber: 123456,
  claimSequenceNumber: 1
}
```

### By Manufacturer Name
```javascript
{
  authentication: { userId: "...", password: "..." },
  manufacturerName: "Samsung"
}
```

---

## 🌍 Different Environments

### Development (Default)
```javascript
const API_URL = "https://upgdev.servicepower.com:8443/services/claim/v1/retrieval";
```

### Production
```javascript
const API_URL = "https://claimworks.servicepower.com:8443/services/claim/v1/retrieval";
```

### Europe Development
```javascript
const API_URL = "https://claimsqa-eu.servicepower.com/services/claim/v1/retrieval";
```

### Europe Production
```javascript
const API_URL = "https://claims-eu.servicepower.com/services/claim/v1/retrieval";
```

---

## 🚀 Deploy to Firebase (For Production Use)

Once you've tested locally and it works:

```bash
# Deploy all functions
firebase deploy --only functions

# Your endpoints will be available at:
# https://YOUR-PROJECT.cloudfunctions.net/getClaimData
# https://YOUR-PROJECT.cloudfunctions.net/testClaimsConnection
```

### Call Your Firebase Function

```bash
# Get all claims
curl https://YOUR-PROJECT.cloudfunctions.net/getClaimData

# Get specific claim
curl "https://YOUR-PROJECT.cloudfunctions.net/getClaimData?claimNumber=CLM00012345"

# Use production environment
curl "https://YOUR-PROJECT.cloudfunctions.net/getClaimData?environment=production&claimNumber=CLM00012345"
```

---

## ❓ Common Questions

### Q: "No claims found" - Is this an error?
**A:** No! This means:
- ✅ Authentication worked
- ✅ Connection succeeded
- ℹ️ Just no claims match your search (or account has no claims)

### Q: Can I search by date range?
**A:** Not with this API endpoint. The Claims Retrieval API searches by claim identifiers, not dates.

### Q: How do I know if my credentials are wrong?
**A:** You'll get an error response:
```json
{
  "responseCode": "ER",
  "messages": [
    { "message": "Invalid user" }
  ]
}
```

### Q: Do I need `svcrAcct`?
**A:** **NO!** The Claims API only needs `userId` and `password`. The `svcrAcct` is only for the SOAP API.

---

## 📚 More Info

- **Full Guide**: See [CLAIMS_API_GUIDE.md](CLAIMS_API_GUIDE.md)
- **All API Docs**: See [README.md](README.md)

---

## 🎯 Start Here

```bash
# Try this first:
node examples/get-all-claims.js
```

If you get a network error, you may need:
- VPN connection
- Proper network/firewall access
- To run from Firebase (deploy and use cloud functions)
