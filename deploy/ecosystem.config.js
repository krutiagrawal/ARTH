// Run from /srv/arth/current. Env files live in /srv/arth/shared and are symlinked as .env in each app dir.
// API must stay a single instance: it runs an in-process scheduler (services/api/src/jobs/scheduler.ts).
module.exports = {
  apps: [
    {
      name: 'arth-api',
      cwd: '/srv/arth/current/services/api',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '700M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'arth-web',
      cwd: '/srv/arth/current/apps/web',
      script: '../../node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '900M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
