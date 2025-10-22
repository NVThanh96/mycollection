const tagContainer = document.getElementById('tags');
const productContainer = document.getElementById('products');
const paginationContainer = document.getElementById('pagination');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
let renderSessionId = 0;
let activeTag = '';

const productsPerPage = 10;
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

// ✅ Load products từ JSON
async function loadProducts() {
    try {
        const res = await fetch("json/products.json");
        const data = await res.json();
        productsData = (data.products || []).map(p => ({
            ...p,
            title: decodeHtml(p.title || '')
        }));
        filteredProducts = [...productsData];
        await renderProductsPage(currentPage);
    } catch (err) {
        console.error("Lỗi khi tải danh sách sản phẩm:", err);
    }
}

// ✅ Load tags
async function loadTags() {
    try {
        const res = await fetch('json/tags.json');
        const data = await res.json();
        const tagsArray = data.tags || [];
        const maxVisible = 1;

        let tagHtml = `<div class="tag active" data-key="">Tất cả</div>`;
        tagsArray.forEach((tag, index) => {
            const hiddenClass = index >= maxVisible ? 'hidden-tag' : '';
            tagHtml += `<div class="tag ${hiddenClass}" data-key="${tag.key}">${tag.name}</div>`;
        });

        tagContainer.innerHTML = tagHtml;

        tagContainer.querySelectorAll('.tag').forEach(tag => {
            tag.addEventListener('click', () => {
                activeTag = tag.dataset.key;
                tagContainer.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
                tag.classList.add('active');
                filterProducts();
            });
        });

        const toggleBtn = document.getElementById('toggleTags');
        toggleBtn?.addEventListener('click', () => {
            tagContainer.querySelectorAll('.tag.hidden-tag').forEach(t => t.classList.toggle('show-hidden'));
            const textDiv = toggleBtn.querySelector('.text');
            if (textDiv.textContent === 'Xem thêm') {
                textDiv.textContent = 'Thu gọn';
                toggleBtn.querySelector('.arr-down').classList.add('open');
            } else {
                textDiv.textContent = 'Xem thêm';
                toggleBtn.querySelector('.arr-down').classList.remove('open');
            }
        });
    } catch (err) {
        console.error('Lỗi khi tải tags:', err);
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    await loadTags();
    await loadProducts();
});