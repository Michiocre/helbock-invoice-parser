const fs = require('fs');

function parseBriganFromFiles(filePaths, outputPath) {
    outputLines = ['POS;MENGE;EINHEIT;ARTIKEL;EINZELPREIS;BETRAG;WÄHRUNG;BEZEICHNUNG'];
    filePaths.forEach((filePath) => {
        let raw = fs.readFileSync(filePath).toString();
        outputLines.push(...parseBriganFromString(raw));
    });

    fs.writeFileSync(outputPath, outputLines.join('\n'));
    return outputLines.join('\n');
}

function parseBriganFromString(raw) {
    let matches = [...raw.matchAll(/(\d+)\s+(\d+,\d+)\s+(\w+)\s+(\S+).+? (\d+,\d+)\s+(\d+,\d+)\s+(\w+)\s+(.+)/g)];
    let articles = [];

    for (let i = 0; i < matches.length; i++) {
        let match = matches[i];
        if (matches) {
            let article = {
                pos: match[1],
                menge: match[2],
                einheit: match[3],
                artikel: match[4],
                einzelpreis: match[5],
                betrag: match[6],
                wahrung: match[7],
                bezeichnung: match[8].trim(),
            };
            articles.push(Object.values(article).join(';'));
        }
    }

    return articles;
}

module.exports = {
    parseBriganFromFiles,
    parseBriganFromString,
};
