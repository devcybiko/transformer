#!/usr/bin/env node
const { parse } = require('node-html-parser');
const path = require("path");
const glstools = require('glstools');
const gfiles = glstools.files;

let page = "\n";
let includes = `#include <_defines.htm>\n`;
let override;

function getMacroDefinition(node) {
    if (!node) return null;
    for (let c of node.classNames || []) {
        if (c[0] === '$') return c;
    }
    return null;
}

function isIgnored(node) {
    for (let c of node.classNames || []) {
        if (c === '#ignore') return c;
    }
    return null;
}

function dumpMacro(node) {
    let endname;
    let define = getMacroDefinition(node);
    let macro = macroName(node).replace("$", "");
    let output = `#define ${define} \\\n<!-- begin ${macro} -->`;
    let lines = node.toString().split("\n");
    for (let line of lines) {
        line = line.trim();
        if (!endname && line.includes("#enddefine")) {
            endname = define.split("(")[0] + "_end";
            output += ` \\\n<!-- end ${macro} -->`;
            output += "\n\n";
            output += `#define ${endname}`;
            continue;
        }
        if (line) output += ` \\\n${line}`;
    }
    let fname = fullFname(node);
    if (fs.existsSync(fname)) {
        if (override) {
            console.error(`WARNING: Overwriting ${fname}`);
            gfiles.write(fname, output);
        } else {
            console.error(`WARNING: Skipping ${fname} - file exists`);
        }
    } else {
        if (override) console.error(`INFO: Creating ${fname}`);
        gfiles.write(fname, output);
    }
    return endname;
}

function macroName(node) {
    let macro = getMacroDefinition(node);
    if (!macro) return null;
    macro = macro.split("(")[0];
    return macro;
}

function fullFname(node) {
    return `./frags/${macroFname(node)}`;
}

function macroFname(node) {
    let macro = macroName(node);
    return macro.replace("$", "") + ".htm";
}

function generateFrags(node, parentNode) {
    let nodeMacro = getMacroDefinition(node);
    let parentMacro = getMacroDefinition(parentNode);
    let endNode;

    if (nodeMacro) page += nodeMacro + "\n";

    if (false && isDummyMacro(nodeMacro) && parentMacro) {
        let endNodeString = `<div class="#enddefine ${parentMacro} ${nodeMacro}"></div>`;
        endNode = parse(endNodeString);
        parentNode.exchangeChild(node, endNode);
        return;
    }
    for (let childNode of node.childNodes) {
        if (isIgnored(childNode)) {
            node.removeChild(childNode);
            continue;
        }
        let childMacro = getMacroDefinition(childNode);
        generateFrags(childNode, childMacro ? childNode : parentNode);
        if (childMacro) {
            if (!endNode && parentMacro) {
                let endNodeString = `<div class="#enddefine ${parentMacro} ${childMacro}"></div>`;
                endNode = parse(endNodeString);
                node.exchangeChild(childNode, endNode);
            } else {
                node.removeChild(childNode);
            }
        }
    }
    if (nodeMacro) {
        includes += `#include <${macroFname(node)}>\n`;
        let endname = dumpMacro(node);
        if (endname) page += endname + "\n";
    }
    return;
}

function isDummyMacro(define) {
    return define === "$dummy";
}

function main() {
    let infname = process.argv[2];
    override = process.argv[3];
    if (!infname) {
        console.error("transformer infile.html [override]");
        process.exit(1);
    }
    if (override && override != "override") {
        console.error("transformer infile.html [override]");
        console.error("ERROR: the 'override' parameter MUST be exactly 'override'");
        process.exit(1);
    }
    let infile = path.parse(infname);
    let outfname = path.join("pages", infile.name + ".htm");
    // console.log(infile);
    // console.log(infname);
    // console.log(outfname);

    let html = gfiles.read(infname);
    if (!html) {
        console.error("ERROR: reading " + infname);
        process.exit(1);
    }
    let root = parse(html);
    // console.log(root);
    generateFrags(root);
    gfiles.write(outfname, includes + page);
    console.error(`INFO: ${outfname} created`);
    // console.error(includes + page);
}

main();
