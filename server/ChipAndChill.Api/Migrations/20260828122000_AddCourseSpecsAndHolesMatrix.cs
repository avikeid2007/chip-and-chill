using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChipAndChill.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCourseSpecsAndHolesMatrix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CoverImageUrl",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Website",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Architect",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "YearBuilt",
                table: "Tenants",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CourseType",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<double>(
                name: "CourseRating",
                table: "Tenants",
                type: "double",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SlopeRating",
                table: "Tenants",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GreensGrass",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "FairwaysGrass",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Amenities",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "DressCode",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "SpikePolicy",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "HandicapIndex",
                table: "CourseHoles",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "YardageBlack",
                table: "CourseHoles",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "YardageGold",
                table: "CourseHoles",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "CoverImageUrl", table: "Tenants");
            migrationBuilder.DropColumn(name: "Phone", table: "Tenants");
            migrationBuilder.DropColumn(name: "Email", table: "Tenants");
            migrationBuilder.DropColumn(name: "Website", table: "Tenants");
            migrationBuilder.DropColumn(name: "Architect", table: "Tenants");
            migrationBuilder.DropColumn(name: "YearBuilt", table: "Tenants");
            migrationBuilder.DropColumn(name: "CourseType", table: "Tenants");
            migrationBuilder.DropColumn(name: "CourseRating", table: "Tenants");
            migrationBuilder.DropColumn(name: "SlopeRating", table: "Tenants");
            migrationBuilder.DropColumn(name: "GreensGrass", table: "Tenants");
            migrationBuilder.DropColumn(name: "FairwaysGrass", table: "Tenants");
            migrationBuilder.DropColumn(name: "Amenities", table: "Tenants");
            migrationBuilder.DropColumn(name: "DressCode", table: "Tenants");
            migrationBuilder.DropColumn(name: "SpikePolicy", table: "Tenants");
            migrationBuilder.DropColumn(name: "HandicapIndex", table: "CourseHoles");
            migrationBuilder.DropColumn(name: "YardageBlack", table: "CourseHoles");
            migrationBuilder.DropColumn(name: "YardageGold", table: "CourseHoles");
        }
    }
}
