# NCS Cantonese Lab

Mobile-first 粵語與繁體中文學習平台 MVP。

## Backend Mode

這版沿用舊 App 的簡單登入模式：

- 不使用 Supabase Authentication 建立學生。
- 帳戶存於 `public.ncs_users`。
- 密碼以 `bcrypt` 存成 `password_hash`。
- 登入後用 HTTP-only signed cookie 保存 session。
- 教師可直接在前端輸入學號、姓名、密碼新增學生。

## Setup

1. 在 Supabase SQL Editor 執行：

```sql
-- supabase/schema.sql
```

2. 建立 `.env.local`：

```env
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase Project URL
SUPABASE_SERVICE_ROLE_KEY=你的 service_role key
APP_SESSION_SECRET=請改成一串長密碼

# Google TTS/STT，未設定時網站仍可用，但朗讀與語音辨識會顯示設定提示
GOOGLE_APPLICATION_CREDENTIALS=
GOOGLE_CREDENTIALS_JSON=
```

3. 啟動後建立第一個教師：

```bash
curl -X POST http://127.0.0.1:3000/api/bootstrap \
  -H "Content-Type: application/json" \
  -d "{\"loginId\":\"T001\",\"displayName\":\"老師\",\"password\":\"123456\"}"
```

4. 登入：

- 教師：`T001`
- 密碼：`123456`

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```
