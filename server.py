from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)  # Tüm origin'lere izin ver

NOTES_FILE = 'notes.json'

def load_notes():
    """Notları dosyadan yükle"""
    if os.path.exists(NOTES_FILE):
        try:
            with open(NOTES_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {"notes": ""}
    return {"notes": ""}

def save_notes(notes_data):
    """Notları dosyaya kaydet"""
    try:
        with open(NOTES_FILE, 'w', encoding='utf-8') as f:
            json.dump(notes_data, f, ensure_ascii=False, indent=2)
        return True
    except:
        return False

@app.route('/')
def serve_index():
    """Ana sayfa"""
    return send_from_directory('.', 'index.html')

@app.route('/api/notes', methods=['GET'])
def get_notes():
    """Notları getir"""
    notes_data = load_notes()
    return jsonify(notes_data)

@app.route('/api/notes', methods=['POST'])
def save_notes_api():
    """Notları kaydet"""
    try:
        data = request.get_json()
        notes_text = data.get('notes', '')
        
        notes_data = {"notes": notes_text}
        
        if save_notes(notes_data):
            return jsonify({"success": True, "message": "Notes saved successfully!"})
        else:
            return jsonify({"success": False, "message": "Failed to save notes"}), 500
            
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400

if __name__ == '__main__':
    print("🚀 Pokemon Test Server Starting...")
    print("📝 Notes will be saved to notes.json")
    print("🌐 Server: http://localhost:5000")
    print("="*50)
    app.run(host='0.0.0.0', port=5000, debug=True) 