from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os

from config import Config
from models import db
from routes import users_bp, media_bp, recommendations_bp

load_dotenv()

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)
jwt = JWTManager(app)
CORS(app)

with app.app_context():
    db.create_all()

app.register_blueprint(users_bp, url_prefix='/api/users')
app.register_blueprint(media_bp, url_prefix='/api/media')
app.register_blueprint(recommendations_bp, url_prefix='/api/recommendations')

@app.route('/api/health', methods=['GET'])
def health():
    return {'status': 'Server is running'}

if __name__ == '__main__':
    app.run(debug=os.getenv('FLASK_ENV') == 'development', host='0.0.0.0', port=int(os.getenv('PORT', 5000)))
