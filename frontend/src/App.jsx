import { Routes, Route } from "react-router-dom";

import FriendSuggestions from "./pages/FriendSuggestions/FriendSuggestions";
import FriendsPage from "./pages/Friends/FriendsPage";

function App() {
  return (
    <Routes>
      <Route
        path="/friends"
        element={<FriendSuggestions />}
      />

      <Route
        path="/manage-friends"
        element={<FriendsPage />}
      />
    </Routes>
  );
}

export default App;