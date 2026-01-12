import NonTerminal from '../../../Model/NonTerminal.js';

new NonTerminal({
    name: 'array-init',
    parse: (ctx) => {
        ctx.token.pop('left-brackets');
        const values = [];

        // Se não for '}', há valores
        if (!ctx.token.nextIs('right-brackets')) {
            values.push(ctx.parse('expr'));
            while (ctx.token.popIfIs('comma')) {
                values.push(ctx.parse('expr'));
            }
        }

        ctx.token.pop('right-brackets');
        return { values };
    },
});
