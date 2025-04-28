const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

function prepareTempDir() {
  const tempDir = path.join(__dirname, 'temp');
  if (fs.existsSync(tempDir)) {
    // Remove all files and subdirectories inside temp
    fs.readdirSync(tempDir).forEach(file => {
      const curPath = path.join(tempDir, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        fs.rmSync(curPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(curPath);
      }
    });
  } else {
    fs.mkdirSync(tempDir);
  }
}

function prepare_input_dir() {
  const inputDir = path.join(__dirname, 'temp/input');
  fs.mkdirSync(inputDir);
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  prepareTempDir();


  prepare_input_dir();



  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  ipcMain.on('saveFiles', (event, filesData) => {
    filesData.forEach(file => {
      console.log(file);
      fs.writeFileSync(path.join(__dirname, 'temp/input', file.name), Buffer.from(file.buffer));
    });
  });
  ipcMain.on('sendContext', (event, context) => {
    context = JSON.parse(context);
    var config_csv = '';
    context.experiment_list.forEach((experiment, idx) => {
        config_csv += experiment.name + ',' + experiment.conditions_number;
        experiment.conditions.forEach((condition, idx) => {
            config_csv += ',' + condition;
        });
        config_csv += '\n';
    });
    fs.writeFileSync('temp/config.csv', config_csv);
    const exper_num = context.experiment_list.length;

    exec(`lcdata temp/input temp/config.csv temp/output ${exper_num}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing lcdata: ${error}`);
            return;
        }
        console.log(stdout);
    });
  });

  // Open the DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  app.quit()
})