const fs = require('fs');

function parseBrigantoFromFiles(filePaths) {
    outputLines = ['POS;MENGE;EINHEIT;ARTIKEL;EINZELPREIS;BETRAG;WÄHRUNG;BEZEICHNUNG'];
    filePaths.forEach((filePath) => {
        let raw = fs.readFileSync(filePath).toString();
        outputLines.push(...parseBrigantoFromString(raw));
    });

    return outputLines.join('\n');
}

function parseBrigantoFromString(raw) {
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

function parseDoppelmayerFromFiles(invoicePath, folderPath) {
    let invoiceRaw = fs.readFileSync(invoicePath).toString();
    let filesInFolder = fs.readdirSync(folderPath);

    let invoiceArticles = parseDoppelmayerInvoiceFromString(invoiceRaw);
    let positions = [];

    for (const file of filesInFolder) {
        let parts = file.split('.');
        if (parts[0].length != 8 || parts[1] != 'txt') {
            continue;
        }

        let positionRaw = fs.readFileSync(folderPath + '\\' + file).toString();

        positions.push(...parseDoppelmayerPositionFromString(positionRaw));
    }

    for (let article of invoiceArticles) {
        findChildren(article, positions);
        updatePos(article);
    }

    let printOrder = [];
    let outputLines = [
        'ORI_NR;LIST;ORI_MVA;TOP_POSITION;ORI_NAME;ORI_DRAWINGNR;ORI_QUANTITYCALCULATED;TOTAL_QUANTITY;LENGHT;UNIT;ORI_POSUNITCALCPRICE;ORI_POSSUMWEIGHT;TYPE;ORI_REMARK;ORI_DATE',
    ];

    printOrder.push(...invoiceArticles);

    for (let i = 0; i < printOrder.length; i++) {
        outputLines.push(
            [
                printOrder[i].pos,
                printOrder[i].parent,
                printOrder[i].articleNr,
                printOrder[i].eldestParent,
                printOrder[i].bezeichnung,
                printOrder[i].zeichnungsNr,
                customPrintFloat(printOrder[i].menge),
                customPrintFloat(printOrder[i].calcMenge),
                customPrintFloat(printOrder[i].length),
                printOrder[i].mengenEinheit,
                printOrder[i].preis,
                printOrder[i].gewicht,
                printOrder[i].type,
                printOrder[i].beschreibung,
                printOrder[i].lieferdatum,
            ].join(';')
        );

        printOrder.push(...printOrder[i].children);
    }

    return outputLines.join('\r\n');
}

function parseDoppelmayerInvoiceFromString(raw) {
    //Remove headers and footers
    let cut = raw.replaceAll(/--------[\s\S]+?Nettobetrag/g, '');
    cut = cut.replaceAll(/Bank für Tirol[\s\S]+?Seite\s+\d+\s+\/\s+\d+/g, '');

    let parts = cut.split(/\.{5,}/g);

    let articles = [];

    parts.pop(); //Removing the unneeded stuff at the bottom;

    for (let i = 0; i < parts.length; i++) {
        //Remove single letters floating around
        parts[i] = parts[i].replaceAll(/(\s+[A-z:]\s*?\n)/g, '\n');
        parts[i] = parts[i].replaceAll(/\s+\n/g, '\n');

        let matches = parts[i].match(
            /(\d+\/\d+)\s+(\d+)\s+(.+?)(\d+,\d+)\s+(\w+)\s+((\d+\.)*\d+,\d+) \/ ((\d+\.)*\d+,\d+)\s+((\d+\.)*\d+,\d+)\s+((\d+\.)*\d+,\d+)/
        );

        let article = {
            pos: matches[1],
            articleNr: matches[2],
            bezeichnung: matches[3].trim(),
            menge: customParseFloat(matches[4]),
            calcMenge: customParseFloat(matches[4]),
            length: 0,
            mengenEinheit: matches[5],
            preis: matches[6],
            pe: matches[7],
            grundbetrag: matches[8],
            nettobetrag: matches[9],
            zeichnungsNr: '',
            beschreibung: '',
            type: 'UNSET',
        };

        let lines = parts[i].trim().split(/\r*\n/);
        for (let j = 1; j < lines.length; j++) {
            lines[j] = lines[j].trim();
            if (lines[j].length < 2) {
                continue;
            }

            if (lines[j].startsWith('Zeichnungs Nr.')) {
                article.zeichnungsNr = lines[j].split(' ').pop();
                continue;
            }
            if (lines[j].startsWith('Lieferdatum')) {
                article.lieferdatum = lines[j].split(' ').pop();
                continue;
            }

            article.beschreibung += lines[j] + '\\n';
        }

        parts[i] = article;
    }

    return parts;
}

function parseDoppelmayerPositionFromString(raw) {
    let parent = raw.match(/\d{7,}/)[0];
    let cut = raw.split(/Ges.Gewicht\s+/)[1];
    cut = cut.replaceAll(/-{4,}[\s\S]+?Seite:\s+\d+\s+/g, '');

    cut = cut.replaceAll(/(\s+[A-z:]\s*?\n)/g, '\n');
    cut = cut.replaceAll(/\s+\n/g, '\n');

    let articles = [];

    let parts = cut.split(/\s+?(?=[0-9]+[A-Z]+\s+([0-9]+|LEER)\s+(R|C))/);

    for (let i = 0; i < parts.length; i++) {
        let match = parts[i].match(
            /(\d+)\w+\s+(\d+)\s+\S+\s+((?:\d+\.)?\d+,\d+)\s*([A-z]+)\s+(.+?)\s+(\w+\.\w)?\s+((?:\d+\.)?\d+,\d{3})\s+(?:\d+\.)?\d+,\d+/
        );

        if (!match) {
            continue;
        }

        let lines = parts[i].split(/\r*\n/);
        let nonEmtpyLines = [];

        lines[1] = lines[1].replace(/\d+/, '');
        lines[1] = lines[1].replace(/\d+[A-Z]\s+/, '');
        lines[1] = lines[1].replace(/\d+,\d+$/, '');
        lines[1] = lines[1].replace(/\s+TOW/, '');

        for (let j = 1; j < lines.length; j++) {
            lines[j] = lines[j].replace(/SIEHE STUECKLISTE/, '');
            lines[j] = lines[j].replace(/\s+O+\s+/, '');
            lines[j] = lines[j].replace(/\s+R\d+\s*(ROH\s*)?/, '');
            lines[j] = lines[j].replace(/(O\s+)?\w\/E.+\s+([0-9.]+,[0-9]+|\?)\s*$/, '');
            lines[j] = lines[j].replace(/\d+,\d+\s+=.+/, '');
            lines[j] = lines[j].replace(/\s+\/\d+,\d+\s*/, '').trim();
            lines[j] = lines[j].replace(/^\d+(,\d+)?$/, '');
            if (lines[j] !== '') {
                nonEmtpyLines.push(lines[j]);
            }
        }

        let article = {
            parent: parent,
            pos: match[1],
            articleNr: match[2],
            menge: customParseFloat(match[3]),
            calcMenge: 0,
            length: 0,
            mengenEinheit: match[4],
            bezeichnung: match[5],
            zeichnungsNr: match[6],
            gewicht: match[7],
        };

        if (article.mengenEinheit === 'pcs') {
            article.beschreibung = nonEmtpyLines.join('\\n');
        } else if (article.mengenEinheit === 'm') {
            article.length = article.menge;
            article.menge = 1;
        }

        articles.push(article);
    }

    return articles;
}

function findChildren(article, list) {
    article.children = [];
    for (const position of list) {
        if (position.parent == article.articleNr) {
            if (article.eldestParent) {
                position.eldestParent = article.eldestParent;
            } else {
                position.eldestParent = article.articleNr;
            }
            article.children.push({ ...position });
        }
    }

    if (article.children.length > 0) {
        if (article.children.length == 1 && article.children[0].mengenEinheit === 'kg') {
            article.type = 'Laserteil';
        } else {
            article.type = 'Baugruppe';
        }
    } else {
        if (article.mengenEinheit == 'kg') {
            article.type = 'Blech';
        } else {
            article.type = 'Einzelteil';
        }
    }

    for (const child of article.children) {
        findChildren(child, list);
    }
}

function updatePos(article) {
    for (let child of article.children) {
        child.pos = article.pos + '.' + child.pos;
        child.calcMenge = article.calcMenge * child.menge;
        updatePos(child);
    }
}

function customParseFloat(text) {
    text = text.replace('.', '');
    text = text.replace(',', '.');
    return Number.parseFloat(text);
}

function customPrintFloat(number) {
    number = Math.round(number * 1000) / 1000;
    let text = number.toString();
    return text.replace('.', ',');
}

module.exports = {
    parseBrigantoFromFiles,
    parseBrigantoFromString,
    parseDoppelmayerFromFiles,
    parseDoppelmayerInvoiceFromString,
    parseDoppelmayerPositionFromString,
};
