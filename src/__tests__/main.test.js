let lib = require('../lib.js');
let path = require('path');
let fs = require('fs');

let brigantoExFolder = path.join(__dirname, 'brigantoExamples');
let doppelMayerExFolder = path.join(__dirname, 'doppelmayerExamples');
if (fs.existsSync(brigantoExFolder) || fs.existsSync(doppelMayerExFolder)) {
    if (fs.existsSync(brigantoExFolder)) {
        describe('Briganto tests', () => {
            fs.readdirSync(brigantoExFolder).forEach((file) => {
                parts = file.split('.');
                if (parts[1] !== 'pdf') {
                    return;
                }

                let resultPath = parts[0] + '.csv';
                let resultFile = path.join(brigantoExFolder, resultPath);

                if (!fs.existsSync(resultFile)) {
                    return;
                }

                let outputPath = path.join(brigantoExFolder, 'output.csv');

                if (fs.existsSync(outputPath)) {
                    fs.rmSync(outputPath);
                }

                it('parseBrigantoFromFile using ' + file + ' should return the correct result', async () => {
                    let inputFile = path.join(brigantoExFolder, file);
                    let expected = fs.readFileSync(resultFile).toString();
                    expect(await lib.parseBrigantoFromFile(inputFile)).toBe(expected);
                });
            });
        });
    }

    if (fs.existsSync(doppelMayerExFolder)) {
        describe('Doppelmayer tests', () => {
            fs.readdirSync(doppelMayerExFolder).forEach((subFolder) => {
                let folderName = path.join(doppelMayerExFolder, subFolder, 'out');
                let fileName = path.join(doppelMayerExFolder, subFolder, 'Bestellung.pdf');
                let outputFile = path.join(doppelMayerExFolder, subFolder, 'Output.csv');

                it('parseDoppelmayerFromFiles using the folder ' + subFolder + ' and the file should return the correct result', async () => {
                    let output = fs.readFileSync(outputFile).toString();
                    let result = await lib.parseDoppelmayerFromFiles(fileName, folderName);
                    expect(result).toEqual(output);
                });
            });
        });
    }
}
