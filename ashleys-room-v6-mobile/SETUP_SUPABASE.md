# Supabase 設定

## 1. 建立 Supabase Project
建立一個新的 Supabase 專案。

## 2. 建立 Database / Storage / RLS
打開 Supabase 的 SQL Editor，把 `supabase-schema.sql` 整份貼上執行。

## 3. 建立 Ashley 的 Owner 帳號
在 Authentication 的 Users 建立一個只有 Ashley 使用的帳號（Email + Password）。

建立後複製該 User 的 UUID，在 SQL Editor 執行：

```sql
insert into public.room_admins(user_id)
values ('你的-owner-user-uuid');
```

`room_admins` 裡的人才可以修改週間資料與上傳圖片。

## 4. 填入瀏覽器可公開的 Supabase 設定
打開 `config.js`：

```js
window.ASHLEY_ROOM_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabasePublishableKey: 'sb_publishable_...'
};
```

請只放 **Publishable key**。不要把 Supabase Secret key 放進網站檔案。

## 5. 本機驗證
重新啟動：

```bash
python3 -m http.server 8080
```

進入 Edit Mode，使用剛建立的 Owner Email / Password 登入。

如果這台電腦原本 v5.1 已經有資料，登入後按：

**把這台電腦的 MON–FRI 同步到雲端**

它會將原本 LocalStorage 的文字與照片搬到 Supabase。

## 6. 跨裝置驗證
用手機或無痕視窗打開相同網址：
- 不登入即可讀取 Ashley 的週間資料
- 可留下留言
- Ashley 在另一台裝置更新並按「儲存今天」後，重新載入即可看到更新

## 7. 部署
Vercel / Netlify 都可直接部署這個資料夾，沒有 build step。

### Vercel
- Framework Preset: Other
- Build Command: 留空
- Output Directory: `.`

### Netlify
- Publish directory: `.`

網站是純前端，所以 `config.js` 會公開。這是刻意的：Publishable key 本來就是給瀏覽器使用，實際資料權限由 RLS 控制。
