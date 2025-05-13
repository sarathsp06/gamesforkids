import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Build process', () => {
  it('should build static assets under the public directory', () => {
    // Run the build script
    execSync('npm run build', { stdio: 'inherit' });

    // Check if the public directory exists
    const publicDir = path.join(__dirname, '../public');
    expect(fs.existsSync(publicDir)).toBe(true);

    // Check if there are any files in the public directory
    const files = fs.readdirSync(publicDir);
    expect(files.length).toBeGreaterThan(0);
  });
});
