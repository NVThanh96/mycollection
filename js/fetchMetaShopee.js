// ✅ Fetch meta Shopee
async function fetchAndRender(url, key = '') {
    try {
        const res = await fetch(`/api/get-meta?url=${encodeURIComponent(url)}`);
        const data = await res.json();

        if (data.error) {
            renderProduct({ title: "Không tìm thấy tiêu đề", url, image: "img/no-image.png", key });
            return;
        }
        renderProduct({ ...data, key });
    } catch (e) {
        console.error(e);
    }
}