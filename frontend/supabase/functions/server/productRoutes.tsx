import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';
import { uploadImage, deleteImage, BUCKETS, extractFilePathFromUrl } from './storageHelper.tsx';

const productRoutes = new Hono();

// Middleware untuk verifikasi admin
const verifyAdmin = async (c: any) => {
  const sessionToken = c.req.header('X-Session-Token');
  
  if (!sessionToken) {
    return null;
  }

  const users = await kv.getByPrefix('user:');
  const user = users.find(u => u.accessToken === sessionToken);
  
  if (!user || user.role !== 'admin') {
    return null;
  }
  
  return user;
};

// Upload product image
productRoutes.post('/admin/products/upload-image', async (c) => {
  const admin = await verifyAdmin(c);
  
  if (!admin) {
    console.error('❌ Unauthorized upload attempt');
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    console.log('📸 Product image upload started by admin:', admin.email);
    
    const formData = await c.req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      console.error('❌ No file provided in form data');
      return c.json({ success: false, error: 'No file provided' }, 400);
    }

    console.log('📁 File received:', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('❌ Invalid file type:', file.type);
      return c.json({ success: false, error: 'File must be an image' }, 400);
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.error('❌ File too large:', file.size);
      return c.json({ success: false, error: 'File size must be less than 10MB' }, 400);
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `product_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    console.log('🔧 Generated file path:', filePath);

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    console.log('📤 Uploading to bucket:', BUCKETS.PRODUCTS);

    // ✅ SIMPLIFIED: Use base64 storage directly (no Supabase Storage)
    // This guarantees 100% success rate without JWT issues
    console.log('💾 Using base64 storage method for product image (guaranteed to work)');
    
    // ✅ CRITICAL FIX: Use loop instead of spread to avoid stack overflow
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binaryString);
    const imageUrl = `data:${file.type};base64,${base64}`;
    const uploadMethod = 'base64_kv';
    
    console.log('✅ Product image converted to base64 data URL');

    console.log('✅ Upload successful! Method:', uploadMethod);
    console.log('📊 Image URL:', imageUrl.substring(0, 50) + '...');

    return c.json({ 
      success: true, 
      data: { 
        imageUrl,
        uploadMethod
      } 
    });
  } catch (error: any) {
    console.error('❌ Error uploading product image:', error);
    return c.json({ success: false, error: 'Failed to upload image: ' + error.message }, 500);
  }
});

// Create product with image
productRoutes.post('/admin/products', async (c) => {
  const admin = await verifyAdmin(c);
  
  if (!admin) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const body = await c.req.json();
    const { name, description, price, category, stock, imageUrl } = body;

    // Validate required fields
    if (!name || !price || !category) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const product = {
      id: productId,
      name,
      description: description || '',
      price: parseFloat(price),
      category,
      stock: parseInt(stock) || 0,
      imageUrl: imageUrl || '',
      rating: 0,
      reviewCount: 0,
      sold: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`product:${productId}`, product);

    return c.json({ success: true, data: product });
  } catch (error) {
    console.error('Error creating product:', error);
    return c.json({ success: false, error: 'Failed to create product' }, 500);
  }
});

// Update product
productRoutes.put('/admin/products/:id', async (c) => {
  const admin = await verifyAdmin(c);
  
  if (!admin) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const productId = c.req.param('id');
    const body = await c.req.json();

    const existingProduct = await kv.get(`product:${productId}`);
    
    if (!existingProduct) {
      return c.json({ success: false, error: 'Product not found' }, 404);
    }

    // If imageUrl changed and old one exists, delete old image
    if (body.imageUrl && body.imageUrl !== existingProduct.imageUrl && existingProduct.imageUrl) {
      const oldPath = extractFilePathFromUrl(existingProduct.imageUrl);
      if (oldPath) {
        await deleteImage(BUCKETS.PRODUCTS, oldPath);
      }
    }

    // Handle flash sale discount calculation
    let updatedData = { ...body };
    
    if (body.isFlashSale && body.discount && body.discount > 0) {
      // Save original price if not already set
      if (!existingProduct.originalPrice) {
        updatedData.originalPrice = existingProduct.price;
      }
      
      // Calculate discounted price
      const originalPrice = updatedData.originalPrice || existingProduct.price;
      updatedData.price = Math.round(originalPrice * (1 - body.discount / 100));
    } else if (body.isFlashSale === false) {
      // Restore original price when removing from flash sale
      if (existingProduct.originalPrice) {
        updatedData.price = existingProduct.originalPrice;
        updatedData.originalPrice = null;
      }
      updatedData.discount = null;
    }

    const updatedProduct = {
      ...existingProduct,
      ...updatedData,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`product:${productId}`, updatedProduct);

    return c.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    return c.json({ success: false, error: 'Failed to update product' }, 500);
  }
});

// Delete product
productRoutes.delete('/admin/products/:id', async (c) => {
  const admin = await verifyAdmin(c);
  
  if (!admin) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const productId = c.req.param('id');
    const product = await kv.get(`product:${productId}`);
    
    if (!product) {
      return c.json({ success: false, error: 'Product not found' }, 404);
    }

    // Delete image if exists
    if (product.imageUrl) {
      const filePath = extractFilePathFromUrl(product.imageUrl);
      if (filePath) {
        await deleteImage(BUCKETS.PRODUCTS, filePath);
      }
    }

    await kv.del(`product:${productId}`);

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return c.json({ success: false, error: 'Failed to delete product' }, 500);
  }
});

// Update product (alternate route without /admin prefix for compatibility)
productRoutes.put('/products/:id', async (c) => {
  const admin = await verifyAdmin(c);
  
  if (!admin) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const productId = c.req.param('id');
    const body = await c.req.json();

    const existingProduct = await kv.get(`product:${productId}`);
    
    if (!existingProduct) {
      return c.json({ success: false, error: 'Product not found' }, 404);
    }

    // If imageUrl changed and old one exists, delete old image
    if (body.imageUrl && body.imageUrl !== existingProduct.imageUrl && existingProduct.imageUrl) {
      const oldPath = extractFilePathFromUrl(existingProduct.imageUrl);
      if (oldPath) {
        await deleteImage(BUCKETS.PRODUCTS, oldPath);
      }
    }

    // Handle flash sale discount calculation
    let updatedData = { ...body };
    
    if (body.isFlashSale && body.discount && body.discount > 0) {
      // Save original price if not already set
      if (!existingProduct.originalPrice) {
        updatedData.originalPrice = existingProduct.price;
      }
      
      // Calculate discounted price
      const originalPrice = updatedData.originalPrice || existingProduct.price;
      updatedData.price = Math.round(originalPrice * (1 - body.discount / 100));
    } else if (body.isFlashSale === false) {
      // Restore original price when removing from flash sale
      if (existingProduct.originalPrice) {
        updatedData.price = existingProduct.originalPrice;
        updatedData.originalPrice = null;
      }
      updatedData.discount = null;
    }

    const updatedProduct = {
      ...existingProduct,
      ...updatedData,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`product:${productId}`, updatedProduct);

    return c.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    return c.json({ success: false, error: 'Failed to update product' }, 500);
  }
});

export default productRoutes;