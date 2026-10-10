import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './styles/tokens.css';
import './styles/components.css';
import './pages/pages.css';
import { ThemeProvider, ToastProvider } from './ui';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import AppShell from './pages/AppShell';
import Markets from './pages/Markets';
import Book from './pages/Book';
import Portfolio from './pages/Portfolio';
import WatchlistPage from './pages/WatchlistPage';
import Desk from './pages/Desk';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signup" element={<Auth mode="signup" />} />
            <Route path="/login" element={<Auth mode="login" />} />
            <Route path="/app" element={<AppShell />}>
              <Route index element={<Navigate to="markets" replace />} />
              <Route path="markets" element={<Markets />} />
              <Route path="book" element={<Book />} />
              <Route path="book/:id" element={<Portfolio />} />
              <Route path="watchlist" element={<WatchlistPage />} />
              <Route path="desk" element={<Desk />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
