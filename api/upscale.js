const sharp = require('sharp');
const formidable = require('formidable');

// Disable body parser untuk handle multipart form data
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Main handler untuk upscale API
 */
export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed. Use POST.' 
    });
  }

  try {
    // Parse multipart form data
    const { fields, files } = await parseForm(req);
    
    // Validate input
    const validation = validateInput(fields, files);
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false, 
        message: validation.message 
      });
    }

    const imageFile = files.image;
    const scale = parseInt(fields.scale || '4');

    // Read image buffer
    const imageBuffer = await readFileBuffer(imageFile);

    // Get original image metadata
    const metadata = await sharp(imageBuffer).metadata();
    
    // Validate image dimensions
    const maxDimension = 4096; // Max dimension after upscale
    const newWidth = metadata.width * scale;
    const newHeight = metadata.height * scale;
    
    if (newWidth > maxDimension || newHeight > maxDimension) {
      return res.status(400).json({
        success: false,
        message: `Hasil upscale terlalu besar! Max ${maxDimension}x${maxDimension}px. Coba dengan skala lebih kecil.`,
        details: {
          original: `${metadata.width}x${metadata.height}`,
          upscaled: `${newWidth}x${newHeight}`
        }
      });
    }

    // Process image dengan sharp
    const upscaledBuffer = await processImageUpscale(imageBuffer, scale, metadata);

    // Set response headers
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="upscaled_${scale}x.png"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // Send processed image
    return res.status(200).send(upscaledBuffer);

  } catch (error) {
    console.error('Upscale Error:', error);
    
    return res.status(500).json({ 
      success: false, 
      message: 'Gagal memproses gambar. Silakan coba lagi.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Parse multipart form data
 */
function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
      multiples: false
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }

      // Handle both formidable v2 and v3 formats
      const normalizedFields = {};
      const normalizedFiles = {};

      // Normalize fields
      for (const key in fields) {
        normalizedFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
      }

      // Normalize files
      for (const key in files) {
        normalizedFiles[key] = Array.isArray(files[key]) ? files[key][0] : files[key];
      }

      resolve({ fields: normalizedFields, files: normalizedFiles });
    });
  });
}

/**
 * Validate input data
 */
function validateInput(fields, files) {
  // Check if image exists
  if (!files.image) {
    return { 
      valid: false, 
      message: 'Gambar tidak ditemukan. Upload gambar terlebih dahulu.' 
    };
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const fileType = files.image.mimetype || files.image.type;
  
  if (!allowedTypes.includes(fileType)) {
    return { 
      valid: false, 
      message: 'Format file tidak didukung. Gunakan JPG, PNG, atau WebP.' 
    };
  }

  // Validate scale
  const scale = parseInt(fields.scale || '4');
  if (![2, 4].includes(scale)) {
    return { 
      valid: false, 
      message: 'Skala harus 2 atau 4.' 
    };
  }

  return { valid: true };
}

/**
 * Read file buffer from uploaded file
 */
async function readFileBuffer(file) {
  const fs = require('fs').promises;
  return await fs.readFile(file.filepath);
}

/**
 * Process image upscaling dengan algoritma terbaik
 */
async function processImageUpscale(imageBuffer, scale, metadata) {
  const newWidth = metadata.width * scale;
  const newHeight = metadata.height * scale;

  // Konfigurasi berdasarkan tipe gambar
  let sharpInstance = sharp(imageBuffer);

  // Jika gambar memiliki alpha channel, preserve it
  if (metadata.hasAlpha) {
    sharpInstance = sharpInstance.ensureAlpha();
  }

  // Upscale dengan algoritma terbaik
  const upscaled = await sharpInstance
    .resize(newWidth, newHeight, {
      kernel: sharp.kernel.lanczos3, // Algoritma terbaik untuk upscaling
      fit: 'fill'
    })
    .sharpen({
      sigma: scale === 4 ? 1.5 : 1.0, // Lebih tajam untuk 4x
      m1: 1.0,
      m2: 0.5,
      x1: 3,
      y2: 15,
      y3: 15
    })
    .modulate({
      brightness: 1.02, // Sedikit lebih terang
      saturation: 1.05  // Sedikit lebih vivid
    })
    .png({
      quality: 100,
      compressionLevel: 6, // Balance antara size dan quality
      adaptiveFiltering: true,
      palette: false
    })
    .toBuffer();

  return upscaled;
}
