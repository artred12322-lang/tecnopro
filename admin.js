const ADMIN_PASSWORD = 'admin123';

let allRequests = [];
let currentTab = 'all';
let currentPage = 1;
let itemsPerPage = 20;
let currentSort = { field: 'id', direction: 'desc' };
let currentSearch = '';
let currentDateFilter = 'all';
let currentTypeFilter = 'all';

// Хранилище комментариев
let comments = JSON.parse(localStorage.getItem('tecno_comments') || '{}');

// ЛОГИН
document.getElementById('loginBtn').addEventListener('click', () => {
    const password = document.getElementById('passwordInput').value;
    if (password === ADMIN_PASSWORD) {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('adminContainer').style.display = 'block';
        loadRequests();
        setInterval(loadRequests, 30000);
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

// ЭКСПОРТ
document.getElementById('exportBtn').addEventListener('click', exportToCSV);

// ФИЛЬТРЫ
document.getElementById('searchInput').addEventListener('input', (e) => {
    currentSearch = e.target.value.toLowerCase();
    currentPage = 1;
    renderTable();
});
document.getElementById('dateFilter').addEventListener('change', (e) => {
    currentDateFilter = e.target.value;
    currentPage = 1;
    renderTable();
});
document.getElementById('typeFilter').addEventListener('change', (e) => {
    currentTypeFilter = e.target.value;
    currentPage = 1;
    renderTable();
});
document.getElementById('resetFiltersBtn').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('dateFilter').value = 'all';
    document.getElementById('typeFilter').value = 'all';
    currentSearch = '';
    currentDateFilter = 'all';
    currentTypeFilter = 'all';
    currentPage = 1;
    renderTable();
});

// ПАГИНАЦИЯ
document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
});
document.getElementById('nextPage').addEventListener('click', () => {
    if (currentPage < Math.ceil(getFilteredRequests().length / itemsPerPage)) {
        currentPage++;
        renderTable();
    }
});

// СОРТИРОВКА
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

// МОДАЛКА КОММЕНТАРИЯ
const commentModal = document.getElementById('commentModal');
let currentCommentRequestId = null;

function openCommentModal(requestId, currentComment) {
    currentCommentRequestId = requestId;
    document.getElementById('commentRequestId').textContent = requestId;
    document.getElementById('commentText').value = comments[requestId] || '';
    commentModal.classList.add('active');
}

document.getElementById('closeCommentModal').addEventListener('click', () => {
    commentModal.classList.remove('active');
});
document.getElementById('cancelCommentBtn').addEventListener('click', () => {
    commentModal.classList.remove('active');
});
document.getElementById('saveCommentBtn').addEventListener('click', () => {
    const comment = document.getElementById('commentText').value;
    if (comment.trim()) {
        comments[currentCommentRequestId] = comment;
    } else {
        delete comments[currentCommentRequestId];
    }
    localStorage.setItem('tecno_comments', JSON.stringify(comments));
    commentModal.classList.remove('active');
    renderTable();
});

// ЗАГРУЗКА ДАННЫХ
async function loadRequests() {
    try {
        const res = await fetch('/api/requests');
        allRequests = await res.json();
        updateStats();
        renderTable();
    } catch (err) {
        document.getElementById('requestsBody').innerHTML = '<tr><td colspan="7">Ошибка загрузки</td></tr>';
    }
}

// СТАТИСТИКА
function updateStats() {
    const total = allRequests.length;
    const newCount = allRequests.filter(r => r.status === 'new').length;
    const workCount = allRequests.filter(r => r.status === 'work').length;
    const doneCount = allRequests.filter(r => r.status === 'done').length;
    document.getElementById('totalCount').textContent = total;
    document.getElementById('newCount').textContent = newCount;
    document.getElementById('workCount').textContent = workCount;
    document.getElementById('doneCount').textContent = doneCount;
}

// ФИЛЬТРАЦИЯ
function getFilteredRequests() {
    let filtered = [...allRequests];
    
    // Поиск
    if (currentSearch) {
        filtered = filtered.filter(r => 
            r.name.toLowerCase().includes(currentSearch) ||
            r.phone.toLowerCase().includes(currentSearch) ||
            (r.service && r.service.toLowerCase().includes(currentSearch))
        );
    }
    
    // Фильтр по типу
    if (currentTypeFilter !== 'all') {
        filtered = filtered.filter(r => r.type === currentTypeFilter);
    }
    
    // Фильтр по дате
    const now = new Date();
    if (currentDateFilter === 'today') {
        const today = now.toDateString();
        filtered = filtered.filter(r => new Date(r.created_at).toDateString() === today);
    } else if (currentDateFilter === 'week') {
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        filtered = filtered.filter(r => new Date(r.created_at) >= weekAgo);
    } else if (currentDateFilter === 'month') {
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        filtered = filtered.filter(r => new Date(r.created_at) >= monthAgo);
    }
    
    // Сортировка
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

// ОТРИСОВКА ТАБЛИЦЫ
function renderTable() {
    const filtered = getFilteredRequests();
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);
    
    document.getElementById('pageInfo').textContent = `Страница ${currentPage} из ${totalPages || 1}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages || totalPages === 0;
    
    if (paginated.length === 0) {
        document.getElementById('requestsBody').innerHTML = '<tr><td colspan="7">Нет заявок</td></tr>';
        return;
    }
    
    document.getElementById('requestsBody').innerHTML = paginated.map(req => `
        <tr data-id="${req.id}">
            <td>${req.id}</td>
            <td>${new Date(req.created_at).toLocaleString()}</td>
            <td>${escapeHtml(req.name)}</td>
            <td>${escapeHtml(req.phone)}</td>
            <td>${escapeHtml(req.service || req.type)}</td>
            <td>${getStatusBadge(req.status)}</td>
            <td class="action-buttons">
                ${req.status !== 'work' ? `<button class="action-btn action-work" onclick="updateStatus(${req.id}, 'work')"><i class="fas fa-tools"></i> В работу</button>` : ''}
                ${req.status !== 'done' ? `<button class="action-btn action-done" onclick="updateStatus(${req.id}, 'done')"><i class="fas fa-check"></i> Выполнено</button>` : ''}
                <button class="action-btn action-call" onclick="window.open('tel:${req.phone}')"><i class="fas fa-phone"></i> Позвонить</button>
                <button class="action-btn action-comment" onclick="openCommentModal(${req.id})"><i class="fas fa-comment"></i> ${comments[req.id] ? '✏️' : '📝'}</button>
                <button class="action-btn action-delete" onclick="deleteRequest(${req.id})"><i class="fas fa-trash"></i></button>
             </td>
         </tr>
    `).join('');
}

function getStatusBadge(status) {
    const labels = { new: 'Новая', work: 'В работе', done: 'Выполнено' };
    const classes = { new: 'status-new', work: 'status-work', done: 'status-done' };
    return `<span class="status-badge ${classes[status] || ''}">${labels[status] || status}</span>`;
}

// ОБНОВЛЕНИЕ СТАТУСА
window.updateStatus = async (id, status) => {
    try {
        await fetch(`/api/request/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        loadRequests();
    } catch (err) {}
};

// УДАЛЕНИЕ
window.deleteRequest = async (id) => {
    if (!confirm('Удалить заявку?')) return;
    try {
        await fetch(`/api/request/${id}`, { method: 'DELETE' });
        delete comments[id];
        localStorage.setItem('tecno_comments', JSON.stringify(comments));
        loadRequests();
    } catch (err) {}
};

// ЭКСПОРТ CSV
function exportToCSV() {
    const filtered = getFilteredRequests();
    const headers = ['ID', 'Дата', 'Тип', 'Имя', 'Телефон', 'Email', 'Модель', 'Услуга', 'Статус', 'Комментарий'];
    const rows = filtered.map(r => [
        r.id,
        new Date(r.created_at).toLocaleString(),
        r.type === 'repair' ? 'Ремонт' : 'Бизнес',
        r.name,
        r.phone,
        r.email || '',
        r.model || '',
        r.service || '',
        getStatusText(r.status),
        comments[r.id] || ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tecnpro_requests_${new Date().toISOString().slice(0,19)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

function getStatusText(status) {
    const map = { new: 'Новая', work: 'В работе', done: 'Выполнено' };
    return map[status] || status;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}