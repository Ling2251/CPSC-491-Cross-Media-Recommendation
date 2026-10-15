
import { describe, expect, test, beforeEach } from "vitest";
import { FriendshipService } from "./friendshipService";

describe("FriendshipService - Sprint 2 and C2", () => {
  let service;

  beforeEach(() => {
    service = new FriendshipService();
  });

  // RETRIEVING DATA

  test("returns incoming pending requests", () => {
    const requests = service.getIncomingRequests(1);

    expect(requests).toHaveLength(1);
    expect(requests[0]).toEqual({
      id: 1,
      requesterId: 2,
      receiverId: 1,
      status: "pending",
    });
  });

  test("returns outgoing pending requests", () => {
    const requests = service.getOutgoingRequests(2);

    expect(requests).toHaveLength(1);
    expect(requests[0].requesterId).toBe(2);
    expect(requests[0].receiverId).toBe(1);
  });

  // SENDING REQUESTS

  test("allows a valid friend request", () => {
    const result = service.sendRequest(1, 3);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Friend request sent.");

    expect(
      service.getOutgoingRequests(1).some(
        (request) =>
          request.requesterId === 1 &&
          request.receiverId === 3
      )
    ).toBe(true);
  });

  test("rejects self friend requests", () => {
    const result = service.sendRequest(1, 1);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "You cannot send a friend request to yourself."
    );
  });

  test("rejects nonexistent requester", () => {
    const result = service.sendRequest(999, 2);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Requester does not exist.");
  });

  test("rejects nonexistent receiver", () => {
    const result = service.sendRequest(1, 999);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Receiver does not exist.");
  });

  test("rejects duplicate requests", () => {
    expect(service.sendRequest(1, 3).success).toBe(true);

    const result = service.sendRequest(1, 3);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "A friend request or friendship already exists."
    );
  });

  test("rejects reverse duplicate requests", () => {
    expect(service.sendRequest(1, 3).success).toBe(true);

    const result = service.sendRequest(3, 1);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "A friend request or friendship already exists."
    );
  });

  test("rejects invalid sender IDs", () => {
    const result = service.sendRequest(0, 3);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Valid user IDs are required."
    );
  });

  // ACCEPTING REQUESTS

  test("accepts a pending request", () => {
    const result = service.acceptRequest(1, 1);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Friend request accepted.");
    expect(service.getFriends(1)).toHaveLength(1);
    expect(service.getFriends(1)[0].status).toBe("accepted");
  });

  test("prevents sender from accepting", () => {
    const result = service.acceptRequest(1, 2);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Only the receiver can accept this request."
    );
    expect(service.getIncomingRequests(1)).toHaveLength(1);
  });

  test("rejects nonexistent acceptance request", () => {
    const result = service.acceptRequest(999, 1);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Friend request does not exist."
    );
  });

  test("prevents accepting twice", () => {
    service.acceptRequest(1, 1);

    const result = service.acceptRequest(1, 1);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "This friend request is no longer pending."
    );
  });

  // DECLINING REQUESTS

  test("declines a pending request", () => {
    const result = service.declineRequest(1, 1);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Friend request declined.");
    expect(service.getIncomingRequests(1)).toHaveLength(0);
  });

  test("prevents sender from declining", () => {
    const result = service.declineRequest(1, 2);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Only the receiver can decline this request."
    );
  });

  test("rejects nonexistent decline request", () => {
    const result = service.declineRequest(999, 1);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Friend request does not exist."
    );
  });

  // CANCELLING REQUESTS

  test("allows sender to cancel pending request", () => {
    const result = service.cancelRequest(1, 2);

    expect(result.success).toBe(true);
    expect(result.message).toBe(
      "Friend request cancelled."
    );
    expect(service.getOutgoingRequests(2)).toHaveLength(0);
    expect(service.getIncomingRequests(1)).toHaveLength(0);
  });

  test("prevents receiver from cancelling", () => {
    const result = service.cancelRequest(1, 1);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Only the sender can cancel this request."
    );
    expect(service.getOutgoingRequests(2)).toHaveLength(1);
  });

  test("prevents cancelling accepted request", () => {
    service.acceptRequest(1, 1);

    const result = service.cancelRequest(1, 2);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Pending friend request does not exist."
    );
  });

  // REMOVING FRIENDS

  test("removes accepted friend", () => {
    service.acceptRequest(1, 1);

    const result = service.removeFriend(1, 1);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Friend removed.");
    expect(service.getFriends(1)).toHaveLength(0);
  });

  test("prevents unauthorized friend removal", () => {
    service.acceptRequest(1, 1);

    const result = service.removeFriend(1, 999);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "You are not part of this friendship."
    );
    expect(service.getFriends(1)).toHaveLength(1);
  });

  test("does not remove pending request as friend", () => {
    const result = service.removeFriend(1, 1);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Accepted friendship does not exist."
    );
  });

  // HELPER METHODS

  test("returns other user ID", () => {
    const friendship = {
      id: 10,
      requesterId: 1,
      receiverId: 4,
      status: "accepted",
    };

    expect(service.getOtherUserId(friendship, 1)).toBe(4);
    expect(service.getOtherUserId(friendship, 4)).toBe(1);
  });
});

// =============================================
// SPRINT 3 C3 - VALIDATION TESTS
// =============================================

describe("FriendshipService - C3 Validation", () => {
  let service;

  beforeEach(() => {
    service = new FriendshipService();
  });

  test.each([
    null,
    undefined,
    "",
    "   ",
    "abc",
    0,
    -1,
    1.5,
    NaN,
    Infinity,
    {},
    [],
  ])("rejects malformed sender ID %s", (invalidId) => {
    const result = service.sendRequest(invalidId, 3);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Valid user IDs are required."
    );
  });

  test.each([
    null,
    undefined,
    "",
    "abc",
    -1,
    2.5,
    Infinity,
  ])("rejects malformed receiver ID %s", (invalidId) => {
    const result = service.sendRequest(1, invalidId);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Valid user IDs are required."
    );
  });

  test("accepts numeric string IDs", () => {
    const result = service.sendRequest("1", "3");

    expect(result.success).toBe(true);
  });

  test("rejects invalid acceptance ID", () => {
    const result = service.acceptRequest(null, 1);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Valid request and user IDs are required."
    );
  });

  test("rejects invalid decline user ID", () => {
    const result = service.declineRequest(1, "");

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Valid request and user IDs are required."
    );
  });

  test("rejects invalid cancel ID", () => {
    const result = service.cancelRequest("abc", 2);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Valid request and user IDs are required."
    );
  });

  test("rejects invalid removal user ID", () => {
    const result = service.removeFriend(1, undefined);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Valid friendship and user IDs are required."
    );
  });

  test("prevents declining accepted request", () => {
    service.acceptRequest(1, 1);

    const result = service.declineRequest(1, 1);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "This friend request is no longer pending."
    );
  });

  test("prevents accepting declined request", () => {
    service.declineRequest(1, 1);

    const result = service.acceptRequest(1, 1);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "This friend request is no longer pending."
    );
  });

  test("does not mutate friendship after failed actions", () => {
    const before = structuredClone(service.getAll());

    service.sendRequest(1, 1);
    service.acceptRequest(1, 2);
    service.cancelRequest(1, 1);

    expect(service.getAll()).toEqual(before);
  });

  test("does not remove friendship for non-participant", () => {
    service.acceptRequest(1, 1);

    const before = structuredClone(service.getAll());

    const result = service.removeFriend(1, 999);

    expect(result.success).toBe(false);
    expect(service.getAll()).toEqual(before);
  });

  test("returns null for unrelated user", () => {
    const friendship = {
      id: 10,
      requesterId: 1,
      receiverId: 2,
      status: "accepted",
    };

    expect(
      service.getOtherUserId(friendship, 999)
    ).toBe(null);
  });

  test("returns empty results for invalid IDs", () => {
    expect(service.getFriends(null)).toEqual([]);
    expect(service.getIncomingRequests("abc")).toEqual([]);
    expect(service.getOutgoingRequests(-1)).toEqual([]);
  });
});
