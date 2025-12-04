# ServicePower Firebase Integration

Firebase Cloud Function to fetch call information from ServicePower's SOAP API.

## 🔧 What Was Fixed

### Critical Issues Resolved:
1. **Empty SOAPAction Header** ❌ → ✅ Fixed
   - The SOAP API requires `SOAPAction: "urn:SPDServicerService#getCallInfoSearch"`
   - This was the primary cause of API failures

2. **Hardcoded Credentials** ❌ → ✅ Fixed
   - Moved credentials to Firebase config/environment variables
   - Previous hardcoded credentials have been removed from code

3. **Hardcoded Dates** ❌ → ✅ Fixed
   - Now accepts `fromDate` and `toDate` as query parameters
   - Defaults to last 10 days if not specified

4. **Missing CORS Headers** ❌ → ✅ Fixed
   - Added CORS support for frontend access

5. **Poor Error Handling** ❌ → ✅ Fixed
   - Added HTTP status code checking
   - Added SOAP fault detection
   - Added detailed error messages

## 🚀 Setup Instructions

### 1. Install Dependencies
```bash
cd functions
npm install
```

### 2. Configure Credentials

**For Firebase Deployment:**
```bash
firebase functions:config:set servicepower.userid="met11106"
firebase functions:config:set servicepower.password="B314@ezp!!"
firebase functions:config:set servicepower.svcracct="met11106"
```

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
| `fromDate` | string | No | 10 days ago | Start date (YYYY-MM-DD) |
| `toDate` | string | No | Today | End date (YYYY-MM-DD) |
| `callNo` | string | No | Empty | Specific call number to search |
| `versionNo` | string | No | Empty | Version number to search |

### Example Requests

**Get last 10 days of data (default):**
```bash
curl https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/getServicePowerData
```

**Get data for specific date range:**
```bash
curl "https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/getServicePowerData?fromDate=2025-11-01&toDate=2025-11-30"
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
