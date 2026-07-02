#!/usr/bin/env node
/**
 * Wisuda Builder — Autonomous Build Loop
 * Runs every 15 minutes via cron (wisuda-cron PM2 process)
 * 
 * Flow: Pick next task → Research → Implement → Test → Report → Commit
 * Logs to /var/log/wisuda-builder.log
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = '/var/log/wisuda-builder.log';
const STATE_FILE = '/root/wisuda-platform/.builder-state.json';
const TASKS_FILE = '/root/wisuda-platform/docs/BUILD_TASKS.md';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  fs.appendFileSync(LOG_FILE, line + '\n');
  console.log(line);
}

function run(cmd, opts = {}) {
  try {
    const out = execSync(cmd, { 
      cwd: '/root/wisuda-platform',
      encoding: 'utf8',
      timeout: 120000,
      ...opts
    });
    log(`CMD OK: ${cmd}`);
    return { ok: true, out: out.trim() };
  } catch (e) {
    log(`CMD FAIL: ${cmd}\n${e.stdout || e.message}`);
    return { ok: false, out: e.stdout?.trim() || e.message };
  }
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  return { currentTask: null, completed: [], failed: [], lastRun: null };
}

function saveState(state) {
  state.lastRun = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadTasks() {
  if (!fs.existsSync(TASKS_FILE)) return [];
  const content = fs.readFileSync(TASKS_FILE, 'utf8');
  // Parse markdown task list: - [ ] Task description
  const tasks = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^-\s*\[([ x])\]\s*(.+)$/);
    if (match) {
      tasks.push({ done: match[1] === 'x', title: match[2].trim() });
    }
  }
  return tasks;
}

function saveTasks(tasks) {
  const lines = tasks.map(t => `- [${t.done ? 'x' : ' '}] ${t.title}`);
  fs.writeFileSync(TASKS_FILE, lines.join('\n') + '\n');
}

function pickNextTask(tasks, state) {
  // Find first undone task not in failed
  for (const task of tasks) {
    if (!task.done && !state.failed.includes(task.title)) {
      return task.title;
    }
  }
  return null;
}

async function runBuilderCycle() {
  log('=== Wisuda Builder Cycle Start ===');
  
  const state = loadState();
  const tasks = loadTasks();
  
  if (tasks.length === 0) {
    log('No tasks defined in BUILD_TASKS.md');
    return;
  }
  
  const nextTask = pickNextTask(tasks, state);
  if (!nextTask) {
    log('All tasks completed or failed!');
    return;
  }
  
  log(`Next task: ${nextTask}`);
  state.currentTask = nextTask;
  saveState(state);
  
  // TODO: Implement actual research → implement → test → commit flow
  // For now, log the task and mark as needing manual implementation
  
  log(`Task "${nextTask}" picked. Awaiting implementation...`);
  log(`Run: node -e "require('./scripts/implement-task.js')('${nextTask.replace(/'/g, "\\'")}')"`);
  
  // In full autonomous mode, this would:
  // 1. Research best practices (web_search, skills)
  // 2. Generate implementation plan
  // 3. Write code files
  // 4. Run tests (npm test)
  // 5. Verify health check
  // 6. Commit with message
  // 7. Mark task done
  
  state.currentTask = null;
  saveState(state);
  log('=== Wisuda Builder Cycle End ===');
}

// Run if called directly
if (require.main === module) {
  runBuilderCycle().catch(e => {
    log(`FATAL: ${e.message}`);
    process.exit(1);
  });
}

module.exports = { runBuilderCycle, loadState, loadTasks, pickNextTask };