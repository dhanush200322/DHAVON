const { io } = require('./apps/web/node_modules/socket.io-client');

const socket = io('http://localhost:4000', {
  transports: ['websocket'],
});

const receivedEvents = [];
let completeMessage = '';

socket.on('connect', () => {
  console.log('Connected to DHAVON Gateway over WebSocket with id:', socket.id);

  const eventsToTrack = [
    'dhavon.state',
    'dhavon.goal.created',
    'dhavon.goal.planned',
    'dhavon.goal.progress',
    'dhavon.goal.completed',
    'dhavon.task.created',
    'dhavon.task.ready',
    'dhavon.task.started',
    'dhavon.task.completed',
    'dhavon.memory.created',
    'dhavon.message.chunk',
    'dhavon.message.complete',
  ];

  eventsToTrack.forEach((evt) => {
    socket.on(evt, (data) => {
      receivedEvents.push({ event: evt, timestamp: new Date().toISOString() });
      if (evt === 'dhavon.message.chunk') {
        process.stdout.write(data.delta || '');
      } else if (evt === 'dhavon.message.complete') {
        completeMessage = data.content;
        console.log('\n\n=== DHAVON COGNITIVE SYNTHESIS COMPLETE ===');
      } else {
        const preview = data?.title || data?.state || data?.status || JSON.stringify(data).slice(0, 80);
        console.log(`[WS EVENT: ${evt}] -> ${preview}`);
      }
    });
  });

  console.log('\n>>> Sending Section 20 Request: "Check my GitHub repositories and tell me which ones are active."\n');
  socket.emit('dhavon.message.send', {
    conversationId: 'session-safe-test-' + Date.now(),
    content: 'Check my GitHub repositories and tell me which ones are active.',
    mode: 'plan',
  });
});

setTimeout(() => {
  console.log('\n=============================================');
  console.log('--- SUMMARY OF RECEIVED WEBSOCKET EVENTS ---');
  console.log('Total events received:', receivedEvents.length);
  const eventTypes = [...new Set(receivedEvents.map((e) => e.event))];
  console.log('Unique event types:', eventTypes);
  console.log('Final Message Length:', completeMessage.length);
  console.log('=============================================\n');
  socket.disconnect();
  process.exit(0);
}, 25000);
