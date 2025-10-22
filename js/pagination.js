// ✅ Render pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    let html = '';

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    if (currentPage > 1) html += `<button onclick="goToPage(${currentPage - 1})">« Trước</button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button onclick="goToPage(${i})" ${i === currentPage ? 'style="font-weight:bold"' : ''}>${i}</button>`;
    }
    if (currentPage < totalPages) html += `<button onclick="goToPage(${currentPage + 1})">Sau »</button>`;

    paginationContainer.innerHTML = html;
}

// ✅ Chuyển trang (pagination)
function goToPage(page) {
    currentPage = page;
    renderProductsPage(page);
}