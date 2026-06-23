using TestSherpa.Services;

namespace TestSherpa.Tests;

public class CommandParserTests
{
    [Theory]
    [InlineData("Hase Karte Kreuz zehn", "Kreuz", "10")]
    [InlineData("Hase suche Karte Kreuz zehn", "Kreuz", "10")]
    [InlineData("Hase finde Karte Pik Dame", "Pik", "Dame")]
    [InlineData("Hase zeige Karte Herz Ass", "Herz", "Ass")]
    [InlineData("Hase Karo sieben", "Karo", "7")]
    [InlineData("Hase Karte Karo König", "Karo", "König")]
    [InlineData("Hase suche Herz Bube", "Herz", "Bube")]
    [InlineData("Hase Pik neun", "Pik", "9")]
    public void Parse_ValidCommands_ReturnsCard(string input, string expectedSuit, string expectedRank)
    {
        var result = CommandParser.Parse(input);
        Assert.NotNull(result);
        Assert.Equal(expectedSuit, result.Suit);
        Assert.Equal(expectedRank, result.Rank);
        Assert.Equal("hase", result.Trigger);
    }

    [Theory]
    [InlineData("Hase Karte Kreuz 10")]
    [InlineData("Hase Karte Kreuz zehn")]
    [InlineData("Hase suche Karte Kreuz 10")]
    [InlineData("Hase finde Karte Pik queen")]
    [InlineData("Hase Karte herz ass")]
    [InlineData("Hase karo sieben")]
    public void Parse_CaseInsensitive_Works(string input)
    {
        var result = CommandParser.Parse(input);
        Assert.NotNull(result);
    }

    [Theory]
    [InlineData("Hase Karte Kreuz zehn")]
    [InlineData("hase Karte Kreuz zehn")]
    [InlineData("HASE Karte Kreuz zehn")]
    public void Parse_TriggerVariants_Works(string input)
    {
        var result = CommandParser.Parse(input);
        Assert.NotNull(result);
    }

    [Fact]
    public void Parse_SuitSynonyms_Kreuz()
    {
        var result = CommandParser.Parse("Hase treff Ass");
        Assert.NotNull(result);
        Assert.Equal("Kreuz", result.Suit);
    }

    [Fact]
    public void Parse_SuitSynonyms_Pik()
    {
        var result = CommandParser.Parse("Hase spaten Ass");
        Assert.NotNull(result);
        Assert.Equal("Pik", result.Suit);
    }

    [Fact]
    public void Parse_RankSynonyms_Ass()
    {
        var result = CommandParser.Parse("Hase Herz ace");
        Assert.NotNull(result);
        Assert.Equal("Ass", result.Rank);
    }

    [Fact]
    public void Parse_RankSynonyms_Koenig()
    {
        var result = CommandParser.Parse("Hase Herz king");
        Assert.NotNull(result);
        Assert.Equal("König", result.Rank);
    }

    [Fact]
    public void Parse_RankSynonyms_Bube()
    {
        var result = CommandParser.Parse("Hase Herz jack");
        Assert.NotNull(result);
        Assert.Equal("Bube", result.Rank);
    }

    [Theory]
    [InlineData("Kreuz zehn")]
    [InlineData("Ich suche eine Karte")]
    [InlineData("Das ist die Herz Dame")]
    [InlineData("Hase erzähle etwas")]
    [InlineData("Nasreddin Karte Kreuz zehn")]
    [InlineData("Karo König liegt auf dem Tisch")]
    [InlineData("Zeige mir irgendeine Karte")]
    [InlineData("")]
    [InlineData("   ")]
    public void Parse_InvalidCommands_ReturnsNull(string input)
    {
        var result = CommandParser.Parse(input);
        Assert.Null(result);
    }

    [Fact]
    public void Parse_NullInput_ReturnsNull()
    {
        var result = CommandParser.Parse(null!);
        Assert.Null(result);
    }

    [Fact]
    public void Parse_AllRanks_Recognized()
    {
        var ranks = new[] { "Ass", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Bube", "Dame", "König" };
        foreach (var rank in ranks)
        {
            var result = CommandParser.Parse($"Hase Kreuz {rank}");
            Assert.NotNull(result);
            Assert.Equal(rank, result.Rank);
        }
    }

    [Fact]
    public void Parse_AllSuits_Recognized()
    {
        var suits = new[] { "Kreuz", "Pik", "Herz", "Karo" };
        foreach (var suit in suits)
        {
            var result = CommandParser.Parse($"Hase {suit} sieben");
            Assert.NotNull(result);
            Assert.Equal(suit, result.Suit);
        }
    }

    [Fact]
    public void Parse_FuenfSynonym()
    {
        var result = CommandParser.Parse("Hase Kreuz fuenf");
        Assert.NotNull(result);
        Assert.Equal("5", result.Rank);
    }

    [Fact]
    public void Parse_ZwoSynonym()
    {
        var result = CommandParser.Parse("Hase Kreuz zwo");
        Assert.NotNull(result);
        Assert.Equal("2", result.Rank);
    }

    [Fact]
    public void Parse_TriggerInMiddle()
    {
        var result = CommandParser.Parse("Hallo Hase Kreuz zehn");
        Assert.NotNull(result);
        Assert.Equal("Kreuz", result.Suit);
        Assert.Equal("10", result.Rank);
    }

    [Fact]
    public void Parse_WithExtraWords_AfterCard()
    {
        var result = CommandParser.Parse("Hase Kreuz zehn bitte");
        Assert.NotNull(result);
        Assert.Equal("Kreuz", result.Suit);
        Assert.Equal("10", result.Rank);
    }
}
