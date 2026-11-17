// Sirve la raíz del repo con un servidor estático y prueba a 390×844 (iPhone 14), en español y sin red externa.
const { defineConfig } = require('@playwright/test');
const PORT = 8790;
module.exports = defineConfig({
  testDir: '.',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}/`,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    locale: 'es-ES',
    serviceWorkers: 'block',
    ...(process.env.PW_CHROMIUM ? { launchOptions: { executablePath: process.env.PW_CHROMIUM } } : {}),
  },
  webServer: { command: `python3 -m http.server ${PORT}`, cwd: '..', port: PORT, reuseExistingServer: true, stdout: 'ignore', stderr: 'ignore' },
});
