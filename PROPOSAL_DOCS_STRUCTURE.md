# Đề xuất cấu trúc thư mục Tài liệu (docs) cho dự án B.BLING

Mục tiêu: sắp xếp các file *.md hiện có theo nguyên tắc rõ ràng, dễ tìm, dễ review, hỗ trợ tự động hoá kiểm thử tài liệu khi cần.

1) Cấu trúc thư mục đề xuất

```
/docs
  /guides          # Hướng dẫn vận hành (User + Admin guides)
    HOMEPAGE_FIX_GUIDE.md
    DASHBOARD_GUIDE.md
    SELFTEST_GUIDE.md
  /reference       # Tài liệu kỹ thuật, API, schema, rules
    ARCHITECTURE.md
    FIREBASE_FIX.md
    PAYMENT_FLOW.md (optional)
  /reviews         # Code reviews, bug reports, verification reports
    PAYMENT_CODE_REVIEW.md
    BUG_FIX_REPORT.md
    FIXES_SUMMARY.md
  /tests           # Test plans, test-cases, automation scripts
    PAYMENT_TEST_CASES.md
    TEST_CASES.md
  /policies        # Project rules, security, QA, conventions
    CODE_CONVENTION.md
    DEVELOPMENT_RULE.md
    QA_TESTING_GUIDE.md
    SECURITY_POLICY.md
  /archives        # Cũ, không còn dùng nhưng giữ lịch sử
    OLD_NOTES.md
README.md          # Overview of docs and how to use
```

- Giữ các entry HTML / trang web ở root (không di chuyển).
- Các file *.md hiện tại trong repo sẽ được chuyển vào các thư mục tương ứng.

2) Nguyên tắc phân loại nhanh
- Hướng dẫn vận hành (guides): Tập trung cho developer/QA/admin dùng hằng ngày.
- Reference: Kiến trúc, schemas, decisions (không chứa hướng dẫn test).
- Reviews: Báo cáo bug, changelogs, verification docs.
- Tests: Kịch bản test, scripts, checklist tự động.
- Policies: Các quy tắc bắt buộc (phải ở một chỗ duy nhất).

3) Quy ước đặt tên file Markdown
- Kebab-case, UPPER cho những file summary nếu muốn (ví dụ: HOMEPAGE_FIX_GUIDE.md)
- Tên ngắn gọn, mô tả nội dung: `payment_test_cases.md` → `PAYMENT_TEST_CASES.md` (giữ nhất quán với hiện có)

4) Front-matter template (tùy chọn, hữu ích nếu sau này dùng static site generator)
```yaml
---
title: "Tiêu đề bài viết"
category: guides|reference|reviews|tests|policies
tags: [bug, payment, ui]
author: "Tên"
date: 2026-03-05
status: draft|published
---
```

5) Quy ước nội dung file MD (template chung)
- 1 đoạn mô tả ngắn (1-2 câu)
- Mục lục tự động (nếu file dài)
- Mục "Mục tiêu" \n- Mục "Các bước" (Step-by-step) \n- Mục "Kiểm thử" (nếu có) \n- Mục "Files changed" + đường dẫn file liên quan

6) Nguyên tắc viết test case (tóm tắt)
- Mỗi test case phải gồm: ID, Mục tiêu, Môi trường, Bước thực hiện, Kết quả mong đợi, Ghi chú/Expected logs
- Sử dụng template table để dễ đọc
- Đặt file test automation scripts trong `/docs/tests` và đặt tên `*-spec.js` hoặc `*-test.js`

Test case template (Markdown):

```
### TC-001: Kiểm tra upload ảnh biên lai
- Mục tiêu: ...
- Môi trường: Chrome 120, macOS
- Bước: 1) ... 2) ...
- Kết quả mong đợi: ...
- Ghi chú: ...
```

7) Đề xuất chạy kiểm tra tự động
- Unit / logic: `jest` (node) cho các hàm JS tách được (ví dụ: `image-utils.js`, `app.js` helper functions)
- UI e2e: `Playwright` (đề nghị) để test flow: upload receipt, submit order, redirect
- Linter/MD: `markdownlint` để enforce style trên MD

CI (GitHub Actions) pipeline cơ bản:
- `lint` : eslint + markdownlint
- `test` : jest
- `e2e` : playwright run (on-demand or PR feature)
- `docs-check` : kiểm tra cấu trúc docs (no missing front-matter)

Sample steps (github action):
```yaml
- name: Run markdownlint
  run: npm run md-lint
- name: Run unit tests
  run: npm test
- name: Run e2e
  run: npx playwright test --project=chromium
```

8) Script migrate (option)
- Tôi có thể cung cấp script Node.js nhỏ để tự động di chuyển file hiện có vào structure mới, cập nhật links relative nếu bạn muốn.

9) Gợi ý triển khai ngắn
- Bước 1: Tạo thư mục `/docs` và di chuyển file MD theo mapping
- Bước 2: Cập nhật `README.md` trong `/docs` mô tả cách dùng
- Bước 3: Thêm `markdownlint` + `jest` + `playwright` scripts vào repo
- Bước 4: Thêm GitHub Actions workflow `docs-and-test.yml`

---

Bạn muốn tôi: 
- (A) Tạo cấu trúc `/docs` và di chuyển các file `.md` hiện có tự động? 
- (B) Chỉ tạo file kế hoạch/ hướng dẫn (như file này) để bạn duyệt rồi tôi mới di chuyển? 

Hãy chọn A hoặc B (hoặc yêu cầu khác).