function selectBriganto() {
    document.getElementById('clientSelect').hidden = true;
    document.getElementById('filesBriganto').hidden = false;
    document.getElementById('processBriganto').hidden = true;
    document.getElementById('finishedBriganto').hidden = true;
}

function selectDoppelmayer() {
    dmOutFolder = null;
    dmFile = null;
    document.getElementById('fileDoppelmayer').innerText = dmFile;
    document.getElementById('folderDoppelmayer').innerText = dmFile;
    document.getElementById('clientSelect').hidden = true;
    document.getElementById('filesDoppelmayer').hidden = false;
    document.getElementById('processDoppelmayerButton').disabled = true;
    document.getElementById('finishedDoppelmayer').hidden = true;
}

function clientSelect() {
    document.getElementById('clientSelect').hidden = false;
    document.getElementById('filesBriganto').hidden = true;
    document.getElementById('filesDoppelmayer').hidden = true;
}

function exit() {
    api.send('exit', true);
}

function filesBriganto() {
    api.send('openDialog', [
        {
            properties: ['openFile', 'multiSelections'],
            filters: [{ name: 'Textdateien', extensions: ['txt'] }],
        },
        'briganto',
    ]);
}

let brigantoFiles = [];

api.receive('openDialog', (data) => {
    if (data.data.cancelled) {
        return;
    }
    console.log(data);
    switch (data.caller) {
        case 'briganto':
            brigantoFiles = [];
            let fileNames = [];
            data.data.filePaths.forEach((filePath) => {
                fileNames.push(filePath.split('\\').pop());
                brigantoFiles.push(filePath);
            });
            document.getElementById('namesBriganto').innerText = 'Die Dateien:\n' + fileNames.join('\n') + '\nWurden ausgewählt.';

            document.getElementById('filesBriganto').hidden = true;
            document.getElementById('processBriganto').hidden = false;
            break;
        case 'doppelmayerFile':
            dmFile = data.data.filePaths[0];

            document.getElementById('fileDoppelmayer').innerText = dmFile;

            if (dmFile && dmOutFolder) {
                document.getElementById('processDoppelmayerButton').disabled = false;
            }
            break;
        case 'doppelmayerFolder':
            dmOutFolder = data.data.filePaths[0];

            document.getElementById('folderDoppelmayer').innerText = dmOutFolder;
            if (dmFile && dmOutFolder) {
                document.getElementById('processDoppelmayerButton').disabled = false;
            }
            break;
    }
});

function processBriganto() {
    api.send('processBriganto', brigantoFiles);
}

api.receive('processBriganto', (data) => {
    document.getElementById('outputBriganto').innerText =
        'Die Dateien:\n' + data.fileNames.join('\n') + '\nWurden verarbeitet und in der Datei "' + data.outputPath + '" gespeichert.';

    document.getElementById('processBriganto').hidden = true;
    document.getElementById('finishedBriganto').hidden = false;
});

let dmOutFolder = null;
let dmFile = null;

function bestellungDoppelmayer() {
    api.send('openDialog', [
        {
            properties: ['openFile'],
            filters: [{ name: 'Textdateien', extensions: ['txt'] }],
        },
        'doppelmayerFile',
    ]);
}

function outDoppelmayer() {
    api.send('openDialog', [
        {
            properties: ['openDirectory'],
        },
        'doppelmayerFolder',
    ]);
}

function processDoppelmayer() {
    api.send('processDoppelmayer', { dmFile, dmOutFolder });
}

api.receive('processDoppelmayer', (data) => {
    document.getElementById('outputDoppelmayer').innerText =
        'Die Datei "' +
        data.dmFile +
        '" und der Ordner "' +
        data.dmOutFolder +
        '" wurden verarbeitet und in der Datei "' +
        data.outputPath +
        '" gespeichert.';

    document.getElementById('filesDoppelmayer').hidden = true;
    document.getElementById('finishedDoppelmayer').hidden = false;
});
