let lib = require('../lib.js');
let fs = require('fs');

describe('Briganto tests', () => {
    let exampleFile = __dirname + '/brigandoExample.txt';
    let exampelFileOutput = __dirname + '/brigandoExample.json';

    let exampleContent = fs.readFileSync(exampleFile).toString();
    let exampleContentOutput = JSON.parse(fs.readFileSync(exampelFileOutput).toString());

    let header = 'POS;MENGE;EINHEIT;ARTIKEL;EINZELPREIS;BETRAG;WÄHRUNG;BEZEICHNUNG';

    it('Function parseBriganFromString should return correct output', () => {
        expect(lib.parseBriganFromString(exampleContent)).toStrictEqual(exampleContentOutput);
    });

    it('Function parseBriganFromFiles should return correct output', () => {
        expect(lib.parseBriganFromFiles([exampleFile])).toBe(header + '\n' + exampleContentOutput.join('\n'));
    });
});

let brigandoExFolder = __dirname + '/brigandoExamples';
let doppelMayerExFolder = __dirname + '/doppelmayerExamples';
if (fs.existsSync(brigandoExFolder) || fs.existsSync(doppelMayerExFolder)) {
    describe('Automated tests', () => {
        if (fs.existsSync(brigandoExFolder)) {
            describe('Brigando tests', () => {
                fs.readdirSync(brigandoExFolder).forEach((file) => {
                    parts = file.split('.');
                    if (parts[1] !== 'txt') {
                        return;
                    }

                    let resultPath = parts[0] + '.json';

                    if (!fs.existsSync(brigandoExFolder + '//' + resultPath)) {
                        return;
                    }

                    it('file ' + file + ' should be processes into the corresponding result', () => {
                        let input = fs.readFileSync(brigandoExFolder + '\\' + file).toString();
                        let result = JSON.parse(fs.readFileSync(brigandoExFolder + '\\' + resultPath).toString());

                        expect(lib.parseBriganFromString(input)).toStrictEqual(result);
                    });
                });
            });
        }
    });
}
