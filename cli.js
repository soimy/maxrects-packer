#!/usr/bin/env node

const pjson = require('./package.json');
const MaxRectsPacker = require('./lib/maxrects_packer').MaxRectsPacker;
const args = require('commander');
const Jimp = require('jimp');

args
    .version('MaxRectsPacker v' + pjson.version)
    .usage('[options] <image-files/folder>')
    .arguments('<image-files/folder>')
    .description('CLI tools to packing and compositing image files into atlas using MaxRects packing algorithm')
    .option('-o, --output', 'output atlas filename (Default: sprite.png/xml)', 'sprite')
    .option('    --smart-size', 'shrink atlas to the smallest possible square (Default: true)', true)
    .option('    --pot', 'atlas size shall be power of 2 (Default: false)', false)
    .option('    --square', 'atlas size shall be square (Default: false)', false)
    .option('    --rot', 'allow 90-degree rotation while packing (Default: false)', false)
    .action((...filesOrFolder) => {
        filesOrFolder.forEach(filePath => {
            if (typeof(filePath) !== "object") console.log(filePath);
        });
    }).parse(process.argv);

const options = args.opts();
console.log(options);
