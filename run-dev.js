import { spawn } from 'child_process';

console.log('🚀 Starting Harmony Music Player...\n');
console.log('   Backend API  → http://localhost:5000');
console.log('   Frontend App → http://localhost:3000  ← open this in your browser\n');

// Start backend (Express API on port 5000)
const backend = spawn('npm', ['run', 'dev'], {
  cwd: 'backend',
  shell: true,
  stdio: 'inherit',
});

// Start frontend (Vite dev server on port 3000)
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: 'frontend',
  shell: true,
  stdio: 'inherit',
});

// Graceful shutdown
const cleanup = () => {
  console.log('\n⏹  Stopping Harmony Music Player...');
  backend.kill();
  frontend.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
