const { parse, valid } = require('node-html-parser');
const path = require("path");
const glstools = require('glstools');
const gfiles = glstools.files;

const log = function(s) {
    console.log(s);
}

function getAttribute(node, attr) {
    //return node.rawAttrs;
    return node.getAttribute && node.getAttribute(attr);
}
function dfs(node, callback) {
    if (!node) return;
    for (let childNode of node.childNodes) {
        dfs(childNode, callback);
        callback(childNode);
    }
}
function main() {
    log("test");
    let infname = process.argv[2];
    let html = gfiles.read(infname);
    let root = parse(html);
    log(root.toString());
    log(valid(html));
    dfs(root, node => {
        console.log(getAttribute(node, "define"));
    });
}

main();