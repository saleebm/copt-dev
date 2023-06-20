module.exports = {
  apps: [
    {
      name: 'copt-dev',
      script: 'npm',
      // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
      args: 'run production',
      autorestart: true,
      watch: false,
      // instances: 'max',
      // "exec_mode": "cluster",
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'music-sentiment-analyzer',
      script: 'scripts/cron-seed.mjs',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0,30 * * * *',
      watch: false,
      autorestart: false
    }
  ]
}
