ALTER TABLE users ADD COLUMN password_hash VARCHAR NOT NULL DEFAULT '';
-- If you want to remove the default after migration, you can run:
-- ALTER TABLE users ALTER COLUMN password_hash DROP DEFAULT; 