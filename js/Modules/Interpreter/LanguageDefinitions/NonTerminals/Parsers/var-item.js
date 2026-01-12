import NonTerminal from '../../../Model/NonTerminal.js';

new NonTerminal({
    name: 'var-item',
    parse: (ctx) => {
        const pointerCount = ctx.token.popMany('asterisk').length;
        const name = ctx.token.pop('id').content;
        let arraySize = null;

        // Verificar se há [expr] após o nome
        if (ctx.token.popIfIs('left-square-brackets')) {
            const sizeNode = ctx.parse('expr');
            ctx.token.pop('right-square-brackets');
            arraySize = sizeNode; // Guardar nó para compilação
        }

        return { name, pointerCount, arraySize };
    },
});
