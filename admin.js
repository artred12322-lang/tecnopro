const ADMIN_PASSWORD = 'admin123';
let allRequests = [];
let allReviews = [];
let allServices = [];
let allPhotos = [];
let currentPage = 1;
let itemsPerPage = 15;
let currentFilter = { search: '', type: 'all', status: 'all' };
let currentChart = null;

// ПРИНУДИТЕЛЬНЫЙ СПИСОК ВСЕХ УСЛУГ
const FORCED_SERVICES = [
    { id: 1, name: "Замена экрана", category: "phones", price: "от 1 500 ₽", time: "30-50 мин" },
    { id: 2, name: "Замена аккумулятора", category: "phones", price: "от 1 200 ₽", time: "20-40 мин" },
    { id: 3, name: "Замена разъёма", category: "phones", price: "от 900 ₽", time: "20-35 мин" },
    { id: 4, name: "Ремонт после воды", category: "phones", price: "от 2 000 ₽", time: "1-2 часа" },
    { id: 5, name: "Прошивка", category: "phones", price: "от 800 ₽", time: "30-60 мин" },
    { id: 6, name: "Ремонт динамика", category: "phones", price: "от 1 000 ₽", time: "20-40 мин" },
    { id: 7, name: "Диагностика консоли", category: "consoles", price: "0 ₽", time: "20-40 мин" },
    { id: 8, name: "Перепрошивка", category: "consoles", price: "от 2 000 ₽", time: "1-2 часа" },
    { id: 9, name: "Ремонт дисковода", category: "consoles", price: "от 2 500 ₽", time: "1-2 часа" },
    { id: 10, name: "Замена термопасты", category: "consoles", price: "от 1 500 ₽", time: "30-50 мин" },
    { id: 11, name: "Ремонт геймпада", category: "consoles", price: "от 800 ₽", time: "20-40 мин" },
    { id: 12, name: "Ремонт HDMI", category: "consoles", price: "от 2 500 ₽", time: "1-2 часа" }
];

async function loadRequests() {
    try {
        const res = await fetch('/api/requests');
        allRequests = await res.json();
        updateStats();
        updateChart();
        renderRequests();
    } catch(e) { console.error(e); }
}

function loadReviews() {
    const saved = localStorage.getItem('tehno_reviews');
    if (saved) {
        allReviews = JSON.parse(saved);
    } else {
        allReviews = [
            { id: 1, name: "Анна К.", rating: 5, text: "Отлично починили iPhone!", date: "12.05.2025", status: "approved" },
            { id: 2, name: "Дмитрий П.", rating: 5, text: "Быстро и качественно", date: "05.05.2025", status: "approved" },
            { id: 3, name: "Игорь С.", rating: 4, text: "Хороший сервис", date: "28.04.2025", status: "pending" }
        ];
        localStorage.setItem('tehno_reviews', JSON.stringify(allReviews));
    }
    renderReviews();
    renderModeration();
    updateModerationBadge();
}

function loadServices() {
    // ПРИНУДИТЕЛЬНО ЗАГРУЖАЕМ ВСЕ УСЛУГИ
    allServices = [...FORCED_SERVICES];
    localStorage.setItem('tehno_services', JSON.stringify(allServices));
    renderServices();
}

function loadPhotos() {
    const saved = localStorage.getItem('tehno_photos');
    if (saved && JSON.parse(saved).length > 0) {
        allPhotos = JSON.parse(saved);
    } else {
        allPhotos = [
            { id: 1, name: "office.jpg", url: "/images/office.jpg", category: "office", title: "Сервисный центр" },
            { id: 2, name: "team.jpg", url: "/images/team.jpg", category: "team", title: "Наша команда" },
            { id: 3, name: "repair1.jpg", url: "/images/repair1.jpg", category: "repair", title: "Процесс ремонта" }
        ];
        localStorage.setItem('tehno_photos', JSON.stringify(allPhotos));
    }
    renderPhotos();
}

function updateStats() {
    document.getElementById('totalCount').innerText = allRequests.length;
    document.getElementById('newCount').innerText = allRequests.filter(r => r.status === 'new').length;
    document.getElementById('workCount').innerText = allRequests.filter(r => r.status === 'work').length;
    document.getElementById('doneCount').innerText = allRequests.filter(r => r.status === 'done').length;
    document.getElementById('newBadge').innerText = allRequests.filter(r => r.status === 'new').length;
}

function updateChart() {
    const ctx = document.getElementById('mainChart')?.getContext('2d');
    if(!ctx) return;
    const counts = [];
    for(let i=29; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0,10);
        counts.push(allRequests.filter(r => r.created_at?.slice(0,10) === dateStr).length);
    }
    if(currentChart) currentChart.destroy();
    currentChart = new Chart(ctx, {
        type: 'line',
        data: { labels: Array.from({length:30},(_,i)=>i+1), datasets: [{ label: 'Заявки', data: counts, borderColor: '#00a8ff', fill: true, backgroundColor: 'rgba(0,168,255,0.1)' }] }
    });
}

function renderRequests() {
    let filtered = [...allRequests];
    if(currentFilter.search) {
        filtered = filtered.filter(r => 
            (r.name || '').toLowerCase().includes(currentFilter.search) ||
            (r.phone || '').includes(currentFilter.search)
        );
    }
    if(currentFilter.type !== 'all') filtered = filtered.filter(r => r.type === currentFilter.type);
    if(currentFilter.status !== 'all') filtered = filtered.filter(r => r.status === currentFilter.status);
    const total = Math.ceil(filtered.length / itemsPerPage);
    const start = (currentPage-1)*itemsPerPage;
    const page = filtered.slice(start, start+itemsPerPage);
    document.getElementById('pageInfo').innerText = `${currentPage}/${total||1}`;
    const tbody = document.getElementById('requestsBody');
    if(!page.length) { tbody.innerHTML = '<tr><td colspan="7">Нет заявок</td></tr>'; return; }
    tbody.innerHTML = page.map(r => `
        <tr>
            <td>${r.id}</td>
            <td>${new Date(r.created_at).toLocaleString()}</td>
            <td>${escapeHtml(r.name)}</td>
            <td>${escapeHtml(r.phone)}</td>
            <td>${escapeHtml(r.service || r.type)}</td>
            <td><span class="status-badge status-${r.status}">${r.status === 'new' ? 'Новая' : r.status === 'work' ? 'В работе' : 'Выполнено'}</span></td>
            <td>
                ${r.status !== 'work' ? `<button class="action-btn action-work" onclick="updateStatus(${r.id}, 'work')">В работу</button>` : ''}
                ${r.status !== 'done' ? `<button class="action-btn action-done" onclick="updateStatus(${r.id}, 'done')">Выполнить</button>` : ''}
                <button class="action-btn action-delete" onclick="deleteRequest(${r.id})">Удалить</button>
             </td>
         </tr>
    `).join('');
}

window.updateStatus = async (id, status) => {
    await fetch(`/api/request/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({status}) });
    loadRequests();
};

window.deleteRequest = async (id) => {
    if(!confirm('Удалить заявку?')) return;
    await fetch(`/api/request/${id}`, { method: 'DELETE' });
    loadRequests();
};

function renderReviews() {
    const container = document.getElementById('reviewsList');
    if(!container) return;
    const approved = allReviews.filter(r => r.status === 'approved');
    if(approved.length === 0) { container.innerHTML = '<div>Нет отзывов</div>'; return; }
    container.innerHTML = approved.map(r => `
        <div class="review-card">
            <div class="review-header"><strong>${escapeHtml(r.name)}</strong> <span class="review-rating">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span></div>
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
    if(pending.length === 0) { container.innerHTML = '<div>Нет отзывов на модерации</div>'; return; }
    container.innerHTML = pending.map(r => `
        <div class="review-card">
            <div class="review-header"><strong>${escapeHtml(r.name)}</strong> <span class="review-rating">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span></div>
            <div class="review-text">${escapeHtml(r.text)}</div>
            <div class="review-date">${r.date}</div>
            <div class="review-actions"><button onclick="approveReview(${r.id})" class="btn-approve">Одобрить</button> <button onclick="rejectReview(${r.id})" class="btn-reject">Отклонить</button></div>
        </div>
    `).join('');
}

function updateModerationBadge() {
    const pending = allReviews.filter(r => r.status === 'pending').length;
    const badge = document.getElementById('modBadge');
    if(badge) {
        badge.innerText = pending;
        badge.style.display = pending > 0 ? 'inline-block' : 'none';
    }
}

window.approveReview = (id) => {
    const idx = allReviews.findIndex(r => r.id === id);
    if(idx !== -1) { allReviews[idx].status = 'approved'; localStorage.setItem('tehno_reviews', JSON.stringify(allReviews)); renderReviews(); renderModeration(); updateModerationBadge(); }
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

function renderServices() {
    const container = document.getElementById('servicesList');
    if(!container) return;
    if(allServices.length === 0) { container.innerHTML = '<div>Нет услуг</div>'; return; }
    container.innerHTML = allServices.map(s => `
        <div class="service-card">
            <div><strong>${escapeHtml(s.name)}</strong> <span style="color:#00a8ff">${s.price}</span> | ${s.time}</div>
            <div class="service-actions"><button onclick="deleteService(${s.id})" class="btn-delete">Удалить</button></div>
        </div>
    `).join('');
}

window.deleteService = (id) => {
    allServices = allServices.filter(s => s.id !== id);
    localStorage.setItem('tehno_services', JSON.stringify(allServices));
    renderServices();
};

function renderPhotos() {
    const container = document.getElementById('photosList');
    if(!container) return;
    if(allPhotos.length === 0) { container.innerHTML = '<div>Нет фото</div>'; return; }
    container.innerHTML = `
        <div class="photos-grid">
            ${allPhotos.map(p => `
                <div class="photo-card">
                    <img src="${p.url}" onerror="this.src='https://placehold.co/200x150/1e3a5f/white?text=No+Image'">
                    <div class="photo-info">
                        <div class="photo-title">${escapeHtml(p.title)}</div>
                    </div>
                    <button class="photo-delete" onclick="deletePhoto(${p.id})"><i class="fas fa-trash"></i></button>
                </div>
            `).join('')}
            <div class="photo-card add-photo" onclick="document.getElementById('photoInput').click()">
                <i class="fas fa-plus"></i>
                <span>Добавить фото</span>
            </div>
        </div>
    `;
}

let currentUploadCategory = 'office';
document.getElementById('photoInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        const title = prompt('Введите название фото:', 'Новое фото') || 'Новое фото';
        const newId = Date.now();
        allPhotos.push({ id: newId, name: file.name, url: ev.target.result, category: currentUploadCategory, title: title });
        localStorage.setItem('tehno_photos', JSON.stringify(allPhotos));
        renderPhotos();
        updateSitePhotos();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
});

window.deletePhoto = (id) => {
    if(!confirm('Удалить фото?')) return;
    allPhotos = allPhotos.filter(p => p.id !== id);
    localStorage.setItem('tehno_photos', JSON.stringify(allPhotos));
    renderPhotos();
    updateSitePhotos();
};

function updateSitePhotos() {
    localStorage.setItem('tehno_photos_global', JSON.stringify(allPhotos));
}

document.getElementById('exportDataBtn')?.addEventListener('click', () => {
    const data = { requests: allRequests, reviews: allReviews, services: allServices, photos: allPhotos };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tehnopro_data_${new Date().toISOString().slice(0,19)}.json`;
    link.click();
});

document.getElementById('clearDataBtn')?.addEventListener('click', () => {
    if(confirm('Очистить ВСЕ отзывы, услуги и фото?')) {
        localStorage.removeItem('tehno_reviews');
        localStorage.removeItem('tehno_services');
        localStorage.removeItem('tehno_photos');
        loadReviews(); loadServices(); loadPhotos();
    }
});

document.getElementById('changePassBtn')?.addEventListener('click', () => {
    const p1 = document.getElementById('newPass').value;
    const p2 = document.getElementById('newPassConfirm').value;
    if(p1 !== p2) { document.getElementById('passMsg').innerText = 'Пароли не совпадают'; return; }
    if(p1.length < 6) { document.getElementById('passMsg').innerText = 'Минимум 6 символов'; return; }
    document.getElementById('passMsg').innerHTML = '<span style="color:#10b981">✓ Пароль изменён</span>';
});

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        item.classList.add('active');
        const pageId = item.dataset.page + 'Page';
        document.getElementById(pageId).classList.add('active');
        document.getElementById('pageTitle').innerText = item.innerText.trim().split(' ')[0];
        if(pageId === 'dashboardPage') updateChart();
        if(pageId === 'reviewsPage') renderReviews();
        if(pageId === 'moderationPage') renderModeration();
        if(pageId === 'servicesPage') renderServices();
        if(pageId === 'photosPage') renderPhotos();
    });
});

document.getElementById('searchInput')?.addEventListener('input', (e) => { currentFilter.search = e.target.value.toLowerCase(); currentPage=1; renderRequests(); });
document.getElementById('typeFilter')?.addEventListener('change', (e) => { currentFilter.type = e.target.value; currentPage=1; renderRequests(); });
document.getElementById('statusFilter')?.addEventListener('change', (e) => { currentFilter.status = e.target.value; currentPage=1; renderRequests(); });
document.getElementById('resetFilters')?.addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('typeFilter').value = 'all';
    document.getElementById('statusFilter').value = 'all';
    currentFilter = { search: '', type: 'all', status: 'all' };
    currentPage = 1;
    renderRequests();
});
document.getElementById('prevPage')?.addEventListener('click', () => { if(currentPage>1){currentPage--; renderRequests();} });
document.getElementById('nextPage')?.addEventListener('click', () => { currentPage++; renderRequests(); });
document.getElementById('addServiceBtn')?.addEventListener('click', () => {
    const name = prompt('Название услуги:'); if(!name) return;
    const price = prompt('Цена:'); const time = prompt('Время:');
    const newId = Date.now();
    allServices.push({ id: newId, name, category: 'phones', price, time });
    localStorage.setItem('tehno_services', JSON.stringify(allServices));
    renderServices();
});
document.getElementById('uploadPhotoBtn')?.addEventListener('click', () => { document.getElementById('photoInput').click(); });
document.getElementById('exportReviewsBtn')?.addEventListener('click', () => {
    const csv = [['Имя','Рейтинг','Текст','Дата']];
    allReviews.filter(r => r.status === 'approved').forEach(r => csv.push([r.name, r.rating, r.text, r.date]));
    const blob = new Blob(['\uFEFF' + csv.map(row => row.join(';')).join('\n')], {type:'text/csv'});
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'reviews.csv'; link.click();
});
document.getElementById('themeToggle')?.addEventListener('click', () => { document.body.classList.toggle('dark-theme'); });

// ВХОД
document.getElementById('loginBtn')?.addEventListener('click', () => {
    if(document.getElementById('loginPassword').value === ADMIN_PASSWORD) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        loadRequests(); loadReviews(); loadServices(); loadPhotos();
        setInterval(loadRequests, 30000);
    } else { document.getElementById('loginError').innerText = 'Неверный пароль'; }
});
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
});

function escapeHtml(str) { if(!str) return ''; return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[m]); }
