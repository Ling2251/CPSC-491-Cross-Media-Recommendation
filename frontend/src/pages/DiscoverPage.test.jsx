import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test } from "vitest";
import DiscoverPage from "./DiscoverPage";

describe("DiscoverPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("filters media by category", () => {
    render(
      <MemoryRouter>
        <DiscoverPage isAuthenticated={false} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Books" }));

    expect(screen.getAllByRole("heading", { name: "The Midnight Library" }))
      .toHaveLength(2);
    expect(screen.queryByRole("heading", { name: "Interstellar" }))
      .not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Books" }))
      .toHaveAttribute("aria-pressed", "true");
  });

  test("prompts guests and routes them to signup from the favorite button", () => {
    render(
      <MemoryRouter initialEntries={["/discover"]}>
        <Routes>
          <Route path="/discover" element={<DiscoverPage isAuthenticated={false} />} />
          <Route path="/signup" element={<p>Signup destination</p>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Add Interstellar to favorites" })
    );

    const prompt = screen.getByRole("dialog");
    expect(within(prompt).getByText(/Sign in or create an account/))
      .toBeInTheDocument();

    fireEvent.click(
      within(prompt).getByRole("button", { name: "Create an account" })
    );

    expect(screen.getByText("Signup destination")).toBeInTheDocument();
  });

  test("saves and removes favorites for signed-in users", () => {
    render(
      <MemoryRouter>
        <DiscoverPage isAuthenticated />
      </MemoryRouter>
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Add Interstellar to favorites" })
    );

    expect(localStorage.getItem("crossmedia-favorites"))
      .toBe(JSON.stringify(["interstellar"]));
    expect(screen.getByRole("button", { name: "Remove Interstellar from favorites" }))
      .toHaveAttribute("aria-pressed", "true");

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Interstellar from favorites" })
    );

    expect(localStorage.getItem("crossmedia-favorites")).toBe("[]");
  });
});
