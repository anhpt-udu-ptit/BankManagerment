# 🏦 E-Banking System - Hệ Thống Quản Lý Ngân Hàng Trực Tuyến

> Dự án Bài tập lớn môn Lập trình với ngôn ngữ Script - Học viện Công nghệ Bưu chính Viễn thông (PTIT).
> 
> Ứng dụng mô phỏng các nghiệp vụ ngân hàng trực tuyến, được phát triển theo kiến trúc Single Page Application (SPA) với Vanilla JavaScript và giao tiếp với Backend thông qua RESTful API.

---

## 🌟 Tính năng nổi bật

* **Xác thực người dùng (Authentication):** Đăng nhập và đăng ký tài khoản an toàn sử dụng số Căn cước công dân (CCCD).
* **Quản lý bảo mật (Security):** Tích hợp phân quyền và bảo vệ phiên giao dịch bằng JSON Web Token (JWT). Tính năng đổi mật khẩu yêu cầu xác thực bằng Bearer Token.
* **Bảng điều khiển trực quan (Dashboard):** Hiển thị thông tin chủ tài khoản, định dạng số dư tự động theo chuẩn tiền tệ Việt Nam Đồng (VNĐ).
* **Nghiệp vụ tài chính (Transactions):** Thực hiện nạp tiền và chuyển khoản nội bộ với thời gian thực (Real-time update) không cần tải lại trang.
* **Lịch sử giao dịch (History):** Liệt kê chi tiết dòng tiền ra/vào (IN/OUT) với thiết kế phân loại màu sắc định hướng thị giác (Xanh/Đỏ).

---

## 🛠️ Công nghệ sử dụng

### Trình bày giao diện (Frontend)
* **HTML5 & CSS3:** Xây dựng bố cục và tạo hiệu ứng kính mờ (Glassmorphism) hiện đại, bắt mắt.
* **Vanilla JavaScript (ES6+):** Xử lý logic nghiệp vụ, quản lý DOM động và bắt sự kiện.
* **Async/Await & Fetch API:** Gọi dữ liệu bất đồng bộ từ máy chủ để dựng giao diện SPA mượt mà.

### Xử lý logic (Backend)
* **Node.js & Express.js:** Cung cấp các RESTful API endpoints (Đăng nhập, Nạp tiền, Chuyển khoản...).
* **JWT (JSON Web Token):** Mã hóa và cấp phát thẻ bài xác thực.

---

## 🚀 Hướng dẫn cài đặt và chạy dự án

Để chạy thử dự án trên máy cá nhân của bạn, vui lòng làm theo các bước sau:

**Bước 1: Tải mã nguồn về máy**
```bash
git clone [https://github.com/anhpt-udu-ptit/BankManagerment](https://github.com/anhpt-udu-ptit/BankManagerment)
cd BankManagerment
