# 宇宙星塵

以繁體中文維護這個純靜態手勢互動作品。專案根目錄就是網站根目錄。

GitHub：`KenjiPoon/stardust`；預設分支：`main`；網站：`https://kenjipoon.github.io/stardust/`。

- 技術：原生 JavaScript、Canvas 2D、MediaPipe Tasks Vision 1.0.1、Web Worker。
- 入口：`index.html`；主要程式：`src/`；本機啟動器：`server.mjs`。
- 所有前端資源使用相對路徑，必須兼容 GitHub Pages 的專案子路徑。
- 相機只作瀏覽器內即時辨識；不可加入上傳、錄影、遙測或雲端推論。
- 保留本機離線啟動及停止方式。停止相機或離開頁面時釋放串流與 Worker。
- 不升級或修改第三方套件及模型，除非任務明確要求；來源與校驗值見 `assets-manifest.json`。
- 邏輯驗證：`node --test tests/*.test.mjs`。介面或部署改動須再用 Chrome 驗證。
- 手勢座標模擬、真實照片辨識及真人攝影機操作必須分開記錄，不可互相代替。
- 不加入憑證、API key 或私人測試影像。不部署無關工作區檔案。
