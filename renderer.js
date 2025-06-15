// This file is executed in the renderer process

document.getElementById('dirForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const inputDirFiles = document.getElementById('inputDir').files;
    const fileArray = Array.from(inputDirFiles);
    const filteredFileArray = fileArray.filter(path => path.webkitRelativePath.endsWith('.csv'));
    
    // First process and save CSV files
    Promise.all(filteredFileArray.map(file => {
        return file.arrayBuffer().then(buffer => ({
            name: file.webkitRelativePath.split('/').pop(),
            buffer: buffer
        }));
    }))
    .then(filesData => {
        // Save CSV files first
        return window.electronAPI.saveFiles(filesData);
    })
    .then(() => {
        // After CSV files are saved, process and save config file
        const configFile = document.getElementById("configFile").files[0].arrayBuffer().then(buffer => ({
            name: "config.json",
            buffer: buffer
        }));
        return Promise.all([configFile]);
    })
    .then(filesData => {
        // Save config file after CSV files are done
        return window.electronAPI.saveFiles(filesData, config=true);
    })
    .catch(error => {
        console.error('Error processing files:', error);
    });

    window.electronAPI.run_lcdata();

    window.location.href = 'result.html';
});