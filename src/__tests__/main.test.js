let lib = require('../lib.js');
let path = require('path');
let fs = require('fs');

let brigantoExFolder = path.join(__dirname, 'brigantoExamples');
let doppelMayerExFolder = path.join(__dirname, 'doppelmayerExamples');
if (fs.existsSync(brigantoExFolder) || fs.existsSync(doppelMayerExFolder)) {
    if (fs.existsSync(brigantoExFolder)) {
        describe('Briganto tests', () => {
            fs.readdirSync(brigantoExFolder).forEach((file) => {
                let parts = file.split('.');
                if (parts[1] !== 'pdf') {
                    return;
                }

                let resultFile = path.join(brigantoExFolder, parts[0] + '.csv');
                let inputFile = path.join(brigantoExFolder, file);

                if (!fs.existsSync(resultFile)) {
                    it('should generate a debug.txt from ' + file, async () => {
                        let debugPath = path.join(brigantoExFolder, parts[0] + '.txt');
                        fs.writeFileSync(debugPath, await lib.parseBrigantoFromFile(inputFile));
                        expect(fs.existsSync(debugPath)).toBe(true);
                    });
                    return;
                }

                it('parseBrigantoFromFile using ' + file + ' should return the correct result', async () => {
                    let expected = fs.readFileSync(resultFile).toString();
                    expect(await lib.parseBrigantoFromFile(inputFile)).toBe(expected);
                });
            });
        });
    }

    if (fs.existsSync(doppelMayerExFolder)) {
        describe('Doppelmayer tests', () => {
            fs.readdirSync(doppelMayerExFolder).forEach((subFolder) => {
                let folderName = path.join(doppelMayerExFolder, subFolder, 'In');
                let fileName = path.join(doppelMayerExFolder, subFolder, 'Bestellung.pdf');
                let outputFile = path.join(doppelMayerExFolder, subFolder, 'Output.csv');

                if (!fs.existsSync(outputFile)) {
                    it('should create a debug.txt file for the folder ' + subFolder + ' and the file.', async () => {
                        let debugPath = path.join(doppelMayerExFolder, subFolder, 'debug.txt');
                        fs.writeFileSync(debugPath, await lib.parseDoppelmayerFromFiles(fileName, folderName));
                        expect(fs.existsSync(debugPath)).toBe(true);
                    });
                    return;
                }

                it('parseDoppelmayerFromFiles using the folder ' + subFolder + ' and the file should return the correct result', async () => {
                    let output = fs.readFileSync(outputFile).toString();
                    let result = await lib.parseDoppelmayerFromFiles(fileName, folderName);
                    expect(result).toEqual(output);
                });
            });
        });
    }
}
