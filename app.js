const PAGE = document.body.dataset.page;

document.addEventListener("DOMContentLoaded", async () => {

  setupNavigation();

  await updateAuthNavigation();

  if (PAGE === "home") {
    await loadFeaturedCars();
    await loadStats();
  }

  if (PAGE === "cars") {
    await loadCars();
    setupCarFilters();
  }

  if (PAGE === "dealers") {
    await loadDealers();
  }

  if (PAGE === "login") {
    setupLogin();
  }

  if (PAGE === "dealer") {
    await loadDealerDashboard();
  }

  if (PAGE === "admin") {
    await loadAdmin();
  }
});


/* =========================================
   NAVIGATION
========================================= */

function setupNavigation() {

  const menuBtn = document.getElementById("menuBtn");
  const nav = document.getElementById("mainNav");

  if (menuBtn && nav) {

    menuBtn.addEventListener("click", () => {
      nav.classList.toggle("open");
    });

  }

}


/* =========================================
   AUTH NAVIGATION
========================================= */

async function updateAuthNavigation() {

  const authLink = document.getElementById("authLink");

  if (!authLink) return;

  const {
    data: { session }
  } = await carzaSupabase.auth.getSession();

  if (session) {

    authLink.textContent = "Dashboard";
    authLink.href = "dealer.html";

  } else {

    authLink.textContent = "Login";
    authLink.href = "login.html";

  }

}


/* =========================================
   HOME
========================================= */

async function loadFeaturedCars() {

  const container = document.getElementById("featuredCars");

  if (!container) return;

  const { data, error } = await carzaSupabase
    .from("vehicles")
    .select(`
      *,
      dealers (
        dealership_name
      )
    `)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {

    container.innerHTML =
      `<p class="message">Could not load vehicles.</p>`;

    console.error(error);
    return;

  }

  renderCars(data, container);
}


async function loadStats() {

  const vehicleCount = document.getElementById("vehicleCount");
  const dealerCount = document.getElementById("dealerCount");

  if (!vehicleCount || !dealerCount) return;

  const { count: vehicles } = await carzaSupabase
    .from("vehicles")
    .select("*", {
      count: "exact",
      head: true
    })
    .eq("status", "approved");

  const { count: dealers } = await carzaSupabase
    .from("dealers")
    .select("*", {
      count: "exact",
      head: true
    });

  vehicleCount.textContent = vehicles || 0;
  dealerCount.textContent = dealers || 0;
}


/* =========================================
   CARS
========================================= */

async function loadCars(filters = {}) {

  const container = document.getElementById("carsGrid");

  if (!container) return;

  container.innerHTML =
    `<div class="loading">Searching CARZA...</div>`;

  let query = carzaSupabase
    .from("vehicles")
    .select(`
      *,
      dealers (
        dealership_name,
        city
      )
    `)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (filters.make) {

    query = query.ilike(
      "make",
      `%${filters.make}%`
    );

  }

  if (filters.model) {

    query = query.ilike(
      "model",
      `%${filters.model}%`
    );

  }

  if (filters.location) {

    query = query.ilike(
      "location",
      `%${filters.location}%`
    );

  }

  if (filters.transmission) {

    query = query.eq(
      "transmission",
      filters.transmission
    );

  }

  if (filters.minPrice) {

    query = query.gte(
      "price",
      Number(filters.minPrice)
    );

  }

  if (filters.maxPrice) {

    query = query.lte(
      "price",
      Number(filters.maxPrice)
    );

  }

  const { data, error } = await query;

  if (error) {

    console.error(error);

    container.innerHTML =
      `<p class="message">Search failed.</p>`;

    return;

  }

  renderCars(data, container);
}


function setupCarFilters() {

  const search = document.getElementById("searchCars");
  const clear = document.getElementById("clearFilters");

  if (search) {

    search.addEventListener("click", () => {

      loadCars({

        make:
          document.getElementById("filterMake").value.trim(),

        model:
          document.getElementById("filterModel").value.trim(),

        location:
          document.getElementById("filterLocation").value.trim(),

        transmission:
          document.getElementById("filterTransmission").value,

        minPrice:
          document.getElementById("filterMinPrice").value,

        maxPrice:
          document.getElementById("filterMaxPrice").value

      });

    });

  }

  if (clear) {

    clear.addEventListener("click", () => {

      document.querySelectorAll(".filters input")
        .forEach(input => input.value = "");

      document.getElementById("filterTransmission").value = "";

      loadCars();

    });

  }

}


function renderCars(cars, container) {

  if (!cars || cars.length === 0) {

    container.innerHTML = `
      <div class="loading">
        No vehicles found.
      </div>
    `;

    return;

  }

  container.innerHTML = cars.map(car => {

    const image =
      car.image_urls &&
      car.image_urls.length > 0
        ? car.image_urls[0]
        : "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1000&q=80";

    const dealer =
      car.dealers?.dealership_name ||
      "CARZA Dealer";

    return `

      <article class="car-card">

        <img
          class="car-image"
          src="${escapeHTML(image)}"
          alt="${escapeHTML(car.make)} ${escapeHTML(car.model)}"
        >

        <div class="car-info">

          <h3>
            ${escapeHTML(car.year)}
            ${escapeHTML(car.make)}
            ${escapeHTML(car.model)}
          </h3>

          <div class="car-price">
            R${formatNumber(car.price)}
          </div>

          <div class="car-meta">
            ${formatNumber(car.mileage)} km<br>
            ${escapeHTML(car.transmission)} ·
            ${escapeHTML(car.fuel_type)}<br>
            📍 ${escapeHTML(car.location)}<br>
            🏪 ${escapeHTML(dealer)}
          </div>

        </div>

      </article>

    `;

  }).join("");

}


/* =========================================
   DEALERS
========================================= */

async function loadDealers() {

  const container =
    document.getElementById("dealersGrid");

  if (!container) return;

  const { data, error } = await carzaSupabase
    .from("dealers")
    .select("*")
    .order("dealership_name");

  if (error) {

    console.error(error);

    container.innerHTML =
      `<p class="message">Could not load dealers.</p>`;

    return;

  }

  if (!data.length) {

    container.innerHTML =
      `<div class="loading">No dealerships yet.</div>`;

    return;

  }

  container.innerHTML = data.map(dealer => `

    <article class="dealer-card">

      <h3>${escapeHTML(dealer.dealership_name)}</h3>

      <p>
        📍 ${escapeHTML(dealer.city || "South Africa")}
      </p>

      <p>
        ${escapeHTML(
          dealer.description ||
          "Dealership on CARZA."
        )}
      </p>

      ${
        dealer.verified
          ? `<p class="message">✓ Verified dealership</p>`
          : ""
      }

    </article>

  `).join("");

}


/* =========================================
   LOGIN
========================================= */

function setupLogin() {

  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  document.getElementById("showSignup")
    ?.addEventListener("click", () => {

      loginForm.classList.add("hidden");
      signupForm.classList.remove("hidden");

    });

  document.getElementById("showLogin")
    ?.addEventListener("click", () => {

      signupForm.classList.add("hidden");
      loginForm.classList.remove("hidden");

    });


  document.getElementById("loginBtn")
    ?.addEventListener("click", login);


  document.getElementById("signupBtn")
    ?.addEventListener("click", signup);

}


async function login() {

  const email =
    document.getElementById("loginEmail").value.trim();

  const password =
    document.getElementById("loginPassword").value;

  const message =
    document.getElementById("loginMessage");

  if (!email || !password) {

    message.textContent =
      "Enter your email and password.";

    return;

  }

  message.textContent = "Logging in...";

  const { error } =
    await carzaSupabase.auth.signInWithPassword({
      email,
      password
    });

  if (error) {

    message.textContent = error.message;
    return;

  }

  window.location.href = "dealer.html";
}


async function signup() {

  const name =
    document.getElementById("signupName").value.trim();

  const email =
    document.getElementById("signupEmail").value.trim();

  const phone =
    document.getElementById("signupPhone").value.trim();

  const city =
    document.getElementById("signupCity").value.trim();

  const password =
    document.getElementById("signupPassword").value;

  const message =
    document.getElementById("signupMessage");

  if (!name || !email || !password) {

    message.textContent =
      "Dealership name, email and password are required.";

    return;

  }

  if (password.length < 6) {

    message.textContent =
      "Password must be at least 6 characters.";

    return;

  }

  message.textContent = "Creating account...";

  const { data, error } =
    await carzaSupabase.auth.signUp({

      email,
      password,

      options: {

        data: {

          dealership_name: name,
          phone,
          city

        }

      }

    });

  if (error) {

    message.textContent = error.message;
    return;

  }

  if (!data.session) {

    message.textContent =
      "Account created. Check your email to confirm your account, then log in.";

    return;

  }

  window.location.href = "dealer.html";
}


/* =========================================
   DEALER DASHBOARD
========================================= */

async function loadDealerDashboard() {

  const {
    data: { session }
  } = await carzaSupabase.auth.getSession();

  if (!session) {

    window.location.href = "login.html";
    return;

  }

  const user = session.user;

  await ensureDealerProfile(user);

  await refreshDealerDashboard(user.id);

  setupDealerButtons(user.id);

}


async function ensureDealerProfile(user) {

  const { data } =
    await carzaSupabase
      .from("dealers")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

  if (data) {

    document.getElementById("dealerName").textContent =
      data.dealership_name;

    return data;

  }

  const metadata =
    user.user_metadata || {};

  const dealer = {

    id: user.id,

    dealership_name:
      metadata.dealership_name ||
      "New CARZA Dealer",

    email:
      user.email,

    phone:
      metadata.phone || "",

    city:
      metadata.city || ""

  };

  const { data: created, error } =
    await carzaSupabase
      .from("dealers")
      .insert(dealer)
      .select()
      .single();

  if (error) {

    console.error(error);

    document.getElementById("dealerName").textContent =
      "Dealer Dashboard";

    return null;

  }

  document.getElementById("dealerName").textContent =
    created.dealership_name;

  return created;
}


async function refreshDealerDashboard(dealerId) {

  const { data, error } =
    await carzaSupabase
      .from("vehicles")
      .select("*")
      .eq("dealer_id", dealerId)
      .order("created_at", {
        ascending: false
      });

  if (error) {

    console.error(error);
    return;

  }

  const total =
    document.getElementById("totalDealerCars");

  const pending =
    document.getElementById("pendingDealerCars");

  const approved =
    document.getElementById("approvedDealerCars");

  total.textContent = data.length;

  pending.textContent =
    data.filter(v => v.status === "pending").length;

  approved.textContent =
    data.filter(v => v.status === "approved").length;

  const container =
    document.getElementById("dealerVehicles");

  if (!data.length) {

    container.innerHTML =
      `<div class="loading">
        You haven't uploaded any vehicles yet.
      </div>`;

    return;

  }

  container.innerHTML = data.map(vehicle => `

    <div class="dealer-vehicle">

      <div>

        <strong>
          ${escapeHTML(vehicle.year)}
          ${escapeHTML(vehicle.make)}
          ${escapeHTML(vehicle.model)}
        </strong>

        <div class="muted">
          R${formatNumber(vehicle.price)}
          · ${formatNumber(vehicle.mileage)} km
        </div>

      </div>

      <span class="status ${vehicle.status}">
        ${vehicle.status.toUpperCase()}
      </span>

    </div>

  `).join("");
}


function setupDealerButtons(dealerId) {

  const form =
    document.getElementById("vehicleFormSection");

  document.getElementById("showAddVehicle")
    ?.addEventListener("click", () => {

      form.classList.remove("hidden");

      window.scrollTo({
        top: form.offsetTop - 90,
        behavior: "smooth"
      });

    });


  document.getElementById("cancelVehicle")
    ?.addEventListener("click", () => {

      form.classList.add("hidden");

    });


  document.getElementById("saveVehicle")
    ?.addEventListener("click", () => {

      createVehicle(dealerId);

    });


  document.getElementById("refreshDealerCars")
    ?.addEventListener("click", () => {

      refreshDealerDashboard(dealerId);

    });


  document.getElementById("paymentRequestBtn")
    ?.addEventListener("click", () => {

      createPaymentRequest(dealerId);

    });


  document.getElementById("logoutBtn")
    ?.addEventListener("click", logout);

}


async function createVehicle(dealerId) {

  const message =
    document.getElementById("vehicleMessage");

  const make =
    document.getElementById("vehicleMake").value.trim();

  const model =
    document.getElementById("vehicleModel").value.trim();

  const year =
    Number(document.getElementById("vehicleYear").value);

  const price =
    Number(document.getElementById("vehiclePrice").value);

  const mileage =
    Number(document.getElementById("vehicleMileage").value);

  const location =
    document.getElementById("vehicleLocation").value.trim();

  const body =
    document.getElementById("vehicleBody").value;

  const transmission =
    document.getElementById("vehicleTransmission").value;

  const fuel =
    document.getElementById("vehicleFuel").value;

  const description =
    document.getElementById("vehicleDescription").value.trim();

  const files =
    document.getElementById("vehicleImages").files;


  if (
    !make ||
    !model ||
    !year ||
    !price ||
    !location ||
    !body ||
    !transmission ||
    !fuel
  ) {

    message.textContent =
      "Please complete all required fields.";

    return;

  }

  message.textContent =
    "Uploading vehicle...";


  const imageUrls = [];


  for (const file of files) {

    const safeName =
      file.name
        .replace(/[^a-zA-Z0-9.-]/g, "-");

    const path =
      `${dealerId}/${Date.now()}-${safeName}`;

    const { error } =
      await carzaSupabase.storage
        .from("vehicle-images")
        .upload(path, file, {
          upsert: false
        });

    if (error) {

      console.error(error);

      message.textContent =
        "Image upload failed. Make sure the vehicle-images bucket exists.";

      return;

    }

    const { data } =
      carzaSupabase.storage
        .from("vehicle-images")
        .getPublicUrl(path);

    imageUrls.push(data.publicUrl);

  }


  const { error } =
    await carzaSupabase
      .from("vehicles")
      .insert({

        dealer_id: dealerId,
        make,
        model,
        year,
        price,
        mileage,
        location,
        body_type: body,
        transmission,
        fuel_type: fuel,
        description,
        image_urls: imageUrls,
        status: "pending"

      });


  if (error) {

    console.error(error);

    message.textContent =
      error.message;

    return;

  }


  message.textContent =
    "Vehicle submitted! It is now waiting for moderation.";

  document.getElementById("vehicleFormSection")
    .classList.add("hidden");

  await refreshDealerDashboard(dealerId);

}


async function createPaymentRequest(dealerId) {

  const reference =
    "CARZA-" +
    Math.floor(
      100000 + Math.random() * 900000
    );

  const { error } =
    await carzaSupabase
      .from("payment_requests")
      .insert({

        dealer_id: dealerId,

        reference,

        amount: 50,

        description:
          "CARZA vehicle listing package"

      });

  if (error) {

    alert(error.message);
    return;

  }

  const payment =
    document.getElementById("paymentInfo");

  payment.innerHTML = `

    <div class="admin-item">

      <h3>Payment Request Created</h3>

      <p class="muted">
        Reference: <strong>${reference}</strong>
      </p>

      <br>

      <p>
        Amount: <strong>R50</strong>
      </p>

      <br>

      <p class="muted">
        EFT banking details will be displayed here
        once CARZA's official business banking account
        is ready.
      </p>

      <br>

      <strong>
        Always use ${reference} as the payment reference.
      </strong>

    </div>

  `;

}


/* =========================================
   ADMIN
========================================= */


const ADMIN_EMAIL =
  "ihsanthegoated@gmail.com";


async function loadAdmin() {

  const {
    data: { session }
  } = await carzaSupabase.auth.getSession();

  if (!session) {

    window.location.href = "login.html";
    return;

  }

  if (
    session.user.email.toLowerCase() !==
    ADMIN_EMAIL.toLowerCase()
  ) {

    document.body.innerHTML = `
      <main class="auth-page">
        <div class="auth-card">
          <h1>Access denied</h1>
          <p class="muted">
            This account is not authorised as a CARZA administrator.
          </p>
        </div>
      </main>
    `;

    return;

  }

  await refreshAdmin();

  document.getElementById("refreshAdmin")
    ?.addEventListener("click", refreshAdmin);

  document.getElementById("logoutBtn")
    ?.addEventListener("click", logout);

}


async function refreshAdmin() {

  await loadAdminStats();
  await loadPendingVehicles();
  await loadPaymentRequests();

}


async function loadAdminStats() {

  const { count: pending } =
    await carzaSupabase
      .from("vehicles")
      .select("*", {
        count: "exact",
        head: true
      })
      .eq("status", "pending");

  const { count: approved } =
    await carzaSupabase
      .from("vehicles")
      .select("*", {
        count: "exact",
        head: true
      })
      .eq("status", "approved");

  const { count: dealers } =
    await carzaSupabase
      .from("dealers")
      .select("*", {
        count: "exact",
        head: true
      });

  document.getElementById("adminPending").textContent =
    pending || 0;

  document.getElementById("adminApproved").textContent =
    approved || 0;

  document.getElementById("adminDealers").textContent =
    dealers || 0;

}


async function loadPendingVehicles() {

  const container =
    document.getElementById("pendingVehicles");

  const { data, error } =
    await carzaSupabase
      .from("vehicles")
      .select(`
        *,
        dealers (
          dealership_name
        )
      `)
      .eq("status", "pending")
      .order("created_at", {
        ascending: false
      });

  if (error) {

    container.innerHTML =
      `<p class="message">${error.message}</p>`;

    return;

  }

  if (!data.length) {

    container.innerHTML =
      `<div class="loading">
        No vehicles waiting for moderation.
      </div>`;

    return;

  }

  container.innerHTML = data.map(vehicle => `

    <div class="admin-item">

      <h3>
        ${escapeHTML(vehicle.year)}
        ${escapeHTML(vehicle.make)}
        ${escapeHTML(vehicle.model)}
      </h3>

      <p class="muted">
        Dealership:
        ${escapeHTML(
          vehicle.dealers?.dealership_name ||
          "Unknown"
        )}
      </p>

      <p>
        R${formatNumber(vehicle.price)}
        · ${formatNumber(vehicle.mileage)} km
      </p>

      <p class="muted">
        ${escapeHTML(vehicle.description || "")}
      </p>

      <div class="admin-item-actions">

        <button
          class="btn success"
          onclick="moderateVehicle('${vehicle.id}', 'approved')"
        >
          Approve
        </button>

        <button
          class="btn danger"
          onclick="moderateVehicle('${vehicle.id}', 'rejected')"
        >
          Reject
        </button>

      </div>

    </div>

  `).join("");

}


async function moderateVehicle(id, status) {

  const { error } =
    await carzaSupabase
      .from("vehicles")
      .update({ status })
      .eq("id", id);

  if (error) {

    alert(error.message);
    return;

  }

  await refreshAdmin();

}


async function loadPaymentRequests() {

  const container =
    document.getElementById("paymentRequests");

  const { data, error } =
    await carzaSupabase
      .from("payment_requests")
      .select(`
        *,
        dealers (
          dealership_name
        )
      `)
      .order("created_at", {
        ascending: false
      });

  if (error) {

    container.innerHTML =
      `<p class="message">${error.message}</p>`;

    return;

  }

  if (!data.length) {

    container.innerHTML =
      `<div class="loading">
        No payment requests.
      </div>`;

    return;

  }

  container.innerHTML = data.map(payment => `

    <div class="admin-item">

      <h3>
        ${escapeHTML(
          payment.dealers?.dealership_name ||
          "Dealer"
        )}
      </h3>

      <p>
        Reference:
        <strong>${escapeHTML(payment.reference)}</strong>
      </p>

      <p>
        Amount:
        <strong>R${formatNumber(payment.amount)}</strong>
      </p>

      <p class="muted">
        Status: ${escapeHTML(payment.status)}
      </p>

      ${
        payment.status === "pending"
        ? `
          <div class="admin-item-actions">

            <button
              class="btn success"
              onclick="verifyPayment('${payment.id}')"
            >
              Verify Payment
            </button>

            <button
              class="btn danger"
              onclick="rejectPayment('${payment.id}')"
            >
              Reject
            </button>

          </div>
        `
        : ""
      }

    </div>

  `).join("");

}


async function verifyPayment(id) {

  const { error } =
    await carzaSupabase
      .from("payment_requests")
      .update({
        status: "verified"
      })
      .eq("id", id);

  if (error) {

    alert(error.message);
    return;

  }

  await refreshAdmin();

}


async function rejectPayment(id) {

  const { error } =
    await carzaSupabase
      .from("payment_requests")
      .update({
        status: "rejected"
      })
      .eq("id", id);

  if (error) {

    alert(error.message);
    return;

  }

  await refreshAdmin();

}


/* =========================================
   LOGOUT
========================================= */

async function logout() {

  await carzaSupabase.auth.signOut();

  window.location.href = "index.html";

}


/* =========================================
   UTILITIES
========================================= */

function formatNumber(number) {

  return Number(number || 0)
    .toLocaleString("en-ZA");

}


function escapeHTML(value) {

  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}
