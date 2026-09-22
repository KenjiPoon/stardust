# 第三方元件與來源

## MediaPipe Tasks Vision

- 作者：The MediaPipe Authors / Google
- 套件：`@mediapipe/tasks-vision` **1.0.1**
- npm：https://www.npmjs.com/package/@mediapipe/tasks-vision/v/1.0.1
- 原始專案：https://github.com/google-ai-edge/mediapipe
- 授權：Apache License 2.0，全文隨附於 `vendor/mediapipe/LICENSE`。
- 此作品原樣附上官方 `vision_bundle.mjs`、WASM loader 與 WASM binary；沒有修改第三方程式。
- 下載套件已依 npm registry 所提供的 SHA-512 integrity 核對。

## Hand Landmarker 模型

- 官方模型：Hand Landmarker，float16，版本 1。
- 來源：https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
- 模型說明：https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker
- 本機檔案：`models/hand_landmarker.task`。
- SHA-256：`fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`。

模型與第三方元件依其官方發佈授權及條款使用；本作品的文件不取代原作者授權。

## 驗證素材

瀏覽器辨識測試使用 MediaPipe 官方公開測試照片 `right_hands.jpg`，在本機將其中一隻手繪入測試串流。測試照片沒有包含在正式交付介面，也不是用戶攝影機錄影。

- 測試素材：https://storage.googleapis.com/mediapipe-assets/right_hands.jpg
- 上游測試清單：https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/testdata/vision/BUILD

## 本作品視覺

星塵、光球、軌道與圖示以程式繪製；沒有使用外部圖片素材或線上字體。中文字體使用裝置現有的宋體與蘋方等字體，不在交付檔案中重新分發。
