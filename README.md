# Know Your Strengths (Workshop Platform) 🎯

> **Dự án môn SSB · Đại học FPT Đà Nẵng (FUDA)**
> *Nền tảng đánh giá 5 điểm mạnh cá nhân, kết nối Teammate đồ án tốt nghiệp và phân nhóm thông minh tối ưu đa mục tiêu.*

---

## 📌 Tổng Quan Hệ Thống

Dự án **Know Your Strengths** được xây dựng nhằm giải quyết bài toán cốt lõi: **Potential ≠ Visibility** (Có năng lực chưa đồng nghĩa người khác biết bạn có năng lực đó). Hệ thống cung cấp:

1. **Bộ trắc nghiệm Mini Test 15 câu tình huống thực tế**: Đo lường 5 nhóm năng lực chuẩn mực của sinh viên làm việc nhóm:
   - **Communication** (Presenter - Đại diện & Kết nối, màu `#f37021`)
   - **Creativity** (Idea Generator - Sáng tạo & Khởi xướng, màu `#d99a00`)
   - **Research** (Data Keeper - Nghiên cứu & Dữ liệu, màu `#1e78d6`)
   - **Leadership** (Team Lead - Lãnh đạo & Điều phối, màu `#d92f2f`)
   - **Problem-solving** (Problem Solver - Giải quyết vấn đề & Tháo gỡ, màu `#22935a`)
2. **Hệ thống xác thực bắt buộc & Kiểm soát tên miền (Domain Policy)**:
   - Hỗ trợ đăng nhập Google OAuth / Supabase Auth hoặc xác thực Email/Mật khẩu an toàn.
   - Ràng buộc nghiêm ngặt phía server với danh sách tên miền hợp lệ (`@gmail.com`, `@fpt.edu.vn`, `@fe.edu.vn`).
   - Ngăn chặn trùng lặp hồ sơ sinh viên khi đăng nhập nhiều lần.
3. **Cơ chế Khởi tạo Quản trị viên (Initial Owner Bootstrap)**:
   - Xác định Quản trị viên đầu tiên một cách an toàn thông qua biến môi trường server `ADMIN_EMAIL`.
   - Tuyệt đối không cho phép tự đăng ký hoặc sửa đổi request để leo thang đặc quyền (Privilege Escalation).
   - Bảo vệ toàn bộ endpoint và trang quản trị bằng phân quyền server-side.
4. **Bộ dữ liệu 30 Hồ sơ Sinh viên Mẫu (Synthetic Demo Profiles)**:
   - 30 hồ sơ sinh viên tổng hợp đại diện đầy đủ 5 thế mạnh, 3 trạng thái tìm nhóm (*Đang tìm teammate*, *Đã có nhóm*, *Đang cân nhắc*).
   - Phân bố lệch thực tế (9 Leadership, 7 Communication, 6 Creativity, 5 Problem-solving, 3 Research) để thử nghiệm thuật toán phân nhóm trong điều kiện khan hiếm dữ liệu.
   - **Tổng điểm 5 nhóm thế mạnh luôn bằng đúng 15 điểm** cho mỗi lượt kiểm tra.
   - Script nạp dữ liệu Idempotent: chạy nhiều lần không gây trùng lặp.
   - **Cách ly dữ liệu (Demo Isolation)**: Dữ liệu mẫu không bao giờ xuất hiện trong thống kê và xuất báo cáo chính thức trừ khi Quản trị viên chủ động bật lựa chọn.
5. **Quyền riêng tư nghiêm ngặt (Strict Privacy & Granular Visibility)**:
   - Sinh viên kiểm soát hồ sơ hiển thị công khai, ẩn/hiện email, số điện thoại, mạng xã hội và kết quả bài test.
   - **Tuyệt đối bảo mật**: Câu trả lời chi tiết cho 15 câu hỏi của mỗi sinh viên không bao giờ được trả về cho các sinh viên khác trong bất kỳ hoàn cảnh nào.
6. **Thuật toán Phân nhóm Thông minh (Intelligent Team Generation)**:
   - Tối ưu hóa đa mục tiêu với thứ tự ưu tiên 1 đến 6.
   - Tự động phát hiện bất khả thi về mặt toán học và đưa ra cảnh báo minh bạch (ví dụ: chỉ có 3 bạn Research thì tối đa 3 nhóm có đủ 5 thế mạnh chính).
   - Tự động dùng Thế mạnh phụ (Secondary Strength) để bù đắp các nhóm còn thiếu.
   - Hỗ trợ xem trước (preview), điều chuyển thủ công thành viên giữa các nhóm và xác nhận lưu nhóm chính thức.

---

## ⚙️ Cấu Hình Môi Trường (.env)

Tạo file `.env` tại thư mục gốc của dự án theo mẫu `.env.example`:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Initial Administrator Email (Bootstrap initial owner account)
# Khi tài khoản đăng ký hoặc đăng nhập với email này, hệ thống sẽ cấp quyền 'admin'
ADMIN_EMAIL=owner.admin@gmail.com

# Danh sách tên miền email được phép đăng ký (phân tách bằng dấu phẩy)
ALLOWED_EMAIL_DOMAINS=gmail.com,fpt.edu.vn,fe.edu.vn

# Khóa bí mật phiên làm việc
SESSION_SECRET=super-secret-session-key-know-your-strengths-ssb201

# Google OAuth & Supabase Auth Configuration (Tùy chọn kết nối dịch vụ ngoài)
SUPABASE_URL=
SUPABASE_ANON_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Khởi chạy Server
```bash
# Sử dụng trực tiếp Node.js tích hợp sẵn:
node src/server.js
```
Hoặc:
```bash
npm start
```
Hệ thống sẽ chạy tại: **http://localhost:3000**

### 2. Nạp Dữ Liệu Demo 30 Sinh Viên
```bash
node src/db/seed_demo.js
```
Hoặc:
```bash
npm run seed
```
> **Ghi chú**: Script này là **Idempotent**. Bạn có thể chạy lại bất cứ lúc nào mà không sợ tạo ra dữ liệu trùng lặp.

### 3. Chạy Toàn Bộ Test Tự Động
```bash
npm test
```
Hoặc:
```bash
node --test --test-concurrency=1 tests/*.test.js
```
*Tất cả 17 bài test kiểm thử tự động (Unit test thuật toán, Bảo mật quyền riêng tư, Bootstrap Admin, Cách ly Demo và Toàn bộ REST API) đều vượt qua 100%.*

---

## 🔒 Quy Trình Cấp Quyền & Khôi Phục Tài Khoản Admin

1. **Khởi tạo Quản trị viên ban đầu**:
   - Trong file `.env`, đặt `ADMIN_EMAIL` thành địa chỉ email của bạn (ví dụ: `yourname@gmail.com` hoặc `yourname@fpt.edu.vn`).
   - Truy cập giao diện web, chọn **Đăng nhập / Đăng ký** và đăng ký hoặc đăng nhập bằng email này.
   - Phía server tự động đối chiếu `cleanEmail === config.adminEmail` và gán vai trò `admin`, đồng thời ghi nhận vào bảng `admin_audit_logs`.
   - Thanh điều hướng sẽ xuất hiện menu: **Quản trị Admin 👑**.
2. **Khôi phục / Thay đổi Quản trị viên**:
   - Để chuyển quyền sở hữu sang email khác, cập nhật giá trị `ADMIN_EMAIL` trong file `.env` trên server.
   - Khởi động lại ứng dụng.
   - Khi chủ sở hữu mới đăng nhập với email cấu hình mới, họ sẽ tự động được thăng cấp làm quản trị viên.

---

## 📊 Cấu Trúc Dự Án

```
know-your-strengths/
├── package.json               # Cấu hình dự án & scripts
├── .env.example               # Mẫu biến môi trường
├── .env                       # File cấu hình biến môi trường
├── README.md                  # Tài liệu hướng dẫn chi tiết
├── src/
│   ├── config.js              # Parser cấu hình & xác thực tên miền
│   ├── server.js              # Máy chủ HTTP & REST API endpoints
│   ├── db/
│   │   ├── database.js        # Khởi tạo SQLite (WAL mode, busy_timeout)
│   │   ├── schema.sql         # Lược đồ cơ sở dữ liệu quan hệ
│   │   └── seed_demo.js       # Script nạp 30 sinh viên mẫu idempotent
│   ├── data/
│   │   ├── questions.js       # 15 câu tình huống & logic tính điểm
│   │   └── demoProfiles.js    # Định nghĩa 30 hồ sơ sinh viên synthetic
│   ├── services/
│   │   ├── authService.js     # Xác thực mật khẩu pbkdf2, session token, OAuth
│   │   ├── privacyService.js  # Lọc dữ liệu quyền riêng tư & cách ly demo
│   │   ├── teamGenerator.js   # Thuật toán phân nhóm tối ưu đa mục tiêu
│   │   └── workshopService.js # Nghiệp vụ quản lý workshop & lưu trữ nhóm
│   └── public/                # Giao diện người dùng Web SPA
│       ├── index.html         # HTML layout chuẩn thiết kế Strength Lab
│       ├── css/
│       │   └── style.css      # CSS palette FPT, 5 điểm mạnh & responsive
│       └── js/
│           └── app.js         # Client-side SPA logic & tương tác người dùng
└── tests/
    ├── adminBootstrap.test.js     # Kiểm tra phân quyền & bootstrap admin
    ├── demoIsolation.test.js      # Kiểm tra tính cách ly của dữ liệu demo
    ├── privacyAndSecurity.test.js # Kiểm tra bảo vệ câu trả lời & thông tin ẩn
    ├── teamGenerator.test.js      # Kiểm tra thuật toán phân nhóm (cân bằng, lệch, lẻ)
    └── serverApi.test.js          # Kiểm tra toàn bộ REST API endpoints
```

---

## 🛡️ Ma Trận Quyền Truy Cập (Access Control Matrix)

| Quyền hạn / Dữ liệu | Khách vãng lai | Sinh viên xác thực | Sinh viên chủ sở hữu | Quản trị viên (Admin) |
| :--- | :---: | :---: | :---: | :---: |
| Xem Trang chủ & 5 Thế mạnh | ✅ | ✅ | ✅ | ✅ |
| Làm bài Mini Test 15 câu | ❌ *(Yêu cầu đăng nhập)* | ✅ | ✅ | ✅ |
| Xem câu trả lời chi tiết của mình | ❌ | ❌ | ✅ | ❌ *(Least-privilege)* |
| Xem câu trả lời chi tiết của bạn khác | ❌ | ❌ | ❌ | ❌ *(Bảo mật tuyệt đối)* |
| Tìm kiếm trong Danh bạ Teammate | ❌ *(Yêu cầu đăng nhập)* | ✅ *(Chỉ xem hồ sơ đã xuất bản)* | ✅ | ✅ *(Xem toàn bộ)* |
| Xem Email / SĐT của bạn khác | ❌ | ❌ *(Nếu bạn đó ẩn)* | ✅ | ✅ *(Khi cần vận hành)* |
| Đăng bài, Thích, Bình luận | ❌ | ✅ | ✅ | ✅ |
| Gửi lời mời kết nối Teammate | ❌ | ✅ | ✅ | ✅ |
| Chạy thuật toán "Random nhóm" | ❌ | ❌ | ❌ | ✅ |
| Điều chuyển thành viên giữa các nhóm | ❌ | ❌ | ❌ | ✅ |
| Lưu danh sách nhóm chính thức | ❌ | ❌ | ❌ | ✅ |
| Xuất dữ liệu CSV / JSON | ❌ | ❌ | ❌ | ✅ |
| Chuyển đổi hiển thị Dữ liệu Demo | ❌ | ✅ *(Trong danh bạ)* | ✅ | ✅ *(Toàn hệ thống)* |
