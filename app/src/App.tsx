import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthGate } from './auth/AuthGate';
import { DashboardPage } from './pages/DashboardPage';
import { NewArticlePage } from './pages/NewArticlePage';
import { ArticleDetailPage } from './pages/ArticleDetailPage';
import './app.css';

function App() {
  return (
    <AuthGate>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/new" element={<NewArticlePage />} />
          <Route path="/article/:articleId" element={<ArticleDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthGate>
  );
}

export default App;
