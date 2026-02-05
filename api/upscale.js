const formidable = require('formidable');
const sharp = require('sharp');
const fs = require('fs').promises;

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only POST
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    console.log('=== UPSCALE START ===');

    // Parse form
    const form = formidable({ maxFileSize: 10 * 1024 * 1024 });
    
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Form parse error:', err);
          reject(err);
        } else {
          resolve({ fields, files });
        }
      });
    });

    console.log('Form parsed OK');

    // Get files
    const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
    const scaleField = Array.isArray(fields.scale) ? fields.scale[0] : fields.scale;
    let scale = parseInt(scaleField) || 2;

    if (!imageFile) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ 
        success: false, 
        message: 'No image uploaded' 
      });
    }

    console.log('Image file:', imageFile.originalFilename);
    console.log('Scale:', scale);

    // Read image
    const filePath = imageFile.filepath || imageFile.path;
    const buffer = await fs.readFile(filePath);
    console.log('Buffer size:', buffer.length);

    // Get metadata
    const metadata = await sharp(buffer).metadata();
    console.log(`Original: ${metadata.width}x${metadata.height}`);

    // Auto-adjust scale
    const maxDim = 6144;
    const maxScale = Math.min(
      Math.floor(maxDim / metadata.width),
      Math.floor(maxDim / metadata.height)
    );

    if (scale > maxScale) {
      scale = maxScale;
      console.log(`Scale adjusted to ${scale}x`);
    }

    const newW = metadata.width * scale;
    const newH = metadata.height * scale;
    console.log(`Target: ${newW}x${newH}`);

    // Process
    const result = await sharp(buffer)
      .resize(newW, newH, {
        kernel: sharp.kernel.lanczos3,
      })
      .sharpen()
      .png({ quality: 100 })
      .toBuffer();

    console.log('Output size:', result.length);
    console.log('=== UPSCALE DONE ===');

    // Send
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(result);

  } catch (error) {
    console.error('=== ERROR ===');
    console.error(error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ 
      success: false, 
      message: error.message,
      stack: error.stack
    });
  }
};

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

    // Read image buffer
    const filePath = imageFile.filepath || imageFile.path;
    const imageBuffer = await readFile(filePath);
    console.log('Image buffer read, size:', imageBuffer.length);

    // Get metadata
    const metadata = await sharp(imageBuffer).metadata();
    console.log('Image metadata:', metadata.width, 'x', metadata.height);

    // Smart scaling - auto adjust jika hasil bakal terlalu besar
    const maxDimension = 8192;
    const maxScaleByWidth = Math.floor(maxDimension / metadata.width);
    const maxScaleByHeight = Math.floor(maxDimension / metadata.height);
    const maxPossibleScale = Math.min(maxScaleByWidth, maxScaleByHeight);

    // Auto adjust scale jika terlalu besar
    if (scale > maxPossibleScale) {
      console.log(`Auto-adjusting scale from ${scale}x to ${maxPossibleScale}x`);
      scale = maxPossibleScale;
    }

    // Calculate new dimensions
    const newWidth = metadata.width * scale;
    const newHeight = metadata.height * scale;

    console.log(`Upscaling to ${newWidth}x${newHeight}`);

    // Process image
    const upscaled = await sharp(imageBuffer, {
      limitInputPixels: false,
    })
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
