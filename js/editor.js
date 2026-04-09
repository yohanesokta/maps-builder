/* &copy; 2026 yohanesokta */
import { Camera } from './camera.js';
import { ObjectManager } from './objectManager.js';
import { Renderer } from './renderer.js';
import { View3D } from './view3D.js';
import { UIManager } from './uiManager.js';
import { Precision } from './utils.js';

export class Editor {
    constructor() {
        this.canvas = document.getElementById('main-canvas');
        this.view3DCanvas = document.getElementById('view-3d-canvas');
        this.camera = new Camera();
        this.objects = new ObjectManager();
        this.renderer = new Renderer(this.canvas, this.camera);
        this.view3D = new View3D(this.view3DCanvas);
        
        this.state = {
            mode: 'wall',
            gridSize: parseFloat(localStorage.getItem('mb_gridSize')) || 1.0,
            defaultY1: parseFloat(localStorage.getItem('mb_defaultY1')) || 0,
            defaultY2: parseFloat(localStorage.getItem('mb_defaultY2')) || 1.0,
            selection: [],
            isDrawing: false,
            isPanning: false,
            isDragging: false,
            isResizing: false,
            resizeHandle: null,
            isRectSelecting: false,
            rectStart: null,
            mousePos: { x: 0, y: 0 },
            lastMouse: { x: 0, y: 0 },
            keys: {},
            counters: { wall: 0, enemy: 0, magazine: 0, medkit: 0 }
        };

        this.history = [];
        this.historyPointer = -1;
        this.init();
    }

    init() {
        this.ui = new UIManager(this);
        document.getElementById('grid-snap').value = this.state.gridSize;
        document.getElementById('default-z1').value = this.state.defaultY1;
        document.getElementById('default-z2').value = this.state.defaultY2;
        this.setupInputs();
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.loop();
    }

    resize() {
        this.canvas.width = window.innerWidth - 320;
        this.canvas.height = window.innerHeight;
        this.view3DCanvas.width = 320;
        this.view3DCanvas.height = 240;
    }

    setupInputs() {
        this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
        window.addEventListener('mousemove', e => this.onMouseMove(e));
        window.addEventListener('mouseup', e => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', e => this.onWheel(e));
        window.addEventListener('keydown', e => this.onKeyDown(e));
        window.addEventListener('keyup', e => this.onKeyUp(e));
    }

    getHandleAt(sx, sy) {
        if (this.state.selection.length !== 1) return null;
        const o = this.state.selection[0];
        if (o._type !== 'wall') return null;
        const s1 = this.camera.worldToScreen(o.x1, o.z1, this.canvas.width, this.canvas.height);
        const s2 = this.camera.worldToScreen(o.x2, o.z2, this.canvas.width, this.canvas.height);
        const threshold = 12;
        const handles = [
            { x: s1.x, y: s1.y, id: 'x1z1' },
            { x: s2.x, y: s1.y, id: 'x2z1' },
            { x: s1.x, y: s2.y, id: 'x1z2' },
            { x: s2.x, y: s2.y, id: 'x2z2' }
        ];
        for (const h of handles) {
            if (Math.hypot(sx - h.x, sy - h.y) < threshold) return h.id;
        }
        return null;
    }

    onMouseDown(e) {
        const world = this.camera.screenToWorld(e.clientX, e.clientY, this.canvas.width, this.canvas.height);
        const snapped = { x: Precision.round(world.x, this.state.gridSize), z: Precision.round(world.z, this.state.gridSize) };
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            this.state.isPanning = true;
        } else if (e.button === 0) {
            const handle = this.getHandleAt(e.clientX, e.clientY);
            if (handle) {
                this.state.isResizing = true;
                this.state.resizeHandle = handle;
            } else {
                const hit = this.objects.getAt(world.x, world.z, this.camera.zoom);
                if (hit) {
                    const isShift = this.state.keys['ShiftLeft'] || this.state.keys['ShiftRight'];
                    if (isShift) {
                        if (this.state.selection.includes(hit)) {
                            this.state.selection = this.state.selection.filter(o => o !== hit);
                        } else {
                            this.state.selection.push(hit);
                        }
                    } else {
                        if (!this.state.selection.includes(hit)) {
                            this.state.selection = [hit];
                        }
                    }
                    this.state.isDragging = true;
                    this.ui.updateProperties(true);
                } else {
                    if (this.state.mode === 'select') {
                        this.state.isRectSelecting = true;
                        this.state.rectStart = { x: e.clientX, y: e.clientY };
                        this.state.selection = [];
                    } else if (this.state.mode !== 'player') {
                        this.state.selection = [];
                        if (this.state.mode === 'wall') {
                            this.state.isDrawing = true;
                            this.state.drawStart = snapped;
                        } else {
                            this.placeObject(this.state.mode, snapped);
                        }
                    }
                    this.ui.updateProperties(true);
                }
            }
        }
        this.state.lastMouse = { x: e.clientX, y: e.clientY };
    }

    onMouseMove(e) {
        this.state.mousePos = { x: e.clientX, y: e.clientY };
        if (this.state.isPanning) {
            this.camera.pan(e.clientX - this.state.lastMouse.x, e.clientY - this.state.lastMouse.y);
        } else if (this.state.isResizing && this.state.selection.length === 1) {
            const world = this.camera.screenToWorld(e.clientX, e.clientY, this.canvas.width, this.canvas.height);
            const snapped = { x: Precision.round(world.x, this.state.gridSize), z: Precision.round(world.z, this.state.gridSize) };
            const o = this.state.selection[0];
            const h = this.state.resizeHandle;
            if (h.includes('x1')) o.x1 = snapped.x;
            if (h.includes('x2')) o.x2 = snapped.x;
            if (h.includes('z1')) o.z1 = snapped.z;
            if (h.includes('z2')) o.z2 = snapped.z;
            this.ui.updateProperties();
        } else if (this.state.isDragging && this.state.selection.length > 0) {
            const dx = (e.clientX - this.state.lastMouse.x) / this.camera.zoom;
            const dz = (e.clientY - this.state.lastMouse.y) / this.camera.zoom;
            this.state.selection.forEach(obj => this.moveObject(obj, dx, dz, false));
            this.ui.updateProperties();
        }
        this.state.lastMouse = { x: e.clientX, y: e.clientY };
        this.updateStats();
    }

    onMouseUp(e) {
        if (this.state.isRectSelecting) {
            const x1 = Math.min(this.state.rectStart.x, e.clientX);
            const y1 = Math.min(this.state.rectStart.y, e.clientY);
            const x2 = Math.max(this.state.rectStart.x, e.clientX);
            const y2 = Math.max(this.state.rectStart.y, e.clientY);
            const w1 = this.camera.screenToWorld(x1, y1, this.canvas.width, this.canvas.height);
            const w2 = this.camera.screenToWorld(x2, y2, this.canvas.width, this.canvas.height);
            
            this.state.selection = this.objects.data.objects.filter(o => {
                if (o._type === 'wall') {
                    return o.x1 >= w1.x && o.x2 <= w2.x && o.z1 >= w1.z && o.z2 <= w2.z;
                } else {
                    return o.x >= w1.x && o.x <= w2.x && o.z >= w1.z && o.z <= w2.z;
                }
            });
            this.ui.updateProperties(true);
        }
        if (this.state.isDrawing && this.state.drawStart) {
            const world = this.camera.screenToWorld(this.state.mousePos.x, this.state.mousePos.y, this.canvas.width, this.canvas.height);
            const end = { x: Precision.round(world.x, this.state.gridSize), z: Precision.round(world.z, this.state.gridSize) };
            if (Math.abs(end.x - this.state.drawStart.x) > 0.01 && Math.abs(end.z - this.state.drawStart.z) > 0.01) {
                const wallCount = ++this.state.counters.wall;
                const wall = this.objects.add('wall', {
                    x1: Math.min(this.state.drawStart.x, end.x),
                    z1: Math.min(this.state.drawStart.z, end.z),
                    x2: Math.max(this.state.drawStart.x, end.x),
                    z2: Math.max(this.state.drawStart.z, end.z),
                    y1: this.state.defaultY1, 
                    y2: this.state.defaultY2, 
                    xr: 1, yr: 1, _tx: 'walldefault', _c: 'wall_' + wallCount
                });
                this.state.selection = [wall];
                this.saveHistory();
                this.ui.updateProperties(true);
            }
        }
        if (this.state.isDragging || this.state.isResizing) this.saveHistory();
        this.state.isPanning = false;
        this.state.isDrawing = false;
        this.state.isDragging = false;
        this.state.isResizing = false;
        this.state.resizeHandle = null;
        this.state.isRectSelecting = false;
        this.state.rectStart = null;
        this.state.drawStart = null;
    }

    onWheel(e) {
        e.preventDefault();
        this.camera.zoomAt(e.deltaY, e.clientX, e.clientY, this.canvas.width, this.canvas.height);
        this.updateStats();
    }

    onKeyDown(e) {
        this.state.keys[e.code] = true;
        if (document.activeElement.tagName === 'INPUT') return;
        if (e.ctrlKey && e.code === 'KeyZ') this.undo();
        if (e.ctrlKey && e.code === 'KeyY') this.redo();
        if (e.code === 'Delete' || e.code === 'Backspace') this.deleteSelected();
        if (e.ctrlKey && e.code === 'KeyA') {
            e.preventDefault();
            this.state.selection = [...this.objects.data.objects];
            this.ui.updateProperties(true);
        }
        if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
            this.view3D.setPreset(e.code.replace('Digit', ''));
        }
    }

    onKeyUp(e) {
        this.state.keys[e.code] = false;
    }

    placeObject(mode, pos) {
        let props = { x: pos.x, z: pos.z, y1: this.state.defaultY1, y2: this.state.defaultY2 };
        if (mode === 'enemy') props = { ...props, id: this.state.counters.enemy++ };
        if (mode === 'magazine') props = { ...props, id: 'mag_' + (++this.state.counters.magazine), ammo: 30 };
        if (mode === 'medkit') props = { ...props, id: 'med_' + (++this.state.counters.medkit), health: 50 };
        const obj = this.objects.add(mode, props);
        this.state.selection = [obj];
        this.saveHistory();
        this.ui.updateProperties(true);
    }

    moveObject(obj, dx, dz, updateUI = true) {
        if (obj._type === 'wall') {
            obj.x1 = Precision.round(obj.x1 + dx, 0.1);
            obj.x2 = Precision.round(obj.x2 + dx, 0.1);
            obj.z1 = Precision.round(obj.z1 + dz, 0.1);
            obj.z2 = Precision.round(obj.z2 + dz, 0.1);
        } else {
            obj.x = Precision.round(obj.x + dx, 0.1);
            obj.z = Precision.round(obj.z + dz, 0.1);
        }
        if (updateUI) this.ui.updateProperties();
    }

    deleteSelected() {
        if (this.state.selection.length === 0) return;
        this.state.selection.forEach(obj => this.objects.remove(obj));
        this.state.selection = [];
        this.saveHistory();
        this.ui.updateProperties(true);
    }

    saveHistory() {
        const snapshot = JSON.stringify(this.objects.serialize());
        if (this.historyPointer < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyPointer + 1);
        }
        this.history.push(snapshot);
        this.historyPointer++;
        if (this.history.length > 50) {
            this.history.shift();
            this.historyPointer--;
        }
    }

    undo() {
        if (this.historyPointer > 0) {
            this.historyPointer--;
            this.objects.deserialize(JSON.parse(this.history[this.historyPointer]));
            this.syncCounters();
            this.state.selection = [];
            this.ui.updateProperties(true);
        }
    }

    redo() {
        if (this.historyPointer < this.history.length - 1) {
            this.historyPointer++;
            this.objects.deserialize(JSON.parse(this.history[this.historyPointer]));
            this.syncCounters();
            this.state.selection = [];
            this.ui.updateProperties(true);
        }
    }

    updateStats() {
        const w = this.camera.screenToWorld(this.state.mousePos.x, this.state.mousePos.y, this.canvas.width, this.canvas.height);
        document.getElementById('stat-mode').innerText = this.state.mode.charAt(0).toUpperCase() + this.state.mode.slice(1);
        document.getElementById('stat-coords').innerText = `${w.x.toFixed(2)}, ${w.z.toFixed(2)}`;
        document.getElementById('stat-zoom').innerText = `${Math.round(this.camera.zoom * 5)}%`;
        document.getElementById('stat-grid').innerText = this.state.gridSize;
    }

    syncCounters() {
        const data = this.objects.data;
        const types = ['wall', 'enemy', 'magazine', 'medkit'];
        types.forEach(type => {
            let max = 0;
            data.objects.filter(o => o._type === type).forEach(o => {
                const label = type === 'wall' ? o._c : o.id;
                if (typeof label === 'number') {
                    max = Math.max(max, label + 1);
                } else if (typeof label === 'string') {
                    if (label.includes('_')) {
                        const parts = label.split('_');
                        const num = parseInt(parts[parts.length - 1]);
                        if (!isNaN(num)) max = Math.max(max, num);
                    } else {
                        const num = parseInt(label);
                        if (!isNaN(num)) max = Math.max(max, num + 1);
                    }
                }
            });
            this.state.counters[type] = max;
        });
    }

    loop() {
        if (this.state.keys['ArrowLeft']) this.camera.velX -= this.camera.speed;
        if (this.state.keys['ArrowRight']) this.camera.velX += this.camera.speed;
        if (this.state.keys['ArrowUp']) this.camera.velZ -= this.camera.speed;
        if (this.state.keys['ArrowDown']) this.camera.velZ += this.camera.speed;
        this.camera.update();
        this.view3D.update(this.state.keys);
        this.renderer.draw(this.objects, this.state);
        this.view3D.draw(this.objects, this.state);
        requestAnimationFrame(() => this.loop());
    }
}
