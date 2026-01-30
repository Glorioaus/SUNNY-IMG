const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Get list of images
app.get('/api/images', (req, res) => {
    const imagesDir = path.join(__dirname, 'public', 'images');

    fs.readdir(imagesDir, (err, files) => {
        if (err) {
            console.error('Error reading images directory:', err);
            return res.status(500).json({ error: 'Failed to retrieve images' });
        }

        // Filter for image files (jpg, jpeg, png, etc.)
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
        });

        // Construct full URLs
        // Note: Assuming server runs on localhost:3000 for now. 
        // In production, this might need dynamic host detection.
        const imageUrls = imageFiles.map(file => {
            return {
                id: file,
                url: `http://localhost:${PORT}/images/${file}`
            };
        });

        // Sort naturally (1.jpg, 2.jpg... instead of 1.jpg, 10.jpg...)
        imageUrls.sort((a, b) => {
            return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
        });

        res.json({
            count: imageUrls.length,
            images: imageUrls
        });
    });
});

app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
});