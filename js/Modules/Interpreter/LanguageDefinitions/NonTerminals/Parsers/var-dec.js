import NonTerminal from '../../../Model/NonTerminal.js';
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

            // Declaração de array
            if (arraySize !== null) {
                // Tamanho do array deve ser uma constante inteira conhecida em tempo de compilação
                const sizeInstr = ctx.compile(arraySize);
                if (sizeInstr == null || typeof sizeInstr.value !== 'number') {
                    throw new CompilationError(`array size must be a constant integer expression`, arraySize.startsAt);
                }

                const n = sizeInstr.value;
                if (n <= 0) {
                    throw new CompilationError(`array size must be positive, got ${n}`, arraySize.startsAt);
                }

                const elementType = decType;
                const elementSize = ctx.getTypeSize(elementType, item.startsAt);
                size = n * elementSize;

                // Tipo da variável é ponteiro para o elemento
                type = elementType + '*';
            } else {
                // Variável simples ou ponteiro
                type = decType + '*'.repeat(pointerCount);
                size = ctx.getTypeSize(type, item.startsAt);
            }

            if (struct) {
                // Membro de struct: apenas registrar metadados
                struct.members[name] = {
                    name,
                    size,
                    type,
                    offset: null,
                    arraySize: arraySize ? { node: arraySize } : null,
                };
            } else {
                // Variável local ou global: apenas registrar, sem alocação aqui
                const data = {
                    name,
                    type,
                    size,
                    addr: [],
                    arraySize: arraySize ? { node: arraySize } : null,
                    isArray: arraySize !== null,
                };

                ctx.local.set(name, data);
                if (fn) {
                    fn.vars.push(data);
                } else {
                    // Variável global: marcar para alocação/liberação em tempo de execução
                    if (!ctx.globalVars) ctx.globalVars = [];
                    ctx.globalVars.push(data);
                }
            }
        }
    },
});
