// Cấu hình URL gọi tới Backend Node.js
const API_BASE_URL = "http://localhost:4000/api/bank";

let isRegisterMode = false;
let currentUserId = null;
let authToken = null;

// Hàm 1: Khởi tạo sự kiện DOM ban đầu
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("auth-form").addEventListener("submit", handleAuthSubmit);
    document.getElementById("link-toggle-auth").addEventListener("click", toggleAuthMode);
    document.getElementById("transfer-form").addEventListener("submit", handleTransferSubmit);
    document.getElementById("btn-logout").addEventListener("click", handleLogout);

    const usernameGroup = document.getElementById("username-group");
    const phoneGroup = document.getElementById("phone-group");
    const confirmPasswordGroup = document.getElementById("confirm-password-group");
    const usernameInput = document.getElementById("username");
    const phoneInput = document.getElementById("phone");
    const confirmPasswordInput = document.getElementById("confirm-password");
    const passwordLabel = document.getElementById("password-label");

    usernameGroup.classList.add("hidden");
    phoneGroup.classList.add("hidden");
    confirmPasswordGroup.classList.add("hidden");
    usernameInput.required = false;
    phoneInput.required = false;
    confirmPasswordInput.required = false;
    passwordLabel.textContent = "Mật khẩu đăng nhập";
    
    // Khởi tạo sự kiện cho form nạp tiền
    const depositForm = document.getElementById('deposit-form');
    if (depositForm) {
        depositForm.addEventListener('submit', handleDepositSubmit);
    }

    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleChangePasswordSubmit);
    }
});

// Hàm 2: Định dạng tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Hàm 3: Chuyển đổi giao diện Đăng nhập / Đăng ký
function toggleAuthMode(event) {
    if(event) event.preventDefault();
    isRegisterMode = !isRegisterMode;
    
    const subtitle = document.getElementById("auth-subtitle");
    const submitBtn = document.getElementById("btn-auth-submit");
    const toggleText = document.getElementById("toggle-auth-text");
    const usernameGroup = document.getElementById("username-group");
    const phoneGroup = document.getElementById("phone-group");
    const confirmPasswordGroup = document.getElementById("confirm-password-group");
    const passwordLabel = document.getElementById("password-label");
    const usernameInput = document.getElementById("username");
    const phoneInput = document.getElementById("phone");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirm-password");

    if (isRegisterMode) {
        subtitle.textContent = "Đăng ký khách hàng mới";
        submitBtn.textContent = "Đăng Ký";
        toggleText.innerHTML = 'Đã có tài khoản? <a href="#" id="link-toggle-auth">Đăng nhập</a>';
        usernameGroup.classList.remove("hidden");
        phoneGroup.classList.remove("hidden");
        confirmPasswordGroup.classList.remove("hidden");
        usernameInput.required = true;
        phoneInput.required = true;
        confirmPasswordInput.required = true;
        passwordLabel.textContent = "Mật khẩu mới";
    } else {
        subtitle.textContent = "Đăng nhập để trải nghiệm dịch vụ số";
        submitBtn.textContent = "Đăng Nhập";
        toggleText.innerHTML = 'Chưa có tài khoản? <a href="#" id="link-toggle-auth">Đăng ký ngay</a>';
        usernameGroup.classList.add("hidden");
        phoneGroup.classList.add("hidden");
        confirmPasswordGroup.classList.add("hidden");
        usernameInput.required = false;
        phoneInput.required = false;
        confirmPasswordInput.required = false;
        passwordLabel.textContent = "Mật khẩu đăng nhập";
    }
    
    document.getElementById("link-toggle-auth").addEventListener("click", toggleAuthMode);
}

// Hàm 4: Xử lý Đăng nhập / Đăng ký qua API
async function handleAuthSubmit(event) {
    event.preventDefault();
    const cccdIn = document.getElementById("cccd").value.trim();
    const passwordIn = document.getElementById("password").value;
    
    try {
        if (isRegisterMode) {
            const usernameIn = document.getElementById("username").value.trim();
            const sdtIn = document.getElementById("phone").value.trim();
            const confirmPasswordIn = document.getElementById("confirm-password").value;

            if (passwordIn !== confirmPasswordIn) {
                alert("Mật khẩu nhập lại không khớp!");
                return;
            }

            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: usernameIn,
                    cccd: cccdIn,
                    sdt: sdtIn,
                    password: passwordIn,
                    confirmPassword: confirmPasswordIn
                })
            });
            const result = await response.json().catch(() => ({}));
            alert(result.message || "Đăng ký thất bại!");

            if (response.ok) {
                toggleAuthMode();
                document.getElementById("auth-form").reset();
            }
        } else {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cccd: cccdIn, password: passwordIn })
            });
            const result = await response.json().catch(() => ({}));

            if (response.ok) {
                currentUserId = result.MaKH || result.id;
                authToken = result.token || null;
                const displayName = result.username || result.TenKH || '';
                document.getElementById("lbl-username").textContent = displayName.toUpperCase();
                
                // Chuyển màn hình và tải dữ liệu 
                document.getElementById("auth-container").classList.add("hidden");
                document.getElementById("main-dashboard").classList.remove("hidden");
                loadDashboardData();
            } else {
                alert(result.message || "Sai thông tin đăng nhập!");
            }
        }
    } catch (error) {
        console.error('Lỗi xử lý đăng nhập/đăng ký:', error);
        alert('Không thể kết nối đến server!');
    }
}

// Hàm 5: Lấy dữ liệu và Hiển thị lịch sử
async function loadDashboardData() {
    if (!currentUserId) return;
    
    const response = await fetch(`${API_BASE_URL}/dashboard/${currentUserId}`);
    if (response.ok) {
        const data = await response.json();
        
        // Đổ dữ liệu ra UI
        document.getElementById("lbl-account-num").textContent = data.account_number;
        document.getElementById("lbl-balance").textContent = formatCurrency(data.balance);
        
        const tableBody = document.getElementById("history-table-body");
        tableBody.innerHTML = "";
        
        for(let i = 0; i < data.history.length; i++) {
            const item = data.history[i];
            const row = document.createElement("tr");
            
            let moneyClass = "";
            let sign = "";
            if (item.type === "IN") {
                moneyClass = "text-success";
                sign = "+";
            } else {
                moneyClass = "text-danger";
                sign = "-";
            }

            row.innerHTML = `
                <td>${item.time}</td>
                <td>${item.message}</td>
                <td class="${moneyClass}">${sign}${formatCurrency(item.amount)}</td>
            `;
            tableBody.appendChild(row);
        }
    }
}

// Hàm 6: Xử lý NẠP TIỀN qua API (Đã fix lỗi URL và biến userId)
async function handleDepositSubmit(event) {
    event.preventDefault();
    
    // Tự động tìm ID ô nhập tiền (phòng trường hợp HTML của bạn dùng 'amount' hoặc 'deposit-amount')
    const amountInput = document.getElementById('deposit-amount') || document.getElementById('amount');
    
    if (!amountInput) {
        alert("Lỗi: Không tìm thấy ô nhập số tiền trên giao diện HTML!");
        return;
    }
    
    const amount = amountInput.value;

    if (!currentUserId) {
        alert("Bạn cần đăng nhập tài khoản trước khi nạp tiền!");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/deposit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                userId: currentUserId, 
                amount: parseInt(amount) 
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Nạp tiền vào tài khoản thành công!');
            document.getElementById('deposit-form').reset();
            loadDashboardData(); // Tự động làm mới UI mà không cần tải lại trang
        } else {
            alert(data.message || 'Nạp tiền thất bại!');
        }
    } catch (error) {
        console.error('Lỗi kết nối nạp tiền:', error);
        alert('Không thể kết nối đến server!');
    }
}

// Hàm 7: Xử lý Chuyển khoản qua API
async function handleTransferSubmit(event) {
    event.preventDefault();
    const targetSTK = document.getElementById("target-account").value.trim();
    const amountTransfer = document.getElementById("transfer-amount").value;
    const message = document.getElementById("transfer-msg").value;

    const response = await fetch(`${API_BASE_URL}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: currentUserId,
            targetAccount: targetSTK,
            amount: amountTransfer,
            message: message
        })
    });

    const result = await response.json();
    alert(result.message);

    if (response.ok) {
        document.getElementById("transfer-form").reset();
        loadDashboardData(); // Cập nhật lại UI sau khi chuyển tiền
    }
}

// Hàm 8: Đổi mật khẩu bằng JWT
async function handleChangePasswordSubmit(event) {
    event.preventDefault();

    if (!authToken || !currentUserId) {
        alert('Bạn cần đăng nhập lại trước khi đổi mật khẩu!');
        return;
    }

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;

    if (newPassword !== confirmPassword) {
        alert('Mật khẩu mới nhập lại không khớp!');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword,
                confirmPassword
            })
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            alert(data.message || 'Đổi mật khẩu thành công!');
            handleLogout();
        } else {
            alert(data.message || 'Đổi mật khẩu thất bại!');
        }
    } catch (error) {
        console.error('Lỗi đổi mật khẩu:', error);
        alert('Không thể kết nối đến server!');
    }
}

// Hàm 9: Đăng xuất
function handleLogout() {
    currentUserId = null;
    authToken = null;
    document.getElementById("auth-form").reset();
    document.getElementById("main-dashboard").classList.add("hidden");
    document.getElementById("auth-container").classList.remove("hidden");
}