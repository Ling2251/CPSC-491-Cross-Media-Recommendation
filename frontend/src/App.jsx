import { Routes, Route } from "react-router-dom";

import FriendsPage from "./pages/Friends/FriendsPage";

function App() {
  return (
    <Routes>
      <Route
        path="/manage-friends"
        element={<FriendsPage />}
      />
    </Routes>
  );
}

export default App;