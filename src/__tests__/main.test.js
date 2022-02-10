let lib = require('../lib.js');
let path = require('path');
let fs = require('fs');

let brigantoExFolder = path.join(__dirname, 'brigantoExamples');
let doppelMayerExFolder = path.join(__dirname, '/doppelmayerExamples');
if (fs.existsSync(brigantoExFolder) || fs.existsSync(doppelMayerExFolder)) {
    if (fs.existsSync(brigantoExFolder)) {
        describe('Briganto tests', () => {
            fs.readdirSync(brigantoExFolder).forEach((file) => {
                parts = file.split('.');
                if (parts[1] !== 'txt') {
                    return;
                }

                let resultPath = parts[0] + '.result';
                let resultFile = path.join(brigantoExFolder, resultPath);

                if (!fs.existsSync(resultFile)) {
                    return;
                }

                it('file ' + file + ' should be processes into the corresponding result', () => {
                    let inputFile = path.join(brigantoExFolder, file);
                    let result = fs.readFileSync(resultFile).toString();

                    expect(lib.parseBrigantoFromFile(inputFile)).toStrictEqual(result);
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
}
