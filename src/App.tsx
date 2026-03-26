import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import { AIReportsPage, StockReportsPage } from './pages/DailyReports';
import { DevToolsPage } from './pages/DevTools';
import NovelsPage from './pages/NovelsPage';
import NovelDetailPage from './pages/NovelDetailPage';
import ChapterPage from './pages/ChapterPage';
import ProtectedRoute from './components/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-news"
              element={
                <ProtectedRoute>
                  <AIReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock-news"
              element={
                <ProtectedRoute>
                  <StockReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dev-tools"
              element={
                <ProtectedRoute>
                  <DevToolsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/novels"
              element={
                <ProtectedRoute>
                  <NovelsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/novels/:id"
              element={
                <ProtectedRoute>
                  <NovelDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/novels/:id/chapters/:chapterId"
              element={
                <ProtectedRoute>
                  <ChapterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/daily-reports"
              element={<Navigate to="/ai-news" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;