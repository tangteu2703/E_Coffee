/* ==========================================================================
   E-COFFEE BAR — SIGNALR REAL-TIME ORDER NOTIFICATIONS + TTS ENGINE
   Loaded after bar.js on the /Bar page only.
   Depends on: @microsoft/signalr (CDN), bar.js (ECoffeeBar namespace)
   ========================================================================== */

const BarNotifications = (function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  let connection = null;
  let ttsInterval = null;
  let ttsUnlocked = false;        // true sau khi user click banner lần đầu
  const TTS_INTERVAL_MS = 30000;  // Đọc lại mỗi 30 giây

  // ── Khởi động ──────────────────────────────────────────────────────────────
  function init() {
    autoUnlockOnFirstInteraction();
    buildSignalRConnection();
  }

  // ── TTS tự động unlock khi nhân viên tương tác lần đầu ──────────────────────
  // Trình duyệt yêu cầu user gesture trước khi SpeechSynthesis.speak() hoạt động.
  // Nhân viên bar luôn click vào màn hình khi làm việc nên TTS sẽ sẵn sàng tự động.
  function autoUnlockOnFirstInteraction() {
    const unlock = function () {
      if (ttsUnlocked) return;
      ttsUnlocked = true;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      document.removeEventListener('click',      unlock);
      document.removeEventListener('keydown',    unlock);
      document.removeEventListener('touchstart', unlock);
      // Nếu đã có đơn pending trước khi user click → đọc ngay
      if (hasPendingOrders()) startTtsLoop();
    };
    document.addEventListener('click',      unlock);
    document.addEventListener('keydown',    unlock);
    document.addEventListener('touchstart', unlock);
  }

  // ── SignalR Connection ─────────────────────────────────────────────────────
  function buildSignalRConnection() {
    if (typeof signalR === 'undefined') {
      console.warn('[BarNotifications] SignalR client library not loaded.');
      return;
    }

    connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/order')
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Nhận đơn mới từ server
    connection.on('NewOrderReceived', function (order) {
      handleNewOrder(order);
    });

    connection.onreconnected(function () {
      console.info('[BarNotifications] SignalR reconnected.');
    });

    startConnection();
  }

  async function startConnection() {
    try {
      await connection.start();
      console.info('[BarNotifications] SignalR connected. Hub: /hubs/order');
    } catch (err) {
      console.error('[BarNotifications] SignalR connection failed:', err);
      setTimeout(startConnection, 5000); // retry sau 5s nếu fail
    }
  }

  // ── Xử lý đơn mới đến ─────────────────────────────────────────────────────
  function handleNewOrder(order) {
    console.info('[BarNotifications] New order received:', order.orderId);

    // 1. Inject card HTML vào đúng grid
    injectOrderCard(order);

    // 2. Cập nhật badge counts (statOnlineCount, filter chips)
    updateOrderCounts();

    // 3. Bắt đầu TTS loop nếu user đã unlock và loop chưa chạy
    if (ttsUnlocked) startTtsLoop();
    // (Nếu chưa unlock, TTS sẽ tự bắt đầu sau khi user click lần đầu vào bất kỳ đâu)

    // 4. Highlight tab "SƠ ĐỒ BÀN" nếu đang ở tab khác
    highlightTabBadge();

    // 5. Cập nhật document title
    refreshDocumentTitle();
  }

  // ── Render card HTML và inject vào grid ──────────────────────────────────
  function buildOrderCardHtml(order) {
    const isDelivery = order.orderType === 'Delivery';
    const typeBadge  = isDelivery
      ? '<span class="badge bg-primary" style="font-size:0.68rem;">Giao tận nơi</span>'
      : '<span class="badge bg-info text-dark" style="font-size:0.68rem;">Đến lấy / Mang đi</span>';

    const addressLine = isDelivery
      ? `<div class="text-muted text-truncate" style="font-size:0.75rem;"><i class="bi bi-geo-alt me-1"></i>${escHtml(order.deliveryAddress)}</div>`
      : `<div class="text-muted text-truncate" style="font-size:0.75rem;"><i class="bi bi-info-circle me-1"></i>${escHtml(order.deliveryAddress || 'Tại quầy')}</div>`;

    const noteHtml = order.customerNote
      ? `<div class="text-muted fst-italic" style="font-size:0.72rem;"><i class="bi bi-chat-text me-1"></i>${escHtml(order.customerNote)}</div>`
      : '';

    return `
      <div class="online-item-card bar-notif-new-pulse" data-order-id="${escHtml(order.orderId)}" data-status="Pending"
           onclick="ECoffeeBar.selectOnlineOrder('${escHtml(order.orderId)}')">
        <div class="d-flex align-items-center justify-content-between mb-1">
          <span class="fw-extrabold text-dark" style="font-size:0.95rem;">${escHtml(order.orderId)}</span>
          <div class="d-flex gap-1">
            ${typeBadge}
            <span class="badge bg-danger" style="font-size:0.68rem;">Chờ pha chế</span>
          </div>
        </div>
        <div class="fw-bold text-dark" style="font-size:0.85rem;">${escHtml(order.customerName)} - ${escHtml(order.customerPhone)}</div>
        ${addressLine}
        ${noteHtml}
        <div class="d-flex justify-content-between align-items-center mt-2 pt-1 border-top">
          <span class="text-secondary fst-italic" style="font-size:0.72rem;"><i class="bi bi-clock"></i> ${escHtml(order.orderTime)}</span>
          <span class="fw-bold text-danger" style="font-size:0.88rem;">${formatVND(order.totalAmount)} (${order.itemCount} món)</span>
        </div>
        <div class="row g-1 mt-2 pt-1 border-top">
          <div class="col-6">
            <button class="btn btn-sm btn-success w-100 btn-accept-order"
                    style="font-size:0.73rem; padding:3px 8px;"
                    onclick="BarNotifications.acceptOrder('${escHtml(order.orderId)}'); event.stopPropagation();">
              <i class="bi bi-check-circle me-1"></i>Nhận Đơn
            </button>
          </div>
          <div class="col-6">
            <button class="btn btn-sm btn-outline-danger w-100"
                    style="font-size:0.73rem; padding:3px 8px;"
                    onclick="ECoffeeBar.cancelOnlineOrder('${escHtml(order.orderId)}'); event.stopPropagation();">
              <i class="bi bi-x-circle me-1"></i>Hủy Đơn
            </button>
          </div>
        </div>
      </div>`;
  }

  function injectOrderCard(order) {
    const gridId = order.orderType === 'Delivery' ? 'deliveryOrdersGrid' : 'pickupOrdersGrid';
    const grid   = document.getElementById(gridId);
    if (!grid) return;

    // Kiểm tra trùng (tránh inject 2 lần)
    if (grid.querySelector(`[data-order-id="${escHtml(order.orderId)}"]`)) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildOrderCardHtml(order).trim();
    const card = wrapper.firstChild;

    // Thêm vào đầu grid (đơn mới nhất lên trước)
    grid.prepend(card);

    // Remove animation class sau 3s
    setTimeout(() => card.classList.remove('bar-notif-new-pulse'), 3000);
  }

  // ── TTS Loop ───────────────────────────────────────────────────────────────
  function hasPendingOrders() {
    return document.querySelectorAll('.online-item-card[data-status="Pending"]').length > 0;
  }

  function startTtsLoop() {
    if (ttsInterval) return; // đã đang chạy
    readPendingOrders();     // đọc ngay lần đầu
    ttsInterval = setInterval(readPendingOrders, TTS_INTERVAL_MS);
  }

  function stopTtsLoop() {
    if (ttsInterval) {
      clearInterval(ttsInterval);
      ttsInterval = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  function readPendingOrders() {
    const pendingCards = document.querySelectorAll('.online-item-card[data-status="Pending"]');
    if (pendingCards.length === 0) {
      stopTtsLoop();
      refreshDocumentTitle();
      return;
    }

    if (!('speechSynthesis' in window)) return;

    // Huỷ utterance cũ nếu còn đang đọc
    window.speechSynthesis.cancel();

    const text = buildTtsText(pendingCards);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang  = 'vi-VN';
    utterance.rate  = 0.88;
    utterance.pitch = 1.0;

    // Chọn giọng vi-VN nếu có, fallback sang default
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang === 'vi-VN' || v.lang.startsWith('vi'));
    if (viVoice) utterance.voice = viVoice;

    window.speechSynthesis.speak(utterance);
  }

  function buildTtsText(pendingCards) {
    const count = pendingCards.length;
    let text = `Quầy Bar ơi! Có ${count} đơn chờ xác nhận. `;

    pendingCards.forEach((card, idx) => {
      const orderId   = card.dataset.orderId || '';
      const nameEl    = card.querySelector('.fw-bold.text-dark');
      const amountEl  = card.querySelector('.fw-bold.text-danger');
      const typeDelivery = card.querySelector('.badge.bg-primary');

      const custName  = nameEl    ? nameEl.textContent.split('-')[0].trim()    : 'Khách';
      const amount    = amountEl  ? amountEl.textContent.trim()                : '';
      const typeLabel = typeDelivery ? 'giao tận nơi' : 'đến lấy';

      text += `Đơn ${orderId}: ${typeLabel}, khách ${custName}, ${amount}. `;
    });

    text += 'Vui lòng bấm Nhận Đơn để xác nhận!';
    return text;
  }

  // ── Nhân viên bấm "Nhận Đơn" ─────────────────────────────────────────────
  async function acceptOrder(orderId) {
    if (!orderId) return;

    try {
      // Cập nhật status lên server: Pending(1) → Preparing(2)
      const resp = await fetch(`/Bar/UpdateOrderStatus?orderId=${encodeURIComponent(orderId)}&status=2`, {
        method: 'POST'
      });

      if (!resp.ok) {
        console.warn('[BarNotifications] UpdateOrderStatus failed:', resp.status);
      }
    } catch (err) {
      console.warn('[BarNotifications] acceptOrder API error:', err);
    }

    // Dù API có lỗi hay không, vẫn cập nhật UI ngay lập tức
    updateCardToPreparingUI(orderId);
    refreshDocumentTitle();

    // Kiểm tra nếu hết pending → dừng TTS
    if (!hasPendingOrders()) stopTtsLoop();
  }

  function updateCardToPreparingUI(orderId) {
    const card = document.querySelector(`.online-item-card[data-order-id="${orderId}"]`);
    if (!card) return;

    // Đổi data-status → TTS loop bỏ qua đơn này
    card.dataset.status = 'Preparing';

    // Đổi badge "Chờ pha chế" → "Đang pha chế"
    const statusBadge = card.querySelector('.badge.bg-danger');
    if (statusBadge) {
      statusBadge.className = 'badge bg-warning text-dark';
      statusBadge.style.fontSize = '0.68rem';
      statusBadge.textContent = 'Đang pha chế';
    }

    // Ẩn nút "Nhận Đơn"
    const acceptBtn = card.querySelector('.btn-accept-order');
    if (acceptBtn) acceptBtn.closest('.col-6').remove();

    // Xoá animation pulse nếu còn
    card.classList.remove('bar-notif-new-pulse');
  }

  // ── Helpers UI ─────────────────────────────────────────────────────────────
  function updateOrderCounts() {
    const allOnlineCards = document.querySelectorAll('.online-item-card[data-order-id]');
    const pendingCount   = document.querySelectorAll('.online-item-card[data-status="Pending"]').length;
    const deliveryCount  = document.querySelectorAll('#deliveryOrdersGrid .online-item-card[data-order-id]').length;
    const pickupCount    = document.querySelectorAll('#pickupOrdersGrid  .online-item-card[data-order-id]').length;

    // Cập nhật stat chip "Đơn Online"
    const statOnline = document.getElementById('statOnlineCount');
    if (statOnline) statOnline.textContent = pendingCount;

    // Cập nhật badge delivery section header
    const deliveryBadge = document.querySelector('#sectionDeliveryOrders .badge.bg-primary.rounded-pill');
    if (deliveryBadge) deliveryBadge.textContent = `${deliveryCount} đơn`;

    // Cập nhật badge pickup section header
    const pickupBadge = document.querySelector('#sectionPickupOrders .badge.bg-warning.rounded-pill');
    if (pickupBadge) pickupBadge.textContent = `${pickupCount} đơn`;

    // Cập nhật nút filter "Tất cả"
    const allFilterBtn = document.querySelector('.filter-chip-btn');
    if (allFilterBtn) {
      const tableCount = document.querySelectorAll('.table-item-card').length;
      allFilterBtn.textContent = `Tất Cả (${tableCount + allOnlineCards.length})`;
    }
  }

  function highlightTabBadge() {
    // Highlight tab "SƠ ĐỒ BÀN & ĐƠN BÁN" nếu đang ở tab khác
    const tabBtn = document.getElementById('tab-tables-btn');
    if (tabBtn) {
      tabBtn.classList.add('bar-notif-tab-blink');
      setTimeout(() => tabBtn.classList.remove('bar-notif-tab-blink'), 5000);
    }
  }

  function refreshDocumentTitle() {
    const pendingCount = document.querySelectorAll('.online-item-card[data-status="Pending"]').length;
    const base = 'Quầy Bar & Pha Chế (POS)';
    document.title = pendingCount > 0
      ? `🔔 (${pendingCount}) Đơn mới! | ${base}`
      : base;
  }

  function formatVND(amount) {
    if (!amount && amount !== 0) return '0đ';
    return Number(amount).toLocaleString('vi-VN') + 'đ';
  }

  function escHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    init,
    acceptOrder
  };
})();

window.BarNotifications = BarNotifications;

document.addEventListener('DOMContentLoaded', BarNotifications.init);
