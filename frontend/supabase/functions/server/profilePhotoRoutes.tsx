import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as userStore from './user_store.tsx';

const profilePhotoRoutes = new Hono();

// Get Supabase client
const getSupabase = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  console.log('🔑 Creating Supabase client...');
  console.log('  URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('  Service Role Key:', supabaseKey ? `✅ Set (${supabaseKey.substring(0, 20)}...)` : '❌ Missing');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ CRITICAL: Missing Supabase credentials!');
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
};

// Get user from session token using Supabase Auth
async function getUserFromToken(token: string | null) {
  if (!token) {
    console.log('❌ No token provided');
    return null;
  }
  
  console.log('🔍 Looking up user with token from Supabase Auth');
  
  try {
    // ✅ FIX: getUserFromToken returns user object directly (not wrapped in result)
    const user = await userStore.getUserFromToken(token);
    
    if (user) {
      console.log('✅ User found:', user.id, '|', user.email, '|', user.role);
      return user;
    }
    
    console.log('❌ User not found');
    return null;
  } catch (error) {
    console.error('❌ Error getting user from token:', error);
    return null;
  }
}

// Upload Profile Photo
profilePhotoRoutes.post('/make-server-adb995ba/profile/upload-photo', async (c) => {
  console.log('');
  console.log('════════════════════════════════════════════════════════');
  console.log('📸 UPLOAD PHOTO REQUEST RECEIVED');
  console.log('════════════════════════════════════════════════════════');
  
  try {
    const authHeader = c.req.header('Authorization');
    console.log('🔑 Authorization Header:', authHeader ? 'Present' : 'Missing');
    
    // ✅ Read user token from X-User-Token header
    const token = c.req.header('X-User-Token');
    console.log('🎫 User Token (from X-User-Token):', token ? `${token.substring(0, 30)}...` : 'Missing');
    
    if (!token) {
      console.log('❌ No user token in X-User-Token header');
      return c.json({ success: false, error: 'No user token provided' }, 401);
    }
    
    console.log('🔍 Starting user lookup...');
    const user = await getUserFromToken(token);
    
    if (!user) {
      console.log('❌ Authentication failed - No user found with this token');
      console.log('════════════════════════════════════════════════════════');
      console.log('');
      return c.json({ success: false, error: 'Unauthorized - User not found' }, 401);
    }
    
    console.log('✅ User authenticated:', user.id, '|', user.email);
    
    // Parse multipart form data
    console.log('📋 Parsing form data...');
    const formData = await c.req.formData();
    const photoFile = formData.get('photo') as File;
    
    if (!photoFile) {
      console.log('❌ No photo file in form data');
      return c.json({ success: false, error: 'No photo file provided' }, 400);
    }
    
    console.log('📷 Photo file received:');
    console.log('  - Name:', photoFile.name);
    console.log('  - Type:', photoFile.type);
    console.log('  - Size:', (photoFile.size / 1024).toFixed(2), 'KB');
    
    // Validate file type
    if (!photoFile.type.startsWith('image/')) {
      console.log('❌ Invalid file type:', photoFile.type);
      return c.json({ success: false, error: 'File must be an image' }, 400);
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (photoFile.size > maxSize) {
      console.log('❌ File too large:', (photoFile.size / 1024 / 1024).toFixed(2), 'MB');
      return c.json({ success: false, error: 'File size must be less than 5MB' }, 400);
    }
    
    // Read file as buffer
    console.log('📖 Reading file buffer...');
    const fileBuffer = await photoFile.arrayBuffer();
    const fileData = new Uint8Array(fileBuffer);
    console.log('✅ File buffer ready:', fileData.length, 'bytes');
    
    // Generate unique filename
    const fileExt = photoFile.name.split('.').pop() || 'jpg';
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    
    console.log('📝 File details:');
    console.log('  - Extension:', fileExt);
    console.log('  - Generated name:', fileName);
    console.log('  - Storage path:', filePath);
    
    // Create Supabase client
    console.log('🔌 Connecting to Supabase Storage...');
    const supabase = getSupabase();
    const bucketName = 'make-adb995ba-avatars';
    
    // Ensure bucket exists
    console.log('📦 Checking if bucket exists:', bucketName);
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log('📦 Bucket does not exist, creating:', bucketName);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: maxSize
      });
      
      if (createError) {
        console.error('❌ Failed to create bucket:', createError.message);
        return c.json({ success: false, error: 'Failed to create storage bucket' }, 500);
      }
      
      console.log('✅ Bucket created successfully');
    } else {
      console.log('✅ Bucket exists');
    }
    
    // Delete old avatar if exists
    if (user.avatar) {
      console.log('🗑️  Deleting old avatar:', user.avatar);
      const oldFilePath = user.avatar.split('/').pop();
      if (oldFilePath) {
        await supabase.storage.from(bucketName).remove([`avatars/${oldFilePath}`]);
        console.log('✅ Old avatar deleted');
      }
    }
    
    // Upload to Supabase Storage
    console.log('⬆️  Uploading to Supabase Storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileData, {
        contentType: photoFile.type,
        upsert: true
      });
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      return c.json({ success: false, error: `Upload failed: ${uploadError.message}` }, 500);
    }
    
    console.log('✅ Upload successful:', uploadData.path);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    const avatarUrl = urlData.publicUrl;
    console.log('🔗 Public URL:', avatarUrl);
    
    // Update user avatar in Supabase Auth metadata
    console.log('💾 Updating user avatar in Supabase Auth...');
    const updateResult = await userStore.updateUserAvatar(user.id, avatarUrl);
    
    if (!updateResult.success) {
      console.error('❌ Failed to update user avatar:', updateResult.error);
      return c.json({ success: false, error: 'Failed to update profile' }, 500);
    }
    
    console.log('✅ Avatar updated successfully in Supabase Auth');
    console.log('════════════════════════════════════════════════════════');
    console.log('');
    
    return c.json({
      success: true,
      avatar: avatarUrl,
      message: 'Profile photo uploaded successfully'
    });
    
  } catch (error: any) {
    console.error('❌ UPLOAD ERROR:', error);
    console.error('Error stack:', error.stack);
    console.log('════════════════════════════════════════════════════════');
    console.log('');
    return c.json({
      success: false,
      error: error.message || 'Failed to upload photo'
    }, 500);
  }
});

// Delete Profile Photo
profilePhotoRoutes.delete('/make-server-adb995ba/profile/photo', async (c) => {
  try {
    // Read token from X-User-Token header
    const token = c.req.header('X-User-Token');
    
    if (!token) {
      return c.json({ success: false, error: 'No user token provided' }, 401);
    }
    
    const user = await getUserFromToken(token);
    
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    if (!user.avatar) {
      return c.json({ success: false, error: 'No profile photo to delete' }, 400);
    }
    
    // Delete from Supabase Storage
    const supabase = getSupabase();
    const bucketName = 'make-adb995ba-avatars';
    const filePath = user.avatar.split('/').pop();
    
    if (filePath) {
      await supabase.storage.from(bucketName).remove([`avatars/${filePath}`]);
    }
    
    // Update user avatar to null in Supabase Auth
    const updateResult = await userStore.updateUserAvatar(user.id, null);
    
    if (!updateResult.success) {
      return c.json({ success: false, error: 'Failed to update profile' }, 500);
    }
    
    return c.json({
      success: true,
      message: 'Profile photo deleted successfully'
    });
    
  } catch (error: any) {
    console.error('❌ DELETE PHOTO ERROR:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to delete photo'
    }, 500);
  }
});

export default profilePhotoRoutes;