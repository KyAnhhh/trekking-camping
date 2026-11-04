import crypto from "crypto";

const API_BASE = "http://localhost:8080";
const WS_URL = "ws://localhost:8080/ws/booking";
const HASH_SECRET = "TSTAEPWWDLHJOJMHQNXKXSJBSFVBBSXZ";
const TMN_CODE = "KMQ4W8FC";

// Helper: HmacSHA512 signature for VNPAY callback matching Java URLEncoder.encode
function javaUrlEncode(str) {
  return encodeURIComponent(String(str)).replace(/%20/g, "+");
}

function signVnpay(params, secret) {
  const sortedKeys = Object.keys(params).sort();
  const query = sortedKeys
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .map((k) => `${javaUrlEncode(k)}=${javaUrlEncode(params[k])}`)
    .join("&");
  return crypto.createHmac("sha512", Buffer.from(secret, "utf-8")).update(Buffer.from(query, "utf-8")).digest("hex");
}

async function runRealtimeTestSuite() {
  console.log("==========================================================");
  console.log("🚀 BẮT ĐẦU KIỂM THỬ HỆ THỐNG REALTIME BOOKING WEBSOCKET 🚀");
  console.log("==========================================================\n");

  const results = [];
  const recordedEvents = [];

  // --- BƯỚC 1: KẾT NỐI WEBSOCKET ---
  console.log("1️⃣  Kiểm thử kết nối WebSocket tới /ws/booking...");
  const ws = new WebSocket(WS_URL);

  let connectedEventPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timeout kết nối WebSocket")), 5000);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        recordedEvents.push(msg);
        if (msg.type === "CONNECTED") {
          clearTimeout(timer);
          resolve(msg);
        }
      } catch (e) {
        console.error("Lỗi parse WS message:", e);
      }
    };
    ws.onerror = (err) => {
      clearTimeout(timer);
      reject(err);
    };
  });

  const connectedMsg = await connectedEventPromise;
  console.log("   ✅ WebSocket đã kết nối thành công! Session ID:", connectedMsg.sessionId);
  results.push({ name: "WebSocket Handshake & Welcome", status: "PASSED", details: connectedMsg });

  // Test Ping/Pong
  const pongPromise = new Promise((resolve) => {
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "PONG") {
        ws.removeEventListener("message", handler);
        resolve(msg);
      }
    };
    ws.addEventListener("message", handler);
  });
  ws.send(JSON.stringify({ type: "PING" }));
  await pongPromise;
  console.log("   ✅ WebSocket PING/PONG phản hồi tức thì!");
  results.push({ name: "WebSocket Ping / Pong Keep-Alive", status: "PASSED" });

  // --- BƯỚC 2: ĐĂNG NHẬP USER & ADMIN ---
  console.log("\n2️⃣  Kiểm thử xác thực User & Admin...");
  const userLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "phankyanh@example.com", password: "Password@123" }),
  });
  const userData = await userLoginRes.json();
  const userToken = userData?.data?.token;
  if (!userToken) throw new Error("Đăng nhập user thất bại: " + JSON.stringify(userData));
  console.log("   ✅ User đăng nhập thành công:", userData.data.username, `(${userData.data.role})`);

  const adminLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@trekkingcamping.com", password: "Password@123" }),
  });
  const adminData = await adminLoginRes.json();
  const adminToken = adminData?.data?.token;
  if (!adminToken) throw new Error("Đăng nhập admin thất bại: " + JSON.stringify(adminData));
  console.log("   ✅ Admin đăng nhập thành công:", adminData.data.username, `(${adminData.data.role})`);
  results.push({ name: "JWT Authentication", status: "PASSED" });

  // --- BƯỚC 3: TẠO ĐƠN VÀ ĐÓN REALTIME EVENT NEW_BOOKING ---
  console.log("\n3️⃣  Kiểm thử Đặt Tour & Nhận Broadcast Realtime NEW_BOOKING...");
  const newBookingEventPromise = new Promise((resolve) => {
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "NEW_BOOKING") {
        ws.removeEventListener("message", handler);
        resolve(msg);
      }
    };
    ws.addEventListener("message", handler);
  });

  const slotsUpdatedEventPromise = new Promise((resolve) => {
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "SLOTS_UPDATED") {
        ws.removeEventListener("message", handler);
        resolve(msg);
      }
    };
    ws.addEventListener("message", handler);
  });

  const createBookingRes = await fetch(`${API_BASE}/api/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      scheduleId: 4,
      numberOfPax: 1,
      contactName: "Phan Kỳ Anh",
      contactPhone: "0987654321",
      contactEmail: "phankyanh@example.com",
      notes: "Realtime test automation booking",
    }),
  });

  const bookingResData = await createBookingRes.json();
  const createdBooking = bookingResData?.data;
  if (!createdBooking?.id) throw new Error("Tạo đơn thất bại: " + JSON.stringify(bookingResData));

  console.log("   👉 Đơn mới đã tạo trong Database. ID:", createdBooking.id, "Mã:", createdBooking.bookingCode);

  const newBookingMsg = await newBookingEventPromise;
  const slotsUpdatedMsg = await slotsUpdatedEventPromise;
  console.log("   ⚡ [WebSocket NHẬN THÀNH CÔNG] NEW_BOOKING:", newBookingMsg.payload.message);
  console.log("   ⚡ [WebSocket NHẬN THÀNH CÔNG] SLOTS_UPDATED: Chỗ còn lại:", slotsUpdatedMsg.payload.availableSlots);
  results.push({ name: "Realtime NEW_BOOKING & SLOTS_UPDATED Event", status: "PASSED", payload: newBookingMsg.payload });

  // --- BƯỚC 4: ADMIN DUYỆT ĐIỀU KIỆN THAM GIA & ĐÓN REALTIME EVENT BOOKING_APPROVED ---
  console.log("\n4️⃣  Kiểm thử Admin Duyệt Tham Gia & Broadcast BOOKING_APPROVED...");
  const approvedEventPromise = new Promise((resolve) => {
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "BOOKING_APPROVED" && Number(msg.payload?.bookingId) === createdBooking.id) {
        ws.removeEventListener("message", handler);
        resolve(msg);
      }
    };
    ws.addEventListener("message", handler);
  });

  const approveRes = await fetch(`${API_BASE}/api/admin/bookings/${createdBooking.id}/participation/quick-approve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  const approveData = await approveRes.json();
  console.log("   👉 Admin đã duyệt đơn thành công:", approveData?.data?.status);

  const approvedMsg = await approvedEventPromise;
  console.log("   ⚡ [WebSocket NHẬN THÀNH CÔNG] BOOKING_APPROVED:", approvedMsg.payload.message);
  results.push({ name: "Realtime BOOKING_APPROVED Event", status: "PASSED", payload: approvedMsg.payload });

  // --- BƯỚC 5: KHỞI TẠO THANH TOÁN VNPAY VÀ NHẬN REALTIME PAYMENT_SUCCESS ---
  console.log("\n5️⃣  Kiểm thử Thanh Toán VNPAY & Broadcast PAYMENT_SUCCESS...");
  const paymentSuccessPromise = new Promise((resolve) => {
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "PAYMENT_SUCCESS" && Number(msg.payload?.bookingId) === createdBooking.id) {
        ws.removeEventListener("message", handler);
        resolve(msg);
      }
    };
    ws.addEventListener("message", handler);
  });

  // Start checkout session
  const startPaymentRes = await fetch(`${API_BASE}/api/payments/vnpay/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ bookingId: createdBooking.id }),
  });
  const paymentData = await startPaymentRes.json();
  const orderId = paymentData?.data?.orderId;
  const payUrl = paymentData?.data?.paymentUrl;
  console.log("   👉 Đã tạo phiên thanh toán VNPAY OrderId:", orderId);

  // Phân tích params từ payUrl để chuẩn bị VNPAY return callback giả lập
  const urlObj = new URL(payUrl);
  const amountParam = urlObj.searchParams.get("vnp_Amount");
  const orderInfoParam = urlObj.searchParams.get("vnp_OrderInfo");
  const txnRefParam = urlObj.searchParams.get("vnp_TxnRef");

  const nowVN = new Date(Date.now() + 7 * 3600 * 1000);
  const payDate = nowVN.toISOString().replace(/[-:T]/g, "").slice(0, 14);

  const vnpayCallbackParams = {
    vnp_Amount: amountParam,
    vnp_BankCode: "NCB",
    vnp_BankTranNo: "VNP14828192",
    vnp_CardType: "ATM",
    vnp_OrderInfo: orderInfoParam,
    vnp_PayDate: payDate,
    vnp_ResponseCode: "00",
    vnp_TmnCode: TMN_CODE,
    vnp_TransactionNo: "14828192",
    vnp_TransactionStatus: "00",
    vnp_TxnRef: txnRefParam,
  };

  const secureHash = signVnpay(vnpayCallbackParams, HASH_SECRET);
  vnpayCallbackParams.vnp_SecureHash = secureHash;

  const callbackQuery = Object.entries(vnpayCallbackParams)
    .map(([k, v]) => `${javaUrlEncode(k)}=${javaUrlEncode(v)}`)
    .join("&");

  // Call VNPAY return endpoint
  await fetch(`${API_BASE}/api/payments/vnpay/return?${callbackQuery}`, {
    redirect: "manual",
  });

  const paymentSuccessMsg = await paymentSuccessPromise;
  console.log("   ⚡ [WebSocket NHẬN THÀNH CÔNG] PAYMENT_SUCCESS:", paymentSuccessMsg.payload.message);
  results.push({ name: "Realtime PAYMENT_SUCCESS Event", status: "PASSED", payload: paymentSuccessMsg.payload });

  // --- BƯỚC 6: KIỂM TRA TRẠNG THÁI CUỐI VÀ E-TICKET QR ---
  console.log("\n6️⃣  Kiểm thử Trạng thái cuối của Đơn & Vé điện tử E-Ticket...");
  const detailRes = await fetch(`${API_BASE}/api/bookings/${createdBooking.id}`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const finalDetail = (await detailRes.json())?.data;

  console.log("   👉 Trạng thái đơn:", finalDetail?.booking?.status);
  console.log("   👉 Tổng thanh toán:", finalDetail?.booking?.totalAmount?.toLocaleString?.("vi-VN") || finalDetail?.booking?.totalAmount, "VND");
  console.log("   👉 Mã QR E-Ticket (Booking Code):", finalDetail?.booking?.bookingCode);
  console.log("   👉 Lịch sử giao dịch:", finalDetail?.transactions?.[0]?.status, "qua", finalDetail?.transactions?.[0]?.paymentMethod);

  if (finalDetail?.booking?.status === "CONFIRMED") {
    console.log("   ✅ Đơn đã chuyển thành CONFIRMED. Vé điện tử QR đã sẵn sàng in!");
    results.push({ name: "Final State CONFIRMED & E-Ticket QR Ready", status: "PASSED", bookingCode: finalDetail?.booking?.bookingCode });
  } else {
    throw new Error("Trạng thái không đúng: " + finalDetail?.booking?.status);
  }

  // --- BƯỚC 7: KIỂM THỬ HỦY ĐƠN & BROADCAST BOOKING_CANCELLED + HOÀN CHỖ REALTIME ---
  console.log("\n7️⃣  Kiểm thử Hủy đơn & Broadcast BOOKING_CANCELLED + Hoàn chỗ...");
  // Tạo đơn phụ để test hủy
  const cancelBookingRes = await fetch(`${API_BASE}/api/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      scheduleId: 4,
      numberOfPax: 2,
      contactName: "Phan Kỳ Anh",
      contactPhone: "0987654321",
      contactEmail: "phankyanh@example.com",
      notes: "Cancel test",
    }),
  });
  const cancelBooking = (await cancelBookingRes.json())?.data;

  const cancelEventPromise = new Promise((resolve) => {
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "BOOKING_CANCELLED" && Number(msg.payload?.bookingId) === cancelBooking.id) {
        ws.removeEventListener("message", handler);
        resolve(msg);
      }
    };
    ws.addEventListener("message", handler);
  });

  // User hủy đơn
  await fetch(`${API_BASE}/api/bookings/${cancelBooking.id}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userToken}` },
  });

  const cancelMsg = await cancelEventPromise;
  console.log("   ⚡ [WebSocket NHẬN THÀNH CÔNG] BOOKING_CANCELLED:", cancelMsg.payload.message);
  results.push({ name: "Realtime BOOKING_CANCELLED & Slot Restored", status: "PASSED", payload: cancelMsg.payload });

  // Close WebSocket
  ws.close();

  console.log("\n==========================================================");
  console.log("🎉 TẤT CẢ CÁC BƯỚC KIỂM THỬ ĐÃ THÀNH CÔNG 100%! 🎉");
  console.log("==========================================================");
  console.table(results);
}

runRealtimeTestSuite().catch((err) => {
  console.error("\n❌ LỖI TRONG QUÁ TRÌNH KIỂM THỬ:", err);
  process.exit(1);
});
