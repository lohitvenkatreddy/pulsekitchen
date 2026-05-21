# Supabase Setup

Use Supabase for:

- Postgres database
- Storage buckets
- Auth data storage through this app's existing `auth-service`

This project currently uses its own FastAPI JWT auth service and stores users in
the `users` table. That table lives in Supabase Postgres in production. Supabase
Auth can stay enabled in the Supabase dashboard, but the mobile app and
dashboards do not call Supabase Auth directly.

## SQL Setup

1. Open Supabase SQL Editor.
2. Run [database/schema.sql](/Users/lohithvenkatreddy/Desktop/POP/database/schema.sql).
3. Run [supabase/storage.sql](/Users/lohithvenkatreddy/Desktop/POP/supabase/storage.sql).

## Connection String

Use the Supabase pooler connection string for Render:

```text
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
```

Put that value in Render as:

```text
DATABASE_URL=...
```

## Storage Buckets

The storage script creates:

- `restaurant-menu-images`
- `verification-documents`
- `support-attachments`

The current app can deploy without using these buckets directly. They are ready
for production file-upload migration when you move away from inline data URLs.
