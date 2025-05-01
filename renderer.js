// This file is executed in the renderer process
const experiment_section = document.getElementById('experiment_name');
var experiment_list = [];

function update_experiment_list(){
    if (document.getElementById('experiment_name').value == '' || document.getElementById('experiment_conditions').value == '') {
        alert('Please fill in all fields');
        return;
    }
    if (experiment_list.some(e => e.name === document.getElementById('experiment_name').value)) {
        alert('Experiment name already exists');
        return;
    }
    experiment_list.push({
        name: document.getElementById('experiment_name').value,
        conditions_number: document.getElementById('experiment_conditions').value
    });
    display_experiment_list();
}

function display_experiment_list(){
    const experiment_list_section = document.getElementById('experiment_list');
    experiment_list_section.innerHTML = '';
    experiment_list.forEach(function(experiment) {
        var div = document.createElement('div');
        div.textContent = experiment.name + ':' + experiment.conditions_number;
        button = document.createElement('button');
        button.textContent = 'Delete';
        button.addEventListener('click', function() {
            experiment_list.splice(experiment_list.indexOf(experiment), 1);
            display_experiment_list();
        });
        div.appendChild(button);
        experiment_list_section.appendChild(div);
    });
}

document.getElementById('add_experiment').addEventListener('click', function() {
    event.preventDefault();
    update_experiment_list();
});


document.getElementById('dirForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const inputDirFiles = document.getElementById('inputDir').files;

    const fileArray = Array.from(inputDirFiles);
    const filteredFileArray = fileArray.filter(path => path.webkitRelativePath.endsWith('.csv'));
    
    Promise.all(filteredFileArray.map(file => {
        return file.arrayBuffer().then(buffer => ({
            name: file.webkitRelativePath.split('/').pop(),
            buffer: buffer
            }));
    })).then(filesData => {
        window.electronAPI.saveFiles(filesData);
    })
    // If you want to send the file list to the main process:
    const context = {
        filteredFilePaths: filteredFileArray.map(file => file.webkitRelativePath.split('/').pop()),
        experiment_list: experiment_list,
        replica_number: document.getElementById('replica_number').value,
    }
    localStorage.setItem('contextLCDATA', JSON.stringify(context));
    window.location.href = 'conditions/config.html';
});