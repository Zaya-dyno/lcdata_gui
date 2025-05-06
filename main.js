const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');
const archiver = require('archiver');
const userBin = path.join(require('os').homedir(), 'bin');
const userLocalBin = path.join(require('os').homedir(), '.local', 'bin');

// Get a writable temp directory outside the asar archive
const tempBaseDir = path.join(app.getPath('userData'), 'temp');


function prepareTempDir() {
  if (fs.existsSync(tempBaseDir)) {
    // Remove all files and subdirectories inside temp
    fs.readdirSync(tempBaseDir).forEach(file => {
      const curPath = path.join(tempBaseDir, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        fs.rmSync(curPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(curPath);
      }
    });
  } else {
    fs.mkdirSync(tempBaseDir, { recursive: true });
  }
}

function prepare_input_dir() {
  const inputDir = path.join(tempBaseDir, 'input');
  fs.mkdirSync(inputDir, { recursive: true });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: true
    }
  });

  prepareTempDir();


  prepare_input_dir();

  mainWindow.webContents.on('before-input-event', (_, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.isDevToolsOpened()
        ? mainWindow.webContents.closeDevTools()
        : mainWindow.webContents.openDevTools()
    }
  })


  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  ipcMain.on('saveFiles', (event, filesData) => {
    filesData.forEach(file => {
      fs.writeFileSync(path.join(tempBaseDir, 'input', file.name), Buffer.from(file.buffer));
    });
  });
  ipcMain.handle('sendContext', async (event, context) => {
    context = JSON.parse(context);
    var config_csv = '';
    context.experiment_list.forEach((experiment, idx) => {
        config_csv += experiment.name + ',' + experiment.conditions_number;
        experiment.conditions.forEach((condition, idx) => {
            config_csv += ',' + condition;
        });
        config_csv += '\n';
    });
    fs.writeFileSync(path.join(tempBaseDir, 'config.csv'), config_csv);
    const exper_num = context.experiment_list.length;

    // Create a custom env with user bin paths
    try {
      execSync(`lcdata "${path.join(tempBaseDir, 'input')}" "${path.join(tempBaseDir, 'config.csv')}" "${path.join(tempBaseDir, 'output')}" ${exper_num}`);
    } catch (error) {
      return {error: error.message};
    }
    const outputDir = path.join(tempBaseDir, 'output');
    const zipPath = path.join(tempBaseDir, 'output.zip');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', async () => {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save Output Zip',
        defaultPath: 'output.zip',
        filters: [{ name: 'Zip Files', extensions: ['zip'] }]
      });

      if (!canceled && filePath) {
        fs.copyFileSync(zipPath, filePath);
        event.sender.send('outputSaved', filePath);
      } else {
        event.sender.send('outputSaveCanceled');
      }
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);
    archive.directory(outputDir, false);
    archive.finalize();
    return {message: 'Save output zip file'};
    });

  // Open the DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(async () => {
  // Dynamically import fix-path (ESM)
  const fixPath = (await import('fix-path')).default;
  fixPath();

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  app.quit()
})