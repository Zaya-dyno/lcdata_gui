function compare_file_names(a, b) {
    // Extract file names
    const nameA = a.split('/').pop().replace('.csv', '');
    const nameB = b.split('/').pop().replace('.csv', '');

    // Regex to extract parts: e.g., A_B1_raw or A_B2_subtracted
    // Groups: [1]=first letter, [2]=letter before number, [3]=number, [4]=raw/subtracted
    const regex = /^([A-Z])_([A-Z])(\d+)_(raw|subtracted)$/i;

    const matchA = nameA.match(regex);
    const matchB = nameB.match(regex);

    if (!matchA || !matchB) return nameA.localeCompare(nameB);

    // Compare first letter
    if (matchA[1] !== matchB[1]) {
        return matchA[1].localeCompare(matchB[1]);
    }
    // Compare letter before number
    if (matchA[2] !== matchB[2]) {
        return matchA[2].localeCompare(matchB[2]);
    }
    // Compare number (as integer)
    const numA = parseInt(matchA[3], 10);
    const numB = parseInt(matchB[3], 10);
    if (numA !== numB) {
        return numA - numB;
    }
    // "raw" before "subtracted"
    if (matchA[4].toLowerCase() !== matchB[4].toLowerCase()) {
        return matchA[4].toLowerCase() === 'raw' ? -1 : 1;
    }
    return 0;
}
const context = JSON.parse(localStorage.getItem('contextLCDATA') || '{}');
const paths = context.filteredFilePaths;
paths.sort(compare_file_names);
const container = document.getElementById('tables-container');

container.innerHTML = '';
const replica_number = context.replica_number;
const experiment_list = context.experiment_list;
const table = document.createElement('table');
const caption = document.createElement('caption');
caption.textContent = `Configuration table`;
table.appendChild(caption);

// Create table header
const thead = document.createElement('thead');
const headerRow = document.createElement('tr');
const thExp = document.createElement('th');
thExp.textContent = 'Experiment Name';
const thCond = document.createElement('th');
thCond.textContent = 'Condition';
const thFiles = document.createElement('th');
thFiles.textContent = 'Files';
headerRow.appendChild(thExp);
headerRow.appendChild(thCond);
headerRow.appendChild(thFiles);
thead.appendChild(headerRow);
table.appendChild(thead);

// Create table body
const tbody = document.createElement('tbody');
let fileIndex = 0;
const filesPerCondition = 2 * replica_number;

experiment_list.forEach((experiment, idx) => {
    for (let i = 0; i < experiment.conditions_number; i++) {
        const row = document.createElement('tr');

        // Experiment name cell
        const expCell = document.createElement('td');
        expCell.textContent = experiment.name;
        row.appendChild(expCell);

        // Condition cell (editable input)
        const condCell = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `condition_${experiment.name}_${i}`;
        condCell.appendChild(input);
        row.appendChild(condCell);

        // Files cell
        const filesCell = document.createElement('td');
        const filesForThisCondition = paths.slice(fileIndex, fileIndex + filesPerCondition);
        filesForThisCondition.forEach(filePath => {
            const fileDiv = document.createElement('div');
            fileDiv.textContent = filePath.split('/').pop();
            filesCell.appendChild(fileDiv);
        });
        row.appendChild(filesCell);

        fileIndex += filesPerCondition;
        tbody.appendChild(row);
    }
});
table.appendChild(tbody);

container.appendChild(table);

document.getElementById('submit_config').addEventListener('click', async function() {
    context.experiment_list.forEach((experiment, idx) => {
        experiment.conditions = [];
        for (let i = 0; i < experiment.conditions_number; i++) {
            const condition = document.getElementById(`condition_${experiment.name}_${i}`).value;
            experiment.conditions.push(condition);
        }
    });
    
    const result = await window.electronAPI.sendContext(JSON.stringify(context));
    localStorage.setItem('resultLCDATA', JSON.stringify(result));

    window.location.href = '../result.html';
});