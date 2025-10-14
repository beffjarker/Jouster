import { nxE2EPreset } from '@nx/cypress/plugins/cypress-preset';
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    ...nxE2EPreset(__filename, {
      cypressDir: 'src',
      webServerCommands: {
        default: 'npx nx run jouster:serve:development',
        production: 'npx nx run jouster:serve-static',
      },
      ciWebServerCommand: 'npx nx run jouster:serve-static',
      ciBaseUrl: 'http://localhost:4200',
    }),
    baseUrl: 'http://localhost:4200',
    specPattern: 'src/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'src/support/e2e.ts',
    videosFolder: 'videos',
    screenshotsFolder: 'screenshots',
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
  },
});
