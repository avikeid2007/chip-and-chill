namespace ChipAndChill.Api.DTOs;

public record TeeSlotResponse(Guid Id, DateTime StartTime, int MaxPlayers, int PlayersBooked, decimal Price, string Status);
public record CreateBookingRequest(Guid TeeSlotId, int PartySize);
public record CreateTeeSlotRequest(DateTime StartTime, int MaxPlayers, decimal Price);

// Flat booking shapes — entity serialization would cycle (Booking → TeeSlot → Bookings).
public record BookingResponse(Guid Id, Guid TeeSlotId, int PartySize, string Status, string PaymentStatus, decimal AmountPaid, decimal TotalPrice);
// BUG-05 FIX: Include TenantId so the global /api/bookings/mine response can be enriched
// with course name / currency without an additional per-tenant lookup on the client.
public record MyBookingResponse(Guid Id, Guid TenantId, Guid TeeSlotId, int PartySize, string Status, DateTime StartTime, decimal Price, string PaymentStatus, decimal AmountPaid);

// ---- Waitlist ----
public record JoinWaitlistRequest(int PartySize);
public record WaitlistResponse(Guid Id, int Position);


