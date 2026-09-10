const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) results.push(file);
    }
  });
  return results;
}
const files = walk('./src');
const fixes = {
  'Ã¡': 'á', 'Ã©': 'é', 'Ã³': 'ó', 'Ã­': 'í', 'Ãº': 'ú',
  'Ã±': 'ñ', 'Ã‘': 'Ñ', 'Â¿': '¿', 'Â¡': '¡',
  'Ã\u00A0': 'à', 'Ã\u00A8': 'è', 'Ã\u00AC': 'ì', 'Ã\u00B2': 'ò', 'Ã\u00B9': 'ù',
  'Ã ': 'Á', 'Ã‰': 'É', 'Ã ': 'Í', 'Ã“': 'Ó', 'Ãš': 'Ú'
};
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;
  for (const [bad, good] of Object.entries(fixes)) {
    if (content.includes(bad)) {
      content = content.split(bad).join(good);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Fixed', f);
  }
});
