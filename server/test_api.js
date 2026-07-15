const http = require('http');

http.get('http://localhost:5000/api/admin/orders?limit=5', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed.orders, null, 2));
    } catch (e) {
      console.log("Error parsing JSON:", e.message);
      console.log("Raw output:", data);
    }
  });
}).on('error', err => console.error(err.message));
