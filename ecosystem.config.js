module.exports = {
  apps: [
    {
      name: 'biblioteca-api',
      script: './server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'biblioteca-ui-https',
      script: 'npx', // <-- Usamos npx como ejecutor para que encuentre el comando serve global
      args: [
        'serve', '-s', 'build',
        '-l', '443',
        '--ssl-key', './certs/biblioteca.key',
        '--ssl-cert', './certs/biblioteca.crt'
      ],
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false
    }
  ]
};
