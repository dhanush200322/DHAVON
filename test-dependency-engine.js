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

async function verifyDependencyEngine() {
  console.log('=== STEP 5: VERIFY DEPENDENCY ENGINE ===\n');

  // 1. Create a goal for dependency testing
  const goalRes = await request('POST', '/goals', {
    title: 'Dependency Engine Verification Goal',
    description: 'Verify Task A -> Task B -> Task C ordering and blocking',
    priority: 'NORMAL',
  });
  const goalId = goalRes.body.id;
  console.log('1. Created Goal:', goalId);

  // 2. Manually create Task A, Task B, Task C
  const taskA = await request('POST', `/goals/${goalId}/tasks`, {
    title: 'Task A (Root)',
    description: 'First task with no dependencies',
    status: 'PENDING',
    dependencies: [],
    executionOrder: 1,
  });
  console.log('2. Created Task A:', taskA.body.id);

  const taskB = await request('POST', `/goals/${goalId}/tasks`, {
    title: 'Task B (Dependent on A)',
    description: 'Second task dependent on Task A',
    status: 'PENDING',
    dependencies: [taskA.body.id],
    executionOrder: 2,
  });
  console.log('3. Created Task B (Depends on Task A):', taskB.body.id);

  const taskC = await request('POST', `/goals/${goalId}/tasks`, {
    title: 'Task C (Dependent on B)',
    description: 'Third task dependent on Task B',
    status: 'PENDING',
    dependencies: [taskB.body.id],
    executionOrder: 3,
  });
  console.log('4. Created Task C (Depends on Task B):', taskC.body.id);

  // 3. Execute Orchestration
  console.log('\n5. Executing Goal Orchestration...');
  const execRes = await request('POST', `/goals/${goalId}/execute`);
  console.log('Execution Status:', execRes.body.status);
  console.log('Completed Tasks in execution order:', execRes.body.completedTasks);

  // 4. Inspect Task state transitions
  const tasksRes = await request('GET', `/goals/${goalId}/tasks`);
  const tasks = tasksRes.body;
  console.log('\n6. Inspecting Task final states:');
  tasks.forEach((t) => {
    console.log(` - ${t.title}: Status=${t.status}, Dependencies=[${t.dependencies.join(', ')}], Verified=${t.result?.verified}`);
  });

  const correctOrder =
    execRes.body.completedTasks[0] === 'Task A (Root)' &&
    execRes.body.completedTasks[1] === 'Task B (Dependent on A)' &&
    execRes.body.completedTasks[2] === 'Task C (Dependent on B)';

  console.log('\n7. Order A -> B -> C strictly respected:', correctOrder);

  if (correctOrder && execRes.body.status === 'COMPLETED') {
    console.log('\n>>> SUCCESS: Dependency Engine verified Task A -> Task B -> Task C ordering.');
    process.exit(0);
  } else {
    console.error('\n>>> FAILURE: Dependency Engine ordering test failed.');
    process.exit(1);
  }
}

verifyDependencyEngine().catch((err) => {
  console.error(err);
  process.exit(1);
});
