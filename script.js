import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import firebaseConfig from './config.js';


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
function adjustCanvasHeight() {
    const container = document.querySelector(".canvas-container");
    const width = container.offsetWidth; // Kapsayıcının genişliğini alın
    container.style.height = (width * 7 / 16) + "px"; // Yüksekliği 16:9 oranında ayarla
}

window.addEventListener("resize", adjustCanvasHeight); // Ekran boyutu değiştikçe yeniden hesaplar
adjustCanvasHeight(); // Sayfa yüklendiğinde çalıştır

onValue(dataRef, (snapshot) => {
    const data = snapshot.val();
    labels.length = 0;
    temperatureData.length = 0;
    humidityData.length = 0;

    let latestEntry = null;

    Object.keys(data).forEach((key) => {
        labels.push(formatTimestamp(parseInt(data[key].timestamp)));
        temperatureData.push(data[key].temperature);
        humidityData.push(data[key].humidity);

        // En yeni veriyi bulmak için karşılaştırma yap
        if (!latestEntry || parseInt(data[key].timestamp) > parseInt(latestEntry.timestamp)) {
            latestEntry = data[key];
        }
    });

    // Eğer en yeni veri varsa, HTML'deki etiketleri güncelle
    if (latestEntry) {
        updateLatestValues(latestEntry.temperature, latestEntry.humidity, latestEntry.timestamp);
    }

    const timeRange = Math.abs(endDate - startDate); // Tarih aralığını hesapla (saniye cinsinden)

    // StepSize ve Unit ayarı
    if (timeRange > 7 * 24 * 60 * 60) { // 7 günden büyük aralıklar
        sensorChart.options.scales.x.time.unit = "month"; // Ay birimi
        sensorChart.options.scales.x.ticks.stepSize = 1; // Her 1 ayda bir göster
    } else if (timeRange > 24 * 60 * 60) { // 1 günden büyük aralıklar
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
});


function filterData(range) {
    const now = Math.floor(Date.now() / 1000);
    let minTimestamp = 0;

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
    }

    onValue(dataRef, (snapshot) => {
        const data = snapshot.val();
        const filteredLabels = [];
        const filteredTemp = [];
        const filteredHumidity = [];

        Object.keys(data).forEach((key) => {
            const timestamp = parseInt(data[key].timestamp);
            if (timestamp >= minTimestamp) {
                filteredLabels.push(formatTimestamp(timestamp));
                filteredTemp.push(data[key].temperature);
                filteredHumidity.push(data[key].humidity);
            }
        });
        const timeRange = Math.abs(now - minTimestamp);
        if (timeRange > 7 * 24 * 60 * 60) { // 7 günden büyük aralıklar
            sensorChart.options.scales.x.time.unit = "month"; // Ay birimi
            sensorChart.options.scales.x.ticks.stepSize = 1; // Her 1 ayda bir göster
        } else if (timeRange > 24 * 60 * 60) { // 1 günden büyük aralıklar
            sensorChart.options.scales.x.time.unit = "day"; // Gün birimi
            sensorChart.options.scales.x.ticks.stepSize = 1; // Her gün için bir etiket
        } else if (timeRange > 60 * 60) { // Saatlik aralıklar
            sensorChart.options.scales.x.time.unit = "hour"; // Saat birimi
            sensorChart.options.scales.x.ticks.stepSize = 1; // Her saat bir etiket
        } else {
            sensorChart.options.scales.x.time.unit = "minute"; // Dakika birimi
            sensorChart.options.scales.x.ticks.stepSize = 5; // Her 5 dakikada bir
        }
        labels.length = 0;
        labels.push(...filteredLabels);
        temperatureData.length = 0;
        temperatureData.push(...filteredTemp);
        humidityData.length = 0;
        humidityData.push(...filteredHumidity);
        
        sensorChart.update();
    });
}

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
        if (timeRange > 7 * 24 * 60 * 60) { // 7 günden büyük bir aralık için
            sensorChart.options.scales.x.time.unit = "month"; // X ekseni birimi ay olsun
            sensorChart.options.scales.x.ticks.stepSize = 1; // Her 1 ayda bir göster
        } else if (timeRange > 24 * 60 * 60) { // 1 günden büyük bir aralık için
            sensorChart.options.scales.x.time.unit = "day"; // X ekseni birimi gün olsun
            sensorChart.options.scales.x.ticks.stepSize = 1; // Her gün için bir etiket
        } else if (timeRange > 60 * 60) { // Saatlik aralıklar
            sensorChart.options.scales.x.time.unit = "hour"; // Saat birimi
            sensorChart.options.scales.x.ticks.stepSize = 1; // Her saat bir etiket
        } else {
            sensorChart.options.scales.x.time.unit = "minute"; // Dakika birimi
            sensorChart.options.scales.x.ticks.stepSize = 5; // Her 5 dakikada bir
        }

        // Grafiği güncelle
        labels.length = 0;
        labels.push(...filteredLabels);
        temperatureData.length = 0;
        temperatureData.push(...filteredTemp);
        humidityData.length = 0;
        humidityData.push(...filteredHumidity);

        sensorChart.update();
    });
}





window.filterData = filterData;
window.applyCustomDateFilter = applyCustomDateFilter;

