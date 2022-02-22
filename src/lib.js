const fs = require('fs');
const path = require('path');
const extract = require('pdf-text-extract');

async function parsePdf(path) {
    return new Promise((resolve, reject) => {
        extract(path, function (err, pages) {
            if (err) {
                reject(err);
            } else {
                resolve(pages);
            }
        });
    });
}

let header =
    'ORI_NR;LIST;ORI_MVA;TOP_POSITION;ORI_NAME;ORI_DRAWINGNR;ORI_QUANTITYCALCULATED;TOTAL_QUANTITY;LENGHT;UNIT;ORI_POSUNITCALCPRICE;ORI_POSSUMWEIGHT;TYPE;ORI_REMARK;ORI_DATE';

async function parseBrigantoFromFile(filePath) {
    outputLines = [header];

    let pages = await parsePdf(filePath);
    let raw = pages.join();

    let processed = parseBrigantoFromString(raw);
    for (const line of processed) {
        outputLines.push(
            [line.nr, '', line.mva, '', line.name, '', line.quantitycalculated, '', '', line.unit, line.posunitcalcprice, '', '', '', line.date].join(
                ';'
            )
        );
    }

    return outputLines.join('\r\n');
}

function parseBrigantoFromString(raw) {
    let matches = [...raw.matchAll(/(\d+)\s+(\d+,\d+)\s+(\w+)\s+(\S+).+? (\d+,\d+)\s+\d+,\d+\s+\w+\s+(.+)[\s\S]*?Liefertermin\s+(\d+\.\d+.\d+)/g)];
    let articles = [];

    for (let i = 0; i < matches.length; i++) {
        let match = matches[i];
        if (matches) {
            let article = {
                nr: match[1],
                quantitycalculated: match[2],
                unit: match[3],
                mva: match[4],
                posunitcalcprice: match[5],
                name: match[6].trim(),
                date: match[7],
            };
            articles.push(article);
        }
    }

    return articles;
}

async function parseDoppelmayerFromFiles(invoicePath, folderPath) {
    let invoicePages = await parsePdf(invoicePath);
    let invoiceRaw = invoicePages.join();

    let invoiceArticles = parseDoppelmayerInvoiceFromString(invoiceRaw);

    let positions = [];

    if (fs.existsSync(folderPath)) {
        let filesInFolder = fs.readdirSync(folderPath);

        for (const file of filesInFolder) {
            let parts = file.split('.');
            if (parts[0].length != 8 || parts[1] != 'pdf') {
                continue;
            }

            let positionPages = await parsePdf(path.join(folderPath, file));
            let positionRaw = positionPages.join();

            positions.push(...parseDoppelmayerPositionFromString(positionRaw));
        }
    }

    for (let article of invoiceArticles) {
        findChildren(article, positions);
        updatePos(article);
    }

    let printOrder = [];
    let outputLines = [header];

    printOrder.push(...invoiceArticles);

    for (let i = 0; i < printOrder.length; i++) {
        outputLines.push(
            [
                printOrder[i].nr,
                printOrder[i].list,
                printOrder[i].mva,
                printOrder[i].topPosition,
                printOrder[i].name,
                printOrder[i].darwingNr,
                customPrintFloat(printOrder[i].quantitycalculated),
                customPrintFloat(printOrder[i].totalQuantity),
                customPrintFloat(printOrder[i].length),
                printOrder[i].unit,
                printOrder[i].posunitcalcprice,
                printOrder[i].possumweight,
                printOrder[i].type,
                printOrder[i].remark,
                printOrder[i].date,
            ].join(';')
        );

        printOrder.push(...printOrder[i].children);
    }

    //debugPrint(outputLines.join('\r\n'));

    return outputLines.join('\r\n');
}

function debugPrint(data) {
    fs.writeFileSync(path.join(__dirname, 'debug.txt'), data);
}
function debugPrint2(data) {
    fs.writeFileSync(path.join(__dirname, 'debug2.txt'), data);
}

function parseDoppelmayerInvoiceFromString(raw) {
    //Remove headers and footers
    raw = raw.replace(/^[\s\S]+?Nettobetrag/g, '');
    raw = raw.replaceAll(/Bank für Tirol[\s\S]+?Nettobetrag/g, '');

    //Remove all side Text;
    raw = raw.replaceAll(/INSERT_YOUR_DEP plotted: nek/g, '');

    let parts = raw.split(/\.{5,}/g);

    parts.pop(); //Removing the unneeded stuff at the bottom;

    let articles = [];

    for (let i = 0; i < parts.length; i++) {
        let matches = parts[i].match(
            /(\d+\/\d+)\s+(\d+)\s+(.+?)(\d+,\d+)\s+(\w+)\s+((?:\d+\.)*\d+,\d+) \/ (?:(?:\d+\.)*\d+,\d+)\s+(?:\d+\.)*\d+,\d+\s+(?:\d+\.)*\d+,\d+[\S\s]+?Lieferdatum\s+(\d+\.\d+\.\d+)[\S\s]+?Zeichnungs Nr\.\s+(.+)/
        );

        let article = {
            nr: matches[1],
            mva: matches[2],
            name: matches[3].trim(),
            quantitycalculated: customParseFloat(matches[4]),
            totalQuantity: customParseFloat(matches[4]),
            length: 0,
            unit: matches[5],
            posunitcalcprice: matches[6],
            date: matches[7],
            darwingNr: matches[8],
            remark: '',
            type: '',
        };

        let lines = parts[i].trim().split(/\r*\n/);
        for (let j = 1; j < lines.length; j++) {
            lines[j] = lines[j].trim();
            if (lines[j].length < 2) {
                continue;
            }

            if (!(lines[j].startsWith('Zeichnungs Nr.') || lines[j].startsWith('Lieferdatum'))) {
                article.remark += lines[j] + '\\n';
            }
        }

        parts[i] = article;
    }

    return parts;
}

function parseDoppelmayerPositionFromString(raw) {
    let parent = raw.match(/\d{7,}/)[0];

    raw = raw.replaceAll(/INSERT_YOUR_DEP plotted: \w+/g, '');
    raw = raw.split(/Ges\. Gewicht\s+/)[1];
    raw = raw.replaceAll(/(\,)+Einstufige Produktstruktur.+Seite:\s+\d+\s+/g, '');

    if (parent === '10014518') {
        debugPrint2(raw);
    }

    let articles = [];

    let parts = raw.split(/\s+?(?=\d+\s*\w+\s+(?:\d+|LEER)\s+(?:R|C))/);

    for (let i = 0; i < parts.length; i++) {
        let match = parts[i].match(
            /(\d+) \w+\s+(\d+)\s+\S+\s+((?:\d+\.)?\d+,\d+)\s*([A-z]+)\s+(.+?)\s+(\w+\.\w)?\s+((?:\d+\.)?\d+,\d{3})\s+(?:\d+\.)?\d+,\d+/
        );

        if (!match) {
            continue;
        }

        let lines = parts[i].split(/\r*\n/);
        let nonEmtpyLines = [];

        lines[1] = lines[1].replace(/\d+/, '');
        lines[1] = lines[1].replace(/^\s+(\d+,\d+)?/, '');
        lines[1] = lines[1].replace(/(\w+\s{5,20})?\d+,\d+/, '');

        for (let j = 1; j < lines.length; j++) {
            lines[j] = lines[j].replace(/^\s+\d+,\d+\s*$/, '');
            lines[j] = lines[j].replace(/SIEHE STUECKLISTE/, '');
            lines[j] = lines[j].replace(/\s{1,3}O(\s+0)?\s{1,3}/, '');
            lines[j] = lines[j].replace(/\s+R\d+\s*/, '');
            lines[j] = lines[j].replace(/(\w)?\/E.+\s+(\d+,\d+|\?)\s*$/, '');
            lines[j] = lines[j].replace(/\d+,\d+\s+=.+$/, '');
            lines[j] = lines[j].trim();
            if (lines[j] !== '') {
                nonEmtpyLines.push(lines[j]);
            }
        }

        let article = {
            nr: match[1],
            list: parent,
            mva: match[2],
            topPosition: '',
            name: match[5],
            darwingNr: match[6],
            quantitycalculated: customParseFloat(match[3]),
            totalQuantity: 0,
            length: 0,
            unit: match[4],
            posunitcalcprice: '',
            possumweight: match[7],
            type: '',
            remark: '',
            date: '',
        };

        if (article.unit === 'pcs') {
            article.remark = nonEmtpyLines.join('\\n');
        } else if (article.unit === 'm') {
            article.length = article.quantitycalculated;
            article.quantitycalculated = 1;
        }

        articles.push(article);
    }

    return articles;
}

function findChildren(article, list) {
    article.children = [];
    for (const position of list) {
        if (position.list == article.mva) {
            if (article.topPosition) {
                position.topPosition = article.topPosition;
            } else {
                position.topPosition = article.mva;
            }
            article.children.push({ ...position });
        }
    }

    if (article.children.length > 0) {
        if (article.children.length == 1 && article.children[0].unit === 'kg') {
            article.type = 'Laserteil';
        } else {
            article.type = 'Baugruppe';
        }
    } else {
        if (article.unit == 'kg') {
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
        child.nr = article.nr + '.' + child.nr;
        child.totalQuantity = article.totalQuantity * child.quantitycalculated;
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
    parseBrigantoFromFile,
    parseBrigantoFromString,
    parseDoppelmayerFromFiles,
    parseDoppelmayerInvoiceFromString,
    parseDoppelmayerPositionFromString,
};
