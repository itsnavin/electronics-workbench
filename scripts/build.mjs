import { mkdir, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const files = ['index.html', 'styles.css', 'app.js', 'calculators.js', 'catalog.js', '.nojekyll'];
for (const file of files.filter(file => file.endsWith('.js'))) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}
await mkdir('dist', { recursive: true });
await Promise.all(files.map(file => copyFile(file, `dist/${file}`)));
console.log(`Built ${files.length} static files in dist.`);
