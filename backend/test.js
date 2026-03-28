const fs = require('fs');
try {
  require('./index.js');
} catch (e) {
  fs.writeFileSync('error.txt', e.stack || e.toString());
}
