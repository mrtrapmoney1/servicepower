# SOAP Error Handling Documentation

## Overview

The ServicePower integration now properly handles errors from SOAP responses. There are two types of errors:

1. **SOAP Faults** - Protocol-level errors (malformed requests, server errors)
2. **Application Errors** - Business logic errors returned in the response body

## Error Response Format

### SOAP Faults

SOAP faults are returned with HTTP 500 and include:

```json
{
  "type": "SOAP Fault",
  "faultcode": "soap:Server",
  "faultstring": "Error description",
  "detail": "Additional details"
}
```

### Application-Level Errors

Application errors (like authentication failures) are returned with appropriate HTTP status codes:

#### SP005 - Authentication Error (HTTP 401)

Example SOAP response:
```xml
<soapenv:Envelope>
  <soapenv:Body>
    <getCallInfoResponce>
      <numberOfCalls xsi:nil="true"/>
      <ErrorInfo>
        <Code>SP005</Code>
        <Description>Password doesn't match</Description>
        <Cause>Password doesn't match</Cause>
      </ErrorInfo>
    </getCallInfoResponce>
  </soapenv:Body>
</soapenv:Envelope>
```

Parsed JSON response:
```json
{
  "type": "ServicePower API Error",
  "code": "SP005",
  "description": "Password doesn't match",
  "cause": "Password doesn't match",
  "hint": "Please verify your ServicePower credentials are correct in Firebase config."
}
```

## Supported Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| SP001 | 404 | Resource not found |
| SP002 | 400 | Invalid request/validation error |
| SP005 | 401 | Authentication failure (password mismatch) |
| Others | 500 | General server error |

## Implementation Details

The `extractSoapError()` helper function:
1. Checks for SOAP faults in the envelope
2. Checks for ErrorInfo in response body
3. Maps error codes to appropriate HTTP status codes
4. Provides helpful hints for common errors (e.g., credential configuration)

## Testing

To test error handling, you can simulate an authentication error by using incorrect credentials:

```bash
firebase functions:config:set servicepower.password="wrong_password"
```

Then make a request to the function - it will return a 401 error with details about the authentication failure.
