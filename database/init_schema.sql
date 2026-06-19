-- ============================================================
-- Khởi tạo schema cho ứng dụng ngân hàng - chạy script này trước
-- ============================================================

-- Tạo bảng Khách hàng
CREATE TABLE IF NOT EXISTS KhachHang (
    MaKH INT AUTO_INCREMENT PRIMARY KEY,
    TenKH VARCHAR(100) NOT NULL,
    CCCD VARCHAR(20) NOT NULL UNIQUE,
    SDT VARCHAR(15),
    DiaChiKH VARCHAR(255),
    NgayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    NgayCapNhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tạo bảng Chi nhánh (nếu chưa tồn tại)
CREATE TABLE IF NOT EXISTS ChiNhanh (
    MaCN INT AUTO_INCREMENT PRIMARY KEY,
    TenCN VARCHAR(100) NOT NULL,
    DiaChiCN VARCHAR(255)
);

-- Thêm chi nhánh mặc định nếu chưa có
INSERT IGNORE INTO ChiNhanh (MaCN, TenCN, DiaChiCN) VALUES (1, 'Chi nhánh chính', 'Hà Nội');

-- Tạo bảng Tài khoản
CREATE TABLE IF NOT EXISTS TaiKhoan (
    MaTK INT AUTO_INCREMENT PRIMARY KEY,
    SoTK VARCHAR(20) NOT NULL UNIQUE,
    SoDu DECIMAL(15, 2) DEFAULT 0,
    NgayMo DATETIME DEFAULT CURRENT_TIMESTAMP,
    MaKH INT NOT NULL,
    MaCN INT DEFAULT 1,
    TrangThai VARCHAR(20) DEFAULT 'ACTIVE',
    CONSTRAINT fk_taikhoan_khachhang
        FOREIGN KEY (MaKH) REFERENCES KhachHang(MaKH)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_taikhoan_chinhanh
        FOREIGN KEY (MaCN) REFERENCES ChiNhanh(MaCN)
        ON DELETE SET DEFAULT
        ON UPDATE CASCADE
);

-- Tạo bảng Giao dịch
CREATE TABLE IF NOT EXISTS GiaoDich (
    MaGD INT AUTO_INCREMENT PRIMARY KEY,
    LoaiGD VARCHAR(20) NOT NULL,
    SoTien DECIMAL(15, 2) NOT NULL,
    NgayGio DATETIME DEFAULT CURRENT_TIMESTAMP,
    SoTK VARCHAR(20),
    SoTK_ThuHuong VARCHAR(20),
    MaNV INT,
    GhiChu VARCHAR(255)
);

-- Tạo bảng Thông tin đăng nhập (bảng mới cho JWT)
CREATE TABLE IF NOT EXISTS ThongTinDangNhap (
    MaTKDN INT AUTO_INCREMENT PRIMARY KEY,
    MaKH INT NOT NULL UNIQUE,
    MatKhauHash VARCHAR(255) NOT NULL,
    NgayTao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    NgayCapNhat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_thongtindangnhap_khachhang
        FOREIGN KEY (MaKH) REFERENCES KhachHang(MaKH)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Tạo index cho tối ưu query
CREATE INDEX idx_khachhang_cccd ON KhachHang(CCCD);
CREATE INDEX idx_taikhoan_makh ON TaiKhoan(MaKH);
CREATE INDEX idx_taikhoan_sotk ON TaiKhoan(SoTK);
CREATE INDEX idx_giaodich_sotk ON GiaoDich(SoTK);
CREATE INDEX idx_giaodich_ngaygio ON GiaoDich(NgayGio);
CREATE INDEX idx_thongtindangnhap_makh ON ThongTinDangNhap(MaKH);

-- Sau khi chạy script này, bạn có thể bắt đầu dùng ứng dụng
