let dotNetReference = null;
let recognition = null;
let mediaStream = null;
let audioContext = null;
let analyser = null;
let levelFrame = 0;
let levelBuffer = null;
let restartTimer = 0;
let recognitionRequested = false;
let manualStop = false;
let lastLevelSent = 0;
let restartAttempts = 0;
let lastSpeechError = "";

const maxRestartAttempts = 3;
const fatalSpeechErrors = new Set(["not-allowed", "service-not-allowed", "language-not-supported", "audio-capture"]);

const SpeechRecognitionCtor = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;

export function initialize(reference) {
    dotNetReference = reference;
}

export function getCapabilities() {
    return {
        speechSupported: Boolean(SpeechRecognitionCtor),
        mediaSupported: Boolean(navigator.mediaDevices?.getUserMedia),
        audioSupported: Boolean(AudioContextCtor),
        isSecureContext: Boolean(globalThis.isSecureContext),
        recognitionName: SpeechRecognitionCtor?.name ?? ""
    };
}

export async function start(language) {
    if (!dotNetReference) {
        throw new Error("Blazor callback reference is not initialized.");
    }

    if (!SpeechRecognitionCtor) {
        throw new Error("SpeechRecognition is not available in this browser.");
    }

    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not available in this browser.");
    }

    if (!AudioContextCtor) {
        throw new Error("Web Audio API is not available in this browser.");
    }

    await stopInternal(false);
    recognitionRequested = true;
    manualStop = false;
    restartAttempts = 0;
    lastSpeechError = "";

    try {
        await startAudioMeter();
        startRecognition(language);
    } catch (error) {
        await stopInternal(false);
        throw error;
    }
}

export async function stop() {
    await stopInternal(true);
    await notifyStatus("Gestoppt.", false);
}

export async function dispose() {
    await stopInternal(true);
    dotNetReference = null;
}

async function startAudioMeter() {
    mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        }
    });

    audioContext = new AudioContextCtor();
    if (audioContext.state === "suspended") {
        await audioContext.resume();
    }

    const source = audioContext.createMediaStreamSource(mediaStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    levelBuffer = new Uint8Array(analyser.fftSize);
    source.connect(analyser);
    pumpLevel(0);
}

function startRecognition(language) {
    recognition = new SpeechRecognitionCtor();
    recognition.lang = language;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        lastSpeechError = "";
        notifyStatus("Hore zu...", true);
    };

    recognition.onresult = event => {
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const result = event.results[i];
            const transcript = result[0]?.transcript ?? "";
            safeInvoke("HandleTranscript", transcript, result.isFinal);

            if (transcript.trim()) {
                restartAttempts = 0;
            }
        }
    };

    recognition.onerror = event => {
        lastSpeechError = event.error;
        const message = mapSpeechError(event.error);
        safeInvoke("HandleError", message);

        if (fatalSpeechErrors.has(event.error)) {
            recognitionRequested = false;
            stopAudioMeter();
            notifyStatus(message, false);
        }
    };

    recognition.onend = () => {
        if (!recognitionRequested || manualStop) {
            if (!lastSpeechError) {
                notifyStatus("Gestoppt.", false);
            }
            return;
        }

        restartAttempts += 1;
        if (restartAttempts > maxRestartAttempts) {
            recognitionRequested = false;
            stopAudioMeter();
            notifyStatus("Spracherkennung wurde nach mehreren automatischen Neustarts beendet.", false);
            return;
        }

        notifyStatus("Spracherkennung pausiert, starte neu...", true);
        restartTimer = globalThis.setTimeout(() => {
            try {
                recognition?.start();
            } catch (error) {
                safeInvoke("HandleError", `Neustart fehlgeschlagen: ${error.message}`);
            }
        }, 250);
    };

    recognition.start();
}

function pumpLevel(timestamp) {
    if (!analyser || !levelBuffer) {
        return;
    }

    analyser.getByteTimeDomainData(levelBuffer);

    let sum = 0;
    for (const sample of levelBuffer) {
        const normalized = (sample - 128) / 128;
        sum += normalized * normalized;
    }

    const rms = Math.sqrt(sum / levelBuffer.length);
    const level = Math.min(1, rms * 4);

    if (timestamp - lastLevelSent > 100) {
        lastLevelSent = timestamp;
        safeInvoke("HandleLevel", level);
    }

    levelFrame = globalThis.requestAnimationFrame(pumpLevel);
}

async function stopInternal(sendFinalStop) {
    recognitionRequested = false;
    manualStop = true;
    globalThis.clearTimeout(restartTimer);

    if (recognition) {
        if (sendFinalStop) {
            recognition.onerror = null;
            recognition.onstart = null;
        } else {
            recognition.onend = null;
            recognition.onerror = null;
            recognition.onresult = null;
            recognition.onstart = null;
        }

        try {
            if (sendFinalStop) {
                recognition.stop();
            } else {
                recognition.abort();
            }
        } catch {
            // Some browsers throw when recognition is already stopped.
        }

        recognition = null;
    }

    await stopAudioMeter();
}

async function stopAudioMeter() {
    if (levelFrame) {
        globalThis.cancelAnimationFrame(levelFrame);
        levelFrame = 0;
    }

    analyser = null;
    levelBuffer = null;
    lastLevelSent = 0;

    if (mediaStream) {
        for (const track of mediaStream.getTracks()) {
            track.stop();
        }
        mediaStream = null;
    }

    if (audioContext) {
        await audioContext.close();
        audioContext = null;
    }

    safeInvoke("HandleLevel", 0);
}

function mapSpeechError(error) {
    return `Spracherkennung: ${error}. Browser/Plattform kann Online-Dienste oder Berechtigungen erfordern.`;
}

function notifyStatus(message, active) {
    return safeInvoke("HandleStatus", message, active);
}

function safeInvoke(method, ...args) {
    if (!dotNetReference) {
        return undefined;
    }

    return dotNetReference.invokeMethodAsync(method, ...args).catch(() => {
        // Blazor can be disposed while browser callbacks are still unwinding.
    });
}
