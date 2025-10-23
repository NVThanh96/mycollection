import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { key } = req.body;
  const token = process.env.GITHUB_TOKEN;
  const gistId = process.env.GIST_ID;

  if (!token || !gistId || !key) {
    return res.status(400).json({ error: "Thiếu dữ liệu" });
  }

  try {
    // Lấy nội dung gist
    const gistRes = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: { Authorization: `token ${token}` },
    });
    const gistData = await gistRes.json();

    const file = gistData.files["tags.json"];
    if (!file) throw new Error("Không tìm thấy file tags.json trong gist");

    const current = JSON.parse(file.content);
    const tags = Array.isArray(current.tags) ? current.tags : current;
    const newTags = tags.filter(t => t.key !== key);

    const updatedContent = JSON.stringify({ tags: newTags }, null, 2);

    // Cập nhật gist
    const updateRes = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "PATCH",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        files: {
          "tags.json": { content: updatedContent }
        }
      })
    });

    if (!updateRes.ok) throw new Error("Không thể cập nhật gist");

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Lỗi xoá tag:", err);
    res.status(500).json({ error: "Không thể xoá tag" });
  }
}
