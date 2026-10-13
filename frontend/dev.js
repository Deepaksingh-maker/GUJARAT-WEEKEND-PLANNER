const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');

// Find virtualenv python
const candidatePythons = [
  path.join(rootDir, 'venv', 'Scripts', 'python.exe'),
  path.join(rootDir, 'backend', '.venv', 'Scripts', 'python.exe'),
  'python'
];

let pythonExe = candidatePythons.find(p => p === 'python' || fs.existsSync(p)) || 'python';

console.log('\x1b[36m%s\x1b[0m', '==================================================');
console.log('\x1b[32m%s\x1b[0m', '🚀 Starting Backend & Frontend together...');
console.log('\x1b[33m%s\x1b[0m', `🐍 Python:   ${pythonExe}`);
console.log('\x1b[33m%s\x1b[0m', `📦 Backend:  http://127.0.0.1:8000`);
console.log('\x1b[33m%s\x1b[0m', `💻 Frontend: http://localhost:3000`);
console.log('\x1b[36m%s\x1b[0m', '==================================================\n');

const runPy = path.join(rootDir, 'backend', 'run.py');

// Spawn Backend
const backend = spawn(`"${pythonExe}" "${runPy}"`, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

// Spawn Frontend (Next.js)
const frontend = spawn('npx next dev', {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log('\n🛑 Stopping servers...');
  if (backend && backend.pid) {
    try {
      if (process.platform === 'win32') {
        spawn(`taskkill /pid ${backend.pid} /f /t`, { shell: true });
      } else {
        backend.kill();
      }
    } catch (_) {}
  }
  if (frontend && frontend.pid) {
    try {
      if (process.platform === 'win32') {
        spawn(`taskkill /pid ${frontend.pid} /f /t`, { shell: true });
      } else {
        frontend.kill();
      }
    } catch (_) {}
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
