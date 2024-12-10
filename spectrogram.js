// Diese Datei führt eine Echtzeitanalyse des Mikrofoneingangs durch, erzeugt ein Spektrogramm
// und zeigt Frequenzbänder für drei beispielhafte Elektroden (low/mid/high).

(async function(){
    const canvas = document.getElementById('spectrogramCanvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Audio Setup
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512; // kleiner für schnelleres Rendering
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    source.connect(analyser);

    // Frequenzband Input-Elemente
    const lowFreqInput = document.getElementById('lowFreq');
    const midFreqInput = document.getElementById('midFreq');
    const highFreqInput = document.getElementById('highFreq');
    const labelLowFreq = document.getElementById('labelLowFreq');
    const labelMidFreq = document.getElementById('labelMidFreq');
    const labelHighFreq = document.getElementById('labelHighFreq');

    function updateLabels() {
        labelLowFreq.textContent = lowFreqInput.value;
        labelMidFreq.textContent = midFreqInput.value;
        labelHighFreq.textContent = highFreqInput.value;
    }

    lowFreqInput.addEventListener('input', updateLabels);
    midFreqInput.addEventListener('input', updateLabels);
    highFreqInput.addEventListener('input', updateLabels);

    updateLabels();

    // Hilfsfunktion: Frequenz zu Index
    function freqToIndex(freq) {
        const nyquist = audioCtx.sampleRate / 2;
        return Math.round(freq / nyquist * bufferLength);
    }

    // Wir schieben das Spektrogramm nach links und malen rechts eine neue Spalte
    function drawSpectrogram() {
        // Verschieben des alten Bildes nach links
        const imageData = ctx.getImageData(1, 0, width - 1, height);
        ctx.putImageData(imageData, 0, 0);

        // Neue Spalte (am rechten Rand) malen
        analyser.getByteFrequencyData(dataArray);

        for (let i = 0; i < bufferLength; i++) {
            const value = dataArray[i];
            const percent = value / 255.0;
            const y = height - Math.round((i / bufferLength) * height) - 1;
            const hue = Math.round((1 - percent) * 240); 
            ctx.fillStyle = 'hsl(' + hue + ',100%,' + (percent * 50 + 25) + '%)';
            ctx.fillRect(width - 1, y, 1, 1);
        }

        // Frequenzbandlinien einzeichnen (optional)
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Linie bei lowFreq
        const lowIndex = freqToIndex(parseFloat(lowFreqInput.value));
        const yLow = height - Math.round((lowIndex / bufferLength) * height);
        ctx.moveTo(width - 1, yLow);
        ctx.lineTo(width - 5, yLow);
        ctx.stroke();

        // Linie bei midFreq
        const midIndex = freqToIndex(parseFloat(midFreqInput.value));
        const yMid = height - Math.round((midIndex / bufferLength) * height);
        ctx.moveTo(width - 1, yMid);
        ctx.lineTo(width - 5, yMid);
        ctx.stroke();

        // Linie bei highFreq
        const highIndex = freqToIndex(parseFloat(highFreqInput.value));
        const yHigh = height - Math.round((highIndex / bufferLength) * height);
        ctx.moveTo(width - 1, yHigh);
        ctx.lineTo(width - 5, yHigh);
        ctx.stroke();

        requestAnimationFrame(drawSpectrogram);
    }

    drawSpectrogram();
})();
