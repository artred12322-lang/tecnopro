const ADMIN_PASSWORD = 'admin123';
let allRequests = [];
let allReviews = [];
let allServices = [];
let allPhotos = [];
let currentPage = 1;
let itemsPerPage = 15;
let currentReqFilter = { search: '', type: 'all', status: 'all' };
let currentChart = null;

// ===== ИНИЦИАЛИЗАЦИЯ =====
async function init() {
    await loadRequests();
    loadReviews();
    loadServices();
    loadPhotos();
    updateStats();
    setupEventListeners();
    renderCurrentPage();
}

async function loadRequests() {
    try {
        const res = await fetch('/api/requests');
        allRequests = await res.json();
        updateStats();
        updateChart();
        renderRequestsTable();
    } catch(e) { console.error(e); }
}

function loadReviews() {
    const saved = localStorage.getItem('tehno_reviews');
    allReviews = saved ? JSON.parse(saved) : [
        { id: 1, name: "Анна К.", rating: 5, text: "Отлично починили iPhone!", date: "12.05.2025", status: "approved" },
        { id: 2, name: "Дмитрий П.", rating: 5, text: "Быстро и качественно", date: "05.05.2025", status: "approved" }
    ];
    localStorage.setItem('tehno_reviews', JSON.stringify(allReviews));
    renderReviews();
    renderModeration();
    updateModerationBadge();
}

function loadServices() {
    const saved = localStorage.getItem('tehno_services');
    allServices = saved ? JSON.parse(saved) : [
        { id: 1, name: "Замена экрана", category: "phones", price: "от 1 500 ₽", time: "30-50 мин" },
        { id: 2, name: "Замена аккумулятора", category: "phones", price: "от 1 200 ₽", time: "20-40 мин" },
        { id: 7, name: "Диагностика консоли", category: "consoles", price: "0 ₽", time: "20-40 мин" }
    ];
    localStorage.setItem('tehno_services', JSON.stringify(allServices));
    renderServices();
    document.getElementById('servicesCount').innerText = allServices.length;
}

function loadPhotos() {
    const saved = localStorage.getItem('tehno_photos');
    allPhotos = saved ? JSON.parse(saved) : [
        { id: 1, name: "office.jpg", url: "/images/office.jpg", category: "office", title: "Сервисный центр" },
        { id: 2, name: "team.jpg", url: "/images/team.jpg", category: "team", title: "Наша команда" },
        { id: 3, name: "repair1.jpg", url: "/images/repair1.jpg", category: "repair", title: "Процесс ремонта" }
    ];
    localStorage.setItem('tehno_photos', JSON.stringify(allPhotos));
    renderPhotosGallery();
    document.getElementById('photosCount').innerText = allPhotos.length;
}

// ===== СТАТИСТИКА И ГРАФИК =====
function updateStats() {
    document.getElementById('statTotal').innerText = allRequests.length;
    document.getElementById('statNew').innerText = allRequests.filter(r => r.status === 'new').length;
    document.getElementById('statWork').innerText = allRequests.filter(r => r.status === 'work').length;
    document.getElementById('statDone').innerText = allRequests.filter(r => r.status === 'done').length;
    document.getElementById('newRequestsBadge').innerText = allRequests.filter(r => r.status === 'new').length;
    const avgRating = allReviews.filter(r => r.status === 'approved').reduce((s,r,i,a) => s + r.rating / a.length, 0);
    document.getElementById('avgRating').innerText = avgRating.toFixed(1) + ' ★';
}

function updateChart() {
    const period = parseInt(document.getElementById('chartPeriod')?.value || 30);
    const ctx = document.getElementById('mainChart')?.getContext('2d');
    if(!ctx) return;
    const counts = [];
    for(let i=period-1; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0,10);
        counts.push(allRequests.filter(r => r.created_at?.slice(0,10) === dateStr).length);
    }
    if(currentChart) currentChart.destroy();
    currentChart = new Chart(ctx, {
        type: 'line',
        data: { labels: Array.from({length:period},(_,i)=>i+1), datasets: [{ label: 'Заявки', data: counts, borderColor: '#00a8ff', backgroundColor: 'rgba(0,168,255,0.1)', fill: true, tension: 0.3 }] },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

// ===== ЗАЯВКИ =====
function renderRequestsTable() {
    let filtered = [...allRequests];
    if(currentReqFilter.search) {
        filtered = filtered.filter(r => 
            r.name?.toLowerCase().includes(currentReqFilter.search) ||
            r.phone?.includes(currentReqFilter.search) ||
            r.service?.toLowerCase().includes(currentReqFilter.search)
        );
    }
    if(currentReqFilter.type !== 'all') filtered = filtered.filter(r => r.type === currentReqFilter.type);
    if(currentReqFilter.status !== 'all') filtered = filtered.filter(r => r.status === currentReqFilter.status);
    const total = Math.ceil(filtered.length / itemsPerPage);
    const start = (currentPage-1)*itemsPerPage;
    const page = filtered.slice(start, start+itemsPerPage);
    document.getElementById('reqPageInfo').innerText = `${currentPage}/${total||1}`;
    const tbody = document.getElementById('requestsTableBody');
    if(!page.length) { tbody.innerHTML = '<td><td colspan="8" class="text-center">Нет заявок</td></tr>'; return; }
    tbody.innerHTML = page.map(r => `
        <tr>
            <td>${r.id}</td>
            <td>${new Date(r.created_at).toLocaleString()}</td>
            <td>${escapeHtml(r.name)}</td>
            <td>${escapeHtml(r.phone)}</td>
            <td>${escapeHtml(r.model || '-')}</td>
            <td>${escapeHtml(r.service || r.type)}</td>
            <td><span class="status-badge status-${r.status}">${r.status === 'new' ? 'Новая' : r.status === 'work' ? 'В работе' : 'Выполнено'}</span></td>
            <td class="action-buttons">
                ${r.status !== 'work' ? `<button class="action-btn action-work" onclick="updateRequestStatus(${r.id}, 'work')">В работу</button>` : ''}
                ${r.status !== 'done' ? `<button class="action-btn action-done" onclick="updateRequestStatus(${r.id}, 'done')">Выполнить</button>` : ''}
                <button class="action-btn action-delete" onclick="deleteRequest(${r.id})">Удалить</button>
            </td>
        </tr>
    `).join('');
}

window.updateRequestStatus = async (id, status) => {
    await fetch(`/api/request/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({status}) });
    loadRequests();
};
window.deleteRequest = async (id) => {
    if(!confirm('Удалить заявку?')) return;
    await fetch(`/api/request/${id}`, { method: 'DELETE' });
    loadRequests();
};

// ===== ОТЗЫВЫ =====
function renderReviews() {
    const container = document.getElementById('reviewsList');
    if(!container) return;
    const approved = allReviews.filter(r => r.status === 'approved');
    if(approved.length === 0) { container.innerHTML = '<div class="review-card">Нет отзывов</div>'; return; }
    container.innerHTML = approved.map(r => `
        <div class="review-card">
            <div class="review-header"><span class="review-name">${escapeHtml(r.name)}</span><span class="review-rating">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span></div>
            <div class="review-text">${escapeHtml(r.text)}</div>
            <div class="review-date">${r.date}</div>
            <div class="review-actions"><button onclick="deleteReview(${r.id})" class="btn-delete">Удалить</button></div>
        </div>
    `).join('');
}

function renderModeration() {
    const container = document.getElementById('moderationList');
    if(!container) return;
    const pending = allReviews.filter(r => r.status === 'pending');
    if(pending.length === 0) { container.innerHTML = '<div class="review-card">Нет отзывов на модерации</div>'; return; }
    container.innerHTML = pending.map(r => `
        <div class="review-card">
            <div class="review-header"><span class="review-name">${escapeHtml(r.name)}</span><span class="review-rating">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span></div>
            <div class="review-text">${escapeHtml(r.text)}</div>
            <div class="review-date">${r.date}</div>
            <div class="review-actions"><button onclick="approveReview(${r.id})" class="btn-approve">Одобрить</button><button onclick="rejectReview(${r.id})" class="btn-reject">Отклонить</button></div>
        </div>
    `).join('');
}

function updateModerationBadge() {
    const pending = allReviews.filter(r => r.status === 'pending').length;
    const badge = document.getElementById('moderationBadge');
    if(badge) {
        badge.innerText = pending;
        badge.style.display = pending > 0 ? 'inline-block' : 'none';
    }
}
window.approveReview = (id) => {
    const idx = allReviews.findIndex(r => r.id === id);
    if(idx !== -1) { allReviews[idx].status = 'approved'; localStorage.setItem('tehno_reviews', JSON.stringify(allReviews)); renderReviews(); renderModeration(); updateModerationBadge(); updateStats(); }
};
window.rejectReview = (id) => {
    allReviews = allReviews.filter(r => r.id !== id);
    localStorage.setItem('tehno_reviews', JSON.stringify(allReviews));
    renderReviews(); renderModeration(); updateModerationBadge();
};
window.deleteReview = (id) => {
    allReviews = allReviews.filter(r => r.id !== id);
    localStorage.setItem('tehno_reviews', JSON.stringify(allReviews));
    renderReviews(); renderModeration(); updateModerationBadge();
};

// ===== УСЛУГИ =====
function renderServices() {
    const container = document.getElementById('servicesList');
    if(!container) return;
    if(allServices.length === 0) { container.innerHTML = '<div class="service-card">Нет услуг</div>'; return; }
    container.innerHTML = allServices.map(s => `
        <div class="service-card">
            <div class="service-header"><strong>${escapeHtml(s.name)}</strong><span>${s.price} | ${s.time}</span></div>
            <div class="service-actions"><button onclick="deleteService(${s.id})" class="btn-delete">Удалить</button></div>
        </div>
    `).join('');
}
window.deleteService = (id) => {
    allServices = allServices.filter(s => s.id !== id);
    localStorage.setItem('tehno_services', JSON.stringify(allServices));
    renderServices();
    document.getElementById('servicesCount').innerText = allServices.length;
};

// ===== ФОТОГАЛЕРЕЯ (С УДАЛЕНИЕМ) =====
function renderPhotosGallery() {
    const container = document.getElementById('photosGallery');
    if(!container) return;
    const categories = [
        { id: 'office', name: 'Сервисный центр', icon: 'fa-building' },
        { id: 'team', name: 'Команда', icon: 'fa-users' },
        { id: 'repair', name: 'Процесс ремонта', icon: 'fa-tools' }
    ];
    let html = '';
    categories.forEach(cat => {
        const catPhotos = allPhotos.filter(p => p.category === cat.id);
        html += `<div class="photo-category"><div class="photo-category-header"><i class="fas ${cat.icon}"></i><h4>${cat.name}</h4><span class="photo-count">${catPhotos.length} фото</span></div><div class="photos-grid">`;
        catPhotos.forEach(photo => {
            html += `
                <div class="photo-card" data-id="${photo.id}">
                    <img src="${photo.url}" onerror="this.src='https://placehold.co/200x150/1e3a5f/white?text=No+Image'">
                    <div class="photo-info">
                        <div class="photo-title">${escapeHtml(photo.title)}</div>
                        <div class="photo-cat">${cat.name}</div>
                    </div>
                    <div class="photo-actions">
                        <button class="photo-delete-btn" onclick="deletePhoto(${photo.id})" title="Удалить"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
        html += `<div class="photo-card add-photo-card" data-category="${cat.id}"><i class="fas fa-plus"></i><span>Добавить фото</span></div>`;
        html += `</div></div>`;
    });
    container.innerHTML = html;
    
    document.querySelectorAll('.add-photo-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            currentUploadCategory = card.dataset.category;
            document.getElementById('photoUploadInput').click();
        });
    });
}

let currentUploadCategory = 'office';

document.getElementById('photoUploadInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) {
        e.target.value = '';
        return;
    }
    if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение');
        e.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = function(ev) {
        const newId = Date.now();
        const title = prompt('Введите название фото:', 'Новое фото') || 'Новое фото';
        if (!title) return;
        allPhotos.push({ 
            id: newId, 
            name: file.name, 
            url: ev.target.result, 
            category: currentUploadCategory, 
            title: title,
            date: new Date().toISOString().slice(0,10)
        });
        localStorage.setItem('tehno_photos', JSON.stringify(allPhotos));
        renderPhotosGallery();
        document.getElementById('photosCount').innerText = allPhotos.length;
        updateSitePhotos();
        alert('Фото добавлено!');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
});

window.deletePhoto = (id) => {
    if(!confirm('Удалить это фото? Оно исчезнет с сайта.')) return;
    allPhotos = allPhotos.filter(p => p.id !== id);
    localStorage.setItem('tehno_photos', JSON.stringify(allPhotos));
    renderPhotosGallery();
    document.getElementById('photosCount').innerText = allPhotos.length;
    updateSitePhotos();
    alert('Фото удалено');
};

function updateSitePhotos() { 
    localStorage.setItem('tehno_photos_global', JSON.stringify(allPhotos)); 
}

// ===== НАСТРОЙКИ =====
document.getElementById('exportAllDataBtn')?.addEventListener('click', () => {
    const data = { requests: allRequests, reviews: allReviews, services: allServices, photos: allPhotos };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `tehnopro_data_${new Date().toISOString().slice(0,19)}.json`; link.click();
});
document.getElementById('clearAllDataBtn')?.addEventListener('click', () => {
    if(confirm('Очистить ВСЕ отзывы, услуги и фото?')) {
        localStorage.removeItem('tehno_reviews');
        localStorage.removeItem('tehno_services');
        localStorage.removeItem('tehno_photos');
        loadReviews(); loadServices(); loadPhotos();
    }
});
document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
    const p1 = document.getElementById('newPassword').value;
    const p2 = document.getElementById('confirmPassword').value;
    if(p1 !== p2) { document.getElementById('passwordMsg').innerText = 'Пароли не совпадают'; return; }
    if(p1.length < 6) { document.getElementById('passwordMsg').innerText = 'Минимум 6 символов'; return; }
    document.getElementById('passwordMsg').innerHTML = '<span style="color:#10b981">✓ Пароль изменён (только для сессии)</span>';
});

// ===== НАВИГАЦИЯ =====
function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            item.classList.add('active');
            const pageId = item.dataset.page + 'Page';
            document.getElementById(pageId).classList.add('active');
            document.getElementById('pageTitle').innerText = item.querySelector('span').innerText;
            if(pageId === 'dashboardPage') updateChart();
            if(pageId === 'reviewsPage') renderReviews();
            if(pageId === 'moderationPage') renderModeration();
            if(pageId === 'servicesPage') renderServices();
            if(pageId === 'photosPage') renderPhotosGallery();
        });
    });
    document.getElementById('reqSearch')?.addEventListener('input', (e) => { currentReqFilter.search = e.target.value.toLowerCase(); currentPage=1; renderRequestsTable(); });
    document.getElementById('reqTypeFilter')?.addEventListener('change', (e) => { currentReqFilter.type = e.target.value; currentPage=1; renderRequestsTable(); });
    document.getElementById('reqStatusFilter')?.addEventListener('change', (e) => { currentReqFilter.status = e.target.value; currentPage=1; renderRequestsTable(); });
    document.getElementById('reqResetFilters')?.addEventListener('click', () => {
        document.getElementById('reqSearch').value = '';
        document.getElementById('reqTypeFilter').value = 'all';
        document.getElementById('reqStatusFilter').value = 'all';
        currentReqFilter = { search: '', type: 'all', status: 'all' };
        currentPage = 1;
        renderRequestsTable();
    });
    document.getElementById('reqPrevPage')?.addEventListener('click', () => { if(currentPage>1){currentPage--; renderRequestsTable();} });
    document.getElementById('reqNextPage')?.addEventListener('click', () => { currentPage++; renderRequestsTable(); });
    document.getElementById('chartPeriod')?.addEventListener('change', () => updateChart());
    document.getElementById('addServiceBtn')?.addEventListener('click', () => {
        const name = prompt('Название услуги:'); if(!name) return;
        const category = confirm('Телефон? (ОК - да, Отмена - приставка)') ? 'phones' : 'consoles';
        const price = prompt('Цена:'); const time = prompt('Время:');
        const newId = Date.now();
        allServices.push({ id: newId, name, category, price, time });
        localStorage.setItem('tehno_services', JSON.stringify(allServices));
        renderServices();
        document.getElementById('servicesCount').innerText = allServices.length;
    });
    document.getElementById('uploadPhotoMainBtn')?.addEventListener('click', () => { currentUploadCategory = 'office'; document.getElementById('photoUploadInput').click(); });
    document.getElementById('resetThemeBtn')?.addEventListener('click', () => { localStorage.removeItem('theme'); document.body.classList.remove('dark-theme'); });
    document.getElementById('themeSwitch')?.addEventListener('click', () => { document.body.classList.toggle('dark-theme'); });
    document.getElementById('mobileMenuToggle')?.addEventListener('click', () => { document.querySelector('.sidebar').classList.toggle('mobile-open'); });
    document.getElementById('exportReviewsBtn')?.addEventListener('click', () => {
        const csv = [['Имя','Рейтинг','Текст','Дата']];
        allReviews.filter(r => r.status === 'approved').forEach(r => csv.push([r.name, r.rating, r.text, r.date]));
        const blob = new Blob(['\uFEFF' + csv.map(row => row.join(';')).join('\n')], {type:'text/csv'});
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'reviews.csv'; link.click();
    });
}

// ===== ВХОД =====
document.getElementById('loginSubmitBtn')?.addEventListener('click', () => {
    if(document.getElementById('loginPassword').value === ADMIN_PASSWORD) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        init();
    } else { document.getElementById('loginErrorMsg').innerText = 'Неверный пароль'; }
});
document.getElementById('loginPassword')?.addEventListener('keypress', (e) => { if(e.key === 'Enter') document.getElementById('loginSubmitBtn').click(); });
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    document.getElementById('loginPassword').value = '';
});

function escapeHtml(str) { if(!str) return ''; return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[m]); }
