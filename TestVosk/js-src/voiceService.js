import { createModel } from 'vosk-browser';

let model = null;
let recognizer = null;
let audioContext = null;
let mediaStream = null;
let sourceNode = null;
let processorNode = null;
let outputNode = null;
let dotNetRef = null;
let activeSessionId = 0;
let audioChunkCount = 0;
let lastLevelReport = 0;
let listeningStartedAt = 0;
let lastVoiceAt = 0;
let emptyPartialCount = 0;
let emptyFinalCount = 0;
let acceptWaveformErrorCount = 0;

function isActiveSession(sessionId) {
    return dotNetRef && sessionId === activeSessionId;
}

function invoke(method, sessionId, ...args) {
    if (!dotNetRef) return;
    try {
        dotNetRef.invokeMethodAsync(method, sessionId, ...args).catch(e => {
            console.warn(`${method} failed:`, e);
        });
    } catch (e) {
        console.warn(`${method} failed:`, e);
    }
}

function invokeIfActive(method, sessionId, ...args) {
    if (!isActiveSession(sessionId)) {
        console.debug(`[Vosk] Ignoriere altes Event aus Session ${sessionId}; aktiv ist ${activeSessionId}`);
        return false;
    }

    invoke(method, sessionId, ...args);
    return true;
}

function reportDiagnostic(message, sessionId = activeSessionId) {
    console.log(`[Vosk s${sessionId}]`, message);
    invokeIfActive('OnDiagnosticCallback', sessionId, message);
}

function reportAudioLevel(samples, sessionId) {
    audioChunkCount += 1;

    let sum = 0;
    let peak = 0;
    for (let i = 0; i < samples.length; i += 1) {
        const value = Math.abs(samples[i]);
        sum += value * value;
        if (value > peak) peak = value;
    }

    const now = performance.now();
    if (now - lastLevelReport < 250) return;

    lastLevelReport = now;
    const rms = Math.sqrt(sum / samples.length);
    if (rms > 0.01 || peak > 0.03) {
        lastVoiceAt = now;
    }

    invokeIfActive('OnAudioLevelCallback', sessionId, rms, peak, audioChunkCount, audioContext?.state || 'unknown');
}

function reportRecognitionTiming(kind, text, sessionId) {
    const now = performance.now();
    const elapsedMs = listeningStartedAt ? Math.round(now - listeningStartedAt) : 0;
    const silenceMs = lastVoiceAt ? Math.round(now - lastVoiceAt) : elapsedMs;
    if (silenceMs > 1000) {
        reportDiagnostic(`${kind} nach ${silenceMs} ms Stille: "${text}"`, sessionId);
    }
    console.debug(`[Vosk s${sessionId}] ${kind} after ${elapsedMs}ms, silence ${silenceMs}ms:`, text);
}

async function loadModel(modelUrl, sessionId) {
    if (model) {
        reportDiagnostic(`Vosk-Modell bereits geladen: ${modelUrl}`, sessionId);
        return model;
    }
    reportDiagnostic(`Lade Vosk-Modell: ${modelUrl}`, sessionId);
    console.log('[Vosk] Loading model from:', modelUrl);
    model = await createModel(modelUrl);
    reportDiagnostic('Vosk-Modell geladen', sessionId);
    console.log('[Vosk] Model loaded');
    return model;
}

async function startListeningInternal(sessionId, sessionRecognizer) {
    const stream = mediaStream;
    audioContext = new AudioContext({ sampleRate: 16000 });
    audioContext.onstatechange = () => {
        reportDiagnostic(`AudioContext: ${audioContext?.state || 'unknown'}`, sessionId);
    };
    reportDiagnostic(`AudioContext erstellt: state=${audioContext.state}, sampleRate=${audioContext.sampleRate}`, sessionId);

    if (audioContext.state === 'suspended') {
        await audioContext.resume();
        reportDiagnostic(`AudioContext nach resume(): ${audioContext.state}`, sessionId);
    }

    sourceNode = audioContext.createMediaStreamSource(stream);

    const scriptNode = audioContext.createScriptProcessor(4096, 1, 1);
    scriptNode.onaudioprocess = (event) => {
        if (!isActiveSession(sessionId) || recognizer !== sessionRecognizer) return;

        const input = event.inputBuffer.getChannelData(0);
        reportAudioLevel(input, sessionId);

        if (sessionRecognizer) {
            try {
                sessionRecognizer.acceptWaveform(event.inputBuffer);
            } catch (e) {
                acceptWaveformErrorCount += 1;
                if (acceptWaveformErrorCount === 1 || acceptWaveformErrorCount % 20 === 0) {
                    reportDiagnostic(`acceptWaveform fehlgeschlagen (${acceptWaveformErrorCount}x): ${e.message || e}`, sessionId);
                }
                console.error('[Vosk] acceptWaveform failed:', e);
            }
        }
    };

    const silenceNode = audioContext.createGain();
    silenceNode.gain.value = 0;

    sourceNode.connect(scriptNode);
    scriptNode.connect(silenceNode);
    silenceNode.connect(audioContext.destination);
    processorNode = scriptNode;
    outputNode = silenceNode;

    reportDiagnostic('Audio-Pipeline verbunden: Mikrofon -> Processor -> stummer Ausgang', sessionId);
}

function stopMicrophone() {
    if (processorNode) {
        processorNode.disconnect();
        processorNode = null;
    }
    if (outputNode) {
        outputNode.disconnect();
        outputNode = null;
    }
    if (sourceNode) {
        sourceNode.disconnect();
        sourceNode = null;
    }
    if (audioContext) {
        audioContext.close().catch(() => {});
        audioContext = null;
    }
    if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        mediaStream = null;
    }
}

function cleanup() {
    if (recognizer) {
        try { recognizer.remove(); } catch (e) { /* ignore */ }
        recognizer = null;
    }
    stopMicrophone();
    audioChunkCount = 0;
    lastLevelReport = 0;
    listeningStartedAt = 0;
    lastVoiceAt = 0;
    emptyPartialCount = 0;
    emptyFinalCount = 0;
    acceptWaveformErrorCount = 0;
}

window.voiceService = {
    async startListening(ref, modelUrl, sessionId) {
        dotNetRef = ref;
        activeSessionId = sessionId;
        cleanup();
        activeSessionId = sessionId;
        listeningStartedAt = performance.now();
        lastVoiceAt = listeningStartedAt;

        try {
            const m = await loadModel(modelUrl, sessionId);
            if (!isActiveSession(sessionId)) return;

            invokeIfActive('OnReadyCallback', sessionId);

            mediaStream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    channelCount: 1,
                    sampleRate: 16000
                }
            });
            if (!isActiveSession(sessionId)) {
                stopMicrophone();
                return;
            }

            const track = mediaStream.getAudioTracks()[0];
            if (track) {
                const settings = track.getSettings ? track.getSettings() : {};
                reportDiagnostic(`Mikrofon-Track: readyState=${track.readyState}, enabled=${track.enabled}, muted=${track.muted}, settings=${JSON.stringify(settings)}`, sessionId);
                track.onmute = () => reportDiagnostic('Mikrofon-Track ist stummgeschaltet', sessionId);
                track.onunmute = () => reportDiagnostic('Mikrofon-Track liefert wieder Audio', sessionId);
                track.onended = () => reportDiagnostic('Mikrofon-Track wurde beendet', sessionId);
            }

            recognizer = new m.KaldiRecognizer(16000);
            const sessionRecognizer = recognizer;

            await startListeningInternal(sessionId, sessionRecognizer);
            if (!isActiveSession(sessionId) || recognizer !== sessionRecognizer) return;

            reportDiagnostic(`Recognizer erstellt: sampleRate=16000, audioContext=${audioContext.sampleRate}`, sessionId);

            sessionRecognizer.on('result', (message) => {
                if (!isActiveSession(sessionId) || recognizer !== sessionRecognizer) return;

                const text = (message.result && message.result.text) || '';
                if (text.trim()) {
                    console.log('[Vosk] Final:', text.trim());
                    reportRecognitionTiming('Final', text.trim(), sessionId);
                    invokeIfActive('OnFinalResultCallback', sessionId, text.trim());
                } else {
                    emptyFinalCount += 1;
                    reportDiagnostic(`Vosk Final leer (${emptyFinalCount}x)`, sessionId);
                }
            });

            sessionRecognizer.on('partialresult', (message) => {
                if (!isActiveSession(sessionId) || recognizer !== sessionRecognizer) return;

                const text = (message.result && message.result.partial) || '';
                if (text.trim()) {
                    reportRecognitionTiming('Partial', text.trim(), sessionId);
                    invokeIfActive('OnPartialResultCallback', sessionId, text.trim());
                } else {
                    emptyPartialCount += 1;
                    if (emptyPartialCount === 1 || emptyPartialCount % 20 === 0) {
                        reportDiagnostic(`Vosk Partial leer (${emptyPartialCount}x)`, sessionId);
                    }
                }
            });

            sessionRecognizer.on('error', (message) => {
                if (!isActiveSession(sessionId) || recognizer !== sessionRecognizer) return;

                const error = message?.error || message?.message || JSON.stringify(message);
                reportDiagnostic(`Recognizer-Fehler: ${error}`, sessionId);
                invokeIfActive('OnErrorCallback', sessionId, error);
            });

            invokeIfActive('OnListeningCallback', sessionId);
            reportDiagnostic('Listening gestartet', sessionId);
        } catch (err) {
            console.error('[Vosk] Failed:', err);
            invokeIfActive('OnErrorCallback', sessionId, err.message || 'Unknown error');
            cleanup();
        }
    },

    async stopListening() {
        activeSessionId = 0;
        cleanup();
        console.log('[Vosk] Listening stopped');
    },

    dispose() {
        cleanup();
        dotNetRef = null;
        model = null;
    }
};
