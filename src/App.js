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
import Overview from './pages/expenses/Overview';
import History from './pages/expenses/History';
import Budgets from './pages/expenses/Budgets';
import AccessGate from './pages/AccessGate';
import RequireAdvisor from './pages/RequireAdvisor';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AccessGate>
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
              <Route path="desk" element={<RequireAdvisor><Desk /></RequireAdvisor>} />
              <Route path="expenses">
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<Overview />} />
                <Route path="history" element={<History />} />
                <Route path="budgets" element={<Budgets />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </AccessGate>
      </ToastProvider>
    </ThemeProvider>
  );
}
