const https = require('https');

const data = JSON.stringify({
  email: "invalid@example.com",
  password: "wrongpassword"
});

const options = {
  hostname: 'api.bemsfarms.com',
  port: 443,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${body}`);
  });
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
