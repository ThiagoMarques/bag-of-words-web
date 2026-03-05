"""
API Python para processamento de texto usando NLTK
Implementa técnicas de Tokenização e Remoção de Stop Words conforme curso FIAP

Técnicas aplicadas (seguindo padrão do curso):
1. Tokenização com NLTK (WhitespaceTokenizer e WordPunctTokenizer)
2. Remoção de Stop Words usando nltk.corpus.stopwords
3. Remoção de Pontuação
4. Remoção de Acentos usando unidecode
5. Conversão para minúsculas
6. Filtragem de palavras pequenas (menos de 2 caracteres)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from collections import Counter
from wordcloud import WordCloud
import base64
import io
import nltk
from nltk import tokenize
from nltk.corpus import stopwords
from string import punctuation
from unidecode import unidecode

app = Flask(__name__)
CORS(app)

# Lista básica de stop words em português como fallback
STOPWORDS_FALLBACK = [
    'a', 'ao', 'aos', 'as', 'à', 'às', 'da', 'das', 'de', 'do', 'dos', 'e', 'em', 'na', 'nas', 'no', 'nos',
    'o', 'os', 'para', 'por', 'que', 'um', 'uma', 'com', 'sem', 'sob', 'sobre', 'entre', 'até', 'após',
    'é', 'são', 'ser', 'estar', 'ter', 'haver', 'fazer', 'dizer', 'ir', 'vir', 'ver', 'saber', 'poder',
    'deve', 'dever', 'pode', 'poder', 'quer', 'querer', 'tem', 'têm', 'foi', 'foram', 'será', 'serão',
    'me', 'te', 'se', 'nos', 'vos', 'lhe', 'lhes', 'meu', 'minha', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas',
    'seu', 'sua', 'seus', 'suas', 'nosso', 'nossa', 'nossos', 'nossas', 'deles', 'delas', 'este', 'esta', 'estes', 'estas',
    'esse', 'essa', 'esses', 'essas', 'aquele', 'aquela', 'aqueles', 'aquelas', 'isto', 'isso', 'aquilo'
]

# Baixar dados do NLTK se necessário
def download_nltk_data():
    """Baixa os dados necessários do NLTK"""
    # Baixar punkt
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        print("Baixando dados do NLTK: punkt...")
        nltk.download('punkt', quiet=True)
    
    # Baixar stopwords - sempre tentar baixar para garantir
    print("Verificando/baixando dados do NLTK: stopwords...")
    try:
        nltk.data.find('corpora/stopwords')
        print("Stopwords já disponível")
    except LookupError:
        print("Baixando stopwords...")
        nltk.download('stopwords', quiet=True)
        
        # Verificar novamente após download
        try:
            nltk.data.find('corpora/stopwords')
            print("Stopwords baixado com sucesso")
        except LookupError:
            print("Erro: stopwords não foi baixado. Tentando novamente...")
            nltk.download('stopwords', quiet=False)

# Baixar dados necessários
download_nltk_data()

# Carregar stop words em português (após garantir que está baixado)
try:
    palavras_irrelevantes = stopwords.words("portuguese")
    print(f"Stop words carregadas: {len(palavras_irrelevantes)} palavras")
except LookupError as e:
    print(f"Erro ao carregar stop words: {e}")
    print("Tentando baixar stopwords novamente de forma forçada...")
    nltk.download('stopwords', quiet=False)
    try:
        palavras_irrelevantes = stopwords.words("portuguese")
        print(f"Stop words carregadas após novo download: {len(palavras_irrelevantes)} palavras")
    except LookupError:
        print("ERRO CRÍTICO: Não foi possível carregar stop words. Usando lista básica de fallback.")
        palavras_irrelevantes = STOPWORDS_FALLBACK

# Criar lista de pontuação
pontuacao = list(punctuation)

# Combinar stop words e pontuação
pontuacao_stopwords = pontuacao + palavras_irrelevantes

# Remover acentos das stop words (seguindo padrão do curso)
stopwords_sem_acento = [unidecode(palavra) for palavra in pontuacao_stopwords]

# Tokenizadores (seguindo padrão do curso)
token_por_espaço = tokenize.WhitespaceTokenizer()
token_pontuacao = tokenize.WordPunctTokenizer()

def process_bag_of_words(text):
    """
    Processa texto e retorna contagem de palavras (Bag of Words)
    SEMPRE aplica pré-processamento completo seguindo o padrão do curso de Tokenização NLTK:
    1. Converter para minúsculas
    2. Remover acentos
    3. Tokenizar removendo pontuação (WordPunctTokenizer)
    4. Remover stop words e pontuação (SEMPRE)
    5. Filtrar palavras com mais de 2 caracteres
    """
    # Passo 1: Converter para minúsculas (seguindo padrão do curso)
    text = text.lower()
    
    # Passo 2: Remover acentos
    text = unidecode(text)
    
    # Passo 3: Tokenizar removendo pontuação (WordPunctTokenizer)
    palavras_texto = token_pontuacao.tokenize(text)
    
    # Passo 4 e 5: SEMPRE remover stop words, pontuação e filtrar palavras pequenas
    nova_frase = []
    for palavra in palavras_texto:
        # Verificar se não é stop word e tem mais de 2 caracteres
        if palavra not in stopwords_sem_acento and len(palavra) > 2:
            nova_frase.append(palavra)
    palavras_texto = nova_frase
    
    # Contar frequência das palavras usando Counter
    word_count = Counter(palavras_texto)
    
    return word_count

def generate_wordcloud_data(text):
    """
    Gera dados para Word Cloud usando texto pré-processado
    SEMPRE aplica pré-processamento completo (stop words removidas)
    Retorna: imagem em base64 ou None se não houver palavras suficientes
    """
    # Processar texto usando a função de Bag of Words (sempre com pré-processamento)
    word_count = process_bag_of_words(text)
    
    # Verificar se há palavras suficientes
    if len(word_count) == 0:
        return None
    
    # Criar string com todas as palavras repetidas pela frequência
    # Isso é o que o WordCloud precisa para gerar a nuvem
    todas_palavras = ' '.join([palavra for palavra, freq in word_count.items() for _ in range(freq)])
    
    # Verificar se a string não está vazia
    if not todas_palavras or len(todas_palavras.strip()) == 0:
        return None
    
    try:
        # Gerar Word Cloud com configurações otimizadas
        wordcloud = WordCloud(
            width=800,
            height=500,
            max_font_size=110,
            collocations=False,  # Remove n-grams, mostra apenas palavras únicas
            background_color='white',
            relative_scaling=0.5,
            min_font_size=10
        ).generate(todas_palavras)
        
        # Converter imagem para base64 para enviar ao frontend
        img_buffer = io.BytesIO()
        wordcloud.to_image().save(img_buffer, format='PNG')
        img_buffer.seek(0)
        img_base64 = base64.b64encode(img_buffer.read()).decode('utf-8')
        
        return img_base64
    except Exception as e:
        print(f"Erro ao gerar Word Cloud: {e}")
        return None

def get_preprocessing_stats(text):
    """
    Retorna estatísticas sobre o pré-processamento do texto
    SEMPRE calcula com pré-processamento completo (stop words removidas)
    Seguindo padrão do curso para análise de impacto
    """
    # Contar palavras antes do pré-processamento
    palavras_antes = len(text.split())
    
    # Processar texto (sempre com pré-processamento)
    word_count = process_bag_of_words(text)
    
    # Estatísticas
    total_palavras_processadas = sum(word_count.values())
    palavras_unicas = len(word_count)
    stopwords_removidas = palavras_antes - total_palavras_processadas
    
    return {
        'total_palavras_original': palavras_antes,
        'total_palavras_processadas': total_palavras_processadas,
        'palavras_unicas': palavras_unicas,
        'stopwords_removidas': max(0, stopwords_removidas),
        'reducao_percentual': round((stopwords_removidas / palavras_antes * 100) if palavras_antes > 0 else 0, 2)
    }

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/api/process', methods=['POST'])
def process_text():
    """
    Endpoint principal para processar texto usando técnicas de Tokenização NLTK
    SEMPRE aplica pré-processamento completo:
    - Tokenização com WordPunctTokenizer
    - Remoção de stop words (SEMPRE)
    - Remoção de pontuação
    - Remoção de acentos
    - Conversão para minúsculas
    """
    try:
        data = request.json
        if not data or 'text' not in data:
            return jsonify({'error': 'Texto não fornecido'}), 400
        
        text = data['text']
        if not text or len(text.strip()) == 0:
            return jsonify({'error': 'Texto vazio'}), 400
        
        # Processar Bag of Words usando técnicas do curso (SEMPRE com pré-processamento)
        word_count = process_bag_of_words(text)
        
        # Preparar resultado das top palavras (top 100)
        result = [
            {'palavra': word, 'frequencia': count}
            for word, count in word_count.most_common(100)
        ]
        
        # Gerar Word Cloud com texto pré-processado (SEMPRE com pré-processamento)
        wordcloud_image = generate_wordcloud_data(text)
        
        # Obter estatísticas de pré-processamento (SEMPRE com pré-processamento)
        stats = get_preprocessing_stats(text)
        
        # Montar resposta completa
        response_data = {
            'total_palavras': sum(word_count.values()),
            'palavras_unicas': len(word_count),
            'top_palavras': result,
            'preprocessing': {
                'ativo': True,  # Sempre ativo
                'estatisticas': stats
            }
        }
        
        # Adicionar Word Cloud apenas se foi gerada com sucesso
        if wordcloud_image:
            response_data['wordcloud'] = f'data:image/png;base64,{wordcloud_image}'
        
        return jsonify(response_data)
    except Exception as e:
        print(f"Erro ao processar texto: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)

