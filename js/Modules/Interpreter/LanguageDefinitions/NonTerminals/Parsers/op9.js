import { CompilationError } from '../../../../errors.js';
import NonTerminal from '../../../Model/NonTerminal.js';
import { isAssignable } from './Support/Type.js';

new NonTerminal({
    name: 'op9',
    parse: (ctx) => {
        const left = ctx.parse('op8');
        if (!ctx.token.popIfIs('assign')) {
            return left;
        }

        // Verificar se o lado direito é array-init: { ... }
        let right;
        if (ctx.token.nextIs('left-brackets')) {
            right = ctx.parse('array-init');
        } else {
            // Parsear normalmente
            right = ctx.parse('op9');
        }

        console.log('parse --- ', left.name, right.name);
        return { left, right };
    },
    compile: (ctx, node) => {
        const { left, right } = node.content;
        const dst = ctx.compile(left);

        // Verificar se é atribuição de array
        if (right.name === 'array-init' && dst.isArray) {
            // Atribuição de array: v = {0, 1, 2, ...}
            return {
                instruction: 'array-assign',
                dst,
                values: right.content.values,
                type: dst.type,
            };
        }

        // Atribuição normal
        const src = ctx.compile(right);
        if (!isAssignable(dst.type, src.type)) {
            throw new CompilationError(
                `incompatible types when assigning to type '${dst.type}' from type '${src.type}'`,
                node.startsAt
            );
        }
        return {
            instruction: 'assign',
            src,
            dst,
            type: src.type,
        };
    },
});
