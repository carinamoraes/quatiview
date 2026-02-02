/**
 * Bubble Sort com animação visual
 * Este módulo implementa a visualização do algoritmo bubble sort
 * mostrando a troca de elementos no array
 */

import Net from '../../Net.js';

// Configurações de animação
const swapAnimationDuration = 400;
const compareHighlightDuration = 200;
const delayBetweenSteps = 100;

// Estado da animação
let isAnimating = false;
let animationAborted = false;

/**
 * Aguarda um tempo em milissegundos
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Anima a troca de dois elementos visualmente
 * @param {ArrayInstance} instance - Instância do array
 * @param {number} i - Índice do primeiro elemento
 * @param {number} j - Índice do segundo elemento
 */
const animateSwap = async (instance, i, j) => {
    const { template, values } = instance;
    const cellSize = 20; // mesmo valor usado no MemViewer

    // Calcular posições
    const xi = i * cellSize;
    const xj = j * cellSize;
    const distance = xj - xi;

    // Criar animação de swap
    const startTime = Date.now();

    return new Promise((resolve) => {
        const animate = () => {
            if (animationAborted) {
                resolve();
                return;
            }

            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / swapAnimationDuration);

            // Easing function (ease-in-out)
            const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            // Atualizar offsets de animação
            instance.swapAnimation = {
                active: true,
                indexA: i,
                indexB: j,
                progress: eased,
            };

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Trocar valores no array de cache
                const temp = values[i];
                values[i] = values[j];
                values[j] = temp;

                // Trocar valores na memória
                const { addr } = instance;
                const { elementSize } = template;
                const addrI = addr + i * elementSize;
                const addrJ = addr + j * elementSize;

                if (template.elementType === 'int') {
                    const valI = Net.memory.readWordSafe(addrI);
                    const valJ = Net.memory.readWordSafe(addrJ);
                    if (valI !== null && valJ !== null) {
                        Net.memory.writeWord(addrI, valJ);
                        Net.memory.writeWord(addrJ, valI);
                    }
                }

                // Limpar animação
                instance.swapAnimation = null;
                resolve();
            }
        };

        requestAnimationFrame(animate);
    });
};

/**
 * Destaca dois elementos sendo comparados
 */
const highlightCompare = async (instance, i, j) => {
    instance.compareHighlight = { indexA: i, indexB: j };
    await sleep(compareHighlightDuration);
};

/**
 * Limpa o destaque de comparação
 */
const clearHighlight = (instance) => {
    instance.compareHighlight = null;
};

/**
 * Executa o bubble sort com animação visual
 * @param {ArrayInstance} instance - Instância do array a ser ordenado
 * @param {Function} onComplete - Callback chamado quando a ordenação termina
 */
export const bubbleSort = async (instance, onComplete = null) => {
    if (isAnimating) {
        console.warn('Animação já em andamento');
        return;
    }

    isAnimating = true;
    animationAborted = false;

    const { values, length } = instance;

    // Inicializar estado de sorting
    instance.sortingState = {
        active: true,
        sorted: [], // Índices já ordenados
        currentPass: 0,
    };

    try {
        for (let pass = 0; pass < length - 1 && !animationAborted; pass++) {
            // Verificar se sortingState ainda existe (pode ter sido resetado pelo abort)
            if (instance.sortingState) {
                instance.sortingState.currentPass = pass;
            }
            let swapped = false;

            for (let i = 0; i < length - pass - 1 && !animationAborted; i++) {
                // Destacar elementos sendo comparados
                await highlightCompare(instance, i, i + 1);

                // Verificar se a animação foi abortada durante o highlight
                if (animationAborted) break;

                // Verificar se precisa trocar
                if (values[i] > values[i + 1]) {
                    // Animar a troca
                    await animateSwap(instance, i, i + 1);
                    swapped = true;
                }

                // Verificar se a animação foi abortada durante o swap
                if (animationAborted) break;

                clearHighlight(instance);
                await sleep(delayBetweenSteps);
            }

            // Marcar o último elemento desta passagem como ordenado (verificar se sortingState existe)
            if (instance.sortingState && instance.sortingState.sorted) {
                instance.sortingState.sorted.push(length - pass - 1);
            }

            // Se não houve troca, o array já está ordenado
            if (!swapped) {
                // Marcar todos os elementos restantes como ordenados
                if (instance.sortingState && instance.sortingState.sorted) {
                    for (let k = 0; k < length - pass - 1; k++) {
                        instance.sortingState.sorted.push(k);
                    }
                }
                break;
            }
        }

        // Animação concluída (verificar se sortingState existe)
        if (instance.sortingState && !animationAborted) {
            // Marcar todos os elementos como ordenados ao final
            for (let i = 0; i < length; i++) {
                if (!instance.sortingState.sorted.includes(i)) {
                    instance.sortingState.sorted.push(i);
                }
            }
            instance.sortingState.active = false;
            instance.sortingState.completed = true;
        }
    } catch (error) {
        console.error('Erro durante bubble sort:', error);
    } finally {
        isAnimating = false;
        clearHighlight(instance);
        if (onComplete) {
            onComplete();
        }
    }
};

/**
 * Aborta a animação em andamento
 */
export const abortAnimation = () => {
    animationAborted = true;
};

/**
 * Verifica se uma animação está em andamento
 */
export const isAnimationRunning = () => isAnimating;

/**
 * Verifica se uma animação foi interrompida
 */
export const isAnimationAborted = () => animationAborted;

/**
 * Reseta o estado de sorting de uma instância
 */
export const resetSortingState = (instance) => {
    instance.sortingState = null;
    instance.swapAnimation = null;
    instance.compareHighlight = null;
};

export default bubbleSort;
