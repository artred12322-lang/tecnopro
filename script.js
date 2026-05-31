document.addEventListener('DOMContentLoaded', () => {
    // ===== СЛАЙДЕР =====
    let currentSlide = 0;
    const slides = document.querySelectorAll('.slider-slide');
    const dots = document.querySelectorAll('.slider-dots .dot');
    const prevBtn = document.querySelector('.slider-prev');
    const nextBtn = document.querySelector('.slider-next');
    
    function showSlide(n) {
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        slides[n].classList.add('active');
        dots[n].classList.add('active');
        currentSlide = n;
    }
    
    function nextSlide() { showSlide((currentSlide + 1) % slides.length); }
    function prevSlide() { showSlide((currentSlide - 1 + slides.length) % slides.length); }
    
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    dots.forEach((dot, i) => dot.addEventListener('click', () => showSlide(i)));
    setInterval(nextSlide, 5000);
    
    // ===== ТАБЫ УСЛУГ =====
    const tabBtns = document.querySelectorAll('.tab-btn');
    const phonesGrid = document.getElementById('phones-grid');
    const consolesGrid = document.getElementById('consoles-grid');
    
    if (tabBtns.length) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (btn.dataset.tab === 'phones') {
                    if (phonesGrid) phonesGrid.classList.add('active');
                    if (consolesGrid) consolesGrid.classList.remove('active');
                } else {
                    if (consolesGrid) consolesGrid.classList.add('active');
                    if (phonesGrid) phonesGrid.classList.remove('active');
                }
            });
        });
    }
    
    // ===== МОДАЛЬНОЕ ОКНО =====
    const modal = document.getElementById('serviceModal');
    const closeModal = document.getElementById('closeModalBtn');
    const modalServiceSelect = document.getElementById('modalService');
    
    document.querySelectorAll('.service-select').forEach(btn => {
        btn.addEventListener('click', () => {
            const service = btn.getAttribute('data-service');
            if (modalServiceSelect && service) {
                for (let i = 0; i < modalServiceSelect.options.length; i++) {
                    if (modalServiceSelect.options[i].value === service || modalServiceSelect.options[i].text === service) {
                        modalServiceSelect.selectedIndex = i;
                        break;
                    }
                }
            }
            if (modal) modal.classList.add('active');
        });
    });
    
    const repairMainBtn = document.getElementById('repairMainBtn');
    if (repairMainBtn) {
        repairMainBtn.addEventListener('click', () => {
            if (modalServiceSelect) modalServiceSelect.selectedIndex = 0;
            if (modal) modal.classList.add('active');
        });
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (modal) modal.classList.remove('active');
        });
    }
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
    
    // ===== ОТПРАВКА ФОРМЫ ЗАПИСИ (БЕЗ CSRF) =====
    const quickForm = document.getElementById('quickForm');
    const modalStatus = document.getElementById('modalStatus');
    
    if (quickForm) {
        quickForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = quickForm.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;
            
            const name = document.getElementById('modalName')?.value.trim();
            const phone = document.getElementById('modalPhone')?.value.trim();
            const model = document.getElementById('modalModel')?.value.trim();
            const service = document.getElementById('modalService')?.value;
            const time = document.getElementById('modalTime')?.value;
            const comment = document.getElementById('modalComment')?.value.trim();
            
            if (!name || !phone) {
                if (modalStatus) {
                    modalStatus.innerHTML = 'Заполните имя и телефон';
                    modalStatus.style.color = '#f97316';
                }
                if (submitBtn) submitBtn.disabled = false;
                return;
            }
            if (!service) {
                if (modalStatus) {
                    modalStatus.innerHTML = 'Выберите услугу';
                    modalStatus.style.color = '#f97316';
                }
                if (submitBtn) submitBtn.disabled = false;
                return;
            }
            
            if (modalStatus) {
                modalStatus.innerHTML = 'Отправка...';
                modalStatus.style.color = '#94a3b8';
            }
            
            try {
                const response = await fetch('/api/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'repair',
                        name: name,
                        phone: phone,
                        model: model || '',
                        service: service,
                        message: (time ? 'Время: ' + time + '\n' : '') + (comment || '')
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    if (modalStatus) {
                        modalStatus.innerHTML = '✅ Заявка принята! Мы перезвоним.';
                        modalStatus.style.color = '#10b981';
                    }
                    quickForm.reset();
                    if (modalServiceSelect) modalServiceSelect.selectedIndex = 0;
                    setTimeout(() => {
                        if (modal) modal.classList.remove('active');
                        if (modalStatus) modalStatus.innerHTML = '';
                    }, 2000);
                } else {
                    throw new Error(data.error || 'Ошибка сервера');
                }
            } catch (err) {
                console.error('Ошибка:', err);
                if (modalStatus) {
                    modalStatus.innerHTML = '❌ Ошибка. Попробуйте позже.';
                    modalStatus.style.color = '#f97316';
                }
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }
    
    // ===== БИЗНЕС-ПАНЕЛЬ =====
    const businessPanel = document.getElementById('businessPanel');
    const businessNavLink = document.getElementById('businessNavLink');
    const footerBusinessLink = document.getElementById('footerBusinessLink');
    const closePanelBtn = document.getElementById('closePanelBtn');
    
    function openBusinessPanel() {
        if (businessPanel) businessPanel.classList.add('active');
    }
    function closeBusinessPanel() {
        if (businessPanel) businessPanel.classList.remove('active');
    }
    
    if (businessNavLink) {
        businessNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            openBusinessPanel();
        });
    }
    if (footerBusinessLink) {
        footerBusinessLink.addEventListener('click', (e) => {
            e.preventDefault();
            openBusinessPanel();
        });
    }
    if (closePanelBtn) {
        closePanelBtn.addEventListener('click', closeBusinessPanel);
    }
    
    // ===== БИЗНЕС-ФОРМА =====
    const businessForm = document.getElementById('businessForm');
    const businessStatus = document.getElementById('businessStatus');
    
    if (businessForm) {
        businessForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = businessForm.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;
            
            const name = document.getElementById('businessName')?.value.trim();
            const phone = document.getElementById('businessPhone')?.value.trim();
            const email = document.getElementById('businessEmail')?.value.trim();
            
            if (!name || !phone) {
                if (businessStatus) {
                    businessStatus.innerHTML = 'Заполните компанию и телефон';
                    businessStatus.style.color = '#f97316';
                }
                if (submitBtn) submitBtn.disabled = false;
                return;
            }
            
            if (businessStatus) businessStatus.innerHTML = 'Отправка...';
            
            try {
                const response = await fetch('/api/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'business',
                        name: name,
                        phone: phone,
                        email: email || '',
                        service: 'Рекламный контракт'
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    if (businessStatus) {
                        businessStatus.innerHTML = '✅ Заявка отправлена! Менеджер свяжется.';
                        businessStatus.style.color = '#10b981';
                    }
                    businessForm.reset();
                    setTimeout(() => closeBusinessPanel(), 2000);
                } else {
                    throw new Error(data.error || 'Ошибка сервера');
                }
            } catch (err) {
                console.error('Ошибка:', err);
                if (businessStatus) {
                    businessStatus.innerHTML = '❌ Ошибка. Попробуйте позже.';
                    businessStatus.style.color = '#f97316';
                }
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }
    
    // ===== ОТЗЫВЫ =====
    let allReviews = JSON.parse(localStorage.getItem('tehno_reviews') || '[]');
    let currentFilter = 'all';
    
    if (allReviews.length === 0) {
        allReviews = [
            { id: 1, name: "Анна К.", rating: 5, text: "Починили iPhone 12 после попадания воды за 2 часа. Гарантия 12 месяцев. Спасибо!", date: "12.05.2025", status: "approved", adminReply: "Благодарим за отзыв! Рады помочь!" },
            { id: 2, name: "Дмитрий П.", rating: 5, text: "Заменили экран за 1500 ₽. Быстро, качественно. Оплатил переводом.", date: "05.05.2025", status: "approved", adminReply: "Спасибо за доверие!" },
            { id: 3, name: "Игорь С.", rating: 4, text: "Ремонтировал разъём зарядки — 900 ₽ и 40 минут. Принимают наличные и переводы.", date: "28.04.2025", status: "approved", adminReply: "Рады, что остались довольны!" }
        ];
        localStorage.setItem('tehno_reviews', JSON.stringify(allReviews));
    }
    
    function getStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += i <= rating ? '★' : '☆';
        }
        return stars;
    }
    
    function getAvatar(name) {
        const initials = name.charAt(0).toUpperCase();
        return `<div class="review-avatar">${initials}</div>`;
    }
    
    function getFilteredReviews() {
        let filtered = allReviews.filter(r => r.status === 'approved');
        if (currentFilter !== 'all') {
            filtered = filtered.filter(r => r.rating === parseInt(currentFilter));
        }
        return filtered;
    }
    
    function renderMarquee() {
        const container = document.getElementById('reviewsMarquee');
        if (!container) return;
        const filtered = getFilteredReviews();
        if (filtered.length === 0) {
            container.innerHTML = '<div class="no-reviews">Нет отзывов</div>';
            return;
        }
        const duplicated = [...filtered, ...filtered];
        container.innerHTML = duplicated.map(review => `
            <div class="review-card-marquee">
                <div class="review-header">
                    ${getAvatar(review.name)}
                    <div class="review-info">
                        <div class="review-name">${escapeHtml(review.name)}</div>
                        <div class="review-stars">${getStars(review.rating)}</div>
                        <div class="review-date">${review.date}</div>
                    </div>
                </div>
                <div class="review-text-carousel">
                    <i class="fas fa-quote-left"></i>
                    <p>${escapeHtml(review.text)}</p>
                </div>
                ${review.adminReply ? `
                <div class="review-admin-reply">
                    <i class="fas fa-reply"></i>
                    <div>
                        <strong>Технопро:</strong>
                        <p>${escapeHtml(review.adminReply)}</p>
                    </div>
                </div>
                ` : ''}
            </div>
        `).join('');
        const marquee = document.querySelector('.reviews-marquee');
        if (marquee) {
            marquee.style.animation = 'none';
            setTimeout(() => {
                marquee.style.animation = 'scrollReviews 40s linear infinite';
            }, 10);
        }
    }
    
    const filterBtns = document.querySelectorAll('.filter-btn');
    if (filterBtns.length) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.getAttribute('data-filter');
                renderMarquee();
            });
        });
    }
    
    const ratingStars = document.querySelectorAll('.rating-star');
    const ratingInput = document.getElementById('reviewRating');
    
    if (ratingStars.length && ratingInput) {
        ratingStars.forEach(star => {
            star.addEventListener('click', () => {
                const value = parseInt(star.getAttribute('data-value'));
                ratingInput.value = value;
                ratingStars.forEach((s, i) => {
                    s.textContent = i < value ? '★' : '☆';
                });
            });
            star.addEventListener('mouseenter', () => {
                const value = parseInt(star.getAttribute('data-value'));
                ratingStars.forEach((s, i) => {
                    s.textContent = i < value ? '★' : '☆';
                });
            });
            star.addEventListener('mouseleave', () => {
                const currentValue = parseInt(ratingInput.value);
                ratingStars.forEach((s, i) => {
                    s.textContent = i < currentValue ? '★' : '☆';
                });
            });
        });
    }
    
    const reviewForm = document.getElementById('reviewForm');
    const reviewStatus = document.getElementById('reviewStatus');
    
    if (reviewForm) {
        reviewForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('reviewName')?.value.trim();
            const rating = parseInt(document.getElementById('reviewRating')?.value);
            const text = document.getElementById('reviewText')?.value.trim();
            
            if (!name || !rating || rating === 0 || !text) {
                if (reviewStatus) {
                    reviewStatus.innerHTML = 'Заполните все поля и выберите оценку';
                    reviewStatus.style.color = '#f97316';
                }
                return;
            }
            if (rating < 1 || rating > 5) {
                if (reviewStatus) {
                    reviewStatus.innerHTML = 'Оценка должна быть от 1 до 5';
                    reviewStatus.style.color = '#f97316';
                }
                return;
            }
            
            const newReview = {
                id: Date.now(),
                name: name,
                rating: rating,
                text: text,
                date: new Date().toLocaleDateString('ru-RU'),
                status: 'pending',
                adminReply: ""
            };
            
            allReviews.push(newReview);
            localStorage.setItem('tehno_reviews', JSON.stringify(allReviews));
            
            reviewForm.reset();
            if (ratingInput) ratingInput.value = 0;
            if (ratingStars) ratingStars.forEach(s => s.textContent = '☆');
            if (reviewStatus) {
                reviewStatus.innerHTML = 'Спасибо за отзыв! Он будет опубликован после проверки.';
                reviewStatus.style.color = '#10b981';
                setTimeout(() => { reviewStatus.innerHTML = ''; }, 3000);
            }
        });
    }
    
    renderMarquee();
    
    // ===== СКРЫТЫЙ ВХОД В АДМИНКУ =====
    let clickCount = 0;
    let clickTimer = null;
    const adminLogo = document.getElementById('adminLogoTrigger');
    
    if (adminLogo) {
        adminLogo.addEventListener('click', () => {
            clickCount++;
            clearTimeout(clickTimer);
            clickTimer = setTimeout(() => { clickCount = 0; }, 1000);
            if (clickCount >= 5) {
                clickCount = 0;
                window.location.href = '/admin.html';
            }
        });
    }
    
    // ===== СИНХРОНИЗАЦИЯ ФОТО =====
    function loadPhotosFromAdmin() {
        const savedPhotos = localStorage.getItem('tehno_photos_global');
        if (savedPhotos) {
            const photos = JSON.parse(savedPhotos);
            const officePhoto = photos.find(p => p.category === 'office');
            const teamPhoto = photos.find(p => p.category === 'team');
            const repairPhotos = photos.filter(p => p.category === 'repair');
            
            const slidesElements = document.querySelectorAll('.slider-slide');
            if (slidesElements.length >= 1 && officePhoto) {
                const img = slidesElements[0].querySelector('img');
                if (img) img.src = officePhoto.url;
            }
            if (slidesElements.length >= 2 && teamPhoto) {
                const img = slidesElements[1].querySelector('img');
                if (img) img.src = teamPhoto.url;
            }
            if (slidesElements.length >= 3 && repairPhotos[0]) {
                const img = slidesElements[2].querySelector('img');
                if (img) img.src = repairPhotos[0].url;
            }
            if (slidesElements.length >= 4 && repairPhotos[1]) {
                const img = slidesElements[3].querySelector('img');
                if (img) img.src = repairPhotos[1].url;
            }
        }
    }
    loadPhotosFromAdmin();
    
    window.addEventListener('storage', (e) => {
        if (e.key === 'tehno_photos_global') {
            loadPhotosFromAdmin();
        }
    });
    
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
});
