import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Build process', () => {
  it('should build static assets under the public directory', () => {
    // Attempt to clean up potential conflicting directory before build
    const publicNextDir = path.join(__dirname, '../public/_next');
    if (fs.existsSync(publicNextDir)) {
      console.log(`Attempting to remove existing ${publicNextDir}...`);
      fs.rmSync(publicNextDir, { recursive: true, force: true });
    }

    // Run the build script
    execSync('npm run build', { stdio: 'inherit' });

    // Check if the out directory exists (output of `next export`)
    const outDir = path.join(__dirname, '../out');
    expect(fs.existsSync(outDir)).toBe(true);

    // Check if there are any files in the out directory
    const files = fs.readdirSync(outDir);
    expect(files.length).toBeGreaterThan(0);
  });
});
