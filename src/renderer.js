function selectBriganto() {
    document.getElementById('clientSelect').hidden = true;
    document.getElementById('filesBriganto').hidden = false;
    document.getElementById('processBriganto').hidden = true;
    document.getElementById('finishedBriganto').hidden = true;
}

function selectDoppelmayer() {
    document.getElementById('clientSelect').hidden = true;
    document.getElementById('filesDoppelmayer').hidden = false;
    document.getElementById('processDoppelmayer').hidden = true;
    document.getElementById('finishedDoppelmayer').hidden = true;
}

function clientSelect() {
    document.getElementById('clientSelect').hidden = false;
    document.getElementById('filesBriganto').hidden = true;
    document.getElementById('filesDoppelmayer').hidden = true;
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
