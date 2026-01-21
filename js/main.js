import Net from './Modules/Net.js';

window.Net = Net;

$(document).ready(() => {
    Net.editor.init();
    Net.panel.init();
    Net.terminal.init();
    Net.memViewer.init();

    Net.memViewer
        .addStruct('linked_list')
        .member({
            offset: 0,
            type: 'int',
            col: 0,
            row: 0,
            length: 3,
        })
        .member({
            offset: 4,
            type: 'self*',
            col: 0,
            row: 1,
            length: 3,
        });

    Net.memViewer
        .addStruct('binary_search_tree')
        .member({
            offset: 0,
            type: 'int',
            col: 0,
            row: 0,
            length: 4,
        })
        .member({
            offset: 4,
            type: 'self*',
            col: 0,
            row: 1,
            length: 2,
        })
        .member({
            offset: 8,
            type: 'self*',
            col: 2,
            row: 1,
            length: 2,
        });

    Net.memViewer
        .addStruct('avl_tree')
        .member({
            offset: 0,
            type: 'int',
            col: 0,
            row: 0,
            length: 3,
        })
        .member({
            offset: 4,
            type: 'int',
            col: 3,
            row: 0,
            length: 1,
        })
        .member({
            offset: 8,
            type: 'self*',
            col: 0,
            row: 1,
            length: 2,
        })
        .member({
            offset: 12,
            type: 'self*',
            col: 2,
            row: 1,
            length: 2,
        });

    // Arrays de int
    Net.memViewer.addArrayType('array_int', 'int');
});
