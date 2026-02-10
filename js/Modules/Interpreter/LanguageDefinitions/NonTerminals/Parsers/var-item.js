import NonTerminal from '../../../Model/NonTerminal.js';

new NonTerminal({
    name: 'var-item',
    parse: (ctx) => {
        let pointerCount = ctx.token.popMany('asterisk').length;
        const name = ctx.token.pop('id').content;
        let arraySize = null;

        // Verificar se há [expr] ou [] após o nome
        if (ctx.token.popIfIs('left-square-brackets')) {
            // Verificar se são colchetes vazios [] (usado em parâmetros de função)
            if (ctx.token.popIfIs('right-square-brackets')) {
                // [] vazio é equivalente a ponteiro em parâmetros de função
                pointerCount++;
            } else {
                // [expr] - array com tamanho definido
                const sizeNode = ctx.parse('expr');
                ctx.token.pop('right-square-brackets');
                arraySize = sizeNode; // Guardar nó para compilação
            }
        }

        return { name, pointerCount, arraySize };
    },
});
