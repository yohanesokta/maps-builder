/**
 * MAPBUILDER PRO - CORE APPLICATION
 * Coordinate System:
 * Plane: X (horizontal), Z (vertical)
 * Height: Y
 */

const Precision = {
    round: (val, step = 0.1) => {
        const inv = 1 / step;
        return Math.round(val * inv) / inv;
    }
};

const ColorUtils = {
    random: () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
};

/**
 * CAMERA CLASS
 */
class Camera {
    constructor() {
        this.x = 0;
        this.z = 0; // Camera Z is the top-down vertical
        this.zoom = 20;
        this.minZoom = 2;
        this.maxZoom = 500;
        
        this.velX = 0;
        this.velZ = 0;
        this.friction = 0.85; // Slightly higher friction for tighter stop
        this.speed = 0.05; // Significant reduction in speed
    }

    update() {
        if (Math.abs(this.velX) > 0.001) this.x += this.velX;
        if (Math.abs(this.velZ) > 0.001) this.z += this.velZ;
        
        this.velX *= this.friction;
        this.velZ *= this.friction;
    }

    screenToWorld(sx, sy, canvasWidth, canvasHeight) {
        return {
            x: (sx - canvasWidth / 2) / this.zoom + this.x,
            z: (sy - canvasHeight / 2) / this.zoom + this.z
        };
    }

    worldToScreen(wx, wz, canvasWidth, canvasHeight) {
        return {
            x: (wx - this.x) * this.zoom + canvasWidth / 2,
            y: (wz - this.z) * this.zoom + canvasHeight / 2
        };
    }

    pan(dx, dz) {
        this.x -= dx / this.zoom;
        this.z -= dz / this.zoom;
    }

    zoomAt(delta, sx, sy, canvasWidth, canvasHeight) {
        const before = this.screenToWorld(sx, sy, canvasWidth, canvasHeight);
        // Smoother zoom: 0.96 and 1.04 instead of 0.9 and 1.1
        this.zoom = Math.min(Math.max(this.zoom * (delta > 0 ? 0.96 : 1.04), this.minZoom), this.maxZoom);
        const after = this.screenToWorld(sx, sy, canvasWidth, canvasHeight);
        this.x += before.x - after.x;
        this.z += before.z - after.z;
    }
}

/**
 * OBJECT MANAGER
 */
class ObjectManager {
    constructor() {
        this.data = {
            walls: [],
            enemies: [],
            magazines: [],
            medkits: []
        };
    }

    clear() {
        this.data = { walls: [], enemies: [], magazines: [], medkits: [] };
    }

    add(type, props) {
        const obj = { 
            _type: type, 
            _color: ColorUtils.random(), 
            ...props 
        };
        this.data[type + 's'].push(obj);
        return obj;
    }

    remove(obj) {
        const collection = this.data[obj._type + 's'];
        const idx = collection.indexOf(obj);
        if (idx !== -1) collection.splice(idx, 1);
    }

    getAt(wx, wz, zoom) {
        const threshold = 12 / zoom; 

        const types = ['medkits', 'magazines', 'enemies', 'walls'];
        for (const type of types) {
            const list = this.data[type];
            for (let i = list.length - 1; i >= 0; i--) {
                const o = list[i];
                if (type === 'walls') {
                    // Normalize for hit detection
                    const minX = Math.min(o.x1, o.x2);
                    const maxX = Math.max(o.x1, o.x2);
                    const minZ = Math.min(o.z1, o.z2);
                    const maxZ = Math.max(o.z1, o.z2);
                    if (wx >= minX && wx <= maxX && wz >= minZ && wz <= maxZ) return o;
                } else {
                    const dist = Math.hypot(wx - o.x, wz - o.z);
                    if (dist < threshold) return o;
                }
            }
        }
        return null;
    }

    serialize() {
        return JSON.parse(JSON.stringify(this.data));
    }

    deserialize(json) {
        this.clear();
        for (const key in json) {
            if (this.data[key]) {
                const type = key.slice(0, -1);
                // Ensure mapping from loaded keys to our internal keys if they differ
                // Prompt specified WALL has x1, y1, z1, x2, y2, z2. 
                // We map Plane(X,Z) and Height(Y).
                this.data[key] = json[key].map(o => ({ ...o, _type: type }));
            }
        }
    }
}

/**
 * RENDERER
 */
class Renderer {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = camera;
    }

    draw(objectManager, state) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawGrid(state.gridSize);

        const data = objectManager.data;
        const selection = state.selection;

        // Draw Walls
        data.walls.forEach(w => this.drawWall(w, selection.includes(w)));

        // Draw point objects
        data.enemies.forEach(e => this.drawEnemy(e, selection.includes(e)));
        data.magazines.forEach(m => this.drawMagazine(m, selection.includes(m)));
        data.medkits.forEach(k => this.drawMedkit(k, selection.includes(k)));

        // Draw Previews
        this.drawPreview(state);
        this.drawSelectionBox(state);
    }

    drawSelectionBox(state) {
        if (!state.isRectSelecting || !state.rectStart) return;
        const ctx = this.ctx;
        const x = Math.min(state.rectStart.x, state.mousePos.x);
        const y = Math.min(state.rectStart.y, state.mousePos.y);
        const w = Math.abs(state.rectStart.x - state.mousePos.x);
        const h = Math.abs(state.rectStart.y - state.mousePos.y);

        ctx.strokeStyle = '#007acc';
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = 'rgba(0, 122, 204, 0.1)';
        ctx.fillRect(x, y, w, h);
        ctx.setLineDash([]);
    }

    drawGrid(gridSize) {
        const ctx = this.ctx;
        const cam = this.camera;
        const w = this.canvas.width;
        const h = this.canvas.height;

        const tl = cam.screenToWorld(0, 0, w, h);
        const br = cam.screenToWorld(w, h, w, h);

        const startX = Math.floor(tl.x / gridSize) * gridSize;
        const endX = Math.ceil(br.x / gridSize) * gridSize;
        const startZ = Math.floor(tl.z / gridSize) * gridSize;
        const endZ = Math.ceil(br.z / gridSize) * gridSize;

        ctx.lineWidth = 1;
        for (let x = startX; x <= endX; x += gridSize) {
            const s = cam.worldToScreen(x, 0, w, h);
            ctx.strokeStyle = Math.abs(x) < 0.01 ? '#666' : '#2a2a2a';
            ctx.beginPath(); ctx.moveTo(s.x, 0); ctx.lineTo(s.x, h); ctx.stroke();
        }
        for (let z = startZ; z <= endZ; z += gridSize) {
            const s = cam.worldToScreen(0, z, w, h);
            ctx.strokeStyle = Math.abs(z) < 0.01 ? '#666' : '#2a2a2a';
            ctx.beginPath(); ctx.moveTo(0, s.y); ctx.lineTo(w, s.y); ctx.stroke();
        }
    }

    drawWall(w, isSelected) {
        const s1 = this.camera.worldToScreen(w.x1, w.z1, this.canvas.width, this.canvas.height);
        const s2 = this.camera.worldToScreen(w.x2, w.z2, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = w._color + '44';
        this.ctx.strokeStyle = isSelected ? '#fff' : w._color;
        this.ctx.lineWidth = isSelected ? 3 : 2;
        
        const rw = s2.x - s1.x;
        const rh = s2.y - s1.y;
        
        this.ctx.fillRect(s1.x, s1.y, rw, rh);
        this.ctx.strokeRect(s1.x, s1.y, rw, rh);

        if (isSelected) this.drawHandles(s1, s2);
    }

    drawEnemy(e, isSelected) {
        const s = this.camera.worldToScreen(e.x, e.z, this.canvas.width, this.canvas.height);
        const radius = 8;
        this.ctx.beginPath();
        this.ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = e._color;
        this.ctx.fill();
        this.ctx.strokeStyle = isSelected ? '#fff' : '#000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawMagazine(m, isSelected) {
        const s = this.camera.worldToScreen(m.x, m.z, this.canvas.width, this.canvas.height);
        const size = 10;
        this.ctx.save();
        this.ctx.translate(s.x, s.y);
        this.ctx.rotate(Math.PI / 4);
        this.ctx.fillStyle = m._color;
        this.ctx.fillRect(-size/2, -size/2, size, size);
        this.ctx.strokeStyle = isSelected ? '#fff' : '#000';
        this.ctx.strokeRect(-size/2, -size/2, size, size);
        this.ctx.restore();
    }

    drawMedkit(k, isSelected) {
        const s = this.camera.worldToScreen(k.x, k.z, this.canvas.width, this.canvas.height);
        const size = 12;
        this.ctx.beginPath();
        this.ctx.moveTo(s.x, s.y - size/2);
        this.ctx.lineTo(s.x + size/2, s.y + size/2);
        this.ctx.lineTo(s.x - size/2, s.y + size/2);
        this.ctx.closePath();
        this.ctx.fillStyle = k._color;
        this.ctx.fill();
        this.ctx.strokeStyle = isSelected ? '#fff' : '#000';
        this.ctx.stroke();
    }

    drawHandles(s1, s2) {
        const size = 6;
        this.ctx.fillStyle = "#fff";
        const points = [
            [s1.x, s1.y], [s2.x, s1.y], [s1.x, s2.y], [s2.x, s2.y]
        ];
        points.forEach(p => this.ctx.fillRect(p[0]-size/2, p[1]-size/2, size, size));
    }

    drawPreview(state) {
        if (!state.isDrawing || !state.drawStart) return;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const worldPos = this.camera.screenToWorld(state.mousePos.x, state.mousePos.y, w, h);
        const snapped = { x: Precision.round(worldPos.x, state.gridSize), z: Precision.round(worldPos.z, state.gridSize) };
        
        if (state.mode === 'wall') {
            this.drawWall({ x1: state.drawStart.x, z1: state.drawStart.z, x2: snapped.x, z2: snapped.z, _color: '#00ff00' }, false);
        }
    }
}

/**
 * 3D VIEW RENDERER (WIREFRAME)
 */
class View3D {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.yaw = 0.5;
        this.pitch = 0.5;
        this.zoom = 40;
        
        this.camX = 0;
        this.camZ = 0;
        this.moveSpeed = 0.2;
        
        this.isRotating = false;
        this.lastMouse = { x: 0, y: 0 };
        this._lastSelection = [];
        
        this.setupInputs();
    }

    setupInputs() {
        this.canvas.addEventListener('mousedown', e => {
            this.isRotating = true;
            this.lastMouse = { x: e.clientX, y: e.clientY };
        });
        window.addEventListener('mousemove', e => {
            if (!this.isRotating) return;
            const dx = e.clientX - this.lastMouse.x;
            const dy = e.clientY - this.lastMouse.y;
            this.yaw += dx * 0.01;
            this.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.pitch + dy * 0.01));
            this.lastMouse = { x: e.clientX, y: e.clientY };
        });
        window.addEventListener('mouseup', () => this.isRotating = false);
    }

    setPreset(n) {
        switch(n) {
            case '1': // Top
                this.yaw = 0; this.pitch = -Math.PI/2; break;
            case '2': // Front
                this.yaw = 0; this.pitch = 0; break;
            case '3': // Side
                this.yaw = Math.PI/2; this.pitch = 0; break;
            case '4': // Isometric
                this.yaw = 0.78; this.pitch = 0.5; break;
        }
    }

    resetView() {
        this.camX = 0;
        this.camZ = 0;
        this.yaw = 0.5;
        this.pitch = 0.5;
        this.zoom = 40;
    }

    update(keys) {
        if (keys['KeyW']) {
            this.camX += Math.sin(this.yaw) * this.moveSpeed;
            this.camZ -= Math.cos(this.yaw) * this.moveSpeed;
        }
        if (keys['KeyS']) {
            this.camX -= Math.sin(this.yaw) * this.moveSpeed;
            this.camZ += Math.cos(this.yaw) * this.moveSpeed;
        }
        if (keys['KeyA']) {
            this.camX -= Math.cos(this.yaw) * this.moveSpeed;
            this.camZ -= Math.sin(this.yaw) * this.moveSpeed;
        }
        if (keys['KeyD']) {
            this.camX += Math.cos(this.yaw) * this.moveSpeed;
            this.camZ += Math.sin(this.yaw) * this.moveSpeed;
        }
    }

    project(x, y, z, cx = 0, cz = 0) {
        const tx = (x - cx) - this.camX;
        const tz = (z - cz) - this.camZ;

        // Simple 3D to 2D projection
        // Rotate around Y (yaw)
        let x1 = tx * Math.cos(this.yaw) - tz * Math.sin(this.yaw);
        let z1 = tx * Math.sin(this.yaw) + tz * Math.cos(this.yaw);
        
        // Rotate around X (pitch)
        let y2 = y * Math.cos(this.pitch) - z1 * Math.sin(this.pitch);
        let z2 = y * Math.sin(this.pitch) + z1 * Math.cos(this.pitch);
        
        // Perspective (or just scale for orthographic-ish preview)
        const factor = 200 / (z2 + 400); 
        return {
            x: x1 * this.zoom * factor + this.canvas.width / 2,
            y: -y2 * this.zoom * factor + this.canvas.height / 2
        };
    }

    draw(objectManager, state) {
        const ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        
        const selection = state.selection;
        
        // Reactive Reset: Center camera when selection changes
        const selectionSame = this._lastSelection.length === selection.length &&
                              this._lastSelection.every((v, i) => v === selection[i]);
                              
        if (!selectionSame) {
            this.resetView();
            this._lastSelection = [...selection];
        }

        if (selection.length === 0) return;

        // Calculate Selection Center
        let centerX = 0, centerZ = 0;
        selection.forEach(o => {
            if (o._type === 'wall') {
                centerX += (o.x1 + o.x2) / 2;
                centerZ += (o.z1 + o.z2) / 2;
            } else {
                centerX += o.x;
                centerZ += o.z;
            }
        });
        centerX /= selection.length;
        centerZ /= selection.length;

        // Draw Grid relative to center (World-aligned)
        const range = 10;
        const startX = Math.floor(centerX) - range;
        const endX = Math.floor(centerX) + range;
        const startZ = Math.floor(centerZ) - range;
        const endZ = Math.floor(centerZ) + range;

        for(let x = startX; x <= endX; x++) {
            this.drawLine(x, 0, startZ, x, 0, endZ, '#222', centerX, centerZ);
        }
        for(let z = startZ; z <= endZ; z++) {
            this.drawLine(startX, 0, z, endX, 0, z, '#222', centerX, centerZ);
        }

        selection.forEach(selected => {
            const color = selected._color;
            if (selected._type === 'wall') {
                this.drawRect3D(selected.x1, selected.x2, selected.z1, selected.z2, selected.y1, color, centerX, centerZ);
                this.drawRect3D(selected.x1, selected.x2, selected.z1, selected.z2, selected.y2, color, centerX, centerZ);
                this.drawLine(selected.x1, selected.y1, selected.z1, selected.x1, selected.y2, selected.z1, color, centerX, centerZ);
                this.drawLine(selected.x2, selected.y1, selected.z1, selected.x2, selected.y2, selected.z1, color, centerX, centerZ);
                this.drawLine(selected.x1, selected.y1, selected.z2, selected.x1, selected.y2, selected.z2, color, centerX, centerZ);
                this.drawLine(selected.x2, selected.y1, selected.z2, selected.x2, selected.y2, selected.z2, color, centerX, centerZ);
            } else {
                const size = (selected._type === 'enemy') ? 0.8 : 0.4;
                this.drawEntity(selected.x, selected.z, color, size, centerX, centerZ, selected.y1, selected.y2);
            }
        });
    }

    drawRect3D(x1, x2, z1, z2, y, color, cx = 0, cz = 0) {
        const p1 = this.project(x1, y, z1, cx, cz);
        const p2 = this.project(x2, y, z1, cx, cz);
        const p3 = this.project(x2, y, z2, cx, cz);
        const p4 = this.project(x1, y, z2, cx, cz);
        
        this.ctx.strokeStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.lineTo(p3.x, p3.y);
        this.ctx.lineTo(p4.x, p4.y);
        this.ctx.closePath();
        this.ctx.stroke();
    }

    drawLine(x1, y1, z1, x2, y2, z2, color, cx = 0, cz = 0) {
        const p1 = this.project(x1, y1, z1, cx, cz);
        const p2 = this.project(x2, y2, z2, cx, cz);
        this.ctx.strokeStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
    }

    drawEntity(x, z, color, size, cx = 0, cz = 0, y1 = 0, y2 = 1.0) {
        this.drawLine(x - size/2, y1, z, x + size/2, y1, z, color, cx, cz);
        this.drawLine(x, y1, z - size/2, x, y1, z + size/2, color, cx, cz);
        this.drawLine(x, y1, z, x, y2, z, color, cx, cz);
    }
}


/**
 * EDITOR ENGINE
 */
class Editor {
    constructor() {
        this.canvas = document.getElementById('main-canvas');
        this.view3DCanvas = document.getElementById('view-3d-canvas');
        this.camera = new Camera();
        this.objects = new ObjectManager();
        this.renderer = new Renderer(this.canvas, this.camera);
        this.view3D = new View3D(this.view3DCanvas);
        
        this.state = {
            mode: 'wall',
            gridSize: 1.0,
            defaultY1: 0,
            defaultY2: 1.0,
            selection: [],
            isDrawing: false,
            isPanning: false,
            isDragging: false,
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

    onMouseDown(e) {
        const world = this.camera.screenToWorld(e.clientX, e.clientY, this.canvas.width, this.canvas.height);
        const snapped = { x: Precision.round(world.x, this.state.gridSize), z: Precision.round(world.z, this.state.gridSize) };

        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            this.state.isPanning = true;
        } else if (e.button === 0) {
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
                } else {
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
        this.state.lastMouse = { x: e.clientX, y: e.clientY };
    }

    onMouseMove(e) {
        this.state.mousePos = { x: e.clientX, y: e.clientY };
        
        if (this.state.isPanning) {
            this.camera.pan(e.clientX - this.state.lastMouse.x, e.clientY - this.state.lastMouse.y);
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

            const sel = [];
            const data = this.objects.data;
            
            // Check all objects
            ['walls', 'enemies', 'magazines', 'medkits'].forEach(type => {
                data[type].forEach(o => {
                    if (type === 'walls') {
                        if (o.x1 >= w1.x && o.x2 <= w2.x && o.z1 >= w1.z && o.z2 <= w2.z) sel.push(o);
                    } else {
                        if (o.x >= w1.x && o.x <= w2.x && o.z >= w1.z && o.z <= w2.z) sel.push(o);
                    }
                });
            });
            this.state.selection = sel;
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
                    xr: 1, yr: 1, _tx: 'default', _c: 'wall_' + wallCount
                });
                this.state.selection = [wall];
                this.saveHistory();
                this.ui.updateProperties(true);
            }
        }

        if (this.state.isDragging) this.saveHistory();

        this.state.isPanning = false;
        this.state.isDrawing = false;
        this.state.isDragging = false;
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
        
        // Select All
        if (e.ctrlKey && e.code === 'KeyA') {
            e.preventDefault();
            const all = [];
            const data = this.objects.data;
            ['walls', 'enemies', 'magazines', 'medkits'].forEach(t => all.push(...data[t]));
            this.state.selection = all;
            this.ui.updateProperties(true);
        }

        // Viewport Presets
        if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
            this.view3D.setPreset(e.code.replace('Digit', ''));
        }
    }

    onKeyUp(e) {
        this.state.keys[e.code] = false;
    }

    placeObject(mode, pos) {
        let props = { x: pos.x, z: pos.z, y1: this.state.defaultY1, y2: this.state.defaultY2 };
        if (mode === 'enemy') props = { ...props, id: 'enemy_' + (++this.state.counters.enemy) };
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
        const snapshot = JSON.stringify(this.objects.data);
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
        const types = { wall: 'walls', enemy: 'enemies', magazine: 'magazines', medkit: 'medkits' };
        
        for (const [type, key] of Object.entries(types)) {
            let max = 0;
            data[key].forEach(o => {
                const label = type === 'wall' ? o._c : o.id;
                if (label && typeof label === 'string' && label.includes('_')) {
                    const parts = label.split('_');
                    const num = parseInt(parts[parts.length - 1]);
                    if (!isNaN(num)) max = Math.max(max, num);
                }
            });
            this.state.counters[type] = max;
        }
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

/**
 * UI MANAGER
 */
class UIManager {
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
            console.warn('Failed to load loader.json, using manual texture input only.');
        }
    }

    init() {
        const e = this.editor;
        
        document.getElementById('mode-selector').addEventListener('click', (ev) => {
            if (ev.target.dataset.mode) {
                document.querySelectorAll('#mode-selector button').forEach(b => b.classList.remove('active'));
                ev.target.classList.add('active');
                e.state.mode = ev.target.dataset.mode;
                e.updateStats();
            }
        });

        document.getElementById('grid-snap').addEventListener('input', ev => {
            e.state.gridSize = parseFloat(ev.target.value) || 0.1;
        });

        document.getElementById('default-z1').addEventListener('input', ev => {
            e.state.defaultY1 = parseFloat(ev.target.value) || 0;
        });

        document.getElementById('default-z2').addEventListener('input', ev => {
            e.state.defaultY2 = parseFloat(ev.target.value) || 0;
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
            'health', 'med-x', 'med-z'
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
                    // Sync select if exists
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
                else if (id === 'id') s.id = val;
                else if (id === 'ammo') s.ammo = val;
                else if (id === 'health') s.health = val;
                else s[id] = val;

                e.saveHistory();
            });
        });
    }

    updateProperties(reset3D = false) {
        if (reset3D) this.editor.view3D.resetView();
        const selection = this.editor.state.selection;
        const panel = document.getElementById('object-properties');
        const empty = document.getElementById('no-selection');

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
        document.getElementById('props-' + s._type).style.display = 'block';

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
}

new Editor();
