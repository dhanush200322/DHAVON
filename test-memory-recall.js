const http = require('http');
const { io } = require('./apps/web/node_modules/socket.io-client');

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 4000,
        path: path,
        method: 'GET',
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(responseBody) }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('--- STEP 1: Querying Supabase pgvector semantic search via GET /memory ---');
  const searchRes = await get('/memory?search=' + encodeURIComponent('What is my main project?'));
  console.log('HTTP Status:', searchRes.status);
  console.log('Retrieved Memories from Supabase:', JSON.stringify(searchRes.body, null, 2));

  console.log('\n--- STEP 2: Asking DHAVON in a fresh session via WebSocket ---');
  const socket = io('http://localhost:4000', { transports: ['websocket'] });

  let answer = '';
  socket.on('connect', () => {
    console.log('Connected with socket ID:', socket.id);
    socket.emit('dhavon.message.send', {
      conversationId: 'fresh-memory-test-' + Date.now(),
      content: 'What is my main project?',
      mode: 'ask',
    });
  });

  socket.on('dhavon.message.chunk', (data) => {
    process.stdout.write(data.delta || '');
    answer += data.delta || '';
  });

  socket.on('dhavon.message.complete', (data) => {
    console.log('\n\n--- AI RESPONSE RECEIVED ---');
    console.log('Final Answer:', data.content);
    socket.disconnect();
    process.exit(0);
  });

  setTimeout(() => {
    console.log('\nTimeout reached. Accumulated:', answer);
    socket.disconnect();
    process.exit(0);
  }, 20000);
}

run().catch(console.error);
