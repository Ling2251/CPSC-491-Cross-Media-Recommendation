// src/App.jsx
import { Routes, Route } from "react-router-dom";
import FriendSuggestions from "./pages/FriendSuggestions/FriendSuggestions";

function App() {
  return (
    <Routes>
      {/* Your Friends Recommendation page */}
      <Route path="/friends" element={<FriendSuggestions/>} />
    </Routes>
  );
}

export default App;