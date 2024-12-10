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
    analyser.fftSize = 512; // kleiner für schnelleres Rendering
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    source.connect(analyser);

    // Frequenzband Input-Elemente und Labels
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

    // Hilfsfunktion: Frequenz zu Index im Frequenz-Array
    function freqToIndex(freq) {
        const nyquist = audioCtx.sampleRate / 2;
        return Math.round(freq / nyquist * bufferLength);
    }

    // Hintergrundfarbe (z. B. dunkles Blau)
    ctx.fillStyle = '#001080';
    ctx.fillRect(0,0,width,height);

    // Funktion zum Zeichnen der Achsen
    function drawAxes() {
        ctx.save();
        ctx.strokeStyle = 'white';  // Helle Farbe für dunklen Hintergrund
        ctx.fillStyle = 'white';
        ctx.lineWidth = 1;
        ctx.font = '10px sans-serif';

        // Y-Achse links bei x=40
        ctx.beginPath();
        ctx.moveTo(40, 0);
        ctx.lineTo(40, height-20); // Bis kurz vor den X-Achsen-Bereich
        ctx.stroke();

        // X-Achse unten
        ctx.beginPath();
        ctx.moveTo(40, height-20);
        ctx.lineTo(width, height-20);
        ctx.stroke();

        // Frequenzbeschriftung (Y-Achse)
        const nyquist = audioCtx.sampleRate / 2;
        const freqTicks = [0, 1000, 2000, 3000, 4000, Math.round(nyquist)];
        freqTicks.forEach(f => {
            const fi = freqToIndex(f);
            const y = height - 20 - Math.round((fi / bufferLength)*(height-21));
            // Markierungslinie
            ctx.beginPath();
            ctx.moveTo(35, y);
            ctx.lineTo(40, y);
            ctx.stroke();
            // Text
            ctx.fillText(f + ' Hz', 5, y+3);
        });

        // Zeitbeschriftung (X-Achse)
        // Annahme: ~60 FPS -> jede Spalte ~ 1/60 s
        // Rechte Seite = 0 s (jetzt)
        const secondsPerPixel = 1/60;
        const totalSeconds = (width - 40)*secondsPerPixel;
        for (let t = 0; t >= -totalSeconds; t -= 1) {
            const xPos = 40 + ((-t) / secondsPerPixel);
            if (xPos >= 40 && xPos <= width) {
                ctx.beginPath();
                ctx.moveTo(xPos, height - 20);
                ctx.lineTo(xPos, height - 15);
                ctx.stroke();
                ctx.fillText(t + ' s', xPos - 10, height - 5);
            }
        }

        ctx.restore();
    }

    function drawSpectrogram() {
        // Spektrogramm um 1px nach links verschieben
        // Nur den Bereich oberhalb der X-Achse und rechts der Y-Achse verschieben (x>40, y<height-20)
        const imageData = ctx.getImageData(41, 0, width-41, height-21); 
        ctx.putImageData(imageData, 40, 0);

        // Neue Spalte am rechten Rand zeichnen
        analyser.getByteFrequencyData(dataArray);

        // Hintergrund für die neue Spalte
        ctx.fillStyle = '#001080'; // Dunkles Blau für Hintergrund
        ctx.fillRect(width-1, 0, 1, height-21);

        for (let i = 0; i < bufferLength; i++) {
            const value = dataArray[i];
            const percent = value / 255.0;
            const y = height - 21 - Math.round((i / bufferLength) * (height-21));
            const hue = Math.round((1 - percent) * 240); 
            ctx.fillStyle = 'hsl(' + hue + ',100%,' + (percent * 50 + 25) + '%)';
            ctx.fillRect(width - 1, y, 1, 1);
        }

        // Frequenzlinien für die definierten "Elektroden"
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        const yLow = height - 21 - Math.round((freqToIndex(parseFloat(lowFreqInput.value))/bufferLength)*(height-21));
        ctx.beginPath();
        ctx.moveTo(width - 1, yLow);
        ctx.lineTo(width - 5, yLow);
        ctx.stroke();

        const yMid = height - 21 - Math.round((freqToIndex(parseFloat(midFreqInput.value))/bufferLength)*(height-21));
        ctx.beginPath();
        ctx.moveTo(width - 1, yMid);
        ctx.lineTo(width - 5, yMid);
        ctx.stroke();

        const yHigh = height - 21 - Math.round((freqToIndex(parseFloat(highFreqInput.value))/bufferLength)*(height-21));
        ctx.beginPath();
        ctx.moveTo(width - 1, yHigh);
        ctx.lineTo(width - 5, yHigh);
        ctx.stroke();

        // Achsen zuletzt zeichnen, damit sie über dem Spektrogramm liegen
        drawAxes();

        requestAnimationFrame(drawSpectrogram);
    }

    // Initiales Zeichnen
    ctx.fillStyle = '#001080';
    ctx.fillRect(0,0,width,height);
    drawAxes();
    drawSpectrogram();

})();
