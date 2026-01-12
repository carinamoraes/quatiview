import NonTerminal from '../../../Model/NonTerminal.js';
import Net from '../../../../Net.js';
import { CompilationError } from '../../../../errors.js';

new NonTerminal({
    name: 'var-dec',
    parse: (ctx) => {
        const type = ctx.parse('type').content;
        const items = [ctx.parse('var-item')];
        while (ctx.token.popIfIs('comma')) {
            items.push(ctx.parse('var-item'));
        }
        ctx.token.pop('semicolon');
        return { type, items };
    },
    compile: (ctx, node) => {
        const { type: decType, items } = node.content;

        for (let item of items) {
            const { name, pointerCount, arraySize } = item.content;
            const { struct, fn } = ctx.current;

            let type, size;

            // Se é array
            if (arraySize !== null) {
                // Calcular tamanho do array de forma síncrona
                const sizeInstr = ctx.compile(arraySize);

                // Esperamos que o tamanho seja uma constante inteira já resolvida
                if (sizeInstr == null || typeof sizeInstr.value !== 'number') {
                    throw new CompilationError(
                        `array size must be a constant integer expression`,
                        arraySize.startsAt
                    );
                }

                const n = sizeInstr.value;
                if (n <= 0) {
                    throw new CompilationError(
                        `array size must be positive, got ${n}`,
                        arraySize.startsAt
                    );
                }

                const elementType = decType;
                const elementSize = ctx.getTypeSize(elementType, item.startsAt);
                size = n * elementSize;

                // Tipo interno: ponteiro para o elemento
                type = elementType + '*';
            } else {
                // Variável normal ou ponteiro
                type = decType + '*'.repeat(pointerCount);
                size = ctx.getTypeSize(type, item.startsAt);
            }

            if (struct) {
                // Dentro de struct: apenas registrar
                struct.members[name] = {
                    name,
                    size,
                    type,
                    offset: null,
                    arraySize: arraySize ? { node: arraySize } : null,
                };
            } else {
                // Variável local ou global
                const data = {
                    name,
                    type,
                    size,
                    addr: [],
                    arraySize: arraySize ? { node: arraySize } : null,
                    isArray: arraySize !== null,
                };

                // ALOCAR MEMÓRIA IMEDIATAMENTE (como malloc)
                const addr = Net.memory.allocate(size);
                data.addr.push(addr);

                ctx.local.set(name, data);
                if (fn) {
                    fn.vars.push(data);
                } else {
                    // Variável global: precisa ser liberada no final
                    if (!ctx.globalVars) ctx.globalVars = [];
                    ctx.globalVars.push(data);
                }
            }
        }
    },
});
