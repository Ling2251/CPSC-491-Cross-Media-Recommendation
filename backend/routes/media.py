from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Media, Rating

media_bp = Blueprint('media', __name__)

@media_bp.route('/', methods=['GET'])
def get_media():
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        media_type = request.args.get('type')
        genre = request.args.get('genre')

        query = Media.query

        if media_type:
            query = query.filter_by(media_type=media_type)
        if genre:
            query = query.filter(Media.genres.contains(genre))

        paginated = query.paginate(page=page, per_page=limit)

        return jsonify({
            'media': [m.to_dict() for m in paginated.items],
            'total': paginated.total,
            'page': page,
            'pages': paginated.pages
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@media_bp.route('/<int:media_id>', methods=['GET'])
def get_media_detail(media_id):
    try:
        media = Media.query.get(media_id)

        if not media:
            return jsonify({'error': 'Media not found'}), 404

        return jsonify(media.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@media_bp.route('/', methods=['POST'])
@jwt_required()
def create_media():
    try:
        data = request.get_json()

        if not data.get('title') or not data.get('media_type'):
            return jsonify({'error': 'Missing required fields'}), 400

        genres = ','.join(data.get('genres', [])) if isinstance(data.get('genres', []), list) else data.get('genres', '')
        languages = ','.join(data.get('languages', [])) if isinstance(data.get('languages', []), list) else data.get('languages', '')

        media = Media(
            title=data['title'],
            description=data.get('description'),
            media_type=data['media_type'],
            genres=genres,
            languages=languages,
            thumbnail=data.get('thumbnail'),
            url=data.get('url')
        )

        db.session.add(media)
        db.session.commit()

        return jsonify(media.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@media_bp.route('/<int:media_id>/rate', methods=['POST'])
@jwt_required()
def rate_media(media_id):
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        if not data.get('rating'):
            return jsonify({'error': 'Missing rating'}), 400

        media = Media.query.get(media_id)
        if not media:
            return jsonify({'error': 'Media not found'}), 404

        existing_rating = Rating.query.filter_by(user_id=user_id, media_id=media_id).first()
        if existing_rating:
            existing_rating.rating = data['rating']
        else:
            rating = Rating(user_id=user_id, media_id=media_id, rating=data['rating'])
            db.session.add(rating)

        db.session.commit()

        avg_rating = db.session.query(db.func.avg(Rating.rating)).filter_by(media_id=media_id).scalar()
        media.rating = avg_rating or 0.0
        db.session.commit()

        return jsonify(media.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
