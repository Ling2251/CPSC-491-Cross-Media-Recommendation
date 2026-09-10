from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Media, Recommendation, Rating

recommendations_bp = Blueprint('recommendations', __name__)

@recommendations_bp.route('/', methods=['GET'])
@jwt_required()
def get_recommendations():
    try:
        user_id = get_jwt_identity()
        limit = request.args.get('limit', 10, type=int)

        recommendations = Recommendation.query.filter_by(user_id=user_id).order_by(
            Recommendation.score.desc()
        ).limit(limit).all()

        return jsonify([r.to_dict() for r in recommendations]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@recommendations_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_recommendations():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        user_genres = user.genres.split(',') if user.genres else []
        user_genres = [g.strip() for g in user_genres if g.strip()]

        recommendations = []

        if user_genres:
            media_list = []
            for genre in user_genres:
                media_list.extend(Media.query.filter(Media.genres.contains(genre)).limit(5).all())
        else:
            media_list = Media.query.limit(20).all()

        seen_media = set()
        for media in media_list:
            if media.id in seen_media:
                continue
            seen_media.add(media.id)

            existing = Recommendation.query.filter_by(user_id=user_id, media_id=media.id).first()
            if existing:
                continue

            avg_rating = media.rating or 0.0
            score = min(100, avg_rating * 10)

            rec = Recommendation(
                user_id=user_id,
                media_id=media.id,
                score=score,
                algorithm='content_based'
            )
            db.session.add(rec)
            recommendations.append(rec)

        db.session.commit()

        return jsonify([r.to_dict() for r in recommendations]), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@recommendations_bp.route('/<int:rec_id>', methods=['DELETE'])
@jwt_required()
def delete_recommendation(rec_id):
    try:
        user_id = get_jwt_identity()
        recommendation = Recommendation.query.get(rec_id)

        if not recommendation:
            return jsonify({'error': 'Recommendation not found'}), 404

        if recommendation.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403

        db.session.delete(recommendation)
        db.session.commit()

        return jsonify({'message': 'Recommendation deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
