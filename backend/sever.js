const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'bank_project_jwt_secret_change_me';

// Middleware
app.use(cors());
app.use(express.json());

// Kết nối Cơ sở dữ liệu MySQL
const pool = mysql.createPool({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,           // Cổng kết nối MySQL
    user: '2irnfWyzV2o1yCE.root',           // Tên user MySQL
    password: '0oQ3gp2D4cMmKkZt',       // Mật khẩu MySQL của bạn
    database: 'BankManagement', // Tên database
    ssl: {
        minVersion: 'TLSv1.2'
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

function createAuthToken(customer, account) {
    return jwt.sign(
        {
            MaKH: customer.MaKH,
            TenKH: customer.TenKH,
            CCCD: customer.CCCD,
            SoTK: account ? account.SoTK : null
        },
        JWT_SECRET,
        { expiresIn: '2h' }
    );
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ message: 'Thiếu token xác thực!' });
    }

    try {
        req.auth = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn!' });
    }
}

// Khởi tạo cơ sở dữ liệu - Skip if DB already exists with conflicting FKs
async function initializeDatabase() {
    console.log('✓ Database initialization skipped (database already configured)');
}

// 1. API ĐĂNG KÝ (REGISTER)
app.post('/api/bank/register', async (req, res) => {
    const { username, cccd, sdt, password, confirmPassword } = req.body;
    const accountNum = Math.floor(100000000000 + Math.random() * 900000000000).toString();

    if (!username || !cccd || !sdt || !password || !confirmPassword) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin đăng ký!' });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Mật khẩu nhập lại không khớp!' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Get max MaKH and increment
        const [maxIdResult] = await pool.execute('SELECT MAX(MaKH) as maxId FROM KhachHang');
        const newMaKH = (maxIdResult[0].maxId || 0) + 1;
        
        const [customerResult] = await pool.execute(
            'INSERT INTO KhachHang (MaKH, TenKH, CCCD, SDT, DiaChiKH) VALUES (?, ?, ?, ?, ?)',
            [newMaKH, username, cccd, sdt, '']
        );

        await pool.execute(
            'INSERT INTO TaiKhoan (SoTK, SoDu, NgayMo, MaKH, MaCN) VALUES (?, ?, NOW(), ?, ?)',
            [accountNum, 0, newMaKH, 1]
        );

        await pool.execute(
            'INSERT INTO ThongTinDangNhap (MaKH, MatKhauHash, NgayTao, NgayCapNhat) VALUES (?, ?, NOW(), NOW())',
            [newMaKH, passwordHash]
        );

        res.json({ message: "Đăng ký thành công!", account_number: accountNum });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: "Tên đăng nhập đã tồn tại hoặc có lỗi xảy ra!" });
    }
});

// 2. API ĐĂNG NHẬP (LOGIN)
app.post('/api/bank/login', async (req, res) => {
    const { cccd, password } = req.body;

    if (!cccd || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập CCCD và mật khẩu!' });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT kh.MaKH, kh.TenKH, kh.CCCD, dn.MatKhauHash FROM KhachHang kh INNER JOIN ThongTinDangNhap dn ON dn.MaKH = kh.MaKH WHERE kh.CCCD = ? LIMIT 1',
            [cccd]
        );
        if (rows.length === 0) {
            return res.status(401).json({ message: "Sai thông tin đăng nhập!" });
        }

        const passwordMatches = await bcrypt.compare(password, rows[0].MatKhauHash);
        if (!passwordMatches) {
            return res.status(401).json({ message: "Sai thông tin đăng nhập!" });
        }

        const [accountRows] = await pool.execute(
            'SELECT SoTK, SoDu FROM TaiKhoan WHERE MaKH = ? LIMIT 1',
            [rows[0].MaKH]
        );

        const token = createAuthToken(rows[0], accountRows[0]);

        res.json({
            id: rows[0].MaKH,
            MaKH: rows[0].MaKH,
            username: rows[0].TenKH,
            TenKH: rows[0].TenKH,
            CCCD: rows[0].CCCD,
            account_number: accountRows[0] ? accountRows[0].SoTK : null,
            balance: accountRows[0] ? accountRows[0].SoDu : 0,
            token
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi máy chủ!" });
    }
});

// 3. API CHUYỂN TIỀN (TRANSFER)
app.post('/api/bank/transfer', async (req, res) => {
    const { userId, targetAccount, amount, message } = req.body;
    const transferAmount = parseInt(amount);

    try {
        const [senderRows] = await pool.execute('SELECT SoTK, SoDu FROM TaiKhoan WHERE MaKH = ?', [userId]);
        if (senderRows.length === 0) {
            return res.status(400).json({ message: "Không tìm thấy tài khoản người gửi!" });
        }

        if (senderRows[0].SoDu < transferAmount) {
            return res.status(400).json({ message: "Số dư tài khoản không đủ!" });
        }

        const [receiverRows] = await pool.execute('SELECT MaKH, SoTK FROM TaiKhoan WHERE SoTK = ?', [targetAccount]);
        if (receiverRows.length === 0) {
            return res.status(400).json({ message: "Số tài khoản người nhận không tồn tại!" });
        }

        await pool.execute('UPDATE TaiKhoan SET SoDu = SoDu - ? WHERE MaKH = ?', [transferAmount, userId]);
        await pool.execute('UPDATE TaiKhoan SET SoDu = SoDu + ? WHERE SoTK = ?', [transferAmount, targetAccount]);

        // Get max MaGD and increment for 2 transactions
        const [maxGdResult] = await pool.execute('SELECT MAX(MaGD) as maxId FROM GiaoDich');
        let newMaGD = (maxGdResult[0].maxId || 0) + 1;

        await pool.execute(
            'INSERT INTO GiaoDich (MaGD, LoaiGD, SoTien, NgayGio, SoTK, SoTK_ThuHuong, MaNV) VALUES (?, ?, ?, NOW(), ?, ?, ?)',
            [newMaGD, 'CHUYEN', transferAmount, senderRows[0].SoTK, targetAccount, null]
        );
        
        newMaGD++;
        await pool.execute(
            'INSERT INTO GiaoDich (MaGD, LoaiGD, SoTien, NgayGio, SoTK, SoTK_ThuHuong, MaNV) VALUES (?, ?, ?, NOW(), ?, ?, ?)',
            [newMaGD, 'NHAN', transferAmount, targetAccount, senderRows[0].SoTK, null]
        );

        res.json({ message: "Chuyển khoản thành công!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi giao dịch!" });
    }
});

// 4. API LẤY DỮ LIỆU DASHBOARD
app.get('/api/bank/dashboard/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const [accountRows] = await pool.execute('SELECT SoTK, SoDu FROM TaiKhoan WHERE MaKH = ? LIMIT 1', [userId]);
        if (accountRows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy tài khoản!" });
        }

        const [txRows] = await pool.execute(
            "SELECT CASE WHEN SoTK = ? THEN 'OUT' ELSE 'IN' END as type, SoTien as amount, CASE WHEN SoTK = ? THEN CONCAT('Chuyển tới STK ', SoTK_ThuHuong) ELSE CONCAT('Nhận từ STK ', SoTK) END as message, DATE_FORMAT(NgayGio, '%d/%m/%Y %H:%i') as time FROM GiaoDich WHERE SoTK = ? OR SoTK_ThuHuong = ? ORDER BY NgayGio DESC",
            [accountRows[0].SoTK, accountRows[0].SoTK, accountRows[0].SoTK, accountRows[0].SoTK]
        );

        res.json({ balance: accountRows[0].SoDu, account_number: accountRows[0].SoTK, history: txRows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi lấy dữ liệu!" });
    }
});

// 5. API NẠP TIỀN (DEPOSIT)
app.post('/api/bank/deposit', async (req, res) => {
    const { userId, amount } = req.body; 
    const depositAmount = parseInt(amount);

    if (!userId || !depositAmount || depositAmount < 10000) {
        return res.status(400).json({ message: "Dữ liệu nạp tiền không hợp lệ!" });
    }

    try {
        const [accountRows] = await pool.execute('SELECT SoTK FROM TaiKhoan WHERE MaKH = ? LIMIT 1', [userId]);
        if (accountRows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy tài khoản!" });
        }

        await pool.execute('UPDATE TaiKhoan SET SoDu = SoDu + ? WHERE MaKH = ?', [depositAmount, userId]);
        
        // Get max MaGD and increment
        const [maxGdResult] = await pool.execute('SELECT MAX(MaGD) as maxId FROM GiaoDich');
        const newMaGD = (maxGdResult[0].maxId || 0) + 1;
        
        await pool.execute(
            'INSERT INTO GiaoDich (MaGD, LoaiGD, SoTien, NgayGio, SoTK, SoTK_ThuHuong, MaNV) VALUES (?, ?, ?, NOW(), ?, ?, ?)',
            [newMaGD, 'NAP', depositAmount, accountRows[0].SoTK, null, null]
        );
        res.json({ message: "Nạp tiền thành công!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi Server!" });
    }
});

// 6. API ĐỔI MẬT KHẨU (JWT)
app.post('/api/bank/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin đổi mật khẩu!' });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'Mật khẩu mới nhập lại không khớp!' });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT MatKhauHash FROM ThongTinDangNhap WHERE MaKH = ? LIMIT 1',
            [req.auth.MaKH]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy thông tin đăng nhập!' });
        }

        const currentMatches = await bcrypt.compare(currentPassword, rows[0].MatKhauHash);
        if (!currentMatches) {
            return res.status(401).json({ message: 'Mật khẩu hiện tại không đúng!' });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.execute(
            'UPDATE ThongTinDangNhap SET MatKhauHash = ?, NgayCapNhat = NOW() WHERE MaKH = ?',
            [newHash, req.auth.MaKH]
        );

        res.json({ message: 'Đổi mật khẩu thành công!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi đổi mật khẩu!' });
    }
});

// Khởi chạy Server
app.listen(PORT, () => {
    console.log(`Backend Server đang chạy tại http://localhost:${PORT}`);
    initializeDatabase();
});