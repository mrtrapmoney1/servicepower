# ServicePower Claims API - Quick Start Guide

## 🎯 What You Have Now

You now have **BOTH** ServicePower APIs implemented:

### 1. **SOAP API** (Original)
- For fetching call information
- Uses XML SOAP messages
- Endpoint: `getServicePowerData` and `testSoapConnection`

### 2. **JSON REST API** (NEW - For Claims Retrieval) ⭐
- For retrieving claims
- Uses JSON requests/responses
- **This is what the documentation you provided is for!**
- Endpoint: `getClaimData` and `testClaimsConnection`

## 🚀 Quick Test - Claims API

### Test Locally (Fastest Way!)

```bash
node test-claims.js
```

This will test the Claims API with your default credentials:
- UserID: `met11106`
- Password: `B314@ezp!!`

### Test with Different Credentials

```bash
node test-claims.js YOUR_USER_ID YOUR_PASSWORD
```

## 📁 File Structure

```
servicepower/
├── functions/
│   ├── index.js           # Main exports (all Firebase Functions)
│   ├── soapApi.js         # SOAP API implementation
│   └── claimsApi.js       # JSON REST API implementation (NEW!)
├── test-claims.js         # Local test script (NEW!)
└── CLAIMS_API_GUIDE.md    # This file
```

## 🔍 Understanding the APIs

### Claims API (JSON REST) - WHAT YOU ASKED ABOUT

**Authentication:**
```json
{
  "authentication": {
    "userId": "met11106",
    "password": "B314@ezp!!"
  }
}
```

**NOTE:** The Claims API does **NOT** use `svcrAcct` - only `userId` and `password`!

**Development URL:**
- North America: `https://upgdev.servicepower.com:8443/services/claim/v1/retrieval`
- Europe: `https://claimsqa-eu.servicepower.com/services/claim/v1/retrieval`

**Production URL:**
- North America: `https://claimworks.servicepower.com:8443/services/claim/v1/retrieval`
- Europe: `https://claims-eu.servicepower.com/services/claim/v1/retrieval`

### SOAP API (Original)

**Authentication:**
```xml
<UserInfo>
  <UserID>met11106</UserID>
  <Password>B314@ezp!!</Password>
  <SvcrAcct>met11106</SvcrAcct>
</UserInfo>
```

**NOTE:** The SOAP API **DOES** use `svcrAcct` in addition to userId and password.

## 🔧 Deploy to Firebase

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:getClaimData
firebase deploy --only functions:testClaimsConnection
```

## 📡 Firebase Endpoints (After Deployment)

### Claims API Endpoints

**Test Connection:**
```
GET https://YOUR-PROJECT.cloudfunctions.net/testClaimsConnection
```

**Retrieve Claims:**
```
GET https://YOUR-PROJECT.cloudfunctions.net/getClaimData
POST https://YOUR-PROJECT.cloudfunctions.net/getClaimData
```

### SOAP API Endpoints

**Test Connection:**
```
GET https://YOUR-PROJECT.cloudfunctions.net/testSoapConnection
```

**Get Call Data:**
```
GET https://YOUR-PROJECT.cloudfunctions.net/getServicePowerData
```

## 📝 Using the Claims API

### Example 1: Simple Test (No Search Parameters)

**GET Request:**
```bash
curl "https://YOUR-PROJECT.cloudfunctions.net/testClaimsConnection"
```

**POST Request:**
```bash
curl -X POST https://YOUR-PROJECT.cloudfunctions.net/testClaimsConnection \
  -H "Content-Type: application/json"
```

### Example 2: Search by Claim Number

**Query Parameters:**
```bash
curl "https://YOUR-PROJECT.cloudfunctions.net/getClaimData?claimNumber=12345"
```

**POST Body:**
```bash
curl -X POST https://YOUR-PROJECT.cloudfunctions.net/getClaimData \
  -H "Content-Type: application/json" \
  -d '{
    "claimNumber": "12345"
  }'
```

### Example 3: Search by Claim Identifier

```bash
curl "https://YOUR-PROJECT.cloudfunctions.net/getClaimData?claimIdentifier=ABC123"
```

### Example 4: Search by Batch and Sequence Number

```bash
curl "https://YOUR-PROJECT.cloudfunctions.net/getClaimData?claimBatchNumber=123456&claimSequenceNumber=1"
```

### Example 5: Use Production Environment

```bash
curl "https://YOUR-PROJECT.cloudfunctions.net/getClaimData?environment=production&claimNumber=12345"
```

### Example 6: Use Europe Region

```bash
curl "https://YOUR-PROJECT.cloudfunctions.net/getClaimData?region=europe&claimNumber=12345"
```

## 🔑 Authentication

### Default Credentials

The functions use these credentials by default:
- **UserID**: `met11106`
- **Password**: `B314@ezp!!`

### Override Credentials

**Option 1: Query Parameters**
```bash
curl "https://YOUR-PROJECT.cloudfunctions.net/getClaimData?userId=YOUR_ID&password=YOUR_PASS&claimNumber=12345"
```

**Option 2: POST Body**
```bash
curl -X POST https://YOUR-PROJECT.cloudfunctions.net/getClaimData \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_ID",
    "password": "YOUR_PASS",
    "claimNumber": "12345"
  }'
```

**Option 3: Firebase Config (Recommended for Production)**
```bash
firebase functions:config:set servicepower.userid="YOUR_ID"
firebase functions:config:set servicepower.password="YOUR_PASS"
```

## 📊 Query Parameters Reference

### Claims API Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | No | User ID for authentication (default: met11106) |
| `password` | string | No | Password for authentication |
| `environment` | string | No | 'development' or 'production' (default: development) |
| `region` | string | No | 'northAmerica' or 'europe' (default: northAmerica) |
| `manufacturerName` | string | No | Manufacturer name to search |
| `serviceCenterNumber` | string | No | Service center number (required for servicer users) |
| `claimIdentifier` | string | No | Manufacturer unique ID for claim |
| `claimNumber` | string | No | Claim number assigned by ServiceClaims |
| `callNumber` | string | No | Call number |
| `claimBatchNumber` | number | No | Claim batch number |
| `claimSequenceNumber` | number | No | Claim sequence number (required if batchNumber used) |

**NOTE:** Only one of these can be passed:
- `claimIdentifier` OR
- `claimNumber` OR
- `callNumber` OR
- `claimBatchNumber` + `claimSequenceNumber` (both required together)

## ✅ Success Response

```json
{
  "status": "success",
  "responseCode": "OK",
  "transactionId": "abc123xyz",
  "claims": [
    {
      "claimNumber": "12345",
      "claimIdentifier": "ABC123",
      "claimStatusCode": "A",
      "claimStatusDescription": "Approved",
      "brandName": "BrandX",
      "paymentAmount": 150.00,
      "paymentDate": 20251201
    }
  ],
  "metadata": {
    "environment": "development",
    "region": "northAmerica",
    "timestamp": "2025-12-04T10:30:00.000Z"
  }
}
```

## ❌ Error Responses

### Authentication Error

```json
{
  "status": "error",
  "responseCode": "ER",
  "messages": [
    {
      "message": "Invalid user"
    }
  ],
  "transactionId": "abc123xyz",
  "attemptedCredentials": {
    "userId": "met11106",
    "password": "B3****!!"
  }
}
```

### Network Error

```json
{
  "status": "error",
  "error": "Internal server error",
  "message": "request to https://... failed, reason: ENOTFOUND"
}
```

## 🐛 Troubleshooting

### "Cannot reach the API server" (ENOTFOUND, ECONNREFUSED)

This means DNS lookup or connection failed. Check:
1. **Internet connectivity** - Can you reach the internet?
2. **VPN** - ServicePower servers may require VPN access
3. **Firewall** - Check if your firewall is blocking outbound connections
4. **Correct URL** - Development vs Production

### "Invalid user" or Authentication Errors

1. **Verify credentials** - Are they correct for this environment?
   - Development credentials: `met11106` / `B314@ezp!!`
   - Production credentials: (may be different!)

2. **Check environment** - Are you using staging credentials on staging URL?
   - Current default: `development` (upgdev.servicepower.com)

3. **User type** - Are you a manufacturer or service center?
   - Service centers: Need `serviceCenterNumber`
   - Manufacturers: Don't need it

### No Claims Found

This is actually SUCCESS! It means:
- ✅ Authentication worked
- ✅ API connection worked
- ℹ️ Just no claims match your search criteria

Try:
- Searching without parameters (retrieve all claims)
- Different search criteria
- Different date ranges (if the API supports it)

## 🔒 Security Notes

1. **Credentials in Code** - Currently hardcoded for testing
   - ⚠️ For production, use Firebase Secrets Manager
   - Or pass credentials securely through environment variables

2. **CORS** - Currently allows all origins (`*`)
   - For production, restrict to your domain

3. **HTTPS Only** - All APIs require HTTPS

## 📞 Need Help?

### Check Logs

**Local Testing:**
```bash
# Logs appear in the terminal where you ran test-claims.js
```

**Firebase Functions:**
```bash
# All logs
firebase functions:log

# Specific function logs
firebase functions:log --only getClaimData
firebase functions:log --only testClaimsConnection
```

### Test Steps

1. **Test locally first:**
   ```bash
   node test-claims.js
   ```

2. **Deploy to Firebase:**
   ```bash
   firebase deploy --only functions
   ```

3. **Test the deployed function:**
   ```bash
   curl https://YOUR-PROJECT.cloudfunctions.net/testClaimsConnection
   ```

## 🎯 What's Next?

1. **Test the connection** - Run `node test-claims.js`
2. **Verify credentials** - Make sure they work
3. **Deploy to Firebase** - When ready for cloud deployment
4. **Integrate with your app** - Use the Firebase Function URLs
