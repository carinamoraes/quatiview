import Run from '../../index.js';

export default async (item) => {
    // Executa instruções pendentes
    if (item.instruction != null) {
        item = await Run(item);
    }

    // Se ainda não há valor calculado
    if (item.value == null) {
        // Caso especial: variáveis declaradas como array
        // Para arrays, o "valor" que nos interessa em expressões (e indexação)
        // é o endereço base do bloco de memória já alocado em item.addr.
        if (item.isArray && item.addr && item.addr.length > 0) {
            return {
                type: item.type,
                value: item.addr.at(-1),
            };
        }

        // Demais casos: carregar da memória normalmente
        item = await Run({
            instruction: 'load',
            src: item,
        });
    }

    return item;
};
