/**
 * product-management.js – E-Coffee Hoàng Gia
 * Xử lý AJAX, modal, tabs, profit calculator cho trang Quản lý Sản phẩm
 */

// ── Tab switching ──────────────────────────────────────────────────────────
function switchTab(tabName) {
    document.querySelectorAll('.pm-tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.pm-tab-btn').forEach(b => b.classList.remove('active'));
    const pane = document.getElementById('tab-' + tabName);
    const btn = document.getElementById('tabBtn-' + tabName);
    if (pane) pane.classList.add('active');
    if (btn) btn.classList.add('active');
    history.replaceState(null, '', '?tab=' + tabName);
}

// ── Format VNĐ ─────────────────────────────────────────────────────────────
function fmtVnd(val) {
    return Number(val).toLocaleString('vi-VN') + 'đ';
}

// ── Profit Calculator (realtime in modal) ───────────────────────────────────
function recalcProfit() {
    const cost = parseFloat(document.getElementById('prodCostPrice')?.value) || 0;
    const base = parseFloat(document.getElementById('prodBasePrice')?.value) || 0;
    const promo = parseFloat(document.getElementById('prodPromoPrice')?.value) || 0;
    const sell = (promo > 0 && promo < base) ? promo : base;
    const profit = sell - cost;
    const margin = sell > 0 ? ((sell - cost) / sell * 100).toFixed(1) : 0;

    const profitEl = document.getElementById('calcProfitVal');
    const marginEl = document.getElementById('calcMarginVal');
    const marginPill = document.getElementById('calcMarginPill');
    const calcSell = document.getElementById('calcSellVal');

    if (calcSell) calcSell.textContent = sell > 0 ? fmtVnd(sell) : '–';
    if (profitEl) {
        profitEl.textContent = profit >= 0 ? '+' + fmtVnd(profit) : fmtVnd(profit);
        profitEl.style.color = profit >= 0 ? '#16a34a' : '#dc2626';
    }
    if (marginEl) marginEl.textContent = margin + '%';
    if (marginPill) {
        marginPill.className = 'margin-pill ';
        if (margin >= 60) marginPill.classList.add('margin-high');
        else if (margin >= 40) marginPill.classList.add('margin-mid');
        else marginPill.classList.add('margin-low');
    }
}

// ── Product Modal ───────────────────────────────────────────────────────────

/** Cập nhật badge số lượng topping đã chọn */
function updateToppingBadge() {
    const checkedBoxes = document.querySelectorAll('.prod-topping-chk:checked');
    const count = checkedBoxes.length;
    const numEl = document.getElementById('prodToppingCountNum');
    if (numEl) numEl.textContent = count;

    // Highlight topping items
    document.querySelectorAll('.prod-topping-item').forEach(lbl => {
        const chk = lbl.querySelector('.prod-topping-chk');
        if (chk && chk.checked) {
            lbl.classList.add('selected');
        } else {
            lbl.classList.remove('selected');
        }
    });
}

/** Preview ảnh realtime khi nhập URL */
function updateProdImagePreview(url) {
    const img = document.getElementById('prodImgPreview');
    const placeholder = document.getElementById('prodImgPlaceholder');
    if (!img || !placeholder) return;
    if (url && url.trim()) {
        img.src = url.trim();
        img.style.display = 'block';
        placeholder.style.display = 'none';
        img.onerror = () => {
            img.style.display = 'none';
            placeholder.style.display = 'block';
        };
    } else {
        img.style.display = 'none';
        placeholder.style.display = 'block';
    }
}

function toggleImgLoading(show) {
    const el = document.getElementById('prodImgLoading');
    if (!el) return;
    if (show) {
        el.classList.remove('d-none');
        el.classList.add('d-flex');
    } else {
        el.classList.remove('d-flex');
        el.classList.add('d-none');
    }
}

/** Tải ảnh từ máy tính lên server và lưu vào wwwroot/image */
function uploadProductImage(input) {
    if (!input || !input.files || input.files.length === 0) return;
    const file = input.files[0];

    // Kiểm tra định dạng
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
        Swal.fire('Định dạng không hỗ trợ', 'Vui lòng chọn file ảnh (.jpg, .png, .webp, .gif, .svg)!', 'warning');
        input.value = '';
        return;
    }

    // Kiểm tra dung lượng (10MB)
    if (file.size > 10 * 1024 * 1024) {
        Swal.fire('File quá lớn', 'Dung lượng ảnh tối đa là 10MB!', 'warning');
        input.value = '';
        return;
    }

    toggleImgLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    fetch('/ProductManagement/UploadImage', {
        method: 'POST',
        body: formData
    })
    .then(r => r.json())
    .then(res => {
        toggleImgLoading(false);
        if (res.success && res.imageUrl) {
            setVal('prodImageUrl', res.imageUrl);
            updateProdImagePreview(res.imageUrl);
            
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true
            });
            Toast.fire({
                icon: 'success',
                title: 'Đã tải ảnh lên thành công!'
            });
        } else {
            Swal.fire('Lỗi tải ảnh', res.message || 'Không thể tải ảnh lên', 'error');
        }
    })
    .catch(err => {
        toggleImgLoading(false);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi kết nối máy chủ: ' + err.message, 'error');
    })
    .finally(() => {
        toggleImgLoading(false);
        input.value = '';
    });
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null ? val : '';
}

function getVal(id, def = '') {
    const el = document.getElementById(id);
    return el ? el.value : def;
}

function closeProductForm() {
    toggleImgLoading(false);
    const listEl = document.getElementById('prodListView');
    const formEl = document.getElementById('prodFormView');
    if (formEl) formEl.style.display = 'none';
    if (listEl) listEl.style.display = 'block';
    document.getElementById('tab-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openAddProductModal() {
    toggleImgLoading(false);
    const titleEl = document.getElementById('prodFormTitle');
    if (titleEl) titleEl.innerHTML = '<i class="bi bi-plus-circle text-danger me-2"></i>Thêm Sản Phẩm Mới';
    const form = document.getElementById('productForm');
    if (form) form.reset();
    setVal('prodId', '0');
    setVal('prodName', '');
    setVal('prodCostPrice', '');
    setVal('prodBasePrice', '');
    setVal('prodPromoPrice', '');
    setVal('prodDescription', '');
    setVal('prodImageUrl', '');
    setVal('prodBadge', '');
    const isAvailEl = document.getElementById('prodIsAvailable');
    if (isAvailEl) isAvailEl.checked = true;
    const reasonRow = document.getElementById('prodChangeReasonRow');
    if (reasonRow) reasonRow.style.display = 'none';
    setVal('prodChangeReason', '');
    // Reset ảnh preview
    updateProdImagePreview('');
    // Reset toppings
    document.querySelectorAll('.prod-topping-chk').forEach(c => c.checked = false);
    updateToppingBadge();
    recalcProfit();
    
    // Switch to inline form view
    const listEl = document.getElementById('prodListView');
    const formEl = document.getElementById('prodFormView');
    if (listEl) listEl.style.display = 'none';
    if (formEl) formEl.style.display = 'block';
    document.getElementById('tab-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openEditProductModal(productId) {
    toggleImgLoading(false);
    fetch('/ProductManagement/GetProductDetail?id=' + productId)
        .then(r => r.json()).then(res => {
            if (!res.success) { Swal.fire('Lỗi', res.message, 'error'); return; }
            const p = res.data;
            const titleEl = document.getElementById('prodFormTitle');
            if (titleEl) titleEl.innerHTML = `<i class="bi bi-pencil-square text-danger me-2"></i>Chỉnh Sửa: <span class="text-primary">${p.name}</span>`;
            setVal('prodId', p.id);
            setVal('prodName', p.name);
            setVal('prodCategoryId', p.categoryId);
            setVal('prodDescription', p.description || '');
            setVal('prodBasePrice', p.basePrice);
            setVal('prodPromoPrice', p.promoPrice || '');
            setVal('prodCostPrice', p.costPrice);
            setVal('prodBadge', p.badge || '');
            setVal('prodImageUrl', p.imageUrl || '');
            const isAvailEl = document.getElementById('prodIsAvailable');
            if (isAvailEl) isAvailEl.checked = !!p.isAvailable;
            const reasonRow = document.getElementById('prodChangeReasonRow');
            if (reasonRow) reasonRow.style.display = 'block';
            setVal('prodChangeReason', '');
            // Preview ảnh
            updateProdImagePreview(p.imageUrl);
            // Populate toppings (support both availableToppings array of objects and toppingIds)
            const toppingIds = (p.availableToppings || []).map(t => t.id || t.Id) || (p.toppingIds || []);
            document.querySelectorAll('.prod-topping-chk').forEach(c => {
                c.checked = toppingIds.includes(parseInt(c.value));
            });
            updateToppingBadge();
            recalcProfit();

            // Switch to inline form view
            const listEl = document.getElementById('prodListView');
            const formEl = document.getElementById('prodFormView');
            if (listEl) listEl.style.display = 'none';
            if (formEl) formEl.style.display = 'block';
            document.getElementById('tab-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
}

function saveProduct() {
    const selectedToppingIds = Array.from(
        document.querySelectorAll('.prod-topping-chk:checked')
    ).map(c => parseInt(c.value));

    const isAvailEl = document.getElementById('prodIsAvailable');
    const dto = {
        id: parseInt(getVal('prodId', '0')) || 0,
        name: getVal('prodName').trim(),
        categoryId: parseInt(getVal('prodCategoryId', '1')),
        description: getVal('prodDescription').trim(),
        basePrice: parseFloat(getVal('prodBasePrice', '0')) || 0,
        promoPrice: parseFloat(getVal('prodPromoPrice')) || null,
        costPrice: parseFloat(getVal('prodCostPrice', '0')) || 0,
        badge: getVal('prodBadge'),
        imageUrl: getVal('prodImageUrl').trim(),
        isAvailable: isAvailEl ? isAvailEl.checked : true,
        changeReason: getVal('prodChangeReason').trim() || null,
        selectedToppingIds: selectedToppingIds
    };
    if (!dto.name) { Swal.fire('Thiếu thông tin', 'Vui lòng nhập tên sản phẩm!', 'warning'); return; }
    if (dto.basePrice <= 0) { Swal.fire('Thiếu thông tin', 'Vui lòng nhập giá bán!', 'warning'); return; }

    fetch('/ProductManagement/SaveProduct', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto)
    }).then(r => r.json()).then(res => {
        if (res.success) {
            closeProductForm();
            Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false }).then(() => {
                location.href = '/ProductManagement?tab=products';
            });
        } else { Swal.fire('Lỗi', res.message, 'error'); }
    });
}

function deleteProduct(id, name) {
    Swal.fire({
        title: 'Xóa sản phẩm?',
        html: `Bạn có chắc muốn xóa <b>${name}</b>? Thao tác này không thể hoàn tác.`,
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#dc2626', cancelButtonText: 'Hủy', confirmButtonText: 'Xóa ngay'
    }).then(r => {
        if (!r.isConfirmed) return;
        fetch('/ProductManagement/DeleteProduct', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
        }).then(r => r.json()).then(res => {
            if (res.success) { Swal.fire({ icon: 'success', title: res.message, timer: 1500, showConfirmButton: false }).then(() => location.reload()); }
        });
    });
}

function toggleProductStatus(id, name, currentStatus) {
    const action = currentStatus ? 'tạm ngưng bán' : 'mở bán lại';
    Swal.fire({
        title: `${currentStatus ? 'Tạm ngưng' : 'Mở bán'} sản phẩm?`,
        html: `Xác nhận <b>${action}</b> sản phẩm <b>${name}</b>?`,
        icon: 'question', showCancelButton: true,
        confirmButtonColor: '#dc2626', cancelButtonText: 'Hủy', confirmButtonText: 'Xác nhận'
    }).then(r => {
        if (!r.isConfirmed) return;
        fetch('/ProductManagement/ToggleProductStatus', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
        }).then(r => r.json()).then(res => {
            if (res.success) { Swal.fire({ icon: 'success', title: res.message, timer: 1500, showConfirmButton: false }).then(() => location.reload()); }
        });
    });
}

// ── Category Modal ──────────────────────────────────────────────────────────
function openAddCategoryModal() {
    document.getElementById('categoryModalTitle').textContent = 'Thêm Danh Mục Mới';
    document.getElementById('categoryForm').reset();
    document.getElementById('catId').value = '0';
    new bootstrap.Modal(document.getElementById('categoryModal')).show();
}

function openEditCategoryModal(id) {
    fetch('/ProductManagement/GetCategoryDetail?id=' + id)
        .then(r => r.json()).then(res => {
            if (!res.success) { Swal.fire('Lỗi', 'Không tìm thấy danh mục', 'error'); return; }
            const c = res.data;
            document.getElementById('categoryModalTitle').textContent = 'Chỉnh Sửa: ' + c.name;
            document.getElementById('catId').value = c.id;
            document.getElementById('catName').value = c.name;
            document.getElementById('catIcon').value = c.icon;
            document.getElementById('catSlug').value = c.slug;
            document.getElementById('catDisplayOrder').value = c.displayOrder;
            document.getElementById('catDescription').value = c.description;
            new bootstrap.Modal(document.getElementById('categoryModal')).show();
        });
}

function saveCategory() {
    const dto = {
        id: parseInt(document.getElementById('catId').value) || 0,
        name: document.getElementById('catName').value.trim(),
        icon: document.getElementById('catIcon').value.trim() || 'bi-cup-hot-fill',
        slug: document.getElementById('catSlug').value.trim(),
        displayOrder: parseInt(document.getElementById('catDisplayOrder').value) || 1,
        description: document.getElementById('catDescription').value.trim()
    };
    if (!dto.name) { Swal.fire('Thiếu thông tin', 'Vui lòng nhập tên danh mục!', 'warning'); return; }
    fetch('/ProductManagement/SaveCategory', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto)
    }).then(r => r.json()).then(res => {
        if (res.success) {
            bootstrap.Modal.getInstance(document.getElementById('categoryModal'))?.hide();
            Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false }).then(() => location.reload());
        } else { Swal.fire('Lỗi', res.message, 'error'); }
    });
}

function deleteCategory(id, name) {
    Swal.fire({
        title: 'Xóa danh mục?',
        html: `Bạn có chắc muốn xóa danh mục <b>${name}</b>?`,
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#dc2626', cancelButtonText: 'Hủy', confirmButtonText: 'Xóa'
    }).then(r => {
        if (!r.isConfirmed) return;
        fetch('/ProductManagement/DeleteCategory', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
        }).then(r => r.json()).then(res => {
            if (res.success) { Swal.fire({ icon: 'success', title: res.message, timer: 1500, showConfirmButton: false }).then(() => location.reload()); }
        });
    });
}

// ── Topping Modal & Operations ─────────────────────────────────────────────
function openAddToppingModal() {
    document.getElementById('toppingModalTitle').textContent = 'Thêm Topping Mới';
    document.getElementById('toppingForm').reset();
    document.getElementById('toppingId').value = '0';
    document.getElementById('toppingName').value = '';
    document.getElementById('toppingPrice').value = '10000';
    new bootstrap.Modal(document.getElementById('toppingModal')).show();
}

function openEditToppingModal(id) {
    fetch('/ProductManagement/GetToppingDetail?id=' + id)
        .then(r => r.json()).then(res => {
            if (!res.success) { Swal.fire('Lỗi', res.message || 'Không tìm thấy topping', 'error'); return; }
            const t = res.data;
            document.getElementById('toppingModalTitle').textContent = 'Chỉnh Sửa Topping: ' + t.name;
            document.getElementById('toppingId').value = t.id;
            document.getElementById('toppingName').value = t.name;
            document.getElementById('toppingPrice').value = t.price;
            new bootstrap.Modal(document.getElementById('toppingModal')).show();
        });
}

function saveTopping() {
    const dto = {
        id: parseInt(document.getElementById('toppingId').value) || 0,
        name: document.getElementById('toppingName').value.trim(),
        price: parseFloat(document.getElementById('toppingPrice').value) || 0
    };
    if (!dto.name) { Swal.fire('Thiếu thông tin', 'Vui lòng nhập tên topping!', 'warning'); return; }
    if (dto.price < 0) { Swal.fire('Giá không hợp lệ', 'Giá topping không được âm!', 'warning'); return; }

    fetch('/ProductManagement/SaveTopping', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto)
    }).then(r => r.json()).then(res => {
        if (res.success) {
            bootstrap.Modal.getInstance(document.getElementById('toppingModal'))?.hide();
            Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false }).then(() => {
                location.href = '/ProductManagement?tab=toppings';
            });
        } else {
            Swal.fire('Lỗi', res.message, 'error');
        }
    });
}

function deleteTopping(id, name) {
    Swal.fire({
        title: 'Xóa topping?',
        html: `Bạn có chắc muốn xóa topping <b>${name}</b>?`,
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#dc2626', cancelButtonText: 'Hủy', confirmButtonText: 'Xóa'
    }).then(r => {
        if (!r.isConfirmed) return;
        fetch('/ProductManagement/DeleteTopping', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
        }).then(r => r.json()).then(res => {
            if (res.success) {
                Swal.fire({ icon: 'success', title: res.message, timer: 1500, showConfirmButton: false }).then(() => {
                    location.href = '/ProductManagement?tab=toppings';
                });
            } else {
                Swal.fire('Lỗi', res.message, 'error');
            }
        });
    });
}

function filterToppings() {
    const q = (document.getElementById('toppingSearch')?.value || '').toLowerCase().trim();
    document.querySelectorAll('.topping-card-col').forEach(col => {
        const name = (col.dataset.name || '').toLowerCase();
        col.style.display = (!q || name.includes(q)) ? '' : 'none';
    });
}

// ── Voucher Modal ───────────────────────────────────────────────────────────
function openAddVoucherModal() {
    document.getElementById('voucherModalTitle').textContent = 'Thêm Voucher Mới';
    document.getElementById('voucherForm').reset();
    document.getElementById('voucherId').value = '0';
    document.getElementById('vIsActive').checked = true;
    toggleDiscountTypeUI();
    new bootstrap.Modal(document.getElementById('voucherModal')).show();
}

function openEditVoucherModal(id) {
    fetch('/ProductManagement/GetVoucherDetail?id=' + id)
        .then(r => r.json()).then(res => {
            if (!res.success) { Swal.fire('Lỗi', 'Không tìm thấy voucher', 'error'); return; }
            const v = res.data;
            document.getElementById('voucherModalTitle').textContent = 'Chỉnh Sửa: ' + v.code;
            document.getElementById('voucherId').value = v.id;
            document.getElementById('vCode').value = v.code;
            document.getElementById('vName').value = v.name;
            document.getElementById('vDescription').value = v.description;
            document.getElementById('vDiscountType').value = v.discountType;
            document.getElementById('vDiscountValue').value = v.discountValue;
            document.getElementById('vMinOrder').value = v.minOrderAmount;
            document.getElementById('vMaxDiscount').value = v.maxDiscountAmount || '';
            document.getElementById('vStartDate').value = v.startDate ? v.startDate.substring(0, 10) : '';
            document.getElementById('vEndDate').value = v.endDate ? v.endDate.substring(0, 10) : '';
            document.getElementById('vUsageLimit').value = v.usageLimit || '';
            document.getElementById('vIsActive').checked = v.isActive;
            toggleDiscountTypeUI();
            new bootstrap.Modal(document.getElementById('voucherModal')).show();
        });
}

function toggleDiscountTypeUI() {
    const isPercent = document.getElementById('vDiscountType')?.value == '1';
    const maxDiscountRow = document.getElementById('maxDiscountRow');
    if (maxDiscountRow) maxDiscountRow.style.display = isPercent ? 'block' : 'none';
}

function saveVoucher() {
    const dto = {
        id: parseInt(document.getElementById('voucherId').value) || 0,
        code: document.getElementById('vCode').value.trim(),
        name: document.getElementById('vName').value.trim(),
        description: document.getElementById('vDescription').value.trim(),
        discountType: parseInt(document.getElementById('vDiscountType').value),
        discountValue: parseFloat(document.getElementById('vDiscountValue').value) || 0,
        minOrderAmount: parseFloat(document.getElementById('vMinOrder').value) || 0,
        maxDiscountAmount: parseFloat(document.getElementById('vMaxDiscount').value) || null,
        startDate: document.getElementById('vStartDate').value || null,
        endDate: document.getElementById('vEndDate').value || null,
        usageLimit: parseInt(document.getElementById('vUsageLimit').value) || null,
        isActive: document.getElementById('vIsActive').checked
    };
    if (!dto.code) { Swal.fire('Thiếu thông tin', 'Vui lòng nhập mã voucher!', 'warning'); return; }
    if (dto.discountValue <= 0) { Swal.fire('Thiếu thông tin', 'Giá trị giảm phải lớn hơn 0!', 'warning'); return; }

    fetch('/ProductManagement/SaveVoucher', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto)
    }).then(r => r.json()).then(res => {
        if (res.success) {
            bootstrap.Modal.getInstance(document.getElementById('voucherModal'))?.hide();
            Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false }).then(() => location.reload());
        } else { Swal.fire('Lỗi', res.message, 'error'); }
    });
}

function deleteVoucher(id, name) {
    Swal.fire({
        title: 'Xóa voucher?',
        html: `Xóa voucher <b>${name}</b>?`,
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#dc2626', cancelButtonText: 'Hủy', confirmButtonText: 'Xóa'
    }).then(r => {
        if (!r.isConfirmed) return;
        fetch('/ProductManagement/DeleteVoucher', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
        }).then(r => r.json()).then(res => {
            if (res.success) { Swal.fire({ icon: 'success', title: res.message, timer: 1500, showConfirmButton: false }).then(() => location.reload()); }
        });
    });
}

function toggleVoucherStatus(id) {
    fetch('/ProductManagement/ToggleVoucherStatus', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
    }).then(r => r.json()).then(res => {
        if (res.success) { Swal.fire({ icon: 'success', title: res.message, timer: 1500, showConfirmButton: false }).then(() => location.reload()); }
    });
}

// ── Product Search/Filter + Pagination ───────────────────────────────────────
let _prodCurrentPage = 1;
let _prodFilteredRows = [];

function filterProducts() {
    const searchVal = document.getElementById('prodSearch')?.value?.toLowerCase() || '';
    const catVal    = document.getElementById('prodCatFilter')?.value || '';
    const statusVal = document.getElementById('prodStatusFilter')?.value || '';

    const allRows = Array.from(document.querySelectorAll('#productsTable tbody tr'));

    _prodFilteredRows = allRows.filter(row => {
        const name  = row.dataset.name?.toLowerCase() || '';
        const cat   = row.dataset.cat  || '';
        const avail = row.dataset.available || '';
        return (!searchVal || name.includes(searchVal))
            && (!catVal    || cat   === catVal)
            && (!statusVal || avail === statusVal);
    });

    // Hide ALL rows first
    allRows.forEach(r => r.style.display = 'none');

    _prodCurrentPage = 1;
    renderProdPage();
}

function renderProdPage() {
    const pageSize = parseInt(document.getElementById('prodPageSize')?.value || '10');
    const total    = _prodFilteredRows.length;
    const allRows  = Array.from(document.querySelectorAll('#productsTable tbody tr'));

    // Hide all, then show current slice
    allRows.forEach(r => r.style.display = 'none');

    let startIdx, endIdx;
    if (pageSize === 0) {
        // Show all
        startIdx = 0; endIdx = total;
    } else {
        startIdx = (_prodCurrentPage - 1) * pageSize;
        endIdx   = Math.min(startIdx + pageSize, total);
    }

    _prodFilteredRows.slice(startIdx, endIdx).forEach(r => r.style.display = '');

    // Update info text
    const infoEl = document.getElementById('prodPageInfo');
    if (infoEl) {
        if (total === 0) {
            infoEl.textContent = 'Không tìm thấy sản phẩm nào';
        } else if (pageSize === 0) {
            infoEl.textContent = `Hiển thị ${total} sản phẩm`;
        } else {
            infoEl.textContent = `${startIdx + 1}–${endIdx} / ${total} sản phẩm`;
        }
    }

    // Render page buttons
    const btnsEl = document.getElementById('prodPageBtns');
    if (!btnsEl) return;
    btnsEl.innerHTML = '';
    if (pageSize === 0 || total === 0) return;

    const totalPages = Math.ceil(total / pageSize);

    // Prev button
    const prev = document.createElement('button');
    prev.className = 'pm-page-btn'; prev.innerHTML = '‹';
    prev.disabled = _prodCurrentPage === 1;
    prev.onclick = () => { _prodCurrentPage--; renderProdPage(); };
    btnsEl.appendChild(prev);

    // Page number buttons (show max 5 around current)
    const range = buildPageRange(_prodCurrentPage, totalPages);
    range.forEach(pg => {
        if (pg === '...') {
            const dot = document.createElement('span');
            dot.textContent = '…'; dot.style.cssText = 'padding:0 4px;color:#9ca3af;font-size:.78rem;align-self:center;';
            btnsEl.appendChild(dot);
        } else {
            const btn = document.createElement('button');
            btn.className = 'pm-page-btn' + (pg === _prodCurrentPage ? ' active' : '');
            btn.textContent = pg;
            btn.onclick = () => { _prodCurrentPage = pg; renderProdPage(); };
            btnsEl.appendChild(btn);
        }
    });

    // Next button
    const next = document.createElement('button');
    next.className = 'pm-page-btn'; next.innerHTML = '›';
    next.disabled = _prodCurrentPage === totalPages;
    next.onclick = () => { _prodCurrentPage++; renderProdPage(); };
    btnsEl.appendChild(next);
}

function buildPageRange(current, total) {
    if (total <= 7) return Array.from({length: total}, (_, i) => i + 1);
    const pages = [];
    if (current <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', total);
    } else if (current >= total - 3) {
        pages.push(1, '...', total-4, total-3, total-2, total-1, total);
    } else {
        pages.push(1, '...', current-1, current, current+1, '...', total);
    }
    return pages;
}

function changePageSize() {
    _prodCurrentPage = 1;
    renderProdPage();
}

// ── Quick Price Edit inline ─────────────────────────────────────────────────
function showQuickPriceEdit(productId) {
    const row = document.querySelector(`tr[data-pid="${productId}"]`);
    if (!row) return;
    const costCell = row.querySelector('.td-cost');
    const priceCell = row.querySelector('.td-price');
    if (!costCell || !priceCell) return;

    const currentCost = parseFloat(costCell.dataset.val) || 0;
    const currentBase = parseFloat(priceCell.dataset.base) || 0;
    const currentPromo = parseFloat(priceCell.dataset.promo) || 0;

    Swal.fire({
        title: '⚡ Cập nhật giá nhanh',
        html: `
            <div style="text-align:left;font-size:.85rem;">
            <div class="mb-2"><label class="fw-bold">Giá nhập (Giá vốn):</label>
                <input id="qCost" type="number" class="form-control mt-1" value="${currentCost}" step="500" min="0"></div>
            <div class="mb-2"><label class="fw-bold">Giá bán (BasePrice):</label>
                <input id="qBase" type="number" class="form-control mt-1" value="${currentBase}" step="1000" min="0"></div>
            <div class="mb-2"><label class="fw-bold">Giá KM (PromoPrice):</label>
                <input id="qPromo" type="number" class="form-control mt-1" value="${currentPromo || ''}" step="1000" min="0" placeholder="Để trống nếu không có KM"></div>
            <div class="mb-1"><label class="fw-bold">Lý do điều chỉnh:</label>
                <input id="qReason" class="form-control mt-1" value="Cập nhật giá định kỳ" placeholder="Ghi chú lý do..."></div>
            </div>`,
        showCancelButton: true, confirmButtonColor: '#dc2626',
        cancelButtonText: 'Hủy', confirmButtonText: 'Lưu & ghi lịch sử',
        preConfirm: () => ({
            productId: productId,
            costPrice: parseFloat(document.getElementById('qCost').value) || 0,
            basePrice: parseFloat(document.getElementById('qBase').value) || 0,
            promoPrice: parseFloat(document.getElementById('qPromo').value) || null,
            reason: document.getElementById('qReason').value.trim() || 'Cập nhật giá nhanh'
        })
    }).then(r => {
        if (!r.isConfirmed || !r.value) return;
        fetch('/ProductManagement/QuickUpdatePrice', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r.value)
        }).then(res => res.json()).then(data => {
            if (data.success) { Swal.fire({ icon: 'success', title: data.message, timer: 1800, showConfirmButton: false }).then(() => location.reload()); }
        });
    });
}

// ── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    // Auto-generate slug from category name
    const catNameInput = document.getElementById('catName');
    const catSlugInput = document.getElementById('catSlug');
    if (catNameInput && catSlugInput) {
        catNameInput.addEventListener('input', function () {
            catSlugInput.value = this.value.toLowerCase().trim()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[đĐ]/g, 'd').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        });
    }

    // Profit calc event listeners
    ['prodCostPrice', 'prodBasePrice', 'prodPromoPrice'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', recalcProfit);
    });

    // Discount type toggle
    document.getElementById('vDiscountType')?.addEventListener('change', toggleDiscountTypeUI);

    // Init product pagination on page load
    filterProducts();
});
