#!/usr/bin/env node

import process from  'node:process';
import fs from 'node:fs';
import { convert } from './convert.js';

if (process.argv.length < 3) {
    console.error('usage: index.js FILE...');
    process.exit(1);
}

const errorCount = 0;
const output = {};
for (let i = 2; i < process.argv.length; i++) {
    const filename = process.argv[i];
    const data = fs.readFileSync(filename);
    const fileContent = output[filename] = convert(data);
    if (!fileContent.icons) {
        console.warn(`Function icon sheet not found: ${filename}`);
    }
}
console.log(JSON.stringify(output));
process.exit(errorCount);
