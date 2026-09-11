<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deploy safety

Production is Railway building `main`. A failed `next build` leaves the live site on the previous deploy (or can take it down).

Before pushing to `main`, run `npm run check:deploy` and only push if it succeeds. Do not import `server-only` modules from `"use client"` files.

