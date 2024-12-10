// script.js

let audioCtx;
let analyser;
let dataArray;
let bufferLength;
let frequencyBands = [
    {elementId: 'electrode1', labelId: 'label1', min: 200, max: 400},
    {elementId: 'electrode2', labelId: 'label2', min: 400, max: 800},
    {elementId: 'electrode3', labelId: 'label3', min: 800, max: 1600},
    {elementId: 'electrode4', labelId: 'label4', min: 1600, max: 3200},
    {elementId: 'electrode5', labelId: 'label5', min: 3200, max: 6000}
];

let threshold = 50; // Startwert

document.getElementById('threshold').addEventListener('input', (e) => {
    threshold = parseInt(e.target.value);
    document.getElementById('thresholdValue').textContent = threshold;
});

const bandInputs = [
    {minId: 'band1Min', bandIndex: 0},
    {minId: 'band2Min', bandIndex: 1},
    {minId: 'band3Min', bandIndex: 2},
    {minId: 'band4Min', bandIndex: 3},
    {minId: 'band5Min', bandIndex: 4}
];

bandInputs.forEach(bandInput => {
    const input = document.getElementById(bandInput.minId);
    input.addEventListener('input', () => {
        updateFrequencyBands();
    });
});

function updateFrequencyBands() {
    // Wir gehen davon aus, dass jede min-Value der nächste max-Wert für das vorherige Band ist.
    // Z.B.: Band1: min=200, nächste min=400 => Band1 max = 400
    // Der letzte max-Wert bleibt fix bei 6000 Hz im Beispiel
    const vals = bandInputs.map((b, i) => parseInt(document.getElementById(b.minId).value));
    // Sortiere sie aufsteigend, um Fehler zu vermeiden:
    vals.sort((a, b) => a - b);
    // Wir setzen jetzt die Frequenzbänder neu:
    // Wir gehen davon aus:
    // electrode1: min=vals[0], max=vals[1]
    // electrode2: min=vals[1], max=vals[2]
    // electrode3: min=vals[2], max=vals[3]
    // electrode4: min=vals[3], max=vals[4]
    // electrode5: min=vals[4], max=6000 (fix)
    frequencyBands[0].min = vals[0];
    frequencyBands[0].max = vals[1];
    frequencyBands[1].min = vals[1];
    frequencyBands[1].max = vals[2];
    frequencyBands[2].min = vals[2];
    frequencyBands[2].max = vals[3];
    frequencyBands[3].min = vals[3];
    frequencyBands[3].max = vals[4];
    frequencyBands[4].min = vals[4];
    frequencyBands[4].max = 6000;

    // Labels aktualisieren
    frequencyBands.forEach(band => {
        const labelEl = document.getElementById(band.labelId);
        if (labelEl) {
            labelEl.textContent = `${band.min}-${band.max} Hz`;
        }
    });

}

// Audio-Setup
(async function setupAudio() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        source.connect(analyser);
        update();
    } catch (err) {
        console.error('Mikrofonzugriff verweigert oder Fehler aufgetreten:', err);
    }
})();

function freqToIndex(freq) {
    const nyquist = audioCtx.sampleRate / 2;
    return Math.round(freq / nyquist * bufferLength);
}

function update() {
    requestAnimationFrame(update);
    if (!analyser) return;
    analyser.getByteFrequencyData(dataArray);

    // Alle Elektroden deaktivieren
    frequencyBands.forEach(band => {
        const el = document.getElementById(band.elementId);
        if (el) {
            el.classList.remove('active');
        }
    });

    // Frequenzbänder analysieren
    frequencyBands.forEach(band => {
        const startIndex = freqToIndex(band.min);
        const endIndex = freqToIndex(band.max);
        
        let sum = 0;
        let count = 0;
        for (let i = startIndex; i < endIndex && i < dataArray.length; i++) {
            sum += dataArray[i];
            count++;
        }
        const avg = count > 0 ? sum / count : 0;

        if (avg > threshold) {
            const el = document.getElementById(band.elementId);
            if (el) {
                el.classList.add('active');
            }
        }
    });
}
