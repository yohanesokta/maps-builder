/* &copy; 2026 yohanesokta */
export class View3D {
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
            case '1': 
                this.yaw = 0; this.pitch = -Math.PI/2; break;
            case '2': 
                this.yaw = 0; this.pitch = 0; break;
            case '3': 
                this.yaw = Math.PI/2; this.pitch = 0; break;
            case '4': 
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
        
        let x1 = tx * Math.cos(this.yaw) - tz * Math.sin(this.yaw);
        let z1 = tx * Math.sin(this.yaw) + tz * Math.cos(this.yaw);
        let y2 = y * Math.cos(this.pitch) - z1 * Math.sin(this.pitch);
        let z2 = y * Math.sin(this.pitch) + z1 * Math.cos(this.pitch);
        
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
        const selectionSame = this._lastSelection.length === selection.length &&
                              this._lastSelection.every((v, i) => v === selection[i]);
                              
        if (!selectionSame) {
            this.resetView();
            this._lastSelection = [...selection];
        }

        if (selection.length === 0) return;

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

        const p = objectManager.data.player;
        if (selection.includes(p)) {
            this.drawEllipsoid(p.x, p.z, p._color, 0.6, centerX, centerZ, p.y1, p.y2);
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
            } else if (selected._type !== 'player') {
                const size = (selected._type === 'enemy') ? 0.8 : 0.4;
                this.drawEntity(selected.x, selected.z, color, size, centerX, centerZ, selected.y1, selected.y2);
            }
        });
    }

    drawEllipsoid(x, z, color, radius, cx, cz, y1, y2) {
        this.ctx.strokeStyle = color;
        const segments = 8;
        const height = y2 - y1;
        const cy = y1 + height / 2;
        
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI;
            this.ctx.beginPath();
            for (let j = 0; j <= 16; j++) {
                const phi = (j / 16) * Math.PI * 2;
                const rx = radius * Math.cos(phi) * Math.sin(angle);
                const rz = radius * Math.sin(phi);
                const ry = (height/2) * Math.cos(phi) * Math.cos(angle);
                const proj = this.project(x + rx, cy + ry, z + rz, cx, cz);
                if (j === 0) this.ctx.moveTo(proj.x, proj.y);
                else this.ctx.lineTo(proj.x, proj.y);
            }
            this.ctx.stroke();
        }
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
