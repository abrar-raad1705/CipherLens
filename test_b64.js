const fs = require('fs');
const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const buf = Buffer.from(b64, 'base64');
const b64_2 = buf.toString('base64');
console.log(b64 === b64_2);
