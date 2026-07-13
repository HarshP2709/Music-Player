import { spawn } from 'child_process';

console.log('🚀 Starting Harmony Music Player services...\n');

// Start backend
const backend = spawn('npm', ['run', 'dev'], { 
  cwd: 'backend', 
  shell: true, 
  stdio: 'inherit' 
});

// Start frontend
const frontend = spawn('npm', ['run', 'dev'], { 
  cwd: 'frontend', 
  shell: true, 
  stdio: 'inherit' 
});

// Handlers for graceful exit
const cleanup = () => {
  console.log('\nStopping Harmony Music Player services...');
  backend.kill();
  frontend.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
