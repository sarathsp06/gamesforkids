// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './', // Path to your Next.js app
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/test-setup.ts'], // test-setup.ts is NOT commented out and has original content
  testEnvironment: 'jsdom',
  // Specific moduleNameMapper, roots, moduleDirectories removed as per Step 5
  // transformIgnorePatterns: ['/node_modules/(?!lucide-react)/'], // Kept commented out
};

module.exports = createJestConfig(customJestConfig);
