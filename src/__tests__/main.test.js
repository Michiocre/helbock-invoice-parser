let lib = require('../lib.js');
let fs = require('fs');

let exampleFile = __dirname + '/exampleTest.txt';
let exampleContent = fs.readFileSync(exampleFile).toString();
let outputFile = __dirname + '/Output.csv';

let header = 'POS;MENGE;EINHEIT;ARTIKEL;EINZELPREIS;BETRAG;WÄHRUNG;BEZEICHNUNG';

let expectedContent = [
    '10;3,00;stk;FT-01;267,00;801,00;EUR;Artikel 1',
    '20;3,00;stk;FT-01;267,00;801,00;EUR;Artikel 1',
    '30;3,00;stk;FT-01;267,00;801,00;EUR;Artikel 1',
    '40;3,00;stk;FT-01;267,00;801,00;EUR;Artikel 1',
    '50;3,00;stk;FT-01;267,00;801,00;EUR;Artikel 1',
    '50;3,00;stk;FT-01;267,00;801,00;EUR;Artikel 1',
];

describe('manual tests', () => {
    it('Briganto string should return the exact output corresponding to the input', () => {
        expect(lib.parseBriganFromString(exampleContent)).toStrictEqual(expectedContent);
    });

    it('Briganto file should return the exact output corresponding to the input', () => {
        lib.parseBriganFromFiles([exampleFile], outputFile);

        expect(fs.readFileSync(outputFile).toString()).toBe(header + '\n' + expectedContent.join('\n'));
    });
});

describe('automated tests', () => {
    let brigandoExFolder = __dirname + '/brigandoExamples';
    if (fs.existsSync(brigandoExFolder)) {
        describe('brigando tests', () => {
            fs.readdirSync(brigandoExFolder).forEach((folder) => {
                let files = fs.readdirSync(brigandoExFolder + '\\' + folder);
                it('folder ' + folder + ' should contain 2 files, one txt one result', () => {
                    expect(files.length).toBe(2);
                    expect(files[0].split('.')[1]).toBe('txt');
                    expect(files[1].split('.')[1]).toBe('json');
                });

                it('folder ' + folder + ' example should be valid.', () => {
                    let input = fs.readFileSync(brigandoExFolder + '\\' + folder + '\\' + files[0]).toString();
                    let result = JSON.parse(fs.readFileSync(brigandoExFolder + '\\' + folder + '\\' + files[1]).toString());

                    expect(lib.parseBriganFromString(input)).toStrictEqual(result);
                });
            });
        });
    }
});
