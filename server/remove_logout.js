const fs = require('fs');
let lines = fs.readFileSync('./src/routes/auth.js', 'utf8').split('\n');
const startLine = lines.findIndex(l => l.includes('router.post("/logout"'));
if (startLine !== -1) {
  let endLine = -1;
  let braces = 0;
  let foundBrace = false;
  for (let i = startLine; i < lines.length; i++) {
    if (lines[i].includes('{')) { braces += (lines[i].match(/{/g) || []).length; foundBrace = true; }
    if (lines[i].includes('}')) braces -= (lines[i].match(/}/g) || []).length;
    if (foundBrace && braces === 0) {
      endLine = i;
      break;
    }
  }
  if (endLine !== -1) {
    let delStart = startLine;
    while (delStart > 0 && lines[delStart - 1].trim().startsWith('//')) {
      delStart--;
    }
    lines.splice(delStart, endLine - delStart + 1);
    fs.writeFileSync('./src/routes/auth.js', lines.join('\n'));
    console.log('Removed logout from auth.js');
  }
}
