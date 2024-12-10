(async function() {
    const canvas = document.getElementById('spectrogramCanvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Audio Setup
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024; 
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    source.connect(analyser);

    // Elemente für Frequenzbänder (annehmen, dass sie in spectrogram.html definiert sind)
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

    function freqToIndex(freq) {
        const nyquist = audioCtx.sampleRate / 2;
        return Math.round(freq / nyquist * bufferLength);
    }

    // Einen Farbverlauf für das Spektrogramm erstellen, um ein ähnliches Farbfeeling wie bei maztr.com zu erreichen
    // Wir nehmen einen vertikalen Verlauf von unten (tiefe Frequenzen) nach oben (hohe Frequenzen).
    // Unten dunklere Farben, oben hellere.
    // Du kannst die Farben nach Belieben anpassen.
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0.0, '#00008B'); // Dunkelblau unten
    gradient.addColorStop(0.25, '#008B8B'); 
    gradient.addColorStop(0.5, '#00CED1'); 
    gradient.addColorStop(0.75, '#ADFF2F'); 
    gradient.addColorStop(1.0, '#FFFF00'); // Helles Gelb oben

    // Hintergrund füllen
    ctx.fillStyle = '#000000';
    ctx.fillRect(0,0,width,height);

    // Optionale Parameter für Zeit und Frequenzachsen
    const leftMargin = 40;
    const bottomMargin = 20;
    const usableWidth = width - leftMargin;
    const usableHeight = height - bottomMargin;

    // Zeichnen der Achsen
    function drawAxes() {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.fillStyle = 'white';
        ctx.lineWidth = 1;
        ctx.font = '10px sans-serif';

        // Y-Achse (Frequenz)
        ctx.beginPath();
        ctx.moveTo(leftMargin, 0);
        ctx.lineTo(leftMargin, usableHeight);
        ctx.stroke();

        // X-Achse (Zeit)
        ctx.beginPath();
        ctx.moveTo(leftMargin, usableHeight);
        ctx.lineTo(width, usableHeight);
        ctx.stroke();

        // Frequenzbeschriftungen
        const nyquist = audioCtx.sampleRate / 2;
        const freqTicks = [0, 1000, 2000, 4000, Math.round(nyquist)];
        freqTicks.forEach(f => {
            const fi = freqToIndex(f);
            const y = usableHeight - Math.round((fi / bufferLength) * usableHeight);
            ctx.beginPath();
            ctx.moveTo(leftMargin - 5, y);
            ctx.lineTo(leftMargin, y);
            ctx.stroke();
            ctx.fillText(f + ' Hz', 5, y+3);
        });

        // Zeitbeschriftung (einfach annehmen, ~60fps)
        // Rechte Seite = jetzt = 0s
        const secondsPerPixel = 1/60;
        const totalSeconds = usableWidth * secondsPerPixel;
        for (let t = 0; t >= -totalSeconds; t -= 1) {
            const xPos = leftMargin + ((-t) / secondsPerPixel);
            if (xPos >= leftMargin && xPos <= width) {
                ctx.beginPath();
                ctx.moveTo(xPos, usableHeight);
                ctx.lineTo(xPos, usableHeight + 5);
                ctx.stroke();
                ctx.fillText(t + ' s', xPos - 10, height - 5);
            }
        }

        ctx.restore();
    }

    // Zeichnen des Spektrogramms mit verschobenem Hintergrund
    function drawSpectrogram() {
        // Bestehendes Bild nach links schieben
        const imageData = ctx.getImageData(leftMargin+1, 0, usableWidth-1, usableHeight); 
        ctx.putImageData(imageData, leftMargin, 0);

        analyser.getByteFrequencyData(dataArray);

        // Neue Spalte am rechten Rand
        // Wir verwenden den Farbverlauf "gradient" nicht direkt pixelweise.
        // Stattdessen kombinieren wir die Amplitude mit dem Verlauf.
        for (let i = 0; i < bufferLength; i++) {
            const value = dataArray[i];
            const percent = value / 255.0;
            const y = usableHeight - Math.round((i / bufferLength) * usableHeight);

            // Wir erstellen aus gradient eine Farbe, indem wir mit globalAlpha arbeiten
            ctx.globalAlpha = percent;  
            ctx.fillStyle = gradient;
            ctx.fillRect(width - 1, y, 1, 1);
        }

        ctx.globalAlpha = 1.0; // Alpha zurücksetzen

        // Frequenzlinien für die Elektroden
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        const yLow = usableHeight - Math.round((freqToIndex(parseFloat(lowFreqInput.value))/bufferLength)*usableHeight);
        ctx.beginPath();
        ctx.moveTo(width - 1, yLow);
        ctx.lineTo(width - 5, yLow);
        ctx.stroke();

        const yMid = usableHeight - Math.round((freqToIndex(parseFloat(midFreqInput.value))/bufferLength)*usableHeight);
        ctx.beginPath();
        ctx.moveTo(width - 1, yMid);
        ctx.lineTo(width - 5, yMid);
        ctx.stroke();

        const yHigh = usableHeight - Math.round((freqToIndex(parseFloat(highFreqInput.value))/bufferLength)*usableHeight);
        ctx.beginPath();
        ctx.moveTo(width - 1, yHigh);
        ctx.lineTo(width - 5, yHigh);
        ctx.stroke();

        // Achsen neu darüber zeichnen
        drawAxes();

        requestAnimationFrame(drawSpectrogram);
    }

    // Start
    ctx.fillStyle = '#000000';
    ctx.fillRect(0,0,width,height);
    drawAxes();
    drawSpectrogram();
})();
