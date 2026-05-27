const ADMIN_PASSWORD = 'TecnoPro2026Secure!';

let allRequests = [];
let currentPage = 1;
let itemsPerPage = 20;
let currentSort = { field: 'id', direction: 'desc' };
let currentSearch = '';
let currentDateFrom = '';
let currentDateTo = '';
let currentTypeFilter = 'all';
let currentStatusFilter = 'all';
let selectedRequests = new Set();
let comments = JSON.parse(localStorage.getItem('tehno_comments') || '{}');
let statusHistory = JSON.parse(localStorage.getItem('tehno_history') || '{}');
let lastNewCount = 0;
let notificationSound = null;

// ===== ТЁМНАЯ ТЕМА =====
const themeToggle = document.getElementById('themeToggle');
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-theme');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
} else {
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
}
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    if (document.body.classList.contains('dark-theme')) {
        localStorage.setItem('theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        localStorage.setItem('theme', 'light');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
});

// ===== ЗВУК =====
try {
    notificationSound = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3');
} catch(e) { console.log('Звук не загружен'); }

// ===== ЛОГИН =====
document.getElementById('loginBtn').addEventListener('click', () => {
    const password = document.getElementById('passwordInput').value;
    if (password === ADMIN_PASSWORD) {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('adminContainer').style.display = 'block';
        loadRequests();
        setInterval(() => { checkNewRequests(); loadStats(); }, 30000);
        setInterval(loadStats, 30000);
        initChart();
    } else {
        document.getElementById('loginError').textContent = 'Неверный пароль';
    }
});
document.getElementById('passwordInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
});
document.getElementById('logoutBtn').addEventListener('click', () => {
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('adminContainer').style.display = 'none';
    document.getElementById('passwordInput').value = '';
});

// ===== ФИЛЬТРЫ И ПОИСК =====
document.getElementById('searchInput').addEventListener('input', (e) => {
    currentSearch = e.target.value.toLowerCase();
    currentPage = 1;
    renderTable();
});
document.getElementById('dateFrom').addEventListener('change', (e) => {
    currentDateFrom = e.target.value;
    currentPage = 1;
    renderTable();
});
document.getElementById('dateTo').addEventListener('change', (e) => {
    currentDateTo = e.target.value;
    currentPage = 1;
    renderTable();
});
document.getElementById('typeFilter').addEventListener('change', (e) => {
    currentTypeFilter = e.target.value;
    currentPage = 1;
    renderTable();
});
document.getElementById('statusFilter').addEventListener('change', (e) => {
    currentStatusFilter = e.target.value;
    currentPage = 1;
    renderTable();
});
document.getElementById('resetFiltersBtn').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    document.getElementById('typeFilter').value = 'all';
    document.getElementById('statusFilter').value = 'all';
    currentSearch = '';
    currentDateFrom = '';
    currentDateTo = '';
    currentTypeFilter = 'all';
    currentStatusFilter = 'all';
    currentPage = 1;
    renderTable();
});

// ===== ПАГИНАЦИЯ =====
document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderTable(); }
});
document.getElementById('nextPage').addEventListener('click', () => {
    const totalPages = Math.ceil(getFilteredRequests().length / itemsPerPage);
    if (currentPage < totalPages) { currentPage++; renderTable(); }
});

// ===== СОРТИРОВКА =====
document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
        const field = th.getAttribute('data-sort');
        if (currentSort.field === field) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.field = field;
            currentSort.direction = 'asc';
        }
        renderTable();
    });
});

// ===== МАССОВЫЕ ДЕЙСТВИЯ =====
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
selectAllCheckbox.addEventListener('change', (e) => {
    const filtered = getFilteredRequests();
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);
    if (e.target.checked) {
        paginated.forEach(r => selectedRequests.add(r.id));
    } else {
        paginated.forEach(r => selectedRequests.delete(r.id));
    }
    updateBulkActions();
    renderTable();
});
document.getElementById('bulkDoneBtn').addEventListener('click', async () => {
    for (const id of selectedRequests) {
        await fetch(`/api/request/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'done' })
        });
        addToHistory(id, 'done', 'Массовое изменение');
    }
    selectedRequests.clear();
    updateBulkActions();
    loadRequests();
});
document.getElementById('bulkDeleteBtn').addEventListener('click', async () => {
    if (!confirm(`Удалить ${selectedRequests.size} заявок?`)) return;
    for (const id of selectedRequests) {
        await fetch(`/api/request/${id}`, { method: 'DELETE' });
        delete comments[id];
    }
    localStorage.setItem('tehno_comments', JSON.stringify(comments));
    selectedRequests.clear();
    updateBulkActions();
    loadRequests();
});
document.getElementById('bulkCancelBtn').addEventListener('click', () => {
    selectedRequests.clear();
    updateBulkActions();
    renderTable();
});

// ===== ЭКСПОРТ EXCEL =====
document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);

// ===== ГРАФИК =====
let chart = null;
async function initChart() {
    const ctx = document.getElementById('requestsChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Заявки', data: [], borderColor: '#00a8ff', backgroundColor: 'rgba(0,168,255,0.1)', fill: true }] },
        options: { responsive: true, maintainAspectRatio: true }
    });
    updateChart();
}
document.getElementById('chartPeriod').addEventListener('change', () => updateChart());
async function updateChart() {
    const period = parseInt(document.getElementById('chartPeriod').value);
    const now = new Date();
    const dates = [];
    const counts = [];
    for (let i = period - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().slice(0,10);
        dates.push(dateStr.slice(5));
        const count = allRequests.filter(r => r.created_at.slice(0,10) === dateStr).length;
        counts.push(count);
    }
    if (chart) {
        chart.data.labels = dates;
        chart.data.datasets[0].data = counts;
        chart.update();
    }
}

// ===== УВЕДОМЛЕНИЯ =====
async function checkNewRequests() {
    const res = await fetch('/api/stats');
    const data = await res.json();
    if (data.new_count > lastNewCount) {
        document.getElementById('notificationBadge').textContent = data.new_count - lastNewCount;
        if (notificationSound) notificationSound.play();
        document.getElementById('notificationBell').style.animation = 'none';
        setTimeout(() => { document.getElementById('notificationBell').style.animation = ''; }, 100);
    }
    lastNewCount = data.new_count;
}
setInterval(checkNewRequests, 10000);

// ===== ОСНОВНЫЕ ФУНКЦИИ =====
async function loadRequests() {
    try {
        const res = await fetch('/api/requests');
        allRequests = await res.json();
        updateStats();
        updateChart();
        renderTable();
    } catch (err) {
        document.getElementById('requestsBody').innerHTML = '<tr><td colspan="9">Ошибка загрузки</td></tr>';
    }
}
function updateStats() {
    const total = allRequests.length;
    const newCount = allRequests.filter(r => r.status === 'new').length;
    const workCount = allRequests.filter(r => r.status === 'work').length;
    const doneCount = allRequests.filter(r => r.status === 'done').length;
    document.getElementById('totalCount').textContent = total;
    document.getElementById('newCount').textContent = newCount;
    document.getElementById('workCount').textContent = workCount;
    document.getElementById('doneCount').textContent = doneCount;
    document.getElementById('notificationBadge').textContent = newCount;
    lastNewCount = newCount;
}
function getFilteredRequests() {
    let filtered = [...allRequests];
    if (currentSearch) {
        filtered = filtered.filter(r => 
            r.name.toLowerCase().includes(currentSearch) ||
            r.phone.toLowerCase().includes(currentSearch) ||
            (r.service && r.service.toLowerCase().includes(currentSearch)) ||
            (r.model && r.model.toLowerCase().includes(currentSearch))
        );
    }
    if (currentTypeFilter !== 'all') {
        filtered = filtered.filter(r => r.type === currentTypeFilter);
    }
    if (currentStatusFilter !== 'all') {
        filtered = filtered.filter(r => r.status === currentStatusFilter);
    }
    if (currentDateFrom) {
        filtered = filtered.filter(r => r.created_at.slice(0,10) >= currentDateFrom);
    }
    if (currentDateTo) {
        filtered = filtered.filter(r => r.created_at.slice(0,10) <= currentDateTo);
    }
    filtered.sort((a, b) => {
        let valA = a[currentSort.field];
        let valB = b[currentSort.field];
        if (currentSort.field === 'date') {
            valA = new Date(a.created_at);
            valB = new Date(b.created_at);
        }
        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
    return filtered;
}
function updateBulkActions() {
    const bulkDiv = document.getElementById('bulkActions');
    if (selectedRequests.size > 0) {
        bulkDiv.style.display = 'flex';
        document.getElementById('selectedCount').textContent = selectedRequests.size;
    } else {
        bulkDiv.style.display = 'none';
    }
}
function renderTable() {
    const filtered = getFilteredRequests();
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);
    document.getElementById('pageInfo').textContent = `Страница ${currentPage} из ${totalPages || 1}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages || totalPages === 0;
    if (paginated.length === 0) {
        document.getElementById('requestsBody').innerHTML = '<tr><td colspan="9">Нет заявок</td></tr>';
        return;
    }
    const pageIds = new Set(paginated.map(r => r.id));
    const allSelected = paginated.length > 0 && paginated.every(r => selectedRequests.has(r.id));
    selectAllCheckbox.checked = allSelected;
    selectAllCheckbox.indeterminate = !allSelected && paginated.some(r => selectedRequests.has(r.id));
    document.getElementById('requestsBody').innerHTML = paginated.map(req => `
        <tr data-id="${req.id}">
            <td><input type="checkbox" class="row-checkbox" data-id="${req.id}" ${selectedRequests.has(req.id) ? 'checked' : ''}></td>
            <td>${req.id}</td>
            <td>${new Date(req.created_at).toLocaleString()}</td>
            <td>${escapeHtml(req.name)}</td>
            <td>${escapeHtml(req.phone)}</td>
            <td>${escapeHtml(req.model || '-')}</td>
            <td>${escapeHtml(req.service || req.type)}</td>
            <td>${getStatusBadge(req.status)}</td>
            <td class="action-buttons">
                ${req.status !== 'work' ? `<button class="action-btn action-work" onclick="updateStatus(${req.id}, 'work')"><i class="fas fa-tools"></i></button>` : ''}
                ${req.status !== 'done' ? `<button class="action-btn action-done" onclick="updateStatus(${req.id}, 'done')"><i class="fas fa-check"></i></button>` : ''}
                <button class="action-btn action-call" onclick="window.open('tel:${req.phone}')"><i class="fas fa-phone"></i></button>
                <button class="action-btn action-comment" onclick="openCommentModal(${req.id})"><i class="fas fa-comment"></i>${comments[req.id] ? '✏️' : ''}</button>
                <button class="action-btn action-history" onclick="openHistoryModal(${req.id})"><i class="fas fa-history"></i></button>
                <button class="action-btn action-delete" onclick="deleteRequest(${req.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
    document.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = parseInt(e.target.getAttribute('data-id'));
            if (e.target.checked) selectedRequests.add(id);
            else selectedRequests.delete(id);
            updateBulkActions();
            renderTable();
        });
    });
}
function getStatusBadge(status) {
    const labels = { new: 'Новая', work: 'В работе', done: 'Выполнено' };
    const classes = { new: 'status-new', work: 'status-work', done: 'status-done' };
    return `<span class="status-badge ${classes[status] || ''}">${labels[status] || status}</span>`;
}
window.updateStatus = async (id, status) => {
    try {
        await fetch(`/api/request/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        addToHistory(id, status);
        loadRequests();
    } catch (err) {}
};
window.deleteRequest = async (id) => {
    if (!confirm('Удалить заявку?')) return;
    try {
        await fetch(`/api/request/${id}`, { method: 'DELETE' });
        delete comments[id];
        localStorage.setItem('tehno_comments', JSON.stringify(comments));
        selectedRequests.delete(id);
        loadRequests();
    } catch (err) {}
};
function addToHistory(id, newStatus, note = '') {
    const history = statusHistory[id] || [];
    history.unshift({
        date: new Date().toLocaleString(),
        status: newStatus,
        note: note
    });
    statusHistory[id] = history.slice(0, 20);
    localStorage.setItem('tehno_history', JSON.stringify(statusHistory));
}
function openCommentModal(id) {
    currentCommentId = id;
    document.getElementById('commentRequestId').textContent = id;
    document.getElementById('commentText').value = comments[id] || '';
    const historyDiv = document.getElementById('commentHistory');
    const hist = statusHistory[id] || [];
    if (hist.length > 0) {
        historyDiv.innerHTML = '<strong>Последние изменения:</strong><br>' + 
            hist.slice(0, 3).map(h => `<div>${h.date} → ${h.status}</div>`).join('');
    } else {
        historyDiv.innerHTML = '';
    }
    document.getElementById('commentModal').classList.add('active');
}
function openHistoryModal(id) {
    const history = statusHistory[id] || [];
    const listDiv = document.getElementById('historyList');
    if (history.length === 0) {
        listDiv.innerHTML = '<div class="history-item">История пуста</div>';
    } else {
        listDiv.innerHTML = history.map(h => `
            <div class="history-item">
                <div class="history-date">${h.date}</div>
                <div>Статус изменён на: <strong>${h.status}</strong></div>
                ${h.note ? `<div>${h.note}</div>` : ''}
            </div>
        `).join('');
    }
    document.getElementById('historyModal').classList.add('active');
}
document.getElementById('closeCommentModal').addEventListener('click', () => {
    document.getElementById('commentModal').classList.remove('active');
});
document.getElementById('closeHistoryModal').addEventListener('click', () => {
    document.getElementById('historyModal').classList.remove('active');
});
document.getElementById('cancelCommentBtn').addEventListener('click', () => {
    document.getElementById('commentModal').classList.remove('active');
});
document.getElementById('saveCommentBtn').addEventListener('click', () => {
    const comment = document.getElementById('commentText').value;
    if (comment.trim()) {
        comments[currentCommentId] = comment;
    } else {
        delete comments[currentCommentId];
    }
    localStorage.setItem('tehno_comments', JSON.stringify(comments));
    document.getElementById('commentModal').classList.remove('active');
    renderTable();
});
let currentCommentId = null;
function exportToExcel() {
    const filtered = getFilteredRequests();
    const headers = ['ID', 'Дата', 'Тип', 'Имя', 'Телефон', 'Модель', 'Услуга', 'Статус', 'Комментарий'];
    const rows = filtered.map(r => [
        r.id, new Date(r.created_at).toLocaleString(), r.type === 'repair' ? 'Ремонт' : 'Бизнес',
        r.name, r.phone, r.model || '', r.service || '', r.status, comments[r.id] || ''
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tehnopro_${new Date().toISOString().slice(0,19)}.csv`;
    link.click();
}
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}
