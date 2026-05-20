const fs = require('fs/promises');
const path = require('path');
const esbuild = require('esbuild');
const JavaScriptObfuscator = require('javascript-obfuscator');

const SRC_DIR = path.join(__dirname, '..', 'src');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const FILES = ['content.js'];

const OBFUSCATOR_OPTIONS = {
  compact: true,
  stringArray: true,
  stringArrayThreshold: 0.75,
  rotateStringArray: true,
  shuffleStringArray: true,
  renameGlobals: false
};

async function buildFile(filename) {
  const inputPath = path.join(SRC_DIR, filename);
  const outputPath = path.join(PUBLIC_DIR, filename);
  const source = await fs.readFile(inputPath, 'utf8');

  const minified = await esbuild.transform(source, {
    minify: true,
    legalComments: 'none',
    loader: 'js',
    target: 'es2018'
  });

  const obfuscated = JavaScriptObfuscator.obfuscate(
    minified.code,
    OBFUSCATOR_OPTIONS
  );

  await fs.writeFile(outputPath, obfuscated.getObfuscatedCode(), 'utf8');
}

async function copyNonJsAssets(dir = SRC_DIR) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  await Promise.all(entries.map(async (entry) => {
    const sourcePath = path.join(dir, entry.name);
    const relativePath = path.relative(SRC_DIR, sourcePath);
    const targetPath = path.join(PUBLIC_DIR, relativePath);

    if (entry.isDirectory()) {
      await fs.mkdir(targetPath, { recursive: true });
      await copyNonJsAssets(sourcePath);
      return;
    }

    if (path.extname(entry.name) === '.js') {
      return;
    }

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.copyFile(sourcePath, targetPath);
  }));
}

async function build() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await copyNonJsAssets();
  await Promise.all(FILES.map(buildFile));
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
