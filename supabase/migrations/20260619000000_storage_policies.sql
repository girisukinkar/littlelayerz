-- Create RLS policies for storage objects in the 'product-images' bucket

-- 1. Allow public select (read) access
create policy "Allow public select access to product-images"
on storage.objects for select
using ( bucket_id = 'product-images' );

-- 2. Allow public insert (upload) access
create policy "Allow public insert access to product-images"
on storage.objects for insert
with check ( bucket_id = 'product-images' );

-- 3. Allow public update access (required for file overrides/upserts)
create policy "Allow public update access to product-images"
on storage.objects for update
using ( bucket_id = 'product-images' )
with check ( bucket_id = 'product-images' );

-- 4. Allow public delete access
create policy "Allow public delete access to product-images"
on storage.objects for delete
using ( bucket_id = 'product-images' );
