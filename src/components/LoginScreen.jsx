import React, { useState, useEffect } from "react";
import { CheckCircle, Shield } from "react-feather";
import "../App.css";

const LoginScreen = ({ setCurrentUser, setCurrentView }) => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
    shopId: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setCurrentView("card_management");
    }
  }, [setCurrentView]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch("https://one616api.onrender.com/loginshop", {
        // adjust URL as needed
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shopId: credentials.shopId,
          username: credentials.username,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Login failed");
      }

      const data = await response.json();
      // Assuming response returns { access_token, user: { name, role, shopId, permissions } }
      const { access_token, user } = data;

      // Store token in localStorage/sessionStorage if needed
      localStorage.setItem("token", access_token);
      localStorage.setItem("shopid", credentials.shopId);

      setCurrentUser(user);
      setCurrentView("card_management");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#03060f] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,255,0.08),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.08),transparent_40%)]" />

      <div className="relative w-full max-w-md p-[1px] rounded-2xl bg-gradient-to-r from-cyan-500 via-fuchsia-600 to-purple-700 shadow-[0_0_40px_rgba(0,255,255,0.2)]">
        <div className="w-full bg-[#05070d]/95 rounded-2xl p-8 md:p-10 border border-cyan-400/20">
          {/* Branding */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-wider text-cyan-300 drop-shadow-[0_0_8px_rgba(0,255,255,0.6)]">
              1616 Bingo
            </h1>
            <p className="mt-2 text-sm text-cyan-300/60 tracking-wide">
              Shop Management Login
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-cyan-300/80 font-medium mb-2">
                Shop ID
              </label>
              <input
                type="text"
                value={credentials.shopId}
                onChange={(e) =>
                  setCredentials({ ...credentials, shopId: e.target.value })
                }
                className="w-full px-4 py-3 bg-[#0a0f1f] border border-cyan-400/20 rounded-md text-cyan-100 placeholder-cyan-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition"
                placeholder="Enter your Shop ID"
                required
              />
            </div>

            <div>
              <label className="block text-cyan-300/80 font-medium mb-2">
                Username
              </label>
              <input
                type="text"
                value={credentials.username}
                onChange={(e) =>
                  setCredentials({ ...credentials, username: e.target.value })
                }
                className="w-full px-4 py-3 bg-[#0a0f1f] border border-cyan-400/20 rounded-md text-cyan-100 placeholder-cyan-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition"
                placeholder="Username"
                required
              />
            </div>

            <div>
              <label className="block text-cyan-300/80 font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) =>
                  setCredentials({ ...credentials, password: e.target.value })
                }
                className="w-full px-4 py-3 bg-[#0a0f1f] border border-cyan-400/20 rounded-md text-cyan-100 placeholder-cyan-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition"
                placeholder="Password"
                required
              />
            </div>

            {errorMsg && (
              <p className="text-red-400 text-center font-medium tracking-wide">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold rounded-md hover:scale-[1.02] transition transform shadow-[0_0_12px_rgba(0,255,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Logging in...
                </div>
              ) : (
                "Login"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-cyan-400/10 text-xs text-cyan-300/50 text-center space-y-2">
            <div className="flex items-center justify-center space-x-6">
              <div className="flex items-center">
                <CheckCircle size={16} className="mr-1 text-cyan-400/60" />
                Secure Login
              </div>
              <div className="flex items-center">
                <Shield size={16} className="mr-1 text-purple-400/60" />
                Encrypted
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
