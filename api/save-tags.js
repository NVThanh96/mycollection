export default async function handler(req, res) {
    if (req.method !== "POST")
        return res.status(405).json({ error: "Method not allowed" });

    const { tag } = req.body;
    if (!tag?.key || !tag?.name)
        return res.status(400).json({ error: "Missing tag data" });

    const token = process.env.GITHUB_TOKEN;
    const gistId = process.env.GIST_ID;

    if (!token || !gistId)
        return res.status(500).json({ error: "GITHUB_TOKEN or GIST_ID not set" });

    try {
        // Lấy gist hiện tại
        const gistRes = await fetch(`https://api.github.com/gists/${gistId}`, {
            headers: { Authorization: `token ${token}` },
        });

        const gistText = await gistRes.text();
        console.log("Gist fetch response:", gistText); // <<==== xem chi tiết

        if (!gistRes.ok) throw new Error(`Failed to fetch gist: ${gistText}`);

        const gistData = JSON.parse(gistText);

        let existingTags = { tags: [] };
        if (gistData.files["tags.json"]?.content) {
            existingTags = JSON.parse(gistData.files["tags.json"].content);
        }

        existingTags.tags.push(tag);

        // Cập nhật gist
        const updateRes = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: "PATCH",
            headers: {
                Authorization: `token ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                files: { "tags.json": { content: JSON.stringify(existingTags, null, 2) } },
            }),
        });

        const updateText = await updateRes.text();
        console.log("Gist update response:", updateText); // xem chi tiết lỗi
        if (!updateRes.ok) throw new Error(`Failed to update gist: ${updateText}`);

        res.status(200).json({ success: true, tags: existingTags.tags });
    } catch (err) {
        console.error("API error:", err);
        res.status(500).json({ error: "Failed to update gist" });
    }
}
