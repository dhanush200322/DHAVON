const http = require('http');

function request(method, path, body = null) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 4000,
        path: path,
        method: method,
        headers: data
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(data),
            }
          : {},
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          const latency = Date.now() - start;
          try {
            resolve({
              status: res.statusCode,
              latency,
              body: JSON.parse(responseBody),
            });
          } catch {
            resolve({
              status: res.statusCode,
              latency,
              body: responseBody,
            });
          }
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runPostmanVerification() {
  console.log('=== STEP 12: REAL HTTP API ENDPOINT VERIFICATION ===\n');

  const results = [];

  // 1. GET /health
  const health = await request('GET', '/health');
  results.push({
    endpoint: 'GET /health',
    status: health.status,
    latency: health.latency + 'ms',
    snippet: `service: ${health.body.service}, status: ${health.body.status}, mcpTools: ${health.body.subsystems?.mcp?.toolsCount}`,
  });

  // 2. GET /mcp/servers
  const servers = await request('GET', '/mcp/servers');
  results.push({
    endpoint: 'GET /mcp/servers',
    status: servers.status,
    latency: servers.latency + 'ms',
    snippet: `serversCount: ${servers.body?.servers?.length || servers.body?.length}`,
  });

  // 3. GET /mcp/tools
  const tools = await request('GET', '/mcp/tools');
  results.push({
    endpoint: 'GET /mcp/tools',
    status: tools.status,
    latency: tools.latency + 'ms',
    snippet: `toolsCount: ${tools.body?.tools?.length || tools.body?.length}`,
  });

  // 4. GET /memory
  const memory = await request('GET', '/memory?limit=3');
  results.push({
    endpoint: 'GET /memory',
    status: memory.status,
    latency: memory.latency + 'ms',
    snippet: `memoriesCount: ${memory.body?.length}, firstMemory: ${memory.body?.[0]?.content?.slice(0, 40)}`,
  });

  // 5. GET /goals
  const goals = await request('GET', '/goals');
  results.push({
    endpoint: 'GET /goals',
    status: goals.status,
    latency: goals.latency + 'ms',
    snippet: `goalsCount: ${goals.body?.length}, latestGoal: ${goals.body?.[0]?.title?.slice(0, 40)}`,
  });

  const latestGoalId = goals.body?.[0]?.id;

  // 6. GET /goals/:id/status
  if (latestGoalId) {
    const goalStatus = await request('GET', `/goals/${latestGoalId}/status`);
    results.push({
      endpoint: `GET /goals/:id/status`,
      status: goalStatus.status,
      latency: goalStatus.latency + 'ms',
      snippet: `status: ${goalStatus.body?.status}, progress: ${goalStatus.body?.progress}%, tasks: ${goalStatus.body?.taskCount}`,
    });

    // 7. GET /goals/:id/tasks
    const goalTasks = await request('GET', `/goals/${latestGoalId}/tasks`);
    results.push({
      endpoint: `GET /goals/:id/tasks`,
      status: goalTasks.status,
      latency: goalTasks.latency + 'ms',
      snippet: `tasksCount: ${goalTasks.body?.length}, verified: ${goalTasks.body?.filter((t) => t.result?.verified).length}`,
    });

    // 8. POST /goals/:id/plan
    const plan = await request('POST', `/goals/${latestGoalId}/plan`);
    results.push({
      endpoint: `POST /goals/:id/plan`,
      status: plan.status,
      latency: plan.latency + 'ms',
      snippet: `tasksPlanned: ${plan.body?.tasks?.length}, risk: ${plan.body?.estimatedTotalRisk}`,
    });
  }

  // 9. GET /preferences
  const prefs = await request('GET', '/preferences');
  results.push({
    endpoint: 'GET /preferences',
    status: prefs.status,
    latency: prefs.latency + 'ms',
    snippet: `preferencesCount: ${prefs.body?.length}`,
  });

  console.table(results);

  const allPassed = results.every((r) => r.status >= 200 && r.status < 300);
  console.log(`\nAll API Endpoints Verified: ${allPassed ? 'YES (100% OK)' : 'NO'}`);
  process.exit(allPassed ? 0 : 1);
}

runPostmanVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
