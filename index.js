const http = require('http');
const url = require('url');

// Simple local development server for testing Firebase Functions
const PORT = process.env.PORT || 3000;

// Import the Firebase function (requires firebase-admin to be initialized)
// Note: For full testing, use Firebase emulators instead
const functionHandler = require('./functions/index');

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // Route requests to the Firebase function
  if (parsedUrl.pathname === '/getServicePowerData' || parsedUrl.pathname === '/') {
    console.log(`${req.method} ${req.url}`);

    // Create a mock request/response compatible with Firebase Functions
    const mockReq = {
      method: req.method,
      query: parsedUrl.query,
      headers: req.headers,
      url: req.url
    };

    const mockRes = {
      status: (code) => {
        res.statusCode = code;
        return mockRes;
      },
      json: (data) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data, null, 2));
      },
      send: (data) => {
        res.end(data);
      },
      set: (header, value) => {
        res.setHeader(header, value);
      }
    };

    try {
      await functionHandler.getServicePowerData(mockReq, mockRes);
    } catch (error) {
      console.error('Error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: error.message }));
    }
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`🚀 ServicePower local server running on http://localhost:${PORT}`);
  console.log(`📡 Test endpoint: http://localhost:${PORT}/getServicePowerData`);
  console.log(`\nExample: http://localhost:${PORT}/getServicePowerData?fromDate=2025-11-01&toDate=2025-11-30`);
  console.log(`\n⚠️  Make sure to set environment variables in functions/.env`);
});
