
        const firebaseConfig = {
          apiKey: "AIzaSyClZG90OVAElY5D_-lKStgnh3TMesjvQ7w",
          authDomain: "pencatat-keuangan-zii.firebaseapp.com",
          projectId: "pencatat-keuangan-zii",
          storageBucket: "pencatat-keuangan-zii.firebasestorage.app",
          messagingSenderId: "405630946174",
          appId: "1:405630946174:web:395a00e2180da6f69ac12f"
        };
        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();
        const auth = firebase.auth();
        const googleProvider = new firebase.auth.GoogleAuthProvider();
        let currentUser = null;
        let savingsRef = null;

        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                document.getElementById('loginScreen').classList.add('opacity-0', 'pointer-events-none');
                setTimeout(() => document.getElementById('loginScreen').classList.add('hidden'), 500);
                
                // Update UI Profile
                document.getElementById('userName').innerText = user.displayName || 'User';
                document.getElementById('homeUserName').innerText = user.displayName ? user.displayName.split(' ')[0] : 'User';
                document.getElementById('userEmail').innerText = user.email || '';
                
                if (user.photoURL) {
                    const img = document.getElementById('userPhoto');
                    img.src = user.photoURL;
                    img.classList.remove('hidden');
                    document.getElementById('userInitials').classList.add('hidden');
                }
                
                // Fetch user data
                savingsRef = db.collection('users').doc(user.uid).collection('savings');
                loadFromFirestore();
                renderSavings();
            } else {
                currentUser = null;
                savingsRef = null;
                const loginScreen = document.getElementById('loginScreen');
                loginScreen.classList.remove('hidden');
                setTimeout(() => loginScreen.classList.remove('opacity-0', 'pointer-events-none'), 50);
                
                // Clear UI Data
                transactions = [];
                updateDashboard();
                renderFullHistory();
            }
        });

        // Tangkap error jika redirect gagal (jika sempat terjadi)
        auth.getRedirectResult().catch(error => {
            console.error("Redirect Error:", error);
        });

        let isLoggingIn = false;
        function loginWithGoogle() {
            if (isLoggingIn) return;
            isLoggingIn = true;
            
            // Mengubah tombol menjadi state loading (warna abu-abu) agar tidak diklik dua kali
            const btn = document.querySelector('button[onclick="loginWithGoogle()"]');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = 'Memuat... Tunggu Sebentar ⏳';
            btn.classList.add('opacity-50', 'pointer-events-none');

            auth.signInWithPopup(googleProvider).then(() => {
                isLoggingIn = false;
                // Jika sukses, onAuthStateChanged otomatis jalan
            }).catch(error => {
                isLoggingIn = false;
                btn.innerHTML = originalHTML;
                btn.classList.remove('opacity-50', 'pointer-events-none');
                
                // Pesan custom jika popup diblokir
                if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
                    showGlassNotif('Popup Diblokir', 'Tolong izinkan pop-up di browser Anda, atau jangan tutup jendela login terlalu cepat.', { type: 'error' });
                } else {
                    showGlassNotif('Login Gagal', error.message, { type: 'error' });
                }
            });
        }

        async function logout() {
            const confirmed = await showGlassNotif('Keluar', 'Apakah Anda yakin ingin keluar dari akun ini?', {
                type: 'warning',
                buttons: [{text: 'Batal'}, {text: 'Keluar', bold: true, isDestructive: true}]
            });
            if (confirmed) {
                auth.signOut();
            }
        }

        function getUserTransactionsRef() {
            if (!currentUser) return null;
            return db.collection('users').doc(currentUser.uid).collection('transactions');
        }

        // --- CUSTOM GLASS NOTIFICATION SYSTEM (iOS Style) ---
        let glassNotifResolve = null;

        function showGlassNotif(title, message, options = {}) {
            const { type = 'info', buttons = [{text: 'OK', bold: true}] } = options;
            const overlay = document.getElementById('glassNotifOverlay');
            const box = document.getElementById('glassNotifBox');
            const icon = document.getElementById('glassNotifIcon');

            document.getElementById('glassNotifTitle').innerText = title;
            document.getElementById('glassNotifMessage').innerText = message;

            // Icon styling based on type
            const iconMap = {
                danger: { bg: 'rgba(255,59,48,0.12)', color: 'text-red-500', svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>' },
                warning: { bg: 'rgba(255,149,0,0.12)', color: 'text-orange-500', svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>' },
                success: { bg: 'rgba(52,199,89,0.12)', color: 'text-green-500', svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>' },
                info: { bg: 'rgba(0,122,255,0.12)', color: 'text-blue-500', svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>' }
            };
            const ic = iconMap[type] || iconMap.info;
            icon.style.background = ic.bg;
            icon.innerHTML = `<svg class="w-6 h-6 ${ic.color}" fill="none" stroke="currentColor" viewBox="0 0 24 24">${ic.svg}</svg>`;

            // Build buttons
            const btnContainer = document.getElementById('glassNotifButtons');
            btnContainer.innerHTML = '';
            buttons.forEach((btn, i) => {
                const el = document.createElement('button');
                el.className = 'glass-notif-btn' + (btn.bold ? ' glass-notif-btn-bold' : '') + (btn.danger ? ' glass-notif-btn-danger' : '');
                el.innerText = btn.text;
                el.onclick = () => {
                    closeGlassNotif();
                    if (glassNotifResolve) glassNotifResolve(i);
                };
                btnContainer.appendChild(el);
            });

            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
            box.classList.remove('notif-pop');
            void box.offsetWidth; // trigger reflow
            box.classList.add('notif-pop');
            requestAnimationFrame(() => { overlay.style.opacity = '1'; });

            return new Promise(resolve => { glassNotifResolve = resolve; });
        }

        function showGlassConfirm(title, message, options = {}) {
            const cancelText = options.cancelText || 'Batal';
            const confirmText = options.confirmText || 'Hapus';
            return showGlassNotif(title, message, {
                type: options.type || 'danger',
                buttons: [
                    { text: cancelText },
                    { text: confirmText, danger: options.type === 'danger' || !options.type, bold: true }
                ]
            });
        }

        function closeGlassNotif() {
            const overlay = document.getElementById('glassNotifOverlay');
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.classList.add('hidden');
                overlay.classList.remove('flex');
            }, 300);
        }

        const i18n = {
            id: {
                home: 'Beranda', add: 'Tambah', report: 'Laporan', settings: 'Pengaturan', saving: 'Tabungan',
                greeting: 'Halo,', totalBalance: 'Saldo Total', income: 'Pemasukan', expense: 'Pengeluaran',
                historyTitle: 'Riwayat Transaksi', seeAll: 'Lihat Semua',
                reportTitle: 'Laporan Keuangan', expensePerCat: 'Pengeluaran Per Kategori', expenseDetail: 'Rincian Pengeluaran',
                exportData: 'Ekspor Data', importCsv: 'Impor Data CSV', darkMode: 'Mode Gelap', language: 'Bahasa', resetData: 'Hapus Semua Data',
                filter7Days: '7 Hari Terakhir', filter30Days: '30 Hari Terakhir', filterMonth: 'Bulan Ini', filterAllTime: 'Semua Waktu',
                filterAllType: 'Semua Tipe', typeInc: 'Pemasukan', typeExp: 'Pengeluaran',
                addTx: 'Tambah Data', editTx: 'Edit Data', amount: 'JUMLAH (RP)', category: 'KATEGORI', date: 'TANGGAL', note: 'CATATAN',
                saveBtn: 'Simpan Data', updateBtn: 'Update',
                emptyTx: 'Belum ada transaksi.', noNote: 'Tidak ada catatan', outLabel: 'KELUAR', inLabel: 'MASUK',
                food: 'Makanan', transport: 'Transportasi', shopping: 'Belanja', bills: 'Tagihan', entertainment: 'Hiburan',
                salary: 'Gaji', bonus: 'Bonus', investment: 'Investasi', gift: 'Hadiah', other: 'Lainnya', add_new: '+ Tambah Baru',
                totalSaving: 'Total Tabungan', savingIn: 'Setor', savingOut: 'Tarik', savingHistory: 'Riwayat Tabungan', noData: 'Belum ada data.',
                addSavingBtn: 'Catat Tabungan', addSavingDesc: 'Nabung atau tarik dana', actionSheetTitle: 'Pilih Transaksi', addSavingTitle: 'Catat Tabungan',
                savingNabung: 'Nabung', savingTarik: 'Tarik', editSavingTitle: 'Edit Tabungan', updateSuccess: 'Data tabungan berhasil diperbarui.', addSuccess: 'Data tabungan berhasil disimpan.',
                deleteConfirm: 'Apakah Anda yakin ingin menghapus data ini?', deleteSuccess: 'Data dihapus.', success: 'Berhasil', error: 'Gagal',
                loginDesc: 'Kelola keuangan Anda dengan mudah, aman, dan pribadi.', loginBtn: 'Masuk dengan Google'
            },
            en: {
                home: 'Home', add: 'Add', report: 'Report', settings: 'Settings', saving: 'Savings',
                greeting: 'Hello,', totalBalance: 'Total Balance', income: 'Income', expense: 'Expense',
                historyTitle: 'Transaction History', seeAll: 'See All',
                reportTitle: 'Financial Report', expensePerCat: 'Expense by Category', expenseDetail: 'Expense Breakdown',
                exportData: 'Export Data', importCsv: 'Import CSV', darkMode: 'Dark Mode', language: 'Language', resetData: 'Clear All Data',
                filter7Days: 'Last 7 Days', filter30Days: 'Last 30 Days', filterMonth: 'This Month', filterAllTime: 'All Time',
                filterAllType: 'All Types', typeInc: 'Income', typeExp: 'Expense',
                addTx: 'Add Transaction', editTx: 'Edit Data', amount: 'AMOUNT', category: 'CATEGORY', date: 'DATE', note: 'NOTE',
                saveBtn: 'Save Data', updateBtn: 'Update',
                emptyTx: 'No transactions yet.', noNote: 'No note', outLabel: 'OUT', inLabel: 'IN',
                food: 'Food', transport: 'Transport', shopping: 'Shopping', bills: 'Bills', entertainment: 'Entertainment',
                salary: 'Salary', bonus: 'Bonus', investment: 'Investment', gift: 'Gift', other: 'Other', add_new: '+ Add New',
                totalSaving: 'Total Savings', savingIn: 'Deposit', savingOut: 'Withdraw', savingHistory: 'Savings History', noData: 'No data available.',
                addSavingBtn: 'Record Saving', addSavingDesc: 'Deposit or withdraw funds', actionSheetTitle: 'Choose Transaction', addSavingTitle: 'Record Saving',
                savingNabung: 'Deposit', savingTarik: 'Withdraw', editSavingTitle: 'Edit Saving', updateSuccess: 'Savings data updated successfully.', addSuccess: 'Savings data saved successfully.',
                deleteConfirm: 'Are you sure you want to delete this data?', deleteSuccess: 'Data deleted.', success: 'Success', error: 'Error',
                loginDesc: 'Manage your finances easily, securely, and privately.', loginBtn: 'Sign in with Google'
            }
        };

        const defaultCategories = {
            expense: ['food', 'transport', 'shopping', 'bills', 'entertainment', 'other', 'add_new'],
            income: ['salary', 'bonus', 'investment', 'gift', 'other', 'add_new']
        };

        function tText(keyOrText) { return i18n[currentLang][keyOrText] || keyOrText; }

        let currentLang = localStorage.getItem('catatuang_lang') || 'id';
        let isDark = false;
        let editingId = null; 
        let chartInstance = null;
        let currentTab = 'home';
        
        let activeTimeFilter = '30days';
        let activeSavingTimeFilter = '30days';
        let activeTypeFilter = 'all';
        let activeSavingTypeFilter = 'all';

        let transactions = [];
        let savingsData = [];

        async function loadFromFirestore() {
            try {
                const snapshot = await getUserTransactionsRef().get();
                transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Sort by date descending
                transactions.sort((a, b) => {
                    const dateDiff = new Date(b.date) - new Date(a.date);
                    if (dateDiff !== 0) return dateDiff;
                    return (b.timestamp || 0) - (a.timestamp || 0);
                });
                updateDashboard();
                if(!document.getElementById('fullHistoryScreen').classList.contains('translate-x-full')) renderFullHistory();
                if (currentTab === 'report') renderReport();
            } catch(e) {
                console.error("Error loading documents: ", e);
            }
        }
        
        const formatRp = (num) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(num);
        const formatDateText = (dateObj, format='short') => {
            const locale = currentLang === 'id' ? 'id-ID' : 'en-US';
            return dateObj.toLocaleDateString(locale, { month: format });
        };

        // FUNGSI TITIK OTOMATIS SAAT KETIK (THOUSAND SEPARATOR)
        function formatInputRupiah(input) {
            let value = input.value.replace(/\D/g, ''); // Hapus semua huruf/simbol, sisa angka
            if (value) {
                input.value = new Intl.NumberFormat('id-ID').format(value); // Berikan format titik
            } else {
                input.value = '';
            }
        }

        // --- SISTEM UNIVERSAL CENTERED MODAL ---
        let optionCallback = null;

        function openOptionsModal(optionsData, callback) {
            const overlay = document.getElementById('centralOptionsOverlay');
            const content = document.getElementById('centralOptionsContent');
            const list = document.getElementById('centralOptionsList');
            
            list.innerHTML = '';
            
            optionsData.forEach(opt => {
                const isActive = opt.selected ? 'radio-active' : '';
                const html = `
                    <div onclick="selectOption(this, '${opt.value}')" class="px-5 py-4 border-b border-gray-200/40 dark:border-white/10 flex justify-between items-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition radio-item ${isActive}">
                        <span class="font-extrabold text-[15px] text-gray-800 dark:text-white">${opt.label}</span>
                        <div class="radio-circle"></div>
                    </div>
                `;
                list.insertAdjacentHTML('beforeend', html);
            });

            optionCallback = callback;
            
            overlay.classList.remove('hidden');
            setTimeout(() => {
                overlay.classList.remove('opacity-0');
                content.classList.remove('scale-95');
            }, 10);
        }

        function selectOption(element, val) {
            // Remove active state from any other option
            document.querySelectorAll('#centralOptionsList .radio-item').forEach(el => el.classList.remove('radio-active'));
            // Add active state to the clicked one
            element.classList.add('radio-active');
            
            // Wait 250ms for the visual feedback before proceeding
            setTimeout(() => {
                if(optionCallback) optionCallback(val);
                closeOptionsModal();
            }, 250);
        }

        function closeOptionsModal(e) {
            if(e && e.target.id !== 'centralOptionsOverlay') return; 
            const overlay = document.getElementById('centralOptionsOverlay');
            const content = document.getElementById('centralOptionsContent');
            overlay.classList.add('opacity-0');
            content.classList.add('scale-95');
            setTimeout(() => { overlay.classList.add('hidden'); }, 300);
        }

        // --- PENGGUNAAN MODAL UNTUK BERBAGAI MENU ---
        function showLangOptions() {
            const opts = [
                { value: 'id', label: 'Indonesia', selected: currentLang === 'id' },
                { value: 'en', label: 'English', selected: currentLang === 'en' }
            ];
            openOptionsModal(opts, (val) => {
                currentLang = val;
                localStorage.setItem('catatuang_lang', currentLang);
                applyTranslations();
            });
        }

        function showTimeOptions() {
            const opts = [
                { value: '7days', label: tText('filter7Days'), selected: activeTimeFilter === '7days' },
                { value: '30days', label: tText('filter30Days'), selected: activeTimeFilter === '30days' },
                { value: 'month', label: tText('filterMonth'), selected: activeTimeFilter === 'month' },
                { value: 'all', label: tText('filterAllTime'), selected: activeTimeFilter === 'all' }
            ];
            openOptionsModal(opts, (val) => {
                activeTimeFilter = val;
                const map = { '7days':'filter7Days', '30days':'filter30Days', 'month':'filterMonth', 'all':'filterAllTime'};
                document.getElementById('filterTimeDisplay').innerText = tText(map[val]);
                renderFullHistory();
            });
        }

        
        function showSavingTimeOptions() {
            const opts = [
                { value: '7days', label: tText('filter7Days'), selected: activeSavingTimeFilter === '7days' },
                { value: '30days', label: tText('filter30Days'), selected: activeSavingTimeFilter === '30days' },
                { value: 'month', label: tText('filterMonth'), selected: activeSavingTimeFilter === 'month' },
                { value: 'all', label: tText('filterAllTime'), selected: activeSavingTimeFilter === 'all' }
            ];
            openOptionsModal(opts, (val) => {
                activeSavingTimeFilter = val;
                const map = { '7days':'filter7Days', '30days':'filter30Days', 'month':'filterMonth', 'all':'filterAllTime'};
                document.getElementById('filterSavingTimeDisplay').innerText = tText(map[val]);
                renderFullSavingHistory();
            });
        }

        function showSavingTypeOptions() {
            const opts = [
                { value: 'all', label: tText('filterAllType'), selected: activeSavingTypeFilter === 'all' },
                { value: 'in', label: tText('savingIn'), selected: activeSavingTypeFilter === 'in' },
                { value: 'out', label: tText('savingOut'), selected: activeSavingTypeFilter === 'out' }
            ];
            openOptionsModal(opts, (val) => {
                activeSavingTypeFilter = val;
                const map = { 'all':'filterAllType', 'in':'savingIn', 'out':'savingOut'};
                document.getElementById('filterSavingTypeDisplay').innerText = tText(map[val]);
                renderFullSavingHistory();
            });
        }

        function showTypeOptions() {
            const opts = [
                { value: 'all', label: tText('filterAllType'), selected: activeTypeFilter === 'all' },
                { value: 'income', label: tText('typeInc'), selected: activeTypeFilter === 'income' },
                { value: 'expense', label: tText('typeExp'), selected: activeTypeFilter === 'expense' }
            ];
            openOptionsModal(opts, (val) => {
                activeTypeFilter = val;
                const map = { 'all':'filterAllType', 'income':'typeInc', 'expense':'typeExp'};
                document.getElementById('filterTypeDisplay').innerText = tText(map[val]);
                renderFullHistory();
            });
        }

        function showCategoryOptions() {
            const type = document.querySelector('input[name="type"]:checked').value;
            const currentCat = document.getElementById('categorySelect').value;
            
            const opts = defaultCategories[type].map(cat => ({
                value: cat, label: tText(cat), selected: currentCat === cat
            }));

            openOptionsModal(opts, (val) => {
                document.getElementById('categorySelect').value = val;
                document.getElementById('categoryDisplay').innerText = tText(val);
                if(val === 'add_new') {
                    document.getElementById('customCategory').classList.remove('hidden');
                    document.getElementById('customCategory').focus();
                } else { document.getElementById('customCategory').classList.add('hidden'); }
            });
        }

        function updateCategoryState() {
            const type = document.querySelector('input[name="type"]:checked').value;
            const firstCat = defaultCategories[type][0];
            document.getElementById('categorySelect').value = firstCat;
            document.getElementById('categoryDisplay').innerText = tText(firstCat);
            document.getElementById('customCategory').classList.add('hidden');
            document.getElementById('customCategory').value = '';
        }

        function applyTranslations() {
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (i18n[currentLang][key]) {
                    if (el.tagName === 'INPUT' && el.type === 'text') el.placeholder = i18n[currentLang][key];
                    else el.innerText = i18n[currentLang][key];
                }
            });
            
            document.getElementById('langDisplay').innerText = currentLang === 'id' ? 'Indonesia' : 'English';
            
            const timeMap = { '7days':'filter7Days', '30days':'filter30Days', 'month':'filterMonth', 'all':'filterAllTime'};
            document.getElementById('filterTimeDisplay').innerText = tText(timeMap[activeTimeFilter]);
            
            const typeMap = { 'all':'filterAllType', 'income':'typeInc', 'expense':'typeExp'};
            document.getElementById('filterTypeDisplay').innerText = tText(typeMap[activeTypeFilter]);

            const currentCat = document.getElementById('categorySelect').value;
            document.getElementById('categoryDisplay').innerText = tText(currentCat);

            updateDashboard();
            if(!document.getElementById('fullHistoryScreen').classList.contains('translate-x-full')) renderFullHistory();
            if (currentTab === 'report') renderReport();
        }

        function initApp() {
            syncDarkModeToggle();
        }

        function syncDarkModeToggle() {
            const toggleBtn = document.getElementById('darkModeToggle');
            isDark = document.documentElement.classList.contains('dark');
            if (toggleBtn) toggleBtn.checked = isDark;
        }

        function toggleDarkMode() {
            isDark = !isDark;
            const toggleBtn = document.getElementById('darkModeToggle');
            if (isDark) { document.documentElement.classList.add('dark'); localStorage.setItem('catatuang_theme', 'dark'); } 
            else { document.documentElement.classList.remove('dark'); localStorage.setItem('catatuang_theme', 'light'); }
            if (currentTab === 'report' && chartInstance) renderReport(); 
        }

        function switchTab(tabId) {
            currentTab = tabId;
            document.querySelectorAll('.tab-content').forEach(el => {
                el.classList.add('hidden');
                el.classList.remove('tab-enter', 'flex');
            });
            document.querySelectorAll('.nav-item').forEach(el => {
                el.classList.remove('nav-item-active');
                const svg = el.querySelector('svg'); const span = el.querySelector('span');
                if(svg && span) {
                    svg.classList.remove('text-gray-900', 'dark:text-white', 'text-indigo-600', 'dark:text-emerald-400');
                    svg.classList.add('text-gray-400', 'dark:text-gray-500');
                    span.classList.remove('text-gray-900', 'dark:text-white', 'font-black'); 
                    span.classList.add('text-gray-500', 'dark:text-gray-400', 'font-bold');
                }
            });
            
            const targetTab = document.getElementById('tab-' + tabId);
            if (targetTab) {
                targetTab.classList.remove('hidden');
                targetTab.classList.add('flex', 'tab-enter');
            }
            
            const activeBtn = document.getElementById(`nav-${tabId}`);
            if (activeBtn) {
                activeBtn.classList.add('nav-item-active');
                const activeSvg = activeBtn.querySelector('svg'); const activeSpan = activeBtn.querySelector('span');
                if (activeSvg && activeSpan) {
                    activeSvg.classList.remove('text-gray-400', 'dark:text-gray-500'); 
                    activeSvg.classList.add('text-indigo-600', 'dark:text-emerald-400');
                    activeSpan.classList.remove('text-gray-500', 'dark:text-gray-400', 'font-bold'); 
                    activeSpan.classList.add('text-gray-900', 'dark:text-white', 'font-black');
                }
            }
            
            if (tabId === 'report') {
                renderReport();
            }
            if (tabId === 'profile') {
                syncDarkModeToggle();
            }
        }


        function openActionSheet() {
            const el = document.getElementById('actionSheetModal');
            el.classList.remove('hidden');
            el.classList.add('flex');
            setTimeout(() => {
                el.children[0].classList.remove('opacity-0');
                el.children[1].classList.remove('translate-y-full');
            }, 10);
        }

        function closeActionSheet() {
            const el = document.getElementById('actionSheetModal');
            el.children[0].classList.add('opacity-0');
            el.children[1].classList.add('translate-y-full');
            setTimeout(() => {
                el.classList.remove('flex');
                el.classList.add('hidden');
            }, 300);
        }

        function openSavingModal(savingId = null) {
            document.getElementById('savingForm').reset();
            document.getElementById('savingDate').value = new Date().toISOString().split('T')[0];
            
            if (savingId) {
                document.getElementById('savingModalTitle').innerText = tText('editSavingTitle') || 'Edit Tabungan';
                document.getElementById('savingForm').dataset.editing = savingId;
                document.getElementById('deleteSavingBtn').classList.remove('hidden');
                
                savingsRef.doc(savingId).get().then(doc => {
                    if (doc.exists) {
                        const data = doc.data();
                        document.querySelector(`input[name="savingType"][value="${data.type}"]`).checked = true;
                        document.getElementById('savingAmount').value = data.amount.toLocaleString('id-ID');
                        document.getElementById('savingDate').value = data.date;
                        document.getElementById('savingNote').value = data.note || '';
                    }
                });
            } else {
                document.getElementById('savingModalTitle').innerText = tText('addSavingTitle') || 'Catat Tabungan';
                delete document.getElementById('savingForm').dataset.editing;
                document.getElementById('deleteSavingBtn').classList.add('hidden');
            }

            const el = document.getElementById('addSavingModal');
            el.classList.remove('hidden');
            el.classList.add('flex');
            setTimeout(() => {
                el.children[0].classList.remove('opacity-0');
                el.children[1].classList.remove('translate-y-full');
            }, 10);
        }

        function closeSavingModal() {
            const el = document.getElementById('addSavingModal');
            el.children[0].classList.add('opacity-0');
            el.children[1].classList.add('translate-y-full');
            setTimeout(() => {
                el.classList.remove('flex');
                el.classList.add('hidden');
            }, 300);
        }

        function renderSavings() {
            if (!savingsRef) return;
            
            savingsRef.orderBy('timestamp', 'desc').onSnapshot(snapshot => {
                let totalSaving = 0;
                let totalIn = 0;
                let totalOut = 0;
                
                savingsData = [];

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const amount = parseFloat(data.amount);
                    if (data.type === 'in') { totalSaving += amount; totalIn += amount; } 
                    else { totalSaving -= amount; totalOut += amount; }
                    savingsData.push({ id: doc.id, ...data });
                });

                document.getElementById('totalSavingBal').innerText = 'Rp ' + totalSaving.toLocaleString('id-ID');
                document.getElementById('savingIncome').innerText = 'Rp ' + totalIn.toLocaleString('id-ID');
                document.getElementById('savingExpense').innerText = 'Rp ' + totalOut.toLocaleString('id-ID');

                renderRecentSavings();
                if(!document.getElementById('fullSavingHistoryScreen').classList.contains('translate-x-full')) {
                    renderFullSavingHistory();
                }
            });
        }

        function renderRecentSavings() {
            const list = document.getElementById('savingList');
            list.innerHTML = '';
            
            if (savingsData.length === 0) {
                list.innerHTML = `<div class="flex items-center justify-center h-20"><p class="text-sm font-bold text-gray-400 dark:text-gray-500">${tText('noData')||'Belum ada data.'}</p></div>`;
                return;
            }

            const sorted = [...savingsData].slice(0, 5);

            sorted.forEach(s => {
                let isIncome = s.type === 'in';
                let colorClass = isIncome ? 'text-emerald-500' : 'text-red-500';
                let sign = isIncome ? '+' : '-';
                const dateObj = new Date(s.date);
                const dateStr = `${String(dateObj.getDate()).padStart(2, '0')} ${formatDateText(dateObj, 'short')} ${dateObj.getFullYear()}`;
                const titleText = isIncome ? tText('savingNabung') : tText('savingTarik');
                const noteText = s.note ? s.note : `<span class="text-gray-400 dark:text-gray-600 italic font-normal">${i18n[currentLang].noNote}</span>`;

                let html = `
                    <div onclick="toggleDetails('details-saving-home-${s.id}')" class="bg-white/40 dark:bg-white/5 p-3 rounded-[1.25rem] flex flex-col transition-all duration-300 cursor-pointer hover:bg-white/70 dark:hover:bg-white/10 active:scale-[0.98]">
                        <div class="flex justify-between items-center px-1">
                            <div>
                                <h4 class="font-extrabold text-[14px] text-gray-900 dark:text-white drop-shadow-sm tracking-tight leading-tight">${titleText}</h4>
                                <p class="text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-wider">${dateStr}</p>
                            </div>
                            <p class="${colorClass} font-black text-[13.5px] drop-shadow-sm tracking-tight">${sign}Rp ${s.amount.toLocaleString('id-ID')}</p>
                        </div>
                        <div id="details-saving-home-${s.id}" class="tx-details hidden justify-between items-center border-t border-gray-300/40 dark:border-white/10 pt-2.5 mt-2.5 px-1 animate-expand">
                            <p class="text-[10px] text-gray-500 dark:text-gray-300 truncate max-w-[65%] font-medium">${noteText}</p>
                            <div class="flex gap-2">
                                <button onclick="event.stopPropagation(); openSavingModal('${s.id}')" class="text-blue-600 bg-blue-50/70 dark:text-blue-400 dark:bg-black/30 backdrop-blur-md p-1 rounded-[8px] hover:bg-blue-100 dark:hover:bg-black/50 transition shadow-sm border border-white/50 dark:border-white/10">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </button>
                                <button onclick="event.stopPropagation(); deleteSaving('${s.id}')" class="text-red-600 bg-red-50/70 dark:text-red-400 dark:bg-black/30 backdrop-blur-md p-1 rounded-[8px] hover:bg-red-100 dark:hover:bg-black/50 transition shadow-sm border border-white/50 dark:border-white/10">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                list.insertAdjacentHTML('beforeend', html);
            });
        }

        function openSavingHistoryScreen() {
            const el = document.getElementById('fullSavingHistoryScreen');
            el.classList.remove('translate-x-full');
            renderFullSavingHistory();
        }

        function closeSavingHistoryScreen() {
            document.getElementById('fullSavingHistoryScreen').classList.add('translate-x-full');
        }

        function renderFullSavingHistory() {
            const list = document.getElementById('fullSavingHistoryList');
            list.innerHTML = '';
            const now = new Date();
            
            let filtered = savingsData.filter(s => {
                if(activeSavingTypeFilter !== 'all' && s.type !== activeSavingTypeFilter) return false;
                const sDate = new Date(s.date);
                if(activeSavingTimeFilter === '7days') {
                    const diff = (now - sDate) / (1000 * 60 * 60 * 24);
                    if(diff > 7) return false;
                } else if(activeSavingTimeFilter === '30days') {
                    const diff = (now - sDate) / (1000 * 60 * 60 * 24);
                    if(diff > 30) return false;
                } else if (activeSavingTimeFilter === 'month') {
                    if(sDate.getMonth() !== now.getMonth() || sDate.getFullYear() !== now.getFullYear()) return false;
                }
                return true;
            });

            if (filtered.length === 0) {
                list.innerHTML = `<div class="text-center text-gray-400 dark:text-gray-500 py-10 font-bold">${tText('noData')}</div>`;
                return;
            }

            // MENGURUTKAN BERDASARKAN TANGGAL DAN TIMESTAMP
            const sorted = filtered.sort((a,b) => {
                const dateDiff = new Date(b.date) - new Date(a.date);
                if (dateDiff !== 0) return dateDiff;
                return (b.timestamp || 0) - (a.timestamp || 0);
            });

            // Group by month
            const grouped = {};
            savingsData.forEach(s => {
                const dateObj = new Date(s.date);
                const monthYear = formatDateText(dateObj, 'long') + ' ' + dateObj.getFullYear();
                if(!grouped[monthYear]) grouped[monthYear] = [];
                grouped[monthYear].push(s);
            });

            for (const [monthYear, items] of Object.entries(grouped)) {
                let html = `
                <div class="mb-6">
                    <div class="sticky top-0 bg-[#f4f6fb]/95 dark:bg-[#1a1a24]/95 backdrop-blur-xl z-20 py-2 -mx-4 px-4 shadow-[0_4px_10px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_10px_-4px_rgba(0,0,0,0.2)]">
                        <h4 class="font-black text-gray-800 dark:text-white text-[15px] tracking-wide">${monthYear}</h4>
                    </div>
                    <div class="glass-card rounded-[1.5rem] mt-3 p-2 flex flex-col space-y-1">`;
                
                items.forEach((s, idx) => {
                    let isIncome = s.type === 'in';
                    let colorClass = isIncome ? 'text-emerald-500' : 'text-red-500';
                    let sign = isIncome ? '+' : '-';
                    const dateObj = new Date(s.date);
                    const dateStr = `${String(dateObj.getDate()).padStart(2, '0')} ${formatDateText(dateObj, 'short')} ${dateObj.getFullYear()}`;
                    const titleText = isIncome ? tText('savingNabung') : tText('savingTarik');
                    const noteText = s.note ? s.note : `<span class="text-gray-400 dark:text-gray-600 italic font-normal">${i18n[currentLang].noNote}</span>`;

                    html += `
                        <div onclick="toggleDetails('details-saving-full-${s.id}')" class="bg-white/30 dark:bg-white/5 p-3 rounded-xl flex flex-col transition-all cursor-pointer hover:bg-white/60 dark:hover:bg-white/10 ${idx !== items.length-1 ? 'border-b border-gray-200/50 dark:border-white/5' : ''}">
                            <div class="flex justify-between items-center px-1">
                                <div>
                                    <h4 class="font-extrabold text-[14px] text-gray-900 dark:text-white drop-shadow-sm tracking-tight leading-tight">${titleText}</h4>
                                    <p class="text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-wider">${dateStr}</p>
                                </div>
                                <p class="${colorClass} font-black text-[13.5px] drop-shadow-sm tracking-tight">${sign}Rp ${s.amount.toLocaleString('id-ID')}</p>
                            </div>
                            <div id="details-saving-full-${s.id}" class="tx-details hidden justify-between items-center border-t border-gray-300/40 dark:border-white/10 pt-2.5 mt-2.5 px-1 animate-expand">
                                <p class="text-[10px] text-gray-500 dark:text-gray-300 truncate max-w-[65%] font-medium">${noteText}</p>
                                <div class="flex gap-2">
                                    <button onclick="event.stopPropagation(); openSavingModal('${s.id}')" class="text-blue-600 bg-blue-50/70 dark:text-blue-400 dark:bg-black/30 backdrop-blur-md p-1 rounded-[8px] hover:bg-blue-100 transition shadow-sm border border-white/50 dark:border-white/10">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                    </button>
                                    <button onclick="event.stopPropagation(); deleteSaving('${s.id}')" class="text-red-600 bg-red-50/70 dark:text-red-400 dark:bg-black/30 backdrop-blur-md p-1 rounded-[8px] hover:bg-red-100 transition shadow-sm border border-white/50 dark:border-white/10">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });
                html += `</div></div>`;
                list.insertAdjacentHTML('beforeend', html);
            }
        }

        async function deleteSaving(id) {
            const result = await showGlassConfirm(
                currentLang === 'id' ? 'Hapus Data' : 'Delete Data',
                tText('deleteConfirm') || 'Are you sure you want to delete this saving data?',
                { confirmText: currentLang === 'id' ? 'Hapus' : 'Delete', cancelText: currentLang === 'id' ? 'Batal' : 'Cancel' }
            );
            if (result === 1 && savingsRef) {
                savingsRef.doc(String(id)).delete().then(() => {
                    showGlassNotif(tText('success')||'Berhasil', tText('deleteSuccess')||'Data dihapus.');
                }).catch(err => {
                    console.error("Error deleting tabungan:", err);
                    showGlassNotif(tText('error')||'Gagal', err.message, { type: 'error' });
                });
            }
        }


        document.getElementById('savingForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const amountStr = document.getElementById('savingAmount').value.replace(/\./g, '');
            const amount = parseFloat(amountStr);
            if (!amount) return;

            const type = document.querySelector('input[name="savingType"]:checked').value;
            const date = document.getElementById('savingDate').value;
            const note = document.getElementById('savingNote').value;
            
            const btn = document.getElementById('submitSavingBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<svg class="animate-spin h-5 w-5 mx-auto text-white" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
            btn.disabled = true;

            const savingData = {
                amount: amount,
                type: type,
                date: date,
                note: note,
                timestamp: new Date(date).getTime()
            };

            const editingId = this.dataset.editing;
            let p;

            if (editingId) {
                p = savingsRef.doc(editingId).update(savingData);
            } else {
                p = savingsRef.add(savingData);
            }

            p.then(() => {
                closeSavingModal();
                btn.innerHTML = originalText;
                btn.disabled = false;
                showGlassNotif(tText('success')||'Berhasil', editingId ? (tText('updateSuccess')||'Data diperbarui.') : (tText('addSuccess')||'Data disimpan.'));
            }).catch(err => {
                console.error("Error saving tabungan:", err);
                btn.innerHTML = originalText;
                btn.disabled = false;
                showGlassNotif(tText('error')||'Gagal', err.message, { type: 'error' });
            });
        });

        function deleteCurrentSaving() {
            const id = document.getElementById('savingForm').dataset.editing;
            if (!id) return;
            
            if (confirm(tText('deleteConfirm') || "Apakah Anda yakin ingin menghapus data ini?")) {
                savingsRef.doc(id).delete().then(() => {
                    closeSavingModal();
                    showGlassNotif(tText('success')||'Berhasil', tText('deleteSuccess')||'Data dihapus.');
                }).catch(err => {
                    console.error("Error deleting tabungan:", err);
                    showGlassNotif(tText('error')||'Gagal', err.message, { type: 'error' });
                });
            }
        }

        function updateDashboard() {
            let totalIn = 0, totalOut = 0;
            transactions.forEach(t => {
                if (t.type === 'income') totalIn += t.amount;
                if (t.type === 'expense') totalOut += t.amount;
            });
            document.getElementById('totalBalance').innerText = 'Rp ' + formatRp(totalIn - totalOut);
            document.getElementById('totalIncome').innerText = 'Rp ' + formatRp(totalIn);
            document.getElementById('totalExpense').innerText = 'Rp ' + formatRp(totalOut);
            renderRecentTransactions();
        }

        function toggleDetails(id) {
            const detailsDiv = document.getElementById(id);
            if (!detailsDiv) return;
            const isCurrentlyHidden = detailsDiv.classList.contains('hidden');
            document.querySelectorAll('.tx-details').forEach(el => { el.classList.add('hidden'); el.classList.remove('flex'); });
            if (isCurrentlyHidden) { detailsDiv.classList.remove('hidden'); detailsDiv.classList.add('flex'); }
        }

        function renderRecentTransactions() {
            const list = document.getElementById('recentTransactionList');
            list.innerHTML = '';
            if (transactions.length === 0) {
                list.innerHTML = `<div class="text-center text-gray-400 dark:text-gray-500 py-4 text-xs font-bold">${i18n[currentLang].emptyTx}</div>`; return;
            }

            // MENGURUTKAN BERDASARKAN TANGGAL DAN TIMESTAMP
            const sorted = [...transactions].sort((a,b) => {
                const dateDiff = new Date(b.date) - new Date(a.date);
                if (dateDiff !== 0) return dateDiff;
                return (b.timestamp || 0) - (a.timestamp || 0); // tiebreaker: yang lebih baru di atas
            }).slice(0, 5);

            sorted.forEach(t => {
                let isIncome = t.type === 'income';
                let colorClass = isIncome ? 'text-green-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
                let sign = isIncome ? '+' : '-';
                const dateObj = new Date(t.date);
                const dateStr = `${String(dateObj.getDate()).padStart(2, '0')} ${formatDateText(dateObj, 'short')} ${dateObj.getFullYear()}`;
                const noteText = t.note ? t.note : `<span class="text-gray-400 dark:text-gray-600 italic font-normal">${i18n[currentLang].noNote}</span>`;
                const displayCategory = tText(t.category);

                let html = `
                    <div onclick="toggleDetails('details-home-${t.id}')" class="bg-white/40 dark:bg-white/5 p-3 rounded-[1.25rem] flex flex-col transition-all duration-300 cursor-pointer hover:bg-white/70 dark:hover:bg-white/10 active:scale-[0.98]">
                        <div class="flex justify-between items-center px-1">
                            <div>
                                <h4 class="font-extrabold text-[14px] text-gray-900 dark:text-white drop-shadow-sm tracking-tight leading-tight">${displayCategory}</h4>
                                <p class="text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-wider">${dateStr}</p>
                            </div>
                            <p class="${colorClass} font-black text-[13.5px] drop-shadow-sm tracking-tight">${sign}Rp ${formatRp(t.amount)}</p>
                        </div>
                        <div id="details-home-${t.id}" class="tx-details hidden justify-between items-center border-t border-gray-300/40 dark:border-white/10 pt-2.5 mt-2.5 px-1 animate-expand">
                            <p class="text-[10px] text-gray-500 dark:text-gray-300 truncate max-w-[65%] font-medium">${noteText}</p>
                            <div class="flex gap-2">
                                <button onclick="event.stopPropagation(); editTransaction('${t.id}')" class="text-blue-600 bg-blue-50/70 dark:text-blue-400 dark:bg-black/30 backdrop-blur-md p-1 rounded-[8px] hover:bg-blue-100 dark:hover:bg-black/50 transition shadow-sm border border-white/50 dark:border-white/10">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </button>
                                <button onclick="event.stopPropagation(); deleteTransaction('${t.id}')" class="text-red-600 bg-red-50/70 dark:text-red-400 dark:bg-black/30 backdrop-blur-md p-1 rounded-[8px] hover:bg-red-100 dark:hover:bg-black/50 transition shadow-sm border border-white/50 dark:border-white/10">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                list.insertAdjacentHTML('beforeend', html);
            });
        }

        function openHistoryScreen() {
            document.getElementById('fullHistoryScreen').classList.remove('translate-x-full'); renderFullHistory();
        }
        function closeHistoryScreen() {
            document.getElementById('fullHistoryScreen').classList.add('translate-x-full');
            setTimeout(() => { document.querySelectorAll('.tx-details').forEach(el => { el.classList.add('hidden'); el.classList.remove('flex'); }); }, 300);
        }

        function renderFullHistory() {
            const container = document.getElementById('fullHistoryList');
            container.innerHTML = '';
            const now = new Date();
            
            let filtered = transactions.filter(t => {
                if(activeTypeFilter !== 'all' && t.type !== activeTypeFilter) return false;
                const tDate = new Date(t.date);
                if(activeTimeFilter === '7days') {
                    const diff = (now - tDate) / (1000 * 60 * 60 * 24);
                    if(diff > 7) return false;
                } else if(activeTimeFilter === '30days') {
                    const diff = (now - tDate) / (1000 * 60 * 60 * 24);
                    if(diff > 30) return false;
                } else if (activeTimeFilter === 'month') {
                    if(tDate.getMonth() !== now.getMonth() || tDate.getFullYear() !== now.getFullYear()) return false;
                }
                return true;
            });

            if (filtered.length === 0) {
                container.innerHTML = `<div class="text-center text-gray-400 py-10 text-sm font-bold">${i18n[currentLang].emptyTx}</div>`; return;
            }

            // MENGURUTKAN BERDASARKAN TANGGAL DAN TIMESTAMP
            const sorted = filtered.sort((a,b) => {
                const dateDiff = new Date(b.date) - new Date(a.date);
                if (dateDiff !== 0) return dateDiff;
                return (b.timestamp || 0) - (a.timestamp || 0);
            });
            const groups = {};

            sorted.forEach(t => {
                const dateObj = new Date(t.date);
                const monthYear = `${formatDateText(dateObj, 'short')} ${dateObj.getFullYear()}`;
                if (!groups[monthYear]) { groups[monthYear] = { items: [], incoming: 0, outgoing: 0 }; }
                groups[monthYear].items.push(t);
                if (t.type === 'income') groups[monthYear].incoming += t.amount; else groups[monthYear].outgoing += t.amount;
            });

            for (const [monthYear, data] of Object.entries(groups)) {
                const groupDiv = document.createElement('div');
                const headerHtml = `
                    <div class="flex justify-between items-end mb-3 px-1.5 mt-2">
                        <h3 class="font-extrabold text-[16px] text-gray-900 dark:text-white tracking-wide drop-shadow-sm">${monthYear}</h3>
                        <div class="text-[9px] text-right font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-tight">
                            <div>${i18n[currentLang].outLabel}: <span class="text-red-500 dark:text-red-400">Rp ${formatRp(data.outgoing)}</span></div>
                            <div>${i18n[currentLang].inLabel}: <span class="text-green-500 dark:text-emerald-400">Rp ${formatRp(data.incoming)}</span></div>
                        </div>
                    </div>
                `;
                groupDiv.insertAdjacentHTML('beforeend', headerHtml);

                const listDiv = document.createElement('div');
                listDiv.className = 'space-y-3';

                data.items.forEach(t => {
                    const isIncome = t.type === 'income';
                    const amountColor = isIncome ? 'text-green-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
                    const sign = isIncome ? '+' : '-';
                    const dateObj = new Date(t.date);
                    const dateStr = `${String(dateObj.getDate()).padStart(2, '0')} ${formatDateText(dateObj, 'short')} ${dateObj.getFullYear()}`;
                    const noteText = t.note ? t.note : `<span class="text-gray-400 dark:text-gray-600 italic font-normal">${i18n[currentLang].noNote}</span>`;
                    const displayCategory = tText(t.category);

                    const itemHtml = `
                        <div onclick="toggleDetails('details-hist-${t.id}')" class="glass-card p-4 rounded-[1.25rem] shadow-sm flex flex-col transition-all duration-300 cursor-pointer hover:bg-white/80 dark:hover:bg-white/10 active:scale-[0.98]">
                            <div class="flex justify-between items-start px-0.5">
                                <div>
                                    <h4 class="font-extrabold text-[14.5px] text-gray-900 dark:text-white drop-shadow-sm tracking-tight">${displayCategory}</h4>
                                    <p class="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-0.5 tracking-wider">${dateStr}</p>
                                </div>
                                <p class="${amountColor} font-black text-[14px] whitespace-nowrap drop-shadow-sm mt-0.5 tracking-tight">
                                    ${sign}Rp ${formatRp(t.amount)}
                                </p>
                            </div>
                            <div id="details-hist-${t.id}" class="tx-details hidden justify-between items-center border-t border-gray-300/40 dark:border-white/10 pt-3 mt-3 px-0.5 animate-expand">
                                <p class="text-[11px] text-gray-500 dark:text-gray-300 truncate max-w-[65%] font-medium">${noteText}</p>
                                <div class="flex gap-2">
                                    <button onclick="event.stopPropagation(); editTransaction('${t.id}')" class="text-blue-600 bg-blue-50/70 dark:text-blue-400 dark:bg-black/30 backdrop-blur-md p-1.5 rounded-[10px] hover:bg-blue-100 dark:hover:bg-black/50 transition shadow-sm border border-white/50 dark:border-white/10">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                    </button>
                                    <button onclick="event.stopPropagation(); deleteTransaction('${t.id}')" class="text-red-600 bg-red-50/70 dark:text-red-400 dark:bg-black/30 backdrop-blur-md p-1.5 rounded-[10px] hover:bg-red-100 dark:hover:bg-black/50 transition shadow-sm border border-white/50 dark:border-white/10">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                    listDiv.insertAdjacentHTML('beforeend', itemHtml);
                });
                groupDiv.appendChild(listDiv);
                container.appendChild(groupDiv);
            }
        }

        function renderReport() {
            const ctx = document.getElementById('reportChart').getContext('2d');
            const breakdownList = document.getElementById('categoryBreakdownList');
            breakdownList.innerHTML = '';

            const expenseData = {};
            let totalExpenseSum = 0;
            transactions.filter(t => t.type === 'expense').forEach(t => {
                expenseData[t.category] = (expenseData[t.category] || 0) + t.amount;
                totalExpenseSum += t.amount;
            });

            const categoriesArr = Object.keys(expenseData);
            const amountsArr = Object.values(expenseData);
            if (chartInstance) chartInstance.destroy();

            if (categoriesArr.length === 0) {
                breakdownList.innerHTML = `<div class="text-center text-gray-400 py-6 text-sm font-bold">${i18n[currentLang].emptyTx}</div>`;
                chartInstance = new Chart(ctx, {
                    type: 'doughnut', data: { labels: ['Empty'], datasets: [{ data: [1], backgroundColor: ['#e5e7eb'] }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
                }); return;
            }

            const colors = ['#f87171', '#60a5fa', '#facc15', '#4ade80', '#c084fc', '#fb923c', '#a7f3d0'];
            // BUGFIX: dulu pake colors.slice() jadi warna abis/undefined kalau kategori > 7.
            // Sekarang looping pake modulo, sama kaya breakdown list, biar selalu ada warna & konsisten.
            const chartColors = categoriesArr.map((_, i) => colors[i % colors.length]);
            chartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: categoriesArr.map(c => tText(c)),
                    datasets: [{ data: amountsArr, backgroundColor: chartColors, borderWidth: 0 }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: isDark ? '#fff' : '#374151', font: { size: 11, weight: 'bold' } } } } }
            });

            categoriesArr.forEach((cat, index) => {
                const amount = expenseData[cat];
                const percent = ((amount / totalExpenseSum) * 100).toFixed(1);
                const color = colors[index % colors.length];
                breakdownList.insertAdjacentHTML('beforeend', `
                    <div class="flex items-center justify-between p-2.5 rounded-xl bg-white/40 dark:bg-black/20">
                        <div class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full" style="background-color: ${color}"></span>
                            <span class="font-bold text-xs text-gray-800 dark:text-white">${tText(cat)}</span>
                        </div>
                        <div class="text-right">
                            <span class="font-black text-xs text-gray-900 dark:text-white">Rp ${formatRp(amount)}</span>
                            <span class="text-[10px] text-gray-400 block">${percent}%</span>
                        </div>
                    </div>
                `);
            });
        }

        const modal = document.getElementById('transactionModal');
        const overlay = document.getElementById('modalOverlay');

        function showModal() {
            modal.classList.remove('hidden', 'modal-exit'); modal.classList.add('modal-enter');
            overlay.classList.remove('hidden'); overlay.classList.add('block');
        }

        function openAddModal() {
            editingId = null; 
            document.getElementById('transactionForm').reset();
            document.getElementById('date').value = new Date().toISOString().split('T')[0];
            document.getElementById('modalTitle').innerText = i18n[currentLang].addTx;
            document.getElementById('submitBtn').innerText = i18n[currentLang].saveBtn;
            document.getElementById('deleteBtn').classList.add('hidden');
            document.querySelector('input[name="type"][value="expense"]').checked = true;
            updateCategoryState();
            showModal();
        }

        function closeModal() {
            modal.classList.remove('modal-enter'); modal.classList.add('modal-exit');
            setTimeout(() => {
                modal.classList.add('hidden'); overlay.classList.add('hidden'); overlay.classList.remove('block');
                document.getElementById('transactionForm').reset();
                document.getElementById('customCategory').classList.add('hidden');
                document.getElementById('deleteBtn').classList.add('hidden');
            }, 400); 
        }

        function editTransaction(id) {
            const t = transactions.find(x => x.id === id);
            if (!t) return;
            
            editingId = id;
            document.querySelector(`input[name="type"][value="${t.type}"]`).checked = true;
            
            if (defaultCategories[t.type].includes(t.category)) {
                document.getElementById('categorySelect').value = t.category;
                document.getElementById('categoryDisplay').innerText = tText(t.category);
                document.getElementById('customCategory').classList.add('hidden');
            } else {
                document.getElementById('categorySelect').value = 'add_new';
                document.getElementById('categoryDisplay').innerText = tText('add_new');
                document.getElementById('customCategory').classList.remove('hidden');
                document.getElementById('customCategory').value = t.category;
            }
            
            // Format titik dimasukkan otomatis saat mau edit data
            document.getElementById('amount').value = new Intl.NumberFormat('id-ID').format(t.amount);
            document.getElementById('date').value = t.date;
            document.getElementById('note').value = t.note;
            document.getElementById('modalTitle').innerText = i18n[currentLang].editTx;
            document.getElementById('submitBtn').innerText = i18n[currentLang].updateBtn;
            document.getElementById('deleteBtn').classList.remove('hidden');
            showModal();
        }

        async function deleteCurrentTransaction() {
            if (!editingId) return;
            const result = await showGlassConfirm(
                currentLang === 'id' ? 'Hapus Data' : 'Delete Data',
                currentLang === 'id' ? 'Yakin ingin menghapus transaksi ini? Tindakan ini tidak bisa dibatalkan.' : 'Are you sure you want to delete this transaction? This action cannot be undone.',
                { confirmText: currentLang === 'id' ? 'Hapus' : 'Delete', cancelText: currentLang === 'id' ? 'Batal' : 'Cancel' }
            );
            if (result === 1) {
                getUserTransactionsRef().doc(String(editingId)).delete();
                transactions = transactions.filter(t => t.id !== editingId);
                updateDashboard();
                if(!document.getElementById('fullHistoryScreen').classList.contains('translate-x-full')) renderFullHistory();
                if (currentTab === 'report') renderReport();
                closeModal();
            }
        }
        
        async function deleteTransaction(id) {
            const result = await showGlassConfirm(
                currentLang === 'id' ? 'Hapus Data' : 'Delete Data',
                currentLang === 'id' ? 'Yakin ingin menghapus transaksi ini? Tindakan ini tidak bisa dibatalkan.' : 'Are you sure you want to delete this transaction? This action cannot be undone.',
                { confirmText: currentLang === 'id' ? 'Hapus' : 'Delete', cancelText: currentLang === 'id' ? 'Batal' : 'Cancel' }
            );
            if (result === 1) {
                getUserTransactionsRef().doc(String(id)).delete();
                transactions = transactions.filter(t => t.id !== id);
                updateDashboard();
                if(!document.getElementById('fullHistoryScreen').classList.contains('translate-x-full')) renderFullHistory();
                if (currentTab === 'report') renderReport();
            }
        }

        async function resetData() {
            const isId = currentLang === 'id';
            const result = await showGlassConfirm(
                isId ? 'Hapus Semua Data' : 'Delete All Data',
                isId ? 'Semua data transaksi dan tabungan akan dihapus permanen dan tidak bisa dikembalikan.' : 'All transaction and savings data will be permanently deleted and cannot be recovered.',
                { confirmText: isId ? 'Hapus Semua' : 'Delete All', cancelText: isId ? 'Batal' : 'Cancel' }
            );
            if (result === 1) {
                // Hapus semua transaksi dari Firestore
                const txDeletes = transactions.map(t => getUserTransactionsRef().doc(String(t.id)).delete());
                // Hapus semua tabungan dari Firestore (gunakan savingsRef, bukan fungsi)
                const savingDeletes = savingsData.map(s => savingsRef ? savingsRef.doc(String(s.id)).delete() : Promise.resolve());
                
                await Promise.all([...txDeletes, ...savingDeletes]);
                
                // Reset data lokal
                transactions = [];
                savingsData = [];
                
                // Update UI home (transaksi)
                updateDashboard();
                renderFullHistory();
                if (currentTab === 'report') renderReport();
                
                // Update UI tabungan secara langsung tanpa tunggu Firestore
                document.getElementById('totalSavingBal').innerText = 'Rp 0';
                document.getElementById('savingIncome').innerText = 'Rp 0';
                document.getElementById('savingExpense').innerText = 'Rp 0';
                renderRecentSavings();
                if (!document.getElementById('fullSavingHistoryScreen').classList.contains('translate-x-full')) {
                    renderFullSavingHistory();
                }
                
                closeOptionsModal();
                showGlassNotif(isId ? 'Berhasil' : 'Success', isId ? 'Semua data telah dihapus.' : 'All data has been deleted.', {type: 'success'});
            }
        }

        // FITUR BARU: Import CSV (pasangan dari exportCSV yang sebelumnya cuma satu arah)
        function triggerImportCSV() {
            document.getElementById('csvImportInput').click();
        }

        function importCSV(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
                    if (lines.length < 2) { showGlassNotif(currentLang === 'id' ? 'Error' : 'Error', currentLang === 'id' ? 'File CSV kosong atau formatnya salah.' : 'CSV file is empty or invalid.', {type:'warning'}); return; }

                    // Baris pertama = header (Tanggal,Tipe,Kategori,Catatan,Jumlah), lewati
                    let imported = 0, skipped = 0;
                    for (let i = 1; i < lines.length; i++) {
                        const parts = lines[i].split(',');
                        if (parts.length < 5) { skipped++; continue; }
                        const [date, type, category, ...rest] = parts;
                        const amountStr = rest.pop();
                        const note = rest.join(',');
                        const amount = parseInt(String(amountStr).trim(), 10);

                        if (!date || (type.trim() !== 'income' && type.trim() !== 'expense') || isNaN(amount) || amount <= 0) {
                            skipped++; continue;
                        }

                        transactions.push({
                            id: Date.now() + i,
                            type: type.trim(),
                            amount: amount,
                            category: (category || 'other').trim(),
                            date: date.trim(),
                            note: (note || '').trim()
                        });
                        imported++;
                    }

                    updateDashboard();
                    if(!document.getElementById('fullHistoryScreen').classList.contains('translate-x-full')) renderFullHistory();
                    if (currentTab === 'report') renderReport();

                    showGlassNotif(
                        currentLang === 'id' ? 'Import Berhasil' : 'Import Success',
                        currentLang === 'id' ? `Berhasil: ${imported} data, dilewati: ${skipped} data.` : `Success: ${imported} items, skipped: ${skipped} items.`,
                        {type:'success'}
                    );
                } catch (err) {
                    showGlassNotif('Error', currentLang === 'id' ? 'Gagal membaca file CSV.' : 'Failed to read CSV file.', {type:'danger'});
                } finally {
                    event.target.value = '';
                }
            };
            reader.readAsText(file);
        }

        function showExportOptions() {
            const sourceOpts = [
                { value: 'transactions', label: currentLang === 'id' ? 'Transaksi' : 'Transactions', selected: false },
                { value: 'savings', label: currentLang === 'id' ? 'Tabungan' : 'Savings', selected: false }
            ];
            openOptionsModal(sourceOpts, (source) => {
                const formatOpts = [
                    { value: 'pdf', label: 'PDF Report', selected: false },
                    { value: 'csv', label: 'CSV File', selected: false }
                ];
                setTimeout(() => {
                    openOptionsModal(formatOpts, (format) => {
                        const timeOpts = [
                            { value: 'all', label: currentLang === 'id' ? 'Semua Waktu' : 'All Time', selected: false },
                            { value: 'month', label: currentLang === 'id' ? 'Bulan Ini' : 'This Month', selected: false },
                            { value: '30days', label: currentLang === 'id' ? '30 Hari Terakhir' : 'Last 30 Days', selected: false },
                            { value: '7days', label: currentLang === 'id' ? '7 Hari Terakhir' : 'Last 7 Days', selected: false }
                        ];
                        setTimeout(() => {
                            openOptionsModal(timeOpts, (timeFilter) => {
                                generateExport(source, format, timeFilter);
                            });
                        }, 400); // Wait for modal animation to close
                    });
                }, 400);
            });
        }

        function generateExport(source, format, timeFilter) {
            let dataArr = source === 'transactions' ? transactions : savingsData;
            
            if (dataArr.length === 0) {
                return showGlassNotif(currentLang === 'id' ? 'Tidak Ada Data' : 'No Data', currentLang === 'id' ? 'Belum ada data untuk diekspor.' : 'No data to export.', {type:'info'});
            }

            const now = new Date();
            let filteredData = dataArr.filter(item => {
                if (timeFilter === 'all') return true;
                const d = new Date(item.date);
                if (timeFilter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                
                const diffTime = Math.abs(now - d);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                if (timeFilter === '7days') return diffDays <= 7;
                if (timeFilter === '30days') return diffDays <= 30;
                return true;
            });

            if (filteredData.length === 0) {
                return showGlassNotif(currentLang === 'id' ? 'Tidak Ada Data' : 'No Data', currentLang === 'id' ? 'Tidak ada data pada periode ini.' : 'No data in this period.', {type:'info'});
            }

            if (format === 'csv') {
                exportCSVFiltered(filteredData, source);
            } else if (format === 'pdf') {
                exportPDFFiltered(filteredData, source, timeFilter);
            }
        }

        function exportCSVFiltered(data, source) {
            let csvContent = "data:text/csv;charset=utf-8,";
            if (source === 'transactions') {
                csvContent += "Tanggal,Tipe,Kategori,Catatan,Jumlah\n";
                data.forEach(row => { csvContent += `${row.date},${row.type},${tText(row.category)},${row.note},${row.amount}\n`; });
            } else {
                csvContent += "Tanggal,Tipe,Catatan,Jumlah\n";
                data.forEach(row => { csvContent += `${row.date},${row.type},${row.note},${row.amount}\n`; });
            }
            
            const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent));
            link.setAttribute("download", `MoneyTrack_${source}.csv`); document.body.appendChild(link);
            link.click(); document.body.removeChild(link);
        }

        function exportPDFFiltered(data, source, timeFilter) {
            try {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                // Title
                doc.setFontSize(22);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(15, 23, 42);
                const title = source === 'transactions' ? (currentLang === 'id' ? 'Laporan Transaksi' : 'Transaction Report') : (currentLang === 'id' ? 'Laporan Tabungan' : 'Savings Report');
                doc.text(title, 14, 22);
                
                // Subtitle (Period)
                doc.setFontSize(11);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(100, 116, 139);
                let periodText = 'All Time';
                if(timeFilter==='month') periodText = 'This Month';
                if(timeFilter==='7days') periodText = 'Last 7 Days';
                if(timeFilter==='30days') periodText = 'Last 30 Days';
                
                if (currentLang === 'id') {
                    if(timeFilter==='all') periodText = 'Semua Waktu';
                    if(timeFilter==='month') periodText = 'Bulan Ini';
                    if(timeFilter==='7days') periodText = '7 Hari Terakhir';
                    if(timeFilter==='30days') periodText = '30 Hari Terakhir';
                }
                
                doc.text(`${currentLang === 'id' ? 'Periode' : 'Period'}: ${periodText}`, 14, 30);
                
                // Header Line
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.5);
                doc.line(14, 36, 196, 36);

                // Summary Box
                let totalIn = 0;
                let totalOut = 0;
                data.forEach(item => {
                    if (item.type === 'income' || item.type === 'nabung') totalIn += item.amount;
                    else totalOut += item.amount;
                });
                const net = totalIn - totalOut;

                doc.setFillColor(248, 250, 252);
                doc.setDrawColor(226, 232, 240);
                doc.roundedRect(14, 44, 182, 24, 3, 3, 'FD');

                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                
                // In
                doc.setTextColor(100, 116, 139);
                doc.text(currentLang === 'id' ? 'TOTAL MASUK' : 'TOTAL IN', 20, 52);
                doc.setFontSize(12);
                doc.setTextColor(34, 197, 94);
                doc.text(`Rp ${formatRp(totalIn)}`, 20, 60);
                
                // Out
                doc.setFontSize(10);
                doc.setTextColor(100, 116, 139);
                doc.text(currentLang === 'id' ? 'TOTAL KELUAR' : 'TOTAL OUT', 85, 52);
                doc.setFontSize(12);
                doc.setTextColor(239, 68, 68);
                doc.text(`Rp ${formatRp(totalOut)}`, 85, 60);
                
                // Net
                doc.setFontSize(10);
                doc.setTextColor(100, 116, 139);
                doc.text(currentLang === 'id' ? 'SALDO BERSIH' : 'NET BALANCE', 150, 52);
                doc.setFontSize(12);
                doc.setTextColor(net >= 0 ? 59 : 239, net >= 0 ? 130 : 68, net >= 0 ? 246 : 68);
                doc.text(`${net >= 0 ? '+' : '-'} Rp ${formatRp(Math.abs(net))}`, 150, 60);

                // Table Data
                const head = source === 'transactions' 
                    ? [[currentLang === 'id' ? 'Tanggal' : 'Date', currentLang === 'id' ? 'Kategori' : 'Category', currentLang === 'id' ? 'Tipe' : 'Type', currentLang === 'id' ? 'Jumlah' : 'Amount', currentLang === 'id' ? 'Catatan' : 'Note']]
                    : [[currentLang === 'id' ? 'Tanggal' : 'Date', currentLang === 'id' ? 'Tipe' : 'Type', currentLang === 'id' ? 'Jumlah' : 'Amount', currentLang === 'id' ? 'Catatan' : 'Note']];
                
                const body = data.map(item => {
                    const rowDate = formatDateText(new Date(item.date), 'short');
                    const rowType = item.type === 'income' || item.type === 'nabung' ? '+' : '-';
                    if (source === 'transactions') {
                        return [rowDate, tText(item.category), rowType, `Rp ${formatRp(item.amount)}`, item.note || '-'];
                    } else {
                        return [rowDate, rowType, `Rp ${formatRp(item.amount)}`, item.note || '-'];
                    }
                });

                doc.autoTable({
                    startY: 76,
                    head: head,
                    body: body,
                    theme: 'grid',
                    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
                    styles: { fontSize: 9, cellPadding: 5, textColor: [51, 65, 85] },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    columnStyles: {
                        2: { halign: 'center' },
                        3: { halign: 'right', fontStyle: 'bold' }
                    },
                    margin: { top: 76 }
                });

                // Footer
                const pageCount = doc.internal.getNumberOfPages();
                doc.setFontSize(8);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(148, 163, 184);
                const generatedText = currentLang === 'id' ? 'Dibuat oleh Money Track pada' : 'Generated by Money Track on';
                const today = new Date().toLocaleDateString(currentLang === 'id' ? 'id-ID' : 'en-US');
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.text(`${generatedText} ${today}`, 14, doc.internal.pageSize.height - 10);
                    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
                }

                doc.save(`MoneyTrack_${source}.pdf`);
            } catch (error) {
                console.error("PDF generation error:", error);
                showGlassNotif("Error", currentLang === 'id' ? "Gagal membuat PDF. Cek console." : "Failed to create PDF.", {type: 'danger'});
            }
        }

        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const type = document.querySelector('input[name="type"]:checked').value;
            
            // Hapus titik ribuan sebelum masuk ke database
            const rawAmount = document.getElementById('amount').value.replace(/\./g, '');
            const amount = parseInt(rawAmount, 10);

            // BUGFIX: dulu nominal 0 / kosong / NaN bisa ke-save diam-diam (karena "required"
            // cuma ngecek non-empty, bukan valid angka > 0). Sekarang divalidasi dulu.
            if (!rawAmount || isNaN(amount) || amount <= 0) {
                showGlassNotif(currentLang === 'id' ? 'Validasi' : 'Validation', currentLang === 'id' ? 'Jumlah harus diisi dan lebih dari 0.' : 'Amount must be filled and greater than 0.', {type:'warning'});
                document.getElementById('amount').focus();
                return;
            }
            
            const date = document.getElementById('date').value;
            const note = document.getElementById('note').value;
            let category = document.getElementById('categorySelect').value;
            if (category === 'add_new') {
                const typed = document.getElementById('customCategory').value.trim();
                if (!typed) {
                    category = 'other';
                } else {
                    // BUGFIX: dedupe kategori custom biar gak numpuk kategori mirip/typo
                    // beda kapital (mis. "Makan" vs "makan" vs default "food"/"Makanan").
                    const existingNames = new Set();
                    defaultCategories[type].forEach(c => { if (c !== 'add_new') existingNames.add(tText(c).toLowerCase()); });
                    transactions.filter(t => t.type === type).forEach(t => existingNames.add(t.category.toLowerCase()));

                    const existingTx = transactions.find(t => t.type === type && t.category.toLowerCase() === typed.toLowerCase());
                    const existingDefault = defaultCategories[type].find(c => c !== 'add_new' && tText(c).toLowerCase() === typed.toLowerCase());

                    if (existingTx) {
                        category = existingTx.category; // pakai penulisan yang sudah ada persis
                    } else if (existingDefault) {
                        category = existingDefault; // ternyata sama kayak kategori default yang sudah ada
                    } else {
                        category = typed;
                    }
                }
            }
            
            const txData = { type, amount, category, date, note, timestamp: Date.now() };
            if (editingId) {
                getUserTransactionsRef().doc(String(editingId)).update(txData);
                const idx = transactions.findIndex(t => t.id === editingId);
                if (idx !== -1) transactions[idx] = { id: editingId, ...txData };
            } else {
                const newDocRef = getUserTransactionsRef().doc();
                newDocRef.set(txData);
                transactions.unshift({ id: newDocRef.id, ...txData });
            }
            
            updateDashboard(); 
            if(!document.getElementById('fullHistoryScreen').classList.contains('translate-x-full')) renderFullHistory();
            if (currentTab === 'report') renderReport(); 
            closeModal();
            showGlassNotif(currentLang === 'id' ? 'Berhasil' : 'Success', currentLang === 'id' ? 'Data transaksi berhasil disimpan.' : 'Transaction data saved successfully.', {type: 'success'});
        });

        // Apply language immediately before first paint
        applyTranslations();
        window.onload = () => { initApp(); };
