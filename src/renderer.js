function selectBriganto() {
    api.send('briganto', true);
}

api.receive('briganto', (data) => {
    document.getElementById('clientSelect').hidden = true;
    document.getElementById('finishedBriganto').hidden = true;

    document.getElementById('processBrigantoText').innerText = 'Die Datei:\n' + data.path + '\nwurde ausgewählt.';
    document.getElementById('processBriganto').hidden = false;
});

function processBriganto() {
    api.send('processBriganto', true);

    document.getElementById('processBriganto').hidden = true;
    document.getElementById('loading').hidden = false;
}

api.receive('processBriganto', (data) => {
    document.getElementById('loading').hidden = true;

    document.getElementById('finishedBrigantoText').innerText =
        'Die Datei "' + data.fileName + ' " wurde verarbeitet und in der Datei "' + data.path + '" gespeichert.';
    document.getElementById('finishedBriganto').hidden = false;
});

function selectDoppelmayer() {
    api.send('doppelmayer', true);
}

api.receive('doppelmayer', (data) => {
    document.getElementById('clientSelect').hidden = true;
    document.getElementById('finishedDoppelmayer').hidden = true;

    document.getElementById('processDoppelmayerText').innerText =
        'Die Datei:\n' + data.fileName + '\nund der Ordner:\n' + data.folder + '\nwurden ausgewählt.';
    document.getElementById('processDoppelmayer').hidden = false;
});

function processDoppelmayer() {
    api.send('processDoppelmayer', true);

    document.getElementById('processDoppelmayer').hidden = true;
    document.getElementById('loading').hidden = false;
}

api.receive('processDoppelmayer', (data) => {
    document.getElementById('loading').hidden = true;
    document.getElementById('outputDoppelmayer').innerText =
        'Die Datei "' +
        data.fileName +
        '" und der Ordner "' +
        data.folder +
        '" wurden verarbeitet und in der Datei "' +
        data.outputPath +
        '" gespeichert.';
    document.getElementById('finishedDoppelmayer').hidden = false;
});

function clientSelect() {
    document.getElementById('clientSelect').hidden = false;
    document.getElementById('processBriganto').hidden = true;
    document.getElementById('finishedBriganto').hidden = true;
    document.getElementById('processDoppelmayer').hidden = true;
    document.getElementById('finishedDoppelmayer').hidden = true;
}

function exit() {
    api.send('exit', true);
}
