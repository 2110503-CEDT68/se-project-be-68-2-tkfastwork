const { execSync } = require('child_process');
const path = require('path');
const http = require('http');

const baseUrl = process.env.BASE_URL || 'http://localhost:5000/api/v1';

console.log('--- CoWork Space API Test Runner ---');

async function seedUser(name, email, password, tel, role = 'user') {
  return new Promise((resolve) => {
    const data = JSON.stringify({ name, email, password, tel, role });
    const url = `${baseUrl}/auth/register`;
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve());
    });
    req.on('error', () => resolve());
    req.write(data);
    req.end();
  });
}

async function run() {
  // Seeding
  console.log('Seeding users...');
  await seedUser('Newman User', 'user@newman-test.com', 'password123', '0811111111');
  await seedUser('Admin User', 'admin@newman-test.com', 'admin123', '0822222222', 'admin');

  console.log('Running Newman...');
  try {
    const collectionPath = path.join(__dirname, 'collection.json');
    const newmanCmd = `npx newman run "${collectionPath}" --env-var "baseUrl=${baseUrl}" --reporters cli --delay-request 500`;
    execSync(newmanCmd, { stdio: 'inherit' });
    console.log('\n✓ All tests passed!');
  } catch (e) {
    console.log('\n✗ Tests failed');
    process.exit(1);
  }
}

run();
