namespace TestVosk.Models;

public record CardCommand(
    string Trigger,
    string Action,
    string Object,
    string Suit,
    string Rank
);
