// /api/get-meta.js
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: 'Thiếu URL' });
  }

  // 1️⃣ Đọc tags.json
  const tagsPath = path.join(process.cwd(), 'json', 'tags.json');
  let tags = [];
  try {
    const tagsJson = fs.readFileSync(tagsPath, 'utf8');
    const tagsData = JSON.parse(tagsJson);
    tags = tagsData.tags || [];
  } catch (e) {
    console.error(e);
  }

  // 2️⃣ Lấy HTML Shopee
  let html;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      },
    });
    html = await response.text();
  } catch (e) {
    return res.status(500).json({ error: 'Không thể tải trang Shopee' });
  }

  // 3️⃣ Trích xuất meta OG
  const getMeta = (prop) => {
    const match = html.match(new RegExp(`<meta property="${prop}" content="([^"]+)"`));
    return match ? match[1] : '';
  };

  const title = getMeta('og:title');
  const desc = getMeta('og:description');
  let image = getMeta('og:image');

  if (!image) {
    const imgMatch = html.match(/<img[^>]+src="([^"]+)"[^>]*>/);
    image = imgMatch ? imgMatch[1] : 'img/no-image.png';
  }

  if (!title) return res.json({ error: 'Không thể lấy dữ liệu sản phẩm từ Shopee' });

  // 4️⃣ Dò category
  let categoryName = null;
  let categoryKey = null;
  for (const tag of tags) {
    if (title.toLowerCase().includes(tag.name.toLowerCase())) {
      categoryName = tag.name;
      categoryKey = tag.key;
      break;
    }
  }

  // ✅ Trả về JSON
  res.status(200).json({
    title,
    description: desc,
    image,
    category: categoryName,
    key: categoryKey,
    url,
  });
}
