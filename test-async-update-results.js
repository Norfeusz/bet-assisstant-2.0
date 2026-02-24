const https = require('https');

const BACKEND_URL = 'bet-assistant-backend.onrender.com';
const N8N_API_KEY = process.env.N8N_WEBHOOK_KEY;

if (!N8N_API_KEY) {
    console.error('❌ ERROR: N8N_WEBHOOK_KEY not found in environment');
    console.log('   Set it with: $env:N8N_WEBHOOK_KEY="your-key-here" (PowerShell)');
    process.exit(1);
}

console.log('🧪 Testing async update-results endpoint...\n');

const testData = JSON.stringify({
    daysBack: 1,
    async: true
});

const options = {
    hostname: BACKEND_URL,
    port: 443,
    path: '/api/webhooks/n8n/update-results',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-n8n-api-key': N8N_API_KEY,
        'Content-Length': testData.length
    }
};

console.log(`📤 POST ${BACKEND_URL}${options.path}`);
console.log(`📦 Body: ${testData}\n`);

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`📊 Status Code: ${res.statusCode}\n`);
        
        try {
            const response = JSON.parse(data);
            console.log('📥 Response:');
            console.log(JSON.stringify(response, null, 2));
            
            if (response.success && response.async) {
                console.log('\n✅ SUCCESS: Async job created!');
                console.log(`   Job ID: ${response.jobId}`);
                console.log(`   Type: ${response.job?.type}`);
                console.log(`   Leagues: ${response.job?.leagues}`);
                console.log(`   Date Range: ${JSON.stringify(response.job?.dateRange)}`);
                console.log(`   Check Status: ${response.checkStatusUrl}`);
                
                console.log('\n📌 Next steps:');
                console.log('   1. Check Render logs for: "🔄 Processing job #' + response.jobId + '"');
                console.log('   2. Run: node check-job-status.js');
                console.log('   3. Wait ~30-60s for worker to complete the job');
            } else if (response.success && !response.async) {
                console.log('\n⚠️  WARNING: Job created but async=false (sync mode)');
                console.log('   This should not happen with async: true in request');
            } else {
                console.log('\n❌ FAILED: Response indicates error');
            }
        } catch (error) {
            console.error('❌ Error parsing response:', error.message);
            console.log('Raw response:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
});

req.write(testData);
req.end();
