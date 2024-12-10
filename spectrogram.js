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
    analyser.fftSize = 512; 
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

    function freqToIndex(freq) {
        const nyquist = audioCtx.sampleRate / 2;
        return Math.round(freq / nyquist * bufferLength);
    }

    // Zeitmessung
    const startTime = performance.now(); 
    const timePerFrame = 1000/60; // ca. 60 FPS
    // Jede Spalte entspricht einem Frame, der rechte Rand ist jetzt=0s,
    // der linke Rand etwa -(width * timePerFrame/1000) Sekunden in der Vergangenheit.

    function drawAxes() {
        // Wir zeichnen Achsen nach dem Spektrogramm.
        ctx.save();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;

        // Y-Achse links
        ctx.beginPath();
        ctx.moveTo(40, 0);
        ctx.lineTo(40, height);
        ctx.stroke();

        // X-Achse unten
        ctx.beginPath();
        ctx.moveTo(40, height - 20);
        ctx.lineTo(width, height - 20);
        ctx.stroke();

        // Frequenzbeschriftung (Y-Achse)
        const nyquist = audioCtx.sampleRate / 2;
        const freqTicks = [0, 1000, 2000, 3000, 4000, Math.round(nyquist)];
        ctx.fillStyle = 'black';
        ctx.font = '10px sans-serif';

        freqTicks.forEach(f => {
            const fi = freqToIndex(f);
            const y = height - Math.round((fi / bufferLength)*height);
            // Markierungslinie
            ctx.beginPath();
            ctx.moveTo(35, y);
            ctx.lineTo(40, y);
            ctx.stroke();
            // Text
            ctx.fillText(f + ' Hz', 5, y+3);
        });

        // Zeitbeschriftung (X-Achse)
        // Rechte Seite = jetzt = 0s
        // Linke Seite ~ negative Zeit.
        // Gesamtbreite = width-40 (da links Achse), jeder Frame ~ 1/60 s
        const totalSeconds = (width - 40) * (timePerFrame/1000);
        // Wir machen alle 1 Sekunde eine Markierung
        for (let t = 0; t >= -totalSeconds; t -= 1) {
            const x = width - ((0 - t) * 1000/timePerFrame); // umwandeln in Pixel
            // Wir müssen die Achse beachten: Nullpunkt der X-Achse ist bei 40px
            const xPos = 40 + ((t * -1) * (1000/timePerFrame));
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
        // Spektrogramm um 1px nach links verschieben (Bilddaten kopieren)
        const imageData = ctx.getImageData(41, 0, width-41, height-21); 
        // Unser "Nutzbereich" ist nun rechts von der Y-Achse (x>40) und über der X-Achse (y<height-20)
        ctx.putImageData(imageData, 40, 0);

        // Neue Spalte rechts generieren
        analyser.getByteFrequencyData(dataArray);

        // Hintergrund für neuen Bereich (rechts) füllen
        ctx.fillStyle = 'white';
        ctx.fillRect(width-1, 0, 1, height-21);

        for (let i = 0; i < bufferLength; i++) {
            const value = dataArray[i];
            const percent = value / 255.0;
            const y = height - 21 - Math.round((i / bufferLength) * (height-21));
            const hue = Math.round((1 - percent) * 240); 
            ctx.fillStyle = 'hsl(' + hue + ',100%,' + (percent * 50 + 25) + '%)';
            ctx.fillRect(width - 1, y, 1, 1);
        }

        // Frequenzlinien für die definierten Elektrodenbänder
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

        // Achsen neu zeichnen
        // Wir zeichnen sie zuletzt, damit sie über dem Spektrogramm liegen
        drawAxes();

        requestAnimationFrame(drawSpectrogram);
    }

    // Initiales leeres Feld + Achsen zeichnen
    ctx.fillStyle = 'white';
    ctx.fillRect(0,0,width,height);
    drawAxes();

    drawSpectrogram();
})();
