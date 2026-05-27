document.addEventListener('DOMContentLoaded', () => {
    let currentCsrfToken = null;
    
    async function fetchCsrfToken() {
        try {
            const res = await fetch('/api/csrf-token');
            const data = await res.json();
            currentCsrfToken = data.csrfToken;
            return currentCsrfToken;
        } catch (err) {
            console.error('Ошибка получения CSRF-токена:', err);
            return null;
        }
    }
    
    fetchCsrfToken();

    // ===== БЕГУЩАЯ СТРОКА С ОТЗЫВАМИ (РУЛЕТКА) =====
    function updateMarquee() {
        const marqueeContainer = document.getElementById('marqueeContent');
        if (!marqueeContainer) return;
        
        let savedReviews = JSON.parse(localStorage.getItem('tehno_reviews') || '[]');
        
        const defaultReviews = [
            { name: "Анна К.", text: "Починили iPhone 12 после воды за 2 часа. Гарантия!", rating: 5 },
            { name: "Дмитрий П.", text: "Заменили экран за 1500 ₽. Быстро, качественно.", rating: 5 },
            { name: "Игорь С.", text: "Ремонт разъёма за 40 минут. Рекомендую!", rating: 5 },
            { name: "Марина В.", text: "Диагностика бесплатно, честные ребята.", rating: 5 },
            { name: "Сергей Л.", text: "Ремонтировал приставку — доволен на 100%.", rating: 5 },
            { name: "Екатерина С.", text: "Вежливый персонал, адекватные цены.", rating: 5 }
        ];
        
        if (savedReviews.length === 0) {
            savedReviews = defaultReviews;
        }
        
        const latestReviews = savedReviews.slice(-12);
        let html = '';
        for (let i = 0; i < 2; i++) {
            latestReviews.forEach(review => {
                html += `<div class="marquee-item"><i class="fas fa-star"></i> ${escapeHtml(review.name)}: ${escapeHtml(review.text)}</div>`;
            });
        }
        marqueeContainer.innerHTML = html;
    }
    
    // Скрытый вход в админку (5 кликов)
    let clickCount = 0;
    let clickTimer = null;
    const logo = document.getElementById('adminLogoTrigger');
    
    if (logo) {
        logo.addEventListener('click', () => {
            clickCount++;
            clearTimeout(clickTimer);
            clickTimer = setTimeout(() => { clickCount = 0; }, 1000);
            if (clickCount >= 5) {
                clickCount = 0;
                window.location.href = '/admin.html';
            }
        });
    }

    // Переключение услуг
    const tabBtns = document.querySelectorAll('.tab-switch-btn');
    const phonesServices = document.getElementById('phones-services');
    const consolesServices = document.getElementById('consoles-services');

    if (tabBtns.length && phonesServices && consolesServices) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const target = btn.getAttribute('data-tab');
                if (target === 'phones') {
                    phonesServices.classList.add('active');
                    consolesServices.classList.remove('active');
                } else {
                    consolesServices.classList.add('active');
                    phonesServices.classList.remove('active');
                }
            });
        });
    }

    // Модальное окно
    const modal = document.getElementById('serviceModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalServiceSelect = document.getElementById('modalService');

    document.querySelectorAll('.service-btn').forEach(btn => {
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

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (modal) modal.classList.remove('active');
        });
    }
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    // Отправка формы
    const quickForm = document.getElementById('quickForm');
    const modalStatus = document.getElementById('modalStatus');
    
    if (quickForm) {
        quickForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = quickForm.querySelector('button[type="submit"]');
            if (submitBtn.disabled) return;
            submitBtn.disabled = true;
            
            const name = document.getElementById('modalName')?.value.trim();
            const phone = document.getElementById('modalPhone')?.value.trim();
            const model = document.getElementById('modalModel')?.value.trim();
            const service = document.getElementById('modalService')?.value;

            if (!name || !phone) {
                if (modalStatus) {
                    modalStatus.innerHTML = 'Заполните имя и телефон';
                    modalStatus.style.color = '#e67e22';
                }
                submitBtn.disabled = false;
                return;
            }
            if (!service || service === '') {
                if (modalStatus) {
                    modalStatus.innerHTML = 'Выберите услугу';
                    modalStatus.style.color = '#e67e22';
                }
                submitBtn.disabled = false;
                return;
            }

            const csrfToken = await fetchCsrfToken();
            if (!csrfToken) {
                if (modalStatus) {
                    modalStatus.innerHTML = 'Ошибка безопасности. Обновите страницу.';
                    modalStatus.style.color = '#e67e22';
                }
                submitBtn.disabled = false;
                return;
            }

            if (modalStatus) modalStatus.innerHTML = 'Отправка...';

            try {
                const res = await fetch('/api/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        type: 'repair', 
                        name, 
                        phone, 
                        model: model || '', 
                        service,
                        csrfToken
                    })
                });
                
                const data = await res.json();
                
                if (res.status === 429) {
                    if (modalStatus) {
                        modalStatus.innerHTML = `Слишком много заявок. Подождите ${data.retryAfter || 30} секунд.`;
                        modalStatus.style.color = '#e67e22';
                    }
                    submitBtn.disabled = false;
                    return;
                }
                
                if (data.success) {
                    if (modalStatus) {
                        modalStatus.innerHTML = 'Заявка принята! Мы перезвоним.';
                        modalStatus.style.color = '#10b981';
                    }
                    quickForm.reset();
                    if (modalServiceSelect) modalServiceSelect.selectedIndex = 0;
                    setTimeout(() => {
                        if (modal) modal.classList.remove('active');
                        if (modalStatus) modalStatus.innerHTML = '';
                    }, 2000);
                } else {
                    throw new Error(data.error || 'Ошибка');
                }
            } catch (err) {
                if (modalStatus) {
                    modalStatus.innerHTML = err.message || 'Ошибка. Попробуйте позже.';
                    modalStatus.style.color = '#e67e22';
                }
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    // Панель бизнеса
    const businessPanel = document.getElementById('businessPanel');
    const openBusinessLink = document.getElementById('openBusinessLink');
    const closePanelBtn = document.getElementById('closePanelBtn');
    const businessNavLink = document.getElementById('businessNavLink');
    const footerBusinessLink = document.getElementById('footerBusinessLink');

    function openPanel() { if (businessPanel) businessPanel.classList.add('active'); }
    function closePanel() { if (businessPanel) businessPanel.classList.remove('active'); }

    if (openBusinessLink) openBusinessLink.addEventListener('click', (e) => { e.preventDefault(); openPanel(); });
    if (businessNavLink) businessNavLink.addEventListener('click', (e) => { e.preventDefault(); openPanel(); });
    if (footerBusinessLink) footerBusinessLink.addEventListener('click', (e) => { e.preventDefault(); openPanel(); });
    if (closePanelBtn) closePanelBtn.addEventListener('click', closePanel);

    // Бизнес-форма
    const businessForm = document.getElementById('businessForm');
    const businessStatus = document.getElementById('businessStatus');
    
    if (businessForm) {
        businessForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = businessForm.querySelector('button[type="submit"]');
            if (submitBtn.disabled) return;
            submitBtn.disabled = true;
            
            const name = document.getElementById('businessName')?.value.trim();
            const phone = document.getElementById('businessPhone')?.value.trim();
            const email = document.getElementById('businessEmail')?.value.trim();

            if (!name || !phone) {
                if (businessStatus) {
                    businessStatus.innerHTML = 'Заполните компанию и телефон';
                    businessStatus.style.color = '#e67e22';
                }
                submitBtn.disabled = false;
                return;
            }

            const csrfToken = await fetchCsrfToken();
            if (!csrfToken) {
                if (businessStatus) {
                    businessStatus.innerHTML = 'Ошибка безопасности. Обновите страницу.';
                    businessStatus.style.color = '#e67e22';
                }
                submitBtn.disabled = false;
                return;
            }

            if (businessStatus) businessStatus.innerHTML = 'Отправка...';

            try {
                const res = await fetch('/api/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        type: 'business', 
                        name, 
                        phone, 
                        email: email || '', 
                        service: 'Рекламный контракт',
                        csrfToken
                    })
                });
                
                const data = await res.json();
                
                if (res.status === 429) {
                    if (businessStatus) {
                        businessStatus.innerHTML = `Слишком много заявок. Подождите ${data.retryAfter || 30} секунд.`;
                        businessStatus.style.color = '#e67e22';
                    }
                    submitBtn.disabled = false;
                    return;
                }
                
                if (data.success) {
                    if (businessStatus) {
                        businessStatus.innerHTML = 'Заявка отправлена. Менеджер свяжется.';
                        businessStatus.style.color = '#10b981';
                    }
                    businessForm.reset();
                    setTimeout(() => closePanel(), 2000);
                } else {
                    throw new Error(data.error || 'Ошибка');
                }
            } catch (err) {
                if (businessStatus) {
                    businessStatus.innerHTML = 'Ошибка. Попробуйте позже.';
                    businessStatus.style.color = '#e67e22';
                }
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    // Кнопки в блоке "О нас"
    const aboutRepairBtn = document.getElementById('aboutRepairBtn');
    const aboutBusinessBtn = document.getElementById('aboutBusinessBtn');

    if (aboutRepairBtn) {
        aboutRepairBtn.addEventListener('click', () => {
            if (modalServiceSelect) modalServiceSelect.selectedIndex = 0;
            if (modal) modal.classList.add('active');
        });
    }

    if (aboutBusinessBtn) {
        aboutBusinessBtn.addEventListener('click', () => {
            openPanel();
        });
    }

    // Плавный скролл для кнопки "Цены"
    const priceBtn = document.getElementById('priceBtn');
    if (priceBtn) {
        priceBtn.addEventListener('click', () => {
            document.getElementById('services').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // ===== ДОБАВЛЕНИЕ ОТЗЫВОВ И ОБНОВЛЕНИЕ БЕГУЩЕЙ СТРОКИ =====
    const reviewForm = document.getElementById('reviewForm');
    const reviewsGrid = document.getElementById('reviewsGrid');
    const reviewStatus = document.getElementById('reviewStatus');

    if (reviewForm) {
        let savedReviews = JSON.parse(localStorage.getItem('tehno_reviews') || '[]');
        
        function renderReviews() {
            if (!reviewsGrid) return;
            const existingCards = reviewsGrid.querySelectorAll('.review-card:not(.no-remove)');
            existingCards.forEach(card => card.remove());
            
            const latestReviews = savedReviews.slice(-6).reverse();
            latestReviews.forEach(review => {
                const card = document.createElement('div');
                card.className = 'review-card';
                card.innerHTML = `
                    <div class="review-text">${escapeHtml(review.text)}</div>
                    <div class="review-author"><i class="fas fa-star"></i> ${escapeHtml(review.name)}</div>
                    <div class="review-date">${review.date}</div>
                `;
                reviewsGrid.appendChild(card);
            });
        }
        
        renderReviews();
        updateMarquee();
        
        reviewForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('reviewName')?.value.trim();
            const rating = parseInt(document.getElementById('reviewRating')?.value);
            const text = document.getElementById('reviewText')?.value.trim();
            
            if (!name || !rating || !text) {
                if (reviewStatus) {
                    reviewStatus.innerHTML = 'Заполните все поля';
                    reviewStatus.style.color = '#e67e22';
                }
                return;
            }
            
            if (rating < 1 || rating > 5) {
                if (reviewStatus) {
                    reviewStatus.innerHTML = 'Оценка должна быть от 1 до 5';
                    reviewStatus.style.color = '#e67e22';
                }
                return;
            }
            
            const newReview = {
                name: name,
                rating: rating,
                text: text,
                date: new Date().toLocaleDateString('ru-RU')
            };
            
            savedReviews.push(newReview);
            localStorage.setItem('tehno_reviews', JSON.stringify(savedReviews));
            renderReviews();
            updateMarquee();
            
            reviewForm.reset();
            if (reviewStatus) {
                reviewStatus.innerHTML = 'Спасибо за отзыв!';
                reviewStatus.style.color = '#10b981';
                setTimeout(() => { reviewStatus.innerHTML = ''; }, 3000);
            }
        });
    }
    
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
});
