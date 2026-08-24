/* ==========================================================================
   E-COFFEE - BAR / POS INTERFACE SCRIPT
   ========================================================================== */

const ECoffeeBar = (function () {
    let currentTarget = { type: 'table', id: 'T2', name: 'Bàn 02' };
    let cartItems = [];
    let tablesData = [];
    let onlineOrdersData = [];
    let currentPaymentMethod = 'cash';
    let currentDiscount = 0;

    function init() {
        startClock();
        loadInitialData();
        // Default select Table 02
        selectTable('Bàn 02');
    }

    function startClock() {
        const clockEl = document.getElementById('posClock');
        if (!clockEl) return;
        setInterval(() => {
            const now = new Date();
            clockEl.textContent = now.toLocaleTimeString('vi-VN');
        }, 1000);
    }

    function loadInitialData() {
        fetch('/Bar/GetTables')
            .then(res => res.json())
            .then(data => {
                tablesData = data;
            })
            .catch(err => console.error('Error fetching tables:', err));

        fetch('/Bar/GetOnlineOrders')
            .then(res => res.json())
            .then(data => {
                onlineOrdersData = data;
            })
            .catch(err => console.error('Error fetching online orders:', err));
    }

    // Tab Switching: Tables & Online vs Menu
    function switchTab(tabName) {
        const btnTables = document.getElementById('tab-tables-btn');
        const btnMenu = document.getElementById('tab-menu-btn');
        const contentTables = document.getElementById('tabTablesContent');
        const contentMenu = document.getElementById('tabMenuContent');

        if (tabName === 'tables') {
            btnTables?.classList.add('active');
            btnMenu?.classList.remove('active');
            contentTables?.classList.remove('d-none');
            contentMenu?.classList.add('d-none');
        } else {
            btnMenu?.classList.add('active');
            btnTables?.classList.remove('active');
            contentMenu?.classList.remove('d-none');
            contentTables?.classList.add('d-none');
        }
    }

    // Select Table
    function selectTable(tableName) {
        document.querySelectorAll('.table-item-card, .online-item-card').forEach(c => c.classList.remove('selected'));

        const tableCard = Array.from(document.querySelectorAll('.table-item-card')).find(c => c.getAttribute('data-table-name') === tableName);
        if (tableCard) {
            tableCard.classList.add('selected');
        }

        const table = tablesData.find(t => t.tableName.toLowerCase() === tableName.toLowerCase());
        currentTarget = { type: 'table', id: table ? table.tableId : tableName, name: tableName };

        if (table && table.items && table.items.length > 0) {
            cartItems = JSON.parse(JSON.stringify(table.items));
        } else {
            cartItems = [];
        }

        updateCartUI();
    }

    // Select Online Order
    function selectOnlineOrder(orderId) {
        document.querySelectorAll('.table-item-card, .online-item-card').forEach(c => c.classList.remove('selected'));

        const orderCard = Array.from(document.querySelectorAll('.online-item-card')).find(c => c.getAttribute('data-order-id') === orderId);
        if (orderCard) {
            orderCard.classList.add('selected');
        }

        const order = onlineOrdersData.find(o => o.orderId === orderId);
        const modeType = order && order.orderType === 2 ? 'delivery' : 'pickup';
        const modeLabel = modeType === 'delivery' ? 'Giao Tận Nơi' : 'Đến Lấy';
        currentTarget = { type: modeType, id: orderId, name: `${modeLabel} ${orderId}` };

        if (order && order.items && order.items.length > 0) {
            cartItems = JSON.parse(JSON.stringify(order.items));
        } else {
            cartItems = [];
        }

        updateCartUI();
    }

    // Create Takeaway / Pickup Order (Đơn mang đi / Đến lấy)
    function createTakeawayOrder() {
        document.querySelectorAll('.table-item-card, .online-item-card').forEach(c => c.classList.remove('selected'));
        currentTarget = { type: 'pickup', id: 'TAKEAWAY', name: 'Đến Lấy / Mang Đi (Takeaway)' };
        cartItems = [];
        updateCartUI();
    }

    // Alias for backward compatibility
    function resetToCounterOrder() {
        createTakeawayOrder();
    }

    // Update Right Panel Cart UI
    function updateCartUI() {
        const titleEl = document.getElementById('activeTargetTitle');
        if (titleEl) {
            titleEl.textContent = currentTarget.name;
        }

        const listEl = document.getElementById('posCartList');
        if (!listEl) return;

        if (cartItems.length === 0) {
            listEl.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="bi bi-cart-x fs-2 opacity-40"></i>
                    <div class="fw-bold mt-2" style="font-size: 0.85rem;">Chưa có món nào trong đơn</div>
                    <div style="font-size: 0.72rem;">Chọn món từ Thực đơn hoặc chọn bàn đã ngồi</div>
                </div>
            `;
        } else {
            let html = '';
            cartItems.forEach((item, index) => {
                const itemSinglePrice = (item.unitBasePrice + (item.selectedSize ? item.selectedSize.extraPrice : 0) + (item.selectedToppings ? item.selectedToppings.reduce((a, b) => a + b.price, 0) : 0));
                const itemTotal = itemSinglePrice * item.quantity;

                let sizeText = item.selectedSize ? item.selectedSize.name : '';
                let toppingsText = item.selectedToppings && item.selectedToppings.length > 0 ? item.selectedToppings.map(t => t.name).join(', ') : '';
                let optionsDetail = [sizeText, toppingsText].filter(Boolean).join(' | ');

                html += `
                    <div class="cart-row-item">
                        <div class="flex-fill pe-2">
                            <div class="fw-bold text-dark" style="font-size: 0.82rem; line-height: 1.2;">${item.productName}</div>
                            ${optionsDetail ? `<div class="text-muted" style="font-size: 0.7rem;">${optionsDetail}</div>` : ''}
                            <div class="fw-bold text-danger mt-1 font-monospace" style="font-size: 0.8rem;">${itemTotal.toLocaleString('vi-VN')}đ</div>
                        </div>
                        <div class="d-flex align-items-center gap-1.5">
                            <div class="qty-counter-group">
                                <button class="qty-counter-btn" onclick="ECoffeeBar.changeQty(${index}, -1)">-</button>
                                <span class="qty-counter-val">${item.quantity}</span>
                                <button class="qty-counter-btn" onclick="ECoffeeBar.changeQty(${index}, 1)">+</button>
                            </div>
                            <button class="btn btn-sm btn-link text-danger p-0 ms-1" onclick="ECoffeeBar.removeItem(${index})">
                                <i class="bi bi-trash3-fill" style="font-size: 0.85rem;"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            listEl.innerHTML = html;
        }

        // Calculate Totals
        const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        const subtotal = cartItems.reduce((sum, item) => {
            const itemSinglePrice = (item.unitBasePrice + (item.selectedSize ? item.selectedSize.extraPrice : 0) + (item.selectedToppings ? item.selectedToppings.reduce((a, b) => a + b.price, 0) : 0));
            return sum + (itemSinglePrice * item.quantity);
        }, 0);

        const grandTotal = Math.max(0, subtotal - currentDiscount);

        document.getElementById('cartTotalItemsCount').textContent = totalItems;
        document.getElementById('cartSubtotal').textContent = subtotal.toLocaleString('vi-VN') + 'đ';
        document.getElementById('cartDiscount').textContent = currentDiscount.toLocaleString('vi-VN') + 'đ';
        document.getElementById('cartGrandTotal').textContent = grandTotal.toLocaleString('vi-VN') + 'đ';
    }

    // Change Quantity
    function changeQty(index, delta) {
        if (cartItems[index]) {
            cartItems[index].quantity += delta;
            if (cartItems[index].quantity <= 0) {
                cartItems.splice(index, 1);
            }
            updateCartUI();
        }
    }

    // Remove Item
    function removeItem(index) {
        cartItems.splice(index, 1);
        updateCartUI();
    }

    // Open Product Option Modal via shared ECoffee modal
    function openProductOptionModal(productId) {
        const eco = window.ECoffee || (typeof ECoffee !== 'undefined' ? ECoffee : null);
        if (eco && typeof eco.openCustomizationModal === 'function') {
            eco.openCustomizationModal(productId);
        } else {
            console.error('ECoffee.openCustomizationModal is not available');
        }
    }

    // Callback when user confirms custom item from modal
    function addCustomizedItem(newItem) {
        if (!newItem) return;
        if (newItem.unitBasePrice === undefined) {
            newItem.unitBasePrice = newItem.unitPrice || 0;
        }

        const existing = cartItems.find(i => 
            i.productId === newItem.productId && 
            i.selectedSize?.code === newItem.selectedSize?.code &&
            i.sugarLevel === newItem.sugarLevel &&
            i.iceLevel === newItem.iceLevel &&
            JSON.stringify(i.selectedToppings || []) === JSON.stringify(newItem.selectedToppings || []) &&
            (i.specialNote || '') === (newItem.specialNote || '')
        );

        if (existing) {
            existing.quantity += newItem.quantity;
        } else {
            cartItems.push(newItem);
        }

        updateCartUI();
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `Đã thêm ${newItem.productName}`,
            showConfirmButton: false,
            timer: 1000
        });
    }

    // Filters for Tables & Order Modes
    function filterTables(type, btnEl) {
        document.querySelectorAll('.filter-chip-btn').forEach(b => b.classList.remove('active'));
        btnEl.classList.add('active');

        const storeSec = document.getElementById('sectionStoreTables');
        const deliverySec = document.getElementById('sectionDeliveryOrders');
        const pickupSec = document.getElementById('sectionPickupOrders');

        if (type === 'all') {
            storeSec?.classList.remove('d-none');
            deliverySec?.classList.remove('d-none');
            pickupSec?.classList.remove('d-none');
        } else if (type === 'table') {
            storeSec?.classList.remove('d-none');
            deliverySec?.classList.add('d-none');
            pickupSec?.classList.add('d-none');
        } else if (type === 'delivery') {
            storeSec?.classList.add('d-none');
            deliverySec?.classList.remove('d-none');
            pickupSec?.classList.add('d-none');
        } else if (type === 'pickup') {
            storeSec?.classList.add('d-none');
            deliverySec?.classList.add('d-none');
            pickupSec?.classList.remove('d-none');
        }
    }

    // Category Filter in Tab 2
    function filterCategory(catId, chipEl) {
        document.querySelectorAll('.menu-cat-btn').forEach(c => c.classList.remove('active'));
        chipEl.classList.add('active');

        const prods = document.querySelectorAll('.menu-prod-card');
        prods.forEach(p => {
            const pCat = parseInt(p.getAttribute('data-cat-id') || '0');
            if (catId === 0 || pCat === catId) {
                p.classList.remove('d-none');
            } else {
                p.classList.add('d-none');
            }
        });
    }

    // Product Search
    function searchProducts() {
        const q = (document.getElementById('inputSearchProduct')?.value || '').toLowerCase().trim();
        const prods = document.querySelectorAll('.menu-prod-card');
        prods.forEach(p => {
            const name = p.getAttribute('data-name') || '';
            if (!q || name.includes(q)) {
                p.classList.remove('d-none');
            } else {
                p.classList.add('d-none');
            }
        });
    }

    // Modal In Bill (Print Receipt)
    function openBillModal() {
        if (cartItems.length === 0) {
            Swal.fire('Thông báo', 'Đơn hàng chưa có món nào để in bill!', 'warning');
            return;
        }

        document.getElementById('billTargetName').innerHTML = `Vị trí: <strong>${currentTarget.name}</strong>`;
        document.getElementById('billNumber').textContent = `#HD-${Math.floor(1000 + Math.random() * 9000)}`;

        const now = new Date();
        document.getElementById('billDateTime').textContent = now.toLocaleDateString('vi-VN') + ' ' + now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        let bodyHtml = '';
        let subtotal = 0;

        cartItems.forEach(item => {
            const itemSinglePrice = (item.unitBasePrice + (item.selectedSize ? item.selectedSize.extraPrice : 0) + (item.selectedToppings ? item.selectedToppings.reduce((a, b) => a + b.price, 0) : 0));
            const itemTotal = itemSinglePrice * item.quantity;
            subtotal += itemTotal;

            bodyHtml += `
                <tr>
                    <td class="py-1">
                        <div><strong>${item.productName}</strong></div>
                        <div style="font-size:0.68rem; color:#555;">${item.selectedSize ? item.selectedSize.name : ''}</div>
                    </td>
                    <td class="text-center py-1 fw-bold">${item.quantity}</td>
                    <td class="text-end py-1">${itemSinglePrice.toLocaleString('vi-VN')}</td>
                    <td class="text-end py-1 fw-bold">${itemTotal.toLocaleString('vi-VN')}</td>
                </tr>
            `;
        });

        document.getElementById('billItemsBody').innerHTML = bodyHtml;
        document.getElementById('billSubtotal').textContent = subtotal.toLocaleString('vi-VN') + 'đ';
        document.getElementById('billDiscount').textContent = currentDiscount.toLocaleString('vi-VN') + 'đ';
        document.getElementById('billTotal').textContent = Math.max(0, subtotal - currentDiscount).toLocaleString('vi-VN') + 'đ';
        document.getElementById('billCashGiven').textContent = (document.getElementById('inputCashGiven')?.value ? parseInt(document.getElementById('inputCashGiven').value).toLocaleString('vi-VN') + 'đ' : '0đ');
        document.getElementById('billChangeReturned').textContent = document.getElementById('payChangeAmount')?.textContent || '0đ';

        const modal = new bootstrap.Modal(document.getElementById('billPrintModal'));
        modal.show();
    }

    // Trigger Browser Print
    function triggerPrint() {
        window.print();
    }

    // Modal Payment
    function openPaymentModal() {
        if (cartItems.length === 0) {
            Swal.fire('Thông báo', 'Giỏ hàng đang trống, không thể thanh toán!', 'warning');
            return;
        }

        const subtotal = cartItems.reduce((sum, item) => {
            const itemSinglePrice = (item.unitBasePrice + (item.selectedSize ? item.selectedSize.extraPrice : 0) + (item.selectedToppings ? item.selectedToppings.reduce((a, b) => a + b.price, 0) : 0));
            return sum + (itemSinglePrice * item.quantity);
        }, 0);
        const finalAmount = Math.max(0, subtotal - currentDiscount);
        const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

        document.getElementById('payTargetTitle').textContent = currentTarget.name;
        document.getElementById('payFinalAmount').textContent = finalAmount.toLocaleString('vi-VN') + 'đ';
        document.getElementById('payItemSummary').textContent = `Gồm ${totalItems} món trong đơn`;

        // Render Quick Cash Suggestion Chips
        const cashChipsEl = document.getElementById('cashQuickChips');
        if (cashChipsEl) {
            const suggestions = [finalAmount, 50000, 100000, 200000, 500000].filter(a => a >= finalAmount);
            const uniqueSuggestions = [...new Set(suggestions)].sort((a, b) => a - b);

            let chipsHtml = '';
            uniqueSuggestions.forEach(amt => {
                chipsHtml += `
                    <button type="button" class="btn btn-sm btn-outline-secondary font-monospace fw-bold rounded-pill" onclick="ECoffeeBar.fillCashGiven(${amt})">
                        ${amt.toLocaleString('vi-VN')}đ
                    </button>
                `;
            });
            cashChipsEl.innerHTML = chipsHtml;
        }

        selectPayMethod('cash');
        document.getElementById('inputCashGiven').value = finalAmount;
        calculateChange();

        const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
        modal.show();
    }

    function selectPayMethod(method) {
        currentPaymentMethod = method;
        document.getElementById('btnPayCash')?.classList.toggle('active', method === 'cash');
        document.getElementById('btnPayQr')?.classList.toggle('active', method === 'qr');
        document.getElementById('btnPayCard')?.classList.toggle('active', method === 'card');

        document.getElementById('cashPaySection')?.classList.toggle('d-none', method !== 'cash');
        document.getElementById('qrPaySection')?.classList.toggle('d-none', method !== 'qr');
        document.getElementById('cardPaySection')?.classList.toggle('d-none', method !== 'card');
    }

    function fillCashGiven(amt) {
        const input = document.getElementById('inputCashGiven');
        if (input) {
            input.value = amt;
            calculateChange();
        }
    }

    function calculateChange() {
        const subtotal = cartItems.reduce((sum, item) => {
            const itemSinglePrice = (item.unitBasePrice + (item.selectedSize ? item.selectedSize.extraPrice : 0) + (item.selectedToppings ? item.selectedToppings.reduce((a, b) => a + b.price, 0) : 0));
            return sum + (itemSinglePrice * item.quantity);
        }, 0);
        const finalAmount = Math.max(0, subtotal - currentDiscount);
        const cashGiven = parseFloat(document.getElementById('inputCashGiven')?.value || '0');
        const change = Math.max(0, cashGiven - finalAmount);

        const changeEl = document.getElementById('payChangeAmount');
        if (changeEl) {
            changeEl.textContent = change.toLocaleString('vi-VN') + 'đ';
        }
    }

    // Confirm Checkout
    function confirmCheckout() {
        const subtotal = cartItems.reduce((sum, item) => {
            const itemSinglePrice = (item.unitBasePrice + (item.selectedSize ? item.selectedSize.extraPrice : 0) + (item.selectedToppings ? item.selectedToppings.reduce((a, b) => a + b.price, 0) : 0));
            return sum + (itemSinglePrice * item.quantity);
        }, 0);
        const finalAmount = Math.max(0, subtotal - currentDiscount);
        const cashGiven = parseFloat(document.getElementById('inputCashGiven')?.value || '0');
        const change = Math.max(0, cashGiven - finalAmount);

        const reqBody = {
            targetType: currentTarget.type,
            targetId: currentTarget.id,
            paymentMethod: currentPaymentMethod,
            totalAmount: subtotal,
            discountAmount: currentDiscount,
            finalAmount: finalAmount,
            cashGiven: cashGiven,
            changeReturned: change,
            notes: document.getElementById('inputCashierNote')?.value || '',
            items: cartItems
        };

        fetch('/Bar/Checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reqBody)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const payModalEl = document.getElementById('paymentModal');
                const modalInstance = bootstrap.Modal.getInstance(payModalEl);
                if (modalInstance) modalInstance.hide();

                Swal.fire({
                    icon: 'success',
                    title: 'Thanh toán thành công!',
                    text: `Đã hoàn tất đơn ${currentTarget.name}. Bạn có muốn in hóa đơn ngay không?`,
                    showCancelButton: true,
                    confirmButtonText: 'In Bill Ngay',
                    cancelButtonText: 'Đóng'
                }).then((res) => {
                    if (res.isConfirmed) {
                        openBillModal();
                    }
                    loadInitialData();
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                });
            } else {
                Swal.fire('Lỗi', data.message || 'Thanh toán thất bại', 'error');
            }
        })
        .catch(err => {
            console.error('Checkout error:', err);
            Swal.fire('Lỗi', 'Không thể kết nối máy chủ thanh toán', 'error');
        });
    }

    return {
        init: init,
        switchTab: switchTab,
        selectTable: selectTable,
        selectOnlineOrder: selectOnlineOrder,
        createTakeawayOrder: createTakeawayOrder,
        resetToCounterOrder: resetToCounterOrder,
        changeQty: changeQty,
        removeItem: removeItem,
        openProductOptionModal: openProductOptionModal,
        addCustomizedItem: addCustomizedItem,
        filterTables: filterTables,
        filterCategory: filterCategory,
        searchProducts: searchProducts,
        openBillModal: openBillModal,
        triggerPrint: triggerPrint,
        openPaymentModal: openPaymentModal,
        selectPayMethod: selectPayMethod,
        fillCashGiven: fillCashGiven,
        calculateChange: calculateChange,
        confirmCheckout: confirmCheckout
    };
})();

window.ECoffeeBar = ECoffeeBar;

document.addEventListener('DOMContentLoaded', function () {
    ECoffeeBar.init();
});
