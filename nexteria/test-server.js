// Simple server test script
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/stats',
  method: 'GET'
};

console.log('Testing Nexteria server...');
console.log('Make sure server is running with: node server.js');
console.log('');

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Headers:', res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    console.log('');
    console.log('✅ Server is running correctly!');
    console.log('You can now access the application at: http://localhost:3000');
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.log('');
  console.log('Please ensure:');
  console.log('1. Server is running (node server.js)');
  console.log('2. Port 3000 is available');
  console.log('3. No firewall blocking the connection');
});

req.end();