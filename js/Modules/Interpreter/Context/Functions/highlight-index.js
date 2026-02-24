// Funções utilizadas para destacar elemento em um array

// Função highlight_index(arr, index, color) - Destaca uma posição do array com cor desejada
const argArr = { name: 'arr', type: 'int*', size: 4, addr: [] };
const argIndex = { name: 'index', type: 'int', size: 4, addr: [] };
const argColor = { name: 'color', type: 'char*', size: 4, addr: [] };

export const highlight_index = {
    name: 'highlight_index',
    returnType: 'void',
    args: [argArr, argIndex, argColor],
    run: { instruction: 'highlight_index', argArr, argIndex, argColor },
};

// Função clear_highlight(arr) - Remove o destaque do elemento
const argArrClear = { name: 'arr', type: 'int*', size: 4, addr: [] };

export const clear_highlight = {
    name: 'clear_highlight',
    returnType: 'void',
    args: [argArrClear],
    run: { instruction: 'clear_highlight', argArr: argArrClear },
};
