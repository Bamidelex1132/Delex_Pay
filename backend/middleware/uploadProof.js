// middleware/uploadProof.js
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// 1️⃣ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2️⃣ Configure Multer Storage with Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'deposit_proofs', // Folder in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    public_id: (req, file) => {
      return `${Date.now()}-${file.originalname.split('.')[0]}`;
    }
  }
});

// 3️⃣ Create Multer upload middleware
const uploadProof = multer({ storage });

module.exports = uploadProof;
