require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const SERPAPI_KEY = process.env.SERPAPI_KEY;

async function run() {
  try {
    // Ensure bucket exists
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) throw bucketError;
    
    if (!buckets.find(b => b.name === 'products')) {
      console.log('Creating "products" bucket...');
      await supabase.storage.createBucket('products', { public: true });
    }

    const { data: products, error: prodError } = await supabase.from('products')
      .select('id, sku, name')
      .is('image_url', null)
      .order('id', { ascending: true });
      
    if (prodError) throw prodError;

    console.log(`Found ${products.length} products to process.`);

    for (const product of products) {
      console.log(`\nProcessing ${product.sku}: ${product.name}`);
      try {
        const query = encodeURIComponent(product.name + ' Nigeria grocery');
        const searchUrl = `https://serpapi.com/search.json?engine=google_images&q=${query}&api_key=${SERPAPI_KEY}`;
        
        const serpRes = await axios.get(searchUrl);
        const images = serpRes.data.images_results;
        
        if (!images || images.length === 0) {
          console.log(`No images found for ${product.name}. Skipping.`);
          continue;
        }

        // Try to find a valid image URL that works
        let buffer = null;
        let imgUrl = '';
        let contentType = '';
        
        for (let i = 0; i < Math.min(images.length, 3); i++) {
          try {
            imgUrl = images[i].original;
            console.log(`Attempting to download image: ${imgUrl}`);
            const imgRes = await axios.get(imgUrl, { 
              responseType: 'arraybuffer',
              timeout: 10000,
              headers: {
                 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
              }
            });
            buffer = Buffer.from(imgRes.data, 'binary');
            contentType = imgRes.headers['content-type'] || 'image/jpeg';
            break; // Success
          } catch (e) {
            console.log(`Failed to download ${imgUrl}, trying next image...`);
          }
        }
        
        if (!buffer) {
           console.log(`Could not download any images for ${product.name}. Skipping.`);
           continue;
        }
        
        let ext = imgUrl.split('.').pop().split('?')[0].toLowerCase();
        if (ext.length > 4) ext = 'jpg';
        const finalExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
        const fileName = `${product.sku.toLowerCase()}.${finalExt}`;

        console.log(`Uploading to Supabase Storage as ${fileName}...`);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, buffer, {
            contentType: contentType,
            upsert: true
          });

        if (uploadError) {
          console.error(`Supabase upload error for ${product.sku}:`, uploadError.message);
          continue;
        }

        const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(fileName);
        const publicUrl = publicUrlData.publicUrl;

        const { error: updateError } = await supabase.from('products')
          .update({ image_url: publicUrl })
          .eq('id', product.id);
          
        if (updateError) throw updateError;
        
        console.log(`Successfully updated ${product.sku} with URL: ${publicUrl}`);
        
        // Small delay to prevent rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Error processing ${product.sku}: ${err.message}`);
      }
    }
    
    console.log('\nFinished processing all products!');
  } catch (err) {
    console.error('Fatal error:', err);
  }
}

run();
