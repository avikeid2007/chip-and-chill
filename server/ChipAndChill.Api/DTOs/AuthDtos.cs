using ChipAndChill.Api.Models;

namespace ChipAndChill.Api.DTOs;

public record RegisterRequest(string Email, string Password, string FirstName, string LastName, AppRole Role, Guid? TenantId);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, string Email, string FirstName, string LastName, AppRole Role, Guid? TenantId);

