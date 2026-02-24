import Net from '../../../Net.js';
import solve from './Support/solve.js';

 //Instrução highlight_index - define o elemento destacado de um array na visualização
export default async ({ ctx, argArr, argIndex, argColor }) => {
    // Resolver o endereço do array
    const arrResult = await solve(argArr);
    const arrayAddr = arrResult.value;

    // Resolver o índice
    const indexResult = await solve(argIndex);
    const index = indexResult.value;

    // Resolver a cor (se fornecida)
    let colorHex = null;
    if (argColor) {
        const colorResult = await solve(argColor);
        // A cor é um ponteiro para uma string na memória
        const colorAddr = colorResult.value;
        if (colorAddr) {
            // Ler a string da memória
            colorHex = '';
            let i = 0;
            let byte;
            while ((byte = Net.memory.readSafe(colorAddr + i)) !== 0 && byte !== null && i < 20) {
                colorHex += String.fromCharCode(byte);
                i++;
            }
        }
    }

    // Definir o elemento destacado no MemViewer
    Net.memViewer.setHighlightArrayElement(arrayAddr, index, colorHex);

    ctx.returnValue = null;
};
