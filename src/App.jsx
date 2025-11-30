import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import {
  Home,
  Auth,
  Orders,
  Tables,
  Menu,
  Dashboard,
  Inventory,
} from "./pages";
import Header from "./components/shared/Header";
import { useSelector } from "react-redux";
import useLoadData from "./hooks/useLoadData";
import FullScreenLoader from "./components/shared/FullScreenLoader";
import PropTypes from "prop-types";

// Debug component - remove after testing
function DebugAuth() {
  const user = useSelector((state) => state.user);
  const token = localStorage.getItem("token");
  console.log("🔍 AUTH DEBUG:", {
    reduxIsAuth: user.isAuth,
    reduxToken: user.token,
    localStorageToken: token,
    userData: user,
  });
  return null;
}

function Layout() {
  const isLoading = useLoadData();
  const location = useLocation();
  const hideHeaderRoutes = ["/auth"];
  const user = useSelector((state) => state.user);

  // ✅ FIXED: Check both Redux state AND localStorage as fallback
  const isAuthenticated = user.isAuth || localStorage.getItem("token");

  if (isLoading) return <FullScreenLoader />;

  return (
    <>
      <DebugAuth /> {/* Remove this line after debugging */}
      {!hideHeaderRoutes.includes(location.pathname) && isAuthenticated && (
        <Header />
      )}
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoutes>
              <Home />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/auth"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Auth />}
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoutes>
              <Orders />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/tables"
          element={
            <ProtectedRoutes>
              <Tables />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/menu"
          element={
            <ProtectedRoutes>
              <Menu />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoutes>
              <Dashboard />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoutes>
              <Inventory />
            </ProtectedRoutes>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function ProtectedRoutes({ children }) {
  const user = useSelector((state) => state.user);

  // ✅ FIXED: Check both Redux state AND localStorage as fallback
  const isAuthenticated = user.isAuth || localStorage.getItem("token");

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

ProtectedRoutes.propTypes = {
  children: PropTypes.node.isRequired,
};

function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}

export default App;
