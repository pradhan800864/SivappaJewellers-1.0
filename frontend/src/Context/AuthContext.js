import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ Runs when component mounts
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchUser(token).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // ✅ Fetch user details using token
  const fetchUser = async (token) => {
    try {
      const response = await fetch(process.env.REACT_APP_API_BASE + "/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem("token");
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      localStorage.removeItem("token");
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // ✅ Login: store token + fetch user
  const login = async (token) => {
    localStorage.setItem("token", token);
    await fetchUser(token);
  };

  const refreshUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    await fetchUser(token);
  };

  // ✅ Logout: clear everything
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
