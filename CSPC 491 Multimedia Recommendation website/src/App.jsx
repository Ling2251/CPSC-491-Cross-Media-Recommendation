// src/App.jsx
import { Routes, Route } from "react-router-dom";
import FriendSuggestions from "./pages/FriendSuggestions/FriendSuggestions";
import MediaTagging from "./pages/MediaTagging/MediaTagging";

function App() {
  return (
    <Routes>
      {/* Your Friends Recommendation page */}
      <Route path="/friends" element={<FriendSuggestions/>} />
      {/* Data / Media Tagging preview */}
      <Route path="/media" element={<MediaTagging/>} />
    </Routes>
  );
}

export default App;