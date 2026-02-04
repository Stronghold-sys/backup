import { createClient } from 'jsr:@supabase/supabase-js@2';

// Initialize Supabase client
const getSupabase = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  // ✅ Enhanced debug logging
  console.log('🔑 [StorageHelper] Creating Supabase client...');
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

// Bucket names
export const BUCKETS = {
  AVATARS: 'make-adb995ba-avatars',
  PRODUCTS: 'make-adb995ba-products',
  BANNERS: 'make-adb995ba-banners',
  PROFILE_PHOTOS: 'make-adb995ba-profile-photos',
  REFUND_EVIDENCE: 'make-adb995ba-refund-evidence', // For refund photos/videos
};

// Initialize all storage buckets
export async function initializeBuckets() {
  const supabase = getSupabase();
  
  try {
    console.log('🔍 Listing existing buckets...');
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return { success: false, error: listError };
    }
    
    const existingBucketNames = existingBuckets?.map(b => b.name) || [];
    console.log('📦 Existing buckets:', existingBucketNames);

    // Create buckets if they don't exist
    for (const [key, bucketName] of Object.entries(BUCKETS)) {
      if (!existingBucketNames.includes(bucketName)) {
        console.log(`📦 Creating bucket: ${bucketName}...`);
        
        // Special config for refund evidence bucket (allows videos)
        const bucketConfig = bucketName === BUCKETS.REFUND_EVIDENCE ? {
          public: false,
          fileSizeLimit: 52428800, // 50MB for videos
          allowedMimeTypes: ['image/*', 'video/*'],
        } : {
          public: false,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['image/*'],
        };
        
        const { data, error } = await supabase.storage.createBucket(bucketName, bucketConfig);
        
        if (error) {
          console.error(`❌ Error creating bucket ${bucketName}:`, error);
        } else {
          console.log(`✅ Bucket created: ${bucketName}`);
        }
      } else {
        console.log(`✅ Bucket already exists: ${bucketName}`);
      }
    }

    console.log('✅ All storage buckets initialized');
    return { success: true };
  } catch (error) {
    console.error('❌ Error initializing buckets:', error);
    return { success: false, error };
  }
}

// Ensure bucket exists before upload
async function ensureBucketExists(bucketName: string): Promise<boolean> {
  const supabase = getSupabase();
  
  try {
    console.log(`🔍 Checking if bucket exists: ${bucketName}`);
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('❌ Error listing buckets:', error);
      return false;
    }
    
    const bucketExists = buckets?.some(b => b.name === bucketName);
    
    if (!bucketExists) {
      console.log(`📦 Bucket ${bucketName} not found, creating...`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/*'],
      });
      
      if (createError) {
        console.error(`❌ Failed to create bucket ${bucketName}:`, createError);
        return false;
      }
      
      console.log(`✅ Bucket ${bucketName} created successfully`);
      return true;
    }
    
    console.log(`✅ Bucket ${bucketName} exists`);
    return true;
  } catch (error) {
    console.error('❌ Error ensuring bucket exists:', error);
    return false;
  }
}

// Upload image to storage
export async function uploadImage(
  bucketName: string,
  filePath: string,
  fileData: Uint8Array,
  contentType: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = getSupabase();

  try {
    // Ensure bucket exists before uploading
    const bucketReady = await ensureBucketExists(bucketName);
    if (!bucketReady) {
      return { success: false, error: 'Failed to ensure bucket exists' };
    }

    console.log(`📤 Uploading to bucket: ${bucketName}, path: ${filePath}`);
    
    // Upload file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileData, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    console.log('✅ File uploaded successfully:', uploadData);

    // Get signed URL (valid for 1 year)
    console.log('🔗 Generating signed URL...');
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 365 * 24 * 60 * 60); // 1 year

    if (urlError || !signedUrlData?.signedUrl) {
      console.error('❌ URL generation error:', urlError);
      return { success: false, error: 'Failed to generate URL' };
    }

    console.log('✅ Signed URL generated:', signedUrlData.signedUrl.substring(0, 50) + '...');
    return { success: true, url: signedUrlData.signedUrl };
  } catch (error: any) {
    console.error('❌ Upload image error:', error);
    return { success: false, error: error.message };
  }
}

// Delete image from storage
export async function deleteImage(
  bucketName: string,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Delete image error:', error);
    return { success: false, error: error.message };
  }
}

// Upload image from URL (for seeding/migration)
export async function uploadImageFromURL(
  bucketName: string,
  filePath: string,
  imageUrl: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Fetch image from URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return { success: false, error: 'Failed to fetch image' };
    }

    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Upload to storage
    return await uploadImage(bucketName, filePath, uint8Array, contentType);
  } catch (error: any) {
    console.error('Upload from URL error:', error);
    return { success: false, error: error.message };
  }
}

// Extract file path from signed URL
export function extractFilePathFromUrl(url: string): string | null {
  try {
    // Format: https://{project}.supabase.co/storage/v1/object/sign/{bucket}/{path}?token=...
    const match = url.match(/\/object\/sign\/[^/]+\/(.+?)\?/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extracting file path:', error);
    return null;
  }
}