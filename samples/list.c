// Exemplo de inicialização de lista encadeada com memory leak

struct No
{
    int info;
    struct No *prox;
};

struct No *add(struct No *lista, int info)
{
    if (!lista)
    {
        lista = malloc(sizeof(struct No));
        lista->info = info;
        lista->prox = NULL;
    }
    else
    {
        lista->prox = add(lista->prox, info);
    }
    return lista;
}

struct No *delete(struct No *lista, int info)
{
    if (!lista)
    {
        return NULL;
    }
    if (lista->info == info)
    {
        struct No *prox;
        prox = lista->prox;
        // free(lista); // Descomente essa linha para visualizar a correção do memory leak
        return prox;
    }
    lista->prox = delete(lista->prox, info);
    return lista;
}

int main()
{
    struct No *lista;
    lista = NULL;
    lista = add(lista, 1);
    lista = add(lista, 2);
    lista = add(lista, 3);
    lista = delete(lista, 2);
    return 0;
}