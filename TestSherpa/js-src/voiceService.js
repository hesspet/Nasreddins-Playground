let vad = null;
let sampleBuffer = null;
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
let speechDetected = false;
let acceptWaveformErrorCount = 0;

const expectedSampleRate = 16000;
const sherpaAssetVersion = '0.17.0-whisper-tiny-de-v1';
const sherpaModule = window.sherpaModule = window.sherpaModule || {};
let lastRunDependencyCount = 0;
let runtimeReadyResolve;
let runtimeReadyReject;
const runtimeReady = new Promise((resolve, reject) => {
    runtimeReadyResolve = resolve;
    runtimeReadyReject = reject;
});

sherpaModule.locateFile = (path, scriptDirectory = '') => {
    if (scriptDirectory) return scriptDirectory + path;

    const url = new URL(`js/${path}`, document.baseURI);
    if (path.startsWith('sherpa-onnx-wasm-main-vad-asr.')) {
        url.searchParams.set('v', sherpaAssetVersion);
    }

    return url.toString();
};
sherpaModule.setStatus = (status) => {
    if (status) reportDiagnostic(`Sherpa Runtime: ${status}`);
};
sherpaModule.print = (message) => console.log('[Sherpa stdout]', message);
sherpaModule.printErr = (message) => {
    console.warn('[Sherpa stderr]', message);
    if (message) reportDiagnostic(`Sherpa stderr: ${message}`);
};
sherpaModule.monitorRunDependencies = (count) => {
    lastRunDependencyCount = count;
    reportDiagnostic(`Sherpa RunDependencies: ${count}`);
};
sherpaModule.onRuntimeInitialized = () => {
    try {
        recognizer = createOfflineRecognizer();
        reportDiagnostic('Sherpa-ONNX VAD+ASR Runtime initialisiert');
        runtimeReadyResolve();
    } catch (err) {
        runtimeReadyReject(err);
    }
};
sherpaModule.onAbort = (message) => {
    runtimeReadyReject(new Error(message || 'Sherpa-ONNX Runtime abgebrochen'));
};

loadSherpaRuntime();

async function loadSherpaRuntime() {
    const runtimeUrl = new URL(`js/sherpa-onnx-wasm-main-vad-asr.js?v=${sherpaAssetVersion}`, document.baseURI).toString();

    try {
        reportDiagnostic(`Sherpa Runtime-Umgebung: crossOriginIsolated=${window.crossOriginIsolated}, SharedArrayBuffer=${typeof SharedArrayBuffer}`);
        const response = await fetch(runtimeUrl, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`Sherpa-ONNX Runtime konnte nicht geladen werden: ${response.status} ${response.statusText}`);
        }

        const source = await response.text();
        sherpaModule.mainScriptUrlOrBlob = runtimeUrl;
        Function('Module', `${source}\n//# sourceURL=${runtimeUrl}`)(sherpaModule);
    } catch (err) {
        runtimeReadyReject(err);
    }
}

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
        console.debug(`[Sherpa] Ignoriere altes Event aus Session ${sessionId}; aktiv ist ${activeSessionId}`);
        return false;
    }

    invoke(method, sessionId, ...args);
    return true;
}

function reportDiagnostic(message, sessionId = activeSessionId) {
    console.log(`[Sherpa s${sessionId}]`, message);
    if (sessionId) invokeIfActive('OnDiagnosticCallback', sessionId, message);
}

function fileExists(filename) {
    const filenameLen = sherpaModule.lengthBytesUTF8(filename) + 1;
    const buffer = sherpaModule._malloc(filenameLen);
    sherpaModule.stringToUTF8(filename, buffer, filenameLen);
    const exists = sherpaModule._SherpaOnnxFileExists(buffer);
    sherpaModule._free(buffer);
    return exists === 1;
}

function createOfflineRecognizer() {
    const config = {
        modelConfig: {
            debug: 1,
            tokens: './tokens.txt',
        },
    };

    if (fileExists('whisper-encoder.onnx')) {
        config.modelConfig.whisper = {
            encoder: './whisper-encoder.onnx',
            decoder: './whisper-decoder.onnx',
            language: 'de',
            task: 'transcribe',
        };
    } else if (fileExists('dolphin.onnx')) {
        config.modelConfig.dolphin = { model: './dolphin.onnx' };
    } else if (fileExists('sense-voice.onnx')) {
        config.modelConfig.senseVoice = {
            model: './sense-voice.onnx',
            useInverseTextNormalization: 1,
        };
    } else if (fileExists('zipformer-ctc.onnx')) {
        config.modelConfig.zipformerCtc = { model: './zipformer-ctc.onnx' };
    } else if (fileExists('paraformer.onnx')) {
        config.modelConfig.paraformer = { model: './paraformer.onnx' };
    } else if (fileExists('transducer-encoder.onnx')) {
        config.modelConfig.transducer = {
            encoder: './transducer-encoder.onnx',
            decoder: './transducer-decoder.onnx',
            joiner: './transducer-joiner.onnx',
        };
        config.modelConfig.modelType = 'transducer';
    } else {
        throw new Error('Kein unterstuetztes Sherpa-ONNX-ASR-Modell im Runtime-Datenpaket gefunden.');
    }

    return new OfflineRecognizer(config, sherpaModule);
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
    if (rms > 0.01 || peak > 0.03) lastVoiceAt = now;

    invokeIfActive('OnAudioLevelCallback', sessionId, rms, peak, audioChunkCount, audioContext?.state || 'unknown');
}

function reportRecognitionTiming(kind, text, sessionId) {
    const now = performance.now();
    const elapsedMs = listeningStartedAt ? Math.round(now - listeningStartedAt) : 0;
    const silenceMs = lastVoiceAt ? Math.round(now - lastVoiceAt) : elapsedMs;
    if (silenceMs > 1000) {
        reportDiagnostic(`${kind} nach ${silenceMs} ms Stille: "${text}"`, sessionId);
    }
    console.debug(`[Sherpa s${sessionId}] ${kind} after ${elapsedMs}ms, silence ${silenceMs}ms:`, text);
}

async function waitForRuntime(sessionId) {
    if (typeof OfflineRecognizer !== 'function' || typeof createVad !== 'function' || typeof CircularBuffer !== 'function') {
        throw new Error('Sherpa-ONNX VAD+ASR JavaScript-Dateien fehlen. Fuehre Tools/Install-SherpaAssets.ps1 aus.');
    }

    if (window.Module === sherpaModule) {
        throw new Error('Sherpa-ONNX Runtime kollidiert mit window.Module. Die Seite muss mit der isolierten Sherpa-Bridge neu geladen werden.');
    }

    const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Sherpa-ONNX Runtime wurde nicht rechtzeitig initialisiert. runDependencies=${lastRunDependencyCount}, calledRun=${Boolean(sherpaModule.calledRun)}, crossOriginIsolated=${window.crossOriginIsolated}, SharedArrayBuffer=${typeof SharedArrayBuffer}.`)), 240000);
    });

    reportDiagnostic('Warte auf Sherpa-ONNX VAD+ASR Runtime ...', sessionId);
    await Promise.race([runtimeReady, timeout]);
}

function downsampleBuffer(buffer, inputSampleRate) {
    if (inputSampleRate === expectedSampleRate) return new Float32Array(buffer);

    const sampleRateRatio = inputSampleRate / expectedSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
        let accum = 0;
        let count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
            accum += buffer[i];
            count += 1;
        }
        result[offsetResult] = accum / count;
        offsetResult += 1;
        offsetBuffer = nextOffsetBuffer;
    }
    return result;
}

function decodeSegment(segment, sessionId) {
    const stream = recognizer.createStream();
    stream.acceptWaveform(expectedSampleRate, segment.samples);
    recognizer.decode(stream);
    const result = recognizer.getResult(stream);
    stream.free();

    const text = result?.text?.trim() || '';
    if (text) {
        reportRecognitionTiming('Final', text, sessionId);
        invokeIfActive('OnFinalResultCallback', sessionId, text);
    } else {
        reportDiagnostic('Sherpa Segment ohne Text erkannt', sessionId);
    }
}

function processVadAsr(samples, sessionId) {
    sampleBuffer.push(samples);

    while (sampleBuffer.size() > vad.config.sileroVad.windowSize) {
        const frame = sampleBuffer.get(sampleBuffer.head(), vad.config.sileroVad.windowSize);
        vad.acceptWaveform(frame);
        sampleBuffer.pop(vad.config.sileroVad.windowSize);

        if (vad.isDetected() && !speechDetected) {
            speechDetected = true;
            invokeIfActive('OnPartialResultCallback', sessionId, 'Sprache erkannt ...');
        }

        if (!vad.isDetected()) {
            speechDetected = false;
        }

        while (!vad.isEmpty()) {
            const segment = vad.front();
            vad.pop();
            decodeSegment(segment, sessionId);
        }
    }
}

async function startListeningInternal(sessionId) {
    audioContext = new AudioContext({ sampleRate: expectedSampleRate });
    audioContext.onstatechange = () => {
        reportDiagnostic(`AudioContext: ${audioContext?.state || 'unknown'}`, sessionId);
    };
    reportDiagnostic(`AudioContext erstellt: state=${audioContext.state}, sampleRate=${audioContext.sampleRate}`, sessionId);

    if (audioContext.state === 'suspended') {
        await audioContext.resume();
        reportDiagnostic(`AudioContext nach resume(): ${audioContext.state}`, sessionId);
    }

    sourceNode = audioContext.createMediaStreamSource(mediaStream);
    const scriptNode = audioContext.createScriptProcessor(4096, 1, 1);
    scriptNode.onaudioprocess = (event) => {
        if (!isActiveSession(sessionId) || !recognizer || !vad || !sampleBuffer) return;

        const input = event.inputBuffer.getChannelData(0);
        reportAudioLevel(input, sessionId);
        const samples = downsampleBuffer(input, audioContext.sampleRate);

        try {
            processVadAsr(samples, sessionId);
        } catch (e) {
            acceptWaveformErrorCount += 1;
            if (acceptWaveformErrorCount === 1 || acceptWaveformErrorCount % 20 === 0) {
                reportDiagnostic(`Sherpa VAD/ASR fehlgeschlagen (${acceptWaveformErrorCount}x): ${e.message || e}`, sessionId);
            }
            console.error('[Sherpa] VAD/ASR failed:', e);
        }
    };

    const silenceNode = audioContext.createGain();
    silenceNode.gain.value = 0;

    sourceNode.connect(scriptNode);
    scriptNode.connect(silenceNode);
    silenceNode.connect(audioContext.destination);
    processorNode = scriptNode;
    outputNode = silenceNode;

    reportDiagnostic('Audio-Pipeline verbunden: Mikrofon -> VAD/ASR -> stummer Ausgang', sessionId);
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
        audioContext.close().catch(() => { });
        audioContext = null;
    }
    if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        mediaStream = null;
    }
}

function releaseVadState() {
    if (vad) {
        try { vad.free(); } catch (err) { console.warn('[Sherpa] VAD free failed:', err); }
        vad = null;
    }
    if (sampleBuffer) {
        try { sampleBuffer.free(); } catch (err) { console.warn('[Sherpa] sample buffer free failed:', err); }
        sampleBuffer = null;
    }
}

function resetCounters() {
    audioChunkCount = 0;
    lastLevelReport = 0;
    listeningStartedAt = 0;
    lastVoiceAt = 0;
    speechDetected = false;
    acceptWaveformErrorCount = 0;
}

function resetSessionState() {
    stopMicrophone();
    releaseVadState();
    resetCounters();
}

function createVadState() {
    releaseVadState();
    vad = createVad(sherpaModule);
    sampleBuffer = new CircularBuffer(30 * expectedSampleRate, sherpaModule);
}

window.voiceService = {
    async startListening(ref, modelUrl, sessionId) {
        dotNetRef = ref;
        activeSessionId = sessionId;

        try {
            await waitForRuntime(sessionId);
            if (!isActiveSession(sessionId)) return;

            resetSessionState();
            activeSessionId = sessionId;
            createVadState();
            listeningStartedAt = performance.now();
            lastVoiceAt = listeningStartedAt;

            reportDiagnostic(`Sherpa-Assets bereit: ${modelUrl || 'Runtime-Datenpaket'}`, sessionId);
            invokeIfActive('OnReadyCallback', sessionId);

            mediaStream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    channelCount: 1,
                    sampleRate: expectedSampleRate,
                },
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

            await startListeningInternal(sessionId);
            if (!isActiveSession(sessionId)) return;

            reportDiagnostic(`Recognizer bereit: VAD + Offline-ASR, sampleRate=${expectedSampleRate}, audioContext=${audioContext.sampleRate}`, sessionId);
            invokeIfActive('OnListeningCallback', sessionId);
        } catch (err) {
            if (!isActiveSession(sessionId)) return;

            console.error('[Sherpa] Failed:', err);
            resetSessionState();
            invokeIfActive('OnErrorCallback', sessionId, err.message || String(err));
        }
    },

    async stopListening() {
        const sessionId = activeSessionId;
        if (vad && isActiveSession(sessionId)) {
            try {
                vad.flush();
                while (!vad.isEmpty()) {
                    const segment = vad.front();
                    vad.pop();
                    decodeSegment(segment, sessionId);
                }
            } catch (err) {
                reportDiagnostic(`Flush fehlgeschlagen: ${err.message || err}`, sessionId);
            }
        }
        resetSessionState();
        console.log('[Sherpa] Listening stopped');
    },

    async dispose() {
        resetSessionState();
        if (recognizer) {
            try { recognizer.free(); } catch { }
            recognizer = null;
        }
        releaseVadState();
        dotNetRef = null;
    },
};
