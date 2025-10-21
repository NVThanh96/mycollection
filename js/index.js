const tagContainer = document.getElementById('tags');
const productContainer = document.getElementById('products');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();

    function normalizeText(str) {
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

    const query = normalizeText(searchInput.value.trim());

    document.querySelectorAll('.product').forEach(product => {
        const title = normalizeText(product.querySelector('.title').textContent);
        const url = normalizeText(product.querySelector('a.thumb').href);
        const category = normalizeText(product.dataset.category || '');
        const key = normalizeText(product.dataset.key || '');

        if (!query || title.includes(query) || url.includes(query) || category.includes(query) || key.includes(query)) {
            product.style.display = '';
        } else {
            product.style.display = 'none';
        }
    });
});

// ✅ Render 1 sản phẩm
function renderProduct(data) {
    const product = document.createElement("div");
    product.className = "product";
    if (data.key) product.dataset.key = data.key;

    product.innerHTML = `
        <a href="${data.url}" target="_blank" class="thumb">
            <img src="${data.image || 'img/no-image.png'}" alt="${data.title}">
        </a>
        <div class="info">
            <div class="title">${data.title}</div>
            <div class="link"><a href="${data.url}" target="_blank">🔗 Xem sản phẩm</a></div>
        </div>
        `;
    productContainer.appendChild(product);
}

// ✅ Fetch meta Shopee
async function fetchAndRender(url, key = '') {
    try {
        const res = await fetch(`get-meta.php?url=${encodeURIComponent(url)}`);
        const data = await res.json();

        if (data.error) {
            const iframe = document.createElement("iframe");
            iframe.src = url;
            iframe.style.display = "none";
            document.body.appendChild(iframe);

            iframe.onload = () => {
                const title = iframe.contentDocument.title || "Không tìm thấy tiêu đề";
                renderProduct({ title, url, image: "img/no-image.png", key });
                document.body.removeChild(iframe);
            };
            return;
        }

        renderProduct({ ...data, key });
    } catch (e) {
        console.error(e);
    }
}

// ✅ Load products từ JSON
async function loadProducts() {
    try {
        const res = await fetch("json/products.json");
        const data = await res.json();

        for (const product of data.products) {
            await fetchAndRender(product.url, product.key);
        }
    } catch (err) {
        console.error("Lỗi khi tải danh sách sản phẩm:", err);
    }
}

// ✅ Filter sản phẩm theo key
function filterProductsByKey(key) {
    document.querySelectorAll('.product').forEach(product => {
        product.style.display = (!key || product.dataset.key === key) ? '' : 'none';
    });
}

// ✅ Load tags và gán sự kiện filter
async function loadTags() {
    try {
        const res = await fetch('json/tags.json');
        const data = await res.json();

        // Thêm tag "Tất cả"
        const allTag = `<div class="tag active" data-key="">Tất cả</div>`;
        tagContainer.innerHTML = allTag + data.tags
            .map(tag => `<div class="tag" data-key="${tag.key}">${tag.name}</div>`)
            .join('');

        // Gán sự kiện click cho tất cả tag
        tagContainer.querySelectorAll('.tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const key = tag.dataset.key;
                filterProductsByKey(key);

                // highlight tag
                tagContainer.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
                tag.classList.add('active');
            });
        });

    } catch (err) {
        console.error('Lỗi khi tải tags:', err);
    }
}

// 🚀 Khởi chạy
window.addEventListener('DOMContentLoaded', async () => {
    await loadTags();
    await loadProducts();
});