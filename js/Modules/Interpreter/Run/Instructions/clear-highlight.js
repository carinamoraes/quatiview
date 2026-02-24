import Net from '../../../Net.js';
import solve from './Support/solve.js';

export default async ({ ctx, argArr }) => {
    // Resolver o endereço do array
    const arrResult = await solve(argArr);
    const arrayAddr = arrResult.value;

    // Limpar o elemento destacado no MemViewer
    Net.memViewer.clearHighlightArrayElement(arrayAddr);

    ctx.returnValue = null;
};
