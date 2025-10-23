const tagContainer = document.getElementById('tags');
const productContainer = document.getElementById('products');
const paginationContainer = document.getElementById('pagination');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const toggleBtn = document.getElementById('toggleTags');
const btnLoginLogout = document.getElementById('btnLoginLogout');
const correctHash = "ddbd81038a50e3d2b1773d438f458362cbd7bd777d0c83a112f99cc7d0497a3a";
let renderSessionId = 0;
let activeTag = '';

let productsPerPage = 10;
let productsData = [];
let currentPage = 1;
let filteredProducts = [];

// ✅ Render 1 Product
function renderProduct(data) {
    const product = document.createElement("div");
    product.className = "product";
    if (data.key) product.dataset.key = data.key;

    product.innerHTML = `
        <a href="${data.url}" target="_blank" class="thumb">
            <img src="${data.image || 'img/no-image.png'}" alt="${data.title}" loading="lazy">
        </a>
        <div class="info">
            <div class="title">${data.title}</div>
            <div class="link"><a href="${data.url}" target="_blank">🔗 Xem sản phẩm</a></div>
        </div>
    `;
    productContainer.appendChild(product);
}

// ✅ Render products theo pagination
async function renderProductsPage(page) {
    productContainer.innerHTML = '';
    const noProductsDiv = document.getElementById('noProducts');

    const start = (page - 1) * productsPerPage;
    const end = start + productsPerPage;
    const pageItems = filteredProducts.slice(start, end);

    const currentSession = ++renderSessionId;

    // 🟡 Không có sản phẩm
    if (pageItems.length === 0) {
        noProductsDiv.classList.add('show');  // hiển thị thông báo
        paginationContainer.innerHTML = '';
        return;
    } else {
        noProductsDiv.classList.remove('show'); // ẩn thông báo khi có sản phẩm
    }

    productContainer.innerHTML = `<div class="loading">⏳ Đang tải sản phẩm...</div>`;
    await new Promise(r => setTimeout(r, 2000));
    productContainer.innerHTML = '';

    const promises = pageItems.map(async (product) => {
        if (currentSession !== renderSessionId) return;
        await fetchAndRender(product.url, product.key);
    });

    await Promise.all(promises);

    if (currentSession !== renderSessionId) return;
    renderPagination();

    const loginExpiry = localStorage.getItem('loginExpiry');
    const isLoggedIn = loginExpiry && Date.now() < Number(loginExpiry);
    if (isLoggedIn) renderAddButtons();
}

// ✅ Filter products
function filterProducts() {
    const query = normalize(searchInput.value);
    filteredProducts = productsData.filter(p => {
        const title = normalize(p.title || '');
        const url = normalize(p.url || '');
        const key = normalize(p.key || '');
        const matchTag = !activeTag || key === activeTag;
        const matchQuery = !query || title.includes(query) || url.includes(query) || key.includes(query);
        return matchTag && matchQuery;
    });
    currentPage = 1;
    renderProductsPage(currentPage);
}

// decode HTML entities
function decodeHtml(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}

// ✅ Load products từ API
async function loadProducts() {
    try {
        const res = await fetch("/api/load-products");
        if (!res.ok) throw new Error("API lỗi");

        const data = await res.json();
        const productsArray = data.products || [];

        productsData = productsArray.map(p => ({
            ...p,
            title: decodeHtml(p.title || '')
        }));

        filteredProducts = [...productsData];
        await renderProductsPage(currentPage);
    } catch (err) {
        console.error("Lỗi khi tải danh sách sản phẩm:", err);
    }
}

function resetToggleTags() {
    const toggle = document.getElementById("toggleTags");
    if (!toggle) return;

    // Luôn reset về trạng thái mặc định "Xem thêm"
    const textDiv = toggle.querySelector(".text");
    const arrow = toggle.querySelector(".arr-down");

    textDiv.textContent = "Xem thêm";
    arrow.classList.remove("open");

    // Ẩn hết các tag ẩn
    document.querySelectorAll(".tag.hidden-tag").forEach(t => {
        t.classList.remove("show-hidden");
    });
}

async function loadTags() {
    try {
        const res = await fetch("/api/load-tags");
        if (!res.ok) throw new Error("API lỗi");

        const data = await res.json();
        const tagsArray = data.tags || [];
        const customTags = JSON.parse(localStorage.getItem("customTags") || "[]");
        const allTags = [...tagsArray, ...customTags];

        const maxVisible = 1;
        let tagHtml = `<div class="tag active" data-key="">Tất cả</div>`;

        allTags.forEach((tag, index) => {
            const hiddenClass = index >= maxVisible ? "hidden-tag" : "";
            tagHtml += `<div class="tag ${hiddenClass}" data-key="${tag.key}">${tag.name}</div>`;
        });

        tagContainer.innerHTML = tagHtml;

        // gắn sự kiện click cho tags
        tagContainer.querySelectorAll(".tag").forEach(tag => {
            const key = tag.dataset.key;

            // bỏ qua "Tất cả" và "+"
            if (key !== "" && !tag.classList.contains("add-tag")) {
                const loginExpiry = localStorage.getItem("loginExpiry");
                const isLoggedIn = loginExpiry && Date.now() < Number(loginExpiry);

                if (isLoggedIn) {
                    // Thêm nút xoá nhỏ vào tag
                    const removeIcon = document.createElement("span");
                    removeIcon.className = "remove-tag";
                    removeIcon.textContent = "X";
                    removeIcon.title = "Xoá tag";
                    removeIcon.onclick = (e) => {
                        e.stopPropagation();
                        deleteTag(key, tag.textContent.replace("X", "").trim());
                    };
                    tag.appendChild(removeIcon);
                }
            }

            // Sự kiện chọn tag để lọc
            tag.addEventListener("click", () => {
                activeTag = tag.dataset.key;
                tagContainer.querySelectorAll(".tag").forEach(t => t.classList.remove("active"));
                tag.classList.add("active");
                filterProducts();
            });
        });

        // ✅ Reset lại toggle mỗi khi load xong tags
        resetToggleTags();

    } catch (err) {
        console.error("Lỗi khi tải tags từ gist:", err);
    }
}

// Hàm tạo popup mật khẩu
function createPasswordPopup() {
    const popup = document.createElement('div');
    popup.className = 'popup';
    popup.innerHTML = `
        <div class="popup-overlay"></div>
        <div class="popup-box">
            <h3>🔒 Nhập mật khẩu</h3>
            <div class="password-field">
                <input type="password" id="passwordInput" placeholder="Nhập mật khẩu..." />
                <span id="togglePassword" title="Hiện/Ẩn mật khẩu">👁️</span>
            </div>
            <div class="popup-actions">
                <button id="popupCancel">Hủy</button>
                <button id="popupOk">Xác nhận</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    const passInput = document.getElementById('passwordInput');
    const toggleBtn = document.getElementById('togglePassword');
    const okBtn = document.getElementById('popupOk');

    document.getElementById('popupCancel').onclick = () => popup.remove();
    document.querySelector('.popup-overlay').onclick = () => popup.remove();

    toggleBtn.addEventListener('click', () => {
        const isHidden = passInput.type === 'password';
        passInput.type = isHidden ? 'text' : 'password';
        toggleBtn.textContent = isHidden ? '🙈' : '👁️';
    });

    // ✅ Nhấn Enter để xác nhận
    passInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            okBtn.click();
        }
    });

    return popup;
}

// Hàm hash SHA-256
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function renderAddButtons() {
    // --- Thêm nút + cho products ---
    if (!document.querySelector('.product.add-product')) {
        const addProduct = document.createElement('div');
        addProduct.className = 'product add-product';
        addProduct.innerHTML = `<div class="add-icon">➕</div>`;
        addProduct.addEventListener('click', () => alert('Thêm sản phẩm mới!'));
        productContainer.prepend(addProduct);
    }

    // --- Thêm tag + ---
    if (!document.querySelector('.tag.add-tag')) {
        const addTag = document.createElement('div');
        addTag.className = 'tag add-tag';
        addTag.dataset.key = '';
        addTag.textContent = '+';
        addTag.addEventListener('click', showAddTagPopup);
        tagContainer.prepend(addTag);
    }
}


// Bật chế độ edit sau login
async function enableEditMode() {
    const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('loginExpiry', expiry);

    productsPerPage = 9;
    currentPage = 1;

    await loadTags();
    await loadProducts();

    renderAddButtons();

    resetToggleTags();

    btnLoginLogout.innerHTML = `<img src="img/icon/logout.png" alt="Logout" class="icon-logout">`;
    btnLoginLogout.onclick = logout;
}

async function logout() {
    localStorage.removeItem('loginExpiry');
    productsPerPage = 10;
    currentPage = 1;

    await loadTags();
    await loadProducts();

    document.querySelectorAll('.product.add-product').forEach(e => e.remove());
    document.querySelectorAll('.tag.add-tag').forEach(e => e.remove());

    resetToggleTags();

    btnLoginLogout.innerHTML = '<img src="img/icon/access.png" alt="Edit" class="icon-edit">';
    btnLoginLogout.onclick = showLoginPopup;
}

// Hiển thị popup login
function showLoginPopup() {
    const popup = createPasswordPopup();
    const okBtn = document.getElementById('popupOk');

    okBtn.onclick = async () => {
        const pass = document.getElementById('passwordInput').value;
        const hash = await hashPassword(pass);
        if (hash === correctHash) {
            popup.remove();
            enableEditMode();
        } else {
            alert('❌ Sai mật khẩu!');
        }
    };
}

// 🧩 Hiện popup thêm tag
async function showAddTagPopup() {
    const popup = document.getElementById("popupAddTag");
    popup.classList.remove("hidden");

    document.getElementById("newTagName").value = "";

    const saveBtn = document.getElementById("btnSaveTag");
    saveBtn.onclick = async () => {
        const name = document.getElementById("newTagName").value.trim();
        if (!name) {
            alert("⚠️ Vui lòng nhập tên tag!");
            return;
        }

        const key = name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "_");

        const newTag = { key, name };

        try {
            const res = await fetch("/api/save-tags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tag: newTag }),
            });

            if (!res.ok) throw new Error("API lỗi");

            alert("✅ Thêm tag thành công!");
            closePopup("popupAddTag");
            await loadTags();
        } catch (e) {
            console.error(e);
            alert("⚠️ Không thể lưu tag vào server.");
        }
    };
}

function closePopup(id) {
    const popup = document.getElementById(id);
    if (popup) popup.classList.add("hidden");
}

window.addEventListener('DOMContentLoaded', async () => {
    const loginExpiry = localStorage.getItem('loginExpiry');
    const isLoggedIn = loginExpiry && Date.now() < Number(loginExpiry);

    if (isLoggedIn) {
        btnLoginLogout.innerHTML = `<img src="img/icon/logout.png" alt="Logout" class="icon-logout">`;
        btnLoginLogout.onclick = logout;
    } else {
        btnLoginLogout.innerHTML = `<img src="img/icon/access.png" alt="Edit" class="icon-edit">`;
        btnLoginLogout.onclick = showLoginPopup;
    }

    // ✅ chỉ gắn sự kiện toggle 1 lần
    const toggleBtn = document.getElementById("toggleTags");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            const hiddenTags = document.querySelectorAll(".tag.hidden-tag");
            hiddenTags.forEach(t => t.classList.toggle("show-hidden"));

            const textDiv = toggleBtn.querySelector(".text");
            const arrow = toggleBtn.querySelector(".arr-down");

            const isExpanded = textDiv.textContent === "Xem thêm";
            textDiv.textContent = isExpanded ? "Thu gọn" : "Xem thêm";
            arrow.classList.toggle("open", isExpanded);
        });
    }

    // Load dữ liệu ban đầu
    if (isLoggedIn) {
        await enableEditMode();
    } else {
        await loadTags();
        await loadProducts();
    }
});

async function deleteTag(key, name) {
    if (!confirm(`❗Bạn có chắc muốn xoá tag "${name}" không?`)) return;

    try {
        const res = await fetch("/api/delete-tag", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key })
        });

        if (!res.ok) throw new Error("API lỗi");

        const data = await res.json();
        if (data.success) {
            alert("✅ Đã xoá tag thành công!");
            await loadTags();
        } else {
            alert("⚠️ Không thể xoá tag trên server!");
        }
    } catch (err) {
        console.error("Lỗi khi xoá tag:", err);
        alert("❌ Lỗi khi xoá tag!");
    }
}