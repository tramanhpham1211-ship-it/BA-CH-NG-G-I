# BA CHÀNG GÁI — 3D SEA FOOTBALL (ONLINE MULTIPLAYER)

Game bóng đá 3D 5v5 phong cách thủy cung (Sea Football) với đồ họa WebGL 1 và hệ thống mạng WebSocket 2 máy trực tuyến thời gian thực (Real-time).

---

## 🚀 ĐẶC ĐIỂM KỸ THUẬT & TƯƠNG THÍCH

- **Ngôn ngữ:** JavaScript thuần (ES Modules, Node.js 18+ & WebGL 1). Chạy trực tiếp, siêu nhẹ, không lỗi phụ thuộc.
- **Node & NPM:** Tương thích Node.js `>=18.0.0` (khuyên dùng Node 18, 20 hoặc 22 LTS) và NPM `>=9.0.0`.
- **Giao thức:** HTTP + WebSocket (`ws`) tích hợp chung trên cùng một cổng (`PORT`), tự động chuyển đổi `ws://` khi test cục bộ và `wss://` khi chạy HTTPS trên Render.com.
- **Tính năng game nổi bật:**
  - **Camera mượt mà theo góc nhìn cầu thủ (Chase Follow Cam):** Tự động bám sau lưng nhân vật điều khiển, chuyển góc mượt mà êm ái khi đổi người (`Space` / `Q`) mà không bị rung giật.
  - **Cơ chế rê bóng nhịp nhàng:** Bóng tách ra khi đẩy bóng về phía trước, dính vô khi đuổi kịp bóng, rồi lại rời ra khi đổi vây chạm bóng trái/phải, không bị dính cục ở đầu cá.
  - **Hiệu ứng sút & chuyền bóng 3D:** Vòng sóng xung kích (Shockwave), chùm tia nước & bọt sóng (Water Spray & Sparks), vệt đuôi đường đạn (Ball Speed Trail), vòng xoáy tụ lực sút.
  - **Hệ thống chia sẻ bạn bè siêu tiện lợi:**
    - 📤 Nút chia sẻ 1 chạm qua Zalo / Messenger / Telegram.
    - 📱 Mã QR hiển thị trực tiếp trên màn hình: Bạn bè chỉ cần giơ camera điện thoại quét là vào ngay trận đấu.
    - 🔗 Link tham gia trực tiếp: Người nhận link chỉ cần bấm **🚀 VÀO THI ĐẤU NGAY** mà không cần gõ mã phòng.
  - **Tối ưu chống giật lag mạng:** Điều tiết gói tin Snapshot 30–33 Hz và nội suy vị trí liên tục cho máy khách, đảm bảo chuyển động mượt mà 60–120 FPS trên mọi thiết bị.

---

## 🌐 HƯỚNG DẪN TRIỂN KHAI LÊN RENDER.COM (TỪNG BƯỚC CHI TIẾT)

Dự án đã được cấu hình sẵn 100% để chạy ngay trên **Render.com** (gói Free hoặc bất kỳ gói nào).

### Cách 1: Sử dụng Blueprint (`render.yaml`) — Nhanh nhất (1-Click)
1. Đẩy mã nguồn dự án lên GitHub hoặc GitLab của bạn.
2. Đăng nhập vào [Render.com](https://render.com) -> chọn **New +** -> **Blueprint**.
3. Chọn Repository vừa tạo. Render sẽ tự động đọc file `render.yaml` và cấu hình toàn bộ Web Service.
4. Nhấn **Apply**. Sau khoảng 1-2 phút, Render sẽ cấp cho bạn một đường link HTTPS công khai (ví dụ: `https://ba-chang-gai-sea-football.onrender.com`).

### Cách 2: Tạo thủ công Web Service trên Render
1. Đẩy mã nguồn lên GitHub/GitLab.
2. Tại dashboard Render.com -> chọn **New +** -> **Web Service**.
3. Chọn Repository dự án.
4. Cấu hình các thông số:
   - **Name:** `ba-chang-gai-sea-football` (hoặc tên tùy ý)
   - **Region:** `Singapore (Southeast Asia)` hoặc vùng gần bạn
   - **Branch:** `main` (hoặc `master`)
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js` (hoặc `npm start`)
   - **Instance Type:** `Free`
5. Nhấn mục **Advanced Settings**:
   - **Health Check Path:** `/health`
   - **Auto-Deploy:** `Yes`
6. Nhấn **Create Web Service**.

---

## 🎮 CÁCH CHIA SẺ & CHƠI ONLINE VỚI BẠN BÈ

1. Truy cập vào link web Render của bạn (ví dụ: `https://ba-chang-gai-sea-football.onrender.com`).
2. **Người 1 (Host):**
   - Nhập tên và bấm **TẠO PHÒNG MỚI**.
   - Màn hình sẽ hiện mã phòng (Room ID), mã QR và nút **📤 CHIA SẺ VỚI BẠN BÈ**.
   - Bạn có thể:
     - Bấm **📤 CHIA SẺ VỚI BẠN BÈ** để gửi thẳng qua Zalo/Messenger/SMS.
     - Hoặc đưa mã QR cho bạn bè quét bằng camera điện thoại.
     - Hoặc bấm **🔗 CHÉP FULL LINK** và dán vào khung chat.
3. **Người 2 (Bạn bè):**
   - Khi bấm vào link hoặc quét mã QR, màn hình sẽ hiện thẻ: **⚽ BẠN ĐƯỢC MỜI VÀO THI ĐẤU!**
   - Chỉ cần bấm **🚀 VÀO NGAY TRẬN ĐẤU VỚI BẠN** là tự động kết nối thẳng vào phòng mà không cần gõ bất kỳ ký tự nào.
4. Người 1 (Host) bấm **BẮT ĐẦU TRẬN ĐẤU** để so tài!

---

## 📦 CHẠY DƯỚI LOCAL (MÁY CÁ NHÂN)

```bash
# Cài đặt thư viện:
npm install

# Khởi động server game:
npm start
# Hoặc: npm run dev
```

Mở trình duyệt: `http://localhost:3000`
