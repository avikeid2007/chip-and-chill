$ErrorActionPreference = "Stop"

# 1. Fetch courses
$tenants = Invoke-RestMethod -Uri "http://localhost:5000/api/tenants" -Method Get
$cedarRidge = $tenants | Where-Object { $_.name -like "*Cedar Ridge*" } | Select-Object -First 1
$pineHollow = $tenants | Where-Object { $_.name -like "*Pine Hollow*" } | Select-Object -First 1

Write-Output "=========================================================="
Write-Output "COURSE 1 (Golfer Home Club): $($cedarRidge.name) ($($cedarRidge.id))"
Write-Output "COURSE 2 (Booking Target): $($pineHollow.name) ($($pineHollow.id))"
Write-Output "=========================================================="

# 2. Register or Login Course Admin for Pine Hollow
$adminEmail = "pinehollow.admin@testgolf.com"
$adminPass = "AdminPass123!"
$adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$adminLoginPayload = @{ email = $adminEmail; password = $adminPass } | ConvertTo-Json

try {
    $adminLogin = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -ContentType "application/json" -Body $adminLoginPayload -WebSession $adminSession
} catch {
    $adminRegPayload = @{
        email = $adminEmail
        password = $adminPass
        firstName = "PineHollow"
        lastName = "Admin"
        role = "CourseAdmin"
        tenantId = $pineHollow.id
    } | ConvertTo-Json
    $adminLogin = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method Post -ContentType "application/json" -Body $adminRegPayload -WebSession $adminSession
}

Write-Output "✓ Pine Hollow Admin Logged In: $($adminLogin.firstName) ($($adminLogin.email))"
$adminHeaders = @{ "Authorization" = "Bearer $($adminLogin.token)" }

# 3. Create a fresh Tee Slot at Pine Hollow
$slotTime = (Get-Date).AddHours(3).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$createSlotPayload = @{
    startTime = $slotTime
    maxPlayers = 4
    price = 60.00
} | ConvertTo-Json

$createdSlot = Invoke-RestMethod -Uri "http://localhost:5000/api/tenants/$($pineHollow.id)/tee-slots" -Method Post -Headers $adminHeaders -ContentType "application/json" -Body $createSlotPayload -WebSession $adminSession
Write-Output "✓ Created Slot at Pine Hollow: Slot ID $($createdSlot.id) at $($createdSlot.startTime), Price: $$($createdSlot.price)"

# 4. Register or Login Golfer affiliated with Cedar Ridge (Cross-Course Golfer)
$golferEmail = "alex.crossman@testgolf.com"
$golferPass = "GolferPass123!"

$golferSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$golferLoginPayload = @{ email = $golferEmail; password = $golferPass } | ConvertTo-Json

try {
    $golferLogin = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -ContentType "application/json" -Body $golferLoginPayload -WebSession $golferSession
} catch {
    $golferRegPayload = @{
        email = $golferEmail
        password = $golferPass
        firstName = "Alex"
        lastName = "Crossman"
        role = "Golfer"
        tenantId = $cedarRidge.id
    } | ConvertTo-Json
    $golferLogin = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method Post -ContentType "application/json" -Body $golferRegPayload -WebSession $golferSession
}

Write-Output "✓ Golfer Logged In: $($golferLogin.firstName) $($golferLogin.lastName) (Home Club: $($cedarRidge.name))"

# 5. Golfer (Cedar Ridge) books slot at Pine Hollow
$bookPayload = @{
    teeSlotId = $createdSlot.id
    partySize = 2
} | ConvertTo-Json

$golferHeaders = @{ "Authorization" = "Bearer $($golferLogin.token)" }

$booking = Invoke-RestMethod -Uri "http://localhost:5000/api/tenants/$($pineHollow.id)/bookings" -Method Post -Headers $golferHeaders -ContentType "application/json" -Body $bookPayload -WebSession $golferSession
Write-Output "✓ Cross-Course Booking Created! Booking ID: $($booking.id) (Party Size: $($booking.partySize))"

# 6. Pine Hollow Admin queries their Golfers & Members Directory
$pineHollowGolfers = Invoke-RestMethod -Uri "http://localhost:5000/api/tenants/$($pineHollow.id)/golfers" -Method Get -Headers $adminHeaders -WebSession $adminSession

Write-Output "`n=========================================================="
Write-Output "PINE HOLLOW'S GOLFERS & MEMBERS DIRECTORY (Total: $($pineHollowGolfers.Count))"
Write-Output "=========================================================="

$found = $pineHollowGolfers | Where-Object { $_.email -eq $golferEmail }
if ($found) {
    Write-Output "🎯 LIVE VERIFICATION SUCCESSFUL!"
    Write-Output "   - Golfer Name: $($found.firstName) $($found.lastName)"
    Write-Output "   - Golfer Email: $($found.email)"
    Write-Output "   - Golfer's Actual Home Club: $($cedarRidge.name)"
    Write-Output "   - Visible to Pine Hollow Admin: YES (100% Verified)"
    Write-Output "   - Total Bookings at Pine Hollow: $($found.bookingsCount)"
    Write-Output "   - Total Spend at Pine Hollow: $$($found.totalSpend)"
    Write-Output "   - Last Active at Pine Hollow: $($found.lastActivity)"
} else {
    Write-Output "❌ Golfer was not found in directory."
}
