import { describe, expect, test, beforeEach } from "vitest";
import { FriendshipService } from "./friendshipService";

describe("FriendshipService", () => {
  let service;

  beforeEach(() => {
    service = new FriendshipService();
  });

  test("returns incoming pending requests for a user", () => {
    const requests = service.getIncomingRequests(1);

    expect(requests.length).toBe(1);

    expect(requests[0]).toEqual({
      id: 1,
      requesterId: 2,
      receiverId: 1,
      status: "pending",
    });
  });

  test("allows a valid friend request", () => {
    const result = service.sendRequest(1, 3);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Friend request sent.");

    const requests = service.getOutgoingRequests(1);

    expect(
      requests.some(
        (request) =>
          request.requesterId === 1 &&
          request.receiverId === 3
      )
    ).toBe(true);
  });

  test("rejects sending a friend request to yourself", () => {
    const result = service.sendRequest(1, 1);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "You cannot send a friend request to yourself."
    );
  });

  test("rejects a request from a user that does not exist", () => {
    const result = service.sendRequest(999, 2);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Requester does not exist."
    );
  });

  test("rejects a request to a user that does not exist", () => {
    const result = service.sendRequest(1, 999);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Receiver does not exist."
    );
  });

  test("rejects duplicate friendship requests", () => {
    const first = service.sendRequest(1, 3);
    const second = service.sendRequest(1, 3);

    expect(first.success).toBe(true);

    expect(second.success).toBe(false);
    expect(second.message).toBe(
      "A friend request or friendship already exists."
    );
  });

  test("rejects reverse duplicate friendship requests", () => {
    const first = service.sendRequest(1, 3);
    const second = service.sendRequest(3, 1);

    expect(first.success).toBe(true);

    expect(second.success).toBe(false);
    expect(second.message).toBe(
      "A friend request or friendship already exists."
    );
  });

  test("accepts a pending friend request", () => {
    const result = service.acceptRequest(1);

    expect(result.success).toBe(true);
    expect(result.message).toBe(
      "Friend request accepted."
    );

    const friends = service.getFriends(1);

    expect(friends.length).toBe(1);
    expect(friends[0].status).toBe("accepted");
  });

  test("declines a pending friend request", () => {
    const result = service.declineRequest(1);

    expect(result.success).toBe(true);
    expect(result.message).toBe(
      "Friend request declined."
    );

    const incomingRequests =
      service.getIncomingRequests(1);

    expect(incomingRequests.length).toBe(0);
  });

  test("returns an error when accepting a nonexistent request", () => {
    const result = service.acceptRequest(999);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Friend request does not exist."
    );
  });

  test("returns an error when declining a nonexistent request", () => {
    const result = service.declineRequest(999);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Friend request does not exist."
    );
  });

  test("removes an accepted friend", () => {
    service.acceptRequest(1);

    expect(service.getFriends(1).length).toBe(1);

    const result = service.removeFriend(1);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Friend removed.");

    expect(service.getFriends(1).length).toBe(0);
  });

  test("does not remove a pending request as a friend", () => {
    const result = service.removeFriend(1);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Accepted friendship does not exist."
    );
  });

  test("returns the other user's id in a friendship", () => {
    const friendship = {
      id: 10,
      requesterId: 1,
      receiverId: 4,
      status: "accepted",
    };

    expect(
      service.getOtherUserId(friendship, 1)
    ).toBe(4);

    expect(
      service.getOtherUserId(friendship, 4)
    ).toBe(1);
  });
});