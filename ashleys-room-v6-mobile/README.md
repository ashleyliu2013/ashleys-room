# ASHLEY'S ROOM v6 · Online Room

這版把 v5.1 的本機生活房間升級成可跨裝置同步的版本。

## 已加入
- MON–FRI 生活資料同步到 Supabase Database
- 早餐 / 午餐 / 晚餐、照片牆、便利貼照片同步到 Supabase Storage
- Owner 使用 Supabase Auth 登入 Edit Mode
- 訪客不需登入即可探索
- 留言板跨裝置同步
- 「我來過」會寫入訪客紀錄
- 沒有設定 Supabase 時，自動退回原本 LocalStorage Demo Mode
- 可一鍵把這台電腦原本的 MON–FRI 本機資料搬到雲端

## 本機預覽
Mac 可雙擊 `start.command`，或在此資料夾執行：

```bash
python3 -m http.server 8080
```

打開 http://localhost:8080

## 要正式跨裝置同步
照 `SETUP_SUPABASE.md` 完成 Supabase 設定，再部署到 Vercel / Netlify。
