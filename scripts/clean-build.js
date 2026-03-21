const fs   = require('fs');
const path = require('path');

const TARGETS = [
  '/home/ubuntu/.vscode-server/data/User/globalStorage/humy2833.ftp-simple/remote-workspace-temp/633ad1f1925edc811913d936b798ee00/public_html/pt',
  '/home/ubuntu/.vscode-server/data/User/globalStorage/humy2833.ftp-simple/remote-workspace-temp/633ad1f1925edc811913d936b798ee00/public_html/app',
];

const EXTS = ['.html', '.css', '.js', '.txt'];

function cleanDir(dir) {
  if (!fs.existsSync(dir)) { console.log(`Skip (tidak ditemukan): ${dir}`); return; }
  let count = 0;
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    // hapus subfolder browser/ sisa build lama
    if (stat.isDirectory() && file === 'browser') {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`Removed dir: ${fullPath}`);
      continue;
    }
    if (stat.isFile() && EXTS.includes(path.extname(file))) {
      fs.unlinkSync(fullPath);
      count++;
    }
  }
  console.log(`Cleaned ${count} file(s) dari: ${dir}`);
}

for (const dir of TARGETS) cleanDir(dir);
