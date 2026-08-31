/* ==========================================================================
   E-COFFEE - BAR / POS INTERFACE SCRIPT (AJAX & REPOSITORY POWERED)
   ========================================================================== */

const ECoffeeBar = (function () {
    let currentTarget = { type: 'table', id: 'T2', name: 'Bàn 02' };
    let cartItems = [];
    let draftCarts = {}; // Lưu nháp giỏ hàng theo từng Bàn / Đơn: targetKey -> { items: [...], voucher: {...} }
    let tablesData = [];
    let onlineOrdersData = [];
    let orderHistoryData = [];
    let categoriesData = [];
    let productsData = [];
    let activeCategoryId = 0;
    let currentSearchQuery = '';
    let currentPaymentMethod = 'cash';
    let currentDiscount = 0;
    let appliedVoucher = null;
    let currentCustomer = { name: 'Khách vãng lai', phone: '', note: '' };
    let phoneDebounceTimer = null;

    // Helper sinh key định danh duy nhất cho từng đối tượng order/bàn
    function getTargetKey(target) {
        if (!target) return 'default';
        if (target.type === 'table') {
            return `table_${(target.name || target.id || '').toLowerCase()}`;
        }
        if (target.type === 'pickup' && (target.id === 'TAKEAWAY' || !target.id)) {
            return 'takeaway_draft';
        }
        return `order_${target.id}`;
    }

    // Helper tự động lưu nháp giỏ hàng của đối tượng đang thao tác
    function saveDraftForCurrentTarget() {
        if (!currentTarget) return;
        const key = getTargetKey(currentTarget);
        if (cartItems && cartItems.length > 0) {
            draftCarts[key] = {
                items: JSON.parse(JSON.stringify(cartItems)),
                voucher: appliedVoucher ? JSON.parse(JSON.stringify(appliedVoucher)) : null,
                customer: JSON.parse(JSON.stringify(currentCustomer))
            };
        } else {
            delete draftCarts[key];
        }
    }

    // Cấu hình tài khoản ngân hàng nhận thanh toán (VietQR)
    const BANK_CONFIG = {
        bankId: 'vpbank',                 // VPBank (VietQR standard identifier)
        bankName: 'VPBank',               // Ngân hàng TMCP Việt Nam Thịnh Vượng
        accountNo: '2227036888',          // STK VPBank
        accountName: 'HOANG GIA E-COFFEE', // Tên tài khoản hiển thị
        template: 'compact2'              // Mẫu VietQR: 'compact2' | 'compact' | 'qr_only'
    };

    // Helper tạo link ảnh VietQR động theo số tiền & nội dung chuyển khoản
    function generateVietQrUrl(amount, description) {
        const amt = Math.max(0, Math.round(amount || 0));
        const info = (description || 'THANH TOAN').trim();
        return `https://img.vietqr.io/image/${BANK_CONFIG.bankId}-${BANK_CONFIG.accountNo}-${BANK_CONFIG.template}.png?amount=${amt}&addInfo=${encodeURIComponent(info)}&accountName=${encodeURIComponent(BANK_CONFIG.accountName)}`;
    }

    // Helper đọc số tiền thành chữ tiếng Việt chuẩn
    function readVietnameseCurrency(amount) {
        if (isNaN(amount) || amount === null || amount === undefined) return '';
        amount = Math.round(Math.abs(amount));
        if (amount === 0) return 'Không đồng';

        const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
        const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

        function readTriple(triple, showZeroHundred) {
            let h = Math.floor(triple / 100);
            let t = Math.floor((triple % 100) / 10);
            let u = triple % 10;
            let res = '';

            if (h > 0 || showZeroHundred) {
                res += digits[h] + ' trăm ';
                if (t === 0 && u > 0) res += 'linh ';
            }

            if (t > 1) {
                res += digits[t] + ' mươi ';
                if (u === 1) res += 'mốt ';
                else if (u === 5) res += 'lăm ';
                else if (u > 0) res += digits[u] + ' ';
            } else if (t === 1) {
                res += 'mười ';
                if (u === 1) res += 'một ';
                else if (u === 5) res += 'lăm ';
                else if (u > 0) res += digits[u] + ' ';
            } else if (t === 0 && u > 0 && !res.includes('linh')) {
                if (showZeroHundred) res += 'linh ';
                res += digits[u] + ' ';
            } else if (t === 0 && u > 0 && res.includes('linh')) {
                res += digits[u] + ' ';
            }

            return res.trim();
        }

        let str = amount.toString();
        let groups = [];
        while (str.length > 0) {
            groups.push(parseInt(str.slice(-3), 10));
            str = str.slice(0, -3);
        }

        let result = '';
        for (let i = groups.length - 1; i >= 0; i--) {
            let g = groups[i];
            if (g > 0) {
                let showZeroHundred = (i < groups.length - 1);
                let gText = readTriple(g, showZeroHundred);
                result += gText + ' ' + units[i] + ' ';
            }
        }

        result = result.trim() + ' đồng';
        result = result.replace(/\s+/g, ' ');
        return result.charAt(0).toUpperCase() + result.slice(1);
    }

    // Helper định dạng thời lượng khách đã ngồi tại bàn tính theo thời gian thực phía Client
    function formatOccupiedDuration(occupiedTime) {
        if (!occupiedTime) return '';
        const occDate = new Date(occupiedTime);
        if (isNaN(occDate.getTime())) return '';
        const now = new Date();
        const diffMs = Math.max(0, now.getTime() - occDate.getTime());
        const totalMinutes = Math.floor(diffMs / 60000);
        if (totalMinutes < 60) {
            return `${totalMinutes} phút`;
        }
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return `${hours}h ${mins}m`;
    }

    // Tự động cập nhật số phút/giờ đã ngồi trên tất cả các thẻ bàn đang hoạt động
    function updateTableDurationTimers() {
        const timerEls = document.querySelectorAll('.table-duration-timer');
        timerEls.forEach(el => {
            const occTime = el.getAttribute('data-occupied-time');
            if (occTime) {
                const textSpan = el.querySelector('.duration-text');
                const formatted = formatOccupiedDuration(occTime);
                if (textSpan && formatted) {
                    textSpan.textContent = formatted;
                }
            }
        });
    }

    let durationTimerInterval = null;
    function startDurationTimer() {
        if (durationTimerInterval) clearInterval(durationTimerInterval);
        updateTableDurationTimers();
        // Cập nhật lại mỗi 5 giây để nhảy số chính xác ngay khi tròn phút
        durationTimerInterval = setInterval(updateTableDurationTimers, 5000);
    }

    function init() {
        startClock();
        startDurationTimer();
        loadInitialData(false);
    }

    function startClock() {
        const clockEl = document.getElementById('posClock');
        if (!clockEl) return;
        setInterval(() => {
            const now = new Date();
            clockEl.textContent = now.toLocaleTimeString('vi-VN');
        }, 1000);
    }

    // =========================================================================
    // AJAX DATA LOADERS (Calling Controller -> Service -> Repository -> DB)
    // =========================================================================
    function loadInitialData(keepCurrentTarget = false) {
        // 1. Tải danh sách Bàn từ DB qua AJAX
        fetch('/Bar/GetTables')
            .then(res => res.json())
            .then(data => {
                tablesData = data || [];
                renderTablesGrid();
                updateStoreStats();

                // Nếu là lần đầu mở app, load mặc định Bàn 02
                if (!keepCurrentTarget && currentTarget.type === 'table') {
                    selectTable(currentTarget.name || 'Bàn 02');
                }
            })
            .catch(err => console.error('Error fetching tables:', err));

        // 2. Tải danh sách Đơn Online từ DB qua AJAX
        fetch('/Bar/GetOnlineOrders')
            .then(res => res.json())
            .then(data => {
                onlineOrdersData = data || [];
                renderOnlineOrders();
                updateStoreStats();
            })
            .catch(err => console.error('Error fetching online orders:', err));

        // 3. Tải danh mục thực đơn từ DB qua AJAX
        fetch('/Bar/GetCategories')
            .then(res => res.json())
            .then(data => {
                categoriesData = data || [];
                renderCategoryChips();
            })
            .catch(err => console.error('Error fetching categories:', err));

        // 4. Tải danh sách món từ DB qua AJAX
        fetch('/Bar/GetProducts')
            .then(res => res.json())
            .then(data => {
                productsData = data || [];
                renderProductsGrid();
                const menuBadge = document.getElementById('tabMenuBadge');
                if (menuBadge) menuBadge.textContent = `${productsData.length} món`;
            })
            .catch(err => console.error('Error fetching products:', err));

        // 5. Tải lịch sử đơn (song song)
        fetch('/Bar/GetOrderHistory')
            .then(res => res.json())
            .then(data => {
                orderHistoryData = data || [];
                updateHistoryBadge();
            })
            .catch(err => console.error('Error fetching order history:', err));
    }

    // Cập nhật các chỉ số tổng quan ở header banner
    function updateStoreStats() {
        const emptyCount = tablesData.filter(t => t.status === 0).length;
        const occupiedCount = tablesData.filter(t => t.status === 1).length;
        const onlineCount = onlineOrdersData.filter(o => o.status === 1 || o.status === 2).length;

        const statEmptyEl = document.getElementById('statEmptyCount');
        const statOccupiedEl = document.getElementById('statOccupiedCount');
        const statOnlineEl = document.getElementById('statOnlineCount');
        const tabTablesBadgeEl = document.getElementById('tabTablesBadge');

        if (statEmptyEl) statEmptyEl.textContent = emptyCount;
        if (statOccupiedEl) statOccupiedEl.textContent = occupiedCount;
        if (statOnlineEl) statOnlineEl.textContent = onlineCount;
        if (tabTablesBadgeEl) tabTablesBadgeEl.textContent = tablesData.length;
    }

    // Render danh sách bàn động từ dữ liệu DB
    function renderTablesGrid() {
        const grid = document.getElementById('tablesGrid');
        if (!grid) return;

        if (tablesData.length === 0) {
            grid.innerHTML = '<div class="text-center text-muted py-4 col-12">Không có dữ liệu bàn</div>';
            return;
        }

        let html = '';
        tablesData.forEach(table => {
            const isOccupied = table.status === 1;
            const statusClass = isOccupied ? 'occupied' : 'empty';
            const statusText = isOccupied ? 'Đang ngồi' : 'Trống';
            const statusPillClass = isOccupied ? 'status-occupied' : 'status-empty';
            const isSelected = (currentTarget.type === 'table' && currentTarget.name === table.tableName) ? 'selected' : '';
            const occTime = table.occupiedTime || table.OccupiedTime || '';
            const durationDisplay = isOccupied ? (formatOccupiedDuration(occTime) || table.displayDuration || 'Mới ngồi') : '';

            html += `
                <div class="table-item-card ${statusClass} ${isSelected}" data-table-id="${table.tableId}" data-table-name="${table.tableName}" onclick="ECoffeeBar.selectTable('${table.tableName}')">
                    <div class="d-flex justify-content-between align-items-start gap-1">
                        <div class="overflow-hidden">
                            <div class="table-title text-truncate">${table.tableName}</div>
                            <div class="table-zone text-truncate" style="max-width: 100px;" title="${table.zone}">${table.zone}</div>
                        </div>
                        <span class="table-status-pill ${statusPillClass} flex-shrink-0">${statusText}</span>
                    </div>

                    <div class="mt-2 pt-1.5 border-top">
                        ${isOccupied ? `
                            ${table.customerName ? `
                                <div class="fw-bold text-dark text-truncate mb-1" style="font-size: 0.75rem;">
                                    <i class="bi bi-person-fill text-primary me-0.5"></i>${table.customerName} ${table.customerPhone ? `(${table.customerPhone})` : ''}
                                </div>
                            ` : ''}
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="style-italic table-duration-timer" data-occupied-time="${occTime}" style="font-size: 0.72rem; color: #ea580c;">
                                    <i class="bi bi-clock"></i> <span class="duration-text">${durationDisplay}</span>
                                </span>
                                <div class="d-flex align-items-center gap-1">
                                    <span class="fw-bold text-secondary" style="font-size: 0.72rem;">${table.itemCount} món -</span>
                                    <span class="table-amount mb-0" style="font-size: 0.85rem;">${(table.totalAmount || 0).toLocaleString('vi-VN')}đ</span>
                                </div>
                            </div>
                        ` : `
                            <div class="text-muted" style="font-size: 0.72rem;">Sẵn sàng đón khách</div>
                        `}
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;
    }

    // Render danh sách Đơn Giao tận nơi và Đơn Đến lấy từ DB
    function renderOnlineOrders() {
        const deliveryGrid = document.getElementById('deliveryOrdersGrid');
        const pickupGrid = document.getElementById('pickupOrdersGrid');

        const deliveryOrders = onlineOrdersData.filter(o => o.orderType === 2); // 2 = Delivery
        const pickupOrders = onlineOrdersData.filter(o => o.orderType === 3);   // 3 = Pickup

        if (deliveryGrid) {
            let delHtml = '';
            deliveryOrders.forEach(order => {
                const isPending = order.status === 1;
                const isPrep = order.status === 2;
                const statusBadge = isPending ? 'bg-danger' : 'bg-warning text-dark';
                const statusName = isPending ? 'Chờ pha chế' : 'Đang pha chế';
                const isSelected = (currentTarget.id === order.OrderId) ? 'selected' : '';
                const canCancel = isPending || isPrep;

                const orderTimeStr = order.orderTime ? new Date(order.orderTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';

                delHtml += `
                    <div class="online-item-card ${isSelected}" data-order-id="${order.orderId}" onclick="ECoffeeBar.selectOnlineOrder('${order.orderId}')">
                        <div class="d-flex align-items-center justify-content-between mb-1">
                            <span class="fw-extrabold text-dark" style="font-size: 0.95rem;">${order.orderId}</span>
                            <div class="d-flex gap-1">
                                <span class="badge bg-primary" style="font-size: 0.68rem;">Giao tận nơi</span>
                                <span class="badge ${statusBadge}" style="font-size: 0.68rem;">${statusName}</span>
                            </div>
                        </div>
                        <div class="fw-bold text-dark" style="font-size: 0.85rem;">${order.customerName} - ${order.customerPhone}</div>
                        <div class="text-muted text-truncate" style="font-size: 0.75rem;"><i class="bi bi-geo-alt me-1"></i>${order.deliveryAddress || ''}</div>
                        <div class="d-flex justify-content-between align-items-center mt-2 pt-1.5 border-top">
                            <span class="text-secondary style-italic" style="font-size: 0.72rem;"><i class="bi bi-clock"></i> ${orderTimeStr}</span>
                            <span class="fw-bold text-danger" style="font-size: 0.88rem;">${(order.totalAmount || 0).toLocaleString('vi-VN')}đ (${order.itemCount} món)</span>
                        </div>
                        ${canCancel ? `
                        <div class="mt-2 pt-1 border-top">
                            <button class="btn btn-sm btn-outline-danger w-100" style="font-size:0.73rem;padding:3px 8px;" onclick="ECoffeeBar.cancelOnlineOrder('${order.orderId}'); event.stopPropagation();">
                                <i class="bi bi-x-circle me-1"></i>Hủy Đơn
                            </button>
                        </div>` : ''}
                    </div>
                `;
            });
            deliveryGrid.innerHTML = delHtml || '<div class="text-muted small py-3 col-12 text-center">Không có đơn giao tận nơi</div>';
        }

        if (pickupGrid) {
            let pickHtml = `
                <div class="online-item-card border-dashed d-flex flex-column align-items-center justify-content-center text-center p-3" style="border-style: dashed !important; border-color: #f59e0b !important; background: #fffdfb; min-height: 110px;" onclick="ECoffeeBar.createTakeawayOrder()">
                    <div class="bg-warning bg-opacity-20 text-warning-emphasis rounded-circle d-flex align-items-center justify-content-center mb-1.5" style="width: 32px; height: 32px;">
                        <i class="bi bi-plus-lg fs-6"></i>
                    </div>
                    <div class="fw-bold text-dark small">+ Tạo Đơn Mang Đi Mới</div>
                    <div class="text-muted" style="font-size: 0.72rem;">Khách gọi đồ mang đi tại quầy</div>
                </div>
            `;

            pickupOrders.forEach(order => {
                const isPending = order.status === 1;
                const isPrep = order.status === 2;
                const statusBadge = isPending ? 'bg-danger' : 'bg-warning text-dark';
                const statusName = isPending ? 'Chờ pha chế' : 'Đang pha chế';
                const isSelected = (currentTarget.id === order.orderId) ? 'selected' : '';
                const orderTimeStr = order.orderTime ? new Date(order.orderTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
                const canCancel = isPending || isPrep;

                pickHtml += `
                    <div class="online-item-card ${isSelected}" data-order-id="${order.orderId}" onclick="ECoffeeBar.selectOnlineOrder('${order.orderId}')">
                        <div class="d-flex align-items-center justify-content-between mb-1">
                            <span class="fw-extrabold text-dark" style="font-size: 0.95rem;">${order.orderId}</span>
                            <div class="d-flex gap-1">
                                <span class="badge bg-info text-dark" style="font-size: 0.68rem;">Đến lấy / Mang đi</span>
                                <span class="badge ${statusBadge}" style="font-size: 0.68rem;">${statusName}</span>
                            </div>
                        </div>
                        <div class="fw-bold text-dark" style="font-size: 0.85rem;">${order.customerName} - ${order.customerPhone}</div>
                        <div class="text-muted text-truncate" style="font-size: 0.75rem;"><i class="bi bi-info-circle me-1"></i>${order.deliveryAddress || ''}</div>
                        <div class="d-flex justify-content-between align-items-center mt-2 pt-1.5 border-top">
                            <span class="text-secondary style-italic" style="font-size: 0.72rem;"><i class="bi bi-clock"></i> ${orderTimeStr}</span>
                            <span class="fw-bold text-danger" style="font-size: 0.88rem;">${(order.totalAmount || 0).toLocaleString('vi-VN')}đ (${order.itemCount} món)</span>
                        </div>
                        ${canCancel ? `
                        <div class="mt-2 pt-1 border-top">
                            <button class="btn btn-sm btn-outline-danger w-100" style="font-size:0.73rem;padding:3px 8px;" onclick="ECoffeeBar.cancelOnlineOrder('${order.orderId}'); event.stopPropagation();">
                                <i class="bi bi-x-circle me-1"></i>Hủy Đơn
                            </button>
                        </div>` : ''}
                    </div>
                `;
            });
            pickupGrid.innerHTML = pickHtml;
        }
    }

    // Render danh mục thực đơn động
    function renderCategoryChips() {
        const catContainer = document.getElementById('menuCatChips');
        if (!catContainer) return;

        let html = `<button class="menu-cat-btn ${activeCategoryId === 0 ? 'active' : ''}" onclick="ECoffeeBar.filterCategory(0, this)">Tất Cả Món</button>`;
        categoriesData.forEach(cat => {
            html += `
                <button class="menu-cat-btn ${activeCategoryId === cat.id ? 'active' : ''}" onclick="ECoffeeBar.filterCategory(${cat.id}, this)">
                    <i class="bi ${cat.icon} me-1"></i>${cat.name}
                </button>
            `;
        });
        catContainer.innerHTML = html;
    }

    // Render danh sách sản phẩm động từ DB
    function renderProductsGrid() {
        const grid = document.getElementById('posProductsGrid');
        if (!grid) return;

        let filtered = productsData;
        if (activeCategoryId > 0) {
            filtered = filtered.filter(p => p.categoryId === activeCategoryId);
        }
        if (currentSearchQuery) {
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(currentSearchQuery) || 
                (p.description && p.description.toLowerCase().includes(currentSearchQuery))
            );
        }

        if (filtered.length === 0) {
            grid.innerHTML = '<div class="text-center text-muted py-5 col-12"><i class="bi bi-search fs-2"></i><div class="mt-2">Không tìm thấy món phù hợp</div></div>';
            return;
        }

        let html = '';
        filtered.forEach(prod => {
            const hasPromo = prod.hasPromo || (prod.promoPrice && prod.promoPrice > 0 && prod.promoPrice < prod.basePrice);
            const effectivePrice = hasPromo ? prod.promoPrice : prod.basePrice;

            html += `
                <div class="menu-prod-card" data-cat-id="${prod.categoryId}" data-name="${prod.name.toLowerCase()}" onclick="ECoffeeBar.openProductOptionModal(${prod.id})">
                    <div class="position-relative">
                        ${prod.badge ? `
                            <span class="badge bg-danger rounded-pill position-absolute top-0 start-0 m-1.5 shadow-sm" style="font-size: 0.65rem; z-index: 1;">
                                ${prod.badge}
                            </span>
                        ` : ''}
                        <img src="${prod.imageUrl}" alt="${prod.name}" class="menu-prod-img" onerror="this.src='https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80'">
                    </div>
                    <div class="menu-prod-body">
                        <div>
                            <div class="menu-prod-name">${prod.name}</div>
                            <div class="text-muted" style="font-size: 0.7rem;">${prod.categoryName || ''}</div>
                        </div>
                        <div class="d-flex align-items-center justify-content-between mt-2 gap-1">
                            <div class="d-flex align-items-baseline gap-1 flex-wrap min-w-0">
                                ${hasPromo ? `
                                    <span class="menu-prod-price">${(effectivePrice || 0).toLocaleString('vi-VN')}đ</span>
                                    <span class="text-muted text-decoration-line-through" style="font-size: 0.7rem;">${(prod.basePrice || 0).toLocaleString('vi-VN')}đ</span>
                                ` : `
                                    <span class="menu-prod-price">${(prod.basePrice || 0).toLocaleString('vi-VN')}đ</span>
                                `}
                            </div>
                            <button type="button" class="btn-add-item-soft" onclick="ECoffeeBar.openProductOptionModal(${prod.id}); event.stopPropagation();">Chọn</button>
                        </div>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;
    }

    // Tab Switching: Tables & Online vs Menu vs History
    function switchTab(tabName) {
        const btnTables = document.getElementById('tab-tables-btn');
        const btnMenu = document.getElementById('tab-menu-btn');
        const btnHistory = document.getElementById('tab-history-btn');
        const contentTables = document.getElementById('tabTablesContent');
        const contentMenu = document.getElementById('tabMenuContent');
        const contentHistory = document.getElementById('tabHistoryContent');

        // Reset all
        [btnTables, btnMenu, btnHistory].forEach(b => b?.classList.remove('active'));
        [contentTables, contentMenu, contentHistory].forEach(c => c?.classList.add('d-none'));

        if (tabName === 'tables') {
            btnTables?.classList.add('active');
            contentTables?.classList.remove('d-none');
        } else if (tabName === 'menu') {
            btnMenu?.classList.add('active');
            contentMenu?.classList.remove('d-none');
        } else if (tabName === 'history') {
            btnHistory?.classList.add('active');
            contentHistory?.classList.remove('d-none');
            // Load mới nhất khi vào tab
            loadOrderHistory();
        }
    }

    // ==========================================================================
    // LỊCH SỬ THANH TOÁN
    // ==========================================================================

    function updateHistoryBadge() {
        const badge = document.getElementById('tabHistoryBadge');
        if (badge) badge.textContent = orderHistoryData.length;
        const totalBadge = document.getElementById('historyTotalBadge');
        if (totalBadge) totalBadge.textContent = `${orderHistoryData.length} đơn`;
    }

    function loadOrderHistory() {
        fetch('/Bar/GetOrderHistory')
            .then(res => res.json())
            .then(data => {
                orderHistoryData = data || [];
                updateHistoryBadge();
                renderOrderHistory(orderHistoryData);
            })
            .catch(err => {
                console.error('Error loading order history:', err);
            });
    }

    function renderOrderHistory(data) {
        const tbody = document.getElementById('historyTableBody');
        if (!tbody) return; // Bảng đã render server-side nếu có dữ liệu ban đầu

        const payMethodLabel = (m) => {
            if (!m) return `<span class='text-muted'>&#8212;</span>`;
            if (m === 'qr' || m === 'Chuyển khoản QR') return `<i class='bi bi-qr-code-scan'></i> QR`;
            if (m === 'card' || m === 'Thẻ') return `<i class='bi bi-credit-card'></i> Thẻ`;
            if (m === 'cash' || m === 'Tiền mặt') return `<i class='bi bi-cash'></i> Tiền mặt`;
            return m;
        };

        if (data.length === 0) {
            const container = document.getElementById('historyListContainer');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-5 text-muted">
                        <i class="bi bi-inbox fs-2 opacity-40"></i>
                        <div class="fw-bold mt-2" style="font-size: 0.85rem;">Chưa có đơn nào hôm nay</div>
                    </div>`;
            }
            return;
        }

        let html = '';
        data.forEach(h => {
            const isCompleted = h.finalStatus === 4;
            const rowClass = isCompleted ? '' : 'table-danger';
            const badgeClass = isCompleted ? 'bg-success' : 'bg-danger';
            const statusLabel = isCompleted ? 'Đã TT' : 'Đã hủy';
            const histStatus = isCompleted ? 'completed' : 'cancelled';

            const orderTime = h.closedAt ? new Date(h.closedAt) : new Date();
            const timeStr = orderTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const dateStr = `${String(orderTime.getDate()).padStart(2,'0')}/${String(orderTime.getMonth()+1).padStart(2,'0')}`;

            const typeBg = h.orderType === 2 ? 'bg-primary'
                         : (h.orderTypeLabel === 'Tại bàn') ? 'bg-secondary'
                         : 'bg-info text-dark';

            const cancelNote = h.cancelReason ? `<div class="text-muted text-truncate" style="font-size:0.65rem;max-width:80px;" title="${h.cancelReason}">${h.cancelReason}</div>` : '';
            const phoneHtml = h.customerPhone ? `<div class="text-muted font-monospace" style="font-size:0.7rem;">${h.customerPhone}</div>` : '';
            const discountHtml = h.discountAmount > 0 ? `<div class="text-success" style="font-size:0.68rem;">-${(h.discountAmount||0).toLocaleString('vi-VN')}đ</div>` : '';

            html += `
                <tr class="${rowClass}" data-history-status="${histStatus}" onclick="ECoffeeBar.viewHistoryDetail('${h.orderId}')" style="cursor:pointer;">
                    <td><span class="fw-bold font-monospace text-dark" style="font-size:0.78rem;">${h.orderId}</span></td>
                    <td>
                        <div class="fw-semibold text-dark text-truncate" style="max-width:130px;" title="${h.customerName}">${h.customerName}</div>
                        ${phoneHtml}
                    </td>
                    <td><span class="badge ${typeBg}" style="font-size:0.65rem;">${h.orderTypeLabel || 'Đơn'}</span></td>
                    <td>
                        <div style="font-size:0.73rem;">${timeStr}</div>
                        <div class="text-muted" style="font-size:0.68rem;">${dateStr}</div>
                    </td>
                    <td>
                        <div class="fw-bold text-danger" style="font-size:0.82rem;">${(h.finalAmount||0).toLocaleString('vi-VN')}đ</div>
                        ${discountHtml}
                    </td>
                    <td><span style="font-size:0.72rem;">${payMethodLabel(h.paymentMethod)}</span></td>
                    <td>
                        <span class="badge ${badgeClass}" style="font-size:0.65rem;">${statusLabel}</span>
                        ${cancelNote}
                    </td>
                </tr>`;
        });

        // Rebuild bảng nếu cần (trường hợp ban đầu empty)
        const container = document.getElementById('historyListContainer');
        if (container && !document.getElementById('historyTable')) {
            container.innerHTML = `
                <div class="history-table-wrapper">
                    <table class="table table-sm table-hover mb-0" id="historyTable" style="font-size: 0.8rem;">
                        <thead class="table-light sticky-top">
                            <tr>
                                <th style="width:120px;">Mã đơn</th>
                                <th>Khách hàng</th>
                                <th style="width:100px;">Loại đơn</th>
                                <th style="width:80px;">Đưa đơn lúc</th>
                                <th style="width:95px;">Thành tiền</th>
                                <th style="width:80px;">Thanh toán</th>
                                <th style="width:85px;">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody id="historyTableBody"></tbody>
                    </table>
                </div>`;
        }

        const newTbody = document.getElementById('historyTableBody');
        if (newTbody) newTbody.innerHTML = html;
    }

    function filterHistory() {
        const filterVal = document.getElementById('historyFilterStatus')?.value || 'all';
        const rows = document.querySelectorAll('#historyTableBody tr[data-history-status]');
        rows.forEach(row => {
            const status = row.getAttribute('data-history-status');
            if (filterVal === 'all' || status === filterVal) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    function refreshHistory() {
        loadOrderHistory();
        Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Đã cập nhật lịch sử', showConfirmButton: false, timer: 1000 });
    }

    // Xem chi tiet don trong lich su
    function viewHistoryDetail(orderId) {
        const h = orderHistoryData.find(o => o.orderId === orderId);
        if (!h) {
            Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Khong tim thay don nay. Hay lam moi lich su.', showConfirmButton: false, timer: 2000 });
            return;
        }

        const isCompleted = h.finalStatus === 4;
        const statusLabel = isCompleted
            ? '<span style="background:#22c55e;color:#fff;border-radius:20px;padding:3px 10px;font-size:0.72rem;font-weight:700;">Da thanh toan</span>'
            : '<span style="background:#dc3545;color:#fff;border-radius:20px;padding:3px 10px;font-size:0.72rem;font-weight:700;">Da huy</span>';

        const closedTime = h.closedAt ? new Date(h.closedAt).toLocaleString('vi-VN') : '';

        const payMethodLabel = (m) => {
            if (!m) return '&#8212;';
            if (m === 'qr' || m === 'Chuyen khoan QR') return '&#128243; QR';
            if (m === 'card' || m === 'The') return '&#128179; The';
            if (m === 'cash' || m === 'Tien mat') return '&#128181; Tien mat';
            return m;
        };

        // Render danh sach mon
        let itemsHtml = '';
        if (h.items && h.items.length > 0) {
            let rows = '';
            h.items.forEach(item => {
                const name = item.productName || item.name || 'Mon';
                const extras = [];
                if (item.sizeName && item.sizeName !== 'Khong') extras.push(item.sizeName);
                if (item.toppingName && item.toppingName !== 'Khong') extras.push(item.toppingName);
                const extrasHtml = extras.length > 0
                    ? `<div style="font-size:0.7rem;color:#94a3b8;">${extras.join(' \u00b7 ')}</div>` : '';
                const price = (item.subTotal || 0).toLocaleString('vi-VN');
                rows += `<tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:8px 10px;">
                        <div style="font-weight:600;color:#1e293b;">${name}</div>${extrasHtml}
                    </td>
                    <td style="padding:8px 6px;text-align:center;font-weight:600;color:#475569;">x${item.quantity}</td>
                    <td style="padding:8px 10px;text-align:right;font-weight:700;color:#dc3545;">${price}d</td>
                </tr>`;
            });
            itemsHtml = `<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-top:10px;">
                <table style="width:100%;font-size:0.82rem;border-collapse:collapse;">
                    <thead><tr style="background:#f8fafc;">
                        <th style="padding:7px 10px;text-align:left;color:#64748b;font-size:0.7rem;text-transform:uppercase;font-weight:700;">Mon</th>
                        <th style="padding:7px 6px;text-align:center;color:#64748b;font-size:0.7rem;text-transform:uppercase;font-weight:700;width:40px;">SL</th>
                        <th style="padding:7px 10px;text-align:right;color:#64748b;font-size:0.7rem;text-transform:uppercase;font-weight:700;width:90px;">Gia</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table></div>`;
        } else {
            itemsHtml = '<div style="text-align:center;padding:20px 0;color:#94a3b8;font-size:0.82rem;">Không có món</div>';
        }

        const discountRow = h.discountAmount > 0
            ? `<div style="display:flex;justify-content:space-between;font-size:0.8rem;color:#16a34a;margin-bottom:4px;"><span>Giam gia</span><span>-${(h.discountAmount||0).toLocaleString('vi-VN')}d</span></div>` : '';

        const cancelRow = h.cancelReason
            ? `<div style="background:#fff5f5;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;margin-top:10px;font-size:0.78rem;color:#dc3545;text-align:left;"><strong>Lý do hủy:</strong> ${h.cancelReason}</div>` : '';

        Swal.fire({
            title: 'Chi tiết đơn ' + h.orderId,
            width: 500,
            showConfirmButton: false,
            showCloseButton: true,
            html: `<div style="text-align:left;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;flex-wrap:wrap;gap:6px;">
                    <div>
                        <div style="font-weight:700;color:#1e293b;font-size:0.92rem;">${h.customerName}</div>
                        ${h.customerPhone ? '<div style="font-size:0.75rem;color:#64748b;font-family:monospace;">' + h.customerPhone + '</div>' : ''}
                    </div>
                    <div style="text-align:right;">${statusLabel}<div style="font-size:0.72rem;color:#94a3b8;margin-top:3px;">${closedTime}</div></div>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
                    <span style="font-size:0.75rem;background:#f1f5f9;border-radius:20px;padding:3px 10px;color:#475569;">${h.orderTypeLabel || 'Don hang'}</span>
                    ${h.paymentMethod ? '<span style="font-size:0.75rem;background:#f1f5f9;border-radius:20px;padding:3px 10px;color:#475569;">' + payMethodLabel(h.paymentMethod) + '</span>' : ''}
                </div>
                <hr style="margin:8px 0;border-color:#f1f5f9;">
                ${itemsHtml}
                <div style="margin-top:10px;padding:10px 12px;background:#f8fafc;border-radius:10px;">
                    ${discountRow}
                    <div style="display:flex;justify-content:space-between;font-weight:700;color:#dc3545;font-size:0.92rem;">
                        <span>Tổng cộng</span><span>${(h.finalAmount||h.totalAmount||0).toLocaleString('vi-VN')}d</span>
                    </div>
                </div>
                ${cancelRow}
            </div>`,
            customClass: { htmlContainer: 'text-start' }
        });
    }

    // Hủy đơn Online (Delivery / Pickup) với popup nhập lý do
    function cancelOnlineOrder(orderId) {
        if (!orderId) return;

        Swal.fire({
            title: `Hủy đơn ${orderId}?`,
            html: `
                <p class="text-muted mb-3" style="font-size:0.85rem;">
                    Hành động này sẽ chuyển đơn sang trạng thái <strong class="text-danger">Đã hủy</strong>.<br>
                    Vui lòng nhập lý do để ghi nhận.
                </p>
                <textarea
                    id="swal-cancel-reason"
                    placeholder="Nhập lý do hủy đơn... (bắt buộc)"
                    style="width:100%;box-sizing:border-box;padding:10px 14px;font-size:0.875rem;line-height:1.5;border:1.5px solid #e2e8f0;border-radius:10px;resize:none;height:90px;outline:none;font-family:inherit;color:#1e293b;background:#f8fafc;transition:border-color 0.2s;"
                    onfocus="this.style.borderColor='#dc3545';this.style.background='#fff';this.style.boxShadow='0 0 0 3px rgba(220,53,69,0.12)'"
                    onblur="this.style.borderColor='#e2e8f0';this.style.background='#f8fafc';this.style.boxShadow='none'"
                ></textarea>`,
            icon: 'warning',
            width: 460,
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-x-circle me-1"></i>Xác nhận Hủy Đơn',
            cancelButtonText: 'Giữ lại',
            confirmButtonColor: '#dc3545',
            focusCancel: true,
            customClass: { htmlContainer: 'text-start px-2' },
            preConfirm: () => {
                const reason = document.getElementById('swal-cancel-reason')?.value?.trim();
                if (!reason) {
                    Swal.showValidationMessage('<i class="bi bi-exclamation-circle me-1"></i>Vui lòng nhập lý do hủy đơn!');
                    return false;
                }
                return reason;
            }
        }).then(result => {
            if (!result.isConfirmed) return;

            const reason = result.value;

            fetch('/Bar/CancelOrder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: orderId, reason: reason })
            })
            .then(res => res.json().then(data => ({ status: res.status, body: data })))
            .then(({ status, body }) => {
                if (status === 200 && body.success) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: `Đã hủy đơn ${orderId} thành công`,
                        showConfirmButton: false,
                        timer: 2000
                    });
                    // Reload dữ liệu đơn online và lịch sử
                    loadInitialData(true);
                } else {
                    Swal.fire('Lỗi', body.message || 'Không thể hủy đơn này', 'error');
                }
            })
            .catch(err => {
                console.error('Cancel order error:', err);
                Swal.fire('Lỗi', 'Không thể kết nối máy chủ', 'error');
            });
        });
    }

    // Select Table
    function selectTable(tableName) {
        saveDraftForCurrentTarget();

        document.querySelectorAll('.table-item-card, .online-item-card').forEach(c => c.classList.remove('selected'));

        const tableCard = Array.from(document.querySelectorAll('.table-item-card')).find(c => c.getAttribute('data-table-name') === tableName);
        if (tableCard) {
            tableCard.classList.add('selected');
        }

        const table = tablesData.find(t => t.tableName.toLowerCase() === tableName.toLowerCase());
        currentTarget = { type: 'table', id: table ? table.tableId : tableName, name: tableName };
        
        const key = getTargetKey(currentTarget);
        if (draftCarts[key] && draftCarts[key].items) {
            cartItems = JSON.parse(JSON.stringify(draftCarts[key].items));
            appliedVoucher = draftCarts[key].voucher ? JSON.parse(JSON.stringify(draftCarts[key].voucher)) : null;
            currentCustomer = draftCarts[key].customer ? JSON.parse(JSON.stringify(draftCarts[key].customer)) : { name: table?.customerName || tableName, phone: table?.customerPhone || '', note: table?.customerNote || '' };
        } else if (table && table.items && table.items.length > 0) {
            cartItems = JSON.parse(JSON.stringify(table.items));
            appliedVoucher = null;
            currentCustomer = {
                name: table.customerName || tableName,
                phone: table.customerPhone || '',
                note: table.customerNote || ''
            };
        } else {
            cartItems = [];
            appliedVoucher = null;
            currentCustomer = {
                name: table?.customerName || tableName,
                phone: table?.customerPhone || '',
                note: table?.customerNote || ''
            };
        }

        updateCartUI();
    }

    // Select Online Order
    function selectOnlineOrder(orderId) {
        saveDraftForCurrentTarget();

        document.querySelectorAll('.table-item-card, .online-item-card').forEach(c => c.classList.remove('selected'));

        const orderCard = Array.from(document.querySelectorAll('.online-item-card')).find(c => c.getAttribute('data-order-id') === orderId);
        if (orderCard) {
            orderCard.classList.add('selected');
        }

        const order = onlineOrdersData.find(o => o.orderId === orderId);
        const modeType = order && order.orderType === 2 ? 'delivery' : 'pickup';
        const modeLabel = modeType === 'delivery' ? 'Giao Tận Nơi' : 'Đến Lấy';
        currentTarget = { type: modeType, id: orderId, name: `${modeLabel} ${orderId}` };

        const key = getTargetKey(currentTarget);
        if (draftCarts[key] && draftCarts[key].items) {
            cartItems = JSON.parse(JSON.stringify(draftCarts[key].items));
            appliedVoucher = draftCarts[key].voucher ? JSON.parse(JSON.stringify(draftCarts[key].voucher)) : null;
            currentCustomer = draftCarts[key].customer ? JSON.parse(JSON.stringify(draftCarts[key].customer)) : {
                name: order ? (order.customerName || '') : '',
                phone: order ? (order.customerPhone || '') : '',
                note: order ? (order.customerNote || '') : ''
            };
        } else if (order && order.items && order.items.length > 0) {
            cartItems = JSON.parse(JSON.stringify(order.items));
            appliedVoucher = null;
            currentCustomer = {
                name: order.customerName || '',
                phone: order.customerPhone || '',
                note: order.customerNote || ''
            };
        } else {
            cartItems = [];
            appliedVoucher = null;
            currentCustomer = {
                name: order ? (order.customerName || '') : '',
                phone: order ? (order.customerPhone || '') : '',
                note: order ? (order.customerNote || '') : ''
            };
        }

        updateCartUI();
    }

    // Create Takeaway / Pickup Order (Đơn mang đi / Đến lấy)
    function createTakeawayOrder() {
        saveDraftForCurrentTarget();

        document.querySelectorAll('.table-item-card, .online-item-card').forEach(c => c.classList.remove('selected'));
        currentTarget = { type: 'pickup', id: 'TAKEAWAY', name: 'Đến Lấy / Mang Đi' };

        const key = getTargetKey(currentTarget);
        if (draftCarts[key] && draftCarts[key].items) {
            cartItems = JSON.parse(JSON.stringify(draftCarts[key].items));
            appliedVoucher = draftCarts[key].voucher ? JSON.parse(JSON.stringify(draftCarts[key].voucher)) : null;
            currentCustomer = draftCarts[key].customer ? JSON.parse(JSON.stringify(draftCarts[key].customer)) : { name: 'Khách mang đi', phone: '', note: '' };
        } else {
            cartItems = [];
            appliedVoucher = null;
            currentCustomer = { name: 'Khách mang đi', phone: '', note: '' };
        }

        updateCartUI();
    }

    function resetToCounterOrder() {
        createTakeawayOrder();
    }

    // Update Right Panel Cart UI
    function updateCartUI() {
        const titleEl = document.getElementById('activeTargetTitle');
        if (titleEl) {
            titleEl.textContent = currentTarget.name;
        }

        const custNameEl = document.getElementById('cartCustomerName');
        const custPhoneEl = document.getElementById('cartCustomerPhone');
        if (custNameEl) {
            custNameEl.textContent = currentCustomer.name || 'Khách vãng lai';
        }
        if (custPhoneEl) {
            custPhoneEl.textContent = currentCustomer.phone ? `(${currentCustomer.phone})` : '';
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

                let sizeText = item.selectedSize && item.selectedSize.name ? `Size: ${item.selectedSize.name}` : '';
                let sugarIceList = [];
                if (item.sugarLevel) sugarIceList.push(`Đường: ${item.sugarLevel}`);
                if (item.iceLevel) sugarIceList.push(`Đá: ${item.iceLevel}`);
                let sugarIceText = sugarIceList.join(' • ');

                let mainOptions = [sizeText, sugarIceText].filter(Boolean).join(' • ');
                let toppingsText = item.selectedToppings && item.selectedToppings.length > 0 ? `Topping: ${item.selectedToppings.map(t => t.name).join(', ')}` : '';
                let noteText = item.specialNote ? `Ghi chú: ${item.specialNote}` : '';

                html += `
                    <div class="cart-row-item">
                        <div class="flex-fill pe-2 min-w-0">
                            <div class="fw-bold text-dark text-truncate" style="font-size: 0.82rem; line-height: 1.2;" title="${item.productName}">${item.productName}</div>
                            ${mainOptions ? `<div class="text-muted" style="font-size: 0.7rem; line-height: 1.3; margin-top: 1px;">${mainOptions}</div>` : ''}
                            ${toppingsText ? `<div class="text-secondary" style="font-size: 0.7rem; line-height: 1.3;">${toppingsText}</div>` : ''}
                            ${noteText ? `<div class="text-danger-emphasis fst-italic" style="font-size: 0.7rem; line-height: 1.3;"><i class="bi bi-chat-left-dots me-1"></i>${noteText}</div>` : ''}
                            <div class="fw-bold text-danger mt-1" style="font-size: 0.82rem;">${itemTotal.toLocaleString('vi-VN')}đ</div>
                        </div>

                        <div class="d-flex align-items-center gap-1.5 flex-shrink-0">
                            <div class="qty-btn-group d-flex align-items-center">
                                <button type="button" class="btn-qty" onclick="ECoffeeBar.changeQty(${index}, -1)">-</button>
                                <span class="qty-val font-monospace">${item.quantity}</span>
                                <button type="button" class="btn-qty" onclick="ECoffeeBar.changeQty(${index}, 1)">+</button>
                            </div>
                            <button type="button" class="btn-remove-item" onclick="ECoffeeBar.removeItem(${index})" title="Xóa món">
                                <i class="bi bi-trash3"></i>
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

        // Calculate Discount from Applied Voucher
        let discount = 0;
        if (appliedVoucher && subtotal > 0) {
            if (appliedVoucher.discountAmount !== undefined) {
                discount = appliedVoucher.discountAmount;
            } else if (appliedVoucher.type === 'percent') {
                discount = Math.round(subtotal * (appliedVoucher.value / 100));
            } else {
                discount = Math.min(subtotal, appliedVoucher.value);
            }
        }
        currentDiscount = discount;

        const grandTotal = Math.max(0, subtotal - discount);

        const countEl = document.getElementById('cartTotalItemsCount');
        const subtotalEl = document.getElementById('cartSubtotal');
        const discountEl = document.getElementById('cartDiscount');
        const grandTotalEl = document.getElementById('cartGrandTotal');

        if (countEl) countEl.textContent = totalItems;
        if (subtotalEl) subtotalEl.textContent = subtotal.toLocaleString('vi-VN') + 'đ';
        if (discountEl) discountEl.textContent = (discount > 0 ? `-${discount.toLocaleString('vi-VN')}đ` : '0đ');
        if (grandTotalEl) grandTotalEl.textContent = grandTotal.toLocaleString('vi-VN') + 'đ';

        // Update Voucher UI Feedback & Applied Row
        const appliedRow = document.getElementById('barVoucherAppliedRow');
        const appliedCodeText = document.getElementById('barVoucherCodeText');
        if (appliedRow && appliedCodeText) {
            if (appliedVoucher && currentDiscount > 0) {
                appliedRow.style.setProperty('display', 'flex', 'important');
                appliedCodeText.textContent = `${appliedVoucher.code} (${appliedVoucher.name})`;
            } else {
                appliedRow.style.setProperty('display', 'none', 'important');
            }
        }
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
        activeCategoryId = catId;
        document.querySelectorAll('.menu-cat-btn').forEach(c => c.classList.remove('active'));
        if (chipEl) chipEl.classList.add('active');
        renderProductsGrid();
    }

    // Product Search
    function searchProducts() {
        currentSearchQuery = (document.getElementById('inputSearchProduct')?.value || '').toLowerCase().trim();
        renderProductsGrid();
    }

    // Modal In Bill (Print Receipt)
    function openBillModal(billData = null) {
        const items = (billData && billData.items) ? billData.items : cartItems;
        const target = (billData && billData.target) ? billData.target : currentTarget;
        const customer = (billData && billData.customer) ? billData.customer : currentCustomer;
        const discount = (billData && billData.discount !== undefined) ? billData.discount : currentDiscount;
        const cashGivenVal = (billData && billData.cashGiven !== undefined) ? billData.cashGiven : (document.getElementById('inputCashGiven')?.value ? parseFloat(document.getElementById('inputCashGiven').value) : 0);
        const changeReturnedVal = (billData && billData.changeReturned !== undefined) ? billData.changeReturned : (parseFloat(document.getElementById('payChangeAmount')?.textContent?.replace(/[^0-9]/g, '') || '0'));

        if (!items || items.length === 0) {
            Swal.fire('Thông báo', 'Đơn hàng chưa có món nào để in bill!', 'warning');
            return;
        }

        document.getElementById('billTargetName').innerHTML = `Vị trí: <strong>${target.name}</strong>`;
        document.getElementById('billNumber').textContent = `#HD-${Math.floor(1000 + Math.random() * 9000)}`;

        const billCustNameEl = document.getElementById('billCustomerName');
        if (billCustNameEl) {
            billCustNameEl.textContent = customer.name ? `${customer.name} ${customer.phone ? `(${customer.phone})` : ''}` : 'Khách vãng lai';
        }

        const now = new Date();
        document.getElementById('billDateTime').textContent = now.toLocaleDateString('vi-VN') + ' ' + now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        let bodyHtml = '';
        let subtotal = 0;

        items.forEach(item => {
            const itemSinglePrice = (item.unitBasePrice + (item.selectedSize ? item.selectedSize.extraPrice : 0) + (item.selectedToppings ? item.selectedToppings.reduce((a, b) => a + b.price, 0) : 0));
            const itemTotal = itemSinglePrice * item.quantity;
            subtotal += itemTotal;

            let sizeText = item.selectedSize && item.selectedSize.name ? `Size: ${item.selectedSize.name}` : '';
            let sugarIceList = [];
            if (item.sugarLevel) sugarIceList.push(`Đường: ${item.sugarLevel}`);
            if (item.iceLevel) sugarIceList.push(`Đá: ${item.iceLevel}`);
            let sugarIceText = sugarIceList.join(', ');

            let toppingsText = item.selectedToppings && item.selectedToppings.length > 0 ? `+ ${item.selectedToppings.map(t => t.name).join(', ')}` : '';
            let noteText = item.specialNote ? `* Note: ${item.specialNote}` : '';

            let detailsList = [sizeText, sugarIceText, toppingsText, noteText].filter(Boolean);

            bodyHtml += `
                <tr style="border-bottom: 1px dashed #eee;">
                    <td class="py-1 pe-1">
                        <div class="fw-bold">${item.productName}</div>
                        ${detailsList.length > 0 ? `<div style="font-size:0.68rem; color:#555; line-height:1.25;">${detailsList.join('<br>')}</div>` : ''}
                    </td>
                    <td class="text-center py-1 fw-bold align-top">${item.quantity}</td>
                    <td class="text-end py-1 align-top">${itemSinglePrice.toLocaleString('vi-VN')}</td>
                    <td class="text-end py-1 fw-bold align-top">${itemTotal.toLocaleString('vi-VN')}</td>
                </tr>
            `;
        });

        const finalAmount = Math.max(0, subtotal - discount);
        document.getElementById('billItemsBody').innerHTML = bodyHtml;
        document.getElementById('billSubtotal').textContent = subtotal.toLocaleString('vi-VN') + 'đ';
        document.getElementById('billDiscount').textContent = discount.toLocaleString('vi-VN') + 'đ';
        document.getElementById('billTotal').textContent = finalAmount.toLocaleString('vi-VN') + 'đ';
        
        const billTotalWordsEl = document.getElementById('billTotalWords');
        if (billTotalWordsEl) {
            billTotalWordsEl.textContent = `(Bằng chữ: ${readVietnameseCurrency(finalAmount)})`;
        }

        document.getElementById('billCashGiven').textContent = (cashGivenVal || 0).toLocaleString('vi-VN') + 'đ';
        document.getElementById('billChangeReturned').textContent = (changeReturnedVal || 0).toLocaleString('vi-VN') + 'đ';

        // Sinh mã VietQR động theo số tiền thực tế của hóa đơn
        const billNumber = document.getElementById('billNumber')?.textContent?.replace('#', '') || 'HD';
        const transferDesc = `${billNumber} ${target.name.replace(/[^a-zA-Z0-9 ]/g, '')}`.trim();
        const qrUrl = generateVietQrUrl(finalAmount, transferDesc);

        const billQrImg = document.getElementById('billQrCodeImg');
        if (billQrImg) {
            billQrImg.src = qrUrl;
        }
        const billBankName = document.getElementById('billBankName');
        if (billBankName) billBankName.textContent = BANK_CONFIG.bankName;
        const billAccountNo = document.getElementById('billAccountNo');
        if (billAccountNo) billAccountNo.textContent = BANK_CONFIG.accountNo;
        const billAccountName = document.getElementById('billAccountName');
        if (billAccountName) billAccountName.textContent = BANK_CONFIG.accountName;

        const modal = new bootstrap.Modal(document.getElementById('billPrintModal'));
        modal.show();
    }

    // Trigger Browser Print
    function triggerPrint() {
        window.print();
    }

    // Generate exactly 5 smart cash suggestions based on total amount
    function generateCashSuggestions(amount) {
        if (!amount || amount <= 0) {
            return [10000, 20000, 50000, 100000, 200000];
        }

        const set = new Set();
        set.add(amount);

        const round10k = Math.ceil(amount / 10000) * 10000;
        if (round10k >= amount) set.add(round10k);

        const round50k = Math.ceil(amount / 50000) * 50000;
        if (round50k >= amount) set.add(round50k);

        const round100k = Math.ceil(amount / 100000) * 100000;
        if (round100k >= amount) set.add(round100k);

        if (round100k > 0) {
            set.add(round100k + 100000);
            set.add(round100k + 200000);
        }

        [50000, 100000, 200000, 500000, 1000000].forEach(note => {
            if (note >= amount) set.add(note);
        });

        const round500k = Math.ceil(amount / 500000) * 500000;
        if (round500k >= amount) set.add(round500k);

        let sorted = Array.from(set).filter(v => v >= amount).sort((a, b) => a - b);

        if (sorted.length >= 5) {
            return sorted.slice(0, 5);
        }

        while (sorted.length < 5) {
            const last = sorted[sorted.length - 1] || amount;
            sorted.push(last + 50000);
        }
        return sorted.slice(0, 5);
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
        
        const payCustEl = document.getElementById('payCustomerName');
        if (payCustEl) {
            payCustEl.textContent = currentCustomer.name ? `${currentCustomer.name} ${currentCustomer.phone ? `(${currentCustomer.phone})` : ''}` : 'Khách vãng lai';
        }

        const finalWordsEl = document.getElementById('payFinalAmountWords');
        if (finalWordsEl) {
            finalWordsEl.textContent = `${readVietnameseCurrency(finalAmount)}`;
        }

        document.getElementById('payItemSummary').textContent = `Gồm ${totalItems} món trong đơn`;

        // Render 5 Quick Cash Suggestion Chips
        const cashChipsEl = document.getElementById('cashQuickChips');
        if (cashChipsEl) {
            const suggestions = generateCashSuggestions(finalAmount);

            let chipsHtml = '';
            suggestions.forEach((amt, idx) => {
                const activeClass = idx === 0 ? 'btn-danger text-white' : 'btn-outline-secondary';
                chipsHtml += `
                    <button type="button" class="btn btn-sm ${activeClass} font-monospace fw-bold rounded-pill px-2.5 py-1" onclick="ECoffeeBar.fillCashGiven(${amt}, this)">
                        ${amt.toLocaleString('vi-VN')}đ
                    </button>
                `;
            });
            cashChipsEl.innerHTML = chipsHtml;
        }

        selectPayMethod('cash');
        document.getElementById('inputCashGiven').value = finalAmount;
        calculateChange();

        // Cập nhật mã VietQR trong modal thanh toán
        const payQrImg = document.getElementById('payQrCodeImg');
        if (payQrImg) {
            const payTransferDesc = `ECOFFEE ${currentTarget.name.replace(/[^a-zA-Z0-9 ]/g, '')}`.trim();
            payQrImg.src = generateVietQrUrl(finalAmount, payTransferDesc);
        }
        const payQrBankInfo = document.getElementById('payQrBankInfo');
        if (payQrBankInfo) {
            payQrBankInfo.textContent = `Ngân hàng: ${BANK_CONFIG.bankName} - STK: ${BANK_CONFIG.accountNo} - Chủ TK: ${BANK_CONFIG.accountName}`;
        }

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

    function fillCashGiven(amt, btnEl) {
        const input = document.getElementById('inputCashGiven');
        if (input) {
            input.value = amt;
            calculateChange();
        }
        if (btnEl) {
            document.querySelectorAll('#cashQuickChips .btn').forEach(b => {
                b.classList.remove('btn-danger', 'text-white');
                b.classList.add('btn-outline-secondary');
            });
            btnEl.classList.remove('btn-outline-secondary');
            btnEl.classList.add('btn-danger', 'text-white');
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
        const changeWordsEl = document.getElementById('payChangeAmountWords');
        if (changeWordsEl) {
            changeWordsEl.textContent = `${readVietnameseCurrency(change)}`;
        }
    }

    // Confirm Checkout (Calls Controller -> Service -> Repository -> DB)
    function confirmCheckout() {
        const subtotal = cartItems.reduce((sum, item) => {
            const itemSinglePrice = (item.unitBasePrice + (item.selectedSize ? item.selectedSize.extraPrice : 0) + (item.selectedToppings ? item.selectedToppings.reduce((a, b) => a + b.price, 0) : 0));
            return sum + (itemSinglePrice * item.quantity);
        }, 0);
        const finalAmount = Math.max(0, subtotal - currentDiscount);
        const cashGiven = parseFloat(document.getElementById('inputCashGiven')?.value || '0');
        const change = Math.max(0, cashGiven - finalAmount);

        let noteStr = document.getElementById('inputCashierNote')?.value || '';
        if (appliedVoucher) {
            noteStr = `Voucher: ${appliedVoucher.code} | ${noteStr}`.trim();
        }

        const billSnapshot = {
            target: JSON.parse(JSON.stringify(currentTarget)),
            customer: JSON.parse(JSON.stringify(currentCustomer)),
            items: JSON.parse(JSON.stringify(cartItems)),
            subtotal: subtotal,
            discount: currentDiscount,
            finalAmount: finalAmount,
            cashGiven: cashGiven,
            changeReturned: change,
            voucher: appliedVoucher ? JSON.parse(JSON.stringify(appliedVoucher)) : null
        };

        const reqBody = {
            targetType: currentTarget.type,
            targetId: currentTarget.id === 'TAKEAWAY' ? currentTarget.name : currentTarget.id,
            paymentMethod: currentPaymentMethod,
            totalAmount: subtotal,
            discountAmount: currentDiscount,
            finalAmount: finalAmount,
            cashGiven: cashGiven,
            changeReturned: change,
            notes: noteStr,
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

                const oldKey = getTargetKey(currentTarget);
                delete draftCarts[oldKey];
                cartItems = [];
                appliedVoucher = null;
                currentCustomer = { name: currentTarget.type === 'table' ? currentTarget.name : 'Khách vãng lai', phone: '', note: '' };
                updateCartUI();

                Swal.fire({
                    icon: 'success',
                    title: 'Thanh toán thành công!',
                    text: `Đã hoàn tất đơn ${billSnapshot.target.name}. Bạn có muốn in hóa đơn ngay không?`,
                    showCancelButton: true,
                    confirmButtonText: 'In Bill Ngay',
                    cancelButtonText: 'Đóng'
                }).then((res) => {
                    if (res.isConfirmed) {
                        openBillModal(billSnapshot);
                    }
                    // Tải lại dữ liệu bàn và đơn online từ DB qua AJAX
                    loadInitialData(true);
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

    // Open Save Order & Customer Identity Modal (LƯU ĐƠN & NHẬP THÔNG TIN KHÁCH)
    function saveCurrentOrder() {
        if (!cartItems || cartItems.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Giỏ hàng trống',
                text: 'Vui lòng chọn ít nhất 1 món trước khi lưu đơn!',
                confirmButtonText: 'Đã hiểu'
            });
            return;
        }

        openSaveOrderModal();
    }

    function openSaveOrderModal() {
        if (!cartItems || cartItems.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Giỏ hàng trống',
                text: 'Vui lòng chọn ít nhất 1 món trước khi lưu đơn!',
                confirmButtonText: 'Đã hiểu'
            });
            return;
        }

        const subtotal = cartItems.reduce((sum, item) => {
            const itemSinglePrice = (item.unitBasePrice + (item.selectedSize ? item.selectedSize.extraPrice : 0) + (item.selectedToppings ? item.selectedToppings.reduce((a, b) => a + b.price, 0) : 0));
            return sum + (itemSinglePrice * item.quantity);
        }, 0);
        const finalAmount = Math.max(0, subtotal - currentDiscount);
        const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

        const targetTitleEl = document.getElementById('saveModalTargetTitle');
        const itemCountEl = document.getElementById('saveModalItemCount');
        const totalEl = document.getElementById('saveModalTotal');

        if (targetTitleEl) targetTitleEl.textContent = currentTarget.name;
        if (itemCountEl) itemCountEl.textContent = totalItems;
        if (totalEl) totalEl.textContent = finalAmount.toLocaleString('vi-VN') + 'đ';

        // Pre-fill existing customer info
        const phoneInput = document.getElementById('saveCustPhone');
        const nameInput = document.getElementById('saveCustName');
        const noteInput = document.getElementById('saveCustNote');

        if (phoneInput) phoneInput.value = currentCustomer.phone || '';
        if (nameInput) {
            nameInput.value = currentCustomer.name || (currentTarget.type === 'table' ? currentTarget.name : 'Khách mang đi');
        }
        if (noteInput) noteInput.value = currentCustomer.note || '';

        // Reset feedback container
        const feedbackEl = document.getElementById('custLookupFeedback');
        if (feedbackEl) {
            feedbackEl.style.display = 'none';
            feedbackEl.innerHTML = '';
        }

        // Auto trigger search if phone already exists
        if (currentCustomer.phone) {
            searchCustomerByPhone(currentCustomer.phone);
        }

        const modalEl = document.getElementById('saveOrderModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
            setTimeout(() => {
                phoneInput?.focus();
            }, 350);
        }
    }

    function openCustomerEditModal() {
        openSaveOrderModal();
    }

    // Debounced Phone input auto-lookup
    function onPhoneInput(phone) {
        if (phoneDebounceTimer) clearTimeout(phoneDebounceTimer);
        const clean = (phone || '').trim();
        if (clean.length < 4) {
            const feedbackEl = document.getElementById('custLookupFeedback');
            if (feedbackEl) {
                feedbackEl.style.display = 'none';
                feedbackEl.innerHTML = '';
            }
            return;
        }

        phoneDebounceTimer = setTimeout(() => {
            searchCustomerByPhone(clean);
        }, 250);
    }

    function searchCustomerByPhone(phone) {
        const feedbackEl = document.getElementById('custLookupFeedback');
        if (!feedbackEl) return;

        fetch(`/Bar/FindCustomer?phone=${encodeURIComponent(phone)}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.found) {
                    feedbackEl.className = 'mt-2 p-2 rounded-2 border found';
                    feedbackEl.style.display = 'block';
                    feedbackEl.innerHTML = `
                        <div class="d-flex align-items-center justify-content-between">
                            <span class="fw-bold"><i class="bi bi-check-circle-fill text-success me-1"></i>${data.customerName}</span>
                            <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill">${data.memberTier || 'Thành viên'}</span>
                        </div>
                        <div class="text-muted mt-0.5" style="font-size: 0.72rem;">${data.lastOrderSummary || `Đã đặt ${data.totalOrders} đơn`} • Đã tự động điền tên</div>
                    `;

                    const nameInput = document.getElementById('saveCustName');
                    if (nameInput && (!nameInput.value || nameInput.value.includes('Bàn') || nameInput.value === 'Khách lẻ' || nameInput.value === 'Khách mang đi')) {
                        nameInput.value = data.customerName;
                    }
                    if (data.customerNote) {
                        const noteInput = document.getElementById('saveCustNote');
                        if (noteInput && !noteInput.value) noteInput.value = data.customerNote;
                    }
                } else {
                    feedbackEl.className = 'mt-2 p-2 rounded-2 border not-found';
                    feedbackEl.style.display = 'block';
                    feedbackEl.innerHTML = `<span class="text-muted"><i class="bi bi-person-plus me-1 text-primary"></i>Chưa có lịch sử với SĐT này (Khách hàng mới)</span>`;
                }
            })
            .catch(err => {
                console.error('Error finding customer:', err);
            });
    }

    function setQuickCustName(prefix) {
        const nameInput = document.getElementById('saveCustName');
        if (!nameInput) return;
        if (prefix === 'Khách lẻ' || prefix === 'Khách quen' || prefix === 'Khách mang đi') {
            nameInput.value = prefix;
        } else {
            const currentVal = nameInput.value.replace(/^(Anh|Chị|Cô|Chú)\s*/, '').trim();
            nameInput.value = prefix + (currentVal || '');
            nameInput.focus();
        }
    }

    // Confirm Save Order From Modal (Lưu vào CSDL)
    function confirmSaveOrderFromModal(isGuest = false) {
        let phone = '';
        let name = '';
        let note = '';

        if (isGuest) {
            name = currentTarget.type === 'table' ? currentTarget.name : 'Khách vãng lai';
            phone = '';
            note = '';
        } else {
            phone = (document.getElementById('saveCustPhone')?.value || '').trim();
            name = (document.getElementById('saveCustName')?.value || '').trim();
            note = (document.getElementById('saveCustNote')?.value || '').trim();

            if (!name) {
                name = phone ? `Khách (${phone})` : (currentTarget.type === 'table' ? currentTarget.name : 'Khách mang đi');
            }
        }

        currentCustomer = { name: name, phone: phone, note: note };

        const isTakeawayDraft = currentTarget.type === 'pickup' && currentTarget.id === 'TAKEAWAY';

        const reqBody = {
            targetType: currentTarget.type,
            targetId: currentTarget.type === 'table' ? currentTarget.name : currentTarget.id,
            customerName: name,
            customerPhone: phone,
            customerNote: note,
            discountAmount: currentDiscount,
            items: cartItems
        };

        fetch('/Bar/SaveOrder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reqBody)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Đóng Modal
                const modalEl = document.getElementById('saveOrderModal');
                if (modalEl) {
                    const modalInstance = bootstrap.Modal.getInstance(modalEl);
                    if (modalInstance) modalInstance.hide();
                }

                // Xóa giỏ nháp vì đã lưu vào DB
                const oldKey = getTargetKey(currentTarget);
                delete draftCarts[oldKey];

                updateCartUI();

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: data.message || `Đã lưu đơn thành công cho ${name}!`,
                    showConfirmButton: false,
                    timer: 2200
                });

                // Nếu vừa lưu từ "+ Tạo đơn mang đi mới" -> chuyển mục tiêu sang mã đơn vừa tạo
                if (isTakeawayDraft && data.targetId) {
                    currentTarget = {
                        type: 'pickup',
                        id: data.targetId,
                        name: `Đến Lấy ${data.targetId}`
                    };
                    const titleEl = document.getElementById('activeTargetTitle');
                    if (titleEl) titleEl.textContent = currentTarget.name;
                }

                // Tải lại dữ liệu DB để cập nhật Sơ đồ bàn & Đơn mang đi
                loadInitialData(true);
            } else {
                Swal.fire('Lỗi', data.message || 'Không thể lưu đơn', 'error');
            }
        })
        .catch(err => {
            console.error('Error saving order:', err);
            Swal.fire('Lỗi', 'Không thể kết nối máy chủ để lưu đơn', 'error');
        });
    }

    // Clear Current Cart (Xóa giỏ hàng / Trả bàn)
    function clearCurrentCart() {
        if (!cartItems || cartItems.length === 0) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: 'Giỏ hàng hiện đang trống',
                showConfirmButton: false,
                timer: 1000
            });
            return;
        }

        Swal.fire({
            title: 'Xóa giỏ hàng?',
            text: `Bạn có chắc muốn xóa tất cả món của "${currentTarget.name}" không?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Đồng ý xóa',
            cancelButtonText: 'Hủy'
        }).then(result => {
            if (result.isConfirmed) {
                cartItems = [];
                appliedVoucher = null;
                currentCustomer = { name: currentTarget.type === 'table' ? currentTarget.name : 'Khách vãng lai', phone: '', note: '' };
                const key = getTargetKey(currentTarget);
                delete draftCarts[key];

                // Nếu là bàn đã có món trong DB, gửi API làm mới bàn
                if (currentTarget.type === 'table') {
                    fetch('/Bar/ClearTable', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(currentTarget.name)
                    })
                    .then(() => {
                        loadInitialData(true);
                    })
                    .catch(err => console.error('Clear table error:', err));
                }

                updateCartUI();

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Đã làm mới giỏ hàng',
                    showConfirmButton: false,
                    timer: 1000
                });
            }
        });
    }

    // Apply Voucher (AJAX call to /Bar/ValidateVoucher -> Service -> Repository -> DB)
    function applyVoucher() {
        const input = document.getElementById('barVoucherInput');
        const feedbackEl = document.getElementById('barVoucherFeedback');
        if (!input) return;
        const code = input.value.trim().toUpperCase();
        if (!code) {
            if (feedbackEl) {
                feedbackEl.textContent = 'Vui lòng nhập mã voucher';
                feedbackEl.style.display = 'block';
            }
            return;
        }

        const subtotal = cartItems.reduce((sum, item) => {
            const itemSinglePrice = (item.unitBasePrice + (item.selectedSize ? item.selectedSize.extraPrice : 0) + (item.selectedToppings ? item.selectedToppings.reduce((a, b) => a + b.price, 0) : 0));
            return sum + (itemSinglePrice * item.quantity);
        }, 0);

        if (cartItems.length === 0 || subtotal === 0) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                title: 'Giỏ hàng đang trống, chưa thể áp dụng voucher',
                showConfirmButton: false,
                timer: 1500
            });
            return;
        }

        // Gọi AJAX tới Server để kiểm tra Voucher trong CSDL
        fetch('/Bar/ValidateVoucher', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code, orderAmount: subtotal })
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
                if (feedbackEl) feedbackEl.style.display = 'none';
                input.value = '';
                updateCartUI();
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: `Áp dụng voucher ${body.code} thành công! (-${(body.discountAmount || 0).toLocaleString('vi-VN')}đ)`,
                    showConfirmButton: false,
                    timer: 1500
                });
            } else {
                appliedVoucher = null;
                updateCartUI();
                const errMsg = body.message || `Mã "${code}" không hợp lệ hoặc đã hết hạn`;
                if (feedbackEl) {
                    feedbackEl.textContent = errMsg;
                    feedbackEl.style.display = 'block';
                }
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'warning',
                    title: errMsg,
                    showConfirmButton: false,
                    timer: 1800
                });
            }
        })
        .catch(err => {
            console.error('Error validating voucher:', err);
            if (feedbackEl) {
                feedbackEl.textContent = 'Không thể kết nối máy chủ kiểm tra voucher';
                feedbackEl.style.display = 'block';
            }
        });
    }

    // Remove Voucher
    function removeVoucher() {
        appliedVoucher = null;
        const feedbackEl = document.getElementById('barVoucherFeedback');
        if (feedbackEl) feedbackEl.style.display = 'none';
        updateCartUI();
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'info',
            title: 'Đã gỡ mã voucher',
            showConfirmButton: false,
            timer: 1000
        });
    }

    return {
        init: init,
        loadInitialData: loadInitialData,
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
        saveCurrentOrder: saveCurrentOrder,
        openSaveOrderModal: openSaveOrderModal,
        openCustomerEditModal: openCustomerEditModal,
        onPhoneInput: onPhoneInput,
        searchCustomerByPhone: searchCustomerByPhone,
        setQuickCustName: setQuickCustName,
        confirmSaveOrderFromModal: confirmSaveOrderFromModal,
        clearCurrentCart: clearCurrentCart,
        openBillModal: openBillModal,
        triggerPrint: triggerPrint,
        openPaymentModal: openPaymentModal,
        selectPayMethod: selectPayMethod,
        fillCashGiven: fillCashGiven,
        calculateChange: calculateChange,
        confirmCheckout: confirmCheckout,
        applyVoucher: applyVoucher,
        removeVoucher: removeVoucher,
        cancelOnlineOrder: cancelOnlineOrder,
        filterHistory: filterHistory,
        refreshHistory: refreshHistory,
        viewHistoryDetail: viewHistoryDetail,
        BANK_CONFIG: BANK_CONFIG,
        generateVietQrUrl: generateVietQrUrl,
        readVietnameseCurrency: readVietnameseCurrency
    };
})();

window.ECoffeeBar = ECoffeeBar;

document.addEventListener('DOMContentLoaded', function () {
    ECoffeeBar.init();
});
