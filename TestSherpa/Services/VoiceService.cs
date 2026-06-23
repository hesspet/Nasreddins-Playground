using Microsoft.JSInterop;
using TestSherpa.Models;

namespace TestSherpa.Services;

public class VoiceService : IVoiceService, IAsyncDisposable
{
    private readonly IJSRuntime _js;
    private DotNetObjectReference<VoiceService>? _dotNetRef;
    private VoiceState _state = VoiceState.Idle;
    private long _sessionId;

    public VoiceState State => _state;
    public event Action<VoiceState>? OnStateChanged;
    public event Action<string>? OnPartialResult;
    public event Action<string>? OnFinalResult;
    public event Action<string>? OnDiagnostic;
    public event Action<double, double, long, string>? OnAudioLevel;

    public VoiceService(IJSRuntime js)
    {
        _js = js;
    }

    private VoiceState StateValue
    {
        get => _state;
        set
        {
            if (_state == value) return;
            _state = value;
            OnStateChanged?.Invoke(value);
        }
    }

    public async Task StartListeningAsync(string modelUrl)
    {
        var sessionId = ++_sessionId;
        StateValue = VoiceState.LoadingModel;

        try
        {
            _dotNetRef ??= DotNetObjectReference.Create(this);
            await _js.InvokeVoidAsync("voiceService.startListening", _dotNetRef, modelUrl, sessionId);
        }
        catch (Exception ex)
        {
            if (!IsCurrentSession(sessionId)) return;

            StateValue = VoiceState.Error;
            OnFinalResult?.Invoke($"Fehler: {ex.Message}");
        }
    }

    public async Task StopListeningAsync()
    {
        _sessionId++;
        try
        {
            await _js.InvokeVoidAsync("voiceService.stopListening");
            StateValue = VoiceState.Ready;
        }
        catch (Exception ex)
        {
            OnFinalResult?.Invoke($"Fehler beim Stoppen: {ex.Message}");
        }
    }

    private bool IsCurrentSession(long sessionId) => sessionId == _sessionId;

    [JSInvokable]
    public void OnPartialResultCallback(long sessionId, string text)
    {
        if (!IsCurrentSession(sessionId)) return;

        OnPartialResult?.Invoke(text);
    }

    [JSInvokable]
    public void OnFinalResultCallback(long sessionId, string text)
    {
        if (!IsCurrentSession(sessionId)) return;

        OnFinalResult?.Invoke(text);
    }

    [JSInvokable]
    public void OnDiagnosticCallback(long sessionId, string message)
    {
        if (!IsCurrentSession(sessionId)) return;

        OnDiagnostic?.Invoke(message);
    }

    [JSInvokable]
    public void OnAudioLevelCallback(long sessionId, double rms, double peak, long chunks, string audioState)
    {
        if (!IsCurrentSession(sessionId)) return;

        OnAudioLevel?.Invoke(rms, peak, chunks, audioState);
    }

    [JSInvokable]
    public void OnListeningCallback(long sessionId)
    {
        if (!IsCurrentSession(sessionId)) return;

        StateValue = VoiceState.Listening;
    }

    [JSInvokable]
    public void OnReadyCallback(long sessionId)
    {
        if (!IsCurrentSession(sessionId)) return;

        StateValue = VoiceState.Ready;
    }

    [JSInvokable]
    public void OnErrorCallback(long sessionId, string message)
    {
        if (!IsCurrentSession(sessionId)) return;

        StateValue = VoiceState.Error;
        OnFinalResult?.Invoke($"Fehler: {message}");
    }

    public async ValueTask DisposeAsync()
    {
        try
        {
            await _js.InvokeVoidAsync("voiceService.dispose");
        }
        catch
        {
        }
        _dotNetRef?.Dispose();
    }
}
