// Modules to control application life and create native browser window
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
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

ipcMain.on('openDialog', async (event, args) => {
    window.webContents.send('openDialog', { caller: args[1], data: await dialog.showOpenDialog(window, args[0]) });
});

ipcMain.on('processBriganto', async (event, args) => {
    let outputPath = app.getAppPath() + '\\Output.csv';
    lib.parseBrigantoFiles(args, outputPath);
    let fileNames = [];
    args.forEach((filePath) => {
        fileNames.push(filePath.split('\\').pop());
    });
    window.webContents.send('processBriganto', { fileNames, outputPath });
});
