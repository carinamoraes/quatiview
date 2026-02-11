import Net from '../Net.js';
import sortBinTree from './sorting/sortBinTree.js';
import sortList from './sorting/sortList.js';
import { setWriteCallback } from '../Memory/index.js';
import { isPaused, getIntervalMs } from '../Panel/index.js';

let canvas = null;
let ctx = null;

const fontSize = 9;
const addrFontSize = 8;
const addrMargin = 2;
const maxScale = 2;
const cellSize = 20;
const cellPadding = 1;
const dblCellPadding = 2;
const arrowTipSize = 2;
const lineWidth = 1.5;
const animationDuration = 500;
const instances = (window.instances = []);
const transform = [1, 0, 0, 1, 0, 0];
const templates = {};
const zoom = { value: 1, mx: 0, my: 0 };

const color = {
    int: {
        bg: '#07f',
        text: '#fff',
    },
    def: {
        bg: '#777',
        text: '#fff',
    },
    ptrLine: '#fff',
    addr: '#ccc',
    instance: '#aaa',
    // Cores para animação de ordenação
    comparing: {
        bg: '#f90',
        text: '#fff',
    },
    sorted: {
        bg: '#0a5',
        text: '#fff',
    },
    swapping: {
        bg: '#e33',
        text: '#fff',
    },
    // Cor para destaque de modificação (código do usuário)
    modified: {
        bg: '#e33',
        text: '#fff',
    },
};

// Rastreamento de modificações em arrays para detecção de swaps
let modifiedCells = {}; // { addr: { index, timestamp, value } }

// Sistema de detecção de swap
let pendingSwaps = {}; // { instanceAddr: { reads: [], writes: [] } }
const swapDetectionWindow = 50; // ms para detectar um swap

/**
 * Obtém a duração do destaque baseada na velocidade do Panel
 * Retorna um valor mínimo de 200ms para garantir visibilidade
 */
const getHighlightDuration = () => {
    const interval = getIntervalMs();
    return Math.max(200, interval);
};

let bitTic = 0;
let organizeFlag = false;
let addrMap = {};
let byTemplateName = {};

const pointers = [];
const animations = [];

const arrayRemove = (array, item) => {
    const index = array.indexOf(item);
    array.splice(index, 1);
};

const animate = (it) => {
    animations.push({ time: Date.now(), it });
};

const runAnimations = () => {
    const now = Date.now();
    const ongoing = [];
    for (let animation of animations) {
        const { time, it } = animation;
        const dt = now - time;
        const x = Math.min(1, dt / animationDuration);
        const y = (1 - Math.cos(x * Math.PI)) / 2;
        it(y);
        if (x < 1) {
            ongoing.push(animation);
        }
    }
    if (ongoing.length < animations.length) {
        animations.length = 0;
        animations.push(...ongoing);
    }
};

const calcTransform = () => {
    if (instances.length === 0) {
        return { scale: 1, dx: 0, dy: 0 };
    }
    const tsx = canvas[0].width;
    const tsy = canvas[0].height;
    const minMargin = Math.min(tsx, tsy) * 0.1;
    let x0 = +Infinity;
    let x1 = -Infinity;
    let y0 = +Infinity;
    let y1 = -Infinity;
    for (let instance of instances) {
        let { x, y } = instance;
        const { sx, sy } = instance.template;
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x + sx);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y + sy);
    }
    const sx = x1 - x0;
    const sy = y1 - y0;
    const xScale = (tsx - minMargin * 2) / sx;
    const yScale = (tsy - minMargin * 2) / sy;
    const scale = Math.min(maxScale, Math.min(xScale, yScale));
    const mx = (tsx - sx * scale) / 2;
    const my = (tsy - sy * scale) / 2;
    const dx = mx - x0 * scale;
    const dy = my - y0 * scale;
    return { scale, dx, dy };
};

const drawBlock = (x, y, sx, sy, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, sx, sy);
};

const getNewPosition = (template) => {
    if (instances.length === 0) {
        return { x: 0, y: 0 };
    }
    let max_x = -Infinity;
    for (let instance of instances) {
        max_x = Math.max(max_x, instance.real.x + instance.template.sx);
    }
    return { x: max_x + cellSize * 2, y: 0 };
};

class GraphData {
    constructor(instance) {
        this.instance = instance;
        this.parent = null;
        this.children = [];
    }
    equals(other) {
        if (this.parent !== other.parent) {
            return false;
        }
        const a = this.children;
        const b = other.children;
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; ++i) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }
    clear() {
        this.parent = null;
        this.children.length = 0;
        return this;
    }
    append(child = null) {
        this.children.push(child);
        if (child !== null) {
            const { gData } = child;
            if (gData.parent === null) {
                gData.parent = this.instance;
            }
        }
        return this;
    }
}

class StructTemplate {
    constructor(name) {
        this.name = name;
        this.members = [];
        this.sx = 0;
        this.sy = 0;
    }
    getSignature() {
        return this.members.map((member) => member.type).join(',');
    }
    updateSize() {
        const { members } = this;
        let x0 = +Infinity;
        let x1 = -Infinity;
        let y0 = +Infinity;
        let y1 = -Infinity;
        for (let member of members) {
            x0 = Math.min(member.x, x0);
            x1 = Math.max(member.x + member.sx, x1);
            y0 = Math.min(member.y, y0);
            y1 = Math.max(member.y + member.sy, y1);
        }
        this.sx = x1 - x0;
        this.sy = y1 - y0;
    }
    member({ type, col, row, length }) {
        const offset = this.members.length * 4;
        const member = {
            offset,
            type,
            x: col * cellSize,
            y: row * cellSize,
            sx: length * cellSize,
            sy: cellSize,
        };
        this.members.push(member);
        this.updateSize();
        return this;
    }
    render(instance) {
        const { addr, x: x0, y: y0 } = instance;
        const { members, sx, sy } = this;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color.instance;
        ctx.fillRect(x0 - cellPadding, y0 - cellPadding, sx + dblCellPadding, sy + dblCellPadding);
        const { gData } = instance;
        for (let member of members) {
            const { type, sx, sy, offset } = member;
            const x = member.x + x0;
            const y = member.y + y0;
            const { text, bg } = color[type] ?? color.def;
            drawBlock(x + cellPadding, y + cellPadding, sx - dblCellPadding, sy - dblCellPadding, bg);
            ctx.fillStyle = text;
            ctx.font = `bold ${fontSize}px monospace`;
            const cx = x + sx * 0.5;
            const cy = y + sy * 0.5;
            const valAddr = addr + offset;
            const value = type === 'char' ? Net.memory.readSafe(valAddr) : Net.memory.readWordSafe(valAddr);
            if (type === 'int') {
                if (value !== null) {
                    ctx.fillText(value, cx, cy);
                }
            } else if (type.endsWith('*')) {
                if (value === null) {
                    gData.append(null);
                } else if (value === 0) {
                    gData.append(null);
                    ctx.fillText('NULL', cx, cy);
                } else if (addrMap[value] === undefined) {
                    gData.append(null);
                    ctx.fillText(value, cx, cy);
                } else {
                    gData.append(addrMap[value]);
                    pointers.push({ cx, cy, addr: value });
                }
            }
        }
    }
}

class Instance {
    constructor(addr, template) {
        this.templateName = template.name;
        this.real = getNewPosition(template);
        this.animated = {
            x: 0,
            y: 0,
        };
        this.addr = addr;
        this.template = template;
        this.graphData = [new GraphData(this), new GraphData(this)];
        this.root_cx = null;
        this.tree_sx = null;
    }
    get x() {
        return this.real.x + this.animated.x;
    }
    get y() {
        return this.real.y + this.animated.y;
    }
    get gData() {
        return this.graphData[bitTic];
    }
    get prevGData() {
        return this.graphData[bitTic ^ 1];
    }
    render() {
        const { template, x, y, addr } = this;
        template.render(this, x, y);
        ctx.textBaseline = 'bottom';
        ctx.textAlign = 'left';
        ctx.fillStyle = color.addr;
        ctx.font = `${addrFontSize}px monospace`;
        ctx.fillText(addr, x, y - addrMargin);
    }
    moveTo(x, y) {
        const { real, animated } = this;
        const dif_x = x - real.x;
        const dif_y = y - real.y;
        if (dif_x === 0 && dif_y === 0) {
            return;
        }
        real.x = x;
        real.y = y;
        animate((t) => {
            animated.x = dif_x * t - dif_x;
            animated.y = dif_y * t - dif_y;
        });
    }
}

const getNewRoot = (instance, visited) => {
    if (instance === null) return null;
    if (visited[instance.addr] === true) return null;
    visited[instance.addr] = true;
    const { gData } = instance;
    const { parent } = gData;
    if (parent === null) {
        return instance;
    }
    if (parent.templateName !== instance.templateName) {
        return null;
    }
    return getNewRoot(parent, visited);
};

const getRoots = (window.getRoots = () => {
    const visited = {};
    const roots = [];
    for (let instance of instances) {
        const root = getNewRoot(instance, visited);
        if (root !== null) {
            roots.push(root);
        }
    }
    return roots;
});

const organize = () => {
    const roots = getRoots();
    let x = 0;
    for (let root of roots) {
        const { length } = root.gData.children;
        if (length === 2) {
            const { width } = sortBinTree(root, cellSize, x, 0);
            x += width + cellSize * 2;
        } else if (length === 1) {
            const { width } = sortList(root, cellSize, x, 0);
            x += width + cellSize * 2;
        }
    }
};

const render = () => {
    for (let instance of instances) {
        instance.gData.clear();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.clearRect(0, 0, canvas[0].width, canvas[0].height);
    ctx.setTransform(...transform);
    pointers.length = 0;
    for (let instance of instances) {
        instance.render();
    }
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color.ptrLine;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let { cx, cy, addr } of pointers) {
        const target = addrMap[addr];
        const x0 = cx;
        const y0 = cy;
        const x2 = target.x + target.template.sx * 0.5;
        const y2 = target.y;
        const y1 = (y0 + y2) * 0.5;
        const dir = (y2 - y0) / Math.abs(y2 - y0);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.bezierCurveTo(x0, y1, x2, y1, x2, y2);
        ctx.moveTo(x2 - arrowTipSize, y2 - dir * arrowTipSize);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2 + arrowTipSize, y2 - dir * arrowTipSize);
        ctx.stroke();
    }
    if (!organizeFlag) {
        for (let instance of instances) {
            if (!instance.gData.equals(instance.prevGData)) {
                organizeFlag = true;
                break;
            }
        }
    }
};

const frame = () => {
    runAnimations();
    updateTransform();
    render();
    requestAnimationFrame(frame);
    if (organizeFlag === true) {
        organize();
        organizeFlag = false;
        updateTransform();
    }
    bitTic ^= 1;
};

const updateTransform = () => {
    let { dx, dy, scale } = calcTransform();
    const { value, mx, my } = zoom;

    const new_scale = scale * value;
    const sx = canvas[0].width;
    const sy = canvas[0].height;
    const x0 = (0 - dx) / scale;
    const y0 = (0 - dy) / scale;
    const x1 = (sx - dx) / scale;
    const y1 = (sy - dy) / scale;
    const raw_sx = x1 - x0;
    const raw_sy = y1 - y0;
    const new_raw_sx = raw_sx / value;
    const new_raw_sy = raw_sy / value;
    const raw_offset_x = (raw_sx - new_raw_sx) * mx;
    const raw_offset_y = (raw_sy - new_raw_sy) * my;
    const new_x0 = x0 + raw_offset_x;
    const new_y0 = y0 + raw_offset_y;

    scale = new_scale;
    dx = -new_x0 * scale;
    dy = -new_y0 * scale;

    transform[0] = transform[3] = scale;
    transform[4] = dx;
    transform[5] = dy;
};

const resize = () => {
    const parent = canvas.parent();
    const width = Number(parent.css('width').replace('px', ''));
    const height = Number(parent.css('height').replace('px', ''));
    canvas.attr({ width, height });
    updateTransform();
};

const sumZoom = (value) => {
    zoom.value = Math.exp(Math.log(zoom.value) + value);
};

const bindCanvas = () => {
    canvas.on('wheel', (e) => {
        if (e.originalEvent.wheelDelta > 0 || e.originalEvent.detail < 0) {
            sumZoom(0.2);
        } else {
            sumZoom(-0.2);
        }
    });
    canvas.on('mousemove', function (e) {
        const x = e.offsetX;
        const y = e.offsetY;
        zoom.mx = x / this.width;
        zoom.my = y / this.height;
    });
    canvas.on('mouseout', (e) => {
        const { value } = zoom;
        animate((t) => {
            zoom.value = value * (1 - t) + t;
        });
    });
};

export const getTemplates = () => {
    return Object.values(templates);
};

export const hasTemplate = (name) => {
    return templates[name] !== undefined;
};

export const init = () => {
    canvas = $('canvas');
    ctx = canvas[0].getContext('2d');
    bindCanvas();
    $(window).on('resize', resize);

    // Registrar callback para notificação de escritas na memória
    setWriteCallback((addr, value) => {
        notifyMemoryWrite(addr, value);
    });

    setTimeout(() => {
        resize();
        frame();
    }, 0);
};

export const clear = () => {
    addrMap = {};
    for (let name in byTemplateName) {
        byTemplateName[name].length = 0;
    }
    instances.length = 0;
    pointers.length = 0;
    modifiedCells = {}; // Limpar rastreamento de modificações
};

export const addStruct = (name) => {
    const template = new StructTemplate(name);
    templates[name] = template;
    byTemplateName[name] = [];
    return template;
};

export const addInstance = (name, addr) => {
    const template = templates[name];
    if (template === undefined) {
        return;
    }
    const instance = new Instance(addr, template);
    instances.push(instance);
    byTemplateName[template.name].push(instance);
    addrMap[addr] = instance;
    organizeFlag = true;
};

export const removeInstance = (addr) => {
    const instance = addrMap[addr];
    if (instance === undefined) {
        return;
    }
    delete addrMap[addr];
    arrayRemove(instances, instance);
    arrayRemove(byTemplateName[instance.templateName], instance);
    organizeFlag = true;
};

class ArrayTemplate {
    constructor(name, elementType, elementSize) {
        this.name = name;
        this.elementType = elementType;
        this.elementSize = elementSize;
        this.sx = 0;
        this.sy = 0;
    }

    getSignature() {
        return `${this.elementType}[]`;
    }

    updateSize(length) {
        this.sx = length * cellSize;
        this.sy = cellSize;
    }

    /**
     * Determina a cor de um elemento baseado no estado da animação
     */
    getElementColor(instance, index, elementType) {
        const { compareHighlight, swapAnimation, sortingState, addr } = instance;
        const { elementSize } = this;

        // Elemento sendo trocado (animação de swap ativa)
        if (swapAnimation && swapAnimation.active) {
            if (index === swapAnimation.indexA || index === swapAnimation.indexB) {
                return color.swapping;
            }
        }

        // Elemento sendo comparado
        if (compareHighlight) {
            if (index === compareHighlight.indexA || index === compareHighlight.indexB) {
                return color.comparing;
            }
        }

        // Elemento já ordenado
        if (sortingState && sortingState.sorted && sortingState.sorted.includes(index)) {
            return color.sorted;
        }

        // Verificar se célula foi modificada recentemente (código do usuário)
        const cellAddr = addr + index * elementSize;
        const modInfo = modifiedCells[cellAddr];
        if (modInfo) {
            // Se está pausado, manter o destaque indefinidamente
            if (isPaused()) {
                return color.modified;
            }
            
            // Caso contrário, usar a duração baseada na velocidade
            const elapsed = Date.now() - modInfo.timestamp;
            const highlightDuration = getHighlightDuration();
            if (elapsed < highlightDuration) {
                return color.modified;
            } else {
                delete modifiedCells[cellAddr];
            }
        }

        // Cor padrão
        return color[elementType] ?? color.def;
    }

    /**
     * Calcula o offset X para animação de swap
     */
    getSwapOffset(instance, index) {
        const { swapAnimation } = instance;
        if (!swapAnimation || !swapAnimation.active) {
            return 0;
        }

        const { indexA, indexB, progress } = swapAnimation;
        const distance = (indexB - indexA) * cellSize;

        if (index === indexA) {
            // Elemento A move para direita
            return distance * progress;
        } else if (index === indexB) {
            // Elemento B move para esquerda
            return -distance * progress;
        }

        return 0;
    }

    render(instance) {
        const { addr, x: x0, y: y0, length, values, swapAnimation } = instance;
        const { elementType, elementSize } = this;

        // Atualizar tamanho do template se necessário
        if (this.sx === 0) {
            this.updateSize(length);
        }

        // Desenhar container
        ctx.fillStyle = color.instance;
        const totalWidth = length * cellSize;
        const height = cellSize;
        ctx.fillRect(x0 - cellPadding, y0 - cellPadding, totalWidth + dblCellPadding, height + dblCellPadding);

        // Desenhar cada elemento
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Primeiro, desenhar todos os elementos que NÃO estão sendo trocados
        for (let i = 0; i < length; i++) {
            // Pular elementos em animação de swap (serão desenhados depois, por cima)
            if (swapAnimation && swapAnimation.active) {
                if (i === swapAnimation.indexA || i === swapAnimation.indexB) {
                    continue;
                }
            }
            this.renderElement(instance, i, x0, y0, elementType, elementSize, addr);
        }

        // Depois, desenhar elementos em animação de swap (por cima)
        if (swapAnimation && swapAnimation.active) {
            this.renderElement(instance, swapAnimation.indexA, x0, y0, elementType, elementSize, addr);
            this.renderElement(instance, swapAnimation.indexB, x0, y0, elementType, elementSize, addr);
        }

        // Desenhar índices
        ctx.fillStyle = color.addr;
        ctx.font = `${addrFontSize}px monospace`;
        ctx.textAlign = 'center';
        for (let i = 0; i < length; i++) {
            const x = x0 + i * cellSize;
            ctx.fillText(String(i), x + cellSize * 0.5, y0 - 7);
        }
    }

    /**
     * Renderiza um único elemento do array
     */
    renderElement(instance, i, x0, y0, elementType, elementSize, addr) {
        const { values } = instance;

        // Calcular posição com offset de animação
        const swapOffset = this.getSwapOffset(instance, i);
        const x = x0 + i * cellSize + swapOffset;
        const y = y0;
        const elementAddr = addr + i * elementSize;

        // Ler valor e atualizar cache se válido (apenas se não estiver em animação de swap)
        if (!instance.swapAnimation || !instance.swapAnimation.active) {
            const value =
                elementType === 'int' ? Net.memory.readWordSafe(elementAddr) : Net.memory.readSafe(elementAddr);
            if (value !== null) {
                values[i] = value;
            }
        }

        // Obter cor baseada no estado
        const { text, bg } = this.getElementColor(instance, i, elementType);

        // Desenhar célula com possível sombra para elementos em movimento
        if (instance.swapAnimation && instance.swapAnimation.active) {
            if (i === instance.swapAnimation.indexA || i === instance.swapAnimation.indexB) {
                // Sombra para elementos em movimento
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(
                    x + cellPadding + 2,
                    y + cellPadding + 2,
                    cellSize - dblCellPadding,
                    cellSize - dblCellPadding,
                );
            }
        }

        drawBlock(x + cellPadding, y + cellPadding, cellSize - dblCellPadding, cellSize - dblCellPadding, bg);

        // Desenhar valor (usando cache para persistência)
        if (values[i] !== null) {
            ctx.fillStyle = text;
            ctx.font = `bold ${fontSize}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(values[i]), x + cellSize * 0.5, y + cellSize * 0.5);
        }
    }
}

class ArrayInstance {
    constructor(addr, template, length) {
        this.templateName = template.name;
        this.addr = addr;
        this.template = template;
        this.length = length;
        this.real = getNewPosition(template);
        this.animated = {
            x: 0,
            y: 0,
        };
        // Cache para armazenar os valores lidos, evitando que "pisquem" se a leitura falhar temporariamente
        this.values = new Array(length).fill(null);
        // Arrays não têm ponteiros, então gData com parent null e children vazios
        this.graphData = [new GraphData(this), new GraphData(this)];
        // Campos para animação de sorting
        this.swapAnimation = null;
        this.compareHighlight = null;
        this.sortingState = null;
    }
    get x() {
        return this.real.x + this.animated.x;
    }
    get y() {
        return this.real.y + this.animated.y;
    }
    get gData() {
        return this.graphData[bitTic];
    }
    get prevGData() {
        return this.graphData[bitTic ^ 1];
    }
    render() {
        const { template, x, y, addr } = this;
        template.render(this);
        ctx.textBaseline = 'bottom';
        ctx.textAlign = 'left';
        ctx.fillStyle = color.addr;
        ctx.font = `${addrFontSize}px monospace`;
        ctx.fillText(addr, x, y - 12);
    }
    moveTo(x, y) {
        const { real, animated } = this;
        const dif_x = x - real.x;
        const dif_y = y - real.y;
        if (dif_x === 0 && dif_y === 0) {
            return;
        }
        real.x = x;
        real.y = y;
        animate((t) => {
            animated.x = dif_x * t - dif_x;
            animated.y = dif_y * t - dif_y;
        });
    }
}

export const addArrayType = (name, elementType) => {
    const elementSize = elementType === 'int' ? 4 : elementType === 'char' ? 1 : 4;
    const template = new ArrayTemplate(name, elementType, elementSize);
    templates[name] = template;
    byTemplateName[name] = [];
    return template;
};

export const addArrayInstance = (name, addr, length) => {
    const template = templates[name];
    if (template === undefined || !(template instanceof ArrayTemplate)) {
        return;
    }
    // Atualizar tamanho do template baseado no length
    template.updateSize(length);
    const instance = new ArrayInstance(addr, template, length);
    instances.push(instance);
    byTemplateName[template.name].push(instance);
    addrMap[addr] = instance;
    organizeFlag = true;
};

/**
 * Obtém todas as instâncias de array
 */
export const getArrayInstances = () => {
    return instances.filter((inst) => inst.template instanceof ArrayTemplate);
};

/**
 * Notifica que um endereço de memória foi modificado
 * Usado para destacar visualmente as modificações em arrays
 * @param {number} addr - Endereço que foi modificado
 * @param {number} value - Novo valor escrito
 */
export const notifyMemoryWrite = (addr, value) => {
    // Verificar se este endereço pertence a alguma instância de array
    for (const instance of instances) {
        if (!(instance.template instanceof ArrayTemplate)) continue;
        
        const { addr: baseAddr, length, template } = instance;
        const { elementSize } = template;
        const endAddr = baseAddr + length * elementSize;
        
        // Verificar se o endereço está dentro deste array
        if (addr >= baseAddr && addr < endAddr) {
            const index = Math.floor((addr - baseAddr) / elementSize);
            const cellAddr = baseAddr + index * elementSize;
            
            const now = Date.now();
            
            // Verificar se há um swap pendente para detectar
            const pending = pendingSwaps[baseAddr] || { writes: [] };
            pendingSwaps[baseAddr] = pending;
            
            // Adicionar esta escrita à lista
            pending.writes.push({
                index,
                cellAddr,
                value,
                timestamp: now,
            });
            
            // Limpar escritas antigas
            pending.writes = pending.writes.filter(w => now - w.timestamp < swapDetectionWindow);
            
            // Detectar swap: duas escritas em posições diferentes com valores trocados
            if (pending.writes.length >= 2) {
                const recent = pending.writes.slice(-2);
                const [w1, w2] = recent;
                
                if (w1.index !== w2.index) {
                    // Verificar se os valores foram trocados (swap)
                    const prevValue1 = instance.values[w2.index];
                    const prevValue2 = instance.values[w1.index];
                    
                    if (w1.value === prevValue1 || w2.value === prevValue2) {
                        // Detectado um swap! Ativar animação visual
                        instance.swapAnimation = {
                            active: true,
                            indexA: Math.min(w1.index, w2.index),
                            indexB: Math.max(w1.index, w2.index),
                            progress: 0,
                        };
                        
                        // Animar o swap
                        const startTime = Date.now();
                        const animateSwap = () => {
                            const elapsed = Date.now() - startTime;
                            const progress = Math.min(1, elapsed / 300);
                            const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                            
                            if (instance.swapAnimation) {
                                instance.swapAnimation.progress = eased;
                                
                                if (progress < 1) {
                                    requestAnimationFrame(animateSwap);
                                } else {
                                    instance.swapAnimation = null;
                                }
                            }
                        };
                        requestAnimationFrame(animateSwap);
                        
                        // Limpar escritas pendentes após detectar swap
                        pending.writes = [];
                    }
                }
            }
            
            // Registrar modificação para highlight
            modifiedCells[cellAddr] = {
                index,
                timestamp: now,
                value,
            };
            break;
        }
    }
};

/**
 * Limpa o rastreamento de células modificadas
 */
export const clearModifiedCells = () => {
    modifiedCells = {};
};
