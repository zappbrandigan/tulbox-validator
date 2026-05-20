const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const README_PATH = path.join(ROOT_DIR, 'README.md');
const BUILD_SCRIPT = path.join(ROOT_DIR, 'scripts', 'build.js');

function toSafeName(name) {
  return name
    .toLowerCase()
    .replace('ū', 'u')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });

    child.on('error', (error) => {
      reject(
        new Error(
          `Failed to run ${command}: ${error.message}`
        )
      );
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

function runZip(cwd, outputZip, folderName) {
  return runCommand('zip', ['-r', outputZip, folderName], cwd);
}

function runBuild() {
  return runCommand(process.execPath, [BUILD_SCRIPT], ROOT_DIR);
}

async function publish() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'publish-'));
  const appName = toSafeName(path.basename(ROOT_DIR)) || 'extension';
  const stagingDir = path.join(tempDir, appName);
  const outputZip = path.join(ROOT_DIR, `${appName}.zip`);

  try {
    await runBuild();
    await fs.access(PUBLIC_DIR);
    await fs.access(README_PATH);
    await fs.rm(outputZip, { force: true });
    await fs.mkdir(stagingDir, { recursive: true });
    await fs.copyFile(README_PATH, path.join(stagingDir, 'readme.md'));
    await fs.cp(PUBLIC_DIR, path.join(stagingDir, 'public'), {
      recursive: true,
    });
    await runZip(tempDir, outputZip, appName);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

publish().catch((error) => {
  console.error(error);
  process.exit(1);
});
