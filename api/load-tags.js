import fetch from "node-fetch";

export default async function handler(req, res) {
  const token = process.env.GITHUB_TOKEN;
  const gistId = process.env.GIST_ID;

  if (!token || !gistId) return res.status(500).json({ error: "Token hoặc Gist ID chưa set" });

  try {
    const gistRes = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: { Authorization: `token ${token}` }
    });
    if (!gistRes.ok) throw new Error("Failed to fetch gist");

    const gistData = await gistRes.json();
    let tags = [];
    if (gistData.files["tags.json"] && gistData.files["tags.json"].content) {
      tags = JSON.parse(gistData.files["tags.json"].content).tags || [];
    }

    res.status(200).json({ tags });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load tags from gist" });
  }
}
