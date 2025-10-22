// normalize cho search
function normalize(str) {
    return str
        .replace(/[–—−]/g, '-')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

// search
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    filterProducts();
});
