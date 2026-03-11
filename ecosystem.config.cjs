module.exports = {
  apps: [
    {
      name: "copt-dev",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/home/deploy/apps/copt-dev",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        DATABASE_URL: "postgresql://coptdev:<PW>@localhost:5432/coptdev?schema=public",
        NEXT_PUBLIC_APP_URL: "https://copt.dev",
      },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/home/deploy/logs/copt-dev-error.log",
      out_file: "/home/deploy/logs/copt-dev-out.log",
      merge_logs: true,
    },
  ],
};
