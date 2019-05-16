#!/usr/bin/env node

const pjson = require('./package.json');
const MaxRectsPacker = require('./lib/maxrects_packer').MaxRectsPacker;
const commander = require('commander');
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');
const utils = require('./lib/utils');
const ext = ["jpg", "JPG", "jpeg", "JPEG", "png", "PNG"];

let imageFiles = [];

const cli = new commander.Command();
cli
    .version('MaxRectsPacker v' + pjson.version)
    .usage('[options] <image-files/folder>')
    .arguments('<image-files/folder>')
    .description('CLI tools to packing and compositing image files into atlas using MaxRects packing algorithm')
    .option('-o, --output <filename>', 'output atlas filename (Default: sprite.png)', 'sprite.png')
    .option('-m, --size <w,h>', 'ouput texture atlas size (defaut: 2048,2048)', v => { return v.split(',') }, [2048, 2048])
    .option('-p, --padding <n>', 'padding between images (Default: 0)', 0)
    .option('-a, --auto-size', 'shrink atlas to the smallest possible square (Default: true)', true)
    .option('-t, --pot', 'atlas size shall be power of 2 (Default: true)', true)
    .option('-s, --square', 'atlas size shall be square (Default: false)', false)
    .option('-r, --rot', 'allow 90-degree rotation while packing (Default: false)', false)
    
    cli
    .command("*")
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
    })

cli.parse(process.argv);

//
//  Initialize options
//
let options = cli.opts();
utils.roundAllValue(options);
if (!imageFiles) {
    args.outputHelp();
    process.exit(1);
}

//
// Set default value
// Because commander.js not parse default boolean parameter
//
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

//
// Load images into Rectangle objects
//
let rects = [];
const loading = imageFiles.map(async img => {
    return Jimp.read(img)
        .then(image => {
            rects.push({ width: image.bitmap.width, height: image.bitmap.height, data: image });
        })
        .catch(err => console.error("File read error :" + err));
});

Promise.all(loading).then(() => {
    const packerOptions = {
        smart:  options.autoSize,
        pot:    options.pot,
        square: options.square,
        allowRotation: options.rot
    };
    const packer = new MaxRectsPacker(options.size[0], options.size[1], options.padding, packerOptions);
    packer.addArray(rects);
    const bins = packer.bins.map(async (bin, index) => {
        const ext = path.extname(options.output);
        const basename = path.basename(options.output, ext);
        const binName = packer.bins.length > 1 ? `${basename}.${index}${ext}` : `${basename}${ext}`;
        const fillColor = (ext === ".png" || ext === ".PNG") ? 0x00000000 : 0x000000ff;
        const image = new Jimp(bin.width, bin.height, fillColor);
        bin.rects.forEach(rect => {
            if (rect.rot) rect.data.rotate(90);
            image.composite(rect.data, rect.x, rect.y);
        });
        
    });
})