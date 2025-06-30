using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CarAuction.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class WinneUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "WinnerUserId",
                table: "Cars",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Cars_WinnerUserId",
                table: "Cars",
                column: "WinnerUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Cars_AspNetUsers_WinnerUserId",
                table: "Cars",
                column: "WinnerUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Cars_AspNetUsers_WinnerUserId",
                table: "Cars");

            migrationBuilder.DropIndex(
                name: "IX_Cars_WinnerUserId",
                table: "Cars");

            migrationBuilder.DropColumn(
                name: "WinnerUserId",
                table: "Cars");
        }
    }
}
