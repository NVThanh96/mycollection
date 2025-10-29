export default async function handler(req, res) {
    if (req.method !== "POST")
        return res.status(405).json({ error: "Method not allowed" });

    const { url, tag, category } = req.body;

    if (!url || !tag || !category)
        return res.status(400).json({ error: "Missing product data" });

    const token = process.env.GITHUB_TOKEN;
    const gistId = process.env.GIST_ID;

    if (!token || !gistId)
        return res.status(500).json({ error: "GITHUB_TOKEN or GIST_ID not set" });

    try {
        // 🧠 1️⃣ Lấy Gist hiện tại
        const gistRes = await fetch(`https://api.github.com/gists/${gistId}`, {
            headers: { Authorization: `token ${token}` },
        });

        const gistText = await gistRes.text();
        if (!gistRes.ok)
            throw new Error(`Failed to fetch gist: ${gistText}`);

        const gistData = JSON.parse(gistText);

        // 🧾 2️⃣ Tên file theo category (VD: sports-wear.json)
        const fileName = `${category}.json`;

        // 🧩 3️⃣ Đọc nội dung file hiện tại nếu có
        let existingProducts = [];
        if (gistData.files[fileName]?.content) {
            try {
                existingProducts = JSON.parse(gistData.files[fileName].content);
            } catch (e) {
                console.warn(`⚠️ File ${fileName} không phải JSON hợp lệ, tạo mới.`);
            }
        }

        // 🚀 4️⃣ Fetch metadata từ Shopee (tự động lấy title, description, image)
        const meta = await fetchMeta(url);

        // 🔑 5️⃣ Tạo object sản phẩm mới
        const newProduct = {
            key: tag,
            url,
            ...meta,
        };

        existingProducts.push(newProduct);

        // 💾 6️⃣ Cập nhật gist
        const updateRes = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: "PATCH",
            headers: {
                Authorization: `token ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                files: {
                    [fileName]: {
                        content: JSON.stringify(existingProducts, null, 2),
                    },
                },
            }),
        });

        const updateText = await updateRes.text();
        if (!updateRes.ok)
            throw new Error(`Failed to update gist: ${updateText}`);

        return res.status(200).json({
            success: true,
            file: fileName,
            products: existingProducts,
        });
    } catch (err) {
        console.error("❌ API error:", err);
        return res.status(500).json({ error: "Failed to update gist" });
    }
}

/** 🔍 Hàm lấy metadata từ Shopee URL */
async function fetchMeta(url) {
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent":
                    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
            },
        });
        const html = await res.text();

        const getMeta = (prop) => {
            const regex = new RegExp(`<meta property="${prop}" content="([^"]+)"`);
            const match = html.match(regex);
            return match ? match[1] : "";
        };

        return {
            title: getMeta("og:title") || "Không xác định",
            description: getMeta("og:description") || "",
            image: getMeta("og:image") || "",
        };
    } catch (e) {
        console.error("⚠️ Error fetching meta:", e);
        return { title: "Lỗi tải", description: "", image: "" };
    }
}
