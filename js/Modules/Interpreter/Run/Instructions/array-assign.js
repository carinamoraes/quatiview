import Net from '../../../Net.js';
import solve from './Support/solve.js';

export default async ({ ctx, dst, values }) => {
    if (!dst.isArray || !dst.addr || dst.addr.length === 0) {
        throw new RuntimeError('array-assign: destination is not an array');
    }

    const baseAddr = dst.addr[0];
    const elementType = dst.type.replace(/\*$/, ''); // Remove '*'
    const elementSize = elementType === 'int' ? 4 : elementType === 'char' ? 1 : 4;

    // Resolver cada valor
    for (let i = 0; i < values.length; i++) {
        const valueNode = values[i];
        const value = await solve(ctx.compile(valueNode));

        const offset = i * elementSize;
        const addr = baseAddr + offset;

        // Escrever na memória
        if (elementType === 'int') {
            Net.memory.writeWord(addr, value.value);
        } else if (elementType === 'char') {
            Net.memory.write(addr, value.value & 255);
        }
    }

    return dst;
};
