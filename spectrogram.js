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

    // Frequenzband-Elemente
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

    // Feste maximale Frequenz auf 10 kHz
    const maxFreq = 10000;

    // Farbverlauf wie zuvor (anpassbar)
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0.0, '#FFFF00'); // oben (10 kHz)
    gradient.addColorStop(0.25, '#ADFF2F');
    gradient.addColorStop(0.5, '#00CED1');
    gradient.addColorStop(0.75, '#008B8B');
    gradient.addColorStop(1.0, '#00008B'); // unten (0 Hz)

    // Hintergrund füllen
    ctx.fillStyle = '#000000';
    ctx.fillRect(0,0,width,height);

    // Koordinaten für Achsen
    const leftMargin = 40;
    const bottomMargin = 20;
    const usableWidth = width - leftMargin;
    const usableHeight = height - bottomMargin;

    // Funktion zum Mapping von Frequenz auf Y-Koordinate
    function freqToY(freq) {
        // freq=0 Hz unten, freq=10 kHz oben
        const ratio = freq / maxFreq;
        return usableHeight - Math.round(ratio * usableHeight);
    }

    // Zeit- und Frequenzachsen zeichnen
    function drawAxes() {
        ctx.save();
        ctx.strokeStyle = 'white';
        ctx.fillStyle = 'white';
        ctx.lineWidth = 1;
        ctx.font = '10px sans-serif';

        // Y-Achse für Frequenz
        ctx.beginPath();
        ctx.moveTo(leftMargin, 0);
        ctx.lineTo(leftMargin, usableHeight);
        ctx.stroke();

        // X-Achse für Zeit
        ctx.beginPath();
        ctx.moveTo(leftMargin, usableHeight);
        ctx.lineTo(width, usableHeight);
        ctx.stroke();

        // Frequenz-Ticks bei 0, 2k, 4k, 6k, 8k, 10k Hz
        const freqTicks = [0, 2000, 4000, 6000, 8000, 10000];
        freqTicks.forEach(f => {
            const y = freqToY(f);
            ctx.beginPath();
            ctx.moveTo(leftMargin - 5, y);
            ctx.lineTo(leftMargin, y);
            ctx.stroke();
            ctx.fillText(f + ' Hz', 5, y+3);
        });

        // Zeitbeschriftung (0 s rechts, negative Zeit nach links)
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

    function drawSpectrogram() {
        // Spektrogramm um 1px nach links verschieben
        const imageData = ctx.getImageData(leftMargin+1, 0, usableWidth-1, usableHeight); 
        ctx.putImageData(imageData, leftMargin, 0);

        analyser.getByteFrequencyData(dataArray);

        // Neue Spalte rechts einzeichnen
        for (let i = 0; i < bufferLength; i++) {
            // Frequenz dieses Bin
            // Die Analyser liefert Frequenzen bis Nyquist, aber wir mappen linear auf 0..10kHz
            // Berechne Frequenz dieses Bins:
            const nyquist = audioCtx.sampleRate / 2;
            const binFreq = (i / bufferLength) * nyquist; 
            // Wenn binFreq > maxFreq, werden wir darüber keinen sinnvollen Wert haben,
            // aber wir können einfach weitermachen: dann ist oben ggf. leer.
            if (binFreq <= maxFreq) {
                const value = dataArray[i];
                const percent = value / 255.0;
                const y = freqToY(binFreq);
                ctx.globalAlpha = percent;
                ctx.fillStyle = gradient;
                ctx.fillRect(width - 1, y, 1, 1);
            }
        }

        ctx.globalAlpha = 1.0;

        // Frequenzlinien für Elektroden
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;

        const lowFreq = parseFloat(lowFreqInput.value);
        const midFreq = parseFloat(midFreqInput.value);
        const highFreq = parseFloat(highFreqInput.value);

        const yLow = freqToY(lowFreq);
        ctx.beginPath();
        ctx.moveTo(width - 1, yLow);
        ctx.lineTo(width - 5, yLow);
        ctx.stroke();

        const yMid = freqToY(midFreq);
        ctx.beginPath();
        ctx.moveTo(width - 1, yMid);
        ctx.lineTo(width - 5, yMid);
        ctx.stroke();

        const yHigh = freqToY(highFreq);
        ctx.beginPath();
        ctx.moveTo(width - 1, yHigh);
        ctx.lineTo(width - 5, yHigh);
        ctx.stroke();

        // Achsen überzeichnen
        drawAxes();

        requestAnimationFrame(drawSpectrogram);
    }

    // Start
    ctx.fillStyle = '#000000';
    ctx.fillRect(0,0,width,height);
    drawAxes();
    drawSpectrogram();
})();
