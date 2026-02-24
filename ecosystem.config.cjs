/**
 * PM2 Ecosystem Config
 * Uruchamia Backend Server + Background Worker jednocześnie
 * Użycie: pm2 start ecosystem.config.cjs
 * Render: npm run start:all
 */

module.exports = {
  apps: [
    {
      name: 'backend-server',
      script: 'npx',
      args: 'tsx server/league-config-server.ts',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      time: true,
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'background-worker',
      script: 'npx',
      args: 'tsx server/background-import-worker.ts',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      time: true,
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000
    }
  ]
}
