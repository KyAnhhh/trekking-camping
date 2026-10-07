import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
// All API requests use fixtures; this suite never writes to the application database.
const origin = process.env.UI_BASE_URL || "http://127.0.0.1:5174";
const debugOrigin = process.env.CHROME_DEBUG_URL || "http://127.0.0.1:9222";
const artifacts = new URL(
  "../node_modules/.cache/trek-preview/",
  import.meta.url,
);
await fs.mkdir(artifacts, { recursive: true });
// Use a separate tab so the test does not replace an existing browser page.
const page = await (
  await fetch(debugOrigin + "/json/new?about:blank", { method: "PUT" })
).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) =>
  ws.addEventListener("open", resolve, { once: true }),
);
let id = 0;
const pending = new Map();
const errors = [],
  writes = [],
  results = [];
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const callId = ++id;
    pending.set(callId, { resolve, reject });
    ws.send(JSON.stringify({ id: callId, method, params }));
  });
const tours = [
  {
    id: 1,
    title: "Tà Năng – Phan Dũng",
    slug: "ta-nang-phan-dung",
    location: "Lâm Đồng · Bình Thuận",
    durationDays: 2,
    durationNights: 1,
    difficultyLevel: 2,
    pricePerPax: 2690000,
    maxCapacity: 16,
    summary: "Bước qua đồi cỏ, ngắm bình minh giữa những cung đường xanh.",
    description:
      "Băng qua đồi cỏ và những cánh rừng. Trải nghiệm hai ngày gần thiên nhiên.",
    requiredGear: "Giày trekking, áo mưa, bình nước.",
    safetyTips: "Theo sát hướng dẫn viên và lịch trình đoàn.",
  },
  {
    id: 2,
    title: "Một ngày giữa rừng Bidoup",
    slug: "bidoup",
    location: "Lâm Đồng",
    durationDays: 1,
    durationNights: 0,
    difficultyLevel: 1,
    pricePerPax: 950000,
    maxCapacity: 12,
    summary: "Lắng nghe âm thanh của rừng và tận hưởng một ngày ngoài trời.",
  },
  {
    id: 3,
    title: "Tà Xùa · Theo dấu mây",
    slug: "ta-xua",
    location: "Sơn La",
    durationDays: 3,
    durationNights: 2,
    difficultyLevel: 3,
    pricePerPax: 3990000,
    maxCapacity: 10,
    summary: "Thử thách những bước chân trên sống núi giữa biển mây.",
  },
];
const future = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10);
const later = new Date(Date.now() + 86400000 * 31).toISOString().slice(0, 10);
let itineraries = [
  {
    id: 1,
    dayNumber: 1,
    title: "Đường vào đồi cỏ",
    description: "Gặp hướng dẫn viên, kiểm tra trang bị và bắt đầu hành trình.",
  },
  {
    id: 2,
    dayNumber: 2,
    title: "Đón bình minh trên đồi",
    description: "Ăn sáng, thu dọn khu trại và trở về điểm đón.",
  },
];
let schedules = [
  {
    id: 1,
    departureDate: future,
    returnDate: later,
    availableSlots: 8,
    guideName: "Hướng dẫn viên thử nghiệm",
    guidePhone: "0900000000",
    status: "OPEN",
  },
];
let gears = [
  { id: 1, gearName: "Lều và túi ngủ", isProvided: true, rentalPrice: 0 },
];
let files = ["huong-dan-chuan-bi.txt", "cau-hoi-thuong-gap.txt"];
let photos = [];
let guideRows = [
  {
    profile: {
      id: 1,
      code: "HDV_01",
      fullName: "Người dẫn đoàn thử nghiệm",
      bio: "Đồng hành trên các cung đường rừng.",
      specialties: "Trekking, định hướng",
      languages: "Tiếng Việt",
      experienceSince: 2020,
    },
    phone: "0900000000",
    email: "guide@example.test",
    active: true,
  },
];
let failAssignment = false;
const fixturePng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
let bookings = [],
  failTours = false;
let paymentHistory = [];
let failPayment = false;
const paymentOrder = "MM-00000000-0000-0000-0000-000000000001";
const bookingDetail = (booking) => ({
  booking,
  contactName: "Khách thử nghiệm",
  contactEmail: "traveler@example.test",
  contactPhone: "0900000000",
  payments: paymentHistory,
  canCancel:
    booking.status === "PENDING" &&
    paymentHistory.every((p) => p.status === "FAILED"),
  canConfirm: false,
});
function api(request) {
  const url = new URL(request.url),
    path = url.pathname,
    method = request.method;
  const payload =
    request.postData && request.headers["Content-Type"]?.includes("json")
      ? JSON.parse(request.postData)
      : request.postData && request.postData.startsWith("{")
        ? JSON.parse(request.postData)
        : {};
  if (method !== "GET" && method !== "OPTIONS")
    writes.push({ path, method, payload });
  if (method === "OPTIONS") return { status: 204 };
  if (path === "/api/admin/guides") {
    if (method === "POST") {
      const row = {
        profile: { ...payload, id: guideRows.length + 1 },
        phone: payload.phone,
        email: payload.email,
        active: payload.active,
      };
      guideRows.push(row);
      return { data: row };
    }
    return { data: guideRows };
  }
  if (/^\/api\/admin\/guides\/\d+\/avatar$/.test(path)) {
    const row = guideRows.find(
      (r) => r.profile.id === Number(path.split("/").at(-2)),
    );
    row.profile.avatarUrl = "data:image/png;base64," + fixturePng;
    return { data: row };
  }
  if (/^\/api\/admin\/guides\/\d+$/.test(path)) {
    const row = guideRows.find(
      (r) => r.profile.id === Number(path.split("/").at(-1)),
    );
    row.profile = { ...row.profile, ...payload };
    row.active = payload.active;
    return { data: row };
  }
  if (/^\/api\/guides\/\d+$/.test(path))
    return {
      data: guideRows.find(
        (r) => r.profile.id === Number(path.split("/").at(-1)),
      )?.profile,
    };
  if (/^\/api\/admin\/schedules\/\d+\/guides$/.test(path)) {
    const schedule = schedules.find(
      (s) => s.id === Number(path.split("/").at(-2)),
    );
    if (method === "PUT") {
      if (failAssignment)
        return {
          status: 409,
          message: "Hướng dẫn viên đã được phân công trong khoảng ngày này.",
        };
      schedule.guides = payload.map((a) => ({
        guide: guideRows.find((g) => g.profile.code === a.guideCode).profile,
        role: a.role,
      }));
      schedule.guideName = null;
    }
    return {
      data: {
        guides: schedule.guides || [],
        legacyGuideName: schedule.guideName,
      },
    };
  }
  if (/^\/api\/(admin\/)?bookings\/\d+\/guides$/.test(path))
    return {
      data: {
        guides: schedules[0].guides || [],
        legacyGuideName: schedules[0].guideName,
      },
    };
  if (path === "/api/auth/logout" || path === "/api/auth/reset-password")
    return { data: null };
  if (path === "/api/auth/forgot-password")
    return {
      data: "Nếu email thuộc tài khoản đang hoạt động, bạn sẽ nhận liên kết đặt lại mật khẩu.",
    };
  if (path === "/api/admin/tours/import") {
    const imported = {
      ...tours[0],
      id: tours.length + 1,
      title: "Tour import thử nghiệm",
      slug: "tour-import-thu-nghiem",
    };
    tours.push(imported);
    return { data: { count: 1, tours: [imported] } };
  }
  if (/^\/api\/tours\/\d+\/images$/.test(path)) {
    if (method === "POST") {
      const photo = {
        id: photos.length + 1,
        imageUrl: "data:image/png;base64," + fixturePng,
        isCover: photos.length === 0,
      };
      photos.push(photo);
      return { data: photo };
    }
    return { data: photos };
  }
  if (/^\/api\/tours\/\d+\/images\/\d+\/cover$/.test(path)) {
    const imageId = Number(path.split("/").at(-2));
    photos.forEach((p) => (p.isCover = p.id === imageId));
    return { data: null };
  }
  if (/^\/api\/tours\/\d+\/images\/\d+$/.test(path) && method === "DELETE") {
    photos = photos.filter((p) => p.id !== Number(path.split("/").at(-1)));
    if (photos.length) photos[0].isCover = true;
    return { data: null };
  }
  if (path === "/api/tours" && method === "GET")
    return failTours
      ? { status: 500, message: "Lỗi kết nối thử nghiệm" }
      : { data: tours };
  if (path === "/api/tours" && method === "POST") {
    const tour = { id: tours.length + 1, ...payload };
    tours.push(tour);
    return { data: tour };
  }
  if (/^\/api\/tours\/\d+\/itineraries$/.test(path)) {
    if (method === "POST")
      itineraries.push({ id: itineraries.length + 1, ...payload });
    return { data: method === "GET" ? itineraries : itineraries.at(-1) };
  }
  if (/^\/api\/tours\/\d+\/schedules$/.test(path)) {
    if (method === "POST")
      schedules.push({ id: schedules.length + 1, ...payload, status: "OPEN" });
    return { data: method === "GET" ? schedules : schedules.at(-1) };
  }
  if (/^\/api\/tours\/\d+\/gears$/.test(path)) {
    if (method === "POST") gears.push({ id: gears.length + 1, ...payload });
    return { data: method === "GET" ? gears : gears.at(-1) };
  }
  if (path.startsWith("/api/tours/"))
    return { data: tours.find((t) => t.slug === path.split("/").at(-1)) };
  if (path === "/api/users")
    return {
      data: [
        {
          id: 1,
          fullName: "Người dùng thử nghiệm",
          email: "traveler@example.test",
          role: "ROLE_USER",
          phone: "0900000000",
        },
        {
          id: 2,
          fullName: "Quản trị thử nghiệm",
          email: "admin@example.test",
          role: "ROLE_ADMIN",
        },
      ],
    };
  if (path === "/api/admin/knowledge/files") return { data: files };
  if (path === "/api/admin/knowledge/upload") {
    files.push("ui-knowledge.txt");
    return { data: { fileName: "ui-knowledge.txt", totalChunksCreated: 1 } };
  }
  if (path === "/api/admin/knowledge/delete") {
    files = files.filter((f) => f !== url.searchParams.get("fileName"));
    return { data: null };
  }
  if (path === "/api/auth/login")
    return {
      data: {
        token: "ui-test-token",
        user: {
          email: payload.email,
          role: payload.email.startsWith("admin") ? "ROLE_ADMIN" : "ROLE_USER",
          fullName: "Khách thử nghiệm",
          phone: "0900000000",
        },
      },
    };
  if (path === "/api/auth/register") return { data: { id: 3 } };
  if (path === "/api/bookings" && method === "POST") {
    bookings.push({
      id: 1,
      bookingCode: "TEST-001",
      tourTitle: tours[0].title,
      tourSlug: tours[0].slug,
      departureDate: future,
      returnDate: later,
      numberOfPax: payload.numberOfPax,
      totalAmount: tours[0].pricePerPax * payload.numberOfPax,
      status: "PENDING",
    });
    return { data: bookings[0] };
  }
  if (path === "/api/bookings/my-bookings") return { data: bookings };
  if (path === "/api/admin/bookings")
    return { data: bookings.map(bookingDetail) };
  if (/^\/api\/(admin\/)?bookings\/1$/.test(path))
    return { data: bookingDetail(bookings[0]) };
  if (/^\/api\/(admin\/)?bookings\/1\/cancel$/.test(path)) {
    bookings[0].status = "CANCELLED";
    return { data: bookingDetail(bookings[0]) };
  }
  if (path === "/api/payments/momo/start") {
    if (failPayment)
      return {
        status: 503,
        message: "MoMo sandbox chưa được cấu hình tài khoản merchant.",
      };
    paymentHistory = [
      {
        id: 1,
        transactionCode: paymentOrder,
        paymentMethod: "MOMO_SANDBOX",
        amount: bookings[0].totalAmount,
        status: "PENDING",
      },
    ];
    return {
      data: {
        bookingId: 1,
        orderId: paymentOrder,
        status: "PENDING",
        payUrl: null,
      },
    };
  }
  if (path === "/api/payments/momo/" + paymentOrder + "/refresh") {
    paymentHistory[0].status = "SUCCESS";
    bookings[0].status = "CONFIRMED";
    return {
      data: {
        bookingId: 1,
        orderId: paymentOrder,
        status: "SUCCESS",
        payUrl: null,
      },
    };
  }
  if (path === "/api/chat")
    return {
      data: {
        reply:
          "Bạn có thể xem [tour Tà Năng](/tours/ta-nang-phan-dung) và kiểm tra trang bị trước chuyến đi.",
        sessionId: "ui-test-session",
      },
    };
  return { status: 404, message: "Unmocked API: " + method + " " + path };
}
ws.addEventListener("message", async (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id) {
    const call = pending.get(msg.id);
    if (call) {
      pending.delete(msg.id);
      msg.error
        ? call.reject(new Error(JSON.stringify(msg.error)))
        : call.resolve(msg.result);
    }
  }
  if (msg.method === "Runtime.exceptionThrown")
    errors.push(
      msg.params.exceptionDetails.exception?.description ||
        msg.params.exceptionDetails.text,
    );
  if (msg.method === "Fetch.requestPaused") {
    const { request, requestId } = msg.params;
    try {
      if (new URL(request.url).pathname.startsWith("/api/")) {
        const result = api(request);
        await send("Fetch.fulfillRequest", {
          requestId,
          responseCode: result.status || 200,
          responseHeaders: [
            { name: "Content-Type", value: "application/json" },
            { name: "Access-Control-Allow-Origin", value: "*" },
            { name: "Access-Control-Allow-Headers", value: "*" },
            {
              name: "Access-Control-Allow-Methods",
              value: "GET,POST,PUT,DELETE,OPTIONS",
            },
          ],
          body: Buffer.from(
            JSON.stringify({
              code: result.status ? result.status : 1000,
              message: result.message || "success",
              data: result.data,
            }),
          ).toString("base64"),
        });
      } else await send("Fetch.continueRequest", { requestId });
    } catch (error) {
      errors.push(error.message);
    }
  }
});
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function evaluate(expression) {
  const r = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails)
    throw new Error(
      r.exceptionDetails.exception?.description || r.exceptionDetails.text,
    );
  return r.result.value;
}
async function wait(expression) {
  for (let i = 0; i < 80; i++) {
    if (await evaluate("Boolean(" + expression + ")")) return;
    await pause(100);
  }
  throw new Error("Timeout: " + expression);
}
async function go(path) {
  await send("Page.navigate", { url: origin + path });
  await wait(
    "document.querySelector('h1') !== null && !document.querySelector('.loading-state')",
  );
  await pause(150);
}
async function viewport(width, height = 900) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
}
async function set(selector, value) {
  await evaluate(
    "(()=>{const e=document.querySelector(" +
      JSON.stringify(selector) +
      "); Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e," +
      JSON.stringify(value) +
      "); e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()",
  );
  await pause(80);
}
async function click(selector) {
  await evaluate(
    "document.querySelector(" + JSON.stringify(selector) + ").click()",
  );
  await pause(150);
}
async function shot(name) {
  await evaluate("document.fonts.ready.then(() => true)");
  await pause(200);
  const { data } = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await fs.writeFile(
    new URL(name + ".png", artifacts),
    Buffer.from(data, "base64"),
  );
}
async function check(name) {
  const v = await evaluate(
    "({width:innerWidth,scroll:document.documentElement.scrollWidth,h1:document.querySelector('h1')?.textContent})",
  );
  if (v.scroll > v.width + 1)
    console.log(
      await evaluate(
        "[...document.querySelectorAll('body *')].map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).filter(e=>e.right>innerWidth+1).slice(0,25)",
      ),
    );
  assert.ok(v.scroll <= v.width + 1, name + " overflow " + JSON.stringify(v));
  results.push(name);
}
try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Fetch.enable", {
    patterns: [{ urlPattern: "*", requestStage: "Request" }],
  });
  await viewport(1440);
  await go("/");
  errors.length = 0;
  await evaluate("localStorage.clear()");
  await go("/");
  await wait("document.querySelectorAll('.tour-card').length === 3");
  await pause(1000);
  await check("Home desktop");
  await shot("home-desktop");
  await viewport(390, 844);
  await check("Home mobile");
  await shot("home-mobile");
  await click(".mobile-toggle");
  assert.equal(
    await evaluate(
      "document.querySelector('.mobile-toggle').getAttribute('aria-expanded')",
    ),
    "true",
  );
  await click(".mobile-toggle");
  await go("/tours?difficulty=1");
  assert.equal(
    await evaluate("document.querySelectorAll('.tour-card').length"),
    1,
  );
  await check("Tour filter mobile");
  await go("/tours/ta-nang-phan-dung");
  await check("Tour detail mobile");
  await shot("detail-mobile");
  await go("/tours/ta-nang-phan-dung/booking?schedule=1");
  await wait("location.pathname === '/login'");
  await set("input[type=email]", "traveler@example.test");
  await set("input[autocomplete=current-password]", "test-only-password");
  await evaluate("document.querySelector('form').requestSubmit()");
  await wait(
    "location.pathname.endsWith('/booking') && document.querySelector('[name=contactName]')",
  );
  await check("Booking redirect after login");
  assert.equal(
    await evaluate("document.querySelector('[name=scheduleId]').value"),
    "1",
  );
  await set("[name=numberOfPax]", "2");
  await evaluate("document.querySelector('form').requestSubmit()");
  await wait(
    "location.pathname === '/my-bookings/1' && document.querySelector('.payment-summary')",
  );
  assert.equal(
    writes.find((w) => w.path === "/api/bookings").payload.numberOfPax,
    2,
  );
  await check("Booking created and displayed");
  await shot("booking-detail-mobile");
  await click(".payment-summary .btn-outline");
  await wait("document.querySelector('dialog[open]')");
  await click(".payment-actions .btn-outline");
  assert.equal(writes.filter((w) => w.path.endsWith("/cancel")).length, 0);
  results.push("Booking cancel requires confirmation");
  failPayment = true;
  await click(".payment-summary .btn");
  await wait(
    "document.querySelector('.notice-error')?.textContent.includes('chưa được cấu hình')",
  );
  assert.equal(
    await evaluate("localStorage.getItem('token')"),
    "ui-test-token",
  );
  results.push("Payment 503 shown without logging user out");
  failPayment = false;
  await click(".payment-summary .btn");
  await wait("document.querySelector('.payment-row')");
  assert.deepEqual(
    writes.find((w) => w.path === "/api/payments/momo/start").payload,
    { bookingId: 1 },
  );
  await go(
    "/payment/momo/return?orderId=" +
      paymentOrder +
      "&resultCode=1006&amount=1",
  );
  await wait(
    "document.querySelector('.payment-summary h2')?.textContent === 'Đã thanh toán'",
  );
  results.push(
    "MoMo return uses backend result, not redirect amount or status",
  );
  await go("/my-bookings/1");
  await wait("document.querySelector('.status-confirmed')");
  await check("Paid booking detail mobile");
  await viewport(320);
  await check("Paid booking detail 320px");
  await viewport(390, 844);
  await go("/my-bookings");
  await wait("document.querySelector('.booking-card')");
  await check("My bookings links to payment details");
  await go("/admin");
  assert.equal(await evaluate("location.pathname"), "/");
  results.push("User blocked from admin");
  await go("/chat?tour=Ta%20Nang");
  await check("Chat mobile");
  await evaluate("document.querySelector('.chat-composer').requestSubmit()");
  await wait(
    "document.querySelectorAll('.chat-message').length === 3 && !document.querySelector('.typing-dots')",
  );
  await shot("chat-mobile");
  await set("#page-message", "Cần mang gì?");
  await evaluate("document.querySelector('.chat-composer').requestSubmit()");
  await wait(
    "document.querySelectorAll('.chat-message').length === 5 && !document.querySelector('.typing-dots')",
  );
  assert.equal(
    writes.filter((w) => w.path === "/api/chat")[1].payload.sessionId,
    "ui-test-session",
  );
  results.push("Chat session retained");
  await evaluate(
    "localStorage.setItem('role','ROLE_ADMIN');localStorage.setItem('username','Quản trị thử nghiệm')",
  );
  await viewport(1440);
  await go("/admin");
  await check("Admin dashboard desktop");
  await shot("admin-desktop");
  for (const path of [
    "/admin/tours",
    "/admin/tours/ta-nang-phan-dung",
    "/admin/users",
    "/admin/bookings",
    "/admin/bookings/1",
    "/admin/knowledge",
  ]) {
    await go(path);
    await check(path + " desktop");
  }
  await go("/admin/guides");
  await check("Guide management desktop");
  await set('input[placeholder="HDV_001"]', "HDV_02");
  await set('input[maxlength="150"]', "Hướng dẫn viên mới");
  await evaluate("document.querySelector('form').requestSubmit()");
  await wait("document.querySelectorAll('.guide-admin-card').length === 2");
  assert.equal(guideRows[1].profile.code, "HDV_02");
  await click(".guide-actions button");
  await set('input[maxlength="500"]', "Trekking, sơ cứu cơ bản");
  await evaluate("document.querySelector('form').requestSubmit()");
  await wait("document.querySelector('.notice-success')");
  results.push("Guide create and edit use admin API");
  await fs.writeFile(
    new URL("guide-avatar.png", artifacts),
    Buffer.from(fixturePng, "base64"),
  );
  const guideDom = await send("DOM.getDocument");
  const guideInput = await send("DOM.querySelector", {
    nodeId: guideDom.root.nodeId,
    selector: ".guide-admin-card input[type=file]",
  });
  await send("DOM.setFileInputFiles", {
    nodeId: guideInput.nodeId,
    files: [fileURLToPath(new URL("guide-avatar.png", artifacts))],
  });
  await wait("document.querySelector('.guide-admin-avatar')");
  results.push("Guide avatar upload");
  await shot("guides-admin-desktop");
  await go("/admin/tours/ta-nang-phan-dung");
  await click(".segmented-tabs button:nth-child(2)");
  await click(".admin-item-list .btn");
  await wait("document.querySelector('dialog select')");
  await set("dialog select", "HDV_01");
  failAssignment = true;
  await evaluate("document.querySelector('dialog form').requestSubmit()");
  await wait("document.querySelector('dialog [role=alert]')");
  assert.equal(
    await evaluate("document.querySelector('dialog select').value"),
    "HDV_01",
  );
  failAssignment = false;
  await evaluate("document.querySelector('dialog form').requestSubmit()");
  await wait(
    "!document.querySelector('dialog[open]') && document.querySelector('.guide-card')",
  );
  assert.deepEqual(
    schedules[0].guides.map((g) => g.role),
    ["LEAD"],
  );
  results.push(
    "Guide assignment preserves selection on conflict and saves after retry",
  );
  await go("/tours/ta-nang-phan-dung");
  await wait("document.querySelector('.guide-card')");
  await check("Tour displays assigned guide");
  await go("/guides/1");
  await check("Guide profile desktop");
  await shot("guide-profile-desktop");
  await viewport(390, 844);
  await check("Guide profile mobile");
  await shot("guide-profile-mobile");
  await go("/admin/guides");
  await check("Guide management mobile");
  await viewport(1440);
  await go("/admin/knowledge");
  await click(".file-list button");
  await wait("document.querySelector('dialog[open]') !== null");
  await click(".modal-actions .btn-outline");
  assert.equal(files.length, 2);
  await click(".file-list button");
  await click(".btn-danger");
  await wait("document.querySelectorAll('.file-list li').length === 1");
  results.push("Knowledge delete confirmation");
  await fs.writeFile(
    new URL("ui-knowledge.txt", artifacts),
    "Tài liệu kiểm thử giao diện.",
  );
  const dom = await send("DOM.getDocument");
  const fileNode = await send("DOM.querySelector", {
    nodeId: dom.root.nodeId,
    selector: "input[type=file]",
  });
  await send("DOM.setFileInputFiles", {
    nodeId: fileNode.nodeId,
    files: [fileURLToPath(new URL("ui-knowledge.txt", artifacts))],
  });
  await evaluate(
    "document.querySelector('.upload-panel form').requestSubmit()",
  );
  await wait("document.querySelectorAll('.file-list li').length === 2");
  results.push("Knowledge upload");
  await go("/admin/tours?create=1");
  await set("[name=title]", "Cung đường thử nghiệm");
  await set("[name=slug]", "cung-duong-thu-nghiem");
  await set("[name=location]", "Lâm Đồng");
  await set("[name=pricePerPax]", "1000000");
  await evaluate("document.querySelector('form').requestSubmit()");
  await wait("location.pathname === '/admin/tours/cung-duong-thu-nghiem'");
  results.push("Admin create tour");
  await set("[name=title]", "Khởi hành");
  await set("textarea[name=description]", "Chặng thử nghiệm");
  await evaluate("document.querySelector('form').requestSubmit()");
  await wait(
    "document.querySelector('.notice-success') !== null && !document.querySelector('.loading-state')",
  );
  results.push("Admin add itinerary");
  await click(".segmented-tabs button:nth-child(2)");
  await set("[name=departureDate]", future);
  await set("[name=returnDate]", later);
  await set("[name=availableSlots]", "5");
  await evaluate("document.querySelector('form').requestSubmit()");
  await wait(
    "document.querySelector('.notice-success') !== null && !document.querySelector('.loading-state')",
  );
  assert.equal(
    writes.find((w) => w.path.endsWith("/schedules")).payload.availableSlots,
    5,
  );
  results.push("Admin add schedule");
  await click(".segmented-tabs button:nth-child(3)");
  await set("[name=gearName]", "Gậy trekking");
  await evaluate("document.querySelector('form').requestSubmit()");
  await wait(
    "document.querySelector('.notice-success') !== null && !document.querySelector('.loading-state')",
  );
  assert.equal(
    writes.find((w) => w.path.endsWith("/gears")).payload.isProvided,
    true,
  );
  results.push("Admin add gear");
  await fs.writeFile(
    new URL("upload-test.png", artifacts),
    Buffer.from(fixturePng, "base64"),
  );
  let photoDom = await send("DOM.getDocument");
  let photoInput = await send("DOM.querySelector", {
    nodeId: photoDom.root.nodeId,
    selector: ".tour-image-form input[type=file]",
  });
  await send("DOM.setFileInputFiles", {
    nodeId: photoInput.nodeId,
    files: [fileURLToPath(new URL("upload-test.png", artifacts))],
  });
  await evaluate("document.querySelector('.tour-image-form').requestSubmit()");
  await wait(
    "document.querySelectorAll('.image-manager .tour-photo-grid img').length === 1",
  );
  results.push("Admin uploads actual selected image file");
  await check("Tour images desktop");
  await click(".photo-actions button");
  await wait("document.querySelector('dialog[open]')");
  await click(".modal-actions .btn-danger");
  await wait(
    "!document.querySelector('dialog[open]') && document.querySelectorAll('.image-manager .tour-photo-grid img').length === 0",
  );
  results.push("Admin removes image after confirmation");
  await go("/admin/tours");
  await click(".import-panel .list-toolbar button");
  await fs.writeFile(
    new URL("import-test.json", artifacts),
    JSON.stringify([
      {
        tour: {
          title: "Tour import thử nghiệm",
          slug: "tour-import-thu-nghiem",
        },
      },
    ]),
  );
  const importDom = await send("DOM.getDocument");
  const importInput = await send("DOM.querySelector", {
    nodeId: importDom.root.nodeId,
    selector: ".tour-import-form input[type=file]",
  });
  await send("DOM.setFileInputFiles", {
    nodeId: importInput.nodeId,
    files: [fileURLToPath(new URL("import-test.json", artifacts))],
  });
  await wait(
    "document.querySelector('.tour-import-form li')?.textContent.includes('Tour import')",
  );
  assert.ok(!writes.some((w) => w.path === "/api/admin/tours/import"));
  await evaluate("document.querySelector('.tour-import-form').requestSubmit()");
  await wait(
    "document.querySelector('a[href=\"/admin/tours/tour-import-thu-nghiem\"]')",
  );
  results.push("Import preview confirms before writing and reloads tour list");
  await viewport(390, 844);
  for (const path of [
    "/admin",
    "/admin/tours?create=1",
    "/admin/tours/ta-nang-phan-dung",
    "/admin/users",
    "/admin/bookings",
    "/admin/bookings/1",
    "/admin/knowledge",
  ]) {
    await go(path);
    await check(path + " mobile");
  }
  await shot("admin-knowledge-mobile");
  await click(".sidebar-bottom button");
  await wait("location.pathname === '/login'");
  assert.equal(await evaluate("localStorage.getItem('token')"), null);
  assert.ok(writes.some((w) => w.path === "/api/auth/logout"));
  results.push("Admin logout revokes backend session and clears browser auth");
  await go("/forgot-password");
  await check("Forgot password mobile");
  await set("input[type=email]", "test@example.test");
  await evaluate("document.querySelector('form').requestSubmit()");
  await wait("document.querySelector('.notice-success')");
  assert.ok(writes.some((w) => w.path === "/api/auth/forgot-password"));
  await go("/reset-password#token=" + "a".repeat(43));
  await check("Reset password mobile");
  assert.equal(await evaluate("location.hash"), "");
  await set("[name=password]", "new-test-password");
  await set("[name=confirm]", "mismatched-password");
  await evaluate("document.querySelector('form').requestSubmit()");
  await wait("document.querySelector('.notice-error')");
  assert.ok(!writes.some((w) => w.path === "/api/auth/reset-password"));
  await set("[name=confirm]", "new-test-password");
  await evaluate("document.querySelector('form').requestSubmit()");
  await wait(
    "location.pathname === '/login' && document.querySelector('.notice-success')",
  );
  assert.equal(
    writes.find((w) => w.path === "/api/auth/reset-password").payload.token,
    "a".repeat(43),
  );
  results.push(
    "Password reset validates confirmation and preserves token after hiding URL fragment",
  );
  await evaluate("localStorage.clear()");
  failTours = true;
  await go("/tours");
  await wait("document.querySelector('.empty-state.is-error') !== null");
  results.push("Tour API error displayed");
  failTours = false;
  await click(".empty-state button");
  await wait("document.querySelectorAll('.tour-card').length === 5");
  results.push("Tour API retry works");
  await go("/register");
  await check("Register mobile");
  await viewport(1440);
  await check("Register desktop");
  await shot("register-desktop");
  await set("[name=fullName]", "Khách kiểm thử");
  await set("[name=email]", "new@example.test");
  await set("[name=phone]", "0900000000");
  await set("[name=password]", "test-password");
  await set("[name=confirm]", "mismatched");
  await evaluate("document.querySelector('form').requestSubmit()");
  await wait("document.querySelector('.notice-error')");
  assert.ok(!writes.some((w) => w.path === "/api/auth/register"));
  await set("[name=confirm]", "test-password");
  await evaluate("document.querySelector('form').requestSubmit()");
  await wait(
    "location.pathname === '/login' && document.querySelector('.notice-success')",
  );
  results.push("Registration validation and success");
  for (const width of [320, 768, 1024]) {
    await viewport(width);
    await go("/");
    await check("Home width " + width);
  }
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      { passed: results.length, checks: results, runtimeErrors: errors },
      null,
      2,
    ),
  );
} catch (error) {
  console.log(
    JSON.stringify({
      errors,
      body: await evaluate("document.body.innerText.slice(0,2000)"),
    }),
  );
  throw error;
} finally {
  await send("Page.navigate", { url: "about:blank" });
  await send("Fetch.disable");
  ws.close();
  await fetch(debugOrigin + "/json/close/" + page.id);
}
