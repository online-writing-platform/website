import { lazy, Suspense, type ReactNode } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import "./App.css";

import PlatformHeader from "./components/PlatformHeader";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import StartWritingProvider from "./context/StartWritingProvider";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ReaderPage = lazy(() => import("./pages/ReaderPage"));
const PublicProfilePage = lazy(() => import("./pages/PublicProfilePage"));
const SocialListPage = lazy(() => import("./pages/SocialListPage"));
const BrowsePage = lazy(() => import("./pages/BrowsePage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const ReadingListPage = lazy(() => import("./pages/ReadingListPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const WriterStoryPage = lazy(() => import("./pages/WriterStoryPage"));
const ChapterEditorPage = lazy(() => import("./pages/ChapterEditorPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ModerationPage = lazy(() => import("./pages/ModerationPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const ConfirmEmailChangePage = lazy(
  () => import("./pages/ConfirmEmailChangePage"),
);
const Terms = lazy(() => import("./pages/Terms"));
const ErrorPage = lazy(() => import("./pages/Error"));

function Secure({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function LegacySearchRedirect() {
  const location = useLocation();

  return <Navigate replace to={"/browse" + location.search} />;
}

function App() {
  return (
    <BrowserRouter>
      <StartWritingProvider>
        <PlatformHeader />

        <Suspense
          fallback={
            <main className="page-shell">
              <p>در حال بارگذاری…</p>
            </main>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />

            <Route path="/search" element={<LegacySearchRedirect />} />

            <Route path="/browse" element={<BrowsePage />} />

            <Route
              path="/browse/genres/:slug"
              element={<BrowsePage kind="genre" />}
            />

            <Route
              path="/browse/tags/:slug"
              element={<BrowsePage kind="tag" />}
            />

            {/*
             * صفحهٔ معرفی داستان و صفحهٔ خواندن دیگر مجزا نیستند.
             * ورود به آدرس اصلی داستان، اولین فصل منتشرشده را در همان
             * صفحهٔ یکپارچه نمایش می‌دهد.
             */}
            <Route path="/stories/:slug" element={<ReaderPage />} />

            {/*
             * آدرس مستقیم فصل‌ها برای لینک‌های قدیمی، اشتراک‌گذاری،
             * تاریخچهٔ مرورگر و SEO حفظ شده است.
             */}
            <Route
              path="/stories/:slug/chapters/:chapterId"
              element={<ReaderPage />}
            />

            <Route path="/users/:username" element={<PublicProfilePage />} />

            <Route
              path="/users/:username/followers"
              element={<SocialListPage kind="followers" />}
            />

            <Route
              path="/users/:username/following"
              element={<SocialListPage kind="following" />}
            />

            <Route
              path="/reading-lists/:listId"
              element={<ReadingListPage />}
            />

            <Route path="/login" element={<Login />} />

            <Route path="/register" element={<Register />} />

            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route path="/verify-email" element={<VerifyEmailPage />} />

            <Route
              path="/confirm-email-change"
              element={<ConfirmEmailChangePage />}
            />

            <Route path="/terms" element={<Terms />} />

            <Route
              path="/library"
              element={
                <Secure>
                  <LibraryPage />
                </Secure>
              }
            />

            <Route
              path="/notifications"
              element={
                <Secure>
                  <NotificationsPage />
                </Secure>
              }
            />

            <Route
              path="/settings"
              element={
                <Secure>
                  <SettingsPage />
                </Secure>
              }
            />

            <Route
              path="/write"
              element={
                <Secure>
                  <main className="page-shell" aria-busy="true" />
                </Secure>
              }
            />

            <Route
              path="/write/:storyId"
              element={
                <Secure>
                  <WriterStoryPage />
                </Secure>
              }
            />

            <Route
              path="/write/:storyId/chapters/:chapterId"
              element={
                <Secure>
                  <ChapterEditorPage />
                </Secure>
              }
            />

            <Route
              path="/analytics"
              element={
                <Secure>
                  <AnalyticsPage />
                </Secure>
              }
            />

            <Route
              path="/moderation"
              element={
                <RoleRoute roles={["MODERATOR", "ADMIN"]}>
                  <ModerationPage />
                </RoleRoute>
              }
            />

            <Route path="*" element={<ErrorPage />} />
          </Routes>
        </Suspense>
      </StartWritingProvider>
    </BrowserRouter>
  );
}

export default App;
