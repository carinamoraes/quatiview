import Run from '../index.js';
import Net from '../../../Net.js';

export default async ({ ctx }) => {
    window.ctx = ctx;
    const main = ctx.global.get('main');
    const { consts } = ctx;
    for (let item of consts) {
        const addr = Net.memory.allocate(item.bytes.length);
        item.value = addr;
        item.bytes.forEach((byte, i) => Net.memory.write(addr + i, byte));
    }
    await Run({
        instruction: 'call',
        fn: main,
        args: [],
        type: main.returnType,
        ctx,
    });
    for (let item of consts) {
        Net.memory.free(item.value);
        item.value = null;
    }

    // Liberar variáveis globais (incluindo arrays)
    if (ctx.globalVars) {
        for (let item of ctx.globalVars) {
            if (item.addr && item.addr.length > 0) {
                Net.memory.free(item.addr[0]);
            }
        }
        ctx.globalVars = [];
    }
};
