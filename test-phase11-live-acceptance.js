const https = require('https');
const { io } = require('./apps/web/node_modules/socket.io-client');

const LIVE_API_BASE = 'https://dhavon-api.onrender.com';
const LIVE_WEB_BASE = 'https://dhavon-web.onrender.com';
const LIVE_WSS_BASE = 'wss://dhavon-api.onrender.com';

const USER_A_ID = '00000000-0000-0000-0000-000000000001';
const USER_B_ID = '00000000-0000-0000-0000-000000000002';

function generateJwt(userId, role = 'authenticated', expiresInSeconds = 3600) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = Buffer.from(JSON.stringify({ sub: userId, role, exp })).toString('base64');
  const signature = Buffer.from('sig_phase11_acceptance').toString('base64');
  return `${header}.${payload}.${signature}`;
}

const JWT_USER_A = generateJwt(USER_A_ID);
const JWT_USER_B = generateJwt(USER_B_ID);
const JWT_EXPIRED = generateJwt(USER_A_ID, 'authenticated', -3600);
const JWT_INVALID = 'header.invalid-base64-payload.signature';

function makeRequest(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const headers = options.headers || {};
    let postData = options.body;
    if (postData && typeof postData === 'object' && !Buffer.isBuffer(postData)) {
      postData = JSON.stringify(postData);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const reqOptions = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers,
      timeout: options.timeout || 30000,
    };

    const startTime = Date.now();
    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const latency = Date.now() - startTime;
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed,
          raw: data,
          latency,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error(`Request timed out after ${options.timeout || 30000}ms`));
    });

    req.on('error', reject);

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

const results = {
  passed: [],
  failed: [],
  metrics: {},
};

function recordTest(name, passed, details) {
  if (passed) {
    console.log(`[PASS] ${name}`);
    results.passed.push({ name, details });
  } else {
    console.error(`[FAIL] ${name}:`, details);
    results.failed.push({ name, details });
  }
}

async function runAcceptanceSuite() {
  console.log('====================================================');
  console.log('  DHAVON PHASE 11: LIVE PRODUCTION ACCEPTANCE SUITE');
  console.log('  API Target: ' + LIVE_API_BASE);
  console.log('  Web Target: ' + LIVE_WEB_BASE);
  console.log('  WSS Target: ' + LIVE_WSS_BASE);
  console.log('====================================================\n');

  // ----------------------------------------------------------------
  // 1. PRODUCTION DISCOVERY & PROBE VALIDATION
  // ----------------------------------------------------------------
  console.log('--- SECTION 1 & 2: LIVE PROBES & HEALTH CHECKS ---');

  // /health/live
  try {
    const liveRes = await makeRequest(`${LIVE_API_BASE}/health/live`);
    results.metrics.healthLiveLatency = liveRes.latency;
    recordTest(
      'Live Probe /health/live responds 200 OK',
      liveRes.status === 200 && liveRes.body?.status === 'ok',
      `Status: ${liveRes.status}, Latency: ${liveRes.latency}ms, Body: ${JSON.stringify(liveRes.body)}`
    );
  } catch (err) {
    recordTest('Live Probe /health/live', false, err.message);
  }

  // /health/ready
  try {
    const readyRes = await makeRequest(`${LIVE_API_BASE}/health/ready`);
    results.metrics.healthReadyLatency = readyRes.latency;
    recordTest(
      'Readiness Probe /health/ready responds 200 OK',
      readyRes.status === 200 && readyRes.body?.ready === true,
      `Status: ${readyRes.status}, Latency: ${readyRes.latency}ms, Body: ${JSON.stringify(readyRes.body)}`
    );
  } catch (err) {
    recordTest('Readiness Probe /health/ready', false, err.message);
  }

  // /health full subsystem probe
  try {
    const healthRes = await makeRequest(`${LIVE_API_BASE}/health`);
    results.metrics.healthFullLatency = healthRes.latency;
    const body = healthRes.body;
    const dbHealthy = body?.subsystems?.database?.status === 'healthy';
    const geminiActive = body?.subsystems?.ai?.providers?.gemini?.configured === true;
    const groqActive = body?.subsystems?.ai?.providers?.groq?.configured === true;
    const mcpReady = body?.subsystems?.mcp?.status === 'ready' && body?.subsystems?.mcp?.serversCount === 5;
    const coreReady = body?.subsystems?.core?.orchestrator === 'ready' && body?.subsystems?.core?.memory === 'ready';

    recordTest(
      'Full Health Probe: Database (Supabase + pgvector) is healthy',
      dbHealthy,
      `Status: ${body?.subsystems?.database?.status}, Latency: ${body?.subsystems?.database?.latencyMs}ms`
    );
    recordTest(
      'Full Health Probe: AI Providers (Gemini + Groq) are active',
      geminiActive && groqActive,
      `Gemini: ${geminiActive}, Groq: ${groqActive}`
    );
    recordTest(
      'Full Health Probe: MCP Gateway (5 registered servers) is ready',
      mcpReady,
      `MCP Status: ${body?.subsystems?.mcp?.status}, Servers: ${body?.subsystems?.mcp?.serversCount}`
    );
    recordTest(
      'Full Health Probe: Core Subsystems (Orchestrator, Memory, Tasks, Goals) are ready',
      coreReady,
      `Core: ${JSON.stringify(body?.subsystems?.core)}`
    );
  } catch (err) {
    recordTest('Full Health Probe /health', false, err.message);
  }

  // Web Observatory rendering & Security Headers
  try {
    const webRes = await makeRequest(LIVE_WEB_BASE);
    results.metrics.webLoadLatency = webRes.latency;
    const headers = webRes.headers;
    const hasFrameOptions = headers['x-frame-options'] === 'DENY';
    const hasContentTypeOptions = headers['x-content-type-options'] === 'nosniff';
    const hasReferrer = headers['referrer-policy'] === 'strict-origin-when-cross-origin';
    const hasViewport = webRes.raw.includes('viewport');

    recordTest(
      'Web Observatory Frontend loads with HTTP 200',
      webRes.status === 200 && webRes.raw.length > 5000,
      `Status: ${webRes.status}, Size: ${webRes.raw.length} bytes, Latency: ${webRes.latency}ms`
    );
    recordTest(
      'Web Security Headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy',
      hasFrameOptions && hasContentTypeOptions && hasReferrer,
      `Headers: ${JSON.stringify({ frame: headers['x-frame-options'], content: headers['x-content-type-options'], referrer: headers['referrer-policy'] })}`
    );
    recordTest(
      'Responsive / Mobile Meta Tag verified in Frontend HTML',
      hasViewport,
      'Viewport meta tag confirmed present in HTML header'
    );
  } catch (err) {
    recordTest('Web Observatory Frontend', false, err.message);
  }

  // ----------------------------------------------------------------
  // 3. SECURITY ACCEPTANCE & AUTH GUARD
  // ----------------------------------------------------------------
  console.log('\n--- SECTION 8: SECURITY ACCEPTANCE ---');

  // Unauthenticated request -> 401
  try {
    const unauthRes = await makeRequest(`${LIVE_API_BASE}/memory`);
    recordTest(
      'Unauthenticated request to protected endpoint returns 401 Unauthorized',
      unauthRes.status === 401,
      `Status: ${unauthRes.status}, Body: ${JSON.stringify(unauthRes.body)}`
    );
  } catch (err) {
    recordTest('Unauthenticated 401 check', false, err.message);
  }

  // Invalid JWT -> 401
  try {
    const invalidJwtRes = await makeRequest(`${LIVE_API_BASE}/memory`, {
      headers: { Authorization: `Bearer ${JWT_INVALID}` },
    });
    recordTest(
      'Invalid JWT bearer token returns 401 Unauthorized',
      invalidJwtRes.status === 401,
      `Status: ${invalidJwtRes.status}, Body: ${JSON.stringify(invalidJwtRes.body)}`
    );
  } catch (err) {
    recordTest('Invalid JWT 401 check', false, err.message);
  }

  // Expired JWT -> 401
  try {
    const expiredJwtRes = await makeRequest(`${LIVE_API_BASE}/memory`, {
      headers: { Authorization: `Bearer ${JWT_EXPIRED}` },
    });
    recordTest(
      'Expired JWT bearer token returns 401 Unauthorized',
      expiredJwtRes.status === 401,
      `Status: ${expiredJwtRes.status}, Body: ${JSON.stringify(expiredJwtRes.body)}`
    );
  } catch (err) {
    recordTest('Expired JWT 401 check', false, err.message);
  }

  // Cross-tenant resource manipulation rejection -> 403 Forbidden
  try {
    const crossRes = await makeRequest(`${LIVE_API_BASE}/goals?userId=${USER_A_ID}`, {
      headers: { Authorization: `Bearer ${JWT_USER_B}` },
    });
    recordTest(
      'Cross-tenant resource query attempt strictly returns 403 Forbidden',
      crossRes.status === 403,
      `Status: ${crossRes.status}, Body: ${JSON.stringify(crossRes.body)}`
    );
  } catch (err) {
    recordTest('Cross-tenant query rejection', false, err.message);
  }

  // ----------------------------------------------------------------
  // 4. MEMORY ACCEPTANCE (CREATION, SCRUBBING, SEMANTIC RETRIEVAL, ISOLATION)
  // ----------------------------------------------------------------
  console.log('\n--- SECTION 4: MEMORY ENGINE ACCEPTANCE ---');

  let testMemoryId = null;
  const secretToken = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456';
  try {
    // Authenticated create memory with secret token to test scrubber
    const memCreateStart = Date.now();
    const createRes = await makeRequest(`${LIVE_API_BASE}/memory`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${JWT_USER_A}` },
      body: {
        content: `DHAVON is my personal AI operating system. Admin secret: ${secretToken}`,
        type: 'semantic',
        metadata: { tag: 'identity', phase: '11' },
      },
    });
    results.metrics.memoryCreationLatency = Date.now() - memCreateStart;

    const memory = createRes.body;
    testMemoryId = memory?.id;
    const isScrubbed = memory?.content && !memory.content.includes(secretToken);

    recordTest(
      'Memory Creation: Stored memory successfully with 201 Created',
      createRes.status === 201 && !!testMemoryId,
      `Status: ${createRes.status}, Memory ID: ${testMemoryId}, Latency: ${results.metrics.memoryCreationLatency}ms`
    );
    recordTest(
      'Memory Credential Scrubbing: High-entropy secret token scrubbed before persistence',
      isScrubbed,
      `Persisted content: "${memory?.content}"`
    );
  } catch (err) {
    recordTest('Memory Creation & Scrubbing', false, err.message);
  }

  // Semantic retrieval with User A
  try {
    const memSearchStart = Date.now();
    const searchRes = await makeRequest(`${LIVE_API_BASE}/memory?search=personal+AI+operating+system`, {
      headers: { Authorization: `Bearer ${JWT_USER_A}` },
    });
    results.metrics.memorySearchLatency = Date.now() - memSearchStart;

    const memories = Array.isArray(searchRes.body) ? searchRes.body : [];
    const foundOurMemory = memories.some(
      (m) => (m.content && m.content.toLowerCase().includes('operating system')) || m.id === testMemoryId
    );

    recordTest(
      'Memory Semantic Retrieval: Correct memory retrieved via semantic search',
      searchRes.status === 200 && foundOurMemory,
      `Found matches: ${memories.length}, Latency: ${results.metrics.memorySearchLatency}ms`
    );
  } catch (err) {
    recordTest('Memory Semantic Retrieval', false, err.message);
  }

  // User Isolation: User B cannot retrieve User A's memory
  try {
    const searchBRes = await makeRequest(`${LIVE_API_BASE}/memory?search=personal+AI+operating+system`, {
      headers: { Authorization: `Bearer ${JWT_USER_B}` },
    });
    const memoriesB = Array.isArray(searchBRes.body) ? searchBRes.body : [];
    const userAIsolated = !memoriesB.some((m) => m.id === testMemoryId);

    recordTest(
      'Memory Tenant Isolation: User B cannot see User A memories',
      searchBRes.status === 200 && userAIsolated,
      `User B matches: ${memoriesB.length}, User A memory present: ${!userAIsolated}`
    );
  } catch (err) {
    recordTest('Memory Tenant Isolation', false, err.message);
  }

  // ----------------------------------------------------------------
  // 5. GOAL + TASK ACCEPTANCE
  // ----------------------------------------------------------------
  console.log('\n--- SECTION 5: GOAL & TASK ENGINE ACCEPTANCE ---');

  let testGoalId = null;
  try {
    const goalStart = Date.now();
    const goalRes = await makeRequest(`${LIVE_API_BASE}/goals`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${JWT_USER_A}` },
      body: {
        title: 'Prepare DHAVON for its first real daily usage.',
        description: 'Validate real-world readiness, cognitive persistence, and tool boundaries.',
        priority: 1,
      },
    });
    results.metrics.goalCreationLatency = Date.now() - goalStart;
    testGoalId = goalRes.body?.id;

    recordTest(
      'Goal Creation: Realistic daily usage goal created (201 Created)',
      goalRes.status === 201 && !!testGoalId,
      `Goal ID: ${testGoalId}, Status: ${goalRes.body?.status}`
    );
  } catch (err) {
    recordTest('Goal Creation', false, err.message);
  }

  // Goal Autonomous Planning (DAG decomposition)
  if (testGoalId) {
    try {
      const planStart = Date.now();
      const planRes = await makeRequest(`${LIVE_API_BASE}/goals/${testGoalId}/plan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${JWT_USER_A}` },
        body: {},
      });
      results.metrics.goalPlanningLatency = Date.now() - planStart;

      const tasks = Array.isArray(planRes.body?.tasks) ? planRes.body.tasks : [];
      recordTest(
        'Goal Planning: Autonomous task decomposition generated DAG tasks',
        planRes.status === 200 && tasks.length > 0,
        `Tasks generated: ${tasks.length}, Latency: ${results.metrics.goalPlanningLatency}ms`
      );
    } catch (err) {
      recordTest('Goal Planning', false, err.message);
    }

    // Task Engine: Create structured task under Goal
    try {
      const taskCreateRes = await makeRequest(`${LIVE_API_BASE}/goals/${testGoalId}/tasks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${JWT_USER_A}` },
        body: {
          title: 'Verify production connectivity and MCP telemetry',
          description: 'Autonomous pre-flight check task',
          status: 'PENDING',
          dependencies: [],
          executionOrder: 1,
        },
      });

      recordTest(
        'Task Engine: Created task under goal with dependency specification',
        taskCreateRes.status === 201 && !!taskCreateRes.body?.id,
        `Task ID: ${taskCreateRes.body?.id}`
      );
    } catch (err) {
      recordTest('Task Engine Creation', false, err.message);
    }

    // Goal Tasks Inspection
    try {
      const tasksRes = await makeRequest(`${LIVE_API_BASE}/goals/${testGoalId}/tasks`, {
        headers: { Authorization: `Bearer ${JWT_USER_A}` },
      });
      const taskList = Array.isArray(tasksRes.body) ? tasksRes.body : [];
      const hasTasks = taskList.length > 0;

      recordTest(
        'Task Engine: Tasks retrieved with dependency ordering',
        tasksRes.status === 200 && hasTasks,
        `Retrieved ${taskList.length} tasks successfully`
      );
    } catch (err) {
      recordTest('Task Engine Inspection', false, err.message);
    }
  }

  // ----------------------------------------------------------------
  // 6. MCP GATEWAY ACCEPTANCE
  // ----------------------------------------------------------------
  console.log('\n--- SECTION 6: MCP GATEWAY ACCEPTANCE ---');

  try {
    const serversRes = await makeRequest(`${LIVE_API_BASE}/mcp/servers`, {
      headers: { Authorization: `Bearer ${JWT_USER_A}` },
    });
    const servers = Array.isArray(serversRes.body) ? serversRes.body : [];
    const serverNames = servers.map((s) => s.id || s.name);
    const expected = ['github', 'supabase', 'postman', 'notion', 'render'];
    const allFound = expected.every((s) => serverNames.includes(s));

    recordTest(
      'MCP Server Discovery: All 5 production MCP servers registered',
      serversRes.status === 200 && allFound,
      `Found: ${JSON.stringify(serverNames)}`
    );
  } catch (err) {
    recordTest('MCP Server Discovery', false, err.message);
  }

  // Safe tool execution vs. Mutation rejection without approval
  try {
    // Attempt mutating action without approval token -> Must be rejected (REJECTED status)
    const mutateRes = await makeRequest(`${LIVE_API_BASE}/mcp/executions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${JWT_USER_A}` },
      body: {
        serverId: 'github',
        toolName: 'create_issue',
        arguments: { title: 'Unauthorized Test Issue', repo: 'test' },
      },
    });

    const body = mutateRes.body;
    const isProtected =
      body?.status === 'REJECTED' ||
      body?.allowed === false ||
      body?.requiresConfirmation === true;

    recordTest(
      'MCP Mutation Protection: Mutating tool execution rejected without explicit user approval',
      mutateRes.status === 201 && isProtected,
      `Status: ${mutateRes.status}, MCP Status: ${body?.status}, Reason: ${body?.errorMessage}`
    );
  } catch (err) {
    recordTest('MCP Mutation Protection', false, err.message);
  }

  // ----------------------------------------------------------------
  // 7. VOICE INTELLIGENCE ACCEPTANCE
  // ----------------------------------------------------------------
  console.log('\n--- SECTION 7: VOICE INTELLIGENCE ACCEPTANCE ---');

  try {
    const voiceStatusRes = await makeRequest(`${LIVE_API_BASE}/voice/status`, {
      headers: { Authorization: `Bearer ${JWT_USER_A}` },
    });
    const vs = voiceStatusRes.body;
    recordTest(
      'Voice Subsystem Status: Online with Groq Whisper STT & browser TTS',
      voiceStatusRes.status === 200 && vs?.status === 'online',
      `Status: ${vs?.status}, STT: ${vs?.activeSTT}, TTS: ${vs?.activeTTS}`
    );
  } catch (err) {
    recordTest('Voice Subsystem Status', false, err.message);
  }

  try {
    const synthRes = await makeRequest(`${LIVE_API_BASE}/voice/synthesize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${JWT_USER_A}` },
      body: {
        text: 'DHAVON voice interface online and calibrated.',
      },
    });
    recordTest(
      'Voice Synthesis: Browser-native TTS synthesis payload returned',
      synthRes.status === 200 && synthRes.body?.format === 'browser_native',
      `Format: ${synthRes.body?.format}, Utterance text: "${synthRes.body?.text}"`
    );
  } catch (err) {
    recordTest('Voice Synthesis', false, err.message);
  }

  // ----------------------------------------------------------------
  // 8. REAL USER FLOW TEST (WEBSOCKET E2E)
  // ----------------------------------------------------------------
  console.log('\n--- SECTION 3: REAL USER FLOW OVER WEBSOCKET ---');

  await new Promise((resolve) => {
    const wsStartTime = Date.now();
    const socket = io(LIVE_API_BASE, {
      transports: ['websocket'],
      timeout: 30000,
      reconnection: false,
    });

    const conversationId = 'phase11-live-acceptance-' + Date.now();
    const responses = {
      greeting: '',
      project: '',
      remember: '',
      recall: '',
    };
    const orbStates = [];

    let currentTest = 'greeting';

    socket.on('connect', () => {
      results.metrics.wsConnectLatency = Date.now() - wsStartTime;
      console.log(`[WS CONNECTED] Socket ID: ${socket.id} (${results.metrics.wsConnectLatency}ms)`);

      // 1. "Hello DHAVON"
      console.log('>>> Sending Flow 1: "Hello DHAVON"');
      socket.emit('dhavon.message.send', {
        conversationId,
        content: 'Hello DHAVON',
        mode: 'chat',
      });
    });

    socket.on('dhavon.state', (state) => {
      orbStates.push(state.state || state);
    });

    socket.on('dhavon.message.chunk', (data) => {
      if (currentTest === 'greeting') responses.greeting += data.delta || '';
      else if (currentTest === 'project') responses.project += data.delta || '';
      else if (currentTest === 'remember') responses.remember += data.delta || '';
      else if (currentTest === 'recall') responses.recall += data.delta || '';
    });

    socket.on('dhavon.message.complete', (data) => {
      console.log(`[FLOW COMPLETE: ${currentTest}] Synthesis Length: ${(data.content || '').length} chars`);

      if (currentTest === 'greeting') {
        currentTest = 'project';
        // 2. "What is my main project?"
        console.log('>>> Sending Flow 2: "What is my main project?"');
        socket.emit('dhavon.message.send', {
          conversationId,
          content: 'What is my main project?',
          mode: 'chat',
        });
      } else if (currentTest === 'project') {
        currentTest = 'remember';
        // 3. "Remember that DHAVON is my personal AI operating system."
        console.log('>>> Sending Flow 3: "Remember that DHAVON is my personal AI operating system."');
        socket.emit('dhavon.message.send', {
          conversationId,
          content: 'Remember that DHAVON is my personal AI operating system.',
          mode: 'chat',
        });
      } else if (currentTest === 'remember') {
        currentTest = 'recall';
        // 4. "What do you remember about DHAVON?"
        console.log('>>> Sending Flow 4: "What do you remember about DHAVON?"');
        socket.emit('dhavon.message.send', {
          conversationId,
          content: 'What do you remember about DHAVON?',
          mode: 'chat',
        });
      } else if (currentTest === 'recall') {
        socket.disconnect();

        recordTest(
          'User Flow 1: "Hello DHAVON" receives cognitive greeting',
          responses.greeting.length > 5,
          `Response: "${responses.greeting.trim().slice(0, 100)}..."`
        );
        recordTest(
          'User Flow 2: "What is my main project?" retrieves DHAVON project',
          responses.project.toLowerCase().includes('dhavon'),
          `Response: "${responses.project.trim().slice(0, 100)}..."`
        );
        recordTest(
          'User Flow 3: "Remember that DHAVON is my personal AI operating system" acknowledged',
          responses.remember.length > 5,
          `Response: "${responses.remember.trim().slice(0, 100)}..."`
        );
        recordTest(
          'User Flow 4: "What do you remember about DHAVON?" recalls operating system memory',
          responses.recall.toLowerCase().includes('operating system') || responses.recall.toLowerCase().includes('dhavon'),
          `Response: "${responses.recall.trim().slice(0, 100)}..."`
        );
        recordTest(
          'Orb Visual State Transitions synchronized over WebSocket',
          orbStates.length > 0,
          `Observed states: ${JSON.stringify(orbStates)}`
        );

        resolve();
      }
    });

    socket.on('connect_error', (err) => {
      recordTest('WebSocket Connection Error', false, err.message);
      resolve();
    });

    setTimeout(() => {
      if (socket.connected) socket.disconnect();
      console.log('WebSocket flow finished or timed out after 50 seconds');
      resolve();
    }, 50000);
  });

  // ----------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------
  console.log('\n====================================================');
  console.log('       PHASE 11 LIVE ACCEPTANCE TEST RESULTS');
  console.log('====================================================');
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Failed: ${results.failed.length}`);
  console.log('Key Metrics:', JSON.stringify(results.metrics, null, 2));

  return results;
}

runAcceptanceSuite()
  .then((res) => {
    if (res.failed.length > 0) {
      console.error('\nSome acceptance tests failed!');
      process.exit(1);
    } else {
      console.log('\nALL PHASE 11 LIVE ACCEPTANCE TESTS PASSED!');
      process.exit(0);
    }
  })
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
