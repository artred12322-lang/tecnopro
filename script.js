(function() {
    'use strict';
    
    if (window.__finalVersionReady) return;
    window.__finalVersionReady = true;
    
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Технопро: инициализация');
        
        // ===== СЛАЙДЕР =====
        let currentSlide = 0;
        const slides = document.querySelectorAll('.slider-slide');
        const dots = document.querySelectorAll('.slider-dots .dot');
        const prevBtn = document.querySelector('.slider-prev');
        const nextBtn = document.querySelector('.slider-next');
        
        if (slides.length) {
            function showSlide(n) {
                slides.forEach(s => s.classList.remove('active'));
                dots.forEach(d => d.classList.remove('active'));
                const idx = ((n % slides.length) + slides.length) % slides.length;
                slides[idx].classList.add('active');
                if (dots[idx]) dots[idx].classList.add('active');
                currentSlide = idx;
            }
            function nextSlide() { showSlide(currentSlide + 1); }
            function prevSlide() { showSlide(currentSlide - 1); }
            if (prevBtn) prevBtn.addEventListener('click', prevSlide);
            if (nextBtn) nextBtn.addEventListener('click', nextSlide);
            dots.forEach((dot, i) => dot.addEventListener('click', () => showSlide(i)));
            setInterval(nextSlide, 5000);
        }
        
        // ===== ТАБЫ =====
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
        
        // ===== МОДАЛКА =====
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
        if (closeModal) closeModal.addEventListener('click', () => modal.classList.remove('active'));
        window.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
        
        // ===== ЗАПИСЬ (PHP) =====
        const quickForm = document.getElementById('quickForm');
        const modalStatus = document.getElementById('modalStatus');
        
        if (quickForm && !quickForm.hasAttribute('data-fixed')) {
            quickForm.setAttribute('data-fixed', 'true');
            quickForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (quickForm.getAttribute('data-sending') === 'true') return;
                quickForm.setAttribute('data-sending', 'true');
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
                    quickForm.removeAttribute('data-sending');
                    if (submitBtn) submitBtn.disabled = false;
                    return;
                }
                if (!service) {
                    if (modalStatus) {
                        modalStatus.innerHTML = 'Выберите услугу';
                        modalStatus.style.color = '#f97316';
                    }
                    quickForm.removeAttribute('data-sending');
                    if (submitBtn) submitBtn.disabled = false;
                    return;
                }
                
                if (modalStatus) modalStatus.innerHTML = 'Отправка...';
                
                try {
                    const response = await fetch('/server.php/api/request', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'repair',
                            name, phone, model: model || '',
                            service,
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
                    } else throw new Error(data.error || 'Ошибка сервера');
                } catch (err) {
                    console.error('Ошибка:', err);
                    if (modalStatus) {
                        modalStatus.innerHTML = '❌ Ошибка. Попробуйте позже.';
                        modalStatus.style.color = '#f97316';
                    }
                } finally {
                    quickForm.removeAttribute('data-sending');
                    if (submitBtn) submitBtn.disabled = false;
                }
            });
        }
        
        // ===== БИЗНЕС =====
        const businessForm = document.getElementById('businessForm');
        const businessStatus = document.getElementById('businessStatus');
        
        if (businessForm && !businessForm.hasAttribute('data-fixed')) {
            businessForm.setAttribute('data-fixed', 'true');
            businessForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (businessForm.getAttribute('data-sending') === 'true') return;
                businessForm.setAttribute('data-sending', 'true');
                const name = document.getElementById('businessName')?.value.trim();
                const phone = document.getElementById('businessPhone')?.value.trim();
                const email = document.getElementById('businessEmail')?.value.trim();
                if (!name || !phone) {
                    if (businessStatus) businessStatus.innerHTML = 'Заполните компанию и телефон';
                    businessForm.removeAttribute('data-sending');
                    return;
                }
                if (businessStatus) businessStatus.innerHTML = 'Отправка...';
                try {
                    const response = await fetch('/server.php/api/request', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'business', name, phone, email: email || '', service: 'Рекламный контракт' })
                    });
                    const data = await response.json();
                    if (data.success) {
                        if (businessStatus) {
                            businessStatus.innerHTML = '✅ Заявка отправлена! Менеджер свяжется.';
                            businessStatus.style.color = '#10b981';
                        }
                        businessForm.reset();
                        setTimeout(() => document.getElementById('businessPanel')?.classList.remove('active'), 2000);
                    } else throw new Error();
                } catch {
                    if (businessStatus) businessStatus.innerHTML = '❌ Ошибка. Попробуйте позже.';
                } finally {
                    businessForm.removeAttribute('data-sending');
                }
            });
        }
        
        // ===== БИЗНЕС-ПАНЕЛЬ =====
        const businessPanel = document.getElementById('businessPanel');
        const businessNavLink = document.getElementById('businessNavLink');
        const footerBusinessLink = document.getElementById('footerBusinessLink');
        const closePanelBtn = document.getElementById('closePanelBtn');
        
        function openBusinessPanel() { if (businessPanel) businessPanel.classList.add('active'); }
        function closeBusinessPanel() { if (businessPanel) businessPanel.classList.remove('active'); }
        
        if (businessNavLink) businessNavLink.addEventListener('click', (e) => { e.preventDefault(); openBusinessPanel(); });
        if (footerBusinessLink) footerBusinessLink.addEventListener('click', (e) => { e.preventDefault(); openBusinessPanel(); });
        if (closePanelBtn) closePanelBtn.addEventListener('click', closeBusinessPanel);
        
        // ===== ОТЗЫВЫ =====
        function showInlineMessage(message, isSuccess = true) {
            let msgDiv = document.getElementById('reviewInlineMessage');
            if (!msgDiv) {
                msgDiv = document.createElement('div');
                msgDiv.id = 'reviewInlineMessage';
                const addReviewDiv = document.querySelector('.add-review');
                if (addReviewDiv) addReviewDiv.appendChild(msgDiv);
            }
            msgDiv.className = `review-inline-message ${isSuccess ? 'success' : 'error'}`;
            msgDiv.innerHTML = `<i class="fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i> <span>${message}</span>`;
            msgDiv.style.display = 'flex';
            setTimeout(() => {
                msgDiv.style.opacity = '0';
                setTimeout(() => {
                    if (msgDiv) {
                        msgDiv.style.display = 'none';
                        msgDiv.style.opacity = '1';
                    }
                }, 300);
            }, 4000);
        }
        
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
            for (let i = 1; i <= 5; i++) stars += i <= rating ? '★' : '☆';
            return stars;
        }
        
        function getAvatar(name) {
            return `<div class="review-avatar">${name.charAt(0).toUpperCase()}</div>`;
        }
        
        function getFilteredReviews() {
            let filtered = allReviews.filter(r => r.status === 'approved');
            if (currentFilter !== 'all') filtered = filtered.filter(r => r.rating === parseInt(currentFilter));
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
                setTimeout(() => { marquee.style.animation = 'scrollReviews 40s linear infinite'; }, 50);
            }
        }
        
        function initRatingStars() {
            const stars = document.querySelectorAll('.rating-star');
            const ratingInput = document.getElementById('reviewRating');
            if (!stars.length || !ratingInput) return;
            ratingInput.value = '0';
            stars.forEach(star => {
                star.removeEventListener('click', star._click);
                star.removeEventListener('mouseenter', star._enter);
                const val = parseInt(star.getAttribute('data-value'));
                star._click = () => {
                    ratingInput.value = val;
                    stars.forEach((s, i) => s.textContent = i < val ? '★' : '☆');
                };
                star._enter = () => {
                    stars.forEach((s, i) => s.textContent = i < val ? '★' : '☆');
                };
                star.addEventListener('click', star._click);
                star.addEventListener('mouseenter', star._enter);
            });
            const container = document.querySelector('.rating-input');
            if (container) {
                container.removeEventListener('mouseleave', container._leave);
                container._leave = () => {
                    const cur = parseInt(ratingInput.value) || 0;
                    stars.forEach((s, i) => s.textContent = i < cur ? '★' : '☆');
                };
                container.addEventListener('mouseleave', container._leave);
            }
        }
        initRatingStars();
        
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
        
        const oldReviewForm = document.getElementById('reviewForm');
        if (oldReviewForm && !oldReviewForm.hasAttribute('data-final')) {
            const newReviewForm = oldReviewForm.cloneNode(true);
            oldReviewForm.parentNode.replaceChild(newReviewForm, oldReviewForm);
            newReviewForm.setAttribute('data-final', 'true');
            
            newReviewForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('reviewName')?.value.trim();
                const ratingRaw = document.getElementById('reviewRating')?.value;
                const rating = parseInt(ratingRaw);
                const text = document.getElementById('reviewText')?.value.trim();
                
                if (!name) { showInlineMessage('❌ Введите ваше имя', false); return; }
                if (!rating || rating === 0 || isNaN(rating)) { showInlineMessage('⭐ Поставьте оценку (нажмите на звёздочки)', false); return; }
                if (!text) { showInlineMessage('📝 Напишите текст отзыва', false); return; }
                
                let reviews = JSON.parse(localStorage.getItem('tehno_reviews') || '[]');
                reviews.push({
                    id: Date.now(),
                    name: name,
                    rating: rating,
                    text: text,
                    date: new Date().toLocaleDateString('ru-RU'),
                    status: 'pending',
                    adminReply: ""
                });
                localStorage.setItem('tehno_reviews', JSON.stringify(reviews));
                showInlineMessage('✅ Спасибо! Отзыв отправлен на модерацию', true);
                newReviewForm.reset();
                document.getElementById('reviewRating').value = '0';
                document.querySelectorAll('.rating-star').forEach(s => s.textContent = '☆');
                setTimeout(() => renderMarquee(), 500);
            });
        }
        
        renderMarquee();
        
        // ===== СКРЫТЫЙ ВХОД =====
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
        
        // ===== ФОТО =====
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
            if (e.key === 'tehno_photos_global') loadPhotosFromAdmin();
        });
        
        // ===== МОБИЛЬНОЕ МЕНЮ =====
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        const mobileMenuClose = document.getElementById('mobileMenuClose');
        const mobileOverlay = document.getElementById('mobileOverlay');
        const mobileBusinessLink = document.getElementById('mobileBusinessLink');
        
        function openMobileMenu() {
            if (mobileMenu) mobileMenu.classList.add('open');
            if (mobileOverlay) mobileOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        
        function closeMobileMenu() {
            if (mobileMenu) mobileMenu.classList.remove('open');
            if (mobileOverlay) mobileOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
        
        if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMobileMenu);
        if (mobileMenuClose) mobileMenuClose.addEventListener('click', closeMobileMenu);
        if (mobileOverlay) mobileOverlay.addEventListener('click', closeMobileMenu);
        
        document.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', () => {
                closeMobileMenu();
            });
        });
        
        if (mobileBusinessLink) {
            mobileBusinessLink.addEventListener('click', (e) => {
                e.preventDefault();
                closeMobileMenu();
                setTimeout(() => {
                    if (businessPanel) businessPanel.classList.add('active');
                }, 300);
            });
        }
        
        window.addEventListener('resize', () => {
            if (window.innerWidth > 900) closeMobileMenu();
        });
        
        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m]);
        }
        
        console.log('Технопро: инициализация завершена');
    });
})();
