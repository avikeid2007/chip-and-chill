async function run() {
  const API_BASE = "http://localhost:5000";

  // 1. Fetch courses
  const tenantsRes = await fetch(`${API_BASE}/api/tenants`);
  const tenants = await tenantsRes.json();
  const cedarRidge = tenants.find(t => t.name.includes("Cedar Ridge")) || tenants[0];
  const pineHollow = tenants.find(t => t.name.includes("Pine Hollow")) || tenants[1];

  console.log("==========================================================");
  console.log(`COURSE 1 (Golfer Home Club): ${cedarRidge.name} (${cedarRidge.id})`);
  console.log(`COURSE 2 (Booking Target):   ${pineHollow.name} (${pineHollow.id})`);
  console.log("==========================================================");

  // 2. Register/Login Course Admin for Pine Hollow
  const adminEmail = "pinehollow.admin@testgolf.com";
  const adminPass = "AdminPass123!";
  let adminRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: adminPass })
  });

  let admin = null;
  if (adminRes.ok) {
    admin = await adminRes.json();
  } else {
    const regRes = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPass,
        firstName: "PineHollow",
        lastName: "Admin",
        role: "CourseAdmin",
        tenantId: pineHollow.id
      })
    });
    admin = await regRes.json();
  }
  console.log(`✓ Pine Hollow Admin: ${admin.firstName} (${admin.email})`);

  // 3. Create a fresh Tee Slot at Pine Hollow
  const startTime = new Date(Date.now() + 4 * 3600 * 1000).toISOString();
  const slotRes = await fetch(`${API_BASE}/api/tenants/${pineHollow.id}/tee-slots`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${admin.token}`,
      "X-Tenant-Id": pineHollow.id
    },
    body: JSON.stringify({
      startTime: startTime,
      maxPlayers: 4,
      price: 60.00
    })
  });
  const createdSlot = await slotRes.json();
  console.log(`✓ Created Tee Slot at Pine Hollow: ID ${createdSlot.id}, Price: $${createdSlot.price}`);

  // 4. Register/Login Golfer affiliated with Cedar Ridge
  const golferEmail = "alex.crossman@testgolf.com";
  const golferPass = "GolferPass123!";
  let golferRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: golferEmail, password: golferPass })
  });

  let golfer = null;
  if (golferRes.ok) {
    golfer = await golferRes.json();
  } else {
    const regRes = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: golferEmail,
        password: golferPass,
        firstName: "Alex",
        lastName: "Crossman",
        role: "Golfer",
        tenantId: cedarRidge.id
      })
    });
    golfer = await regRes.json();
  }
  console.log(`✓ Golfer Logged In: ${golfer.firstName} ${golfer.lastName} (Home Club: ${cedarRidge.name})`);

  // 5. Golfer (Cedar Ridge) books slot at Pine Hollow
  const bookRes = await fetch(`${API_BASE}/api/tenants/${pineHollow.id}/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${golfer.token}`,
      "X-Tenant-Id": pineHollow.id
    },
    body: JSON.stringify({
      teeSlotId: createdSlot.id,
      partySize: 2
    })
  });
  const booking = await bookRes.json();
  console.log(`✓ Cross-Course Booking Created! Booking ID: ${booking.id}, Party: ${booking.partySize}`);

  // 6. Pine Hollow Admin queries their Golfers & Members Directory
  const dirRes = await fetch(`${API_BASE}/api/tenants/${pineHollow.id}/golfers`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${admin.token}`,
      "X-Tenant-Id": pineHollow.id
    }
  });
  const pineHollowGolfers = await dirRes.json();

  console.log("\n==========================================================");
  console.log(`PINE HOLLOW'S GOLFERS & MEMBERS DIRECTORY (Total: ${pineHollowGolfers.length})`);
  console.log("==========================================================");

  const found = pineHollowGolfers.find(g => g.email.toLowerCase() === golferEmail.toLowerCase());
  if (found) {
    console.log("🎯 LIVE VERIFICATION SUCCESSFUL (100% PROVEN):");
    console.log(`   - Golfer Name: ${found.firstName} ${found.lastName}`);
    console.log(`   - Golfer Email: ${found.email}`);
    console.log(`   - Actual Home Club: ${cedarRidge.name}`);
    console.log(`   - Visible in Pine Hollow Directory: YES`);
    console.log(`   - Bookings Count at Pine Hollow: ${found.bookingsCount}`);
    console.log(`   - Total Spend at Pine Hollow: $${found.totalSpend}`);
    console.log(`   - Last Active at Pine Hollow: ${found.lastActivity}`);
  } else {
    console.log("❌ Golfer not found in list.");
  }
}

run().catch(console.error);
