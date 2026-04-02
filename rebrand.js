const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      if (!['node_modules', '.git', 'database'].includes(file)) {
        filelist = walkSync(dirFile, filelist);
      }
    } else {
      // Only process specific text files by extension
      if (['.js', '.html', '.css', '.json', '.md', '.env', '.env.example'].includes(path.extname(file)) || file === 'Procfile') {
        filelist.push(dirFile);
      }
    }
  }
  return filelist;
};

const rootDir = process.cwd();
const filesToProcess = walkSync(rootDir);

for (const file of filesToProcess) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Rebrand SEEN POINT to SEEN POINT
  content = content.replace(/SEEN POINT/g, 'SEEN POINT');
  content = content.replace(/SEEN POINT/g, 'SEEN POINT');
  content = content.replace(/seenpoint/g, 'seenpoint');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Rebranded: ${file}`);
  }
}
console.log('Rebranding complete.');
