/**
 * analytics.js  –  E-Coffee Revenue Analytics (Full-Screen POS Layout)
 * AJAX-driven: calls /Analytics/GetData with data from MockDbContext
 * Chart.js Dual Y-Axis Combo + Donut, Tab switching, Filter events
 */
'use strict';

const ECoffeeAnalytics = (() => {

    // ── State ────────────────────────────────────────────────────────────────────
    let _state = { fromDate:'', toDate:'', groupBy:'day', channel:'all', activeView:'all' };

    // ── Chart instances ──────────────────────────────────────────────────────────
    let _comboChart = null;
    let _donutChart = null;

    // ── Palette ──────────────────────────────────────────────────────────────────
    const RED   = '#e11d48';
    const AMBER = '#f59e0b';

    // ════════════════════════════════════════════════════════════════════════════
    // INIT
    // ════════════════════════════════════════════════════════════════════════════
    function init() {
        _readState();
        _initComboChart();
        _initDonutChart();
        _bindFilters();
        _bindViewToggle();
        _bindTabs();
        console.log('[ECoffeeAnalytics] Initialized ✓');
    }

    function _readState() {
        try {
            const d     = JSON.parse(document.getElementById('anInitData').textContent);
            _state.fromDate = d.fromDate || '';
            _state.toDate   = d.toDate   || '';
            _state.groupBy  = d.groupBy  || 'day';
            _state.channel  = d.channel  || 'all';
        } catch(e) { console.warn('anInitData parse error', e); }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // COMBO CHART (Bar qty + Line revenue) – Dual Y-Axis
    // ════════════════════════════════════════════════════════════════════════════
    function _initComboChart() {
        const canvas = document.getElementById('comboChart');
        if (!canvas) return;
        let cd;
        try { cd = JSON.parse(document.getElementById('anChartData').textContent); }
        catch(e) { return; }
        _comboChart = _buildComboChart(canvas, cd);
    }

    function _buildComboChart(canvas, cd) {
        const ctx = canvas.getContext('2d');

        const revGrad = ctx.createLinearGradient(0, 0, 0, canvas.parentElement?.offsetHeight || 300);
        revGrad.addColorStop(0, 'rgba(225,29,72,.20)');
        revGrad.addColorStop(1, 'rgba(225,29,72,.00)');

        const barGrad = ctx.createLinearGradient(0, 0, 0, canvas.parentElement?.offsetHeight || 300);
        barGrad.addColorStop(0, 'rgba(245,158,11,.92)');
        barGrad.addColorStop(1, 'rgba(251,191,36,.45)');

        return new Chart(ctx, {
            data: {
                labels: cd.labels || [],
                datasets: [
                    {
                        type: 'bar',
                        label: 'Số lượng',
                        data:  cd.quantities || [],
                        backgroundColor: barGrad,
                        borderColor: 'transparent',
                        borderRadius: 5,
                        borderSkipped: false,
                        yAxisID: 'yLeft',
                        order: 2,
                    },
                    {
                        type: 'line',
                        label: 'Doanh thu (đ)',
                        data:  cd.revenues || [],
                        borderColor:      RED,
                        backgroundColor:  revGrad,
                        fill:             true,
                        tension:          0.38,
                        pointRadius:      3.5,
                        pointHoverRadius: 6,
                        pointBackgroundColor: RED,
                        pointBorderColor:     '#fff',
                        pointBorderWidth:     1.5,
                        borderWidth:          2.5,
                        yAxisID: 'yRight',
                        order: 1,
                        spanGaps: true,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                animation: { duration: 550, easing: 'easeOutQuart' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#fff',
                        borderColor: '#e5e7eb',
                        borderWidth: 1,
                        padding: 12,
                        titleColor: '#111827',
                        bodyColor:  '#6b7280',
                        titleFont:  { family: 'Plus Jakarta Sans', weight:'700', size: 12 },
                        bodyFont:   { family: 'Plus Jakarta Sans', size: 11 },
                        boxPadding: 4,
                        usePointStyle: true,
                        callbacks: {
                            label: ctx => ctx.datasetIndex === 0
                                ? `  Số lượng: ${_fmtN(ctx.parsed.y)} ly`
                                : `  Doanh thu: ${_fmtM(ctx.parsed.y)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid:  { display: false },
                        ticks: { font: { family:'Plus Jakarta Sans', size:10.5, weight:'600' }, color:'#6b7280', maxRotation:45 }
                    },
                    yLeft: {
                        type: 'linear', position: 'left',
                        grid:  { color: 'rgba(0,0,0,0.05)', drawBorder: false },
                        ticks: { font: { family:'Plus Jakarta Sans', size:10.5 }, color:'#6b7280', callback: v => _fmtN(v)+' ly' },
                        title: { display:true, text:'Số lượng sản phẩm', font:{size:10,weight:'600',family:'Plus Jakarta Sans'}, color:'#6b7280' }
                    },
                    yRight: {
                        type: 'linear', position: 'right',
                        grid: { display: false },
                        ticks: { font: { family:'Plus Jakarta Sans', size:10.5 }, color: RED, callback: v => _fmtCompact(v) },
                        title: { display:true, text:'Doanh thu (VND)', font:{size:10,weight:'600',family:'Plus Jakarta Sans'}, color: RED }
                    }
                }
            }
        });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // DONUT CHART
    // ════════════════════════════════════════════════════════════════════════════
    function _initDonutChart() {
        const canvas = document.getElementById('categoryDonutChart');
        if (!canvas) return;
        let cats;
        try { cats = JSON.parse(document.getElementById('anCatData').textContent); }
        catch(e) { return; }
        _donutChart = _buildDonutChart(canvas, cats);
    }

    function _buildDonutChart(canvas, cats) {
        const ctx = canvas.getContext('2d');
        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: cats.map(c => c.name),
                datasets: [{
                    data:            cats.map(c => c.revenue),
                    backgroundColor: cats.map(c => c.color),
                    borderColor:     '#fff',
                    borderWidth:     2.5,
                    hoverOffset:     7,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '68%',
                animation: { duration: 600, easing: 'easeOutQuart' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor:'#fff', borderColor:'#e5e7eb', borderWidth:1,
                        padding:10, titleColor:'#111827', bodyColor:'#6b7280',
                        titleFont:{family:'Plus Jakarta Sans',weight:'700',size:11},
                        bodyFont:{family:'Plus Jakarta Sans',size:10.5},
                        callbacks: { label: c => ` ${_fmtM(c.parsed)} (${cats[c.dataIndex].sharePct}%)` }
                    }
                }
            }
        });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // FILTER / AJAX
    // ════════════════════════════════════════════════════════════════════════════
    function _bindFilters() {
        // Quick preset chips
        document.querySelectorAll('.an-chip[data-preset]').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.an-chip[data-preset]').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const [f, t] = _resolvePreset(chip.dataset.preset);
                document.getElementById('filterFrom').value = f;
                document.getElementById('filterTo').value   = t;
                _state.fromDate = f;
                _state.toDate   = t;
            });
        });

        // GroupBy chips
        document.querySelectorAll('.an-chip[data-groupby]').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.an-chip[data-groupby]').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                _state.groupBy = chip.dataset.groupby;
                document.getElementById('filterGroupBy').value = _state.groupBy;
            });
        });

        document.getElementById('filterChannel')?.addEventListener('change', e => {
            _state.channel = e.target.value;
        });

        document.getElementById('btnApply')?.addEventListener('click', _applyFilter);
        document.getElementById('btnExport')?.addEventListener('click', _exportExcel);
        document.getElementById('btnPrint')?.addEventListener('click',  _printReport);
    }

    function _resolvePreset(preset) {
        const today = new Date();
        const fmt   = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
        const addD  = (d,n) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
        const som   = d => { const r=new Date(d); r.setDate(1); return r; };
        const eom   = d => { const r=new Date(d); r.setMonth(r.getMonth()+1); r.setDate(0); return r; };
        const sow   = d => { const r=new Date(d); r.setDate(r.getDate()-(r.getDay()===0?6:r.getDay()-1)); return r; };
        const eow   = d => { const r=new Date(d); r.setDate(r.getDate()+(7-(r.getDay()===0?7:r.getDay()))); return r; };
        switch (preset) {
            case 'today':     return [fmt(today), fmt(today)];
            case 'yesterday': return [fmt(addD(today,-1)), fmt(addD(today,-1))];
            case '7d':        return [fmt(addD(today,-6)), fmt(today)];
            case '14d':       return [fmt(addD(today,-13)), fmt(today)];
            case '30d':       return [fmt(addD(today,-29)), fmt(today)];
            case 'thisweek':  return [fmt(sow(today)), fmt(eow(today))];
            case 'thismonth': return [fmt(som(today)), fmt(eom(today))];
            case 'lastmonth': { const lm=new Date(today.getFullYear(),today.getMonth()-1,1); return [fmt(som(lm)),fmt(eom(lm))]; }
            default: return [fmt(addD(today,-6)), fmt(today)];
        }
    }

    function _applyFilter() {
        const from = document.getElementById('filterFrom')?.value || _state.fromDate;
        const to   = document.getElementById('filterTo')?.value   || _state.toDate;
        const grp  = document.getElementById('filterGroupBy')?.value || _state.groupBy;
        const chan  = document.getElementById('filterChannel')?.value || _state.channel;

        if (!from || !to) {
            if (typeof Swal !== 'undefined')
                Swal.fire('Thiếu thông tin','Vui lòng chọn khoảng thời gian','warning');
            return;
        }
        _state = { ..._state, fromDate:from, toDate:to, groupBy:grp, channel:chan };

        // Update topbar date range display
        _setEl('topbarDateRange', `${from} – ${to}`);

        _setLoading(true);

        fetch('/Analytics/GetData', {
            method:  'POST',
            headers: { 'Content-Type':'application/json' },
            body:    JSON.stringify({ fromDate:from, toDate:to, groupBy:grp, channel:chan })
        })
        .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
        .then(resp => {
            if (!resp.success) throw new Error(resp.message || 'Lỗi máy chủ');
            _updateKpi(resp.kpi);
            _updateComboChart(resp.chartData);
            _updateDonutChart(resp.categoryData);
            _updateTopProducts(resp.topProducts);
            _updateDetailTable(resp.detailRows);
        })
        .catch(err => {
            console.error(err);
            if (typeof Swal !== 'undefined')
                Swal.fire('Lỗi', 'Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại.', 'error');
        })
        .finally(() => _setLoading(false));
    }

    // ════════════════════════════════════════════════════════════════════════════
    // UPDATE FUNCTIONS (AJAX response)
    // ════════════════════════════════════════════════════════════════════════════

    function _updateKpi(kpi) {
        if (!kpi) return;
        _setEl('kpiRevenue',  _fmtM(kpi.totalRevenue));
        _setEl('kpiItems',    _fmtN(kpi.totalItemsSold));
        _setEl('kpiOrders',   _fmtN(kpi.totalOrders));
        _setEl('kpiAov',      _fmtM(kpi.averageOrderValue));
        _setEl('kpiNet',      _fmtM(kpi.netRevenue));
        _setEl('kpiDiscount', _fmtM(kpi.voucherDiscount));
        _setEl('kpiPeakHour', kpi.peakHour || '—');

        _setBadge('badgeRevenue', kpi.revenuePctChange);
        _setBadge('badgeItems',   kpi.itemsSoldPctChange);
        _setBadge('badgeOrders',  kpi.ordersPctChange);
        _setBadge('badgeAov',     kpi.aovPctChange);

        // Channel bars
        const maxRev = Math.max(1, kpi.dineInRevenue, kpi.deliveryRevenue, kpi.pickupRevenue);
        _updateChannelList([
            { name:'Tại Bàn (Dine-in)',      icon:'bi-shop',          color:'#e11d48', colorA:'rgba(225,29,72,.12)',  rev:kpi.dineInRevenue,   pct:kpi.dineInPct,   orders:kpi.dineInOrders   },
            { name:'Giao Tận Nơi',            icon:'bi-truck',          color:'#3b82f6', colorA:'rgba(59,130,246,.12)', rev:kpi.deliveryRevenue, pct:kpi.deliveryPct, orders:kpi.deliveryOrders },
            { name:'Mang Đi / Đến Lấy',       icon:'bi-bag-check-fill', color:'#10b981', colorA:'rgba(16,185,129,.12)', rev:kpi.pickupRevenue,   pct:kpi.pickupPct,   orders:kpi.pickupOrders   }
        ], maxRev);

        // Summary strip
        const detailData = _tryParseEl('anDetailData');
        if (detailData) {
            const totNet   = detailData.reduce((s,r) => s+r.netRevenue, 0);
            const totItems = detailData.reduce((s,r) => s+r.itemsSold, 0);
            _setEl('summaryNet',   _fmtM(kpi.netRevenue));
            _setEl('summaryItems', `· ${_fmtN(kpi.totalItemsSold)} ly`);
        }
    }

    function _updateChannelList(channels, maxRev) {
        const list = document.getElementById('channelList');
        if (!list) return;
        list.innerHTML = channels.map(ch => {
            const barPct = Math.round((ch.rev / maxRev) * 100 * 10) / 10;
            return `<div class="an-ch-item">
                <div class="an-ch-top">
                    <div class="an-ch-name">
                        <div class="an-ch-badge" style="background:${_esc(ch.colorA)};">
                            <i class="bi ${_esc(ch.icon)}" style="color:${_esc(ch.color)};"></i>
                        </div>
                        ${_esc(ch.name)}
                    </div>
                    <div class="an-ch-stats">
                        <strong style="color:${_esc(ch.color)};">${_fmtM(ch.rev)}</strong> · ${ch.orders} đơn (${(ch.pct||0).toFixed(0)}%)
                    </div>
                </div>
                <div class="an-ch-track">
                    <div class="an-ch-fill" style="background:${_esc(ch.color)}; width:${barPct}%;"></div>
                </div>
            </div>`;
        }).join('');
    }

    function _updateComboChart(cd) {
        if (!_comboChart || !cd) return;
        _comboChart.data.labels               = cd.labels     || [];
        _comboChart.data.datasets[0].data     = cd.quantities || [];
        _comboChart.data.datasets[1].data     = cd.revenues   || [];
        _comboChart.update('active');
        _applyViewFilter();
    }

    function _updateDonutChart(cats) {
        if (!_donutChart || !cats || !cats.length) return;
        _donutChart.data.labels                       = cats.map(c => c.name);
        _donutChart.data.datasets[0].data             = cats.map(c => c.revenue);
        _donutChart.data.datasets[0].backgroundColor  = cats.map(c => c.color);
        _donutChart.update('active');

        const total = cats.reduce((s,c) => s+c.revenue, 0);
        _setEl('donutTotal', _fmtM(total));

        const list = document.getElementById('categoryLegendList');
        if (list) {
            list.innerHTML = cats.map(c => `
                <li class="an-cat-item">
                    <span class="an-cat-dot" style="background:${_esc(c.color)};"></span>
                    <span class="an-cat-name" title="${_esc(c.name)}">${_esc(c.name)}</span>
                    <span class="an-cat-pct">${c.sharePct}%</span>
                    <span class="an-cat-rev text-money">${_fmtM(c.revenue)}</span>
                </li>`).join('');
        }
    }

    function _updateTopProducts(products) {
        const tbody = document.getElementById('topProductsTbody');
        if (!tbody || !products) return;
        _setEl('tabBadgeTop', products.length);
        tbody.innerHTML = products.map(p => `
            <tr>
                <td><div class="prod-rank ${p.rank<=3?'rank-'+p.rank:'rank-other'}">${p.rank}</div></td>
                <td>
                    <div class="prod-name-cell">
                        <img src="${_esc(p.imageUrl)}" alt="${_esc(p.name)}" class="prod-img-sm" loading="lazy">
                        <div>
                            <div class="prod-name">${_esc(p.name)}</div>
                            <div class="prod-cat">${_esc(p.categoryName)}</div>
                        </div>
                    </div>
                </td>
                <td class="fw-700">${_fmtN(p.quantitySold)} ly</td>
                <td class="text-money text-danger-bold">${_fmtM(p.revenue)}</td>
                <td>
                    <div class="share-bar-wrap">
                        <div class="share-bar-track"><div class="share-bar-fill" style="width:${p.sharePct}%"></div></div>
                        <span class="share-pct-text">${p.sharePct}%</span>
                    </div>
                </td>
            </tr>`).join('');
    }

    function _updateDetailTable(rows) {
        const tbody = document.getElementById('detailTbody');
        const tfoot = document.getElementById('detailTfoot');
        if (!tbody || !rows) return;

        const totOrders = rows.reduce((s,r)=>s+r.orders,0);
        const totItems  = rows.reduce((s,r)=>s+r.itemsSold,0);
        const totGross  = rows.reduce((s,r)=>s+r.grossRevenue,0);
        const totDisc   = rows.reduce((s,r)=>s+r.discounts,0);
        const totNet    = rows.reduce((s,r)=>s+r.netRevenue,0);
        const totAvg    = totOrders > 0 ? totNet / totOrders : 0;

        _setEl('tabBadgeDetail', rows.length + ' kỳ');
        _setEl('summaryNet',   _fmtM(totNet));
        _setEl('summaryItems', `· ${_fmtN(totItems)} ly`);

        tbody.innerHTML = rows.map(r => `
            <tr>
                <td class="fw-700">${_esc(r.label)}</td>
                <td>${r.orders}</td>
                <td>${_fmtN(r.itemsSold)}</td>
                <td class="text-money">${_fmtM(r.grossRevenue)}</td>
                <td class="text-money text-muted-sm">${r.discounts>0?'-'+_fmtM(r.discounts):'—'}</td>
                <td class="text-money text-success-bold">${_fmtM(r.netRevenue)}</td>
                <td class="text-money">${_fmtM(r.avgOrderValue)}</td>
            </tr>`).join('');

        if (tfoot) tfoot.innerHTML = `
            <td>Tổng cộng</td>
            <td>${totOrders}</td>
            <td>${_fmtN(totItems)}</td>
            <td class="text-money">${_fmtM(totGross)}</td>
            <td class="text-money text-muted-sm">${totDisc>0?'-'+_fmtM(totDisc):'—'}</td>
            <td class="text-money text-success-bold">${_fmtM(totNet)}</td>
            <td class="text-money">${_fmtM(totAvg)}</td>`;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // VIEW TOGGLE
    // ════════════════════════════════════════════════════════════════════════════
    function _bindViewToggle() {
        document.querySelectorAll('.an-view-btn[data-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.an-view-btn[data-view]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                _state.activeView = btn.dataset.view;
                _applyViewFilter();
            });
        });
    }

    function _applyViewFilter() {
        if (!_comboChart) return;
        const v = _state.activeView;
        _comboChart.data.datasets[0].hidden = (v === 'revenue');
        _comboChart.data.datasets[1].hidden = (v === 'quantity');
        _comboChart.update('active');
    }

    // ════════════════════════════════════════════════════════════════════════════
    // TAB SWITCHING
    // ════════════════════════════════════════════════════════════════════════════
    function _bindTabs() {
        document.querySelectorAll('.an-tab-btn[data-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tab;
                document.querySelectorAll('.an-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.an-tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('tab-' + target)?.classList.add('active');
            });
        });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // LOADING STATE
    // ════════════════════════════════════════════════════════════════════════════
    function _setLoading(on) {
        document.querySelectorAll('.an-loading-overlay').forEach(el => el.classList.toggle('visible', on));
        const btn = document.getElementById('btnApply');
        if (btn) {
            btn.disabled   = on;
            btn.innerHTML  = on
                ? '<span class="spinner-border spinner-border-sm me-1" style="width:12px;height:12px;border-width:2px;"></span>Đang tải...'
                : '<i class="bi bi-funnel-fill"></i>Áp dụng';
        }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // EXPORT EXCEL (SheetJS – 3 sheets)
    // ════════════════════════════════════════════════════════════════════════════
    function _exportExcel() {
        if (typeof XLSX === 'undefined') {
            if (typeof Swal !== 'undefined') Swal.fire('Chưa sẵn sàng','Thư viện Excel chưa tải, thử lại sau.','warning');
            return;
        }
        const from = _state.fromDate || '';
        const to   = _state.toDate   || '';
        const wb   = XLSX.utils.book_new();

        // Sheet 1: Tổng Quan KPI
        const kpiData = [
            ['BÁO CÁO DOANH THU – E-COFFEE', ''],
            ['Kỳ: ' + from + ' – ' + to, ''],
            [],
            ['Chỉ tiêu', 'Giá trị'],
            ['Tổng doanh thu (gộp)', document.getElementById('kpiRevenue')?.textContent?.trim()||''],
            ['Sản phẩm bán',         document.getElementById('kpiItems')?.textContent?.trim()||''],
            ['Số đơn hàng',           document.getElementById('kpiOrders')?.textContent?.trim()||''],
            ['AOV / Đơn',            document.getElementById('kpiAov')?.textContent?.trim()||''],
            ['Doanh thu thuần',      document.getElementById('kpiNet')?.textContent?.trim()||''],
            ['Giảm giá Voucher',     document.getElementById('kpiDiscount')?.textContent?.trim()||''],
        ];
        const wsKpi = XLSX.utils.aoa_to_sheet(kpiData);
        wsKpi['!cols'] = [{wch:30},{wch:22}];
        XLSX.utils.book_append_sheet(wb, wsKpi, 'Tổng Quan');

        // Sheet 2: Chi Tiết Doanh Thu
        const detailTable = document.getElementById('detailTable');
        if (detailTable) {
            const wsDetail = XLSX.utils.table_to_sheet(detailTable, {raw:false});
            wsDetail['!cols'] = Array(7).fill({wch:18});
            XLSX.utils.book_append_sheet(wb, wsDetail, 'Chi Tiết DT');
        }

        // Sheet 3: Top Sản Phẩm (text only – bỏ ảnh)
        const topTable = document.getElementById('topProductsTable');
        if (topTable) {
            const rows = Array.from(topTable.querySelectorAll('tr')).map(tr =>
                Array.from(tr.querySelectorAll('th,td')).map(td => td.textContent.trim())
            );
            const wsTop = XLSX.utils.aoa_to_sheet(rows);
            wsTop['!cols'] = [{wch:5},{wch:28},{wch:14},{wch:16},{wch:12}];
            XLSX.utils.book_append_sheet(wb, wsTop, 'Top Sản Phẩm');
        }

        XLSX.writeFile(wb, 'doanh-thu_' + from.replace(/\//g,'-') + '_' + to.replace(/\//g,'-') + '.xlsx');
    }

    // ════════════════════════════════════════════════════════════════════════════
    // PRINT REPORT (popup window – bypass overflow:hidden của POS layout)
    // ════════════════════════════════════════════════════════════════════════════
    function _printReport() {
        const from = _state.fromDate || '';
        const to   = _state.toDate   || '';
        const kpiCells = [
            ['Tổng Doanh Thu', 'kpiRevenue'],['Sản Phẩm Bán','kpiItems'],
            ['Số Đơn Hàng','kpiOrders'],['AOV / Đơn','kpiAov'],
            ['DT Thuần','kpiNet'],['Giảm Giá','kpiDiscount'],
        ].map(([l,id]) => '<td style="width:16.6%;padding:10px 14px;border:1px solid #e5e7eb;vertical-align:top;">'
            + '<div style="font-size:.65rem;color:#6b7280;font-weight:700;text-transform:uppercase;margin-bottom:3px;">'+l+'</div>'
            + '<div style="font-size:1.1rem;font-weight:800;">'+(document.getElementById(id)?.textContent?.trim()||'')+'</div>'
            + '</td>').join('');

        const detailHtml = document.getElementById('detailTable')?.outerHTML || '<p>Không có dữ liệu</p>';
        const topHtml = Array.from(document.getElementById('topProductsTable')?.querySelectorAll('tr')||[])
            .map(tr => '<tr>'+Array.from(tr.querySelectorAll('th,td'))
                .map(td => '<'+td.tagName.toLowerCase()+'>'+td.textContent.trim()+'</'+td.tagName.toLowerCase()+'>')
                .join('')+'</tr>').join('');

        const win = window.open('','_blank','width=1100,height=750');
        if (!win) { alert('Vui lòng cho phép popup để in báo cáo.'); return; }
        win.document.write('<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8">'
            + '<title>Báo cáo Doanh Thu | E-Coffee</title>'
            + '<style>*{box-sizing:border-box;margin:0;padding:0}'
            + 'body{font-family:"Segoe UI",Arial,sans-serif;padding:28px;color:#111;font-size:13px}'
            + 'h1{font-size:1.25rem;font-weight:800;margin-bottom:3px}'
            + '.sub{color:#6b7280;font-size:.8rem;margin-bottom:18px}'
            + 'table{border-collapse:collapse;width:100%;font-size:.8rem;margin-bottom:20px}'
            + 'th,td{border:1px solid #e5e7eb;padding:6px 10px;text-align:left}'
            + 'thead th{background:#f3f4f6;font-weight:700;font-size:.7rem;text-transform:uppercase}'
            + 'tfoot td{background:#f9fafb;font-weight:800}'
            + 'h3{font-size:.9rem;font-weight:800;margin:18px 0 8px;color:#374151}'
            + '.btn{margin-top:14px;padding:7px 18px;background:#e11d48;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer}'
            + '@media print{.btn{display:none}}</style></head><body>'
            + '<h1>📊 Báo Cáo Doanh Thu – E-Coffee</h1>'
            + '<div class="sub">Kỳ: <strong>'+from+'</strong> – <strong>'+to+'</strong></div>'
            + '<table style="margin-bottom:20px;"><tr>'+kpiCells+'</tr></table>'
            + '<h3>Chi Tiết Doanh Thu Theo Kỳ</h3>'+detailHtml
            + '<h3>Top Sản Phẩm Bán Chạy</h3><table><tbody>'+topHtml+'</tbody></table>'
            + '<button class="btn" onclick="window.print()">🖨️ In Ngay</button>'
            + '</body></html>');
        win.document.close();
        setTimeout(() => win.print(), 900);
    }

    // ════════════════════════════════════════════════════════════════════════════
    // UTILS
    // ════════════════════════════════════════════════════════════════════════════
    function _fmtM(v) {
        v = parseFloat(v)||0;
        if (v>=1_000_000) return (v/1_000_000).toLocaleString('vi-VN',{minimumFractionDigits:0,maximumFractionDigits:2})+'M đ';
        return new Intl.NumberFormat('vi-VN').format(Math.round(v))+' đ';
    }
    function _fmtCompact(v) {
        v = parseFloat(v)||0;
        if (v>=1_000_000) return (v/1_000_000).toFixed(1)+'M';
        if (v>=1_000)     return (v/1_000).toFixed(0)+'K';
        return Math.round(v)+'';
    }
    function _fmtN(v) { return new Intl.NumberFormat('vi-VN').format(parseInt(v)||0); }
    function _esc(s) { return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function _setEl(id, val) { const el=document.getElementById(id); if(el) el.textContent=val; }
    function _setBadge(id, pct) {
        const el = document.getElementById(id);
        if (!el) return;
        const n = parseFloat(pct)||0;
        el.className = 'kpi-badge ' + (n>0?'positive':n<0?'negative':'neutral');
        el.innerHTML = (n>0?'<i class="bi bi-arrow-up-short"></i>':n<0?'<i class="bi bi-arrow-down-short"></i>':'<i class="bi bi-dash"></i>') + Math.abs(n).toFixed(1)+'%';
    }
    function _tryParseEl(id) {
        try { return JSON.parse(document.getElementById(id)?.textContent||'null'); }
        catch(e) { return null; }
    }

    return { init, applyFilter: _applyFilter };
})();

document.addEventListener('DOMContentLoaded', ECoffeeAnalytics.init);
