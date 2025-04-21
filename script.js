import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, get, query, orderByChild, startAt,update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";import firebaseConfig from './config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dataRef = ref(db, "sensorData");

let labels = [];
let temperatureData = [];
let humidityData = [];

document.querySelectorAll(".filter-container button").forEach(button => {
    button.addEventListener("click", function () {
        document.querySelectorAll(".filter-container button").forEach(btn => btn.classList.remove("active"));
        this.classList.add("active");
    });
});

// grafik ayarları
const ctx = document.getElementById("sensorChart").getContext("2d"); 
const sensorChart = new Chart(ctx, {
    type: "line",
    data: {
        labels: labels,
        datasets: [
            { 
                label: "Sıcaklık (°C)", 
                data: temperatureData, 
                borderColor:"rgb(233, 75, 17)", 
                backgroundColor: "rgba(255, 165, 0, 0.2)",
                fill: true,
                pointRadius: 1, 
                pointHoverRadius: 7
            },
            {
                label: "Nem (%)", 
                data: humidityData, 
                borderColor: "rgb(76, 117, 153)", 
                backgroundColor: "rgb(229, 242, 251)",
                fill: true,
                pointRadius: 1, 
                pointHoverRadius: 7
            }
        ]
    },
    options: {
        animation:{
            duration:300,
            easing:"easeOutQuint",
        },
        responsive: true,
        maintainAspectRatio: false, // En-boy oranını devre dışı bırakın
    layout: {
        padding: {
            top: 10,
            bottom: 10
        }
    },
        scales: {
            x: { 
                title: { display: true, text: "Zaman" },
                type: "time", // Zaman tipi ekseni ayarlandı
                time: {
                    unit: "minute", // Görünüm düzeni dakika olarak belirlendi
                    tooltipFormat: "MMM d, HH:mm", // Tooltip görünümü
                    displayFormats: {
                        minute: "HH:mm", // Eksen üzerindeki format
                        hour: "MMM d, HH:mm",
                        day: "MMM d",
                        month: "MMM yyyy"   // Saat dilimi (ihtiyaca göre genişletilebilir)
                    }
                },
                ticks: {
                    autoSkip: true, // Gereksiz verileri atlar
                    maxTicksLimit: 10, // Eksen üzerindeki etiket sayısını sınırla
                    //stepSize: 5 // Varsayılan adım boyutu (gerekirse dinamik olarak değişir)
                }
            },
            y: { 
                title: { display: true, text: "Değer" } 
            }
        },
        interaction: {
            intersect: false,
            mode: "index", 
            
        },
        plugins: {
            tooltip: {
                enabled: true,
                mode: "index",
                intersect: false,
                backgroundColor: "white",
                titleColor: "black",
                bodyColor: "black",
                borderColor: "rgba(0,0,0,0.2)",
                borderWidth: 1,
                titleFont: { weight: "bold" }
            },
            legend:{
                labels:{
                    boxWidth:40,
                    padding:10,
                    useBorderRadius:true,
                }
            }
        }
    }
});

function formatTimestamp(unixTimestamp) {
    return unixTimestamp * 1000; // Unix Timestamp'i milisaniyeye çevir.
}


function updateLatestValues(temp, humidity, timestamp) {
    document.getElementById("latestTemperature").textContent = temp.toFixed(1);
    document.getElementById("latestHumidity").textContent = humidity.toFixed(1);
    document.getElementById("lastUpdatedTime").textContent = new Date(timestamp * 1000).toLocaleString("tr-TR", {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
        const tempElement = document.getElementById("latestTemperature");
        const humidityElement = document.getElementById("latestHumidity");
    
        tempElement.textContent = temp.toFixed(1);
        humidityElement.textContent = humidity.toFixed(1);
    
        // Flash animasyonunu tetikleyin
        tempElement.classList.add("flash");
        humidityElement.classList.add("flash");
    
        // Animasyon tamamlandıktan sonra sınıfı kaldırın
        setTimeout(() => {
            tempElement.classList.remove("flash");
            humidityElement.classList.remove("flash");
        }, 500);
    
}
setInterval(() => {
    // En son veriyi çekmek için sorgu
    const latestQuery = query(dataRef, orderByChild("timestamp"));
    get(latestQuery).then(snapshot => {
        const data = snapshot.val();
        if (data) {
            const latest = Object.values(data)
                .map(v => ({ ...v, timestamp: parseInt(v.timestamp) }))
                .sort((a, b) => b.timestamp - a.timestamp)[0];
            if (latest) {
                updateLatestValues(latest.temperature, latest.humidity, latest.timestamp);
            }
        }
    });
}, 60000); // 60000 ms = 1 dakika

function adjustCanvasHeight() {
    const container = document.querySelector(".canvas-container");
    const width = container.offsetWidth; // Kapsayıcının genişliğini alın
    container.style.height = (width * 7 / 16) + "px"; // Yüksekliği 16:9 oranında ayarla
}

window.addEventListener("resize", adjustCanvasHeight); // Ekran boyutu değiştikçe yeniden hesaplar
adjustCanvasHeight(); // Sayfa yüklendiğinde çalıştır



function downsampleData(labels, temp, hum, maxPoints) {
    const total = labels.length;
    if (total <= maxPoints) return { labels, temp, hum };

    const step = Math.ceil(total / maxPoints);
    const dsLabels = [];
    const dsTemp = [];
    const dsHum = [];
    for (let i = 0; i < total; i += step) {
        dsLabels.push(labels[i]);
        dsTemp.push(temp[i]);
        dsHum.push(hum[i]);
    }
    return { labels: dsLabels, temp: dsTemp, hum: dsHum };
}
function filterData(range) {
    const now = Math.floor(Date.now() / 1000);
    let minTimestamp = 0;
    let maxPoints = 500;

    switch (range) {
        case '30m': minTimestamp = now - 1800; break;
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
        default: minTimestamp = now - 1800; break;
    }

    

    // Önce sayısal olarak dene
    let queryRef = query(
        dataRef,
        orderByChild("timestamp"),
        startAt(minTimestamp)
    );

    get(queryRef).then((snapshot) => {
        let data = snapshot.exists() ? snapshot.val() : null;

        // Eğer veri gelmezse, string olarak tekrar dene
        if (!data && minTimestamp !== 0) {
            queryRef = query(
                dataRef,
                orderByChild("timestamp"),
                startAt(minTimestamp.toString())
            );
            return get(queryRef);
        }
        return { val: () => data };
    }).then((snapshot) => {
        const data = snapshot.val();
        labels.length = 0;
        temperatureData.length = 0;
        humidityData.length = 0;
        let latestEntry = null;

        if (data) {
            const sortedData = Object.entries(data)
                .map(([_, v]) => ({ ...v, timestamp: parseInt(v.timestamp) }))
                .sort((a, b) => a.timestamp - b.timestamp)
                .filter(entry => entry.timestamp >= minTimestamp);
        
            sortedData.forEach(entry => {
                labels.push(formatTimestamp(entry.timestamp));
                temperatureData.push(entry.temperature);
                humidityData.push(entry.humidity);
                if (!latestEntry || entry.timestamp > latestEntry.timestamp) {
                    latestEntry = entry;
                }
            });
        
            // Sadece 1 gün ve üzeri aralıklarda downsample uygula
            if (
                range === '1d' || range === '3d' || range === '1w' ||
                range === '1m' || range === '3m' || range === '6m' ||
                range === '1y' || range === 'all'
            ) {maxPoints = 300;
                const ds = downsampleData(labels, temperatureData, humidityData, maxPoints);
                labels.length = 0;
                labels.push(...ds.labels);
                temperatureData.length = 0;
                temperatureData.push(...ds.temp);
                humidityData.length = 0;
                humidityData.push(...ds.hum);
            }
            const timeRange = Math.abs(now - minTimestamp);
            if (timeRange > 30 * 24 * 60 * 60) { // 7 günden büyük aralıklar
                sensorChart.options.scales.x.time.unit = "month"; // Ay birimi
                sensorChart.options.scales.x.ticks.stepSize = 1; // Her 1 ayda bir göster
            } else if (timeRange > 72 * 60 * 60) { // 1 günden büyük aralıklar
                sensorChart.options.scales.x.time.unit = "day"; // Gün birimi
                sensorChart.options.scales.x.ticks.stepSize = 1; // Her gün için bir etiket
            } else if (timeRange > 60 * 60) { // Saatlik aralıklar
                sensorChart.options.scales.x.time.unit = "hour"; // Saat birimi
                sensorChart.options.scales.x.ticks.stepSize = 1; // Her saat bir etiket
            } else {
                sensorChart.options.scales.x.time.unit = "minute"; // Dakika birimi
                sensorChart.options.scales.x.ticks.stepSize = 5; // Her 5 dakikada bir
            }
            sensorChart.update();

            if (latestEntry) {
                updateLatestValues(latestEntry.temperature, latestEntry.humidity, latestEntry.timestamp);
            }
        } else {
            sensorChart.update();
        }
    }).catch((err) => {
        console.error("Firebase error:", err);
    });
}

////////////// Özel tarih aralığı seçimi //////////////
flatpickr("#startDate", { enableTime: true, dateFormat: "Y-m-d H:i" });
flatpickr("#endDate", { enableTime: true, dateFormat: "Y-m-d H:i" });

const startDate = new Date(document.getElementById("startDate").value).getTime() / 1000; 
const endDate = new Date(document.getElementById("endDate").value).getTime() / 1000;

console.log("Başlangıç Tarihi:", startDate);
console.log("Bitiş Tarihi:", endDate);

function applyCustomDateFilter() {
    const startDate = new Date(document.getElementById("startDate").value).getTime() / 1000; 
    const endDate = new Date(document.getElementById("endDate").value).getTime() / 1000;
    
    if (!startDate || !endDate || startDate >= endDate) {
        alert("Lütfen geçerli bir başlangıç ve bitiş tarihi seçin!");
        return;
    }

    onValue(dataRef, (snapshot) => {
        const data = snapshot.val();
        const filteredLabels = [];
        const filteredTemp = [];
        const filteredHumidity = [];

        Object.keys(data).forEach((key) => {
            const timestamp = parseInt(data[key].timestamp);
            if (timestamp >= startDate && timestamp <= endDate) {
                filteredLabels.push(formatTimestamp(timestamp));
                filteredTemp.push(data[key].temperature);
                filteredHumidity.push(data[key].humidity);
            }
        });

        // Zaman aralığını hesaplayın
        const timeRange = Math.abs(endDate - startDate); // Tarih aralığı (saniye cinsinden)
        let maxPoints = 500;
        if (timeRange >= 24 * 60 * 60) { // 1 gün ve üzeri aralıklar için
            maxPoints = 300;
        }

        // Downsample uygula (gerekirse)
        let ds = { labels: filteredLabels, temp: filteredTemp, hum: filteredHumidity };
        if (filteredLabels.length > maxPoints) {
            ds = downsampleData(filteredLabels, filteredTemp, filteredHumidity, maxPoints);
        }

        // Grafiği güncelle
        labels.length = 0;
        labels.push(...ds.labels);
        temperatureData.length = 0;
        temperatureData.push(...ds.temp);
        humidityData.length = 0;
        humidityData.push(...ds.hum);

        // Eksen birimini ayarla
        if (timeRange > 30 * 24 * 60 * 60) { // 7 günden büyük bir aralık için
            sensorChart.options.scales.x.time.unit = "month";
            sensorChart.options.scales.x.ticks.stepSize = 1;
        } else if (timeRange > 72 * 60 * 60) { // 1 günden büyük bir aralık için
            sensorChart.options.scales.x.time.unit = "day";
            sensorChart.options.scales.x.ticks.stepSize = 1;
        } else if (timeRange > 60 * 60) { // Saatlik aralıklar
            sensorChart.options.scales.x.time.unit = "hour";
            sensorChart.options.scales.x.ticks.stepSize = 1;
        } else {
            sensorChart.options.scales.x.time.unit = "minute";
            sensorChart.options.scales.x.ticks.stepSize = 5;
        }

        sensorChart.update();
    });
}


// Sayfa yüklendiğinde varsayılan filtreyi uygula
function selectDefaultFilter() {
    // "1d" butonunu aktif yap
    const defaultBtn = document.querySelector('.filter-container button[data-range="1d"]');
    if (defaultBtn) {
        defaultBtn.classList.add("active");
    }
    filterData('1d');
}

window.addEventListener("DOMContentLoaded", selectDefaultFilter);
window.filterData = filterData;
window.applyCustomDateFilter = applyCustomDateFilter;