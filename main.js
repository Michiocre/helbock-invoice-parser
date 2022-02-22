// Modules to control application life and create native browser window
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const lib = require('./src/lib.js');

let window;

let config;

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
    //window.webContents.openDevTools();

    let configPath = path.join(app.getPath('userData'), 'config.json');

    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(
            configPath,
            `{
    "outputPath": "./Output.csv",
    "inputPath": "./Bestellung.pdf",
    "inputFolder": "./out"
}`
        );
    }
    config = JSON.parse(fs.readFileSync(configPath).toString());

    let execPath = process.env.PORTABLE_EXECUTABLE_DIR || app.getAppPath();

    if (config.outputPath.startsWith('./')) {
        config.outputPath = path.join(execPath, path.normalize(config.outputPath.substring(2)));
    }

    if (config.inputPath.startsWith('./')) {
        config.inputPath = path.join(execPath, path.normalize(config.inputPath.substring(2)));
    }

    if (config.inputFolder.startsWith('./')) {
        config.inputFolder = path.join(execPath, path.normalize(config.inputFolder.substring(2)));
    }
});

ipcMain.on('exit', () => {
    app.quit();
});

ipcMain.on('openDialog', async (event, args) => {
    window.webContents.send('openDialog', { caller: args[1], data: await dialog.showOpenDialog(window, args[0]) });
});

ipcMain.on('briganto', (event, args) => {
    window.webContents.send('briganto', { path: config.inputPath, exists: fs.existsSync(config.inputPath) });
});

ipcMain.on('processBriganto', async (event, args) => {
    fs.writeFileSync(config.outputPath, await lib.parseBrigantoFromFile(config.inputPath));

    window.webContents.send('processBriganto', { fileName: path.parse(config.inputPath).base, path: config.outputPath });
});

ipcMain.on('doppelmayer', (event, args) => {
    window.webContents.send('doppelmayer', { fileName: config.inputPath, folder: config.inputFolder, exists: fs.existsSync(config.inputPath) });
});

ipcMain.on('processDoppelmayer', async (event, args) => {
    fs.writeFileSync(config.outputPath, await lib.parseDoppelmayerFromFiles(config.inputPath, config.inputFolder));

    window.webContents.send('processDoppelmayer', {
        fileName: path.parse(config.inputPath).base,
        folder: path.parse(config.inputFolder).base,
        outputPath: config.outputPath,
    });
});
