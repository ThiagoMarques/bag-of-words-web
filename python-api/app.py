from flask import Flask, request, jsonify
from flask_cors import CORS
import re
from collections import Counter

app = Flask(__name__)
CORS(app)

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
        
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)
        words = text.split()
        words = [w for w in words if len(w) > 2]
        word_count = Counter(words)
        
        result = [
            {'palavra': word, 'frequencia': count}
            for word, count in word_count.most_common(100)
        ]
        
        return jsonify({
            'total_palavras': len(words),
            'palavras_unicas': len(word_count),
            'top_palavras': result
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

