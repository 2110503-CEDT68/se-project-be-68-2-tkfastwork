const { execSync } = require('child_process');
const path = require('path');
const http = require('http');

/**
 * CoWork Space API - Newman Test Runner
 * 
 * This script handles:
 * 1. Seeding necessary test users
 * 2. Running the Postman collection via Newman
 * 3. Reporting results
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const COLLECTION_PATH = path.join(__dirname, 'collections', 'CoWorkSpaceAPI.json');

async function apiRequest(endpoint, method, data) {
    return new Promise((resolve) => {
        const payload = JSON.stringify(data);
        const url = `${BASE_URL}${endpoint}`;
        
        const req = http.request(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': payload.length
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: body }));
        });

        req.on('error', (err) => {
            console.error(`API Request Error (${endpoint}):`, err.message);
            resolve({ status: 500, error: err });
        });

        req.write(payload);
        req.end();
    });
}

async function run() {
    console.log('==========================================');
    console.log('   CoWork Space API Integration Tests     ');
    console.log('==========================================');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Collection: ${path.basename(COLLECTION_PATH)}`);
    console.log('------------------------------------------');

    // 1. Seed Users
    console.log('Step 1: Preparing test data...');
    
    const users = [
        { name: 'Newman User', email: 'user@newman-test.com', password: 'password123', tel: '0811111111', role: 'user' },
        { name: 'Admin User', email: 'admin@newman-test.com', password: 'admin123', tel: '0822222222', role: 'admin' }
    ];

    for (const user of users) {
        process.stdout.write(`  Registering ${user.role}: ${user.email} ... `);
        const res = await apiRequest('/auth/register', 'POST', user);
        if (res.status === 200 || res.status === 201) {
            console.log('OK');
        } else if (res.status === 400) {
            console.log('Already exists');
        } else {
            console.log(`Failed (Status ${res.status})`);
        }
    }

    // 2. Run Newman
    console.log('\nStep 2: Executing Newman tests...');
    try {
        const newmanCmd = `npx newman run "${COLLECTION_PATH}" ` +
            `--env-var "baseUrl=${BASE_URL}" ` +
            `--reporters cli ` +
            `--delay-request 300 ` +
            `--color on`;

        execSync(newmanCmd, { stdio: 'inherit' });
        
        console.log('\n==========================================');
        console.log('          Tests Completed Successfully!    ');
        console.log('==========================================');
    } catch (error) {
        console.error('\n==========================================');
        console.error('          Tests Failed!                   ');
        console.error('==========================================');
        process.exit(1);
    }
}

run();
