# KOREA AUTO TRADE

Authorized-member vehicle trading site (MVP).

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite
- Auth.js (credentials) with roles: `MEMBER` / `AUTHORIZED` / `ADMIN`

## Setup

```bash
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) (port 3001 so it does not conflict with other local apps on 3000).

## Demo accounts

| ID | Password | Role | Can register listings |
|----|----------|------|------------------------|
| `admin` | `594959` | ADMIN | Yes |
| `dealer@koreaauto.trade` | `password123` | AUTHORIZED | Yes |
| `member@koreaauto.trade` | `password123` | MEMBER | No |

New sign-ups get `MEMBER`. Promote a user in Admin → 회원 관리 by setting role to 권한회원.

## Features

- Home grids: Car Listings / HOT DEALS / Stand by
- Listing detail: specs table, gallery, YouTube embed, WhatsApp CTA
- Search + category filters
- Authorized members: create / edit listings with image upload
- Admin (`/admin`): overview stats, user role management, listing category/delete

## Admin

Sign in as `admin` / `594959`, then open [http://localhost:3001/admin](http://localhost:3001/admin).
