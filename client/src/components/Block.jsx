import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle,
  DollarSign,
  FileText,
  User,
  Users,
} from "lucide-react";
import { Aptos } from "@aptos-labs/ts-sdk";
import {
  APTIVATE_CONTRACT_ADDRESS,
  FREELANCE_CONTRACT_ADDRESS,
} from "./config";

import "./style.css";

const BlockFree = () => {
  // State management
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState(0);
  const [isClient, setIsClient] = useState(true); // Toggle between client and freelancer view
  // eslint-disable-next-line no-unused-vars
  const [contracts, setContracts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [bids, setBids] = useState([]);
  const [newJob, setNewJob] = useState({
    title: "",
    description: "",
    budget: "",
    deadline: "",
    skills_required: "",
  });
  const [newBid, setNewBid] = useState({
    job_id: "",
    proposed_amount: "",
    estimated_days: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });
  const [aptosClient, setAptosClient] = useState(null);

  // Initialize Aptos client
  useEffect(() => {
    const client = new Aptos({ network: "devnet" });
    setAptosClient(client);
  }, []);

  // Connect to Aptos wallet
  const connectWallet = async () => {
    setLoading(true);

    try {
      if (!window.aptos) {
        throw new Error("Please install Petra wallet");
      }

      // Connect to wallet
      const response = await window.aptos.connect();
      const walletAddress = response.address;
      setAccount(walletAddress);

      // Get account balance
      const resources = await aptosClient.getAccountResources({
        accountAddress: walletAddress,
      });
      const aptosCoinResource = resources.find(
        (r) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
      );
      const balance = aptosCoinResource
        ? parseInt(aptosCoinResource.data.coin.value) / 100000000
        : 0;
      setBalance(balance);

      // Load user data
      await loadUserData(walletAddress);

      showNotification("Wallet connected successfully!", "success");
      setLoading(false);
    } catch (error) {
      console.error("Wallet connection error:", error);
      showNotification(`Failed to connect wallet: ${error.message}`, "error");
      setLoading(false);
    }
  };

  // Load user data from blockchain
  const loadUserData = async (walletAddress) => {
    try {
      // Initialize user account if not exists
      await initializeAccount(walletAddress);

      // Load jobs from blockchain
      await loadJobs();

      // Load bids from blockchain
      await loadBids();
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  // Initialize user account on blockchain
  const initializeAccount = async () => {
    try {
      const payload = {
        type: "entry_function_payload",
        function: `${APTIVATE_CONTRACT_ADDRESS}::Aptivate::init_account`,
        arguments: [],
        type_arguments: [],
      };

      const response = await window.aptos.signAndSubmitTransaction(payload);
      await aptosClient.waitForTransaction({ transactionHash: response.hash });
    } catch (error) {
      // Account might already be initialized
      console.log("Account initialization:", error.message);
    }
  };

  // Load jobs from blockchain
  const loadJobs = async () => {
    try {
      const payload = {
        type: "view",
        function: `${APTIVATE_CONTRACT_ADDRESS}::Aptivate::get_all_jobs`,
        arguments: [],
        type_arguments: [],
      };

      const response = await aptosClient.view({ payload });
      const jobsData = response[0] || [];
      setJobs(jobsData);
    } catch (error) {
      console.error("Error loading jobs:", error);
    }
  };

  // Load bids from blockchain
  const loadBids = async () => {
    try {
      const payload = {
        type: "view",
        function: `${APTIVATE_CONTRACT_ADDRESS}::Aptivate::get_job_bids`,
        arguments: [],
        type_arguments: [],
      };

      const response = await aptosClient.view({ payload });
      const bidsData = response[0] || [];
      setBids(bidsData);
    } catch (error) {
      console.error("Error loading bids:", error);
    }
  };

  // Handle input changes for new job form
  const handleJobInputChange = (e) => {
    const { name, value } = e.target;
    setNewJob({
      ...newJob,
      [name]: value,
    });
  };

  // Handle input changes for new bid form
  const handleBidInputChange = (e) => {
    const { name, value } = e.target;
    setNewBid({
      ...newBid,
      [name]: value,
    });
  };

  // Post new job
  const postJob = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const deadlineTimestamp = Math.floor(
        new Date(newJob.deadline).getTime() / 1000
      );
      const skillsArray = newJob.skills_required
        .split(",")
        .map((skill) => skill.trim());

      const payload = {
        type: "entry_function_payload",
        function: `${APTIVATE_CONTRACT_ADDRESS}::Aptivate::post_job`,
        arguments: [
          newJob.title,
          newJob.description,
          Math.floor(parseFloat(newJob.budget) * 100000000), // Convert to octas
          deadlineTimestamp,
          skillsArray,
        ],
        type_arguments: [],
      };

      const response = await window.aptos.signAndSubmitTransaction(payload);
      await aptosClient.waitForTransaction({ transactionHash: response.hash });

      setNewJob({
        title: "",
        description: "",
        budget: "",
        deadline: "",
        skills_required: "",
      });

      // Reload jobs
      await loadJobs();
      showNotification("Job posted successfully!", "success");
      setLoading(false);
    } catch (error) {
      console.error("Error posting job:", error);
      showNotification(`Failed to post job: ${error.message}`, "error");
      setLoading(false);
    }
  };

  // Apply for job (submit bid)
  const applyForJob = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        type: "entry_function_payload",
        function: `${APTIVATE_CONTRACT_ADDRESS}::Aptivate::apply_for_job`,
        arguments: [
          parseInt(newBid.job_id),
          Math.floor(parseFloat(newBid.proposed_amount) * 100000000), // Convert to octas
          parseInt(newBid.estimated_days),
          newBid.message,
        ],
        type_arguments: [],
      };

      const response = await window.aptos.signAndSubmitTransaction(payload);
      await aptosClient.waitForTransaction({ transactionHash: response.hash });

      setNewBid({
        job_id: "",
        proposed_amount: "",
        estimated_days: "",
        message: "",
      });

      // Reload bids
      await loadBids();
      showNotification("Bid submitted successfully!", "success");
      setLoading(false);
    } catch (error) {
      console.error("Error submitting bid:", error);
      showNotification(`Failed to submit bid: ${error.message}`, "error");
      setLoading(false);
    }
  };

  // Accept a bid (for clients)
  const acceptBid = async (jobId, bidderAddress) => {
    setLoading(true);

    try {
      const payload = {
        type: "entry_function_payload",
        function: `${APTIVATE_CONTRACT_ADDRESS}::Aptivate::accept_bid`,
        arguments: [parseInt(jobId), bidderAddress],
        type_arguments: [],
      };

      const response = await window.aptos.signAndSubmitTransaction(payload);
      await aptosClient.waitForTransaction({ transactionHash: response.hash });

      // Reload data
      await loadJobs();
      await loadBids();
      showNotification("Bid accepted! Work can now begin.", "success");
      setLoading(false);
    } catch (error) {
      console.error("Error accepting bid:", error);
      showNotification(`Failed to accept bid: ${error.message}`, "error");
      setLoading(false);
    }
  };

  // Complete a job (for freelancers)
  const completeJob = async (jobId) => {
    setLoading(true);

    try {
      const payload = {
        type: "entry_function_payload",
        function: `${APTIVATE_CONTRACT_ADDRESS}::Aptivate::complete_job`,
        arguments: [parseInt(jobId)],
        type_arguments: [],
      };

      const response = await window.aptos.signAndSubmitTransaction(payload);
      await aptosClient.waitForTransaction({ transactionHash: response.hash });

      // Reload data
      await loadJobs();
      showNotification(
        "Work marked as completed! Awaiting client confirmation.",
        "success"
      );
      setLoading(false);
    } catch (error) {
      console.error("Error completing job:", error);
      showNotification(`Failed to complete job: ${error.message}`, "error");
      setLoading(false);
    }
  };

  // Release payment (for clients)
  const releasePayment = async (jobId) => {
    setLoading(true);

    try {
      const payload = {
        type: "entry_function_payload",
        function: `${APTIVATE_CONTRACT_ADDRESS}::Aptivate::release_payment`,
        arguments: [parseInt(jobId)],
        type_arguments: [],
      };

      const response = await window.aptos.signAndSubmitTransaction(payload);
      await aptosClient.waitForTransaction({ transactionHash: response.hash });

      // Reload data and balance
      await loadJobs();
      await loadBids();

      // Update balance
      const resources = await aptosClient.getAccountResources({
        accountAddress: account,
      });
      const aptosCoinResource = resources.find(
        (r) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
      );
      const newBalance = aptosCoinResource
        ? parseInt(aptosCoinResource.data.coin.value) / 100000000
        : 0;
      setBalance(newBalance);

      showNotification("Payment released successfully!", "success");
      setLoading(false);
    } catch (error) {
      console.error("Error releasing payment:", error);
      showNotification(`Failed to release payment: ${error.message}`, "error");
      setLoading(false);
    }
  };

  // Display notification
  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 5000);
  };

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1 className="app-title">EVOLVEX BLOCKFREE</h1>
          <div className="account-area">
            {account ? (
              <div className="account-info">
                <span className="account-address">
                  {formatAddress(account)}
                </span>
                <span className="account-balance">
                  {balance.toFixed(2)} APT
                </span>
                <button
                  className="switch-role-btn"
                  onClick={() => setIsClient(!isClient)}
                >
                  Switch to {isClient ? "Freelancer" : "Client"}
                </button>
              </div>
            ) : (
              <button
                className="connect-wallet-btn"
                onClick={connectWallet}
                disabled={loading}
              >
                {loading ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      {account ? (
        <main className="main-content">
          {/* Notification */}
          {notification.show && (
            <div
              className={`notification ${
                notification.type === "success"
                  ? "notification-success"
                  : "notification-error"
              }`}
            >
              <div className="notification-content">
                {notification.type === "success" ? (
                  <CheckCircle className="notification-icon" />
                ) : (
                  <AlertCircle className="notification-icon" />
                )}
                <p>{notification.message}</p>
              </div>
            </div>
          )}

          <div className="dashboard-layout">
            {/* Left Column - Jobs List */}
            <div className="contracts-column">
              <div className="card">
                <h2 className="section-title">
                  {isClient ? "Your Jobs" : "Available Jobs"}
                </h2>

                {jobs.length > 0 ? (
                  <div className="contracts-list">
                    {jobs.map((job) => {
                      const jobBids = bids.filter(
                        (bid) => bid.job_id === job.id
                      );
                      const statusText =
                        job.status === 0
                          ? "Open"
                          : job.status === 1
                          ? "In Progress"
                          : job.status === 2
                          ? "Completed"
                          : "Cancelled";

                      return (
                        <div key={job.id} className="contract-card">
                          <div className="contract-header">
                            <h3 className="contract-title">{job.title}</h3>
                            <span
                              className={`status-badge status-${
                                job.status === 0
                                  ? "pending"
                                  : job.status === 1
                                  ? "in_progress"
                                  : "completed"
                              }`}
                            >
                              {statusText}
                            </span>
                          </div>

                          <p className="contract-description">
                            {job.description}
                          </p>

                          <div className="contract-details">
                            <span className="detail-badge">
                              <DollarSign className="detail-icon" />{" "}
                              {(job.budget / 100000000).toFixed(2)} APT
                            </span>
                            <span className="detail-badge">
                              <FileText className="detail-icon" /> Due:{" "}
                              {new Date(
                                job.deadline * 1000
                              ).toLocaleDateString()}
                            </span>
                            <span className="detail-badge">
                              <Users className="detail-icon" />
                              {jobBids.length} Bids
                            </span>
                          </div>

                          {/* Show bids for this job */}
                          {jobBids.length > 0 && (
                            <div className="bids-section">
                              <h4>Bids:</h4>
                              {jobBids.map((bid, index) => (
                                <div key={index} className="bid-item">
                                  <span>
                                    Bidder: {formatAddress(bid.bidder)}
                                  </span>
                                  <span>
                                    Amount:{" "}
                                    {(bid.proposed_amount / 100000000).toFixed(
                                      2
                                    )}{" "}
                                    APT
                                  </span>
                                  <span>Days: {bid.estimated_days}</span>
                                  {isClient && job.status === 0 && (
                                    <button
                                      className="action-btn accept-btn"
                                      onClick={() =>
                                        acceptBid(job.id, bid.bidder)
                                      }
                                      disabled={loading}
                                    >
                                      Accept Bid
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Action buttons based on role and status */}
                          <div className="contract-actions">
                            {!isClient && job.status === 1 && (
                              <button
                                className="action-btn complete-btn"
                                onClick={() => completeJob(job.id)}
                                disabled={loading}
                              >
                                Mark as Completed
                              </button>
                            )}

                            {isClient && job.status === 2 && (
                              <button
                                className="action-btn pay-btn"
                                onClick={() => releasePayment(job.id)}
                                disabled={loading}
                              >
                                Release Payment
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="no-data-msg">No jobs found.</p>
                )}
              </div>
            </div>

            {/* Right Column - Create Job (Client) or Apply for Job (Freelancer) */}
            <div className="sidebar-column">
              {isClient ? (
                <div className="card">
                  <h2 className="section-title">Post New Job</h2>

                  <form onSubmit={postJob}>
                    <div className="form-container">
                      <div className="form-group">
                        <label className="form-label">Job Title</label>
                        <input
                          type="text"
                          name="title"
                          value={newJob.title}
                          onChange={handleJobInputChange}
                          className="form-input"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                          name="description"
                          value={newJob.description}
                          onChange={handleJobInputChange}
                          className="form-textarea"
                          rows="3"
                          required
                        />
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Budget (APT)</label>
                          <input
                            type="number"
                            name="budget"
                            value={newJob.budget}
                            onChange={handleJobInputChange}
                            className="form-input"
                            step="0.01"
                            min="0.01"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Deadline</label>
                          <input
                            type="date"
                            name="deadline"
                            value={newJob.deadline}
                            onChange={handleJobInputChange}
                            className="form-input"
                            required
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          Skills Required (comma-separated)
                        </label>
                        <input
                          type="text"
                          name="skills_required"
                          value={newJob.skills_required}
                          onChange={handleJobInputChange}
                          className="form-input"
                          placeholder="React, Node.js, Solidity"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading}
                      >
                        {loading ? "Posting..." : "Post Job"}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="card">
                  <h2 className="section-title">Apply for Job</h2>

                  <form onSubmit={applyForJob}>
                    <div className="form-container">
                      <div className="form-group">
                        <label className="form-label">Job ID</label>
                        <input
                          type="number"
                          name="job_id"
                          value={newBid.job_id}
                          onChange={handleBidInputChange}
                          className="form-input"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          Your Proposed Amount (APT)
                        </label>
                        <input
                          type="number"
                          name="proposed_amount"
                          value={newBid.proposed_amount}
                          onChange={handleBidInputChange}
                          className="form-input"
                          step="0.01"
                          min="0.01"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Estimated Days</label>
                        <input
                          type="number"
                          name="estimated_days"
                          value={newBid.estimated_days}
                          onChange={handleBidInputChange}
                          className="form-input"
                          min="1"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Message to Client</label>
                        <textarea
                          name="message"
                          value={newBid.message}
                          onChange={handleBidInputChange}
                          className="form-textarea"
                          rows="3"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading}
                      >
                        {loading ? "Submitting..." : "Submit Bid"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Freelancer Dashboard (Freelancer only) */}
              {!isClient && (
                <div className="card">
                  <h2 className="section-title">Freelancer Dashboard</h2>

                  <div className="stats-container">
                    <div className="stat-card stat-active">
                      <h3 className="stat-title">Active Jobs</h3>
                      <p className="stat-value">
                        {jobs.filter((j) => j.status === 1).length}
                      </p>
                    </div>

                    <div className="stat-card stat-pending">
                      <h3 className="stat-title">My Bids</h3>
                      <p className="stat-value">
                        {bids.filter((b) => b.bidder === account).length}
                      </p>
                    </div>

                    <div className="stat-card stat-completed">
                      <h3 className="stat-title">Completed Jobs</h3>
                      <p className="stat-value">
                        {jobs.filter((j) => j.status === 2).length}
                      </p>
                    </div>

                    <div className="stat-card stat-awaiting">
                      <h3 className="stat-title">Open Jobs</h3>
                      <p className="stat-value">
                        {jobs.filter((j) => j.status === 0).length}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* How It Works */}
            </div>
            <div className="card">
              <h2 className="section-title">How It Works</h2>

              <div className="how-it-works">
                <div className="info-item">
                  <h3 className="info-title">1. Post Job</h3>
                  <p className="info-text">
                    Clients post job details with budget and requirements. Funds
                    are held in smart contract escrow.
                  </p>
                </div>

                <div className="info-item">
                  <h3 className="info-title">2. Bid & Accept</h3>
                  <p className="info-text">
                    Freelancers submit bids with their proposed amount and
                    timeline. Clients choose the best bid.
                  </p>
                </div>

                <div className="info-item">
                  <h3 className="info-title">3. Complete & Pay</h3>
                  <p className="info-text">
                    Freelancers complete the work and mark it as done. Clients
                    release payment from escrow.
                  </p>
                </div>

                <div className="info-item">
                  <h3 className="info-title">4. Earn XP & Rewards</h3>
                  <p className="info-text">
                    Build reputation through completed jobs and earn XP points
                    for airdrop eligibility.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <div className="landing-container">
          <h2 className="landing-title">Welcome to EVOLVEX BlockFree</h2>
          <p className="landing-subtitle">
            The decentralized freelancing platform powered by Aptos blockchain
          </p>

          <div className="features-container">
            <div className="feature-card">
              <Users className="feature-icon" />
              <h3 className="feature-title">For Clients</h3>
              <p className="feature-description">
                Post jobs with secure escrow payments. Review bids and choose
                the best freelancer. Pay only when work is completed.
              </p>
            </div>

            <div className="feature-card">
              <User className="feature-icon" />
              <h3 className="feature-title">For Freelancers</h3>
              <p className="feature-description">
                Browse available jobs and submit competitive bids. Get
                guaranteed payment through smart contracts. Earn XP and airdrop
                rewards.
              </p>
            </div>
          </div>

          <button
            className="landing-cta-btn"
            onClick={connectWallet}
            disabled={loading}
          >
            {loading ? "Connecting..." : "Connect Aptos Wallet to Get Started"}
          </button>
        </div>
      )}
    </div>
  );
};

export default BlockFree;
