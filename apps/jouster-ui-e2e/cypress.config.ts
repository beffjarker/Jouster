import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    supportFile: 'src/support/e2e.ts',
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    fixturesFolder: 'src/fixtures',
  },
});
