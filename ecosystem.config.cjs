const appDir = '/opt/data/formadigital_app';
const node = '/opt/data/runtime/node/current/bin/node';

module.exports = {
  apps: [
    {
      name: 'formadigital-backend',
      cwd: `${appDir}/apps/backend`,
      script: 'dist/src/main.js',
      interpreter: node,
      env: { NODE_ENV: 'production' },
      error_file: `${appDir}/.runtime/logs/backend.err.log`,
      out_file: `${appDir}/.runtime/logs/backend.out.log`,
    },
    {
      name: 'formadigital-frontend',
      cwd: `${appDir}/apps/frontend`,
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 0.0.0.0 -p 3001',
      interpreter: node,
      env: { NODE_ENV: 'production' },
      error_file: `${appDir}/.runtime/logs/frontend.err.log`,
      out_file: `${appDir}/.runtime/logs/frontend.out.log`,
    },
    {
      name: 'formadigital-harv3st',
      cwd: `${appDir}/services/harv3st`,
      script: '.venv/bin/gunicorn',
      args: '--bind 127.0.0.1:5050 --workers 1 --threads 4 app.main_server:app',
      interpreter: 'none',
      env: {
        HARV3ST_HOST: '127.0.0.1',
        HARV3ST_PORT: '5050',
        HARV3ST_HEADLESS: 'true',
        PLAYWRIGHT_BROWSERS_PATH: `${appDir}/.runtime/playwright`,
      },
      error_file: `${appDir}/.runtime/logs/harv3st.err.log`,
      out_file: `${appDir}/.runtime/logs/harv3st.out.log`,
    },
  ],
};
