import fetch from "node-fetch";

export default async function handler(req, res) {
  const token = process.env.GITHUB_TOKEN;
  const gistId = process.env.GIST_ID;

  if (!token || !gistId) {
    return res.status(500).json({ error: "Token hoặc Gist ID chưa set" });
  }

  try {
    const gistRes = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: { Authorization: `token ${token}` },
    });

    if (!gistRes.ok) throw new Error("Failed to fetch gist");

    const gistData = await gistRes.json();
    let products = [];

    // ✅ Đọc file products.json trong Gist (mảng JSON trực tiếp)
    if (gistData.files["products.json"] && gistData.files["products.json"].content) {
      const content = gistData.files["products.json"].content.trim();
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          products = parsed;
        } else if (parsed.products) {
          // fallback nếu sau này có cấu trúc {"products": [...]}
          products = parsed.products;
        }
      } catch (jsonErr) {
        console.error("Lỗi parse JSON:", jsonErr);
      }
    }

    res.status(200).json({ products });
  } catch (err) {
    console.error("❌ Lỗi khi tải sản phẩm từ gist:", err);
    res.status(500).json({ error: "Failed to load products from gist" });
  }
}
