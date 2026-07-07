// --- Звуки и Реестр ---
const SoundManager = {
    sounds: { startup: '', shutdown: '', error: '', click: '', question: '' },
    play(e) { if(this.sounds[e]) { const a = new Audio(this.sounds[e]); a.play().catch(()=>{}); } }
};

const Registry = {
    data: JSON.parse(localStorage.getItem('maku_reg')) || { wall: '', accent: '#007aff', tbPos: 'bottom', group: false },
    save(k, v) { this.data[k] = v; localStorage.setItem('maku_reg', JSON.stringify(this.data)); this.apply(); },
    
    // ОПТИМИЗИРОВАНО: сохраняем всё разом, чтобы не дергать apply() 4 раза
    saveFromUI() {
        this.data.wall = document.getElementById('reg-wall').value || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop';
        this.data.accent = document.getElementById('reg-color').value;
        this.data.tbPos = document.getElementById('reg-tb-pos').value;
        this.data.group = document.getElementById('reg-group').checked;
        localStorage.setItem('maku_reg', JSON.stringify(this.data));
        this.apply();
    },
    
    apply() {
        const wall = this.data.wall || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop';
        document.documentElement.style.setProperty('--bg-color', `url('${wall}')`);
        document.documentElement.style.setProperty('--accent', this.data.accent);
        
        const tb = document.getElementById('taskbar');
        const sm = document.getElementById('start-menu');
        const desk = document.getElementById('desktop');
        
        // ПОЧИНЕНО: теперь панель задач и меню пуск двигаются корректно, а рабочий стол подстраивается
        if (tb && sm && desk) {
            if(this.data.tbPos === 'top') { 
                tb.style.bottom = 'auto'; tb.style.top = '0'; 
                sm.style.bottom = 'auto'; sm.style.top = '60px'; 
                desk.style.top = '50px'; desk.style.bottom = '0';
            } else { 
                tb.style.top = 'auto'; tb.style.bottom = '0'; 
                sm.style.top = 'auto'; sm.style.bottom = '60px'; 
                desk.style.top = '0'; desk.style.bottom = '50px';
            }
        }
        
        if(document.getElementById('reg-wall')) {
            document.getElementById('reg-wall').value = this.data.wall.includes('unsplash') ? '' : this.data.wall;
            document.getElementById('reg-color').value = this.data.accent;
            document.getElementById('reg-tb-pos').value = this.data.tbPos;
            document.getElementById('reg-group').checked = this.data.group;
        }
    }
};

// --- Виртуальная Файловая Система (VFS) ---
const VFS = {
    path: 'X:\\',
    sys: JSON.parse(localStorage.getItem('maku_vfs')) || {
        'X:\\': { type: 'dir', items: ['MakuOS', 'Users'] },
        'X:\\MakuOS': { type: 'dir', items: ['System32'] },
        'X:\\MakuOS\\System32': { type: 'dir', items: [] },
        'X:\\Users': { type: 'dir', items: ['Desktop'] },
        'X:\\Users\\Desktop': { type: 'dir', items: ['readme.txt'] },
        'X:\\Users\\Desktop\\readme.txt': { type: 'file', data: 'Добро пожаловать в MakuOS! Создатель: Марк.' }
    },
    save() { localStorage.setItem('maku_vfs', JSON.stringify(this.sys)); this.renderDesk(); if(document.getElementById('exp-view')) this.renderExp(); },
    create(type, name, data = '') {
        const full = this.path + (this.path.endsWith('\\') ? '' : '\\') + name;
        if(this.sys[full]) return alert('Уже существует!');
        this.sys[full] = { type, data, items: [] };
        this.sys[this.path].items.push(name);
        this.save();
    },
    goUp() {
        if(this.path === 'X:\\') return;
        let p = this.path.split('\\'); p.pop();
        this.path = p.join('\\') || 'X:\\';
        this.renderExp();
    },
    renderDesk() {
        const d = document.getElementById('desktop'); d.innerHTML = '';
        this.sys['X:\\Users\\Desktop'].items.forEach(i => {
            const el = document.createElement('div'); el.className = 'desktop-icon';
            const isDir = this.sys[`X:\\Users\\Desktop\\${i}`].type === 'dir';
            el.innerHTML = `<i class="ph-fill ${isDir ? 'ph-folder' : 'ph-file-text'}"></i><span>${i}</span>`;
            el.ondblclick = () => isDir ? (WindowManager.open('explorer'), VFS.path=`X:\\Users\\Desktop\\${i}`, VFS.renderExp()) : WindowManager.open('notepad', `X:\\Users\\Desktop\\${i}`);
            d.appendChild(el);
        });
    },
    renderExp() {
        const v = document.getElementById('exp-view');
        if(!v) return;
        document.getElementById('exp-path').value = this.path; v.innerHTML = '';
        this.sys[this.path].items.forEach(i => {
            const p = this.path + (this.path.endsWith('\\') ? '' : '\\') + i;
            const type = this.sys[p].type;
            const el = document.createElement('div'); el.className = 'explorer-item';
            
            let icon = 'ph-file';
            if(type === 'dir') icon = 'ph-folder';
            else if(i.endsWith('.mp4') || i.endsWith('.mp3')) icon = 'ph-play-circle';
            else if(i.endsWith('.png') || i.endsWith('.jpg')) icon = 'ph-image';
            else if(i.endsWith('.txt')) icon = 'ph-file-text';

            el.innerHTML = `<i class="ph-fill ${icon}"></i><span>${i}</span>`;
            el.ondblclick = () => {
                if(type === 'dir') { this.path = p; this.renderExp(); }
                else if(icon === 'ph-play-circle' || icon === 'ph-image') WindowManager.open('mediaplayer', p);
                else WindowManager.open('notepad', p);
            };
            v.appendChild(el);
        });
    },
    uploadFile(e) {
        const file = e.target.files[0]; if(!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => this.create('file', file.name, ev.target.result);
        reader.readAsDataURL(file);
    }
};

// --- Оконный и Системный Менеджер ---
const OS = {
    calcInput(e) {
        if(e.target.tagName !== 'BUTTON') return;
        const v = e.target.innerText; const res = document.getElementById('calc-res');
        if(v === 'C') res.value = '0';
        else if(v === '←') res.value = res.value.slice(0,-1) || '0';
        else if(v === '=') {
            try {
                const expr = res.value.replace(/X|х/gi, '*').replace(/,/g, '.');
                res.value = new Function('return ' + expr)();
            } catch { res.value = 'Ошибка' }
        }
        else res.value = res.value === '0' ? v : res.value + v;
    },
    clearPaint() { const c = document.getElementById('paint-canvas'); const ctx = c.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,c.width,c.height); },
    switchTab(el, id) {
        document.querySelectorAll('.settings-sidebar div').forEach(d => d.classList.remove('active'));
        document.querySelectorAll('.settings-content').forEach(d => d.classList.add('hidden'));
        el.classList.add('active'); document.getElementById(`set-${id}`).classList.remove('hidden');
        if(id === 'stor') document.getElementById('stor-info').innerText = `Занято: ${JSON.stringify(VFS.sys).length / 1024 | 0} KB из 4 ТБ`;
    },
    filterStartMenu() {
        const q = document.getElementById('start-search-input').value.toLowerCase();
        document.querySelectorAll('#app-list li').forEach(li => {
            li.style.display = li.innerText.toLowerCase().includes(q) ? 'flex' : 'none';
        });
    },
    showContextMenu(e, target) {
        e.preventDefault();
        const m = document.getElementById('context-menu');
        m.style.left = e.clientX + 'px'; m.style.top = e.clientY + 'px';
        m.innerHTML = '';
        
        let actions = [];
        if(target === 'desktop' || target === 'explorer') {
            const contextPath = target === 'desktop' ? 'X:\\Users\\Desktop' : VFS.path;
            actions = [
                {t: 'Создать папку', a: () => { let n = prompt('Имя:'); if(n){ const old = VFS.path; VFS.path = contextPath; VFS.create('dir', n); VFS.path = old; }}},
                {t: 'Создать файл.txt', a: () => { let n = prompt('Имя:'); if(n){ const old = VFS.path; VFS.path = contextPath; VFS.create('file', n.includes('.')?n:n+'.txt'); VFS.path = old; }}},
                {t: 'Сортировка', a: () => alert('Сортировка применена')}
            ];
        }
        
        actions.forEach(act => {
            const d = document.createElement('div'); d.className = 'ctx-item'; d.innerText = act.t;
            d.onclick = () => { act.a(); m.classList.add('hidden'); };
            m.appendChild(d);
        });
        m.classList.remove('hidden');
    },
    bindCustomSounds() { alert('Звуки привязаны. (Заглушка для ручной загрузки)'); }
};

document.addEventListener('click', e => { if(!e.target.closest('#context-menu')) document.getElementById('context-menu').classList.add('hidden'); });

const WindowManager = {
    z: 100, active: {},
    
    min(w) {
        w.style.display = 'none';
        w.dataset.minimized = "true";
    },

    open(id, arg = null) {
        if(this.active[id] && !Registry.data.group) { this.focus(this.active[id].el); return; }
        
        const win = document.createElement('div');
        const winId = id + Date.now();
        win.className = 'os-window'; win.style.left = '150px'; win.style.top = '100px'; win.style.zIndex = ++this.z;
        
        // ПОЧИНЕНО: Калькулятор теперь компактный
        if (id === 'calculator') {
            win.style.width = '320px';
            win.style.height = '420px';
            win.style.minWidth = '320px';
            win.style.minHeight = '420px';
        }

        const head = document.createElement('div'); head.className = 'window-header';
        
        head.innerHTML = `<div class="window-title">${id.toUpperCase()}</div><div class="window-controls"><button class="win-btn btn-min"></button><button class="win-btn btn-max"></button><button class="win-btn btn-close"></button></div>`;
        
        head.querySelector('.btn-close').onclick = () => this.close(winId);
        head.querySelector('.btn-max').onclick = () => this.max(win);
        head.querySelector('.btn-min').onclick = (e) => { e.stopPropagation(); this.min(win); };
        
        const body = document.createElement('div'); body.className = 'window-body';
        const tpl = document.getElementById(`tpl-${id}`);
        if(tpl) body.appendChild(tpl.content.cloneNode(true));
        
        win.append(head, body); document.getElementById('window-area').appendChild(win);
        this.drag(win, head); win.onmousedown = () => this.focus(win);
        
        this.active[winId] = { el: win, appId: id }; this.updateTb();
        document.getElementById('start-menu').classList.add('hidden');
        SoundManager.play('click');
        
        // App Inits
        if(id === 'notepad') {
            const ta = win.querySelector('#np-text');
            if(arg && VFS.sys[arg]) ta.value = VFS.sys[arg].data;
            ta.oninput = () => { 
                win.querySelector('#np-chars').innerText = `Символов: ${ta.value.length}`; 
                win.querySelector('#np-lines').innerText = `Строк: ${ta.value.split('\n').length}`;
                win.querySelector('#np-time').innerText = `Время: ${Math.ceil(ta.value.length/1500)||1} мин`;
                if(arg) { VFS.sys[arg].data = ta.value; VFS.save(); }
            };
        }
        if(id === 'explorer') VFS.renderExp();
        
        if(id === 'paint') {
            const cvs = win.querySelector('#paint-canvas'); const ctx = cvs.getContext('2d');
            cvs.width = 2000; cvs.height = 1500;
            ctx.fillStyle='#fff'; ctx.fillRect(0,0,cvs.width,cvs.height);
            let p = false;
            cvs.onmousedown = (e) => { p=true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); };
            cvs.onmousemove = (e) => { if(!p)return; ctx.strokeStyle = win.querySelector('#paint-color').value; ctx.lineWidth = win.querySelector('#paint-size').value; ctx.lineCap='round'; ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); };
            cvs.onmouseup = () => p=false; cvs.onmouseout = () => p=false;
        }
        
        if(id === 'cmd') {
            const inp = win.querySelector('#cmd-input'); const out = win.querySelector('#cmd-output');
            inp.onkeydown = (e) => {
                if(e.key === 'Enter') {
                    const c = inp.value.trim().split(' '); inp.value = '';
                    out.innerHTML += `<div>X:\\>${c.join(' ')}</div>`;
                    if(c[0] === 'echo') out.innerHTML += `<div>${c.slice(1).join(' ')}</div>`;
                    else if(c[0] === 'reg' && c[1] === 'set') { Registry.save(c[2], c[3]); out.innerHTML += `<div>Реестр обновлен</div>`; }
                    else if(c[0] === 'screenshot') {
                        out.innerHTML += `<div>Создание скриншота...</div>`;
                        html2canvas(document.body).then(can => { const l = document.createElement('a'); l.download='MakuOS.png'; l.href=can.toDataURL(); l.click(); out.innerHTML+='<div style="color:#10b981">Сохранено на хост!</div>'; });
                    }
                    else if(c[0]) out.innerHTML += `<div style="color:#ff5f56">Неверная команда</div>`;
                    out.scrollTop = out.scrollHeight;
                }
            };
        }
        if(id === 'mediaplayer' && arg && VFS.sys[arg]) {
            const v = win.querySelector('#media-view');
            const data = VFS.sys[arg].data;
            if(arg.endsWith('.mp4')) v.innerHTML = `<video src="${data}" controls autoplay></video>`;
            else if(arg.endsWith('.mp3')) v.innerHTML = `<audio src="${data}" controls autoplay></audio>`;
            else if(arg.endsWith('.png') || arg.endsWith('.jpg')) v.innerHTML = `<img src="${data}">`;
        }
    },

    // ПОЧИНЕНО: Удалили дубликат функции focus, теперь окно восстанавливается!
    focus(w) {
        if(w.dataset.minimized) {
            w.style.display = 'flex';
            delete w.dataset.minimized;
        }
        w.style.zIndex = ++this.z;
    },
    
    close(id) { this.active[id].el.remove(); delete this.active[id]; this.updateTb(); },
    max(w) { if(!w.dataset.max) { w.dataset.o = w.style.cssText; w.style.top=0; w.style.left=0; w.style.width='100%'; w.style.height='calc(100% - 50px)'; w.dataset.max="1"; } else { w.style.cssText=w.dataset.o; delete w.dataset.max; } },
    drag(w, h) {
        let p1=0,p2=0,p3=0,p4=0;
        h.onmousedown=e=>{ if(w.dataset.max)return; e.preventDefault(); p3=e.clientX; p4=e.clientY; document.onmouseup=()=>{document.onmouseup=null;document.onmousemove=null;}; document.onmousemove=ev=>{ ev.preventDefault(); p1=p3-ev.clientX; p2=p4-ev.clientY; p3=ev.clientX; p4=ev.clientY; w.style.top=(w.offsetTop-p2)+"px"; w.style.left=(w.offsetLeft-p1)+"px"; };};
    },
    updateTb() {
        const tb = document.getElementById('taskbar-apps'); tb.innerHTML = '';
        for(let id in this.active) {
            const btn = document.createElement('button'); btn.className = 'taskbar-icon active';
            let i = 'ph-app-window';
            const appId = this.active[id].appId;
            if(appId==='settings')i='ph-gear'; if(appId==='notepad')i='ph-notepad'; if(appId==='explorer')i='ph-folder'; if(appId==='calculator')i='ph-calculator'; if(appId==='paint')i='ph-palette'; if(appId==='cmd')i='ph-terminal';
            btn.innerHTML = `<i class="ph-fill ${i}"></i>`; 
            btn.onclick = () => this.focus(this.active[id].el);
            tb.appendChild(btn);
        }
    }
};

// --- Инициализация ---
setInterval(() => document.getElementById('clock').innerText = new Date().toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'}), 1000);
document.getElementById('start-btn').onclick = () => { document.getElementById('start-menu').classList.toggle('hidden'); SoundManager.play('click'); };
document.addEventListener('DOMContentLoaded', () => { Registry.apply(); VFS.renderDesk(); });
document.body.addEventListener('click', function initSnd() { SoundManager.play('startup'); document.body.removeEventListener('click', initSnd); }, {once:true});