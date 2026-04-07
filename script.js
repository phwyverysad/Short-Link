document.addEventListener('DOMContentLoaded', () => {
    // ป้องกันการคลิกขวาและ F12
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => {
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || 
            (e.ctrlKey && (e.key === 'U' || e.key === 'S' || e.key === 'P'))) {
            e.preventDefault();
        }
    });

    const body = document.body;
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = themeToggleBtn ? themeToggleBtn.querySelector('i') : null;
    
    // Custom Dropdown Elements
    const dropdown = document.getElementById('api-dropdown');
    const dropdownHeader = document.getElementById('dropdown-header');
    const dropdownList = document.getElementById('dropdown-list');
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    const hiddenApiInput = document.getElementById('api-provider');
    const selectedApiText = document.getElementById('selected-api-text');
    
    // UI Elements
    const radioRandom = document.querySelector('input[value="random"]');
    const radioCustom = document.querySelector('input[value="custom"]');
    const customRadioContainer = document.getElementById('custom-radio-container');
    const customAliasContainer = document.getElementById('custom-alias-container');
    const customAliasInput = document.getElementById('custom-alias');
    const randomLabel = document.getElementById('random-label');
    
    const longUrlInput = document.getElementById('long-url');
    const shortenBtn = document.getElementById('shorten-btn');
    const appContainer = document.getElementById('app-container');
    const resultContainer = document.getElementById('result-container');
    const shortUrlDisplay = document.getElementById('short-url');
    const qrCodeImg = document.getElementById('qr-code');

    // Drawer
    const historyBtn = document.getElementById('history-btn');
    const historyDrawer = document.getElementById('history-drawer');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const historyList = document.getElementById('history-list');
    const historyDetail = document.getElementById('history-detail');

    // --- Toast Function (Define early) ---
    let toastTimeout;
    const showToast = (message, type = 'success') => {
        const toast = document.getElementById('toast');
        if (!toast) {
            console.error('Toast element not found');
            return;
        }
        toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i> <span>${message}</span>`;
        toast.className = `toast capsule show ${type}`;
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
    };

    // --- Theme Logic ---
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
        if (themeIcon) themeIcon.classList.replace('fa-moon', 'fa-sun');
    }
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            themeToggleBtn.classList.add('pop-anim');
            setTimeout(() => themeToggleBtn.classList.remove('pop-anim'), 300);
            
            body.classList.toggle('dark-mode');
            const isDark = body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            if (themeIcon) themeIcon.classList.replace(isDark ? 'fa-moon' : 'fa-sun', isDark ? 'fa-sun' : 'fa-moon');
        });
    }

    // --- Custom Dropdown ---
    if (dropdownItems.length > 0) {
        dropdownItems.forEach((item, index) => item.style.setProperty('--i', index));
    }
    if (dropdownHeader) {
        dropdownHeader.addEventListener('click', () => {
            if (dropdown) dropdown.classList.toggle('open');
            dropdownHeader.classList.add('pop-anim');
            setTimeout(() => dropdownHeader.classList.remove('pop-anim'), 300);
        });
    }

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
    });

    dropdownItems.forEach(item => {
        item.addEventListener('click', () => {
            dropdownItems.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            
            const val = item.getAttribute('data-value');
            const type = item.getAttribute('data-type');
            hiddenApiInput.value = val;
            selectedApiText.textContent = item.childNodes[0].textContent.trim();
            dropdown.classList.remove('open');

            dropdownHeader.classList.add('pop-anim');
            setTimeout(() => dropdownHeader.classList.remove('pop-anim'), 300);

            if (type === 'random') {
                radioRandom.checked = true;
                randomLabel.classList.add('pop-anim');
                setTimeout(() => randomLabel.classList.remove('pop-anim'), 300);
                
                customRadioContainer.classList.add('disabled');
                radioCustom.disabled = true;
                customAliasContainer.classList.remove('show');
                customAliasInput.value = '';
                showToast('API นี้รองรับการสุ่มชื่อเท่านั้น', 'error');
            } else {
                customRadioContainer.classList.remove('disabled');
                radioCustom.disabled = false;
            }
        });
    });

    const toggleCustomInput = () => {
        const activeLabel = radioCustom.checked ? customRadioContainer : randomLabel;
        activeLabel.classList.add('pop-anim');
        setTimeout(() => activeLabel.classList.remove('pop-anim'), 300);

        if (radioCustom.checked && !radioCustom.disabled) {
            customAliasContainer.classList.add('show');
            customAliasInput.focus();
        } else {
            customAliasContainer.classList.remove('show');
            customAliasInput.value = '';
        }
    };
    radioRandom.addEventListener('change', toggleCustomInput);
    radioCustom.addEventListener('change', toggleCustomInput);

    // --- API Core ---
    const callShortenerAPI = async (provider, url, alias) => {
        let apiUrl, res, data;
        const eUrl = encodeURIComponent(url);
        const eAlias = alias ? encodeURIComponent(alias) : '';
        const timeout = 10000;

        const fetchWithTimeout = (url, options = {}) => {
            return Promise.race([
                fetch(url, options),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
        };

        try {
            switch (provider) {
                case 'isgd':
                    apiUrl = `https://is.gd/create.php?format=json&url=${eUrl}${alias ? '&shorturl='+eAlias : ''}`;
                    res = await fetchWithTimeout(apiUrl);
                    if (!res.ok) throw new Error('is.gd API error');
                    data = await res.json();
                    if (data.errorcode) throw new Error('ชื่อนี้ถูกใช้งานแล้ว หรือลิงก์ผิดพลาด');
                    if (!data.shorturl) throw new Error('Invalid response from is.gd');
                    return data.shorturl;
                case 'vgd':
                    apiUrl = `https://v.gd/create.php?format=json&url=${eUrl}${alias ? '&shorturl='+eAlias : ''}`;
                    res = await fetchWithTimeout(apiUrl);
                    if (!res.ok) throw new Error('v.gd API error');
                    data = await res.json();
                    if (data.errorcode) throw new Error('เกิดข้อผิดพลาดกับ v.gd');
                    if (!data.shorturl) throw new Error('Invalid response from v.gd');
                    return data.shorturl;
                case 'spoome':
                    const fd = new URLSearchParams({ url: url });
                    if (alias) fd.append('alias', alias);
                    res = await fetchWithTimeout('https://spoo.me/', { method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: fd });
                    if (!res.ok) throw new Error('ผิดพลาด (spoo.me)');
                    data = await res.json();
                    if (data.error) throw new Error(data.error);
                    if (!data.short_url) throw new Error('Invalid response from spoo.me');
                    return data.short_url;
                case 'dagd': 
                    res = await fetchWithTimeout(`https://da.gd/s?url=${eUrl}${alias ? '&shorturl='+eAlias : ''}`);
                    if (!res.ok) throw new Error('da.gd API error');
                    const dagdText = await res.text();
                    if (!dagdText || dagdText.trim().length === 0 || /error|too long|invalid/i.test(dagdText.trim())) throw new Error('ชื่อซ้ำ หรือลิงก์ยาวไป (da.gd)');
                    return dagdText.trim();
                case 'tinyurl':
                    res = await fetchWithTimeout(`https://tinyurl.com/api-create.php?url=${eUrl}`);
                    if (!res.ok) throw new Error('TinyURL Server Error');
                    const tinyText = await res.text();
                    if (!tinyText || tinyText.length === 0) throw new Error('TinyURL returned empty response');
                    return tinyText.trim();
                case 'cleanuri':
                    res = await fetchWithTimeout('https://corsproxy.io/?https://cleanuri.com/api/v1/shorten', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `url=${eUrl}` });
                    if (!res.ok) throw new Error('CleanURI API error');
                    data = await res.json();
                    if (data.error) throw new Error('CleanURI ไม่รองรับลิงก์นี้');
                    if (!data.result_url) throw new Error('Invalid response from CleanURI');
                    return data.result_url;
                case 'gotiny':
                    res = await fetchWithTimeout('https://corsproxy.io/?https://gotiny.cc/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: url }) });
                    if (!res.ok) throw new Error('GoTiny API error');
                    data = await res.json();
                    if (!data || !Array.isArray(data) || !data[0] || !data[0].code) throw new Error('GoTiny Error');
                    return `https://gotiny.cc/${data[0].code}`;
                default:
                    throw new Error('Unknown Provider');
            }
        } catch (err) {
            if (err.message === 'Failed to fetch' || err.message === 'Timeout') throw new Error(`เครือข่ายบล็อกการเชื่อมต่อ API (${provider}) ให้ลองเจ้าอื่น`);
            if (err instanceof TypeError && err.message.includes('Failed')) throw new Error(`เครือข่ายบล็อกการเชื่อมต่อ API (${provider}) ให้ลองเจ้าอื่น`);
            throw err;
        }
    };

    shortenBtn.addEventListener('click', async () => {
        let url = longUrlInput.value.trim();
        const provider = hiddenApiInput.value;
        const isCustom = radioCustom.checked;
        const alias = customAliasInput.value.trim();

        if (!url) return showToast('กรุณาระบุลิงก์ต้นฉบับ', 'error');
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        if (isCustom && !alias) return showToast('กรุณาระบุชื่อที่ต้องการ', 'error');

        shortenBtn.disabled = true;
        shortenBtn.querySelector('.btn-text').style.display = 'none';
        shortenBtn.querySelector('.fa-wand-magic-sparkles').style.display = 'none';
        document.getElementById('btn-loader').style.display = 'block';

        try {
            const shortUrl = await callShortenerAPI(provider, url, isCustom ? alias : null);
            const qrUrl = `https://quickchart.io/qr?size=400&margin=1&text=${encodeURIComponent(shortUrl)}`;

            shortUrlDisplay.href = shortUrl;
            shortUrlDisplay.textContent = shortUrl;
            qrCodeImg.src = qrUrl;

            saveToHistory(url, shortUrl, qrUrl);
            
            appContainer.classList.add('expanded');
            setTimeout(() => {
                resultContainer.classList.remove('hidden');
                resultContainer.classList.add('fade-in-up');
            }, 300);

            showToast('ย่อลิงก์สำเร็จ!', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            shortenBtn.disabled = false;
            shortenBtn.querySelector('.btn-text').style.display = 'inline';
            shortenBtn.querySelector('.fa-wand-magic-sparkles').style.display = 'inline';
            document.getElementById('btn-loader').style.display = 'none';
        }
    });

    document.getElementById('copy-btn').addEventListener('click', function() {
        this.classList.add('pop-anim');
        setTimeout(() => this.classList.remove('pop-anim'), 300);
        navigator.clipboard.writeText(shortUrlDisplay.textContent);
        this.innerHTML = '<i class="fa-solid fa-check"></i>';
        showToast('คัดลอกลิงก์แล้ว', 'success');
        setTimeout(() => this.innerHTML = '<i class="fa-regular fa-copy"></i>', 2000);
    });

    document.getElementById('download-qr-btn').addEventListener('click', async function() {
        this.classList.add('pop-anim');
        setTimeout(() => this.classList.remove('pop-anim'), 300);
        try {
            const res = await fetch(qrCodeImg.src);
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl; 
            const tail = shortUrlDisplay.textContent.split('/').pop() || 'qr';
            a.download = `QR-${tail}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        } catch(e) {
            showToast('โหลดภาพไม่สำเร็จ', 'error');
        }
    });

    const btnResetMain = document.getElementById('btn-reset-main');
    if (btnResetMain) {
        btnResetMain.addEventListener('click', () => {
            btnResetMain.classList.add('pop-anim');
            setTimeout(() => btnResetMain.classList.remove('pop-anim'), 300);
            
            // Remove expanded layout and fade out
            appContainer.classList.remove('expanded');
            resultContainer.classList.add('hidden');
            resultContainer.classList.remove('fade-in-up');
            
            // Clear input
            document.getElementById('long-url').value = '';
            if (customAliasInput) customAliasInput.value = '';
        });
    }

    // --- History Drawer ---
    const getHistory = () => {
        try {
            return JSON.parse(localStorage.getItem('sleekCapsuleHistory')) || [];
        } catch (e) {
            console.error('Error parsing history:', e);
            return [];
        }
    };
    const saveToHistory = (orig, short, qr) => {
        try {
            let hist = getHistory();
            hist = hist.filter(item => item.orig !== orig);
            hist.unshift({ id: Date.now(), orig, short, qr, date: new Date().toLocaleString('th-TH') });
            if (hist.length > 50) hist.length = 50;
            localStorage.setItem('sleekCapsuleHistory', JSON.stringify(hist));
        } catch (e) {
            console.error('Error saving history:', e);
        }
    };

    let isDeleteMode = false;
    let selectedIds = new Set();
    const drawerToolbar = document.getElementById('drawer-toolbar');
    const bulkActions = document.getElementById('bulk-actions');
    const histSearch = document.getElementById('hist-search');
    const deleteCount = document.getElementById('delete-count');

    const renderHistory = (searchTerm = '') => {
        let hist = getHistory();
        if (searchTerm) {
            hist = hist.filter(item => item.short.toLowerCase().includes(searchTerm.toLowerCase()) || item.orig.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        historyList.innerHTML = hist.length ? '' : '<p style="text-align:center; opacity:0.5; margin-top:2rem;">ไม่มีประวัติ</p>';
        hist.forEach((item, i) => {
            const div = document.createElement('div');
            div.className = 'history-card';
            div.style.animationDelay = `${i * 0.05}s`;
            div.innerHTML = `
                <input type="checkbox" class="history-checkbox" value="${item.id}" ${selectedIds.has(item.id.toString()) ? 'checked' : ''}>
                <div class="history-info">
                    <p class="h-short">${item.short}</p>
                    <p class="h-orig">${item.orig}</p>
                    <p class="h-date"><i class="fa-regular fa-clock"></i> ${item.date || 'ไม่มีข้อมูลวันที่'}</p>
                </div>
            `;
            div.onclick = (e) => {
                if (isDeleteMode) {
                    const cb = div.querySelector('.history-checkbox');
                    if (e.target !== cb) cb.checked = !cb.checked;
                    if (cb.checked) selectedIds.add(cb.value);
                    else selectedIds.delete(cb.value);
                    deleteCount.textContent = selectedIds.size;
                    return;
                }
                
                document.getElementById('hist-original').textContent = item.orig;
                document.getElementById('hist-original').href = item.orig;
                document.getElementById('hist-short').textContent = item.short;
                document.getElementById('hist-short').href = item.short;
                document.getElementById('hist-qr').src = `https://quickchart.io/qr?size=400&margin=1&text=${encodeURIComponent(item.short)}`;
                drawerToolbar.classList.add('hidden');
                historyList.classList.add('hidden');
                historyDetail.classList.remove('hidden');
                
                // Trigger Animation
                const dCard = document.querySelector('.detail-card');
                dCard.classList.remove('detail-anim');
                void dCard.offsetWidth; // trigger reflow
                dCard.classList.add('detail-anim');
            };
            historyList.appendChild(div);
        });
    };

    if (histSearch) histSearch.addEventListener('input', e => renderHistory(e.target.value));

    const toggleDeleteMode = (mode) => {
        isDeleteMode = mode;
        if (isDeleteMode) {
            document.body.classList.add('delete-mode');
            drawerToolbar.classList.add('hidden');
            bulkActions.classList.remove('hidden');
            selectedIds.clear();
            deleteCount.textContent = '0';
            renderHistory(histSearch ? histSearch.value : '');
        } else {
            document.body.classList.remove('delete-mode');
            drawerToolbar.classList.remove('hidden');
            bulkActions.classList.add('hidden');
            selectedIds.clear();
            renderHistory(histSearch ? histSearch.value : '');
        }
    };

    const btnToggleDelete = document.getElementById('btn-toggle-delete');
    if (btnToggleDelete) btnToggleDelete.addEventListener('click', () => toggleDeleteMode(true));

    const btnCancelDelete = document.getElementById('btn-cancel-delete');
    if (btnCancelDelete) btnCancelDelete.addEventListener('click', () => toggleDeleteMode(false));

    const btnDeleteSelected = document.getElementById('btn-delete-selected');
    if (btnDeleteSelected) {
        btnDeleteSelected.addEventListener('click', () => {
            if (selectedIds.size === 0) return showToast('กรุณาเลือกรายการที่ต้องการลบ', 'error');
            const hist = getHistory().filter(item => !selectedIds.has(item.id.toString()));
            localStorage.setItem('sleekCapsuleHistory', JSON.stringify(hist));
            showToast(`ลบ ${selectedIds.size} รายการแล้ว`, 'success');
            toggleDeleteMode(false);
        });
    }

    historyBtn.addEventListener('click', () => {
        historyBtn.classList.add('pop-anim');
        setTimeout(() => historyBtn.classList.remove('pop-anim'), 300);
        isDeleteMode = false;
        selectedIds.clear();
        document.body.classList.remove('delete-mode');
        if (histSearch) histSearch.value = '';
        if (drawerToolbar) drawerToolbar.classList.remove('hidden');
        if (bulkActions) bulkActions.classList.add('hidden');
        renderHistory();
        historyList.classList.remove('hidden');
        historyDetail.classList.add('hidden');
        historyDrawer.classList.add('show');
        drawerOverlay.classList.add('show');
    });

    // History QR Download
    const histDownloadBtn = document.getElementById('hist-download-qr');
    if (histDownloadBtn) {
        histDownloadBtn.addEventListener('click', async function() {
            this.classList.add('pop-anim');
            setTimeout(() => this.classList.remove('pop-anim'), 300);
            try {
                const qrImgSrc = document.getElementById('hist-qr').src;
                const histShort = document.getElementById('hist-short').textContent;
                const tail = histShort.split('/').pop() || 'qr';
                const res = await fetch(qrImgSrc);
                const blob = await res.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl; 
                a.download = `QR-${tail}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(blobUrl);
            } catch(e) {
                showToast('โหลดภาพไม่สำเร็จ', 'error');
            }
        });
    }

    // History Copy Buttons
    const copyToClipboard = (text, btnElement) => {
        navigator.clipboard.writeText(text);
        btnElement.classList.add('pop-anim');
        setTimeout(() => btnElement.classList.remove('pop-anim'), 300);
        btnElement.innerHTML = '<i class="fa-solid fa-check"></i>';
        showToast('คัดลอกลิงก์แล้ว', 'success');
        setTimeout(() => btnElement.innerHTML = '<i class="fa-regular fa-copy"></i>', 2000);
    };

    const copyHistShortBtn = document.getElementById('copy-hist-short');
    if (copyHistShortBtn) {
        copyHistShortBtn.addEventListener('click', function() {
            copyToClipboard(document.getElementById('hist-short').textContent, this);
        });
    }

    const copyHistOrigBtn = document.getElementById('copy-hist-original');
    if (copyHistOrigBtn) {
        copyHistOrigBtn.addEventListener('click', function() {
            copyToClipboard(document.getElementById('hist-original').textContent, this);
        });
    }

    const closeDrawer = () => {
        historyDrawer.classList.remove('show');
        drawerOverlay.classList.remove('show');
    };
    
    const closeDrawerBtn = document.getElementById('close-drawer');
    if (closeDrawerBtn) {
        closeDrawerBtn.addEventListener('click', closeDrawer);
    }
    drawerOverlay.addEventListener('click', closeDrawer);
    
    const backToListBtn = document.getElementById('back-to-list');
    if (backToListBtn) {
        backToListBtn.addEventListener('click', () => {
            historyDetail.classList.add('hidden');
            if (drawerToolbar && !isDeleteMode) drawerToolbar.classList.remove('hidden');
            historyList.classList.remove('hidden');
        });
    }

    // --- Parallax Background & Flying Pig ---
    const canvas = document.getElementById('parallax-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        
        class Background {
            constructor(img, speed) {
                this.img = img;
                this.speed = speed;
                this.x = 0;
                this.resize();
            }
            resize() {
                this.height = canvas.height;
                this.width = this.height * (this.img.width / Math.max(1, this.img.height));
            }
            update() {
                this.x += this.speed;
                if (this.x <= -this.width) {
                    this.x += this.width;
                }
            }
            draw() {
                let cx = Math.floor(this.x);
                const w = Math.ceil(this.width);
                const h = Math.ceil(this.height);
                while (cx < canvas.width) {
                    if (cx + w > 0) {
                        ctx.drawImage(this.img, cx, 0, w, h);
                    }
                    cx += w;
                }
            }
        }

        const imgs = [
            { id: 'bg1-img', speed: -0.5 },
            { id: 'bg2-img', speed: -1.0 },
            { id: 'bg3-img', speed: -1.5 },
            { id: 'bg4-img', speed: -2.0 },
            { id: 'bg5-img', speed: -3.0 }
        ];

        let backgrounds = [];
        let imagesLoaded = 0;

        function initCanvas() {
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.imageSmoothingEnabled = false;

            if (backgrounds.length === 0) {
                backgrounds = imgs.map(bg => new Background(document.getElementById(bg.id), bg.speed));
            } else {
                backgrounds.forEach(bg => bg.resize());
            }
        }

        function checkLoaded() {
            imagesLoaded++;
            if (imagesLoaded === imgs.length) {
                initCanvas();
                renderBackground();
            }
        }

        imgs.forEach(bg => {
            const el = document.getElementById(bg.id);
            if (el.complete && el.naturalWidth !== 0) {
                checkLoaded();
            } else {
                el.addEventListener('load', checkLoaded);
                el.addEventListener('error', () => {
                    console.warn(`Failed to load ${bg.id}, continuing anyway`);
                    checkLoaded();
                });
            }
        });

        // Timeout for background loading
        setTimeout(() => {
            if (imagesLoaded < imgs.length) {
                console.warn('Background images timeout, proceeding with available images');
                while (imagesLoaded < imgs.length) {
                    checkLoaded();
                }
            }
        }, 3000);

        let lastInnerWidth = window.innerWidth;
        window.addEventListener('resize', () => {
            // Prevent mobile vertical scroll (URL bar hiding) from constantly resetting canvas
            if (window.innerWidth !== lastInnerWidth) {
                lastInnerWidth = window.innerWidth;
                if (backgrounds.length > 0) initCanvas();
            }
        });

        function renderBackground() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            backgrounds.forEach(bg => {
                bg.update();
                bg.draw();
            });
            requestAnimationFrame(renderBackground);
        }
    }

    const pig = document.getElementById('flying-pig');
    if (pig) {
        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let pigX = mouseX;
        let pigY = mouseY;

        window.addEventListener('mousemove', e => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });
        window.addEventListener('touchmove', e => {
            if(e.touches.length > 0) {
                mouseX = e.touches[0].clientX;
                mouseY = e.touches[0].clientY;
            }
        });

        function animatePig() {
            pigX += (mouseX - pigX) * 0.08;
            pigY += (mouseY - pigY) * 0.08;
            pig.style.transform = `translate(${pigX}px, ${pigY}px) translate(-50%, -50%)`;
            requestAnimationFrame(animatePig);
        }
        animatePig();
    }
});
