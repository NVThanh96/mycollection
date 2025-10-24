import fetch from "node-fetch";

export default async function handler(req, res) {
  const token = process.env.GITHUB_TOKEN;
  const gistId = process.env.GIST_ID;
  const file = req.query.file; // ✅ đọc từ query

  if (!token || !gistId) {
    return res.status(500).json({ error: "Token hoặc Gist ID chưa set" });
  }

  if (!file) {
    return res.status(400).json({ error: "file query bắt buộc" });
  }

  try {
    const gistRes = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: { Authorization: `token ${token}` },
    });

    if (!gistRes.ok) throw new Error("Failed to fetch gist");

    const gistData = await gistRes.json();
    let products = [];

    // ✅ Đọc file theo query
    const fileName = `${file}.json`;
    if (gistData.files[fileName] && gistData.files[fileName].content) {
      const content = gistData.files[fileName].content.trim();
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          products = parsed;
        } else if (parsed.products) {
          products = parsed.products;
        }
      } catch (jsonErr) {
        console.error("Lỗi parse JSON:", jsonErr);
      }
    } else {
      return res.status(404).json({ error: `File ${fileName} không tồn tại trong gist` });
    }

    res.status(200).json({ products });
  } catch (err) {
    console.error("❌ Lỗi khi tải sản phẩm từ gist:", err);
    res.status(500).json({ error: "Failed to load products from gist" });
  }
}
