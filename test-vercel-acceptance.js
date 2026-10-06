const https = require('https');
const { io } = require('./apps/web/node_modules/socket.io-client');

const VERCEL_URL = 'https://dhavon.vercel.app';
const VERCEL_PREVIEW_URL = 'https://dhavon-dhanushavs-projects.vercel.app';
const API_URL = 'https://dhavon-api.onrender.com';
const WS_URL = 'https://dhavon-api.onrender.com'; // Socket.io connects over https URL to establish wss

async function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () =>
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        })
      );
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function testWebSocket(origin) {
  return new Promise((resolve) => {
    const socket = io(WS_URL, {
      transports: ['websocket'],
      extraHeaders: {
        Origin: origin,
      },
      timeout: 10000,
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      resolve({ connected: false, error: 'Connection timeout after 10s' });
    }, 10000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      const id = socket.id;
      socket.disconnect();
      resolve({ connected: true, socketId: id });
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timeout);
      socket.disconnect();
      resolve({ connected: false, error: err.message });
    });
  });
}

async function runAcceptance() {
  console.log('===============================================================');
  console.log('   DHAVON PHASE 11.5 — VERCEL FRONTEND PRODUCTION ACCEPTANCE   ');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(title, condition, extra = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ${title} ${extra ? '(' + extra + ')' : ''}`);
    } else {
      console.error(`[FAIL] ${title} ${extra ? '(' + extra + ')' : ''}`);
    }
  }

  // 1. Vercel Production Homepage
  try {
    const res = await fetchUrl(VERCEL_URL);
    assert('1. Vercel Homepage returns HTTP 200', res.statusCode === 200, `Status: ${res.statusCode}`);
    assert('2. DHAVON Observatory Title present', res.body.includes('DHAVON — Personal AI OS'));
    assert('3. Security headers (X-Content-Type-Options)', res.headers['x-content-type-options'] === 'nosniff');
    assert('4. Security headers (X-Frame-Options)', res.headers['x-frame-options'] === 'DENY');
    assert('5. Permissions Policy present', !!res.headers['permissions-policy']);

    // Check Next.js script chunks
    const chunkMatches = res.body.match(/static\/chunks\/[a-zA-Z0-9\-_.]+\.js/g) || [];
    assert('6. Bundled Next.js JS chunks found', chunkMatches.length > 0, `Found ${chunkMatches.length} chunks`);

    if (chunkMatches.length > 0) {
      const assetUrl = `${VERCEL_URL}/_next/${chunkMatches[0]}`;
      const assetRes = await fetchUrl(assetUrl);
      assert('7. Next.js static asset chunk returns HTTP 200', assetRes.statusCode === 200, `Status: ${assetRes.statusCode}`);
    }
  } catch (err) {
    assert('Vercel Homepage fetch', false, err.message);
  }

  // 2. Vercel Alias Domain
  try {
    const res = await fetchUrl(VERCEL_PREVIEW_URL);
    assert('8. Vercel Alias Domain returns HTTP 200', res.statusCode === 200, `Status: ${res.statusCode}`);
    assert('9. Vercel Alias Domain loads DHAVON Observatory', res.body.includes('DHAVON — Personal AI OS'));
  } catch (err) {
    assert('Vercel Alias Domain fetch', false, err.message);
  }

  // 3. Render API Health
  try {
    const res = await fetchUrl(`${API_URL}/health/live`);
    assert('10. Render API Live Endpoint returns HTTP 200', res.statusCode === 200, `Status: ${res.statusCode}`);
  } catch (err) {
    assert('Render API Live fetch', false, err.message);
  }

  // 4. Render API CORS with Vercel Origin
  try {
    const optionsRes = await fetchUrl(`${API_URL}/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://dhavon.vercel.app',
        'Access-Control-Request-Method': 'GET',
      },
    });
    const allowOrigin = optionsRes.headers['access-control-allow-origin'];
    assert(
      '11. Backend API allows Vercel origin via CORS',
      allowOrigin === 'https://dhavon.vercel.app' || allowOrigin === '*',
      `Allow-Origin: ${allowOrigin}`
    );
  } catch (err) {
    assert('Backend API CORS check', false, err.message);
  }

  // 5. WebSocket Connectivity from Vercel Origin
  try {
    const wsResult = await testWebSocket('https://dhavon.vercel.app');
    assert('12. WebSocket Gateway connects with Vercel Origin', wsResult.connected, wsResult.socketId || wsResult.error);
  } catch (err) {
    assert('WebSocket Gateway check', false, err.message);
  }

  // 6. Auth Protection Verification
  try {
    const authRes = await fetchUrl(`${API_URL}/memory`);
    assert('13. API enforces authentication (HTTP 401 on unauthorized access)', authRes.statusCode === 401, `Status: ${authRes.statusCode}`);
  } catch (err) {
    assert('Auth verification check', false, err.message);
  }

  console.log(`\n===============================================================`);
  console.log(`Results: ${passed} / ${total} tests passed (${((passed / total) * 100).toFixed(1)}%)`);
  console.log(`===============================================================\n`);
  return passed === total;
}

runAcceptance().then((ok) => {
  process.exit(ok ? 0 : 1);
});
