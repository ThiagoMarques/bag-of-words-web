"""
API Python para processamento de texto usando NLTK
Implementa técnicas avançadas conforme curso FIAP

Técnicas aplicadas (seguindo padrão do curso):
1. Tokenização com NLTK (WhitespaceTokenizer e WordPunctTokenizer)
2. Remoção de Stop Words usando nltk.corpus.stopwords
3. Remoção de Pontuação
4. Remoção de Acentos usando unidecode
5. Conversão para minúsculas
6. Filtragem de palavras pequenas (menos de 2 caracteres)
7. Stemming com RSLP (Removedor de Sufixos da Língua Portuguesa)
8. TF-IDF (Term Frequency-Inverse Document Frequency)
9. N-grams (unigramas e bigramas)
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
from nltk.stem import RSLPStemmer
from string import punctuation
from unidecode import unidecode
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np

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
    import ssl
    
    # Desabilitar verificação SSL temporariamente para macOS (problema comum)
    try:
        _create_unverified_https_context = ssl._create_unverified_context
    except AttributeError:
        pass
    else:
        ssl._create_default_https_context = _create_unverified_https_context
    
    # Baixar punkt
    try:
        nltk.data.find('tokenizers/punkt')
        print("Punkt já disponível")
    except LookupError:
        print("Baixando dados do NLTK: punkt...")
        try:
            nltk.download('punkt', quiet=True)
        except Exception as e:
            print(f"Aviso: Erro ao baixar punkt: {e}")
    
    # Baixar stopwords
    print("Verificando/baixando dados do NLTK: stopwords...")
    try:
        nltk.data.find('corpora/stopwords')
        print("Stopwords já disponível")
    except LookupError:
        print("Baixando stopwords...")
        try:
            nltk.download('stopwords', quiet=True)
            # Verificar novamente após download
            try:
                nltk.data.find('corpora/stopwords')
                print("Stopwords baixado com sucesso")
            except LookupError:
                print("Erro: stopwords não foi baixado. Tentando novamente...")
                nltk.download('stopwords', quiet=False)
        except Exception as e:
            print(f"Aviso: Erro ao baixar stopwords: {e}")
    
    # Baixar RSLP (necessário para RSLPStemmer)
    print("Verificando/baixando dados do NLTK: rslp...")
    try:
        nltk.data.find('stemmers/rslp')
        print("RSLP já disponível")
    except LookupError:
        print("Baixando RSLP...")
        try:
            nltk.download('rslp', quiet=True)
            # Verificar novamente após download
            try:
                nltk.data.find('stemmers/rslp')
                print("RSLP baixado com sucesso")
            except LookupError:
                print("Erro: RSLP não foi baixado. Tentando novamente...")
                nltk.download('rslp', quiet=False)
        except Exception as e:
            print(f"Aviso: Erro ao baixar RSLP: {e}")

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

# Stemmer RSLP (seguindo padrão do curso)
# Tentar carregar RSLPStemmer, usar None se não conseguir
stemmer = None
try:
    # Verificar se RSLP está disponível
    try:
        nltk.data.find('stemmers/rslp')
        print("RSLP já disponível")
    except LookupError:
        print("RSLP não encontrado. Tentando baixar...")
        import ssl
        # Desabilitar verificação SSL temporariamente para macOS
        try:
            _create_unverified_https_context = ssl._create_unverified_context
        except AttributeError:
            pass
        else:
            ssl._create_default_https_context = _create_unverified_https_context
        
        try:
            nltk.download('rslp', quiet=True)
            # Verificar novamente
            try:
                nltk.data.find('stemmers/rslp')
                print("RSLP baixado com sucesso")
            except LookupError:
                print("Tentando baixar RSLP novamente (modo verbose)...")
                nltk.download('rslp', quiet=False)
        except Exception as download_error:
            print(f"Erro ao baixar RSLP: {download_error}")
            raise
    
    # Tentar criar o stemmer
    stemmer = RSLPStemmer()
    print("RSLPStemmer carregado com sucesso")
except Exception as e:
    print(f"AVISO: Não foi possível carregar RSLPStemmer: {e}")
    print("Stemming será desabilitado. Para habilitar, baixe o RSLP manualmente:")
    print("  python -c \"import nltk; import ssl; ssl._create_default_https_context = ssl._create_unverified_context; nltk.download('rslp')\"")
    stemmer = None

def process_bag_of_words(text, use_stemming=True):
    """
    Processa texto e retorna contagem de palavras (Bag of Words)
    SEMPRE aplica pré-processamento completo seguindo o padrão do curso:
    1. Converter para minúsculas
    2. Remover acentos
    3. Tokenizar removendo pontuação (WordPunctTokenizer)
    4. Remover stop words e pontuação (SEMPRE)
    5. Filtrar palavras com mais de 2 caracteres
    6. Aplicar Stemming com RSLP (se use_stemming=True)
    """
    # Passo 1: Converter para minúsculas (seguindo padrão do curso)
    text = text.lower()
    
    # Passo 2: Remover acentos
    text = unidecode(text)
    
    # Passo 3: Tokenizar removendo pontuação (WordPunctTokenizer)
    palavras_texto = token_pontuacao.tokenize(text)
    
    # Passo 4, 5 e 6: Remover stop words, filtrar e aplicar stemming
    nova_frase = []
    for palavra in palavras_texto:
        # Verificar se não é stop word e tem mais de 2 caracteres
        if palavra not in stopwords_sem_acento and len(palavra) > 2:
            # Aplicar stemming se solicitado e disponível (seguindo padrão do curso)
            if use_stemming and stemmer is not None:
                try:
                    palavra = stemmer.stem(palavra)
                except Exception as e:
                    print(f"Aviso: Erro ao aplicar stemming na palavra '{palavra}': {e}")
                    # Continuar sem stemming se houver erro
            nova_frase.append(palavra)
    palavras_texto = nova_frase
    
    # Contar frequência das palavras usando Counter
    word_count = Counter(palavras_texto)
    
    return word_count

def process_with_tfidf(text, use_stemming=True, use_ngrams=True):
    """
    Processa texto usando TF-IDF (seguindo padrão do curso)
    Retorna: vetor TF-IDF e palavras com seus pesos
    """
    # Pré-processar texto (mesmo processo do Bag of Words)
    text_lower = text.lower()
    text_no_accent = unidecode(text_lower)
    palavras_texto = token_pontuacao.tokenize(text_no_accent)
    
    # Remover stop words e aplicar stemming
    nova_frase = []
    for palavra in palavras_texto:
        if palavra not in stopwords_sem_acento and len(palavra) > 2:
            if use_stemming and stemmer is not None:
                try:
                    palavra = stemmer.stem(palavra)
                except Exception as e:
                    print(f"Aviso: Erro ao aplicar stemming na palavra '{palavra}': {e}")
                    # Continuar sem stemming se houver erro
            nova_frase.append(palavra)
    
    # Juntar palavras processadas
    texto_processado = ' '.join(nova_frase)
    
    # Verificar se há texto suficiente após pré-processamento
    if not texto_processado or len(texto_processado.strip()) == 0:
        raise ValueError('Texto vazio após pré-processamento. Não há palavras suficientes para processar.')
    
    # Configurar TF-IDF Vectorizer
    ngram_range = (1, 2) if use_ngrams else (1, 1)
    tfidf = TfidfVectorizer(
        lowercase=False,  # Já está em minúsculas
        max_features=100,
        ngram_range=ngram_range
    )
    
    # Vetorizar (precisa de lista de documentos)
    # Para um único documento, criamos uma lista com um elemento
    try:
        tfidf_matrix = tfidf.fit_transform([texto_processado])
    except ValueError as e:
        # Se houver erro (ex: texto muito curto), retornar erro mais claro
        raise ValueError(f'Erro ao processar com TF-IDF: {str(e)}. Texto pode estar muito curto após pré-processamento.')
    
    # Obter feature names (palavras/ngrams)
    feature_names = tfidf.get_feature_names_out()
    
    # Obter scores TF-IDF
    scores = tfidf_matrix.toarray()[0]
    
    # Criar dicionário palavra -> score TF-IDF
    word_scores = dict(zip(feature_names, scores))
    
    # Ordenar por score (maior para menor)
    sorted_words = sorted(word_scores.items(), key=lambda x: x[1], reverse=True)
    
    return {
        'word_scores': word_scores,
        'top_words': [{'palavra': word, 'peso': float(score)} for word, score in sorted_words[:100]],
        'total_features': len(feature_names)
    }

def generate_wordcloud_data(text, use_stemming=True):
    """
    Gera dados para Word Cloud usando texto pré-processado
    SEMPRE aplica pré-processamento completo (stop words removidas)
    Opcionalmente aplica stemming (padrão: True)
    Retorna: imagem em base64 ou None se não houver palavras suficientes
    """
    # Processar texto usando a função de Bag of Words (sempre com pré-processamento)
    word_count = process_bag_of_words(text, use_stemming=use_stemming)
    
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

def get_preprocessing_stats(text, use_stemming=True):
    """
    Retorna estatísticas sobre o pré-processamento do texto
    SEMPRE calcula com pré-processamento completo (stop words removidas)
    Seguindo padrão do curso para análise de impacto
    """
    # Contar palavras antes do pré-processamento
    palavras_antes = len(text.split())
    
    # Processar texto (sempre com pré-processamento)
    word_count = process_bag_of_words(text, use_stemming=use_stemming)
    
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
    Endpoint principal para processar texto usando técnicas avançadas
    SEMPRE aplica pré-processamento completo:
    - Tokenização com WordPunctTokenizer
    - Remoção de stop words (SEMPRE)
    - Remoção de pontuação
    - Remoção de acentos
    - Conversão para minúsculas
    - Stemming com RSLP (padrão: True)
    - TF-IDF opcional (padrão: False, usa Bag of Words)
    - N-grams opcional (padrão: True quando TF-IDF está ativo)
    """
    try:
        data = request.json
        if not data or 'text' not in data:
            return jsonify({'error': 'Texto não fornecido'}), 400
        
        text = data['text']
        if not text or len(text.strip()) == 0:
            return jsonify({'error': 'Texto vazio'}), 400
        
        # Parâmetros opcionais (seguindo padrão do curso)
        use_stemming = data.get('use_stemming', True)  # Padrão: True
        use_tfidf = data.get('use_tfidf', False)  # Padrão: False (usa Bag of Words)
        use_ngrams = data.get('use_ngrams', True)  # Padrão: True (quando TF-IDF ativo)
        
        response_data = {
            'preprocessing': {
                'ativo': True,
                'stemming': use_stemming,
                'tfidf': use_tfidf,
                'ngrams': use_ngrams if use_tfidf else False
            }
        }
        
        if use_tfidf:
            # Processar com TF-IDF (seguindo padrão do curso)
            tfidf_result = process_with_tfidf(text, use_stemming=use_stemming, use_ngrams=use_ngrams)
            
            # Converter scores TF-IDF para formato similar ao Bag of Words
            # Usar pesos TF-IDF como "frequência" para Word Cloud
            word_count_dict = {word: score * 1000 for word, score in tfidf_result['word_scores'].items()}
            word_count = Counter(word_count_dict)
            
            response_data.update({
                'total_palavras': len(tfidf_result['word_scores']),
                'palavras_unicas': tfidf_result['total_features'],
                'top_palavras': tfidf_result['top_words'],
                'metodo': 'TF-IDF'
            })
        else:
            # Processar Bag of Words (seguindo padrão do curso)
            word_count = process_bag_of_words(text, use_stemming=use_stemming)
            
            # Verificar se há palavras após processamento
            if len(word_count) == 0:
                return jsonify({
                    'error': 'Texto vazio após pré-processamento',
                    'message': 'Não há palavras suficientes após remover stop words e aplicar filtros. Tente com um texto maior.'
                }), 400
            
            # Preparar resultado das top palavras (top 100)
            result = [
                {'palavra': word, 'frequencia': count}
                for word, count in word_count.most_common(100)
            ]
            
            response_data.update({
                'total_palavras': sum(word_count.values()),
                'palavras_unicas': len(word_count),
                'top_palavras': result,
                'metodo': 'Bag of Words'
            })
        
        # Gerar Word Cloud com texto pré-processado (pode falhar se não houver palavras suficientes)
        try:
            wordcloud_image = generate_wordcloud_data(text, use_stemming=use_stemming)
            if wordcloud_image:
                response_data['wordcloud'] = f'data:image/png;base64,{wordcloud_image}'
        except Exception as wc_error:
            print(f"Aviso: Não foi possível gerar Word Cloud: {wc_error}")
            # Não falhar a requisição se Word Cloud falhar
        
        # Obter estatísticas de pré-processamento
        try:
            stats = get_preprocessing_stats(text, use_stemming=use_stemming)
            stats['stemming_aplicado'] = use_stemming
            response_data['preprocessing']['estatisticas'] = stats
        except Exception as stats_error:
            print(f"Aviso: Erro ao calcular estatísticas: {stats_error}")
            # Usar estatísticas básicas se houver erro
            response_data['preprocessing']['estatisticas'] = {
                'total_palavras_original': len(text.split()),
                'total_palavras_processadas': response_data.get('total_palavras', 0),
                'palavras_unicas': response_data.get('palavras_unicas', 0),
                'stopwords_removidas': 0,
                'reducao_percentual': 0,
                'stemming_aplicado': use_stemming
            }
        
        return jsonify(response_data)
    except Exception as e:
        print(f"Erro ao processar texto: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)

