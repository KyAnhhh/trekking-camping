import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { checkExperience } from './experience-checks.mjs';
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
const chatRows = [];
let chatConfirmAttempts = 0;
let failLogout = false;
let invitationState = { status: 'NONE', email: null }, invitationMailFailure = false, invitationConsumed = false;
let passengerRevision = 0;
let passengerRows = [
  { id: 1, position: 1, fullName: 'Hành khách Một', status: 'NOT_CHECKED', revision: 0, markedAt: null },
  { id: 2, position: 2, fullName: 'Hành khách Hai', status: 'NOT_CHECKED', revision: 0, markedAt: null },
];
let passengerAudit = [];
let managedUsers = [
  { id: 1, fullName: 'Người dùng thử nghiệm', email: 'traveler@example.test', phone: '0900000000', role: 'ROLE_USER', active: true, updatedAt: '2026-10-15T10:00:00' },
  { id: 2, fullName: 'Quản trị thử nghiệm', email: 'admin@example.test', role: 'ROLE_ADMIN', active: true, updatedAt: '2026-10-15T10:00:00' },
  { id: 3, fullName: 'Tài khoản trống', email: 'unused@example.test', role: 'ROLE_USER', active: true, updatedAt: '2026-10-15T10:00:00' },
];
let reviewsFail = false, emptyTours = false;
let operationApproved = true, reconcileFailure = false;
let unreadNotifications = 1, presentCount = null, attendanceRevision = 0, linkedGuideAccount = null;
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
const paymentOrder = "VN2030010100000000000000000000000000000000000001";
const bookingDetail = (booking) => ({
  participationStatus:
    participation.status === "LEGACY" ? null : participation.status,
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
let account = {
  id: 1,
  email: "traveler@example.test",
  fullName: "Khách thử nghiệm",
  phone: "0900000000",
  role: "ROLE_USER",
};
let savedPlans = [],
  postedReview = null;
let participation = {
  status: "LEGACY",
  revision: 0,
  deadline: null,
  numberOfPax: 2,
  declaration: null,
  requirements: "Synthetic test requirements",
  editable: false,
};
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
  if (/^\/api\/admin\/guides\/\d+\/invitation$/.test(path)) {
    if (method === 'POST') {
      if (invitationMailFailure) return { status: 503, message: 'Chưa gửi được email lời mời.' };
      invitationConsumed = false; invitationState = { status: 'PENDING', email: payload.email, expiresAt: new Date(Date.now()+86400000).toISOString() };
    }
    if (method === 'DELETE') invitationState.status = 'REVOKED';
    return { data: invitationState };
  }
  if (path === '/api/guide-invitations/preview' || path === '/api/guide-invitations/accept') {
    if (invitationConsumed || payload.token !== 'a'.repeat(43) || invitationState.status !== 'PENDING') return { status: 400, message: 'Lời mời không hợp lệ hoặc đã hết hạn.' };
    if (path.endsWith('/accept')) { invitationConsumed = true; return { data: null }; }
    return { data: { guideName: 'Hướng dẫn viên thử nghiệm', email: invitationState.email, expiresAt: invitationState.expiresAt } };
  }
  if (/\/passengers\/history$/.test(path)) return { data: { items: passengerAudit, page: 0, totalPages: 1, totalElements: passengerAudit.length } };
  if (/\/passengers\/\d+\/attendance$/.test(path)) {
    const person = passengerRows.find(p => p.id === Number(path.split('/').at(-2)));
    if (!person || person.revision !== payload.revision) return { status: 409, message: 'Điểm danh đã thay đổi. Tải lại danh sách.' };
    passengerAudit.unshift({ id: passengerAudit.length+1, passengerName: person.fullName, guideName: 'Guide fixture', previousStatus: person.status, status: payload.status, createdAt: new Date().toISOString() });
    person.status=payload.status; person.revision++; person.markedAt=new Date().toISOString();
    return { data: person };
  }
  if (/\/passengers$/.test(path)) {
    if (method === 'PUT') {
      if (payload.revision !== passengerRevision) return { status: 409, message: 'Danh sách đã thay đổi. Tải lại trước khi lưu.' };
      passengerRows=payload.fullNames.map((fullName,i)=>({ id:i+1,position:i+1,fullName,status:'NOT_CHECKED',revision:0,markedAt:null }));passengerRevision++;
    }
    return { data: { expectedCount:2,revision:passengerRevision,passengers:passengerRows,editable:!path.includes('guide-workspace')&&!passengerRows.some(p=>p.markedAt),canCheckIn:path.includes('guide-workspace')&&passengerRows.length===2 } };
  }
  if (path === '/api/notifications/unread-count') return { data: unreadNotifications };
  if (path === '/api/notifications') return { data: { items: [{id:1,title:'Chuyến đi khởi hành ngày mai',body:'Kiểm tra giờ đón và trang bị.',link:'/my-bookings/1',createdAt:new Date().toISOString(),readAt:unreadNotifications?null:new Date().toISOString()}], unread:unreadNotifications,page:0,totalPages:1,totalElements:1 } };
  if (/^\/api\/notifications\/(1\/read|read-all)$/.test(path)) { unreadNotifications=0;return {data:null}; }
  if (/^\/api\/admin\/guides\/\d+\/account$/.test(path)) {
    if(method==='PUT')linkedGuideAccount=payload.email?{userId:7,email:payload.email}:null;
    return {data:linkedGuideAccount || {userId:null,email:null}};
  }
  if(path==='/api/guide-workspace/trips')return {data:{items:[{id:1,title:tours[0].title,departureDate:future,returnDate:later,role:'LEAD',status:'OPEN',pickupPoint:'Điểm đón thử nghiệm'}],page:0,totalPages:1,totalElements:1}};
  if(path==='/api/guide-workspace/trips/1')return {data:{trip:{id:1,title:tours[0].title,departureDate:future,returnDate:later},guests:{items:[{bookingId:1,code:'TEST-001',contactName:'Khách thử nghiệm',contactPhone:'0900000000',people:2,status:'CONFIRMED',namedPassengers:passengerRows.length,presentCount:passengerRows.filter(p=>p.status==='PRESENT').length,revision:attendanceRevision}],page:0,totalPages:1,totalElements:1},canCheckIn:true}};
  if(path==='/api/guide-workspace/trips/1/bookings/1/attendance') {
    if(payload.revision!==attendanceRevision)return {status:409,message:'Điểm danh đã thay đổi. Tải lại danh sách.'};
    presentCount=payload.presentCount;attendanceRevision++;return {data:null};
  }
  if (/^\/api\/(admin\/)?bookings\/1\/participation(?:\/review)?$/.test(path)) {
    if (method === "PUT") {
      participation = {
        ...participation,
        status: "REVIEW_REQUIRED",
        revision: participation.revision + 1,
        declaration: { people: payload.people },
      };
    }
    if (method === "POST") {
      participation = {
        ...participation,
        status: payload.decision,
        declaration: {...participation.declaration,reviewNote:payload.note},
        revision: participation.revision + 1,
      };
    }
    if (method === "DELETE") participation.declaration = null;
    return { data: participation };
  }
  if (path === "/api/account") {
    if (method === "PUT") account = { ...account, ...payload };
    return { data: account };
  }
  if (path === "/api/account/password") return { data: null };
  if (path === "/api/plans") {
    if (method === "POST") {
      const plan = {
        id: 1,
        title: "Hành trình kiểm thử",
        createdAt: new Date().toISOString(),
        content: {
          request: payload,
          quotedAt: new Date().toISOString(),
          itinerary: {
            title: "Hành trình kiểm thử",
            summary: "Đi chậm và nghỉ ngơi phù hợp thể lực.",
            tips: ["Kiểm tra điều kiện trước chuyến đi."],
            days: Array.from({ length: payload.days }, (_, i) => ({
              day: i + 1,
              title: "Khám phá thiên nhiên",
              morning: "Chuẩn bị và đi bộ",
              afternoon: "Nghỉ ngơi",
              evening: "Cắm trại",
            })),
          },
          tours: [
            {
              tourId: 1,
              scheduleId: 1,
              title: tours[0].title,
              url: "/tours/ta-nang-phan-dung/booking?schedule=1",
              pricePerPerson: 2000000,
              departureDate: future,
              returnDate: later,
              availableSlots: 8,
            },
          ],
        },
      };
      savedPlans.push(plan);
      return { data: plan };
    }
    return {
      data: savedPlans.map(({ id, title, createdAt }) => ({
        id,
        title,
        createdAt,
      })),
    };
  }
  if (/^\/api\/plans\/\d+$/.test(path)) {
    const id = Number(path.split("/").at(-1));
    if (method === "DELETE") {
      savedPlans = savedPlans.filter((p) => p.id !== id);
      return { data: null };
    }
    return { data: savedPlans.find((p) => p.id === id) };
  }
  if (/^\/api\/tours\/\d+\/reviews$/.test(path))
    return reviewsFail ? { status: 503, message: 'Synthetic review failure' } : {
      data: {
        average: postedReview?.rating || 0,
        total: postedReview ? 1 : 0,
        items: postedReview ? [postedReview] : [],
        page: 0,
      },
    };
  if (path === "/api/bookings/1/review") {
    if (method === "POST") {
      postedReview = {
        id: 1,
        ...payload,
        author: account.fullName,
        verified: true,
        createdAt: new Date().toISOString(),
      };
      return { data: postedReview };
    }
    return {
      data: {
        canReview: bookings[0]?.status === "COMPLETED" && !postedReview,
        review: postedReview,
        message: "Đánh giá mở sau khi hoàn thành.",
      },
    };
  }
  if (path === "/api/admin/bookings/1/complete") {
    bookings[0].status = "COMPLETED";
    return { data: bookingDetail(bookings[0]) };
  }
  if (path === '/api/admin/operations/overview') return { data: { bookings: { PENDING: 1 }, awaitingReview: 1, pendingPayments: 1, refundRequired: 1, successfulAmount: 1200000, refundRequiredAmount: 500000, visibleReviews: 1, hiddenReviews: 0 } };
  if (path === '/api/admin/operations/bookings') return { data: { items: bookings.map(b => ({ id: b.id, code: b.bookingCode, tour: b.tourTitle, status: b.status, contactName: 'Khách thử', departureDate: b.departureDate, people: b.numberOfPax, amount: b.totalAmount, participationStatus: 'REVIEW_REQUIRED' })), page: 0, totalPages: 1, totalElements: bookings.length } };
  if (path === '/api/admin/operations/payments') return { data: { items: [{ id: 10, bookingId: 1, bookingCode: 'TEST-001', orderId: 'VN20261015090000abcdefghijklmnopabcdefghijklmnop', method: 'VNPAY_SANDBOX', status: 'PENDING', amount: 1200000, checkoutExpired: true, canReconcile: true }], page: 0, totalPages: 1, totalElements: 1 } };
  if (path === '/api/admin/operations/payments/10/reconcile') return reconcileFailure ? { status: 503, message: 'Cổng thử nghiệm tạm gián đoạn' } : { data: { id: 10, bookingId: 1, status: 'PENDING' } };
  if (path === '/api/admin/operations/reviews') return { data: { items: [{ id: 10, bookingId: 1, tour: tours[0].title, author: 'Khách kiểm thử', rating: 2, comment: 'Phản hồi cần kiểm tra', approved: operationApproved }], page: 0, totalPages: 1, totalElements: 1 } };
  if (path === '/api/admin/operations/reviews/10/visibility') {
    if (payload.expectedApproved !== operationApproved) return { status: 409, message: 'Đánh giá đã thay đổi' };
    operationApproved = payload.approved; return { data: { approved: operationApproved } };
  }
  if (path === "/api/admin/tours") return { data: tours };
  if (/^\/api\/admin\/tours\/\d+\/images$/.test(path)) return { data: photos };
  if (/^\/api\/admin\/tours\/\d+\/active$/.test(path)) {
    const tour = tours.find((t) => t.id === Number(path.split("/").at(-2)));
    tour.isActive = payload.active;
    return { data: tour };
  }
  if (/^\/api\/admin\/tours\/\d+\/schedules\/\d+$/.test(path)) {
    Object.assign(
      schedules.find((s) => s.id === Number(path.split("/").at(-1))),
      payload,
    );
    return { data: null };
  }
  if (/^\/api\/admin\/tours\/\d+$/.test(path) && method === "PUT") {
    const tour = tours.find((t) => t.id === Number(path.split("/").at(-1)));
    Object.assign(tour, payload);
    return { data: tour };
  }
  if (/^\/api\/admin\/tours\/[^/]+$/.test(path) && method === "GET") {
    const tour = tours.find((t) => t.slug === path.split("/").at(-1));
    return {
      data: {
        tour: { ...tour, isActive: tour.isActive ?? true },
        itineraries,
        schedules,
        gears,
      },
    };
  }
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
  if (path === "/api/auth/logout" && failLogout)
    return { status: 503, message: "Synthetic logout failure" };
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
      : { data: emptyTours ? [] : tours };
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
  if (path === '/api/users') return { data: managedUsers };
  if (/^\/api\/users\/\d+(\/active)?$/.test(path)) {
    const target = managedUsers.find(u => u.id === Number(path.split('/')[3]));
    if (!target) return { status: 404, message: 'Không tìm thấy tài khoản.' };
    const version = method === 'DELETE' ? url.searchParams.get('updatedAt') : payload.updatedAt;
    if (version !== target.updatedAt) return { status: 409, message: 'Tài khoản đã thay đổi. Hãy tải lại danh sách.' };
    if (method === 'DELETE') {
      if (target.id === 1) return { status: 409, message: 'Tài khoản có dữ liệu liên quan. Hãy khóa tài khoản để giữ lịch sử thay vì xóa.' };
      managedUsers = managedUsers.filter(u => u.id !== target.id);
      return { data: null };
    }
    if (path.endsWith('/active')) target.active = payload.active;
    else { target.fullName = payload.fullName; target.phone = payload.phone; }
    target.updatedAt = new Date(Date.parse(target.updatedAt + 'Z') + 1000).toISOString().replace('Z', '');
    return { data: target };
  }
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
  if (path === "/api/payments/vnpay/start") {
    if (failPayment)
      return {
        status: 503,
        message: "VNPAY sandbox chưa được cấu hình tài khoản merchant.",
      };
    paymentHistory = [
      {
        id: 1,
        transactionCode: paymentOrder,
        paymentMethod: "VNPAY_SANDBOX",
        amount: bookings[0].totalAmount,
        status: "PENDING",
      },
    ];
    return {
      data: {
        bookingId: 1,
        orderId: paymentOrder,
        status: "PENDING",
        paymentUrl: null,
      },
    };
  }
  if (path === "/api/payments/vnpay/" + paymentOrder + "/refresh") {
    paymentHistory[0].status = "SUCCESS";
    bookings[0].status = "CONFIRMED";
    return {
      data: {
        bookingId: 1,
        orderId: paymentOrder,
        status: "SUCCESS",
        paymentUrl: null,
      },
    };
  }
  if (path === "/api/chat/sessions") return { data: { sessionId: "ui-test-session", sessionToken: "ui-test-session-secret" } };
  if (path === "/api/chat/history") return { data: chatRows };
  if (path === "/api/chat/booking-drafts") return { data: {
    draftId: payload.requestId, title: tours[0].title, departureDate: future, returnDate: later, people: payload.people,
    unitPrice: tours[0].pricePerPax, totalAmount: tours[0].pricePerPax * payload.people,
    expiresAt: new Date(Date.now() + 600000).toISOString(), contactName: "Test guest", contactEmail: "guest@example.test", contactPhone: "0900000000"
  } };
  if (/^\/api\/chat\/booking-drafts\/[^/]+\/confirm$/.test(path)) {
    chatConfirmAttempts++;
    return chatConfirmAttempts === 1 ? { status: 503, message: "Mock connection interrupted after commit" } : { data: { id: 99, bookingCode: "CHAT-TEST", status: "PENDING" } };
  }
  if (path === "/api/chat") {
    chatRows.push({ sender: "USER", message: payload.message }, { sender: "BOT", message: "Test answer" });
    return {
      data: {
        reply:
          "Bạn có thể xem [tour Tà Năng](/tours/ta-nang-phan-dung) và kiểm tra trang bị trước chuyến đi.",
        sessionId: "ui-test-session",
        sources: [{ id: "S1", label: "test-guide.txt", updatedAt: "2026-10-11" }],
        tours: [{ tourId: 1, scheduleId: 10, title: tours[0].title, url: "/tours/ta-nang-phan-dung", departureDate: future, returnDate: later, availableSlots: 5, pricePerPerson: tours[0].pricePerPax }],
      },
    };
  }
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
  for (let i = 0; i < 200; i++) {
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
  // Resize/media-query events close open menus; wait for layout and React to settle before clicking.
  await evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
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
  await checkExperience({ evaluate, wait, go, click, set, viewport, shot, check, send, pause, results,
    fixtures: (value) => {
      if ('reviewsFail' in value) reviewsFail = value.reviewsFail;
      if ('emptyTours' in value) emptyTours = value.emptyTours;
      if ('review' in value) postedReview = value.review;
    },
  });
  await click(".header-menu-trigger");
  assert.equal(
    await evaluate(
      "document.querySelector('.header-menu-trigger').getAttribute('aria-expanded')",
    ),
    "true",
  );
  await click(".header-menu-trigger");
  // Header interactions use real keyboard input and mocked auth only.
  await viewport(1440);
  assert.deepEqual(await evaluate("[...document.querySelectorAll('#main-navigation > a')].map(a=>a.textContent.trim())"),
    ["Khám phá tour", "Điểm đến", "Lập lịch trình", "Cẩm nang", "Về chúng tôi", "Hỏi AI"]);
  for (const [path, title] of [["handbook", "Chuẩn bị kỹ"], ["about", "Gần thiên nhiên hơn"]]) {
    await viewport(1440);
    await click(`#main-navigation a[href='/${path}']`);
    await wait(`location.pathname === '/${path}' && document.querySelector('h1')?.textContent.includes('${title}')`);
    assert.equal(await evaluate(`document.querySelector('#main-navigation a[href="/${path}"]').getAttribute('aria-current')`), "page");
    await check(`${path} desktop navigation`);
    await shot(`${path}-desktop`);
    await go(`/${path}`);
    assert.ok((await evaluate("document.querySelector('main').innerText")).includes(title));
    await viewport(320);
    await check(`${path} mobile reload`);
    await shot(`${path}-mobile`);
  }
  await go("/handbook");
  await click(".journal-index a[href='#soan-ba-lo']");
  await pause(150);
  assert.equal(await evaluate("document.querySelector('#soan-ba-lo').getBoundingClientRect().top >= document.querySelector('.site-header').getBoundingClientRect().bottom"), true);
  await click(".header-menu-trigger");
  await click("#main-navigation a[href='/about']");
  await wait("location.pathname === '/about'");
  assert.equal(await evaluate("document.querySelector('#main-navigation').classList.contains('is-open')"), false);
  results.push("Full header links open public content, survive reload, and handbook anchors clear sticky header");
  await go("/");
  for (const width of [320, 375, 768, 1024, 1101, 1280, 1440]) {
    await viewport(width);
    await check(`Guest header ${width}px`);
    if (width <= 1200) {
      await click(".header-menu-trigger");
      assert.equal(await evaluate("document.body.style.overflow"), "hidden");
      assert.equal(await evaluate("document.activeElement.getAttribute('href')"), "/tours");
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await wait("document.querySelector('.header-menu-trigger').getAttribute('aria-expanded') === 'false'");
      assert.equal(await evaluate("document.activeElement.className"), "header-menu-trigger");
      assert.equal(await evaluate("document.body.style.overflow"), "");
    }
  }
  results.push("Mobile menu manages keyboard focus, Escape and scroll restoration");
  await evaluate("localStorage.setItem('token','ui-test-token');localStorage.setItem('role','ROLE_USER');localStorage.setItem('username','very-long-account-name-for-responsive-header@example.test')");
  await go("/");
  await click(".header-account-trigger");
  assert.equal(await evaluate("document.querySelector('#account-navigation a[href=\"/admin\"]') === null"), true);
  assert.equal(await evaluate("document.activeElement.getAttribute('href')"), "/profile");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  assert.equal(await evaluate("document.activeElement.getAttribute('href')"), "/my-bookings");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await wait("!document.querySelector('#account-navigation')");
  assert.equal(await evaluate("document.activeElement.className"), "header-account-trigger");
  results.push("User account menu contains private navigation without admin and supports Tab/Escape");
  for (const width of [320, 375, 768, 1024, 1440]) {
    await viewport(width);
    await click(".header-account-trigger");
    await check(`Account dropdown ${width}px`);
    assert.equal(await evaluate("(()=>{const r=document.querySelector('#account-navigation').getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && r.bottom<=innerHeight})()"), true);
    if (width === 320) await shot("header-account-mobile");
    if (width === 1440) await shot("header-account-desktop");
    await click(".header-account-trigger");
  }
  await viewport(375);
  await click(".header-account-trigger");
  await click(".header-menu-trigger");
  assert.equal(await evaluate("document.querySelector('#account-navigation') === null"), true);
  await click(".header-account-trigger");
  assert.equal(await evaluate("document.querySelector('#main-navigation').classList.contains('is-open')"), false);
  await click(".header-backdrop");
  await wait("!document.querySelector('#account-navigation')");
  results.push("Account/navigation menus are mutually exclusive and close on backdrop");
  await click(".header-account-trigger");
  failLogout = true;
  await click(".account-dropdown-footer button");
  await wait("document.querySelector('#account-navigation [role=alert]')");
  assert.ok(await evaluate("localStorage.getItem('token')"));
  failLogout = false;
  await click(".account-dropdown-footer button");
  await wait("document.querySelector('.header-login') && !document.querySelector('#account-navigation')");
  assert.equal(await evaluate("localStorage.getItem('token')"), null);
  results.push("Failed logout retains account with visible error; retry clears auth and closes dropdown");
  for (const role of ["ADMIN", "ROLE_ADMIN"]) {
    await evaluate(`localStorage.setItem('token','ui-test-token');localStorage.setItem('role',${JSON.stringify(role)});localStorage.setItem('username','admin@example.test')`);
    await go("/");
    await click(".header-account-trigger");
    assert.equal(await evaluate("document.querySelector('#account-navigation a[href=\"/admin\"]') !== null"), true);
    await click("#account-navigation a[href='/profile']");
    await wait("location.pathname === '/profile'");
    assert.equal(await evaluate("document.querySelector('#account-navigation') === null"), true);
  }
  results.push("Both admin role formats expose administration and navigation closes dropdown");
  await evaluate("localStorage.clear()");
  await go("/");
  await viewport(390, 844);
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
    writes.find((w) => w.path === "/api/payments/vnpay/start").payload,
    { bookingId: 1 },
  );
  await go(
    "/payment/vnpay/return?orderId=" +
      paymentOrder +
      "&resultCode=1006&amount=1",
  );
  await wait(
    "document.querySelector('.payment-summary h2')?.textContent === 'Đã thanh toán'",
  );
  results.push(
    "VNPAY return uses backend result, not redirect amount or status",
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
  await click(".chat-tour-card .btn");
  await wait("document.querySelector('.chat-tour-card form')");
  assert.equal(writes.filter((w) => w.path.endsWith('/confirm') && w.path.includes('booking-drafts')).length, 0);
  assert.equal(await evaluate("document.querySelector('.chat-tour-card [type=submit]').disabled"), true);
  await click(".chat-tour-card [type=checkbox]");
  await evaluate("document.querySelector('.chat-tour-card form').requestSubmit()");
  await wait("document.querySelector('.chat-tour-card .notice-error')");
  assert.equal(await evaluate("document.querySelector('.chat-tour-card .btn-outline').disabled"), true);
  await evaluate("document.querySelector('.chat-tour-card form').requestSubmit()");
  await wait("document.querySelector('.chat-tour-card a[href=\"/my-bookings/99\"]')");
  const confirmations = writes.filter((w) => w.path.includes('booking-drafts') && w.path.endsWith('/confirm'));
  assert.equal(confirmations.length, 2);
  assert.equal(confirmations[0].path, confirmations[1].path);
  assert.deepEqual(confirmations[0].payload, confirmations[1].payload);
  assert.equal(writes.find((w) => w.path === '/api/chat').payload.sessionToken, 'ui-test-session-secret');
  assert.equal(JSON.stringify(writes.filter((w) => w.path === '/api/chat')).includes('guest@example.test'), false);
  results.push('Chat quote requires confirmation; uncertain retry reuses draft and keeps contact data out of Gemini');
  await viewport(320);
  await check('Chat booking card 320px');
  await viewport(390, 844);
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
  await go('/admin/payments');
  assert.ok(!(writes.some(w => w.path.endsWith('/reconcile'))));
  await click('.booking-card button');
  await wait('document.querySelector("dialog[open]")');
  reconcileFailure = true;
  await click('dialog .btn');
  await wait('document.querySelector("dialog [role=alert]")');
  reconcileFailure = false;
  await click('dialog .btn');
  await wait('!document.querySelector("dialog") && document.querySelector("[role=status]")?.textContent.includes("chưa ghi nhận")');
  assert.equal(writes.filter(w => w.path.endsWith('/reconcile')).length, 2);
  await go('/admin/reviews');
  await click('.booking-card button');
  assert.equal(operationApproved, true);
  await click('dialog .btn');
  await wait('!document.querySelector("dialog") && document.querySelector(".booking-card button")?.textContent.includes("Hiển thị lại")');
  assert.equal(operationApproved, false);
  await click('.booking-card button');
  await click('dialog .btn');
  await wait('!document.querySelector("dialog") && document.querySelector(".booking-card button")?.textContent.includes("Ẩn đánh giá")');
  results.push('Admin reconciliation is explicit, handles errors/pending, and review visibility changes require confirmation');
  for (const path of [
    "/admin/tours",
    "/admin/tours/ta-nang-phan-dung",
    "/admin/users",
    "/admin/bookings",
    "/admin/payments",
    "/admin/reviews",
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
  await evaluate(
    "[...document.querySelectorAll('.admin-item-list button')].find(b => b.textContent.includes('Phân công')).click()",
  );
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
    "/admin/payments",
    "/admin/reviews",
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
  await evaluate(
    "localStorage.setItem('token','ui-test-token');localStorage.setItem('role','ROLE_USER');localStorage.setItem('username','traveler@example.test')",
  );
  await go("/profile");
  await check("Profile desktop");
  await set("input[autocomplete=name]", "Khách cập nhật");
  await evaluate("document.querySelector('form').requestSubmit()");
  await wait("document.querySelector('.notice-success')");
  assert.equal(
    writes.find((w) => w.path === "/api/account" && w.method === "PUT").payload
      .fullName,
    "Khách cập nhật",
  );
  await viewport(390, 844);
  await check("Profile mobile");
  await go("/planner");
  await check("Planner empty mobile");
  await set("[name=destination]", "Lâm Đồng");
  await set("[name=startDate]", future);
  await evaluate("document.querySelector('form').requestSubmit()");
  await wait("document.querySelectorAll('.planner-days > li').length === 2");
  assert.equal(writes.find((w) => w.path === "/api/plans").payload.days, 2);
  await check("Planner result mobile");
  await shot("planner-mobile");
  await viewport(1440);
  await check("Planner result desktop");
  await go("/planner");
  await click(".planner-saved .text-btn");
  await wait("document.querySelector('.planner-days')");
  results.push("Saved planner can be reopened after reload");
  await click(".planner-saved .icon-btn");
  await wait("document.querySelector('dialog[open]')");
  await evaluate(
    "document.querySelector('dialog .payment-actions .btn:not(.btn-outline)').click()",
  );
  await wait(
    "!document.querySelector('dialog[open]') && !document.querySelector('.planner-saved li')",
  );
  results.push("Planner delete requires confirmation");
  bookings[0].status = "COMPLETED";
  bookings[0].returnDate = new Date(Date.now() - 86400000 * 2)
    .toISOString()
    .slice(0, 10);
  await go("/my-bookings/1");
  await wait("document.querySelector('.review-section textarea')");
  await set(".review-section textarea", "Trải nghiệm kiểm thử tốt.");
  await evaluate(
    "document.querySelector('.review-section form').requestSubmit()",
  );
  await wait("document.querySelector('.review-section [role=status]')");
  await go("/tours/ta-nang-phan-dung");
  await wait("document.querySelector('.review-item')");
  assert.ok(
    (
      await evaluate("document.querySelector('.review-item').textContent")
    ).includes("Trải nghiệm kiểm thử tốt."),
  );
  results.push("Completed booking review appears on public tour");
  await evaluate("localStorage.setItem('role','ROLE_ADMIN')");
  await go("/admin/tours/ta-nang-phan-dung");
  await click(".tour-settings .payment-actions button:first-child");
  await wait("document.querySelector('.tour-settings form')");
  await set(".tour-settings input", "Tên tour đã cập nhật");
  await evaluate(
    "document.querySelector('.tour-settings form').requestSubmit()",
  );
  await wait(
    "document.querySelector('h1')?.textContent === 'Tên tour đã cập nhật'",
  );
  results.push("Admin updates tour through protected API");
  await click(".tour-settings .payment-actions button:last-child");
  await wait("document.querySelector('dialog[open]')");
  await evaluate(
    "document.querySelector('dialog .payment-actions .btn:not(.btn-outline)').click()",
  );
  await wait(
    "document.querySelector('.tour-settings')?.textContent.includes('đã ngừng mở bán')",
  );
  await go("/admin/tours/ta-nang-phan-dung");
  await wait(
    "document.querySelector('.tour-settings')?.textContent.includes('đã ngừng mở bán')",
  );
  results.push("Inactive tour remains accessible in admin detail");
  await evaluate(
    "document.querySelectorAll('.segmented-tabs button')[1].click()",
  );
  await evaluate(
    "[...document.querySelectorAll('.admin-item-list button')].find(b=>b.textContent.includes('Sửa lịch')).click()",
  );
  await wait("document.querySelector('dialog [name=status]')");
  await set("dialog [name=status]", "CLOSED");
  await evaluate("document.querySelector('dialog form').requestSubmit()");
  await wait(
    "!document.querySelector('dialog[open]') && document.querySelector('.admin-item-list')?.textContent.includes('Đã đóng')",
  );
  results.push("Admin closes departure through protected API");
  bookings[0].status = "CONFIRMED";
  await go("/admin/bookings/1");
  await evaluate(
    "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Xác nhận đã hoàn thành')).click()",
  );
  await wait("document.querySelector('.status-completed')");
  results.push("Admin confirms completed trip");
  await evaluate("localStorage.setItem('role','ROLE_USER')");
  await go("/profile");
  await set("input[autocomplete=current-password]", "old-test-password");
  await evaluate(
    "document.querySelectorAll('input[autocomplete=new-password]').forEach(e=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'new-test-password');e.dispatchEvent(new Event('input',{bubbles:true}));})",
  );
  await evaluate("document.querySelectorAll('form')[1].requestSubmit()");
  await wait("location.pathname === '/login'");
  assert.equal(await evaluate("localStorage.getItem('token')"), null);
  results.push("Password change clears local session and redirects to login");
  await evaluate(
    "localStorage.setItem('token','ui-test-token');localStorage.setItem('role','ROLE_USER');localStorage.setItem('username','traveler@example.test')",
  );
  bookings[0].status = "PENDING";
  bookings[0].departureDate = future;
  paymentHistory = [];
  participation = {
    ...participation,
    status: "INCOMPLETE",
    editable: true,
    numberOfPax: 1,
  };
  await go("/my-bookings/1");
  await wait("document.querySelector('.health-person input')");
  assert.equal(
    await evaluate("document.querySelector('.payment-summary .btn').disabled"),
    true,
  );
  await set(".health-person input", "Synthetic traveller");
  await set(".health-person select", "PRIVATE");
  await set(".health-person .form-row input", "Synthetic contact");
  await set(".health-person input[type=tel]", "0900000000");
  await click(".health-person input[type=checkbox]");
  await evaluate(
    "document.querySelector('.health-panel form').requestSubmit()",
  );
  await wait(
    "document.querySelector('.health-panel [role=status]')?.textContent.includes('Chờ người')",
  );
  await viewport(390, 844);
  await check("Participation mobile");
  await shot("participation-mobile");
  results.push(
    "Unreviewed declaration blocks checkout UI and submits private participant data",
  );
  await evaluate("localStorage.setItem('role','ROLE_ADMIN')");
  await go("/admin/bookings/1");
  await wait("document.querySelector('.health-panel .payment-actions button')");
  await click(".health-panel .payment-actions button");
  await set("dialog textarea","Private coordination confirmed");
  await click("dialog .btn");
  await wait(
    "document.querySelector('.health-panel [role=status]')?.textContent.includes('Đã hoàn tất')",
  );
  await evaluate("localStorage.setItem('role','ROLE_USER')");
  await go("/my-bookings/1");
  assert.equal(
    await evaluate("document.querySelector('.payment-summary .btn').disabled"),
    false,
  );
  results.push("Admin participation review unlocks payment after confirmation");
  await wait("document.querySelector('.health-panel').textContent.includes('Private coordination confirmed')");
  results.push("Owner sees the private review note after admin confirmation");
  tours[0].adventureProfile = {
    distanceKm: 12,
    maxAltitudeM: 260,
    totalAscentM: 180,
    activeHoursPerDay: 6,
    medicalAccessHours: 2.5,
    medicalAccessNotes: "Synthetic estimate, not operational",
    sourceNote: "UI fixture only",
    verifiedOn: "2026-01-01",
    customersPerGuide: 4,
  };
  await go("/tours/ta-nang-phan-dung");
  await wait("document.querySelector('.adventure-summary svg')");
  await viewport(320, 844);
  await check("Tour Summary 320px");
  await evaluate(
    "document.querySelector('.adventure-summary').scrollIntoView({block:'start'})",
  );
  await shot("tour-summary-mobile");
  await viewport(1440);
  await check("Tour Summary desktop");
  await evaluate("window.scrollTo(0, 700)");
  await pause(150);
  assert.equal(await evaluate("Math.round(document.querySelector('.site-header').getBoundingClientRect().top)"), 0);
  assert.equal(await evaluate("parseFloat(getComputedStyle(document.querySelector('.booking-summary')).top) > document.querySelector('.site-header').getBoundingClientRect().height"), true);
  results.push("Sticky header reserves space above the tour booking summary");
  await evaluate(
    "document.querySelector('.adventure-summary').scrollIntoView({block:'start'})",
  );
  await shot("tour-summary-desktop");
  await evaluate("localStorage.setItem('token','fixture-only');localStorage.setItem('role','ROLE_ADMIN')");
  await go('/admin/guides');
  await evaluate("[...document.querySelectorAll('.guide-actions button')].find(b=>b.textContent==='Tài khoản đăng nhập').click()");
  await wait('document.querySelector("dialog input[type=email]")');
  await set('dialog input[type=email]', 'guide@example.test');
  assert.equal(await evaluate('document.querySelector("dialog .btn").disabled'), true);
  await click('dialog input[type=checkbox]');
  await evaluate('document.querySelector("dialog form").requestSubmit()');
  await wait('document.querySelector("dialog strong")?.textContent.includes("guide@example.test")');
  assert.equal(linkedGuideAccount.email, 'guide@example.test');
  await click('dialog .icon-btn');
  results.push('Admin guide account link requires explicit acknowledgement');
  await go('/notifications');
  await check('Notifications desktop');
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Đánh dấu tất cả')).click()");
  await wait('document.querySelector(".list-toolbar")?.textContent.includes("0 thông báo chưa đọc")');
  assert.equal(unreadNotifications, 0);
  await viewport(320, 844);await check('Notifications mobile');
  await evaluate("localStorage.setItem('role','ROLE_GUIDE')");
  await go('/guide-workspace');await check('Guide workspace mobile');
  await go('/guide-workspace/1');await check('Guide roster mobile');
  await click('.attendance-row button');
  await wait('document.querySelector(".passenger-list button")');
  await click('.passenger-list button');await wait('document.querySelector("dialog select")');
  await set('dialog select','PRESENT');
  assert.equal(passengerRows[0].status,'NOT_CHECKED');
  await evaluate('document.querySelector("dialog form").requestSubmit()');
  await wait('!document.querySelector("dialog") && document.querySelector(".attendance-row")?.textContent.includes("1/2")');
  assert.equal(passengerRows[0].status,'PRESENT');assert.equal(passengerAudit.length,1);
  await wait('document.querySelector(".passenger-list button")');await click('.passenger-list button');
  passengerRows[0].revision++;
  await set('dialog select','ABSENT');await evaluate('document.querySelector("dialog form").requestSubmit()');
  await wait('document.querySelector("dialog [role=alert]")?.textContent.includes("thay đổi")');
  assert.equal(passengerRows[0].status,'PRESENT');
  await click('dialog button[type=button].btn');await wait('!document.querySelector("dialog") && document.querySelector(".passenger-list")');
  await click('.passenger-history-toggle');await wait('document.querySelector(".passenger-history")?.textContent.includes("Guide fixture")');
  await check('Named passengers and attendance history mobile');
  await viewport(1440);await check('Guide roster desktop');await shot('guide-workspace-desktop');
  results.push('Guide checks in named passengers with history and rejects stale updates');
  await evaluate("localStorage.setItem('role','ROLE_ADMIN')");
  await viewport(1440); await go('/admin/users');
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify('button[aria-label="Khóa admin@example.test"]')}).disabled`), true);
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify('button[aria-label="Xóa admin@example.test"]')}).disabled`), true);
  await click('button[aria-label="Sửa traveler@example.test"]');
  await set('dialog input:not([type=tel])', 'Tên đã chỉnh sửa');
  await evaluate('document.querySelector("dialog form").requestSubmit()');
  await wait('!document.querySelector("dialog") && document.querySelector("tbody")?.textContent.includes("Tên đã chỉnh sửa")');
  assert.equal(managedUsers[0].fullName, 'Tên đã chỉnh sửa');
  await click('button[aria-label="Khóa traveler@example.test"]');
  assert.equal(managedUsers[0].active, true);
  await evaluate('document.querySelector("dialog form").requestSubmit()');
  await wait(`!document.querySelector('dialog') && document.querySelector(${JSON.stringify('button[aria-label="Mở khóa traveler@example.test"]')})`);
  assert.equal(managedUsers[0].active, false);
  await click('button[aria-label="Mở khóa traveler@example.test"]');
  await evaluate('document.querySelector("dialog form").requestSubmit()');
  await wait(`!document.querySelector('dialog') && document.querySelector(${JSON.stringify('button[aria-label="Khóa traveler@example.test"]')})`);
  assert.equal(managedUsers[0].active, true);
  results.push('Admin edits contacts and confirms lock/unlock; admin accounts remain protected');
  await click('button[aria-label="Xóa traveler@example.test"]');
  await evaluate('document.querySelector("dialog form").requestSubmit()');
  await wait('document.querySelector("dialog [role=alert]")?.textContent.includes("dữ liệu liên quan")');
  assert.equal(managedUsers.length, 3);
  await click('dialog button[type=button].btn');
  await wait('!document.querySelector("dialog") && document.querySelector("tbody")');
  await click('button[aria-label="Xóa unused@example.test"]');
  await evaluate('document.querySelector("dialog form").requestSubmit()');
  await wait('!document.querySelector("dialog") && document.querySelector("tbody") && !document.querySelector("tbody").textContent.includes("unused@example.test")');
  assert.equal(managedUsers.length, 2);
  results.push('Admin sees linked-data rejection and can delete an unused account');
  await click('button[aria-label="Sửa traveler@example.test"]');
  managedUsers[0].updatedAt = '2026-10-15T11:00:00';
  await set('dialog input:not([type=tel])', 'Không được ghi đè');
  await evaluate('document.querySelector("dialog form").requestSubmit()');
  await wait('document.querySelector("dialog [role=alert]")?.textContent.includes("thay đổi")');
  assert.equal(managedUsers[0].fullName, 'Tên đã chỉnh sửa');
  assert.equal(await evaluate('document.querySelector("dialog button[type=submit]").disabled'), true);
  await viewport(320, 844); await check('Admin user conflict dialog 320px');
  await click('dialog button[type=button].btn');
  await wait('!document.querySelector("dialog") && document.querySelector("tbody")');
  await check('Admin user actions mobile');
  await viewport(1440); await check('Admin user actions desktop'); await shot('admin-users-desktop');
  results.push('Admin stale contact edit cannot overwrite another update');
  passengerRows=[];passengerAudit=[];passengerRevision=0;
  await evaluate("localStorage.setItem('role','ROLE_USER')");
  await go('/my-bookings/1');
  await wait('document.querySelector(".passenger-panel")?.textContent.includes("Chưa có danh sách")');
  await evaluate("[...document.querySelectorAll('.passenger-panel button')].find(b=>b.textContent.includes('Nhập / sửa')).click()");
  await set('.passenger-names-form label:nth-of-type(1) input','Khách thật trong fixture Một');
  await set('.passenger-names-form label:nth-of-type(2) input','Khách thật trong fixture Hai');
  await evaluate('document.querySelector(".passenger-names-form").requestSubmit()');
  await wait('document.querySelector(".passenger-list")?.textContent.includes("fixture Một")');
  assert.equal(passengerRows.length,2);assert.equal(passengerRows[0].status,'NOT_CHECKED');
  await evaluate("[...document.querySelectorAll('.passenger-panel button')].find(b=>b.textContent.includes('Nhập / sửa')).click()");
  passengerRevision++;
  await set('.passenger-names-form input','Không ghi đè');await evaluate('document.querySelector(".passenger-names-form").requestSubmit()');
  await wait('document.querySelector(".passenger-names-form [role=alert]")?.textContent.includes("thay đổi")');
  assert.equal(passengerRows[0].fullName,'Khách thật trong fixture Một');
  await viewport(320,844);await check('Passenger names editor mobile');
  results.push('Booking owner supplies exact passenger names and stale list edits are rejected');
  linkedGuideAccount=null;invitationState={status:'NONE',email:null};
  await evaluate("localStorage.setItem('role','ROLE_ADMIN')");await go('/admin/guides');
  await evaluate("[...document.querySelectorAll('.guide-actions button')].find(b=>b.textContent==='Tài khoản đăng nhập').click()");
  await wait('document.querySelector(".guide-invitation-panel input[type=email]")');
  await set('.guide-invitation-panel input[type=email]','new-guide@example.test');
  await click('.guide-invitation-panel input[type=checkbox]');
  invitationMailFailure=true;
  await evaluate('document.querySelector(".guide-invitation-panel form").requestSubmit()');
  await wait('document.querySelector(".guide-invitation-panel [role=alert]")?.textContent.includes("Chưa gửi")');
  assert.equal(invitationState.status,'NONE');invitationMailFailure=false;
  await evaluate('document.querySelector(".guide-invitation-panel form").requestSubmit()');
  await wait('document.querySelector(".guide-invitation-panel [role=status]")?.textContent.includes("Đã gửi")');
  assert.equal(invitationState.email,'new-guide@example.test');await check('Guide invitation admin dialog mobile');
  await evaluate("[...document.querySelectorAll('.guide-invitation-panel button')].find(b=>b.textContent.includes('Thu hồi')).click()");
  await wait('document.querySelector(".guide-invitation-panel [role=status]")?.textContent.includes("thu hồi")');
  assert.equal(invitationState.status,'REVOKED');
  results.push('Admin invitation reports SMTP failure, sends explicitly and supports revocation');
  invitationState={status:'PENDING',email:'new-guide@example.test',expiresAt:new Date(Date.now()+86400000).toISOString()};
  await evaluate('localStorage.clear()');await go('/guide-invitation#token='+'a'.repeat(43));
  await wait('document.querySelector("input[name=password]")');
  assert.equal(await evaluate('location.hash'),'');
  await check('Guide invitation acceptance mobile');
  await set('input[name=password]','synthetic-new-password');await set('input[name=confirm]','synthetic-new-password');
  await evaluate('document.querySelector("form").requestSubmit()');
  await wait('document.querySelector("[role=status]")?.textContent.includes("Đã tạo tài khoản")');
  assert.equal(invitationConsumed,true);assert.equal(await evaluate("localStorage.getItem('token')"),null);
  await go('/guide-invitation#token='+'a'.repeat(43));
  await wait('document.body.textContent.includes("không hợp lệ hoặc đã hết hạn")');
  assert.equal(await evaluate('Boolean(document.querySelector("input[name=password]"))'),false);
  results.push('Guide invitation clears URL token, accepts once and rejects reused link');
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
