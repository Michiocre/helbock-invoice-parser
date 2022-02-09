let lib = require('../lib.js');
let fs = require('fs');

describe('Briganto tests', () => {
    let exampleFile = __dirname + '/brigantoExample.txt';
    let exampleFileOutput = __dirname + '/brigantoExample.json';

    let exampleContent = fs.readFileSync(exampleFile).toString();
    let exampleContentOutput = JSON.parse(fs.readFileSync(exampleFileOutput).toString());

    let header = 'POS;MENGE;EINHEIT;ARTIKEL;EINZELPREIS;BETRAG;WÄHRUNG;BEZEICHNUNG';

    it('Function parseBrigantoFromString should return correct output', () => {
        expect(lib.parseBrigantoFromString(exampleContent)).toStrictEqual(exampleContentOutput);
    });

    it('Function parseBrigantoFromFiles should return correct output', () => {
        expect(lib.parseBrigantoFromFiles([exampleFile])).toBe(header + '\n' + exampleContentOutput.join('\n'));
    });
});

let brigantoExFolder = __dirname + '/brigantoExamples';
let doppelMayerExFolder = __dirname + '/doppelmayerExamples';
if (fs.existsSync(brigantoExFolder) || fs.existsSync(doppelMayerExFolder)) {
    describe('Automated tests', () => {
        if (fs.existsSync(brigantoExFolder)) {
            describe('Briganto tests', () => {
                fs.readdirSync(brigantoExFolder).forEach((file) => {
                    parts = file.split('.');
                    if (parts[1] !== 'txt') {
                        return;
                    }

                    let resultPath = parts[0] + '.json';

                    if (!fs.existsSync(brigantoExFolder + '//' + resultPath)) {
                        return;
                    }

                    it('file ' + file + ' should be processes into the corresponding result', () => {
                        let input = fs.readFileSync(brigantoExFolder + '\\' + file).toString();
                        let result = JSON.parse(fs.readFileSync(brigantoExFolder + '\\' + resultPath).toString());

                        expect(lib.parseBrigantoFromString(input)).toStrictEqual(result);
                    });
                });
            });
        }

        if (fs.existsSync(doppelMayerExFolder)) {
            describe('Doppelmayer tests', () => {
                fs.readdirSync(doppelMayerExFolder).forEach((subFolder) => {
                    let folderName = doppelMayerExFolder + '\\' + subFolder + '\\' + 'out';
                    let fileName = doppelMayerExFolder + '\\' + subFolder + '\\' + 'Bestellung.txt';
                    let outputFile = doppelMayerExFolder + '\\' + subFolder + '\\' + 'Output.txt';

                    it('Processing data in the folder ' + subFolder + ' should be processes into the corresponding result', () => {
                        let output = fs.readFileSync(outputFile).toString();
                        let result = lib.parseDoppelmayerFromFiles(fileName, folderName);
                        expect(result.trim()).toEqual(output.trim());
                    });
                });
            });
        }
    });
}
