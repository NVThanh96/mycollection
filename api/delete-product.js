export default async function handler(req, res) {
    if (req.method !== "POST")
        return res.status(405).json({ error: "Method not allowed" });

    const { url, category } = req.body;
    if (!url || !category)
        return res.status(400).json({ error: "Missing url or category" });

    const token = process.env.GITHUB_TOKEN;
    const gistId = process.env.GIST_ID;

    if (!token || !gistId)
        return res.status(500).json({ error: "Missing GitHub credentials" });

    try {
        // 🔹 Lấy nội dung Gist hiện tại
        const gistRes = await fetch(`https://api.github.com/gists/${gistId}`, {
            headers: { Authorization: `token ${token}` },
        });

        if (!gistRes.ok) {
            const msg = await gistRes.text();
            throw new Error(`Failed to fetch gist: ${msg}`);
        }

        const gistData = await gistRes.json();
        const fileName = `${category}.json`;

        let products = [];
        if (gistData.files[fileName]?.content) {
            products = JSON.parse(gistData.files[fileName].content);
        } 

        // 🔹 Xoá sản phẩm theo URL
        const before = products.length;
        const newProducts = products.filter(p => p.url !== url);

        if (newProducts.length === before) {
            return res.status(404).json({ error: "Product not found" });
        }

        // 🔹 Cập nhật lại Gist
        const updateRes = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: "PATCH",
            headers: {
                Authorization: `token ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                files: {
                    [fileName]: {
                        content: JSON.stringify(newProducts, null, 2),
                    },
                },
            }),
        });

        if (!updateRes.ok) {
            const errText = await updateRes.text();
            throw new Error(`Failed to update gist: ${errText}`);
        }

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("Delete error:", err);
        return res.status(500).json({ error: "Failed to delete product" });
    }
}
