"use strict";

module.exports = {
  apps: [
    {
      name: "copt-dev",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      cwd: "/home/deploy/apps/copt-dev",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        BUILD_DIR: ".next-builds/current",
        NEXT_PUBLIC_APP_URL: "https://copt.dev",
      },
      instances: 2,
      exec_mode: "cluster",
      max_memory_restart: "512M",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/home/deploy/logs/copt-dev-error.log",
      out_file: "/home/deploy/logs/copt-dev-out.log",
      merge_logs: true,
    },
  ],
};
