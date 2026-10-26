module.exports = {
  apps: [{
    name: "saba-dy",
    script: "./index.js",
    cwd: "/var/www/saba-dy/server",
    env: {
      NODE_ENV: "production",
      PORT: 8000,
      BASE_URL: "https://saba-dy.ru"
    }
  }]
};
