// src/App.jsx
import { Routes, Route } from "react-router-dom";
import FriendSuggestions from "./pages/FriendSuggestions/FriendSuggestions";
import Signup from "./pages/Signup";

function App() {
  return (
    <Routes>
      {/* Your Friends Recommendation page */}
      <Route path="/friends" element={<FriendSuggestions/>} />
      <Route path="/signup" element={<Signup />} />
    </Routes>
  );
}

export default App;