#!/usr/bin/env node

const pjson = require('./package.json');
const MaxRectsPacker = require('./lib/maxrects_packer').MaxRectsPacker;
const args = require('commander');
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');
const ext = ["jpg", "JPG", "jpeg", "JPEG", "png", "PNG"];

let imageFiles;

args
    .version('MaxRectsPacker v' + pjson.version)
    .usage('[options] <image-files/folder>')
    .arguments('<image-files/folder>')
    .description('CLI tools to packing and compositing image files into atlas using MaxRects packing algorithm')
    .option('-o, --output <filename>', 'output atlas filename (Default: sprite.png/xml)', 'sprite')
    .option('-R, --recursive', 'output atlas filename (Default: sprite.png/xml)', false)
    .option('-a, --auto-size', 'shrink atlas to the smallest possible square (Default: true)', true)
    .option('-p, --pot', 'atlas size shall be power of 2 (Default: false)', false)
    .option('-s, --square', 'atlas size shall be square (Default: false)', false)
    .option('-r, --rot', 'allow 90-degree rotation while packing (Default: false)', false)
    .action((...filesOrFolder) => {
        let inputFiles = [];
        filesOrFolder.forEach(filePath => {
            if (typeof(filePath) === "object") return;
            if (fs.statSync(filePath).isDirectory()) {
                walkSync(filePath);
            }
        });
    }).parse(process.argv);

const options = args.opts();
console.log(options);

/**
 * List all files in a directory recursively in a synchronous fashion.
 *
 * @param {String} dir
 * @returns {IterableIterator<String>}
 */
function *walkSync(dir, recursive = false) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const pathToFile = path.join(dir, file);
        const isDirectory = fs.statSync(pathToFile).isDirectory();
        if (isDirectory && recursive) {
            yield *walkSync(pathToFile, recursive);
        } else {
            yield pathToFile;
        }
    }
}

function imageValidate(filename) {
    if(fs.statSync(filePath).isFile() && ext.includes(path.extname(filename))) return true;
    return false; 
}