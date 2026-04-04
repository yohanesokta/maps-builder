/* &copy; 2026 yohanesokta */
export const Precision = {
    round: (val, step = 0.1) => {
        const inv = 1 / step;
        return Math.round(val * inv) / inv;
    }
};

export const ColorUtils = {
    random: () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
};
