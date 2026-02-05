import formidable from 'formidable';
import sharp from 'sharp';
import { readFile } from 'fs/promises';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    console.log('Starting upscale process...');

    // Parse form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    console.log('Form parsed successfully');

    // Get image file and scale
    const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
    let scale = parseInt(Array.isArray(fields.scale) ? fields.scale[0] : fields.scale) || 4;

    if (!imageFile) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image file uploaded' 
      });
    }

    console.log(`Processing image with scale ${scale}x`);
    console.log('File path:', imageFile.filepath || imageFile.path);

    // Read image buffer
    const filePath = imageFile.filepath || imageFile.path;
    const imageBuffer = await readFile(filePath);

    console.log('Image buffer read, size:', imageBuffer.length);

    // Get metadata
    const metadata = await sharp(imageBuffer).metadata();
    console.log('Image metadata:', metadata);

    // Smart scaling - auto adjust jika hasil bakal terlalu besar
    const maxDimension = 8192;
    const maxScaleByWidth = Math.floor(maxDimension / metadata.width);
    const maxScaleByHeight = Math.floor(maxDimension / metadata.height);
    const maxPossibleScale = Math.min(maxScaleByWidth, maxScaleByHeight);

    // Jika requested scale terlalu besar, auto adjust
    if (scale > maxPossibleScale) {
      console.log(`Auto-adjusting scale from ${scale}x to ${maxPossibleScale}x (max possible)`);
      scale = maxPossibleScale;
    }

    // Calculate new dimensions
    const newWidth = metadata.width * scale;
    const newHeight = metadata.height * scale;

    // Check max dimensions dan kasih saran
    const maxDimension = 8192; // Support modern HD images
    if (newWidth > maxDimension || newHeight > maxDimension) {
      // Hitung scale maksimal yang bisa dipakai
      const maxScaleByWidth = Math.floor(maxDimension / metadata.width);
      const maxScaleByHeight = Math.floor(maxDimension / metadata.height);
      const suggestedScale = Math.min(maxScaleByWidth, maxScaleByHeight);
      
      return res.status(400).json({
        success: false,
        message: `Hasil upscale terlalu besar! Untuk gambar ${metadata.width}x${metadata.height}, maksimal bisa ${suggestedScale}x upscale.`,
        details: {
          original: `${metadata.width}x${metadata.height}`,
          requested: `${newWidth}x${newHeight} (${scale}x)`,
          suggestedScale: suggestedScale,
          maxDimension: maxDimension
        }
      });
    }

    console.log(`Upscaling from ${metadata.width}x${metadata.height} to ${newWidth}x${newHeight}`);

    // Process image
    let sharpInstance = sharp(imageBuffer, {
      limitInputPixels: false,
    });

    // Resize dengan quality tinggi
    const upscaled = await sharpInstance
      .resize(newWidth, newHeight, {
        kernel: sharp.kernel.lanczos3,
        fit: 'fill',
      })
      .sharpen()
      .png({
        quality: 100,
        compressionLevel: 6,
      })
      .toBuffer();

    console.log('Upscale complete, output size:', upscaled.length);

    // Send response
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(upscaled);

  } catch (error) {
    console.error('Upscale error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to process image',
      error: error.toString()
    });
  }
}
