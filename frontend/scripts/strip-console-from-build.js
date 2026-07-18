const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const buildDirectory = path.resolve(__dirname, '..', 'build');

const getJavaScriptFiles = (directory) => {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return getJavaScriptFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.js') ? [entryPath] : [];
  });
};

const stripConsoleCalls = async () => {
  const files = getJavaScriptFiles(buildDirectory);

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const result = await minify(source, {
      compress: {
        drop_console: true,
      },
      mangle: false,
      format: {
        comments: /^!/,
      },
    });

    if (typeof result.code !== 'string') {
      throw new Error(`Failed to sanitize ${file}`);
    }

    fs.writeFileSync(file, `${result.code}\n`);
  }
};

stripConsoleCalls().catch((error) => {
  process.stderr.write(`Failed to remove console calls: ${error.message}\n`);
  process.exitCode = 1;
});
