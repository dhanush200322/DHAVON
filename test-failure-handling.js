const http = require('http');

function request(method, path, body = null) {
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
          try {
            resolve({ status: res.statusCode, body: JSON.parse(responseBody) });
          } catch {
            resolve({ status: res.statusCode, body: responseBody });
          }
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function verifyFailureHandling() {
  console.log('=== STEP 6: VERIFY FAILURE HANDLING ===\n');

  // 1. Create a goal
  const goalRes = await request('POST', '/goals', {
    title: 'Controlled Failure Handling Test Goal',
    description: 'Verify safe failure containment and downstream blocking',
    priority: 'HIGH',
  });
  const goalId = goalRes.body.id;
  console.log('1. Created Goal:', goalId);

  // 2. Create Task 1 that fails verification or execution safely (e.g. invalid query to non-existent tool)
  const task1 = await request('POST', `/goals/${goalId}/tasks`, {
    title: 'Faulty Task with Invalid Parameter',
    description: 'Task intentionally configured to produce a controlled safe failure',
    status: 'PENDING',
    assignedCapability: 'github-mcp-server',
    toolPayload: { invalid_required_param_missing: true },
    verificationStrategy: 'strict_rejection_test',
    dependencies: [],
    executionOrder: 1,
  });
  console.log('2. Created Task 1:', task1.body.id);

  // 3. Create Task 2 that depends on Task 1
  const task2 = await request('POST', `/goals/${goalId}/tasks`, {
    title: 'Downstream Protected Task',
    description: 'Must NOT execute because prerequisite Task 1 failed',
    status: 'PENDING',
    dependencies: [task1.body.id],
    executionOrder: 2,
  });
  console.log('3. Created Task 2 (Depends on Task 1):', task2.body.id);

  // 4. Execute Orchestration
  console.log('\n4. Executing Goal Orchestration...');
  const execRes = await request('POST', `/goals/${goalId}/execute`);
  console.log('Execution Status:', execRes.body.status);
  console.log('Diagnostic:', JSON.stringify(execRes.body.diagnostic, null, 2));

  // 5. Inspect Goal & Task states
  const statusRes = await request('GET', `/goals/${goalId}/status`);
  console.log('\n5. Inspected Goal Status:', statusRes.body.status);

  const tasksRes = await request('GET', `/goals/${goalId}/tasks`);
  const tasks = tasksRes.body;
  const t1 = tasks.find((t) => t.id === task1.body.id);
  const t2 = tasks.find((t) => t.id === task2.body.id);

  console.log(` - Task 1 Status: ${t1.status} (Expected: FAILED or error caught)`);
  console.log(` - Task 2 Status: ${t2.status} (Expected: BLOCKED or PENDING, NOT COMPLETED)`);

  const passed =
    (execRes.body.status === 'BLOCKED' || execRes.body.status === 'FAILED') &&
    t2.status !== 'COMPLETED';

  console.log('\nDownstream execution successfully prevented:', t2.status !== 'COMPLETED');
  console.log('Failure properly contained:', passed);

  if (passed) {
    console.log('\n>>> SUCCESS: Failure Handling verified.');
    process.exit(0);
  } else {
    console.error('\n>>> FAILURE: Failure Handling test failed.');
    process.exit(1);
  }
}

verifyFailureHandling().catch((err) => {
  console.error(err);
  process.exit(1);
});
