// Exemplo de inicialização de árvore binária

struct No
{
    int info;
    struct No *esq;
    struct No *dir;
};

struct No *criarNo(int info)
{
    struct No *no;
    no = malloc(sizeof(struct No));
    no->info = info;
    no->esq = NULL;
    no->dir = NULL;
    return no;
}

struct No *add(struct No *arv, int info)
{
    struct No *no;
    if (arv == NULL)
    {
        return criarNo(info);
    }
    if (info < arv->info)
    {
        arv->esq = add(arv->esq, info);
    }
    else
    {
        arv->dir = add(arv->dir, info);
    }
    return arv;
}

void freeArv(struct No *arv)
{
    if (arv != NULL)
    {
        freeArv(arv->esq);
        freeArv(arv->dir);
        free(arv);
    }
}

int main()
{
    struct No *arv;
    arv = NULL;
    arv = add(arv, 50);
    add(arv, 48);
    add(arv, 70);
    add(arv, 84);
    add(arv, 49);
    return 0;
}