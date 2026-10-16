
const pool = require("../db");

class FriendshipService {
  // ==========================================
  // GET ACCEPTED FRIENDSHIPS
  // ==========================================
  async getFriends(userId) {
    const result = await pool.query(
      `SELECT *
       FROM friendships
       WHERE (requester_id = $1 OR receiver_id = $1)
         AND status = 'accepted'
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  // ==========================================
  // GET INCOMING FRIEND REQUESTS
  // ==========================================
  async getIncomingRequests(userId) {
    const result = await pool.query(
      `SELECT *
       FROM friendships
       WHERE receiver_id = $1
         AND status = 'pending'
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  // ==========================================
  // GET OUTGOING FRIEND REQUESTS
  // ==========================================
  async getOutgoingRequests(userId) {
    const result = await pool.query(
      `SELECT *
       FROM friendships
       WHERE requester_id = $1
         AND status = 'pending'
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  // ==========================================
  // SEND FRIEND REQUEST
  // ==========================================
  async sendRequest(requesterId, receiverId) {
    if (Number(requesterId) === Number(receiverId)) {
      throw new Error(
        "Cannot send a friend request to yourself."
      );
    }

    const result = await pool.query(
      `INSERT INTO friendships
         (requester_id, receiver_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (
         LEAST(requester_id, receiver_id),
         GREATEST(requester_id, receiver_id)
       )
       DO NOTHING
       RETURNING *`,
      [requesterId, receiverId]
    );

    if (result.rows.length === 0) {
      throw new Error(
        "A friendship or request already exists."
      );
    }

    return result.rows[0];
  }

  // ==========================================
  // ACCEPT FRIEND REQUEST
  // ==========================================
  async acceptRequest(requestId, userId) {
    const result = await pool.query(
      `UPDATE friendships
       SET status = 'accepted'
       WHERE id = $1
         AND receiver_id = $2
         AND status = 'pending'
       RETURNING *`,
      [requestId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error(
        "Pending request not found or not authorized."
      );
    }

    return result.rows[0];
  }

  // ==========================================
  // DECLINE FRIEND REQUEST
  // ==========================================
  async declineRequest(requestId, userId) {
    const result = await pool.query(
      `UPDATE friendships
       SET status = 'declined'
       WHERE id = $1
         AND receiver_id = $2
         AND status = 'pending'
       RETURNING *`,
      [requestId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error(
        "Pending request not found or not authorized."
      );
    }

    return result.rows[0];
  }

  // ==========================================
  // CANCEL OUTGOING REQUEST
  // ==========================================
  async cancelRequest(requestId, userId) {
    const result = await pool.query(
      `DELETE FROM friendships
       WHERE id = $1
         AND requester_id = $2
         AND status = 'pending'
       RETURNING *`,
      [requestId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error(
        "Pending request not found or not authorized."
      );
    }

    return result.rows[0];
  }

  // ==========================================
  // REMOVE ACCEPTED FRIEND
  // ==========================================
  async removeFriend(friendshipId, userId) {
    const result = await pool.query(
      `DELETE FROM friendships
       WHERE id = $1
         AND (requester_id = $2 OR receiver_id = $2)
         AND status = 'accepted'
       RETURNING *`,
      [friendshipId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error(
        "Friendship not found or not authorized."
      );
    }

    return result.rows[0];
  }
}

module.exports = new FriendshipService();
