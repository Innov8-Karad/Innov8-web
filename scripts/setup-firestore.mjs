// Script to create Firestore database + enable Email Auth via REST API
// Uses the Firebase CLI's stored credentials

import { execSync } from 'child_process';
import https from 'https';

const PROJECT_ID = 'innov8-cde79';

function makeRequest(options, body = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    // Get access token from Firebase CLI
    console.log("🔑 Getting access token from Firebase CLI...");
    let accessToken;
    try {
        // firebase login:ci or we can use the stored token
        const tokenOutput = execSync('npx firebase-tools login:ci --no-localhost 2>&1', { encoding: 'utf-8', timeout: 5000 });
        console.log(tokenOutput);
    } catch (err) {
        // Try alternative: read from firebase config
    }

    // Alternative: Use the firebase CLI to get token
    try {
        const result = execSync('firebase auth:export /dev/null --project innov8-cde79 2>&1', { encoding: 'utf-8', timeout: 10000 });
        console.log("Firebase CLI is authenticated.");
    } catch (err) {
        console.log("Note: Firebase CLI auth check result:", err.message?.substring(0, 100));
    }

    console.log("\n⚠️  Unfortunately, creating a Firestore database via REST API requires");
    console.log("   a Google Cloud OAuth access token, which the Firebase CLI stores internally.");
    console.log("\n📋 The FASTEST way to create it is:");
    console.log("   1. Open: https://console.firebase.google.com/project/innov8-cde79/firestore");
    console.log("   2. Click 'Create database'");
    console.log("   3. Select 'Start in test mode'");
    console.log("   4. Choose 'asia-south1'");
    console.log("   5. Click 'Done'");
    console.log("\n   OR install Google Cloud SDK:");
    console.log("   https://cloud.google.com/sdk/docs/install");
    console.log("   Then run: gcloud firestore databases create --location=asia-south1");
}

main();
