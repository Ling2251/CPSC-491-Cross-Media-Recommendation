import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import LandingPage from "./LandingPage";

describe("LandingPage", () => {
  it("prefills signup email and confirms account creation on /login", () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/login",
            state: {
              email: "demo@example.com",
              signupSuccess: true,
            },
          },
        ]}
      >
        <LandingPage onLogin={() => {}} />
      </MemoryRouter>
    );

    expect(screen.getByLabelText("EMAIL")).toHaveValue("demo@example.com");
    expect(
      screen.getByText("Your account is ready. Log in to continue.")
    ).toBeInTheDocument();
  });
});
