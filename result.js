
const resultLCDATA = JSON.parse(localStorage.getItem('resultLCDATA'));
const message = document.getElementById('result_message');

if (resultLCDATA.error) {
    message.innerHTML = resultLCDATA.error;
} else {
    message.innerHTML = resultLCDATA.message;
}

