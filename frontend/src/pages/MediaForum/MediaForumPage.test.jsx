
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import MediaForumPage from "./MediaForumPage";
import * as forumApi from "../../services/mediaForumApi";

vi.mock("../../services/mediaForumApi", () => ({
  getMediaPosts: vi.fn(),
  createForumPost: vi.fn(),
  getPostReplies: vi.fn(),
  createForumReply: vi.fn(),
  editForumPost: vi.fn(),
  deleteForumPost: vi.fn(),
}));

const post = {
  id: 10,
  media_id: 1,
  user_id: 1,
  author_name: "Demo User A",
  content: "What did everyone think?",
  created_at: "2026-11-13T01:00:00Z",
};

const reply = {
  id: 20,
  post_id: 10,
  user_id: 2,
  author_name: "Demo User B",
  content: "I really enjoyed it!",
  created_at: "2026-11-13T01:01:00Z",
};

function setTestUser(userId = 1) {
  const payload = btoa(JSON.stringify({ userId }));
  localStorage.setItem("token", `header.${payload}.signature`);
}

function renderForum() {
  return render(
    <MemoryRouter initialEntries={["/media-forum/1"]}>
      <Routes>
        <Route
          path="/media-forum/:mediaId"
          element={<MediaForumPage />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("MediaForumPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setTestUser(1);

    forumApi.getMediaPosts.mockResolvedValue([post]);
    forumApi.getPostReplies.mockResolvedValue([reply]);
    forumApi.createForumPost.mockResolvedValue(post);
    forumApi.createForumReply.mockResolvedValue(reply);
    forumApi.editForumPost.mockResolvedValue(post);
    forumApi.deleteForumPost.mockResolvedValue({
      success: true,
    });
  });

  it("renders the forum heading", async () => {
    renderForum();

    expect(
      screen.getByRole("heading", {
        name: /media discussion forum/i,
      })
    ).toBeInTheDocument();

    expect(
      await screen.findByText(post.content)
    ).toBeInTheDocument();
  });

  it("loads posts for the correct media item", async () => {
    renderForum();

    await waitFor(() => {
      expect(forumApi.getMediaPosts).toHaveBeenCalledWith("1");
    });
  });

  it("displays the post author and content", async () => {
    renderForum();

    expect(
      await screen.findByText(post.content)
    ).toBeInTheDocument();

    expect(
      screen.getByText("Demo User A")
    ).toBeInTheDocument();
  });

  it("shows an empty discussion state", async () => {
    forumApi.getMediaPosts.mockResolvedValue([]);

    renderForum();

    expect(
      await screen.findByText(
        /no discussions yet/i
      )
    ).toBeInTheDocument();
  });

  it("shows a loading state", () => {
    forumApi.getMediaPosts.mockImplementation(
      () => new Promise(() => {})
    );

    renderForum();

    expect(
      screen.getByText(/loading discussions/i)
    ).toBeInTheDocument();
  });

  it("displays an API error", async () => {
    forumApi.getMediaPosts.mockRejectedValue(
      new Error("Network error")
    );

    renderForum();

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("Network error");
  });

  it("creates a discussion post", async () => {
    renderForum();

    await screen.findByText(post.content);

    fireEvent.change(
      screen.getByPlaceholderText(
        /what did you think about this media/i
      ),
      {
        target: { value: "New discussion!" },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /create post/i,
      })
    );

    await waitFor(() => {
      expect(forumApi.createForumPost)
        .toHaveBeenCalledWith(
          "1",
          "New discussion!"
        );
    });
  });

  it("loads replies for a post", async () => {
    renderForum();

    await screen.findByText(post.content);

    fireEvent.click(
      screen.getByRole("button", {
        name: /view replies/i,
      })
    );

    expect(
      await screen.findByText(reply.content)
    ).toBeInTheDocument();

    expect(forumApi.getPostReplies)
      .toHaveBeenCalledWith(10);
  });

  it("creates a reply", async () => {
    renderForum();

    await screen.findByText(post.content);

    fireEvent.change(
      screen.getByPlaceholderText(/write a reply/i),
      {
        target: { value: "Great discussion!" },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /^reply$/i,
      })
    );

    await waitFor(() => {
      expect(forumApi.createForumReply)
        .toHaveBeenCalledWith(
          10,
          "Great discussion!"
        );
    });
  });

  it("shows Edit and Delete for the post owner", async () => {
    renderForum();

    await screen.findByText(post.content);

    expect(
      screen.getByRole("button", { name: /^edit$/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /^delete$/i })
    ).toBeInTheDocument();
  });

  it("hides Edit and Delete for other users", async () => {
    setTestUser(2);

    renderForum();

    await screen.findByText(post.content);

    expect(
      screen.queryByRole("button", { name: /^edit$/i })
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: /^delete$/i })
    ).not.toBeInTheDocument();
  });

  it("edits an owned post", async () => {
    renderForum();

    await screen.findByText(post.content);

    fireEvent.click(
      screen.getByRole("button", { name: /^edit$/i })
    );

    fireEvent.change(
      screen.getByDisplayValue(post.content),
      {
        target: { value: "Updated discussion!" },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /save changes/i,
      })
    );

    await waitFor(() => {
      expect(forumApi.editForumPost)
        .toHaveBeenCalledWith(
          10,
          "Updated discussion!"
        );
    });
  });

  it("deletes an owned post", async () => {
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);

    try {
      renderForum();

      await screen.findByText(post.content);

      fireEvent.click(
        screen.getByRole("button", {
          name: /^delete$/i,
        })
      );

      await waitFor(() => {
        expect(forumApi.deleteForumPost)
          .toHaveBeenCalledWith(10);
      });

      await waitFor(() => {
        expect(
          screen.queryByText(post.content)
        ).not.toBeInTheDocument();
      });
    } finally {
      window.confirm = originalConfirm;
    }
  });

  it("refreshes discussions", async () => {
    renderForum();

    await screen.findByText(post.content);

    fireEvent.click(
      screen.getByRole("button", {
        name: /refresh discussions/i,
      })
    );

    await waitFor(() => {
      expect(forumApi.getMediaPosts)
        .toHaveBeenCalledTimes(2);
    });
  });
});