#!/usr/bin/env node

const pjson = require('./package.json');
const MaxRectsPacker = require('./lib/maxrects_packer').MaxRectsPacker;
const args = require('commander');
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');
const utils = require('./lib/utils');
const ext = ["jpg", "JPG", "jpeg", "JPEG", "png", "PNG"];

let imageFiles = [];

args
    .version('MaxRectsPacker v' + pjson.version)
    .usage('[options] <image-files/folder>')
    .arguments('<image-files/folder>')
    .description('CLI tools to packing and compositing image files into atlas using MaxRects packing algorithm')
    .option('-o, --output <filename>', 'output atlas filename (Default: sprite.png/xml)', 'sprite')
    .option('-R, --recursive', 'output atlas filename (Default: sprite.png/xml)', false)
    .option('-a, --auto-size', 'shrink atlas to the smallest possible square (Default: true)', true)
    .option('-p, --pot', 'atlas size shall be power of 2 (Default: true)', true)
    .option('-s, --square', 'atlas size shall be square (Default: false)', false)
    .option('-r, --rot', 'allow 90-degree rotation while packing (Default: false)', false)
    .action((...filesOrFolder) => {
        let inputFiles = [];
        filesOrFolder.forEach(filePath => {
            if (typeof(filePath) === "object") return;
            if (fs.statSync(filePath).isDirectory()) {
                inputFiles = inputFiles.concat(utils.getAllFiles(filePath));
            } else 
                inputFiles.push(filePath);
        });
        for (let inputFile of inputFiles) {
            const extname = path.extname(inputFile).slice(1);
            if (fs.existsSync(inputFile) && ext.includes(extname)) {
                console.log("+" + extname + " : " + inputFile);
                imageFiles.push(inputFile);
            }
        }
        console.log("Total " + imageFiles.length + " files added.");
    }).parse(process.argv);

//
//  Initialize options
//
let options = args.opts();
if (!imageFiles) {
    args.outputHelp();
    process.exit(1);
}

//
// Set default value
//
options.recursive = utils.valueQueue([options.recursive, false]);
options.autoSize = utils.valueQueue([options.autoSize, true]);
options.pot = utils.valueQueue([options.pot, true]);
options.square = utils.valueQueue([options.square, false]);
options.rot = utils.valueQueue([options.rot, false]);

//
// Display options
//
const keys = Object.keys(options);
const padding = utils.longestLength(keys) + 2;
console.log("\nUsing following settings");
console.log("========================================");
keys.forEach(key => {
    console.log(utils.pad(key, padding) + ": " + options[key]);
});
console.log("========================================");
