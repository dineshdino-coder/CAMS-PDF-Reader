const http = require('http');

process.on('exit', (code) => console.log('diagnose: process exit', code));
process.on('uncaughtException', (e) => console.error('diagnose: uncaughtException', e));
process.on('unhandledRejection', (r) => console.error('diagnose: unhandledRejection', r));

const server = http.createServer((req, res) => {
  res.end('ok');
});

server.listen(5001, () => {
  console.log('diagnose: listening on', server.address());
  setTimeout(() => {
    try {
      const handles = process._getActiveHandles ? process._getActiveHandles() : [];
      console.log('diagnose: active handles count', handles.length);
      handles.forEach((h, i) => {
        console.log(`diagnose: handle[${i}] type:`, h && h.constructor && h.constructor.name);
      });
    } catch (e) {
      console.error('diagnose: error dumping handles', e);
    }
  }, 500);
});

// keep alive flag
if (process.env.DEBUG_KEEP_ALIVE === 'true') {
  setInterval(() => {}, 1e6);
}
