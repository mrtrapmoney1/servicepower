# ServicePower Firebase Integration

Firebase Cloud Function to fetch call information from ServicePower's SOAP API.

## 🔧 What Was Fixed

### Critical Issues Resolved (Per ServicePower API Documentation):

1. **❌ WRONG DATE FORMAT → ✅ Fixed**
   - **Previous:** Used `YYYY-MM-DD` format (e.g., "2025-11-25")
   - **Current:** Uses `CCYYMMDD` format (e.g., "20251125")
   - **Impact:** This was likely causing API rejections or data retrieval failures
   - **Spec:** ServicePower API requires CCYYMMDD format per documentation

2. **❌ Empty SOAPAction Header → ✅ Fixed**
   - The SOAP API requires `SOAPAction: "urn:SPDServicerService#getCallInfoSearch"`
   - This was causing API request routing failures

3. **❌ Hardcoded Credentials → ✅ Fixed**
   - Moved credentials to Firebase config/environment variables
   - Previous hardcoded credentials have been removed from code
   - **Note:** Use web service credentials, NOT website login credentials

4. **❌ Missing Manufacturer ID Support → ✅ Fixed**
   - Added optional `manufacturerName` / `MfgId` parameter
   - Can be set via config or passed as query parameter
   - Required for some ServicePower operations

5. **❌ No Response Code Validation → ✅ Fixed**
   - Now checks for ServicePower `responseCode` field
   - Validates "OK" (success) vs "ER" (error) per API spec
   - Parses `messages` and `errorData` fields for detailed errors

6. **❌ Missing CORS Headers → ✅ Fixed**
   - Added CORS support for frontend access

7. **❌ Poor Error Handling → ✅ Fixed**
   - Added HTTP status code checking
   - Added SOAP fault detection
   - Added ServicePower-specific error response handling

## 🚀 Setup Instructions

### 1. Install Dependencies
```bash
cd functions
npm install
```

### 2. Configure Credentials

**For Firebase Deployment:**
```bash
firebase functions:config:set servicepower.userid="your_user_id"
firebase functions:config:set servicepower.password="your_password"
firebase functions:config:set servicepower.svcracct="your_servicer_account"
firebase functions:config:set servicepower.mfgid="your_manufacturer_id"  # Optional
```

**Note:** Use web service-specific credentials (not website login credentials)

**For Local Development (optional):**
```bash
cd functions
cp .env.example .env
# Edit .env and add your credentials
```

### 3. Deploy to Firebase
```bash
firebase deploy --only functions
```

## 📡 API Usage

### Endpoint
```
https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/getServicePowerData
```

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `fromDate` | string | No | 10 days ago | Start date (CCYYMMDD format: 20251204) |
| `toDate` | string | No | Today | End date (CCYYMMDD format: 20251204) |
| `callNo` | string | No | Empty | Specific call number to search |
| `versionNo` | string | No | Empty | Version number to search |
| `manufacturerName` | string | No | Config value | Manufacturer name/ID (optional) |

**Date Format:** ServicePower uses CCYYMMDD format (e.g., December 4, 2025 = "20251204")

### Example Requests

**Get last 10 days of data (default):**
```bash
curl https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/getServicePowerData
```

**Get data for specific date range:**
```bash
curl "https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/getServicePowerData?fromDate=20251101&toDate=20251130"
```

**Search for specific call number:**
```bash
curl "https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/getServicePowerData?callNo=12345"
```

### Response Format

**Success Response:**
```json
{
  "status": "success",
  "data": {
    // ServicePower SOAP response converted to JSON
  },
  "metadata": {
    "fromDate": "2025-11-25",
    "toDate": "2025-12-04",
    "timestamp": "2025-12-04T10:30:00.000Z"
  }
}
```

**Error Response:**
```json
{
  "error": "Error description",
  "message": "Detailed error message",
  "details": "Additional error details"
}
```

## 🔒 Security Notes

1. **Never commit credentials** - The `.gitignore` file now protects `.env` files
2. **Rotate exposed credentials** - The previously hardcoded credentials should be rotated
3. **Use Firebase Secrets Manager** - For production, consider using Firebase Secrets Manager
4. **CORS Configuration** - Currently allows all origins (`*`), restrict in production

## 🧪 Testing

### Local Testing (Firebase Emulator)
```bash
firebase emulators:start --only functions
```

Then test locally at:
```
http://localhost:5001/YOUR-PROJECT/us-central1/getServicePowerData
```

### View Logs
```bash
firebase functions:log
```

## 📝 Environment

- **Node.js**: 22
- **API Endpoint**: ServicePower Staging (fssstag.servicepower.com)
- **SOAP Action**: getCallInfoSearch
- **API Type**: SPD (Service Dispatch) SOAP API

## 🔑 Authentication & Identity

Based on ServicePower API documentation:

**You do NOT need a separate "client_id"** ✅

Your identity is established through:
1. **Authentication**: `userId` + `password` (web service credentials)
2. **Account Identification**:
   - `serviceCenterNumber` / `SvcrAcct` - Your servicer account (acts as client identifier)
   - `manufacturerName` / `MfgId` - Your manufacturer/network identifier (optional)

**Credential Types:**
- **Manufacturer clients**: Must use web service-specific credentials (different from website login)
- **Service centers**: Can use website credentials for API access

**What ServicePower Provides:**
- `userId` - Web service user ID
- `password` - Web service password
- `serviceCenterNumber` - Your account number (KPI account)
- `manufacturerName` - Your manufacturer ID (if applicable)

## 🐛 Troubleshooting

### "Missing ServicePower credentials" Error
- Run the Firebase config commands to set credentials
- Verify with: `firebase functions:config:get`

### SOAP Fault Errors
- Check that credentials are correct
- Verify the date format is YYYY-MM-DD
- Check Firebase logs for detailed SOAP fault messages

### CORS Errors
- The function now includes CORS headers
- If issues persist, check your frontend's request method

### Network Timeouts
- Firebase Functions have a 60-second timeout by default
- For longer operations, increase timeout in `firebase.json`

## 📞 Support

For issues or questions, check the Firebase Functions logs:
```bash
firebase functions:log --only getServicePowerData
```
