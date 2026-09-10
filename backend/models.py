from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    genres = db.Column(db.String(500), default='')
    languages = db.Column(db.String(500), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    watch_history = db.relationship('WatchHistory', backref='user', lazy=True, cascade='all, delete-orphan')
    ratings = db.relationship('Rating', backref='user', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'genres': self.genres.split(',') if self.genres else [],
            'languages': self.languages.split(',') if self.languages else [],
            'created_at': self.created_at.isoformat()
        }


class Media(db.Model):
    __tablename__ = 'media'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    media_type = db.Column(db.String(50), nullable=False)
    genres = db.Column(db.String(500))
    languages = db.Column(db.String(500))
    release_date = db.Column(db.DateTime)
    rating = db.Column(db.Float, default=0.0)
    thumbnail = db.Column(db.String(500))
    url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user_ratings = db.relationship('Rating', backref='media', lazy=True, cascade='all, delete-orphan')
    recommendations = db.relationship('Recommendation', backref='media', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'media_type': self.media_type,
            'genres': self.genres.split(',') if self.genres else [],
            'languages': self.languages.split(',') if self.languages else [],
            'release_date': self.release_date.isoformat() if self.release_date else None,
            'rating': self.rating,
            'thumbnail': self.thumbnail,
            'url': self.url,
            'created_at': self.created_at.isoformat()
        }


class Rating(db.Model):
    __tablename__ = 'ratings'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    media_id = db.Column(db.Integer, db.ForeignKey('media.id'), nullable=False)
    rating = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'media_id': self.media_id,
            'rating': self.rating,
            'timestamp': self.timestamp.isoformat()
        }


class WatchHistory(db.Model):
    __tablename__ = 'watch_history'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    media_id = db.Column(db.Integer, db.ForeignKey('media.id'), nullable=False)
    watched_at = db.Column(db.DateTime, default=datetime.utcnow)

    media = db.relationship('Media')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'media_id': self.media_id,
            'watched_at': self.watched_at.isoformat()
        }


class Recommendation(db.Model):
    __tablename__ = 'recommendations'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    media_id = db.Column(db.Integer, db.ForeignKey('media.id'), nullable=False)
    score = db.Column(db.Float, default=0.0)
    algorithm = db.Column(db.String(50), default='hybrid')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'media_id': self.media_id,
            'media': self.media.to_dict() if self.media else None,
            'score': self.score,
            'algorithm': self.algorithm,
            'created_at': self.created_at.isoformat()
        }
