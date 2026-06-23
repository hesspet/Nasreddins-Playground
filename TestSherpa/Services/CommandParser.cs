using System.Text.RegularExpressions;
using TestSherpa.Models;

namespace TestSherpa.Services;

public static class CommandParser
{
    private static readonly string[] TriggerWords = ["hase"];

    private static readonly string[] ActionWords = [
        "suche", "such", "finde", "zeig", "zeige"
    ];

    private static readonly string[] ObjectWords = [
        "karte", "spielkarte"
    ];

    private static readonly Dictionary<string, string> SuitMap = new()
    {
        { "kreuz", "Kreuz" }, { "kreutz", "Kreuz" }, { "treff", "Kreuz" },
        { "club", "Kreuz" }, { "clubs", "Kreuz" },
        { "pik", "Pik" }, { "pick", "Pik" }, { "spaten", "Pik" },
        { "spades", "Pik" },
        { "herz", "Herz" }, { "hertz", "Herz" }, { "hearts", "Herz" },
        { "karo", "Karo" }, { "karro", "Karo" }, { "diamant", "Karo" },
        { "diamond", "Karo" }, { "diamonds", "Karo" }
    };

    private static readonly Dictionary<string, string> RankMap = new()
    {
        { "ass", "Ass" }, { "ace", "Ass" }, { "as", "Ass" },
        { "zwei", "2" }, { "zwo", "2" }, { "2", "2" },
        { "drei", "3" }, { "3", "3" },
        { "vier", "4" }, { "4", "4" },
        { "fünf", "5" }, { "fuenf", "5" }, { "5", "5" },
        { "sechs", "6" }, { "6", "6" },
        { "sieben", "7" }, { "7", "7" },
        { "acht", "8" }, { "8", "8" },
        { "neun", "9" }, { "9", "9" },
        { "zehn", "10" }, { "10", "10" },
        { "bube", "Bube" }, { "junge", "Bube" }, { "jack", "Bube" },
        { "dame", "Dame" }, { "queen", "Dame" },
        { "könig", "König" }, { "koenig", "König" }, { "king", "König" }
    };

    public static CardCommand? Parse(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return null;

        var normalized = Normalize(input);
        var trigger = FindTrigger(normalized);
        if (trigger == null)
            return null;

        var afterTrigger = normalized[trigger.Length..].Trim();
        if (string.IsNullOrEmpty(afterTrigger))
            return null;

        var words = afterTrigger.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToList();
        words = RemoveKnownWords(words, ActionWords);
        words = RemoveKnownWords(words, ObjectWords);

        string? suit = null;
        string? rank = null;

        foreach (var word in words)
        {
            if (suit == null && SuitMap.TryGetValue(word, out var s))
                suit = s;
            else if (rank == null && RankMap.TryGetValue(word, out var r))
                rank = r;
        }

        if (suit == null || rank == null)
            return null;

        return new CardCommand(
            Trigger: trigger,
            Action: ExtractAction(normalized) ?? "",
            Object: ExtractObject(normalized) ?? "",
            Suit: suit,
            Rank: rank
        );
    }

    private static string Normalize(string input)
    {
        var text = input.ToLowerInvariant().Trim();
        text = Regex.Replace(text, @"\s+", " ");
        return text;
    }

    private static string? FindTrigger(string normalized)
    {
        foreach (var trigger in TriggerWords)
        {
            var idx = normalized.IndexOf(trigger, StringComparison.Ordinal);
            if (idx >= 0)
                return trigger;
        }
        return null;
    }

    private static string? ExtractAction(string normalized)
    {
        var trigger = FindTrigger(normalized);
        if (trigger == null) return null;

        var after = normalized[trigger.Length..].Trim();
        foreach (var action in ActionWords)
        {
            if (after.StartsWith(action, StringComparison.Ordinal))
                return action;
        }
        return null;
    }

    private static string? ExtractObject(string normalized)
    {
        var trigger = FindTrigger(normalized);
        if (trigger == null) return null;

        var after = normalized[trigger.Length..].Trim();
        foreach (var obj in ObjectWords)
        {
            if (after.Contains(obj, StringComparison.Ordinal))
                return obj;
        }
        return null;
    }

    private static List<string> RemoveKnownWords(List<string> words, string[] known)
    {
        return words.Where(w => !known.Contains(w)).ToList();
    }
}
