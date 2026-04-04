/* &copy; 2026 yohanesokta */
export class UIManager {
    constructor(editor) {
        this.editor = editor;
        this.textures = [];
        this.init();
        this.loadTextures();
    }

    async loadTextures() {
        try {
            const response = await fetch('loader.json');
            const data = await response.json();
            if (data && data.load) {
                this.textures = data.load.map(t => t.name);
                const select = document.getElementById('prop-tx-select');
                this.textures.forEach(name => {
                    const opt = document.createElement('option');
                    opt.value = name;
                    opt.textContent = name;
                    select.appendChild(opt);
                });
            }
        } catch (err) {
            console.warn('Failed to load loader.json');
        }
    }

    init() {
        const e = this.editor;
        
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
            });
        });

        // Layer reordering
        document.getElementById('layer-up').onclick = () => {
            if (e.state.selection.length === 1) {
                if (e.objects.moveUp(e.state.selection[0])) {
                    e.saveHistory();
                    this.updateProperties();
                }
            }
        };
        document.getElementById('layer-down').onclick = () => {
            if (e.state.selection.length === 1) {
                if (e.objects.moveDown(e.state.selection[0])) {
                    e.saveHistory();
                    this.updateProperties();
                }
            }
        };

        document.getElementById('mode-selector').addEventListener('click', (ev) => {
            if (ev.target.dataset.mode) {
                document.querySelectorAll('#mode-selector button').forEach(b => b.classList.remove('active'));
                ev.target.classList.add('active');
                e.state.mode = ev.target.dataset.mode;
                if (e.state.mode === 'player') {
                    e.state.selection = [e.objects.data.player];
                    e.ui.updateProperties(true);
                }
                e.updateStats();
            }
        });

        document.getElementById('grid-snap').addEventListener('input', ev => {
            e.state.gridSize = parseFloat(ev.target.value) || 0.1;
            localStorage.setItem('mb_gridSize', e.state.gridSize);
        });

        document.getElementById('default-z1').addEventListener('input', ev => {
            const val = parseFloat(ev.target.value);
            e.state.defaultY1 = isNaN(val) ? 0 : val;
            localStorage.setItem('mb_defaultY1', e.state.defaultY1);
        });

        document.getElementById('default-z2').addEventListener('input', ev => {
            const val = parseFloat(ev.target.value);
            e.state.defaultY2 = isNaN(val) ? 0 : val;
            localStorage.setItem('mb_defaultY2', e.state.defaultY2);
        });

        document.getElementById('btn-undo').onclick = () => e.undo();
        document.getElementById('btn-redo').onclick = () => e.redo();
        document.getElementById('btn-delete').onclick = () => e.deleteSelected();

        document.getElementById('btn-export').onclick = () => {
            const data = JSON.stringify(e.objects.serialize(), null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'map.json'; a.click();
        };

        document.getElementById('btn-copy').onclick = () => {
            const data = JSON.stringify(e.objects.serialize(), null, 2);
            navigator.clipboard.writeText(data).then(() => {
                const btn = document.getElementById('btn-copy');
                const oldText = btn.innerText;
                btn.innerText = 'Copied!';
                btn.classList.add('success');
                setTimeout(() => {
                    btn.innerText = oldText;
                    btn.classList.remove('success');
                }, 2000);
            });
        };

        document.getElementById('btn-import').onclick = () => document.getElementById('import-file').click();
        document.getElementById('import-file').onchange = (ev) => {
            const reader = new FileReader();
            reader.onload = (re) => {
                try {
                    const data = JSON.parse(re.target.result);
                    e.objects.deserialize(data);
                    e.syncCounters();
                    e.saveHistory();
                    this.updateProperties();
                } catch(err) { alert('Invalid Map File'); }
            };
            reader.readAsText(ev.target.files[0]);
        };

        this.bindProperties();
    }

    bindProperties() {
        const e = this.editor;
        const inputs = [
            'color', 'c', 'tx', 'x1', 'z1', 'x2', 'z2', 'y1', 'y2', 'xr', 'yr',
            'id', 'enemy-x', 'enemy-z',
            'ammo', 'mag-x', 'mag-z',
            'health', 'med-x', 'med-z',
            'player-id', 'player-x', 'player-z', 'player-y1', 'player-y2'
        ];

        const txSelect = document.getElementById('prop-tx-select');
        const txInput = document.getElementById('prop-tx');

        txSelect.addEventListener('change', () => {
            if (e.state.selection.length !== 1) return;
            const s = e.state.selection[0];
            if (txSelect.value !== 'custom') {
                s._tx = txSelect.value;
                txInput.value = s._tx;
                txInput.style.display = 'none';
                e.saveHistory();
                this.updateLayerList();
            } else {
                txInput.style.display = 'block';
            }
        });

        inputs.forEach(id => {
            const el = document.getElementById('prop-' + id);
            el.addEventListener('change', () => {
                if (e.state.selection.length !== 1) return;
                const s = e.state.selection[0];
                let val = el.type === 'number' ? parseFloat(el.value) : el.value;
                if (id === 'color') s._color = val;
                else if (id === 'c') s._c = val;
                else if (id === 'tx') {
                    s._tx = val;
                    if (this.textures.includes(val)) {
                        txSelect.value = val;
                        txInput.style.display = 'none';
                    } else {
                        txSelect.value = 'custom';
                        txInput.style.display = 'block';
                    }
                }
                else if (id.includes('-x')) s.x = val;
                else if (id.includes('-z')) s.z = val;
                else if (id.includes('-y1')) s.y1 = val;
                else if (id.includes('-y2')) s.y2 = val;
                else if (id === 'id' || id === 'player-id') s.id = val;
                else if (id === 'ammo') s.ammo = val;
                else if (id === 'health') s.health = val;
                else s[id] = val;
                e.saveHistory();
                this.updateLayerList();
            });
        });
    }

    updateProperties(reset3D = false) {
        if (reset3D) this.editor.view3D.resetView();
        const selection = this.editor.state.selection;
        const panel = document.getElementById('object-properties');
        const empty = document.getElementById('no-selection');

        this.updateLayerList();

        if (selection.length !== 1) {
            panel.style.display = 'none';
            empty.style.display = 'block';
            if (selection.length > 1) {
                empty.innerHTML = `<p class="hint">Multi-selection (${selection.length} objects).<br>Editing disabled.</p>`;
            } else {
                empty.innerHTML = `<p class="hint">No object selected. Click to select, drag/click to create.</p>`;
            }
            return;
        }

        const s = selection[0];
        panel.style.display = 'block';
        empty.style.display = 'none';
        document.getElementById('prop-title').innerText = s._type.toUpperCase() + ' PROPERTIES';
        document.querySelectorAll('.type-props').forEach(p => p.style.display = 'none');
        const propsEl = document.getElementById('props-' + s._type);
        if (propsEl) propsEl.style.display = 'block';
        
        document.getElementById('prop-color').value = s._color;
        if (s._type === 'wall') {
            document.getElementById('prop-x1').value = s.x1;
            document.getElementById('prop-z1').value = s.z1;
            document.getElementById('prop-x2').value = s.x2;
            document.getElementById('prop-z2').value = s.z2;
            document.getElementById('prop-y1').value = s.y1;
            document.getElementById('prop-y2').value = s.y2;
            document.getElementById('prop-xr').value = s.xr;
            document.getElementById('prop-yr').value = s.yr;
            document.getElementById('prop-c').value = s._c;
            const txSelect = document.getElementById('prop-tx-select');
            const txInput = document.getElementById('prop-tx');
            txInput.value = s._tx || '';
            if (this.textures.includes(s._tx)) {
                txSelect.value = s._tx;
                txInput.style.display = 'none';
            } else {
                txSelect.value = 'custom';
                txInput.style.display = 'block';
            }
        } else if (s._type === 'player') {
            document.getElementById('prop-player-id').value = s.id;
            document.getElementById('prop-player-x').value = s.x;
            document.getElementById('prop-player-z').value = s.z;
            document.getElementById('prop-player-y1').value = s.y1;
            document.getElementById('prop-player-y2').value = s.y2;
        } else if (s._type === 'enemy') {
            document.getElementById('prop-id').value = s.id;
            document.getElementById('prop-enemy-x').value = s.x;
            document.getElementById('prop-enemy-z').value = s.z;
        } else if (s._type === 'magazine') {
            document.getElementById('prop-ammo').value = s.ammo;
            document.getElementById('prop-mag-x').value = s.x;
            document.getElementById('prop-mag-z').value = s.z;
        } else if (s._type === 'medkit') {
            document.getElementById('prop-health').value = s.health;
            document.getElementById('prop-med-x').value = s.x;
            document.getElementById('prop-med-z').value = s.z;
        }
    }

    updateLayerList() {
        const e = this.editor;
        const listEl = document.getElementById('layer-list');
        listEl.innerHTML = '';

        // Player is special, always on top or bottom? Let's add it to the list too.
        const allObjects = [e.objects.data.player, ...e.objects.data.objects];
        
        // Reverse to show top-most first in UI
        [...allObjects].reverse().forEach(obj => {
            const item = document.createElement('div');
            item.className = 'layer-item';
            if (e.state.selection.includes(obj)) item.classList.add('selected');

            const color = document.createElement('div');
            color.className = 'color-preview';
            color.style.backgroundColor = obj._color;

            const name = document.createElement('div');
            name.className = 'name';
            name.textContent = (obj._type === 'wall' ? obj._c : obj.id) || obj._type;

            const type = document.createElement('div');
            type.className = 'type';
            type.textContent = obj._type;

            item.appendChild(color);
            item.appendChild(name);
            item.appendChild(type);

            item.onclick = (ev) => {
                const isShift = ev.shiftKey;
                if (isShift) {
                    if (e.state.selection.includes(obj)) {
                        e.state.selection = e.state.selection.filter(o => o !== obj);
                    } else {
                        e.state.selection.push(obj);
                    }
                } else {
                    e.state.selection = [obj];
                }
                this.updateProperties();
            };

            listEl.appendChild(item);
        });
    }
}
