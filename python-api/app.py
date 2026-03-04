from flask import Flask, request, jsonify
from flask_cors import CORS
import re
from collections import Counter
from wordcloud import WordCloud
import base64
import io

app = Flask(__name__)
CORS(app)

def process_bag_of_words(text):
    """
    Processa texto e retorna contagem de palavras (Bag of Words)
    """
    # Converter para minúsculas
    text = text.lower()
    
    # Remover pontuação e caracteres especiais
    text = re.sub(r'[^\w\s]', ' ', text)
    
    # Dividir em palavras
    words = text.split()
    
    # Filtrar palavras muito curtas (menos de 3 caracteres)
    words = [w for w in words if len(w) > 2]
    
    # Contar frequência das palavras
    word_count = Counter(words)
    
    return word_count

def generate_wordcloud_data(text):
    """
    Gera dados para Word Cloud
    Retorna: imagem em base64 ou None se não houver palavras suficientes
    """
    word_count = process_bag_of_words(text)
    
    # Verificar se há palavras suficientes
    if len(word_count) == 0:
        return None
    
    # Criar string com todas as palavras repetidas pela frequência
    # Isso é o que o WordCloud precisa
    todas_palavras = ' '.join([palavra for palavra, freq in word_count.items() for _ in range(freq)])
    
    # Verificar se a string não está vazia
    if not todas_palavras or len(todas_palavras.strip()) == 0:
        return None
    
    try:
        # Gerar Word Cloud
        wordcloud = WordCloud(
            width=800,
            height=500,
            max_font_size=110,
            collocations=False,  # Remove n-grams, mostra apenas palavras únicas
            background_color='white'
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

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/api/process', methods=['POST'])
def process_text():
    try:
        data = request.json
        if not data or 'text' not in data:
            return jsonify({'error': 'Texto não fornecido'}), 400
        
        text = data['text']
        if not text or len(text.strip()) == 0:
            return jsonify({'error': 'Texto vazio'}), 400
        
        # Processar Bag of Words
        word_count = process_bag_of_words(text)
        
        # Preparar resultado das top palavras
        result = [
            {'palavra': word, 'frequencia': count}
            for word, count in word_count.most_common(100)
        ]
        
        # Gerar Word Cloud
        wordcloud_image = generate_wordcloud_data(text)
        
        response_data = {
            'total_palavras': sum(word_count.values()),
            'palavras_unicas': len(word_count),
            'top_palavras': result
        }
        
        # Adicionar Word Cloud apenas se foi gerada com sucesso
        if wordcloud_image:
            response_data['wordcloud'] = f'data:image/png;base64,{wordcloud_image}'
        
        return jsonify(response_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)

