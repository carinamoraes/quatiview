// Exemplo de inicialização de array com quicksort

// Escolhe o último elemento como pivô
int particionar(int vetor[], int inicio, int fim) {
    int pivo;
	pivo = vetor[fim];
    // Função para destacar um elemento de um array
	highlight_index(vetor, fim, "#87a832");
    int i, j, temp;
	i = inicio - 1;

    for (j = inicio; j < fim; j = j+1) {
        if (vetor[j] <= pivo) {
            i = i+1;
			temp = vetor[i];
			vetor[i] = vetor[j];
			vetor[j] = temp;
        }
    }

    // Coloca o pivô na posição correta
	temp = vetor[i + 1];
	vetor[i + 1] = vetor[fim];
	vetor[fim] = temp;
    // Função para limpar o destaque de um elemento de um array
	clear_highlight(vetor);
    return i + 1;
}

// Função principal do Quick Sort
void quickSort(int vetor[], int inicio, int fim) {
    if (inicio < fim) {
		int indicePivo;
		indicePivo = particionar(vetor, inicio, fim);
        // Ordena os elementos antes e depois do pivô
        quickSort(vetor, inicio, indicePivo - 1);
        quickSort(vetor, indicePivo + 1, fim);
    }
}


int main()
{
    int v[20];

    v = {45, 12, 78, 3, 56, 89, 23, 67, 1, 90,
         34, 76, 5, 88, 19, 42, 7, 99, 15, 60};
	
	quickSort(v, 0, 19);

    return 0;
}
