using TestVosk.Models;

namespace TestVosk.Services;

public interface IVoiceService
{
    VoiceState State { get; }
    event Action<VoiceState> OnStateChanged;
    event Action<string> OnPartialResult;
    event Action<string> OnFinalResult;
    event Action<string> OnDiagnostic;
    event Action<double, double, long, string> OnAudioLevel;

    Task StartListeningAsync(string modelUrl);
    Task StopListeningAsync();
}
