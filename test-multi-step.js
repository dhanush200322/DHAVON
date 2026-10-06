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

async function verifyMultiStep() {
  console.log('--- 1. Creating Goal: "Analyze my GitHub repositories and summarize my active development projects" ---');
  const goalRes = await request('POST', '/goals', {
    title: 'Analyze my GitHub repositories and summarize my active development projects',
    description: 'Inspect repositories, evaluate development activity, and generate project summary',
    priority: 'HIGH',
  });
  console.log('Goal Created:', goalRes.body.id, 'Status:', goalRes.body.status);
  const goalId = goalRes.body.id;

  console.log('\n--- 2. Planning Goal Decomposition ---');
  const planRes = await request('POST', `/goals/${goalId}/plan`);
  console.log('Plan Tasks Count:', planRes.body.tasks.length);
  planRes.body.tasks.forEach((t) => {
    console.log(` - [Order ${t.executionOrder}] "${t.title}" | Deps: [${t.dependencies.join(', ')}] | Risk: ${t.estimatedRisk}`);
  });

  console.log('\n--- 3. Executing Supervised Multi-Step Orchestration ---');
  const execRes = await request('POST', `/goals/${goalId}/execute`);
  console.log('Execution Status:', execRes.body.status);
  console.log('Completed Tasks:', execRes.body.completedTasks);
  console.log('Failed Tasks:', execRes.body.failedTasks);
  console.log('Blocked Tasks:', execRes.body.blockedTasks);

  console.log('\n--- 4. Inspecting Goal Status & Verification Results ---');
  const statusRes = await request('GET', `/goals/${goalId}/status`);
  console.log('Final Goal Status:', statusRes.body.status, 'Progress:', statusRes.body.progress + '%');

  const tasksRes = await request('GET', `/goals/${goalId}/tasks`);
  console.log('Total Tasks:', tasksRes.body.length);
  const allVerified = tasksRes.body.every((t) => t.status === 'COMPLETED' && t.result?.verified === true);
  console.log('All Tasks Completed and Verified:', allVerified);

  if (execRes.body.status === 'COMPLETED' && allVerified) {
    console.log('\n>>> SUCCESS: Multi-step orchestration verified.');
    process.exit(0);
  } else {
    console.error('\n>>> FAILURE: Multi-step orchestration failed.');
    process.exit(1);
  }
}

verifyMultiStep().catch((err) => {
  console.error(err);
  process.exit(1);
});
