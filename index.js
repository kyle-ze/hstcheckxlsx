#!/usr/bin/env node

const XLSX = require("xlsx");
const process = require('node:process');

if (process.argv.length < 3) {
    console.error('usage: index.js FILE...');
    process.exit(1);
}

const output = {};
for (let i = 2; i < process.argv.length; i++) {
    const filename = process.argv[i];
    const wb = XLSX.readFile(filename);
    const fileContent = output[filename] = {};

    const icons = new Set();
    const iconSheetName = (wb.Workbook?.Sheets ?? []).find(prop => isIconSheet(prop))?.name;
    const iconSheet = wb.Sheets[iconSheetName];
    if (iconSheet) {
        extractIcons(iconSheet, x => icons.add(x));
        fileContent.icons = Array.from(icons);
    } else {
        console.warn(`Function icon sheet not found: ${filename}`);
    }

    const fabricMap = fileContent.fabrics = {};
    for (const prop of (wb.Workbook?.Sheets ?? [])) {
        if (prop.Hidden || isIconSheet(prop))
            continue;
        const fabrics = [];
        const sheet = wb.Sheets[prop.name];
        extractFabrics(sheet, x => fabrics.push(x));
        fabricMap[prop.name] = fabrics;
    }
}
console.log(JSON.stringify(output));

function isIconSheet(prop) {
    return prop.name?.toLowerCase().trim() === 'function icon';
}

function extractIcons(sheet, cb) {
    const [b, e] = sheet["!ref"].split(':');
    const beg = XLSX.utils.decode_cell(b);
    const end = XLSX.utils.decode_cell(e);
    for (let r = beg.r; r <= end.r; ++r) {
        for (let c = beg.c; c <= end.c; ++c) {
            const cell = sheet[XLSX.utils.encode_cell({c, r})];
            if (cell?.t === 's')
                cb(cell.v.trim());
        }
    }
}

function extractFabrics(sheet, cb) {
    const [b, e] = sheet["!ref"].split(':');
    const beg = XLSX.utils.decode_cell(b);
    const end = XLSX.utils.decode_cell(e);
    let fabrics = [];
    let lastKey = undefined;
    for (let r = beg.r; r <= end.r; ++r) {
        const keyCellCode = XLSX.utils.encode_cell({c: beg.c, r});
        const keyCell = sheet[keyCellCode];
        let key = keyCell?.v;
        if (key === '#') {
            fabrics.forEach(x => cb(x));
            fabrics = [];
            for (let c = beg.c + 1; c <= end.c; ++c) {
                const valCellCode = XLSX.utils.encode_cell({c, r});
                const valCell = sheet[valCellCode];
                if (valCell?.t !== 's' && valCell?.t !== 'n')
                    break;
                fabrics.push({'#': Number(valCell.v)});
            }
        } else if (fabrics.length > 0) {
            let c = beg.c + 1;
            for (const fabric of fabrics) {
                const valCellCode = XLSX.utils.encode_cell({c, r});
                const valCell = sheet[valCellCode];
                if (valCell?.t === 's' || valCell?.t === 'n') {
                    let val = valCell.v;
                    if (typeof(val) === 'string')
                        val = val.trim();
                    if (key) {
                        fabric[key] = val;
                    } else if (lastKey) {
                        const acc = [fabric[lastKey]].flat();
                        acc.push(val);
                        fabric[lastKey] = acc;
                    }
                }
                c++;
            }
        }
        lastKey = key ?? lastKey;
    }
}
