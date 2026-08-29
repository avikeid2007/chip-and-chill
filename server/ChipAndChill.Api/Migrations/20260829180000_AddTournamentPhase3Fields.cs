using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChipAndChill.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTournamentPhase3Fields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RoundsCount",
                table: "Tournaments",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "CurrentRound",
                table: "Tournaments",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "CutRule",
                table: "Tournaments",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "CutAppliedAfterRound",
                table: "Tournaments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "MadeCut",
                table: "TournamentRegistrations",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "PointsEarned",
                table: "TournamentRegistrations",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RoundNumber",
                table: "TournamentScores",
                type: "int",
                nullable: false,
                defaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RoundsCount",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "CurrentRound",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "CutRule",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "CutAppliedAfterRound",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "MadeCut",
                table: "TournamentRegistrations");

            migrationBuilder.DropColumn(
                name: "PointsEarned",
                table: "TournamentRegistrations");

            migrationBuilder.DropColumn(
                name: "RoundNumber",
                table: "TournamentScores");
        }
    }
}
