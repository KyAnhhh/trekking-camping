import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// Bundle the real API modules with Vite's existing esbuild dependency; no HTTP server is used.
const bundle = await build({
  stdin: {
    contents: `
      export { default as client } from './src/api/axiosClient.js';
      export { authService } from './src/api/authService.js';
      export { tourApi } from './src/api/tourService.js';
      export { bookingService } from './src/api/bookingService.js';
      export { paymentService } from './src/api/paymentService.js';
      export { chatService } from './src/api/chatService.js';
      export { guideService } from './src/api/guideService.js';
      export { adminService } from './src/api/adminService.js';
      export { accountService } from './src/api/accountService.js';
      export { plannerService } from './src/api/plannerService.js';
      export { reviewService } from './src/api/reviewService.js';
      export { participationService } from './src/api/participationService.js';
      export { operationsService } from './src/api/operationsService.js';
      export { notificationService } from './src/api/notificationService.js';
      export { guideWorkspaceService } from './src/api/guideWorkspaceService.js';
      export { guideInvitationService } from './src/api/guideInvitationService.js';
      export { passengerService } from './src/api/passengerService.js';
      export { formatDifficulty } from './src/utils/tour.js';
    `,
    resolveDir: fileURLToPath(new URL("../", import.meta.url)),
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "browser",
  define: { "import.meta.env": "{}" },
});
const api = await import(
  "data:text/javascript;base64," +
    Buffer.from(bundle.outputFiles[0].text).toString("base64")
);
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
globalThis.window = new EventTarget();
let request;
beforeEach(() => {
  storage.clear();
  api.client.defaults.adapter = async (config) => {
    request = config;
    return {
      data: { code: 1000, data: [] },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
});

test('guide invitation credentials stay in POST bodies and passenger paths preserve scope and revision', async () => {
  await api.guideInvitationService.send(2, 'guide@example.test');
  assert.equal(request.url, '/api/admin/guides/2/invitation'); assert.equal(request.method, 'post');
  assert.deepEqual(JSON.parse(request.data), { email: 'guide@example.test' });
  await api.guideInvitationService.revoke(2); assert.equal(request.method, 'delete');
  await api.guideInvitationService.preview('synthetic-token');
  assert.equal(request.url, '/api/guide-invitations/preview'); assert.deepEqual(JSON.parse(request.data), { token: 'synthetic-token' });
  await api.guideInvitationService.accept('synthetic-token', 'synthetic-password');
  assert.equal(request.url, '/api/guide-invitations/accept');
  assert.deepEqual(JSON.parse(request.data), { token: 'synthetic-token', password: 'synthetic-password' });
  await api.passengerService.save(7, ['One', 'Two'], 3, false);
  assert.equal(request.url, '/api/bookings/7/passengers'); assert.equal(request.method, 'put');
  assert.deepEqual(JSON.parse(request.data), { fullNames: ['One', 'Two'], revision: 3 });
  await api.passengerService.list(7, true); assert.equal(request.url, '/api/admin/bookings/7/passengers');
  await api.passengerService.mark(9, 7, 4, 'PRESENT', 2);
  assert.equal(request.url, '/api/guide-workspace/trips/9/bookings/7/passengers/4/attendance');
  assert.deepEqual(JSON.parse(request.data), { status: 'PRESENT', revision: 2 });
  await api.passengerService.history(7, 1, false, 9);
  assert.equal(request.url, '/api/guide-workspace/trips/9/bookings/7/passengers/history'); assert.deepEqual(request.params, { page: 1 });
});

test('admin user edits, activation and deletion preserve the version and bearer token', async () => {
  storage.set('token', 'test-only-token');
  const updatedAt = '2026-10-15T10:00:00.123456';
  await api.adminService.updateUser(7, { fullName: 'Name', phone: '', updatedAt });
  assert.equal(request.url, '/api/users/7'); assert.equal(request.method, 'put');
  assert.equal(request.headers.Authorization, 'Bearer test-only-token');
  assert.deepEqual(JSON.parse(request.data), { fullName: 'Name', phone: '', updatedAt });
  await api.adminService.setUserActive(7, { active: false, updatedAt });
  assert.equal(request.url, '/api/users/7/active'); assert.equal(request.method, 'put');
  assert.deepEqual(JSON.parse(request.data), { active: false, updatedAt });
  await api.adminService.deleteUser(7, updatedAt);
  assert.equal(request.url, '/api/users/7'); assert.equal(request.method, 'delete');
  assert.deepEqual(request.params, { updatedAt });
});

test('admin operations use paged filters and explicit state-safe writes', async () => {
  await api.operationsService.overview();
  assert.equal(request.url, '/api/admin/operations/overview');
  await api.operationsService.bookings('REVIEW_REQUIRED', 2);
  assert.deepEqual(request.params, { queue: 'REVIEW_REQUIRED', page: 2 });
  await api.operationsService.payments('PENDING', 0);
  assert.equal(request.url, '/api/admin/operations/payments');
  assert.deepEqual(request.params, { status: 'PENDING', page: 0 });
  await api.operationsService.reconcile(42);
  assert.equal(request.url, '/api/admin/operations/payments/42/reconcile');
  assert.equal(request.method, 'post');
  assert.equal(JSON.parse(request.data), null); // No client amount, provider or payment status is trusted.
  await api.operationsService.resolve(42, 'SUCCESS', 'Manual bank check');
  assert.equal(request.url, '/api/admin/operations/payments/42/resolve');
  assert.equal(request.method, 'post');
  assert.deepEqual(JSON.parse(request.data), { status: 'SUCCESS', note: 'Manual bank check' });
  await api.operationsService.reviews('HIDDEN', 1);
  assert.deepEqual(request.params, { visibility: 'HIDDEN', page: 1 });
  await api.operationsService.moderate(3, true, false);
  assert.equal(request.url, '/api/admin/operations/reviews/3/visibility');
  assert.equal(request.method, 'put');
  assert.deepEqual(JSON.parse(request.data), { expectedApproved: true, approved: false });
});

test('notifications never accept owner IDs and guide attendance sends the current revision', async () => {
  await api.notificationService.list(2);
  assert.equal(request.url, '/api/notifications'); assert.deepEqual(request.params, { page: 2 });
  await api.notificationService.read(9); assert.equal(request.url, '/api/notifications/9/read'); assert.equal(request.method, 'put');
  await api.notificationService.readAll(); assert.equal(request.url, '/api/notifications/read-all');
  await api.guideWorkspaceService.trips(0); assert.equal(request.url, '/api/guide-workspace/trips');
  await api.guideWorkspaceService.roster(4, 1); assert.equal(request.url, '/api/guide-workspace/trips/4');
  await api.guideWorkspaceService.checkIn(4, 8, 2, 3);
  assert.equal(request.url, '/api/guide-workspace/trips/4/bookings/8/attendance');
  assert.deepEqual(JSON.parse(request.data), { presentCount: 2, revision: 3 });
  await api.guideWorkspaceService.link(4, 'guide@example.test');
  assert.equal(request.url, '/api/admin/guides/4/account'); assert.deepEqual(JSON.parse(request.data), { email: 'guide@example.test' });
});

test("auth and booking services use the server paths and preserve booking payload", async () => {
  await api.authService.login({
    email: "user@example.test",
    password: "test-only",
  });
  assert.equal(request.url, "/api/auth/login");
  assert.equal(request.method, "post");
  await api.authService.register({
    fullName: "Traveler",
    email: "user@example.test",
  });
  assert.equal(request.url, "/api/auth/register");
  assert.equal(JSON.parse(request.data).fullName, "Traveler");
  const payload = { scheduleId: 42, numberOfPax: 2, contactName: "Traveler" };
  await api.bookingService.createBooking(payload);
  assert.equal(request.url, "/api/bookings");
  assert.deepEqual(JSON.parse(request.data), payload);
  await api.bookingService.getMyBookings();
  assert.equal(request.url, "/api/bookings/my-bookings");
});

test("chat carries the server session across turns", async () => {
  await api.chatService.sendMessage(
    "Còn tour nào phù hợp?",
    "session-from-server",
    "session-secret",
  );
  assert.equal(request.url, "/api/chat");
  assert.deepEqual(JSON.parse(request.data), {
    message: "Còn tour nào phù hợp?",
    sessionId: "session-from-server",
    sessionToken: "session-secret",
  });
});
test("chat sessions and explicit draft confirmation use dedicated endpoints", async () => {
  await api.chatService.createSession();
  assert.equal(request.url, "/api/chat/sessions");
  await api.chatService.history({ sessionId: "session", sessionToken: "secret" });
  assert.equal(request.url, "/api/chat/history");
  assert.equal(JSON.parse(request.data).sessionToken, "secret");
  await api.chatService.prepareBooking({ requestId: "stable-request", scheduleId: 5, people: 2 });
  assert.equal(request.url, "/api/chat/booking-drafts");
  assert.deepEqual(JSON.parse(request.data), { requestId: "stable-request", scheduleId: 5, people: 2 });
  await api.chatService.confirmBooking("stable-request", { confirmed: true, contactName: "Test" });
  assert.equal(request.url, "/api/chat/booking-drafts/stable-request/confirm");
  assert.equal(JSON.parse(request.data).confirmed, true);
});
test("private participation uses owner paths and explicit admin review revision", async () => {
  await api.participationService.get(4);
  assert.equal(request.url, "/api/bookings/4/participation");
  await api.participationService.submit(4, { revision: 2, people: [] });
  assert.equal(request.method, "put");
  assert.equal(JSON.parse(request.data).revision, 2);
  await api.participationService.review(4, { revision: 3, decision: "READY" });
  assert.equal(request.url, "/api/admin/bookings/4/participation/review");
  await api.participationService.remove(4);
  assert.equal(request.method, "delete");
});

test("account, planner, reviews and tour management preserve ownership-oriented API paths", async () => {
  await api.accountService.me();
  assert.equal(request.url, "/api/account");
  await api.accountService.update({ fullName: "Traveler", phone: "" });
  assert.equal(request.method, "put");
  await api.accountService.changePassword({
    currentPassword: "old",
    newPassword: "new",
  });
  assert.equal(request.url, "/api/account/password");
  await api.plannerService.generate({ destination: "Da Lat", days: 2 });
  assert.equal(request.url, "/api/plans");
  assert.equal(request.timeout, 110000);
  await api.plannerService.get(7);
  assert.equal(request.url, "/api/plans/7");
  await api.plannerService.remove(7);
  assert.equal(request.method, "delete");
  await api.reviewService.list(3, 2);
  assert.equal(request.url, "/api/tours/3/reviews");
  assert.equal(request.params.page, 2);
  await api.reviewService.create(7, { rating: 5, comment: "Good" });
  assert.equal(request.url, "/api/bookings/7/review");
  await api.bookingService.complete(7);
  assert.equal(request.url, "/api/admin/bookings/7/complete");
  await api.tourApi.adminList();
  assert.equal(request.url, "/api/admin/tours");
  await api.tourApi.setActive(3, false);
  assert.deepEqual(JSON.parse(request.data), { active: false });
  await api.tourApi.updateSchedule(3, 9, { status: "CLOSED" });
  assert.equal(request.url, "/api/admin/tours/3/schedules/9");
});

test("guide assignment uses codes and roles; image upload stays multipart", async () => {
  await api.guideService.importGuides(
    new Blob(["[]"], { type: "application/json" }),
  );
  assert.equal(request.url, "/api/admin/guides/import");
  assert.equal(request.method, "post");
  assert.ok(request.data instanceof FormData);
  assert.equal(await request.data.get("file").text(), "[]");
  const team = [{ guideCode: "HDV_01", role: "LEAD" }];
  await api.guideService.assign(7, team);
  assert.equal(request.method, "put");
  assert.equal(request.url, "/api/admin/schedules/7/guides");
  assert.deepEqual(JSON.parse(request.data), team);
  await api.guideService.bookingTeam(8, false);
  assert.equal(request.url, "/api/bookings/8/guides");
  await api.guideService.bookingTeam(8, true);
  assert.equal(request.url, "/api/admin/bookings/8/guides");
  await api.guideService.upload(2, new Blob(["image"], { type: "image/png" }));
  assert.equal(request.url, "/api/admin/guides/2/avatar");
  assert.ok(request.data instanceof FormData);
  await api.guideService.profile(2);
  assert.equal(request.url, "/api/guides/2");
});

test("recovery, logout, tour import and images preserve API contracts", async () => {
  await api.authService.logout();
  assert.equal(request.url, "/api/auth/logout");
  assert.equal(request.method, "post");
  await api.authService.forgotPassword("test@example.test");
  assert.equal(request.url, "/api/auth/forgot-password");
  assert.deepEqual(JSON.parse(request.data), { email: "test@example.test" });
  await api.authService.resetPassword("synthetic-token", "synthetic-password");
  assert.equal(request.url, "/api/auth/reset-password");
  assert.equal(JSON.parse(request.data).token, "synthetic-token");
  await api.tourApi.importTours(new Blob(["[]"], { type: "application/json" }));
  assert.equal(request.url, "/api/admin/tours/import");
  assert.ok(request.data instanceof FormData);
  await api.tourApi.uploadImage(
    1,
    new Blob(["fixture"], { type: "image/png" }),
  );
  assert.equal(request.url, "/api/tours/1/images");
  assert.ok(request.data instanceof FormData);
  await api.tourApi.setCover(1, 2);
  assert.equal(request.url, "/api/tours/1/images/2/cover");
  assert.equal(request.method, "post");
  await api.tourApi.deleteImage(1, 2);
  assert.equal(request.url, "/api/tours/1/images/2");
  assert.equal(request.method, "delete");
});

test("booking management and payment use protected server endpoints and server amount", async () => {
  await api.bookingService.getDetail(7);
  assert.equal(request.url, "/api/bookings/7");
  await api.bookingService.cancel(7);
  assert.equal(request.url, "/api/bookings/7/cancel");
  assert.equal(request.method, "post");
  await api.bookingService.getDetail(7, true);
  assert.equal(request.url, "/api/admin/bookings/7");
  await api.bookingService.cancel(7, true);
  assert.equal(request.url, "/api/admin/bookings/7/cancel");
  await api.bookingService.confirm(7);
  assert.equal(request.url, "/api/admin/bookings/7/confirm");
  await api.bookingService.getAll();
  assert.equal(request.url, "/api/admin/bookings");
  await api.paymentService.start(7);
  assert.equal(request.url, "/api/payments/vnpay/start");
  assert.deepEqual(JSON.parse(request.data), { bookingId: 7 });
  await api.paymentService.refresh("VN-order");
  assert.equal(request.url, "/api/payments/vnpay/VN-order/refresh");
  assert.equal(request.method, "post");
  await api.paymentService.refresh("MM-order");
  assert.equal(request.url, "/api/payments/momo/MM-order/refresh");
  assert.equal(request.method, "post");
});

test("knowledge uses multipart file and exact filename query", async () => {
  await api.adminService.syncTours();
  assert.equal(request.url, "/api/chat/ingest-tours");
  assert.equal(request.method, "post");
  await api.adminService.uploadFile(
    new Blob(["guide"], { type: "text/plain" }),
  );
  assert.equal(request.url, "/api/admin/knowledge/upload");
  assert.ok(request.data instanceof FormData);
  assert.equal(await request.data.get("file").text(), "guide");
  await api.adminService.deleteFile("cẩm nang.txt");
  assert.equal(request.method, "delete");
  assert.equal(request.url, "/api/admin/knowledge/delete");
  assert.deepEqual(request.params, { fileName: "cẩm nang.txt" });
});

test("401 expires auth without deleting unrelated storage; login errors do not log out", async () => {
  storage.set("token", "test-token");
  storage.set("role", "ROLE_USER");
  storage.set("unrelated", "keep");
  let expired = 0;
  const onExpired = () => expired++;
  window.addEventListener("auth:expired", onExpired);
  api.client.defaults.adapter = async (config) => {
    assert.equal(config.headers.Authorization, "Bearer test-token");
    throw { response: { status: 401 }, config };
  };
  await assert.rejects(api.authService.login({}));
  assert.equal(expired, 0);
  await assert.rejects(api.bookingService.getMyBookings());
  assert.equal(expired, 1);
  assert.equal(storage.has("token"), false);
  assert.equal(storage.get("unrelated"), "keep");
  window.removeEventListener("auth:expired", onExpired);
});

test("numeric difficulty levels from Backend map to filter labels", () => {
  assert.deepEqual([1, 2, 3].map(api.formatDifficulty), [
    "Dễ",
    "Trung Bình",
    "Mạo Hiểm",
  ]);
});
