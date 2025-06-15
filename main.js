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
  }
  fs.mkdirSync(tempBaseDir, { recursive: true });
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
  ipcMain.on('saveFiles', (event, filesData, config) => {
    filesData.forEach(file => {
      if (config) {
        fs.writeFileSync(path.join(tempBaseDir, file.name), Buffer.from(file.buffer));
      } else {
        fs.writeFileSync(path.join(tempBaseDir, 'input', file.name), Buffer.from(file.buffer));
      }
    });
  });
  ipcMain.handle('run_lcdata', async (event) => {

    // Make sure the config.json file exist.
    // if it don't exist, wait for 1 second and check again.
    while (!fs.existsSync(path.join(tempBaseDir, 'config.json'))) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    // Create a custom env with user bin paths
    try {
      execSync(`lcdata "${path.join(tempBaseDir, 'input')}" "${path.join(tempBaseDir, 'config.json')}" "${path.join(tempBaseDir, 'output')}"`);
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