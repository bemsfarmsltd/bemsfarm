// PM2 process manager config for the Hostinger VPS.
// Usage:
//   pm2 start ecosystem.config.js --env production
//   pm2 save                # persist the process list
//   pm2 startup             # print + run the command that makes PM2 survive a reboot
module.exports = {
  apps: [
    {
      name: "bemsfarms-api",
      cwd: __dirname,
      script: "src/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "400M",
      env_production: {
        NODE_ENV: "production",
      },
      error_file: "logs/error.log",
      out_file: "logs/out.log",
      time: true,
    },
  ],
};