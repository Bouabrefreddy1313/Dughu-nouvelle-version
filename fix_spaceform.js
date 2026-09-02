const fs = require('fs');
const path = 'src/components/pages/SpaceFormPage.tsx';
const content = fs.readFileSync(path + '.new', 'utf8');

// Strategy 1: Try writeFileSync
try { fs.writeFileSync(path, content, 'utf8'); console.log('Strategy 1 (writeFileSync) succeeded'); process.exit(0); } catch(e1) { console.log('S1 failed:', e1.code); }

// Strategy 2: Try open with 'w' flag
try { const fd=fs.openSync(path,'w'); fs.writeSync(fd,content); fs.closeSync(fd); console.log('Strategy 2 (open w) succeeded'); process.exit(0); } catch(e2) { console.log('S2 failed:', e2.code); }

// Strategy 3: Try open with 'r+' and truncate
try { const fd=fs.openSync(path,'r+'); fs.ftruncateSync(fd,0); fs.writeSync(fd,content); fs.closeSync(fd); console.log('Strategy 3 (r+ truncate) succeeded'); process.exit(0); } catch(e3) { console.log('S3 failed:', e3.code); }

// Strategy 4: Try unlink + write
try { fs.unlinkSync(path); fs.writeFileSync(path, content, 'utf8'); console.log('Strategy 4 (unlink+write) succeeded'); process.exit(0); } catch(e4) { console.log('S4 failed:', e4.code); }

console.log('All strategies failed');
process.exit(1);
