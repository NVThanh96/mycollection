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

let currentCategory = 'sports-wear';
let productsPerPage = 10;
let productsData = [];
let currentPage = 1;
let filteredProducts = [];

// ✅ Render 1 Product
function renderProduct(data) {
    const product = document.createElement("div");
    product.className = "product";
    if (data.url) product.dataset.url = data.url;

    // ✅ Kiểm tra login
    const loginExpiry = localStorage.getItem('loginExpiry');
    const isLoggedIn = loginExpiry && Date.now() < Number(loginExpiry);

    product.innerHTML = `
        ${isLoggedIn && data.url
            ? `<span class="remove-product" title="Xoá sản phẩm" data-url="${data.url}">
                 <i class="fa fa-trash"></i>
               </span>`
            : ''
        }
        <a href="${data.url}" target="_blank" class="thumb">
            <img src="${data.image || 'img/no-image.png'}" alt="${data.title || ''}" loading="lazy">
        </a>
        <div class="info">
            <div class="title">${data.title || 'Không có tiêu đề'}</div>
            <div class="link"><a href="${data.url}" target="_blank">🔗 Xem sản phẩm</a></div>
        </div>
    `;

    // ✅ Gắn event xoá
    const removeBtn = product.querySelector('.remove-product');
    if (removeBtn) {
        removeBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const url = e.target.closest('.remove-product').dataset.url;
            console.log('Xoá sản phẩm URL:', url);

            if (!confirm(`Bạn có chắc muốn xoá sản phẩm có URL:\n${url}?`)) return;

            await deleteProductByUrl(url);
        });
    }

    productContainer.appendChild(product);
}

async function deleteProductByUrl(url) {
    const res = await fetch('/api/delete-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, category: currentCategory })
    });

    if (!res.ok) {
        alert('⚠️ Lỗi khi xoá sản phẩm!');
        return;
    }

    const data = await res.json();
    alert('✅ Đã xoá sản phẩm thành công!');
    await loadProducts(currentCategory);
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
        noProductsDiv.classList.add('show');
        paginationContainer.innerHTML = '';

        // 🔹 Thêm nút + khi không có sản phẩm
        const loginExpiry = localStorage.getItem('loginExpiry');
        const isLoggedIn = loginExpiry && Date.now() < Number(loginExpiry);
        if (isLoggedIn) renderAddButtons();

        return;
    } else {
        noProductsDiv.classList.remove('show');
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
async function loadProducts(currentCategory) {
  try {
    const res = await fetch(`/api/load-products?file=${currentCategory}`);
    if (!res.ok) throw new Error("API lỗi");

    const data = await res.json(); // data là object { products: [...] }
    const productsArray = data.products || []; // ✅ lấy đúng mảng

    productsData = productsArray.map(p => ({ ...p, title: decodeHtml(p.title || '') }));
    filteredProducts = [...productsData];
    renderProductsPage(currentPage);
  } catch (err) {
    console.error("Lỗi khi tải products:", err);
  }
}

function resetToggleTags() {
    const toggle = document.getElementById("toggleTags");
    if (!toggle) return;

    const textDiv = toggle.querySelector(".text");
    const arrow = toggle.querySelector(".arr-down");

    textDiv.textContent = "Xem thêm";
    arrow.classList.remove("open");

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

        const filteredTags = tagsArray.filter(tag => tag.file === currentCategory);

        const customTags = JSON.parse(localStorage.getItem("customTags") || "[]")
            .filter(tag => tag.file === currentCategory);

        const allTags = [...filteredTags, ...customTags];
        const maxVisible = 1;

        // Nếu không có tag nào => ẩn hoàn toàn
        if (allTags.length === 0) {
            tagContainer.innerHTML = "";
            const toggle = document.getElementById("toggleTags");
            if (toggle) toggle.style.display = "none";
            return;
        }

        // ✅ Luôn bắt đầu bằng tag “Tất cả”
        let tagHtml = `<div class="tag" data-key="">Tất cả</div>`;

        if (allTags.length <= maxVisible) {
            // Hiển thị toàn bộ tag nếu <= maxVisible
            allTags.forEach(tag => {
                tagHtml += `<div class="tag" data-key="${tag.key}">${tag.name}</div>`;
            });

            const toggle = document.getElementById("toggleTags");
            if (toggle) toggle.style.display = "none";
        } else {
            // Có nhiều hơn maxVisible → ẩn bớt
            allTags.forEach((tag, index) => {
                const hiddenClass = index >= maxVisible ? "hidden-tag" : "";
                tagHtml += `<div class="tag ${hiddenClass}" data-key="${tag.key}">${tag.name}</div>`;
            });

            const toggle = document.getElementById("toggleTags");
            if (toggle) toggle.style.display = "flex";
        }

        tagContainer.innerHTML = tagHtml;

        // ✅ Reset lại chỉ còn 1 tag active: “Tất cả”
        tagContainer.querySelectorAll(".tag").forEach(t => t.classList.remove("active"));
        const allTag = tagContainer.querySelector('.tag[data-key=""]');
        if (allTag) {
            allTag.classList.add("active");
        }
        activeTag = '';

        // --- Gắn sự kiện click cho tag ---
        tagContainer.querySelectorAll(".tag").forEach(tag => {
            const key = tag.dataset.key;

            if (key !== "" && !tag.classList.contains("add-tag")) {
                const loginExpiry = localStorage.getItem("loginExpiry");
                const isLoggedIn = loginExpiry && Date.now() < Number(loginExpiry);

                if (isLoggedIn) {
                    const removeIcon = document.createElement("span");
                    removeIcon.className = "remove-tag";
                    removeIcon.textContent = "X";
                    removeIcon.title = "Xoá tag";
                    removeIcon.onclick = (e) => {
                        e.stopPropagation();
                        const displayName = tag.textContent.replace("X", "").trim();
                        deleteTag(key, displayName);
                    };
                    tag.appendChild(removeIcon);
                }
            }

            tag.addEventListener("click", () => {
                tagContainer.querySelectorAll(".tag").forEach(t => t.classList.remove("active"));
                tag.classList.add("active");
                activeTag = tag.dataset.key;
                filterProducts();
            });
        });

        resetToggleTags();
    } catch (err) {
        console.error("Lỗi khi tải tags:", err);
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
            <div class="popup-buttons">
                <button id="popupOk">Xác nhận</button>
                <button id="popupCancel">Hủy</button>
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

function showAddProductPopup() {
    // --- Tạo popup ---
    const popup = document.createElement('div');
    popup.className = 'popup';
    popup.innerHTML = `
        <div class="popup-overlay"></div>
        <div class="popup-box-add-product">
            <h3>Add New Product</h3>
            <div class="group-input">
                <label>Tag:</label>
                <select id="productCategorySelect"></select>
            </div>
            <div class="group-input">
                <label>URL:</label>
                <input type="text" id="productUrlInput" placeholder="https://shopee.vn/..." />
            </div>
            <div class="popup-buttons">
                <button id="popupAdd">Thêm sản phẩm</button>
                <button id="popupCancel">Hủy</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    const overlay = popup.querySelector('.popup-overlay');
    const cancelBtn = document.getElementById('popupCancel');
    const addBtn = document.getElementById('popupAdd');
    const selectEl = document.getElementById('productCategorySelect');
    const urlInput = document.getElementById('productUrlInput');

    // --- Đóng popup ---
    overlay.onclick = cancelBtn.onclick = () => popup.remove();

    // --- Load danh sách tag trong category hiện tại ---
    const tagElements = document.querySelectorAll('#tags .tag');
    selectEl.innerHTML = ''; // reset
    
    let hasSelected = false;

    tagElements.forEach(tagEl => {
        const key = tagEl.dataset.key;
        const name = tagEl.textContent.replace('X', '').trim();
        if (key) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = name;

            // ✅ Nếu đang filter đúng tag này thì auto select
            if (key === activeTag) {
                opt.selected = true;
                hasSelected = true;
            }

            selectEl.appendChild(opt);
        }
    });

    // ✅ Nếu chưa có tag nào được chọn (ví dụ đang ở "Tất cả") → chọn option đầu tiên
    if (!hasSelected && selectEl.options.length > 0) {
        selectEl.options[0].selected = true;
    }

    // --- Click thêm sản phẩm ---
    addBtn.onclick = async () => {
        const tagKey = selectEl.value;
        const url = urlInput.value.trim();
        if (!url) return alert('⚠️ Vui lòng nhập URL sản phẩm!');
        if (!tagKey) return alert('⚠️ Vui lòng chọn tag!');

        try {
            // Gọi API để lưu sản phẩm mới vào file JSON tương ứng tag
            const res = await fetch('/api/add-product', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, tag: tagKey, category: currentCategory })
            });

            if (!res.ok) throw new Error('API lỗi');

            alert('✅ Thêm sản phẩm thành công!');
            popup.remove();

            // Reload sản phẩm
            await loadProducts(currentCategory);
        } catch (err) {
            console.error(err);
            alert('❌ Không thể thêm sản phẩm!');
        }
    };
}

function renderAddButtons() {
    // --- Thêm nút + cho products ---
    if (!document.querySelector('.product.add-product')) {
        const addProduct = document.createElement('div');
        addProduct.className = 'product add-product';
        addProduct.innerHTML = `<div class="add-icon">➕</div>`;
        addProduct.addEventListener('click', showAddProductPopup);
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
    await loadProducts(currentCategory);

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
    await loadProducts(currentCategory);

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

    // ✅ Lấy tab đang active hiện tại
    const activeTab = document.querySelector('.dropdown-content a.active');
    const currentFile = activeTab ? activeTab.dataset.tab : currentCategory;
    console.log(currentFile);

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

        const newTag = { key, name, file: currentFile };

        try {
            const res = await fetch("/api/save-tags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tag: newTag }),
            });

            if (!res.ok) throw new Error("API lỗi");

            alert(`✅ Thêm tag cho chủ đề "${currentFile}" thành công!`);
            closePopup("popupAddTag");
            await loadTags();
            renderAddButtons();
            await loadProducts(currentCategory);
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

document.addEventListener("DOMContentLoaded", () => {
    const dropdown = document.querySelector(".dropdown");
    const dropbtn = dropdown.querySelector(".dropbtn");
    const dropdownLinks = dropdown.querySelectorAll(".dropdown-content a");

    // --- Hàm load dữ liệu theo chủ đề ---
    function loadCatalog(category) {
        currentCategory = category;
        activeTag = '';
        loadTags();
        loadProducts(currentCategory);
    }

    // --- Gắn sự kiện click cho từng item ---
    dropdownLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();

            // ✅ Xóa tất cả active trước khi set mới
            dropdownLinks.forEach(l => l.classList.remove("active"));

            // ✅ Chỉ set active cho link được click
            link.classList.add("active");
            dropdown.classList.remove("show");

            const selected = link.dataset.tab;
            dropbtn.textContent = link.textContent;

            loadCatalog(selected);
        });
    });

    // --- Set mặc định chỉ 1 tab active ---
    const defaultCategory = "sports-wear";
    dropdownLinks.forEach(l => l.classList.remove("active"));
    const defaultLink = document.querySelector(`[data-tab="${defaultCategory}"]`);
    if (defaultLink) {
        defaultLink.classList.add("active");
        dropbtn.textContent = defaultLink.textContent;
        loadCatalog(defaultCategory);
    }

    // --- Toggle mở dropdown ---
    dropbtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("show");
    });

    // --- Đóng dropdown khi click ra ngoài ---
    document.addEventListener("click", () => {
        dropdown.classList.remove("show");
    });
});


window.addEventListener('DOMContentLoaded', async () => {
    const loginExpiry = localStorage.getItem('loginExpiry');
    const isLoggedIn = loginExpiry && Date.now() < Number(loginExpiry);

    if (isLoggedIn) {
        btnLoginLogout.innerHTML = `<img src="img/icon/logout.png" alt="Logout" class="icon-logout">`;
        btnLoginLogout.onclick = logout;
        await enableEditMode();
    } else {
        btnLoginLogout.innerHTML = `<img src="img/icon/access.png" alt="Edit" class="icon-edit">`;
        btnLoginLogout.onclick = showLoginPopup;
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
            renderAddButtons();
        } else {
            alert("⚠️ Không thể xoá tag trên server!");
        }
    } catch (err) {
        console.error("Lỗi khi xoá tag:", err);
        alert("❌ Lỗi khi xoá tag!");
    }
}

toggleBtn.addEventListener('click', () => {
    document.querySelectorAll('.tag.hidden-tag').forEach(tag => {
        tag.classList.toggle('show-hidden');
    });
    toggleBtn.querySelector('.arr-down').classList.toggle('open');
    const textDiv = toggleBtn.querySelector('.text');
    textDiv.textContent = textDiv.textContent === "Xem thêm" ? "Thu gọn" : "Xem thêm";
});
