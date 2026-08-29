using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChipAndChill.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTournamentPhase2Fields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "PrizePurse",
                table: "Tournaments",
                type: "decimal(65,30)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "ClosestToPinHole",
                table: "Tournaments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClosestToPinWinner",
                table: "Tournaments",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "LongestDriveHole",
                table: "Tournaments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LongestDriveWinner",
                table: "Tournaments",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Flight",
                table: "TournamentRegistrations",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PrizePurse",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "ClosestToPinHole",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "ClosestToPinWinner",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "LongestDriveHole",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "LongestDriveWinner",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "Flight",
                table: "TournamentRegistrations");
        }
    }
}
