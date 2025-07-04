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
    // Post processing
    for (const [sheet, fabrics] of Object.entries(fileContent.fabrics)) {
        for (const fabric of fabrics) {
            // Find invalid technical details.
            for (const detail of (fabric['Technical Details'] ?? [])) {
                if (!fileContent.icons.find(x => normalizeTechnicalDetails(x) === normalizeTechnicalDetails(detail)))
                    console.error(`Unknown technical detail type: '${detail}' (#: ${fabric['#']}) in ${sheet} of ${filename}`);
            }
            // Break "Hard Fiber / Span" values.
            const hardFiberSpan = fabric['Hard Fiber / Span'];
            if (typeof(hardFiberSpan) === 'string') {
                const lines = hardFiberSpan.split('\r\n').map(l => l.trim());
                const newHardFiberSpan = [lines[0]];
                for (let i = 1; i < lines.length; ++i) {
                    if (lines[i].match(/^[a-z] *: */i)) {
                        newHardFiberSpan.push(lines[i]);
                    } else {
                        newHardFiberSpan[newHardFiberSpan.length - 1] = newHardFiberSpan[newHardFiberSpan.length - 1] + lines[i];
                    }
                }
                fabric['Hard Fiber / Span'] = newHardFiberSpan;
            }
            // Break 'Product Features' values.
            const productFeatures = fabric['Product Features'];
            if (typeof(productFeatures) === 'string') {
                fabric['Product Features'] = productFeatures.split('\r\n').map(s => s.trim().replace(/^(#|•) */, ''));
            }
        }
    }
}
console.log(JSON.stringify(output));
process.exit(errorCount);

function normalizeTechnicalDetails(s) {
    return s.toLowerCase().replace(/[-& ]/g, '');
}
