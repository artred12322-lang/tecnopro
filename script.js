document.addEventListener('DOMContentLoaded', () => {
    // СКРЫТЫЙ ВХОД В АДМИНКУ ПО 5 КЛИКАМ НА ЛОГОТИП
    let clickCount = 0;
    let clickTimer = null;
    const logo = document.getElementById('adminLogoTrigger');
    
    if (logo) {
        logo.addEventListener('click', () => {
            clickCount++;
            clearTimeout(clickTimer);
            clickTimer = setTimeout(() => {
                clickCount = 0;
            }, 1000);
            
            if (clickCount >= 5) {
                clickCount = 0;
                window.location.href = '/admin.html';
            }
        });
    }

    // АККОРДЕОН
    const accordionItems = document.querySelectorAll('.accordion-item');
    accordionItems.forEach(item => {
        const header = item.querySelector('.accordion-header');
        header.addEventListener('click', () => {
            item.classList.toggle('active');
        });
    });

    // ПЕРЕКЛЮЧЕНИЕ УСЛУГ (ТЕЛЕФОНЫ / ПРИСТАВКИ)
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

        // МОДАЛЬНОЕ ОКНО
    const modal = document.getElementById('serviceModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalServiceSelect = document.getElementById('modalService');

    // Кнопки в карточках услуг (автоматически выбирают услугу)
    document.querySelectorAll('.service-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const service = btn.getAttribute('data-service');
            if (modalServiceSelect && service) {
                for (let i = 0; i < modalServiceSelect.options.length; i++) {
                    if (modalServiceSelect.options[i].value === service) {
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

    // ОТПРАВКА ФОРМЫ
    const quickForm = document.getElementById('quickForm');
    const modalStatus = document.getElementById('modalStatus');
    if (quickForm) {
        quickForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('modalName')?.value.trim();
            const phone = document.getElementById('modalPhone')?.value.trim();
            const model = document.getElementById('modalModel')?.value.trim();
            const service = document.getElementById('modalService')?.value;

            if (!name || !phone) {
                if (modalStatus) {
                    modalStatus.innerHTML = 'Заполните имя и телефон';
                    modalStatus.style.color = '#e67e22';
                }
                return;
            }
            if (!service || service === '') {
                if (modalStatus) {
                    modalStatus.innerHTML = 'Выберите услугу';
                    modalStatus.style.color = '#e67e22';
                }
                return;
            }

            if (modalStatus) modalStatus.innerHTML = 'Отправка...';

            try {
                const res = await fetch('/api/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'repair', name, phone, model: model || '', service: service })
                });
                const data = await res.json();
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
                } else throw new Error();
            } catch (err) {
                if (modalStatus) {
                    modalStatus.innerHTML = 'Ошибка. Проверьте, запущен ли сервер (node server.js)';
                    modalStatus.style.color = '#e67e22';
                }
            }
        });
    }

    // ПАНЕЛЬ БИЗНЕСА
    const businessPanel = document.getElementById('businessPanel');
    const openBusinessLink = document.getElementById('openBusinessLink');
    const closePanelBtn = document.getElementById('closePanelBtn');
    const businessNavLink = document.getElementById('businessNavLink');

    function openPanel() { if (businessPanel) businessPanel.classList.add('active'); }
    function closePanel() { if (businessPanel) businessPanel.classList.remove('active'); }

    if (openBusinessLink) openBusinessLink.addEventListener('click', (e) => { e.preventDefault(); openPanel(); });
    if (businessNavLink) businessNavLink.addEventListener('click', (e) => { e.preventDefault(); openPanel(); });
    if (closePanelBtn) closePanelBtn.addEventListener('click', closePanel);

    // БИЗНЕС-ФОРМА
    const businessForm = document.getElementById('businessForm');
    const businessStatus = document.getElementById('businessStatus');
    if (businessForm) {
        businessForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('businessName')?.value.trim();
            const phone = document.getElementById('businessPhone')?.value.trim();
            const email = document.getElementById('businessEmail')?.value.trim();

            if (!name || !phone) {
                if (businessStatus) {
                    businessStatus.innerHTML = 'Заполните компанию и телефон';
                    businessStatus.style.color = '#e67e22';
                }
                return;
            }

            if (businessStatus) businessStatus.innerHTML = 'Отправка...';

            try {
                const res = await fetch('/api/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'business', name, phone, email: email || '', service: 'Рекламный контракт' })
                });
                const data = await res.json();
                if (data.success) {
                    if (businessStatus) {
                        businessStatus.innerHTML = 'Заявка отправлена. Менеджер свяжется.';
                        businessStatus.style.color = '#10b981';
                    }
                    businessForm.reset();
                    setTimeout(() => closePanel(), 2000);
                } else throw new Error();
            } catch (err) {
                if (businessStatus) {
                    businessStatus.innerHTML = 'Ошибка. Проверьте, запущен ли сервер (node server.js)';
                    businessStatus.style.color = '#e67e22';
                }
            }
        });
    }

    // КНОПКИ В БЛОКЕ "О НАС"
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
});