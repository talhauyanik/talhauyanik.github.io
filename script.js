import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAkmtB79Rt1gzfRb7-R5hBaXhNln6hcAlA",
    authDomain: "sensordata-e720d.firebaseapp.com",
    databaseURL: "https://sensordata-e720d-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "sensordata-e720d",
    storageBucket: "sensordata-e720d.firebasestorage.app",
    messagingSenderId: "134640996581",
    appId: "1:134640996581:web:33da07f917360256a2040c",
    measurementId: "G-B32EC2D1E6"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dataRef = ref(db, "sensorData");

let labels = [];
let temperatureData = [];
let humidityData = [];

const ctx = document.getElementById("sensorChart").getContext("2d");
const sensorChart = new Chart(ctx, {
    type: "line",
    data: {
        labels: labels,
        datasets: [
            { label: "Temperature (°C)", data: temperatureData, borderColor: "red", fill: false },
            { label: "Humidity (%)", data: humidityData, borderColor: "blue", fill: false }
        ]
    },
    options: {
        responsive: true,
        scales: {
            x: { title: { display: true, text: "Zaman" } },
            y: { title: { display: true, text: "Değer" } }
        }
    }
});

function formatTimestamp(unixTimestamp) {
    return new Date(unixTimestamp * 1000).toLocaleString();
}

onValue(dataRef, (snapshot) => {
    const data = snapshot.val();
    labels.length = 0;
    temperatureData.length = 0;
    humidityData.length = 0;
    
    Object.keys(data).forEach((key) => {
        labels.push(formatTimestamp(parseInt(data[key].timestamp)));
        temperatureData.push(data[key].temperature);
        humidityData.push(data[key].humidity);
    });

    sensorChart.update();
});

function filterData(range) {
    const now = Math.floor(Date.now() / 1000);
    let minTimestamp = 0;

    switch (range) {
        case '1h': minTimestamp = now - 3600; break;
        case '3h': minTimestamp = now - 10800; break;
        case '6h': minTimestamp = now - 21600; break;
        case '12h': minTimestamp = now - 43200; break;
        case '1d': minTimestamp = now - 86400; break;
        case '3d': minTimestamp = now - 259200; break;
        case '1w': minTimestamp = now - 604800; break;
        case '1m': minTimestamp = now - 2592000; break;
        case '3m': minTimestamp = now - 7776000; break;
        case '6m': minTimestamp = now - 15552000; break;
        case '1y': minTimestamp = now - 31536000; break;
        case 'all': minTimestamp = 0; break;
    }

    const filteredLabels = [];
    const filteredTemp = [];
    const filteredHumidity = [];

    Object.keys(dataRef).forEach((key) => {
        const timestamp = parseInt(dataRef[key].timestamp);
        if (timestamp >= minTimestamp) {
            filteredLabels.push(formatTimestamp(timestamp));
            filteredTemp.push(dataRef[key].temperature);
            filteredHumidity.push(dataRef[key].humidity);
        }
    });

    labels.length = 0;
    labels.push(...filteredLabels);
    temperatureData.length = 0;
    temperatureData.push(...filteredTemp);
    humidityData.length = 0;
    humidityData.push(...filteredHumidity);
    
    sensorChart.update();
}

// Özel tarih seçici için Flatpickr
flatpickr("#customDateRange", {
    mode: "range",
    dateFormat: "Y-m-d H:i",
    enableTime: true,
    onClose: function (selectedDates) {
        if (selectedDates.length === 2) {
            const startTimestamp = Math.floor(selectedDates[0].getTime() / 1000);
            const endTimestamp = Math.floor(selectedDates[1].getTime() / 1000);
            filterDataByCustomRange(startTimestamp, endTimestamp);
        }
    }
});

function filterDataByCustomRange(start, end) {
    const filteredLabels = [];
    const filteredTemp = [];
    const filteredHumidity = [];

    Object.keys(dataRef).forEach((key) => {
        const timestamp = parseInt(dataRef[key].timestamp);
        if (timestamp >= start && timestamp <= end) {
            filteredLabels.push(formatTimestamp(timestamp));
            filteredTemp.push(dataRef[key].temperature);
            filteredHumidity.push(dataRef[key].humidity);
        }
    });

    labels.length = 0;
    labels.push(...filteredLabels);
    temperatureData.length = 0;
    temperatureData.push(...filteredTemp);
    humidityData.length = 0;
    humidityData.push(...filteredHumidity);

    sensorChart.update();
}
