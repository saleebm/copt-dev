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
    }
  ]
}
