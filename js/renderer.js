/* &copy; 2026 yohanesokta */
import { Precision } from './utils.js';

export class Renderer {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = camera;
    }

    draw(objectManager, state) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawGrid(state.gridSize);

        const selection = state.selection;

        // Player is always drawn first (or could be part of objects)
        const p = objectManager.data.player;
        this.drawPlayer(p, selection.includes(p));

        // Draw objects in order (lower index = bottom, higher index = top)
        objectManager.data.objects.forEach(obj => {
            const isSelected = selection.includes(obj);
            switch(obj._type) {
                case 'wall': this.drawWall(obj, isSelected); break;
                case 'enemy': this.drawEnemy(obj, isSelected); break;
                case 'magazine': this.drawMagazine(obj, isSelected); break;
                case 'medkit': this.drawMedkit(obj, isSelected); break;
            }
        });

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

        if (!gridSize || gridSize <= 0) gridSize = 1.0;

        const tl = cam.screenToWorld(0, 0, w, h);
        const br = cam.screenToWorld(w, h, w, h);

        const startX = Math.floor(tl.x / gridSize) * gridSize;
        const endX = Math.ceil(br.x / gridSize) * gridSize;
        const startZ = Math.floor(tl.z / gridSize) * gridSize;
        const endZ = Math.ceil(br.z / gridSize) * gridSize;

        ctx.lineWidth = 1;
        
        for (let x = startX; x <= endX; x += gridSize) {
            const s = cam.worldToScreen(x, 0, w, h);
            ctx.strokeStyle = Math.abs(x) < 0.01 ? '#888' : '#333';
            ctx.beginPath();
            ctx.moveTo(s.x, 0);
            ctx.lineTo(s.x, h);
            ctx.stroke();
            if (x > startX + 1000 * gridSize) break;
        }
        
        for (let z = startZ; z <= endZ; z += gridSize) {
            const s = cam.worldToScreen(0, z, w, h);
            ctx.strokeStyle = Math.abs(z) < 0.01 ? '#888' : '#333';
            ctx.beginPath();
            ctx.moveTo(0, s.y);
            ctx.lineTo(w, s.y);
            ctx.stroke();
            if (z > startZ + 1000 * gridSize) break;
        }
    }

    drawPlayer(p, isSelected) {
        const s = this.camera.worldToScreen(p.x, p.z, this.canvas.width, this.canvas.height);
        const radius = 10;
        this.ctx.beginPath();
        this.ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = p._color;
        this.ctx.fill();
        
        this.ctx.strokeStyle = isSelected ? '#fff' : '#000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.arc(s.x, s.y, radius + 3, 0, Math.PI * 2);
        this.ctx.strokeStyle = isSelected ? '#fff' : 'rgba(255,255,255,0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
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
