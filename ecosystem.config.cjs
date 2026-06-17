module.exports = {
  apps: [
    {
      name: "bead-designer",
      script: "node server.js",
      cwd: "/opt/bead-designer",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        // Secrets are loaded from /opt/bead-designer/.env
        // Required vars: DATABASE_URL, AUTH_SECRET, AUTH_YANDEX_ID, AUTH_YANDEX_SECRET
        // Optional: AUTH_VK_ID, AUTH_VK_SECRET, TELEGRAM_BOT_NAME
        // Auth.js config:
        AUTH_TRUST_HOST: "true",
        NEXTAUTH_URL: "https://5minutesofsilence.ru",
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "~/.pm2/logs/bead-designer-error.log",
      out_file: "~/.pm2/logs/bead-designer-out.log",
    },
  ],
};
