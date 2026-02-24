import malloc from './Functions/malloc.js';
import free from './Functions/free.js';
import getchar from './Functions/getchar.js';
import putchar from './Functions/putchar.js';
import { highlight_index, clear_highlight } from './Functions/highlight-index.js';

const addFunction = (ctx, { name, returnType, args, run }) => {
	const argTypes = args.map((arg) => arg.type);
    const fn = {
        name,
        type: `${returnType}(*)(${argTypes.join(',')})`,
        returnType,
        argTypes,
        args,
        vars: args,
        run: { ...run, ctx },
    };
    ctx.global.set({ [name]: fn });
};

export default (ctx) => {
    addFunction(ctx, malloc);
    addFunction(ctx, free);
    addFunction(ctx, getchar);
    addFunction(ctx, putchar);
    addFunction(ctx, highlight_index);
    addFunction(ctx, clear_highlight);
};
