import Net from '../../Net.js';

export default ({ structs }) => {
    const templates = Net.memViewer.getTemplates();
    const signToName = Object.fromEntries(
        templates.map((template) => [ template.getSignature(), template.name ]),
    );
    for (let name in structs) {
        const struct = structs[name];
        const selfPtr = `struct ${name}*`;
        const members = Object.values(struct.members);
        const sign = members.map((member) => {
            const { type } = member;
            return type === selfPtr ? 'self*' : type;
        }).join(',');
        struct.viewFlag = signToName[sign];
    }
};
