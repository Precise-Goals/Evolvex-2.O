import React, { useState, useEffect } from "react";
import { useAuth } from "../App"; // Adjust path as needed
import { useNavigate } from "react-router-dom";
import sorc from "../assets/trends.png";

export const Login = () => {
  const [error, setError] = useState(""); // Handle errors
  const { login, user } = useAuth(); // Assuming useAuth also provides the current user
  const navigate = useNavigate();

  // Function to check if Petra Wallet is installed
  const getAptosWallet = () => {
    if ("aptos" in window) {
      return window.aptos;
    } else {
      window.open("https://petra.app/", "_blank");
      return null;
    }
  };

  // Main handler for the connect button
  const handleConnect = async () => {
    setError(""); // Reset error state
    const wallet = getAptosWallet();

    if (!wallet) {
      setError("Petra Wallet not found. Please install it.");
      return;
    }

    try {
      // The connect() method returns the wallet's public key and address
      const response = await wallet.connect();

      // The user's Aptos address
      const userAddress = response.address;

      // Create a user data object
      const userData = {
        address: userAddress,
        publicKey: response.publicKey,
      };

      // Call the login function from context to update app state
      login(userData);
      navigate("/"); // Redirect to home page after successful connection
    } catch (err) {
      // Handles wallet connection errors (e.g., user rejects the request)
      setError(err.message || "Failed to connect wallet. Please try again.");
    }
  };

  // If the user is already logged in, you can redirect them or show a different UI
  useEffect(() => {
    if (user) {
      navigate("/"); // Redirect if already logged in
    }
  }, [user, navigate]);

  return (
    <div className="login-container">
      <div className="lplt">
        <h2>
          <span>EVOLVEX</span> <br /> CONNECT WALLET
        </h2>

        {/* The new "Connect Wallet" button */}
        <button
          type="button"
          onClick={handleConnect}
          className="connect-wallet-btn"
        >
          Connect Petra Wallet
        </button>

        {/* Display error message if any */}
        {error && <p style={{ color: "red", marginTop: "15px" }}>{error}</p>}

        <p style={{ marginTop: "20px", fontSize: "0.8rem", color: "gray" }}>
          By connecting your wallet, you agree to our Terms of Service.
        </p>
      </div>
      <img src={sorc} alt="Market Analysis" className="mrktan" />
    </div>
  );
};
