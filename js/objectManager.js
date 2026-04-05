/* &copy; 2026 yohanesokta */
import { ColorUtils } from './utils.js';

export class ObjectManager {
    constructor() {
        this.data = {
            objects: [],
            player: { x: 0, z: 0, y1: 0, y2: 1.0, _type: 'player', _color: '#ff00ff', id: 'player_1' }
        };
    }

    clear() {
        this.data.objects = [];
        this.data.player = { x: 0, z: 0, y1: 0, y2: 1.0, _type: 'player', _color: '#ff00ff', id: 'player_1' };
    }

    add(type, props) {
        if (type === 'player') return this.data.player;
        const obj = { 
            _type: type, 
            _color: ColorUtils.random(), 
            ...props 
        };
        this.data.objects.push(obj);
        return obj;
    }

    remove(obj) {
        if (obj._type === 'player') return;
        const idx = this.data.objects.indexOf(obj);
        if (idx !== -1) this.data.objects.splice(idx, 1);
    }

    moveUp(obj) {
        const idx = this.data.objects.indexOf(obj);
        if (idx !== -1 && idx < this.data.objects.length - 1) {
            [this.data.objects[idx], this.data.objects[idx + 1]] = [this.data.objects[idx + 1], this.data.objects[idx]];
            return true;
        }
        return false;
    }

    moveDown(obj) {
        const idx = this.data.objects.indexOf(obj);
        if (idx > 0) {
            [this.data.objects[idx], this.data.objects[idx - 1]] = [this.data.objects[idx - 1], this.data.objects[idx]];
            return true;
        }
        return false;
    }

    getAt(wx, wz, zoom) {
        const threshold = 12 / zoom; 
        const p = this.data.player;
        if (Math.hypot(wx - p.x, wz - p.z) < threshold) return p;

        // Iterate backwards to hit top-most object first
        for (let i = this.data.objects.length - 1; i >= 0; i--) {
            const o = this.data.objects[i];
            if (o._type === 'wall') {
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
        return null;
    }

    serialize() {
        const result = {
            player: { ...this.data.player },
            walls: [],
            enemies: [],
            magazines: [],
            medkits: []
        };

        this.data.objects.forEach(o => {
            const { _type, ...props } = o;
            if (o._type === 'wall') {
                result.walls.push({ ...props });
            } else if (o._type === 'enemy') {
                const { y1, y2, ...enemyProps } = props;
                result.enemies.push({ ...enemyProps });
            } else if (o._type === 'magazine') {
                const { y1, y2, id, ...magProps } = props;
                result.magazines.push({ ...magProps });
            } else if (o._type === 'medkit') {
                const { y1, y2, id, ...medProps } = props;
                result.medkits.push({ ...medProps });
            }
        });

        return result;
    }

    deserialize(json) {
        this.clear();
        if (json.player) {
            this.data.player = { ...this.data.player, ...json.player };
        }
        
        if (json.objects) {
            this.data.objects = json.objects.map(o => ({
                ...o,
                _color: o._color || ColorUtils.random()
            }));
        } else {
            // New format (walls, enemies, magazines, medkits)
            const collections = {
                walls: 'wall',
                enemies: 'enemy',
                magazines: 'magazine',
                medkits: 'medkit'
            };
            for (const [key, type] of Object.entries(collections)) {
                if (json[key]) {
                    json[key].forEach(o => {
                        const obj = { 
                            ...o, 
                            _type: type,
                            _color: o._color || ColorUtils.random()
                        };
                        // Ensure required properties for internal use
                        if (type !== 'wall') {
                            if (obj.y1 === undefined) obj.y1 = this.data.player.y1;
                            if (obj.y2 === undefined) obj.y2 = this.data.player.y2;
                        }
                        this.data.objects.push(obj);
                    });
                }
            }
        }
    }
}
