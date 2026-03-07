# Hướng dẫn Tối ưu UI/UX Mobile & Việt hóa B.BLING

## I. Nguyên tắc Responsive (Mobile-First)
* **Layout:** Chuyển từ dạng cột (Grid/Flex row) sang dạng dọc (Flex column) trên màn hình < 768px.
* **Kích thước:** Sử dụng đơn vị tương đối (rem, %, vh, vw) thay vì px cố định cho các Container chính.
* **Tương tác:** Các nút bấm (Buttons) phải có chiều cao tối thiểu 44px để dễ chạm bằng ngón tay.
* **Hình ảnh:** Đảm bảo ảnh món ăn không bị méo (sử dụng `object-cover`) và tự động co giãn theo chiều rộng màn hình.
* **Khoảng cách:** Tăng padding/margin ở hai bên mép màn hình (safe area) để nội dung không 
bị dính sát viền điện thoại.

## II. Quy chuẩn Ngôn ngữ (Việt hóa)
Tất cả các văn bản phải được chuyển sang tiếng Việt theo phong cách lịch sự, gần gũi:
* "Add to Cart" -> "Thêm vào giỏ"
* "Menu" -> "Thực đơn"
* "Total" -> "Tổng cộng"
* "Order Now" -> "Đặt món ngay"
* "Your Cart" -> "Giỏ hàng của bạn"
* "Payment" -> "Thanh toán"
* "Tracking" -> "Theo dõi đơn hàng"

## III. Kiểm soát Trạng thái (UI States)
* Giỏ hàng nổi (Floating Cart) phải luôn cố định ở dưới cùng màn hình mobile để người dùng dễ dàng thao tác.
* Modal/Popup phải chiếm 90-95% chiều rộng màn hình trên điện thoại.


