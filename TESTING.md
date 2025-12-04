# ServicePower API Testing Guide

## Quick Test with Your Credentials

Your credentials are now **hardcoded as defaults** in the `testConnection` endpoint:

- **UserID**: `met11106`
- **Password**: `B314@ezp!!`
- **SvcrAcct**: `met11106`

## How to Test

### Option 1: Simple GET Request (Uses Default Credentials)

Just call the test endpoint:

```bash
curl https://YOUR-FIREBASE-URL/testConnection
```

Or open in browser:
```
https://YOUR-FIREBASE-URL/testConnection
```

### Option 2: Test with Different Credentials

Pass credentials as query parameters:

```bash
curl "https://YOUR-FIREBASE-URL/testConnection?userId=DIFFERENT_USER&password=DIFFERENT_PASS"
```

Or as POST body:

```bash
curl -X POST https://YOUR-FIREBASE-URL/testConnection \
  -H "Content-Type: application/json" \
  -d '{"userId":"DIFFERENT_USER","password":"DIFFERENT_PASS","svcrAcct":"DIFFERENT_ACCT"}'
```

## What You'll See

### If Authentication Fails (SP005 Error)

```json
{
  "success": false,
  "type": "ServicePower API Error",
  "code": "SP005",
  "description": "Password doesn't match",
  "cause": "Password doesn't match",
  "hint": "Authentication failed. Check that UserID, Password, and SvcrAcct are correct.",
  "attemptedCredentials": {
    "UserID": "met11106",
    "Password": "B3****!!",
    "SvcrAcct": "met11106"
  }
}
```

**This shows you EXACTLY what was sent** - you can verify:
- Is the UserID correct?
- Does the password look right? (first 2 and last 2 characters shown)
- Is the SvcrAcct correct?

### If Authentication Succeeds

```json
{
  "success": true,
  "message": "Successfully connected to ServicePower API!",
  "usedCredentials": {
    "UserID": "met11106",
    "Password": "B3****!!",
    "SvcrAcct": "met11106"
  },
  "response": {
    // Full SOAP response data here
  }
}
```

## Common Issues to Check

If you get SP005 "Password doesn't match", verify:

1. **UserID** - Is `met11106` the correct staging username?
2. **Password** - Is `B314@ezp!!` correct? Check for:
   - Typos
   - Case sensitivity (B vs b, etc.)
   - Special characters (@ and ! are included)
3. **SvcrAcct** - Should this be the same as UserID or different?
4. **Environment** - Are you using staging credentials on the staging URL?
   - Current URL: `https://fssstag.servicepower.com/sms/services/SPDService`

## Deploy and Test

1. Deploy to Firebase:
   ```bash
   firebase deploy --only functions
   ```

2. Get your function URL:
   ```bash
   firebase functions:list
   ```

3. Test the endpoint:
   ```bash
   curl https://YOUR-PROJECT.cloudfunctions.net/testConnection
   ```

## Logs

Check Firebase logs to see detailed request/response info:

```bash
firebase functions:log
```

You'll see:
- `=== TESTING SERVICEPOWER CONNECTION ===`
- `UserID: met11106`
- `Password: B3****!!`
- `SvcrAcct: met11106`
- `Response status: 200 OK`
- Raw SOAP response

This helps you verify exactly what was sent and what was received!
