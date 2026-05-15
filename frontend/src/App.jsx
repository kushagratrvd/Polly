import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { DashboardPage } from "@/pages/DashboardPage";
import { PublicPollPage } from "@/pages/PublicPollPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignUpPage } from "@/pages/auth/SignUpPage";
import CreatorAnalyticsPage from "@/pages/CreatorAnalyticsPage";
import RequireAuth from "@/components/auth/RequireAuth";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/analytics/creator" element={<RequireAuth><CreatorAnalyticsPage /></RequireAuth>} />
        <Route path="/poll/:id" element={<PublicPollPage />} />
      </Routes>
    </BrowserRouter>
  );
}
