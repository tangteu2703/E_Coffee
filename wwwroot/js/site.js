/* ==========================================================================
   E-COFFEE - INTERACTIVE CLIENT ENGINE & CART MANAGER
   ========================================================================== */

const ECoffee = (function () {
  // State Key Names
  const CART_STORAGE_KEY = 'eco_cart_v1';
  const MODE_STORAGE_KEY = 'eco_order_mode_v1';
  const VOUCHER_STORAGE_KEY = 'eco_voucher_v1';

  // Initial State
  let cart = [];
  let orderMode = {
    type: 'AtTable', // 'AtTable', 'Delivery', 'Pickup'
    tableNumber: 'Bàn 01',
    customerName: '',
    customerPhone: '',
    address: '',
    branchId: null,       // ID trụ sở tiếp nhận đơn
    branchName: '',       // Tên trụ sở
    storeName: 'Hoàng Gia Coffee'
  };

  // Branches state (loaded once from server)
  let branchesData = [];
  let _branchesLoading = false;
  let _branchesLoaded  = false;
  let _branchLoadCbs   = [];  // callbacks waiting for branches

  let appliedVoucher = null;

  // Valid Vouchers Catalog
  const VALID_VOUCHERS = {
    'ECOFFEE10': { code: 'ECOFFEE10', name: 'Giảm 10% tổng đơn', type: 'percent', value: 10 },
    'HE2026': { code: 'HE2026', name: 'Giảm 20.000đ', type: 'fixed', value: 20000 },
    'FREESHIP': { code: 'FREESHIP', name: 'Miễn phí giao hàng (15k ship)', type: 'freeship', value: 15000 }
  };

  let currentModalProduct = null;
  let selectedSizeExtra = 0;
  let selectedSizeObj = { code: 'S', name: 'Nhỏ (S)', extraPrice: 0 };
  let selectedSugar = '100%';
  let selectedIce = '100%';
  let selectedToppings = [];
  let modalQty = 1;

  // Initialize App
  function init() {
    loadOrderMode();
    loadCart();
    loadVoucher();
    checkUrlTableParam();
    bindEvents();
    renderHeaderMode();
    renderCart();
    // Prefetch branches in background
    loadBranches();
  }

  // Load Saved Order Mode
  function loadOrderMode() {
    const saved = localStorage.getItem(MODE_STORAGE_KEY);
    if (saved) {
      try {
        orderMode = { ...orderMode, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Error parsing order mode', e);
      }
    }
  }

  // Save Order Mode
  function saveOrderMode() {
    localStorage.setItem(MODE_STORAGE_KEY, JSON.stringify(orderMode));
    renderHeaderMode();
    renderCart(); // Re-render cart for shipping fee recalculation
  }

  // Check URL QR parameter: ?table=B05 or ?table=12
  function checkUrlTableParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const tableParam = urlParams.get('table');
    if (tableParam) {
      const formattedTable = tableParam.startsWith('Bàn') ? tableParam : `Bàn ${tableParam}`;
      orderMode.type = 'AtTable';
      orderMode.tableNumber = formattedTable;
      saveOrderMode();

      // If customer info is missing for at-table QR order, show info prompt modal
      if (!orderMode.customerName || !orderMode.customerPhone) {
        setTimeout(() => {
          openOrderModeModal();
        }, 600);
      }
    }
  }

  // Load Saved Cart
  function loadCart() {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      try {
        cart = JSON.parse(saved);
      } catch (e) {
        cart = [];
      }
    }
  }

  // Save Cart
  function saveCart() {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    renderCart();
  }

  // Load Saved Voucher
  function loadVoucher() {
    const saved = localStorage.getItem(VOUCHER_STORAGE_KEY);
    if (saved) {
      try {
        appliedVoucher = JSON.parse(saved);
      } catch (e) {
        appliedVoucher = null;
      }
    }
  }

  // Save Voucher
  function saveVoucher() {
    if (appliedVoucher) {
      localStorage.setItem(VOUCHER_STORAGE_KEY, JSON.stringify(appliedVoucher));
    } else {
      localStorage.removeItem(VOUCHER_STORAGE_KEY);
    }
    renderCart();
  }

  // Apply Voucher Functions
  function applyVoucherFromInput() {
    const input = document.getElementById('voucherCodeInput');
    const feedbackEl = document.getElementById('voucherInputFeedback');
    if (!input) return;
    const code = input.value.trim().toUpperCase();
    if (!code) {
      if (feedbackEl) {
        feedbackEl.innerText = 'Vui lòng nhập mã voucher';
        feedbackEl.style.display = 'block';
      }
      showToast('Vui lòng nhập mã giảm giá', 'warning');
      return;
    }
    applyVoucherCode(code);
  }

  function applyVoucherCode(code) {
    const normalizedCode = code.trim().toUpperCase();
    const feedbackEl = document.getElementById('voucherInputFeedback');

    const effectiveSubtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    if (cart.length === 0 || effectiveSubtotal === 0) {
      showToast('Giỏ hàng đang trống, hãy chọn món trước khi áp dụng voucher', 'warning');
      return;
    }

    fetch('/Order/ValidateVoucher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: normalizedCode, orderAmount: effectiveSubtotal })
    })
    .then(res => res.json().then(data => ({ status: res.status, body: data })))
    .then(({ status, body }) => {
      if (status === 200 && body.isValid) {
        appliedVoucher = {
          code: body.code,
          name: body.name,
          type: body.type,
          value: body.value,
          discountAmount: body.discountAmount
        };
        saveVoucher();
        const input = document.getElementById('voucherCodeInput');
        if (input) input.value = '';
        if (feedbackEl) feedbackEl.style.display = 'none';
        showToast(`Đã áp dụng mã voucher ${body.code} (-${formatVND(body.discountAmount)})!`, 'success');
      } else {
        appliedVoucher = null;
        saveVoucher();
        const errMsg = body.message || `Mã "${normalizedCode}" không hợp lệ hoặc đã hết hạn`;
        if (feedbackEl) {
          feedbackEl.innerText = errMsg;
          feedbackEl.style.display = 'block';
        }
        showToast(errMsg, 'warning');
      }
    })
    .catch(err => {
      console.error('Error validating voucher:', err);
      showToast('Không thể kết nối máy chủ kiểm tra voucher', 'danger');
    });
  }

  function removeVoucher() {
    appliedVoucher = null;
    saveVoucher();
    showToast('Đã gỡ mã giảm giá', 'info');
  }

  // Render Header & Cart Drawer Order Mode Info
  function renderHeaderMode() {
    const modeValEl = document.getElementById('headerModeValue');
    const modeIconEl = document.getElementById('headerModeIcon');
    const modeSubEl = document.getElementById('headerModeSub');

    const cartModeValEl = document.getElementById('cartModeValue');
    const cartModeIconEl = document.getElementById('cartModeIcon');
    const cartModeSubEl = document.getElementById('cartModeSub');

    let mainText = '';
    let subText = '';
    let iconClass = '';

    if (orderMode.type === 'AtTable') {
      const nameTag = orderMode.customerName ? ` (${orderMode.customerName})` : ' (Chưa có tên)';
      mainText = `${orderMode.tableNumber}${nameTag}`;
      subText = 'Order tại bàn qua mã QR';
      iconClass = 'bi bi-qr-code-scan';
    } else if (orderMode.type === 'Delivery') {
      const phoneTag = orderMode.customerPhone ? ` - ${orderMode.customerPhone}` : '';
      mainText = `Giao tận nơi${phoneTag}`;
      subText = orderMode.address || 'Nhập địa chỉ giao hàng';
      iconClass = 'bi bi-truck';
    } else {
      mainText = 'Đến lấy tại quán';
      subText = orderMode.storeName;
      iconClass = 'bi bi-bag-check-fill';
    }

    if (modeValEl) modeValEl.innerText = mainText;
    if (modeIconEl) modeIconEl.className = iconClass;
    if (modeSubEl) modeSubEl.innerText = subText;

    if (cartModeValEl) cartModeValEl.innerText = mainText;
    if (cartModeIconEl) cartModeIconEl.className = iconClass;
    if (cartModeSubEl) cartModeSubEl.innerText = subText;
  }

  // Render Cart Badge, Breakdown, and Drawer Items
  function renderCart() {
    const badgeEl = document.getElementById('cartBadgeCount');
    const drawerBody = document.getElementById('cartDrawerBody');
    const cartSubtotalEl = document.getElementById('cartSubtotalPrice');
    const cartProductDiscountRow = document.getElementById('cartProductDiscountRow');
    const cartProductDiscountEl = document.getElementById('cartProductDiscountPrice');
    const cartVoucherDiscountRow = document.getElementById('cartVoucherDiscountRow');
    const cartVoucherDiscountLabel = document.getElementById('cartVoucherDiscountLabel');
    const cartVoucherDiscountEl = document.getElementById('cartVoucherDiscountPrice');
    const cartShippingEl = document.getElementById('cartShippingPrice');
    const cartShippingRow = document.getElementById('cartShippingRow') || (cartShippingEl ? cartShippingEl.closest('.cart-summary-row') : null);
    const cartGrandTotalEl = document.getElementById('cartGrandTotalPrice');

    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const rawSubtotal = cart.reduce((sum, item) => sum + ((item.originalUnitPrice || item.unitPrice) * item.quantity), 0);
    const effectiveSubtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const productDiscount = Math.max(0, rawSubtotal - effectiveSubtotal);

    // Calculate Shipping & Voucher Discounts
    const baseShippingFee = orderMode.type === 'Delivery' ? 15000 : 0;
    let voucherDiscount = 0;
    let effectiveShippingFee = baseShippingFee;

    if (appliedVoucher) {
      if (appliedVoucher.type === 'percent') {
        voucherDiscount = Math.round(effectiveSubtotal * (appliedVoucher.value / 100));
      } else if (appliedVoucher.type === 'fixed') {
        voucherDiscount = Math.min(effectiveSubtotal, appliedVoucher.value);
      } else if (appliedVoucher.type === 'freeship') {
        effectiveShippingFee = 0;
        voucherDiscount = Math.min(baseShippingFee, appliedVoucher.value);
      }
    }

    const grandTotal = Math.max(0, effectiveSubtotal - (appliedVoucher && appliedVoucher.type !== 'freeship' ? voucherDiscount : 0) + effectiveShippingFee);

    if (badgeEl) {
      badgeEl.innerText = totalCount;
      badgeEl.style.display = totalCount > 0 ? 'flex' : 'none';
    }

    const cartTotalCountEl = document.getElementById('cartTotalCountText');
    if (cartTotalCountEl) {
      cartTotalCountEl.innerText = `${cart.length} món (${totalCount} cốc)`;
    }

    if (cartSubtotalEl) cartSubtotalEl.innerText = formatVND(rawSubtotal);

    if (cartProductDiscountRow) {
      if (productDiscount > 0) {
        cartProductDiscountRow.style.display = 'flex';
        if (cartProductDiscountEl) cartProductDiscountEl.innerText = `-${formatVND(productDiscount)}`;
      } else {
        cartProductDiscountRow.style.display = 'none';
      }
    }

    if (cartVoucherDiscountRow) {
      if (appliedVoucher && appliedVoucher.type !== 'freeship' && voucherDiscount > 0) {
        cartVoucherDiscountRow.style.display = 'flex';
        if (cartVoucherDiscountLabel) cartVoucherDiscountLabel.innerText = `Voucher giảm giá (${appliedVoucher.code}):`;
        if (cartVoucherDiscountEl) cartVoucherDiscountEl.innerText = `-${formatVND(voucherDiscount)}`;
      } else {
        cartVoucherDiscountRow.style.display = 'none';
      }
    }

    if (cartShippingRow) {
      if (orderMode.type !== 'Delivery') {
        cartShippingRow.style.display = 'none';
      } else {
        cartShippingRow.style.display = 'flex';
        if (cartShippingEl) {
          if (appliedVoucher && appliedVoucher.type === 'freeship') {
            cartShippingEl.innerHTML = '<del class="text-muted me-1 small">15.000đ</del><span class="text-success font-monospace fw-bold">0đ (Freeship)</span>';
          } else {
            cartShippingEl.innerText = formatVND(15000);
          }
        }
      }
    }

    if (cartGrandTotalEl) cartGrandTotalEl.innerText = formatVND(grandTotal);

    // Mobile Sticky Cart Bar
    const mobileCartBar = document.getElementById('mobileStickyCartBar');
    const mobileCartCount = document.getElementById('mobileCartCount');
    const mobileCartTotal = document.getElementById('mobileCartTotal');

    if (mobileCartCount) mobileCartCount.innerText = totalCount;
    if (mobileCartTotal) mobileCartTotal.innerText = formatVND(grandTotal);
    if (mobileCartBar) {
      if (totalCount > 0) mobileCartBar.classList.add('active');
      else mobileCartBar.classList.remove('active');
    }

    if (drawerBody) {
      if (cart.length === 0) {
        drawerBody.innerHTML = `
          <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
            <i class="bi bi-cup-hot" style="font-size: 3.5rem; color: var(--border-color);"></i>
            <h4 style="margin-top: 1rem; font-weight: 700; color: var(--secondary);">Giỏ hàng đang trống</h4>
            <p style="font-size: 0.85rem; margin-top: 0.4rem;">Hãy chọn món ngon từ menu để thưởng thức nhé!</p>
          </div>
        `;
      } else {
        drawerBody.innerHTML = cart.map(item => {
          const hasDiscount = item.originalUnitPrice && item.originalUnitPrice > item.unitPrice;
          const itemOriginalTotal = (item.originalUnitPrice || item.unitPrice) * item.quantity;
          const itemTotal = item.unitPrice * item.quantity;

          const priceHtml = hasDiscount
            ? `<div class="d-flex align-items-baseline"><span class="cart-item-price-original">${formatVND(itemOriginalTotal)}</span><span class="cart-item-price" style="margin-top: 0;">${formatVND(itemTotal)}</span></div>`
            : `<div class="cart-item-price">${formatVND(itemTotal)}</div>`;

          return `
            <div class="cart-item-card">
              <button class="btn-remove-item" onclick="ECoffee.removeFromCart('${item.cartItemId}')">
                <i class="bi bi-trash3-fill"></i>
              </button>
              <img src="${item.productImage}" class="cart-item-thumb" alt="${item.productName}">
              <div class="cart-item-details">
                <div class="cart-item-title">${item.productName}</div>
                <div class="cart-item-sub">
                  Size: ${item.selectedSize.name} | Đường: ${item.sugarLevel} | Đá: ${item.iceLevel}
                  ${item.selectedToppings.length > 0 ? `<br>Topping: ${item.selectedToppings.map(t => t.name).join(', ')}` : ''}
                  ${item.specialNote ? `<br><i>Ghi chú: ${item.specialNote}</i>` : ''}
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.5rem;">
                  ${priceHtml}
                  <div class="qty-control-box">
                    <button class="btn-qty" onclick="ECoffee.updateCartQty('${item.cartItemId}', ${item.quantity - 1})">-</button>
                    <span class="qty-val">${item.quantity}</span>
                    <button class="btn-qty" onclick="ECoffee.updateCartQty('${item.cartItemId}', ${item.quantity + 1})">+</button>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  // Format Price in VND
  function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  // Open Customization Modal for Product
  function openCustomizationModal(productId) {
    fetch(`/Order/GetProductDetail?id=${productId}`)
      .then(res => res.json())
      .then(product => {
        currentModalProduct = product;
        selectedSizeExtra = 0;
        selectedSizeObj = product.availableSizes && product.availableSizes.length > 0
          ? product.availableSizes[0]
          : { code: 'S', name: 'Nhỏ (S)', extraPrice: 0 };
        selectedSugar = '100%';
        selectedIce = '100%';
        selectedToppings = [];
        modalQty = 1;

        renderModalContent();
        document.getElementById('productCustomModal').classList.add('active');
      })
      .catch(err => {
        showToast('Không thể tải thông tin sản phẩm', 'danger');
      });
  }

  function renderModalContent() {
    if (!currentModalProduct) return;

    const modalBody = document.getElementById('productModalBody');
    const modalTitle = document.getElementById('productModalTitle');

    if (modalTitle) modalTitle.innerText = currentModalProduct.name;

    let sizesHtml = '';
    if (currentModalProduct.availableSizes && currentModalProduct.availableSizes.length > 0) {
      sizesHtml = `
        <div class="option-group-title">1. Chọn Size</div>
        <div class="option-pills-row">
          ${currentModalProduct.availableSizes.map((sz, idx) => `
            <div class="option-radio-btn">
              <input type="radio" name="sizeOpt" id="sz_${sz.code}" ${idx === 0 ? 'checked' : ''} onchange="ECoffee.onSizeChange('${sz.code}', ${sz.extraPrice}, '${sz.name}')">
              <label for="sz_${sz.code}" class="option-label">
                ${sz.name} ${sz.extraPrice > 0 ? `(+${formatVND(sz.extraPrice)})` : ''}
              </label>
            </div>
          `).join('')}
        </div>
      `;
    }

    let sugarHtml = '';
    if (currentModalProduct.sugarLevels && currentModalProduct.sugarLevels.length > 0) {
      sugarHtml = `
        <div class="option-group-title">2. Chọn Lượng Đường</div>
        <div class="option-pills-row">
          ${currentModalProduct.sugarLevels.map((sg, idx) => `
            <div class="option-radio-btn">
              <input type="radio" name="sugarOpt" id="sg_${idx}" ${idx === 0 ? 'checked' : ''} onchange="ECoffee.onSugarChange('${sg}')">
              <label for="sg_${idx}" class="option-label">${sg}</label>
            </div>
          `).join('')}
        </div>
      `;
    }

    let iceHtml = '';
    if (currentModalProduct.iceLevels && currentModalProduct.iceLevels.length > 0) {
      iceHtml = `
        <div class="option-group-title">3. Chọn Lượng Đá</div>
        <div class="option-pills-row">
          ${currentModalProduct.iceLevels.map((ic, idx) => `
            <div class="option-radio-btn">
              <input type="radio" name="iceOpt" id="ic_${idx}" ${idx === 0 ? 'checked' : ''} onchange="ECoffee.onIceChange('${ic}')">
              <label for="ic_${idx}" class="option-label">${ic}</label>
            </div>
          `).join('')}
        </div>
      `;
    }

    let toppingsHtml = '';
    if (currentModalProduct.availableToppings && currentModalProduct.availableToppings.length > 0) {
      toppingsHtml = `
        <div class="option-group-title">4. Chọn Topping Thêm</div>
        <div class="topping-chips-row">
          ${currentModalProduct.availableToppings.map(t => `
            <div class="topping-chip" id="top_box_${t.id}" onclick="ECoffee.toggleTopping(${t.id}, '${t.name}', ${t.price})">
              <span>${t.name}</span>
              <span class="topping-price">+${formatVND(t.price)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    modalBody.innerHTML = `
      <div class="product-modal-head">
        <img src="${currentModalProduct.imageUrl}" class="product-modal-img">
        <div class="product-modal-info">
          <div class="product-modal-title-row">
            <h4 class="product-modal-name">${currentModalProduct.name}</h4>
            <div class="product-modal-price" id="modalDynamicPrice">
              ${formatVND(currentModalProduct.basePrice)}
            </div>
          </div>
          <p class="product-modal-desc">${currentModalProduct.description || ''}</p>
        </div>
      </div>
      ${sizesHtml}
      ${sugarHtml}
      ${iceHtml}
      ${toppingsHtml}
      <div class="option-group-title">Ghi chú cho Barista</div>
      <input type="text" id="modalSpecialNote" class="form-control form-control-sm modal-note-input" placeholder="Ví dụ: Ít đắng, ly nhựa, không nắp...">
    `;

    updateModalPrice();
  }

  function onSizeChange(code, extraPrice, name) {
    selectedSizeObj = { code, name, extraPrice };
    updateModalPrice();
  }

  function onSugarChange(sugar) {
    selectedSugar = sugar;
  }

  function onIceChange(ice) {
    selectedIce = ice;
  }

  function toggleTopping(id, name, price) {
    const box = document.getElementById(`top_box_${id}`);
    const existsIdx = selectedToppings.findIndex(t => t.id === id);
    if (existsIdx > -1) {
      selectedToppings.splice(existsIdx, 1);
      if (box) box.classList.remove('selected');
    } else {
      selectedToppings.push({ id, name, price });
      if (box) box.classList.add('selected');
    }
    updateModalPrice();
  }

  function updateModalPrice() {
    if (!currentModalProduct) return;
    const toppingsTotal = selectedToppings.reduce((sum, t) => sum + t.price, 0);
    const originalBase = currentModalProduct.basePrice;
    const effectiveBase = currentModalProduct.promoPrice && currentModalProduct.promoPrice < currentModalProduct.basePrice
      ? currentModalProduct.promoPrice
      : currentModalProduct.basePrice;

    const originalUnitPrice = originalBase + selectedSizeObj.extraPrice + toppingsTotal;
    const unitPrice = effectiveBase + selectedSizeObj.extraPrice + toppingsTotal;
    const grandTotal = unitPrice * modalQty;

    const priceEl = document.getElementById('modalDynamicPrice');
    const footerPriceEl = document.getElementById('modalFooterPrice');

    if (priceEl) {
      if (currentModalProduct.promoPrice && currentModalProduct.promoPrice < currentModalProduct.basePrice) {
        priceEl.innerHTML = `<span class="text-muted text-decoration-line-through me-1 small" style="font-size: 0.85rem;">${formatVND(originalUnitPrice)}</span><span class="text-danger fw-bold">${formatVND(unitPrice)}</span>`;
      } else {
        priceEl.innerText = formatVND(unitPrice);
      }
    }
    if (footerPriceEl) footerPriceEl.innerText = formatVND(grandTotal);
  }

  function changeModalQty(delta) {
    modalQty += delta;
    if (modalQty < 1) modalQty = 1;
    const qtyValEl = document.getElementById('modalQtyValue');
    if (qtyValEl) qtyValEl.innerText = modalQty;
    updateModalPrice();
  }

  function confirmAddToCart() {
    if (!currentModalProduct) return;

    const note = document.getElementById('modalSpecialNote') ? document.getElementById('modalSpecialNote').value : '';
    const toppingsTotal = selectedToppings.reduce((sum, t) => sum + t.price, 0);

    const originalBase = currentModalProduct.basePrice;
    const effectiveBase = currentModalProduct.promoPrice && currentModalProduct.promoPrice < currentModalProduct.basePrice
      ? currentModalProduct.promoPrice
      : currentModalProduct.basePrice;

    const originalUnitPrice = originalBase + selectedSizeObj.extraPrice + toppingsTotal;
    const unitPrice = effectiveBase + selectedSizeObj.extraPrice + toppingsTotal;

    const cartItem = {
      cartItemId: Date.now().toString(36) + Math.random().toString(36).substr(2),
      productId: currentModalProduct.id,
      productName: currentModalProduct.name,
      productImage: currentModalProduct.imageUrl,
      selectedSize: selectedSizeObj,
      sugarLevel: selectedSugar,
      iceLevel: selectedIce,
      selectedToppings: [...selectedToppings],
      specialNote: note,
      unitBasePrice: effectiveBase,
      originalUnitPrice: originalUnitPrice,
      unitPrice: unitPrice,
      quantity: modalQty
    };

    if (window.ECoffeeBar && typeof window.ECoffeeBar.addCustomizedItem === 'function' && window.location.pathname.toLowerCase().includes('/bar')) {
      window.ECoffeeBar.addCustomizedItem(cartItem);
    } else {
      cart.push(cartItem);
      saveCart();
      showToast(`Đã thêm ${currentModalProduct.name} vào giỏ hàng!`, 'success');
    }
    closeModal('productCustomModal');
  }

  function updateCartQty(cartItemId, newQty) {
    if (newQty <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    const item = cart.find(i => i.cartItemId === cartItemId);
    if (item) {
      item.quantity = newQty;
      saveCart();
    }
  }

  function removeFromCart(cartItemId) {
    cart = cart.filter(i => i.cartItemId !== cartItemId);
    saveCart();
    showToast('Đã xóa món khỏi giỏ hàng', 'info');
  }

  // ════════════════════════════════════════════════════════════════════
  // BRANCHES LOGIC — Fetch, Haversine, GPS, Auto-suggest nearest branch
  // ════════════════════════════════════════════════════════════════════

  /** Fetch danh sạch trụ sở từ server (chỉ gọi 1 lần) */
  function loadBranches(callback) {
    if (_branchesLoaded) {
      if (callback) callback(branchesData);
      return;
    }
    if (callback) _branchLoadCbs.push(callback);
    if (_branchesLoading) return;
    _branchesLoading = true;
    fetch('/Order/GetBranches')
      .then(r => r.json())
      .then(data => {
        branchesData = data || [];
        _branchesLoaded = true;
        _branchesLoading = false;
        _branchLoadCbs.forEach(cb => cb(branchesData));
        _branchLoadCbs = [];
      })
      .catch(err => {
        console.warn('[ECoffee] Lỗi load branches:', err);
        _branchesLoading = false;
      });
  }

  /** Tính khoảng cách giữa 2 toạ độ GPS theo công thức Haversine (km) */
  function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
            + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
            * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /** Tìm trụ sở gần nhất so với tọa độ (lat, lng) */
  function findNearestBranch(lat, lng) {
    if (!branchesData.length) return null;
    let nearest = null;
    let minDist = Infinity;
    branchesData.forEach(b => {
      const d = haversineKm(lat, lng, b.lat, b.lng);
      if (d < minDist) { minDist = d; nearest = { branch: b, distKm: d }; }
    });
    return nearest;
  }

  /** Populate combobox trụ sở cho cả Delivery và Pickup */
  function populateBranchSelect(selectId, selectedBranchId, nearestId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Chọn trụ sở --</option>';
    branchesData.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.shortName || b.name;
      if (b.id === nearestId) opt.textContent += ' ★ Gần nhất';
      if (b.id === selectedBranchId) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  /** Hiển thị thông tin chi tiết trụ sở bên dưới combobox */
  function showBranchInfo(mode, branch, distKm) {
    const suffix = mode === 'delivery' ? 'Delivery' : 'Pickup';
    const infoEl    = document.getElementById(`branchInfo${suffix}`);
    const addrEl    = document.getElementById(`branchInfoAddress${suffix}`);
    const phoneEl   = document.getElementById(`branchInfoPhone${suffix}`);
    const hoursEl   = document.getElementById(`branchInfoHours${suffix}`);
    const distEl    = document.getElementById(`branchInfoDist${suffix}`);
    if (!infoEl || !branch) return;

    if (addrEl)  addrEl.textContent  = branch.address || '';
    if (phoneEl) phoneEl.textContent = branch.phone   || '';
    if (hoursEl) hoursEl.textContent = branch.openHours || '';
    if (distEl)  distEl.textContent  = distKm != null ? `≈ ${distKm < 1 ? (distKm * 1000).toFixed(0) + ' m' : distKm.toFixed(1) + ' km'}` : '';
    infoEl.style.display = 'block';
  }

  function hideBranchInfo(mode) {
    const suffix = mode === 'delivery' ? 'Delivery' : 'Pickup';
    const el = document.getElementById(`branchInfo${suffix}`);
    if (el) el.style.display = 'none';
  }

  /** 
   * GPS: Lấy vị trí hiện tại rồi reverse-geocode qua Nominatim (free, không API key)
   * Sau đó tự động chọn trụ sở gần nhất
   * @param {string} mode 'delivery' | 'pickup'
   */
  function getGpsLocation(mode) {
    if (!navigator.geolocation) {
      showToast('Trình duyệt không hỗ trợ GPS', 'error');
      return;
    }

    const statusEl = document.getElementById(mode === 'delivery' ? 'gpsStatusDelivery' : 'gpsStatusPickup');
    const btnEl    = document.getElementById(mode === 'delivery' ? 'btnGpsDelivery'    : 'btnGpsPickup');

    if (statusEl) { statusEl.textContent = '⏳ Đang lấy vị trí GPS...'; statusEl.style.display = 'inline'; }
    if (btnEl)    btnEl.disabled = true;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // 1. Reverse-geocode bằng Nominatim (OSM, miễn phí)
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`)
          .then(r => r.json())
          .then(data => {
            const displayAddr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            // Rút gọn địa chỉ: bỏ quốc gia cuối cùng nếu quá dài
            const parts = displayAddr.split(',').map(s => s.trim());
            const shortAddr = parts.length > 5 ? parts.slice(0, 5).join(', ') : displayAddr;

            if (mode === 'delivery') {
              const addrInput = document.getElementById('inputAddress');
              if (addrInput) addrInput.value = shortAddr;
              const hint = document.getElementById('gpsHintDelivery');
              if (hint) hint.style.display = 'block';
            }

            if (statusEl) { statusEl.textContent = '✅ Đã lấy vị trí'; }

            // 2. Tìm trụ sở gần nhất theo GPS thực
            loadBranches(branches => {
              const result = findNearestBranch(lat, lng);
              if (!result) return;
              const nearestId = result.branch.id;

              if (mode === 'delivery') {
                populateBranchSelect('selectBranchDelivery', nearestId, nearestId);
                const badge = document.getElementById('nearestBranchBadgeDelivery');
                if (badge) badge.style.display = 'inline';
                showBranchInfo('delivery', result.branch, result.distKm);
                orderMode.branchId   = result.branch.id;
                orderMode.branchName = result.branch.name;
              } else {
                populateBranchSelect('selectBranchPickup', nearestId, nearestId);
                const badge = document.getElementById('nearestBranchBadgePickup');
                if (badge) badge.style.display = 'inline';
                showBranchInfo('pickup', result.branch, result.distKm);
                orderMode.branchId   = result.branch.id;
                orderMode.branchName = result.branch.name;
              }
            });
          })
          .catch(() => {
            if (statusEl) statusEl.textContent = '⚠️ Không đọc được địa chỉ';
            // Vẫn tìm trụ sở gần nhất theo GPS
            loadBranches(() => { applyNearestBranchByGps(mode, lat, lng); });
          })
          .finally(() => {
            if (btnEl) btnEl.disabled = false;
          });
      },
      (err) => {
        if (btnEl) btnEl.disabled = false;
        const msgs = ['', 'Quyền GPS bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.', 'GPS không xác định được vị trí.', 'Hết thời gian chờ GPS.'];
        showToast(msgs[err.code] || 'Không thể lấy vị trí GPS', 'error');
        if (statusEl) statusEl.style.display = 'none';
      },
      { timeout: 12000, maximumAge: 30000 }
    );
  }

  function applyNearestBranchByGps(mode, lat, lng) {
    const result = findNearestBranch(lat, lng);
    if (!result) return;
    const nearestId = result.branch.id;
    if (mode === 'delivery') {
      populateBranchSelect('selectBranchDelivery', nearestId, nearestId);
      showBranchInfo('delivery', result.branch, result.distKm);
    } else {
      populateBranchSelect('selectBranchPickup', nearestId, nearestId);
      showBranchInfo('pickup', result.branch, result.distKm);
    }
    orderMode.branchId   = result.branch.id;
    orderMode.branchName = result.branch.name;
  }

  /** Khi user đổi combobox trụ sớ (Delivery) */
  function onBranchSelectDelivery() {
    const sel = document.getElementById('selectBranchDelivery');
    if (!sel) return;
    const id = parseInt(sel.value);
    const branch = branchesData.find(b => b.id === id);
    if (branch) {
      orderMode.branchId   = branch.id;
      orderMode.branchName = branch.name;
      showBranchInfo('delivery', branch, null);
    } else {
      hideBranchInfo('delivery');
    }
  }

  /** Khi user đổi combobox trụ sớ (Pickup) */
  function onBranchSelectPickup() {
    const sel = document.getElementById('selectBranchPickup');
    if (!sel) return;
    const id = parseInt(sel.value);
    const branch = branchesData.find(b => b.id === id);
    if (branch) {
      orderMode.branchId   = branch.id;
      orderMode.branchName = branch.name;
      showBranchInfo('pickup', branch, null);
    } else {
      hideBranchInfo('pickup');
    }
  }

  /** Debounce khi user nhập địa chỉ giao hàng — đã nhập >= 10 ky tự thì populate combobox */
  let _addrDebounce = null;
  function onDeliveryAddressInput() {
    clearTimeout(_addrDebounce);
    _addrDebounce = setTimeout(() => {
      const hint = document.getElementById('gpsHintDelivery');
      if (hint) hint.style.display = 'none';
      // Nếu chưa có branches, load rồi populate default (không có lat/lng nên không gợi được nearest)
      loadBranches(branches => {
        if (!document.getElementById('selectBranchDelivery').options.length ||
            document.getElementById('selectBranchDelivery').options[0].value === '') {
          populateBranchSelect('selectBranchDelivery', orderMode.branchId, null);
        }
      });
    }, 400);
  }

  // Open Order Mode Modal (QR Table, Delivery, Pickup)
  function openOrderModeModal() {
    const modal = document.getElementById('orderModeModal');
    if (!modal) return;

    // Set active tab
    selectOrderModeTab(orderMode.type);

    // Populate At-Table inputs
    document.getElementById('inputTableNo').value = orderMode.tableNumber || 'Bàn 01';
    document.getElementById('inputCustName').value = orderMode.customerName || '';
    document.getElementById('inputCustPhone').value = orderMode.customerPhone || '';

    // Populate Delivery inputs
    document.getElementById('inputAddress').value = orderMode.address || '';
    const nameD = document.getElementById('inputCustNameDelivery');
    if (nameD) nameD.value = orderMode.customerName || '';
    const phoneD = document.getElementById('inputCustPhoneDelivery');
    if (phoneD) phoneD.value = orderMode.customerPhone || '';

    // Load branches for Delivery & Pickup comboboxes
    loadBranches(branches => {
      const savedId = orderMode.branchId;
      populateBranchSelect('selectBranchDelivery', savedId, null);
      populateBranchSelect('selectBranchPickup',   savedId, null);
      if (savedId) {
        const b = branches.find(x => x.id === savedId);
        if (b && orderMode.type === 'Delivery') showBranchInfo('delivery', b, null);
        if (b && orderMode.type === 'Pickup')   showBranchInfo('pickup',   b, null);
      }
    });

    modal.classList.add('active');
  }

  function selectOrderModeTab(type) {
    orderMode.type = type;
    document.querySelectorAll('.mode-tab-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.getElementById(`tab_mode_${type}`);
    if (targetBtn) targetBtn.classList.add('active');

    // Show/hide relevant fields
    document.getElementById('sectionAtTableFields').style.display  = type === 'AtTable'  ? 'block' : 'none';
    document.getElementById('sectionDeliveryFields').style.display = type === 'Delivery' ? 'block' : 'none';
    document.getElementById('sectionPickupFields').style.display   = type === 'Pickup'   ? 'block' : 'none';

    // Khi mở tab Pickup, đảm bảo combobox đã được fill
    if (type === 'Pickup') {
      loadBranches(branches => {
        if (!document.getElementById('selectBranchPickup').options.length ||
            document.getElementById('selectBranchPickup').options[0].value === '') {
          populateBranchSelect('selectBranchPickup', orderMode.branchId, null);
          if (orderMode.branchId) {
            const b = branches.find(x => x.id === orderMode.branchId);
            if (b) showBranchInfo('pickup', b, null);
          }
        }
      });
    }
  }

  function saveOrderModeFromModal() {
    if (orderMode.type === 'AtTable') {
      const tableNo = document.getElementById('inputTableNo').value.trim();
      const name    = document.getElementById('inputCustName').value.trim();
      const phone   = document.getElementById('inputCustPhone').value.trim();
      if (!name || !phone) {
        showToast('Vui lòng nhập Tên và Số điện thoại để định danh tại bàn', 'warning');
        return;
      }
      orderMode.tableNumber  = tableNo || 'Bàn 01';
      orderMode.customerName = name;
      orderMode.customerPhone = phone;

    } else if (orderMode.type === 'Delivery') {
      const address = document.getElementById('inputAddress').value.trim();
      const name    = document.getElementById('inputCustNameDelivery').value.trim();
      const phone   = document.getElementById('inputCustPhoneDelivery').value.trim();
      const branchSel = document.getElementById('selectBranchDelivery');
      const branchId  = branchSel ? parseInt(branchSel.value) : null;

      if (!address || !phone) {
        showToast('Vui lòng nhập địa chỉ và Số điện thoại giao hàng', 'warning');
        return;
      }
      if (!branchId) {
        showToast('Vui lòng chọn trụ sở tiếp nhận đơn giao hàng', 'warning');
        return;
      }
      orderMode.address       = address;
      orderMode.customerName  = name;
      orderMode.customerPhone = phone;
      orderMode.branchId      = branchId;
      const branchObj = branchesData.find(b => b.id === branchId);
      orderMode.branchName    = branchObj ? branchObj.name : '';

    } else if (orderMode.type === 'Pickup') {
      const branchSel = document.getElementById('selectBranchPickup');
      const branchId  = branchSel ? parseInt(branchSel.value) : null;
      if (!branchId) {
        showToast('Vui lòng chọn cửa hàng bạn muốn đến lấy', 'warning');
        return;
      }
      const branchObj = branchesData.find(b => b.id === branchId);
      orderMode.branchId      = branchId;
      orderMode.branchName    = branchObj ? branchObj.name : '';
      orderMode.customerName  = orderMode.customerName || 'Khách hàng';
    }

    saveOrderMode();
    closeModal('orderModeModal');
    showToast('Đã lưu thông tin phục vụ!', 'success');
  }

  // Custom High Z-Index Top Toast Notification System
  function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; flex-direction: column; gap: 0.5rem; pointer-events: none; align-items: center;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bg = type === 'success' ? '#2B1810' : type === 'warning' ? '#D4A359' : '#C8102E';
    const icon = type === 'success' ? 'bi-check-circle-fill' : type === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-x-circle-fill';

    toast.style.cssText = `background: ${bg}; color: #FFF; padding: 0.65rem 1.4rem; border-radius: 50px; font-weight: 700; font-size: 0.88rem; box-shadow: 0 10px 30px rgba(0,0,0,0.35); display: flex; align-items: center; gap: 0.6rem; animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1); pointer-events: auto; white-space: nowrap;`;
    toast.innerHTML = `<i class="bi ${icon}"></i> <span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // Close Modals & Drawers
  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  function toggleCartDrawer(show = true) {
    const drawerOverlay = document.getElementById('cartDrawerOverlay');
    if (drawerOverlay) {
      if (show) drawerOverlay.classList.add('active');
      else drawerOverlay.classList.remove('active');
    }
  }

  function processCheckout() {
    if (cart.length === 0) {
      showToast('Giỏ hàng trống! Hãy chọn món trước khi đặt nhé.', 'warning');
      return;
    }

    // Check customer info
    if (!orderMode.customerName || !orderMode.customerPhone) {
      openOrderModeModal();
      showToast('Vui lòng nhập Tên & SĐT để hoàn tất đơn hàng', 'warning');
      return;
    }

    showOrderConfirmation();
  }

  function showOrderConfirmation() {
    const totalItemTypes = cart.length;
    const totalCups = cart.reduce((sum, item) => sum + item.quantity, 0);
    const countDisplay = `${totalItemTypes} món (${totalCups} cốc)`;

    const identifier = orderMode.type === 'AtTable'
      ? `Bàn: ${orderMode.tableNumber}`
      : orderMode.type === 'Delivery'
        ? `SĐT / Đơn Online: ${orderMode.customerPhone}`
        : `Đến lấy tại tiệm`;

    const rawSubtotal = cart.reduce((sum, item) => sum + ((item.originalUnitPrice || item.unitPrice) * item.quantity), 0);
    const effectiveSubtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const productDiscount = Math.max(0, rawSubtotal - effectiveSubtotal);

    const baseShippingFee = orderMode.type === 'Delivery' ? 15000 : 0;
    let voucherDiscount = 0;
    let effectiveShippingFee = baseShippingFee;

    if (appliedVoucher) {
      if (appliedVoucher.type === 'percent') {
        voucherDiscount = Math.round(effectiveSubtotal * (appliedVoucher.value / 100));
      } else if (appliedVoucher.type === 'fixed') {
        voucherDiscount = Math.min(effectiveSubtotal, appliedVoucher.value);
      } else if (appliedVoucher.type === 'freeship') {
        effectiveShippingFee = 0;
        voucherDiscount = Math.min(baseShippingFee, appliedVoucher.value);
      }
    }

    const grandTotal = Math.max(0, effectiveSubtotal - (appliedVoucher && appliedVoucher.type !== 'freeship' ? voucherDiscount : 0) + effectiveShippingFee);

    const channelText = orderMode.type === 'AtTable'
      ? 'TẠI BÀN (QR)'
      : orderMode.type === 'Delivery'
        ? 'ONLINE GIAO HÀNG'
        : 'ĐẾN LẤY TIỆM';

    const itemsHtml = cart.map(item => {
      const opts = [];
      if (item.selectedSize && item.selectedSize.code) opts.push(`Size ${item.selectedSize.code}`);
      if (item.sugarLevel) opts.push(`${item.sugarLevel} đường`);
      if (item.iceLevel) opts.push(`${item.iceLevel} đá`);
      const optsText = opts.length ? `(${opts.join(', ')})` : '';
      const toppingsText = (item.selectedToppings && item.selectedToppings.length)
        ? `<div class="text-muted" style="font-size:0.75rem; margin-left: 1.25rem;">+ Topping: ${item.selectedToppings.map(t => t.name).join(', ')}</div>`
        : '';
      const noteText = item.specialNote
        ? `<div class="text-muted fst-italic" style="font-size:0.75rem; margin-left: 1.25rem;">* Ghi chú: ${item.specialNote}</div>`
        : '';

      return `
        <div class="receipt-item-row">
          <div class="text-start pe-2" style="max-width: 68%;">
            <span class="fw-bold text-danger">${item.quantity}x</span> 
            <span class="fw-semibold text-dark">${item.productName}</span> 
            <span class="text-muted small">${optsText}</span>
            ${toppingsText}
            ${noteText}
          </div>
          <div class="receipt-row-value font-monospace fw-bold text-dark">
            ${formatVND(item.unitPrice * item.quantity)}
          </div>
        </div>
      `;
    }).join('');

    const receiptHtml = `
      <div class="pos-receipt-card text-start">
        <div class="pos-receipt-header">
          <div class="pos-receipt-title">HOÀNG GIA COFFEE</div>
          <div class="pos-receipt-subtitle">PHIẾU XÁC NHẬN ĐẶT ĐƠN HÀNG</div>
        </div>

        <div class="receipt-info-group">
          <div class="receipt-row">
            <span class="receipt-row-label">Kênh phục vụ:</span>
            <span class="receipt-row-value fw-bold text-dark">${channelText}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-row-label">Định danh:</span>
            <span class="receipt-row-value text-dark">${identifier}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-row-label">Khách hàng:</span>
            <span class="receipt-row-value text-dark">${orderMode.customerName} - ${orderMode.customerPhone}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-row-label">Số lượng món:</span>
            <span class="receipt-row-value text-primary fw-bold">${countDisplay}</span>
          </div>
        </div>

        <hr class="receipt-divider">

        <div class="fw-bold text-uppercase text-muted mb-1" style="font-size: 0.75rem; letter-spacing: 0.5px;">Danh sách đồ uống (${totalCups} cốc):</div>
        <div class="receipt-items-list">
          ${itemsHtml}
        </div>

        <hr class="receipt-divider">

        <div class="receipt-summary-group">
          <div class="receipt-row">
            <span class="receipt-row-label">Tạm tính món:</span>
            <span class="receipt-row-value text-dark">${formatVND(rawSubtotal)}</span>
          </div>
          ${productDiscount > 0 ? `
          <div class="receipt-row text-success">
            <span class="receipt-row-label text-success">Khuyến mãi món:</span>
            <span class="receipt-row-value">-${formatVND(productDiscount)}</span>
          </div>` : ''}
          ${appliedVoucher && voucherDiscount > 0 ? `
          <div class="receipt-row text-danger">
            <span class="receipt-row-label text-danger">Voucher (${appliedVoucher.code}):</span>
            <span class="receipt-row-value">-${formatVND(voucherDiscount)}</span>
          </div>` : ''}
          ${orderMode.type === 'Delivery' ? `
          <div class="receipt-row">
            <span class="receipt-row-label">Phí vận chuyển:</span>
            <span class="receipt-row-value text-dark">${effectiveShippingFee === 0 ? '0đ (Freeship)' : formatVND(effectiveShippingFee)}</span>
          </div>` : ''}

          <div class="receipt-total-row border-top pt-2 mt-2" style="border-top: 1.5px dashed #D4A359 !important;">
            <span class="receipt-total-label">TỔNG THANH TOÁN:</span>
            <span class="receipt-total-value">${formatVND(grandTotal)}</span>
          </div>
        </div>
      </div>
    `;

    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: '📋 XÁC NHẬN ĐẶT ĐƠN',
        html: receiptHtml,
        showCancelButton: true,
        showDenyButton: false,
        confirmButtonText: '<i class="bi bi-check-circle-fill me-1"></i> Xác Nhận Đặt',
        cancelButtonText: '<i class="bi bi-pencil-square me-1"></i> Kiểm Tra Lại',
        confirmButtonColor: '#C8102E',
        cancelButtonColor: '#6c757d',
        customClass: {
          popup: 'rounded-4 shadow-lg'
        }
      }).then((result) => {
        if (result.isConfirmed) {
          submitFinalCheckout(channelText, identifier, countDisplay, rawSubtotal, productDiscount, voucherDiscount, effectiveShippingFee, grandTotal);
        }
      });
    } else {
      if (confirm(`XÁC NHẬN ĐẶT ĐƠN:\nSố lượng: ${countDisplay}\nTổng thanh toán: ${formatVND(grandTotal)}\n\nBấm OK để gửi đơn tới quầy Bar!`)) {
        submitFinalCheckout(channelText, identifier, countDisplay, rawSubtotal, productDiscount, voucherDiscount, effectiveShippingFee, grandTotal);
      }
    }
  }

  async function submitFinalCheckout(channelText, identifier, countDisplay, rawSubtotal, productDiscount, voucherDiscount, effectiveShippingFee, grandTotal) {
    // === BUILD PAYLOAD cho /Order/PlaceOrder ===
    const orderPayload = {
      customerName:    orderMode.customerName,
      customerPhone:   orderMode.customerPhone,
      orderType:       orderMode.type,       // 'Delivery' | 'Pickup' | 'AtTable'
      deliveryAddress: orderMode.address || '',
      tableNumber:     orderMode.tableNumber || '',
      customerNote:    '',
      voucherCode:     appliedVoucher ? appliedVoucher.code : '',
      discountAmount:  voucherDiscount + productDiscount,
      shippingFee:     effectiveShippingFee,
      items: cart.map(item => ({
        productId:      item.productId || 0,
        productName:    item.productName,
        sizeName:       item.selectedSize ? item.selectedSize.code : 'S',
        unitBasePrice:  item.originalUnitPrice || item.unitPrice,
        sizeExtraPrice: item.selectedSize ? (item.selectedSize.extraPrice || 0) : 0,
        quantity:       item.quantity,
        sugarLevel:     item.sugarLevel || '100%',
        iceLevel:       item.iceLevel || '100%',
        selectedToppings: (item.selectedToppings || []).map(t => ({
          id:    t.id || 0,
          name:  t.name,
          price: t.price || 0
        })),
        specialNote: item.specialNote || ''
      }))
    };

    // === POST ĐƠN LÊN SERVER ===
    let serverOrderId = `ECO-${Date.now().toString().slice(-6)}`;
    try {
      const resp = await fetch('/Order/PlaceOrder', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(orderPayload)
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.orderId) serverOrderId = data.orderId;
      }
    } catch (err) {
      console.warn('[ECoffee] PlaceOrder API lỗi (offline?):', err);
      // Tiếp tục gracefully — đơn đã không lên server nhưng không block UX khách
    }

    // === HIỆN POPUP THÀNH CÔNG ===
    const receiptSuccessHtml = `
      <div class="pos-receipt-card text-start">
        <div class="pos-receipt-header">
          <span class="badge bg-success px-3 py-1 mb-1 shadow-sm" style="font-size: 0.82rem;">Đã chuyển tới quầy Bar Barista</span>
          <div class="pos-receipt-subtitle mt-1">Mã đơn: ${serverOrderId}</div>
        </div>

        <div class="receipt-info-group">
          <div class="receipt-row">
            <span class="receipt-row-label">Kênh phục vụ:</span>
            <span class="receipt-row-value fw-bold text-dark">${channelText}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-row-label">Định danh:</span>
            <span class="receipt-row-value text-dark">${identifier}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-row-label">Khách hàng:</span>
            <span class="receipt-row-value text-dark">${orderMode.customerName} - ${orderMode.customerPhone}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-row-label">Số lượng món:</span>
            <span class="receipt-row-value text-primary fw-bold">${countDisplay}</span>
          </div>
        </div>

        <hr class="receipt-divider">

        <div class="receipt-summary-group">
          <div class="receipt-row">
            <span class="receipt-row-label">Tạm tính món:</span>
            <span class="receipt-row-value text-dark">${formatVND(rawSubtotal)}</span>
          </div>
          ${productDiscount > 0 ? `
          <div class="receipt-row text-success">
            <span class="receipt-row-label text-success">Khuyến mãi món:</span>
            <span class="receipt-row-value">-${formatVND(productDiscount)}</span>
          </div>` : ''}
          ${appliedVoucher && voucherDiscount > 0 ? `
          <div class="receipt-row text-danger">
            <span class="receipt-row-label text-danger">Voucher (${appliedVoucher.code}):</span>
            <span class="receipt-row-value">-${formatVND(voucherDiscount)}</span>
          </div>` : ''}
          ${orderMode.type === 'Delivery' ? `
          <div class="receipt-row">
            <span class="receipt-row-label">Phí vận chuyển:</span>
            <span class="receipt-row-value text-dark">${effectiveShippingFee === 0 ? '0đ (Freeship)' : formatVND(effectiveShippingFee)}</span>
          </div>` : ''}

          <div class="receipt-total-row border-top pt-2 mt-2" style="border-top: 1.5px dashed #D4A359 !important;">
            <span class="receipt-total-label">TỔNG THANH TOÁN:</span>
            <span class="receipt-total-value">${formatVND(grandTotal)}</span>
          </div>
        </div>

        <p class="text-muted text-center small mt-3 mb-0" style="font-size: 0.8rem;">
          <i class="bi bi-heart-fill text-danger me-1"></i> Đơn hàng đã được chuyển tới quầy Bar barista! Cảm ơn Quý khách!
        </p>
      </div>
    `;

    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: '🎉 ĐẶT HÀNG THÀNH CÔNG!',
        html: receiptSuccessHtml,
        icon: 'success',
        confirmButtonText: 'Đóng & Đặt món mới',
        confirmButtonColor: '#C8102E',
        customClass: {
          popup: 'rounded-4 shadow-lg'
        }
      });
    } else {
      alert(`🎉 ĐẶT HÀNG THÀNH CÔNG!\n--------------------------------\nMã đơn: ${serverOrderId}\nKênh: ${channelText}\nĐịnh danh: ${identifier}\nKhách hàng: ${orderMode.customerName} - ${orderMode.customerPhone}\nSố lượng: ${countDisplay}\nTổng thanh toán: ${formatVND(grandTotal)}\n\nĐơn hàng đã được chuyển tới quầy Bar barista! Cảm ơn Quý khách!`);
    }

    cart = [];
    appliedVoucher = null;
    saveVoucher();
    saveCart();
    toggleCartDrawer(false);
  }

  function bindEvents() {
    // Esc key close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal('productCustomModal');
        closeModal('orderModeModal');
        toggleCartDrawer(false);
      }
    });
  }

  return {
    init,
    openCustomizationModal,
    onSizeChange,
    onSugarChange,
    onIceChange,
    toggleTopping,
    changeModalQty,
    confirmAddToCart,
    updateCartQty,
    removeFromCart,
    openOrderModeModal,
    selectOrderModeTab,
    saveOrderModeFromModal,
    getGpsLocation,
    onDeliveryAddressInput,
    onBranchSelectDelivery,
    onBranchSelectPickup,
    applyVoucherFromInput,
    applyVoucherCode,
    removeVoucher,
    closeModal,
    toggleCartDrawer,
    processCheckout,
    showToast
  };
})();

window.ECoffee = ECoffee;

document.addEventListener('DOMContentLoaded', ECoffee.init);

