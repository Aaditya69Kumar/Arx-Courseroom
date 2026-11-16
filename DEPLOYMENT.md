# Render deployment

Create a Render Blueprint from the repository root and select `render.yaml`. It defines a Python API service rooted at `backend/` and a Node web service rooted at `frontend/`.

During Blueprint setup, provide the backend `DATABASE_URL` from Supabase, `OPENAI_API_KEY` if you want the backend AI features enabled, and `GEMINI_API_KEY` if you want Quicknow's hosted AI enabled. Render generates `DJANGO_SECRET_KEY`. The frontend uses the backend Render URL from `NEXT_PUBLIC_API_URL`.

Keep all secret values in Render environment settings. Do not commit `.env` files. Quicknow reads an optional server-side `GEMINI_API_KEY`; it does not need a `NEXT_PUBLIC_` key.

Course materials, assignment attachments, and submissions currently use Django's local `MEDIA_ROOT`. Render's filesystem is temporary, so configure durable file storage before relying on uploads in production. The Supabase Storage key currently has no active storage adapter in the application. A paid Render disk mounted at `/opt/render/project/src/media` is one supported option; otherwise, add and verify a Supabase Storage adapter.
