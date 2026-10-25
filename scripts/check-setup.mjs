// Runs before `npm run dev` and `npm run build`: stops early, with a clear message,
// when Node.js is too old for the build tools or the dependencies are not installed.
import { existsSync } from 'node:fs';

const [major, minor] = process.versions.node.split('.').map(Number);
const problems = [];

if (major < 22 || (major === 22 && minor < 18)) {
  problems.push(
    `Goldpan needs Node.js 22.18 or newer to build; this is ${process.version}.`,
    'Install the current LTS from https://nodejs.org, then run the command again.',
  );
}
if (!existsSync('node_modules/tsup/package.json')) {
  problems.push('The dependencies are not installed: run "npm install" first.');
}

if (problems.length) {
  console.error(`\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
