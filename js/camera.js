/* &copy; 2026 yohanesokta */
export class Camera {
    constructor() {
        this.x = 0;
        this.z = 0; 
        this.zoom = 20;
        this.minZoom = 2;
        this.maxZoom = 500;
        
        this.velX = 0;
        this.velZ = 0;
        this.friction = 0.85; 
        this.speed = 0.05; 
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
        this.zoom = Math.min(Math.max(this.zoom * (delta > 0 ? 0.96 : 1.04), this.minZoom), this.maxZoom);
        const after = this.screenToWorld(sx, sy, canvasWidth, canvasHeight);
        this.x += before.x - after.x;
        this.z += before.z - after.z;
    }
}
