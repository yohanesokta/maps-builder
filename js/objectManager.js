/* &copy; 2026 yohanesokta */
import { ColorUtils } from './utils.js';

export class ObjectManager {
    constructor() {
        this.data = {
            walls: [],
            enemies: [],
            magazines: [],
            medkits: [],
            player: { x: 0, z: 0, y1: 0, y2: 1.0, _type: 'player', _color: '#ff00ff', id: 'player_1' }
        };
    }

    clear() {
        this.data = { 
            walls: [], enemies: [], magazines: [], medkits: [],
            player: { x: 0, z: 0, y1: 0, y2: 1.0, _type: 'player', _color: '#ff00ff', id: 'player_1' }
        };
    }

    add(type, props) {
        if (type === 'player') return this.data.player;
        const obj = { 
            _type: type, 
            _color: ColorUtils.random(), 
            ...props 
        };
        const key = type === 'enemy' ? 'enemies' : type + 's';
        this.data[key].push(obj);
        return obj;
    }

    remove(obj) {
        if (obj._type === 'player') return;
        const key = obj._type === 'enemy' ? 'enemies' : obj._type + 's';
        const collection = this.data[key];
        const idx = collection.indexOf(obj);
        if (idx !== -1) collection.splice(idx, 1);
    }

    getAt(wx, wz, zoom) {
        const threshold = 12 / zoom; 
        const p = this.data.player;
        if (Math.hypot(wx - p.x, wz - p.z) < threshold) return p;

        const types = ['medkits', 'magazines', 'enemies', 'walls'];
        for (const type of types) {
            const list = this.data[type];
            for (let i = list.length - 1; i >= 0; i--) {
                const o = list[i];
                if (type === 'walls') {
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
            if (key === 'player') {
                this.data.player = { ...this.data.player, ...json[key] };
            } else if (this.data[key]) {
                const type = key === 'enemies' ? 'enemy' : key.slice(0, -1);
                this.data[key] = json[key].map(o => ({ ...o, _type: type }));
            }
        }
    }
}
