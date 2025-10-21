import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const productsPath = path.join(process.cwd(), 'json', 'products.json');

async function fetchMeta(url) {
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' }
        });
        const html = await res.text();

        const getMeta = prop => {
            const match = html.match(new RegExp(`<meta property="${prop}" content="([^"]+)"`));
            return match ? match[1] : '';
        };

        const title = getMeta('og:title') || 'Không xác định';
        const description = getMeta('og:description') || '';
        const image = getMeta('og:image') || '';

        return { title, description, image };
    } catch (e) {
        console.error('Error fetching', url, e);
        return { title: 'Lỗi tải', description: '', image: '' };
    }
}

async function main() {
    const data = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    const products = data.products;

    for (let i = 0; i < products.length; i++) {
        const meta = await fetchMeta(products[i].url);
        products[i] = { ...products[i], ...meta };
        console.log(`Đã fetch: ${products[i].title}`);
    }

    fs.writeFileSync(productsPath, JSON.stringify({ products }, null, 2), 'utf8');
    console.log('✅ Đã preload tất cả sản phẩm vào products.json');
}

main();
