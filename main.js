// Modules to control application life and create native browser window
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const lib = require('./src/lib.js');

let window;

app.whenReady().then(() => {
    // Create the browser window.
    window = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'src/preload.js'),
        },
    });

    // and load the index.html of the app.
    window.loadFile('src/index.html');

    // Open the DevTools.
    window.webContents.openDevTools();
});

ipcMain.on('exit', () => {
    app.quit();
});

ipcMain.on('openDialog', async (event, args) => {
    window.webContents.send('openDialog', { caller: args[1], data: await dialog.showOpenDialog(window, args[0]) });
});

ipcMain.on('processBriganto', async (event, args) => {
    let outputPath = app.getAppPath() + '\\Output.csv';

    let processed = lib.parseBrigantoFromFiles(args);
    fs.writeFileSync(outputPath, processed);

    let fileNames = [];
    args.forEach((filePath) => {
        fileNames.push(filePath.split('\\').pop());
    });
    window.webContents.send('processBriganto', { fileNames, outputPath });
});

ipcMain.on('processDoppelmayer', async (event, args) => {
    let outputPath = app.getAppPath() + '\\Output.csv';

    let processed = lib.parseDoppelmayerFromFiles(args.dmFile, args.dmOutFolder);
    fs.writeFileSync(outputPath, processed);

    window.webContents.send('processDoppelmayer', {
        dmFile: args.dmFile.split('\\').pop(),
        dmOutFolder: args.dmOutFolder.split('\\').pop(),
        outputPath,
    });
});
