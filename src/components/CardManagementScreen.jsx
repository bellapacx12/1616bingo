import React, { useState, useEffect } from "react";
import ModalReport from "./ModalReport";
import CardModal from "./showCard";

const TOTAL_CARDS = 400;
const DEFAULT_COLOR = "#3B82F6"; // blue shade

export default function CardManagementScreen({
  selectedCards,
  setCurrentView,
}) {
  const [selectedCardState, setSelectedCardState] = useState([]);
  const [cardColor, setCardColor] = useState(DEFAULT_COLOR);
  const [bet, setBet] = useState(10);
  const [commission, setCommission] = useState("20%");
  const [interval, setInterval] = useState("4 sec");
  const [pattern, setPattern] = useState("All");
  const [language, setLanguage] = useState("Amharic");
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [blurred, setBlurred] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState(null);

  // Initialize local selected cards state from prop if present
  useEffect(() => {
    if (selectedCards && selectedCards.length > 0) {
      setSelectedCardState(selectedCards);
    }
  }, [selectedCards]);

  // Fetch balance on mount
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const shop_id = localStorage.getItem("shopid");
        const balanceRes = await fetch(
          `https://one616api.onrender.com/balance/${shop_id}`
        );
        if (!balanceRes.ok) throw new Error("Failed to fetch balance");
        const { balance } = await balanceRes.json();
        setBalance(balance);
      } catch (error) {
        console.error("Error fetching balance:", error);
        alert("❌ Unable to load balance.");
      }
    };
    fetchBalance();
  }, []);

  // Logout handler
  const handleLogout = () => {
    localStorage.clear();
    setCurrentView({ name: "login" });
  };

  // Toggle card selection
  const toggleCard = (num) => {
    setSelectedCardState((prev) => {
      const isAlreadySelected = prev.includes(num);
      if (!isAlreadySelected) {
        setSelectedCardId(num); // Open modal for this card
        // setIsModalOpen(true); // Uncomment if you want modal to open on select
        return [...prev, num];
      } else {
        return prev.filter((n) => n !== num);
      }
    });
  };

  // Close card modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCardId(null);
  };

  // Calculate prize based on bet, commission, and selected cards
  const calculatePrize = () => {
    const numSelectedCards = selectedCardState.length;
    const betAmount = bet;
    const commissionRate = parseFloat(commission) / 100;

    if (numSelectedCards === 0 || betAmount <= 0) {
      return 0;
    }

    const totalBet = numSelectedCards * betAmount;
    return totalBet * (1 - commissionRate);
  };

  // Start the game
  const startGame = async () => {
    setIsLoading(true);
    const prize = calculatePrize();
    const parsedInterval = parseInt(interval.split(" ")[0]) * 1000;

    try {
      const shopId = localStorage.getItem("shopid");

      const res = await fetch("https://one616api.onrender.com/startgame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id: shopId,
          bet_per_card: bet,
          commission_rate: parseFloat(commission) / 100,
          interval: parsedInterval,
          language: language,
          winning_pattern: pattern,
          prize: prize,
          total_cards: selectedCardState.length,
          selected_cards: selectedCardState,
        }),
      });

      if (!res.ok) throw new Error("Game creation failed");
      const { round_id } = await res.json();

      setCurrentView({
        name: "dashboard",
        props: {
          roundId: round_id,
          shopId,
          prize,
          selectedCards: selectedCardState,
          interval: parsedInterval,
          language,
          betPerCard: bet,
          commissionRate: parseFloat(commission) / 100,
          winningPattern: pattern,
        },
      });
    } catch (err) {
      console.error("Start Game Error:", err);
      alert("❌ Failed to start game. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const shopId = localStorage.getItem("shopid");

  return (
    <div className="w-screen h-screen bg-slate-100 text-slate-800 flex overflow-hidden">
      {/* Sidebar Settings Panel */}
      <aside className="w-72 bg-white border-r border-slate-200 p-6 flex flex-col gap-6 shadow-sm">
        <div className="pb-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-700">
            Selected Cards
          </h2>
          <p className="text-3xl font-bold text-slate-900">
            {selectedCardState.length}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Bet Per Card (ETB)
          </label>
          <input
            type="number"
            value={bet}
            onChange={(e) => setBet(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-md border border-slate-300 focus:ring-2 focus:ring-slate-500"
          />
        </div>

        <div
          className={`flex items-center gap-3 p-3 rounded-md border border-slate-300 bg-slate-50 ${
            !blurred ? "blur-sm" : ""
          }`}
        >
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Commission</label>
            <select
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-300"
            >
              <option>20%</option>
              <option>30%</option>
            </select>
          </div>
          <button
            onClick={() => setBlurred(!blurred)}
            className="px-3 py-2 text-sm rounded-md bg-slate-800 text-white hover:bg-slate-700"
          >
            {blurred ? "Unblur" : "Blur"}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Call Interval
          </label>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-slate-300"
          >
            <option>4 sec</option>
            <option>5 sec</option>
            <option>7 sec</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Winning Pattern
          </label>
          <select
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-slate-300"
          >
            <option>All</option>
            <option>1 Line</option>
            <option>2 Lines</option>
            <option>Four Corners</option>
            <option>Cross</option>
            <option>Inner Corners + Center</option>
            <option>Full House</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-slate-300"
          >
            <option>Amharic</option>
            <option>English</option>
          </select>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          {/* Left Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
            1616 Bingo
          </h1>

          {/* Right Controls */}
          <div className="flex flex-wrap justify-end gap-3">
            {/* Reports Button */}
            <button
              className="text-sm md:text-base font-medium text-white px-5 py-2.5 rounded-md bg-slate-800 hover:bg-slate-700"
              onClick={() => setShowReportModal(true)}
            >
              Reports
            </button>

            {/* Start Game Button */}
            <button
              onClick={startGame}
              disabled={selectedCardState.length === 0}
              className={`px-5 py-2.5 rounded-md font-semibold text-white shadow-md transition min-w-[150px] ${
                selectedCardState.length === 0
                  ? "bg-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Starting...
                </div>
              ) : (
                "Start Bingo Game"
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 rounded-md bg-red-500 hover:bg-red-600 text-white font-medium transition"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-10 md:grid-cols-12 lg:grid-cols-14 xl:grid-cols-16 gap-2 md:gap-3">
          {Array.from({ length: TOTAL_CARDS }, (_, i) => i + 1).map((num) => {
            const isSelected = selectedCardState.includes(num);
            return (
              <button
                key={num}
                onClick={() => toggleCard(num)}
                className={`w-12 h-12 bg-slate-100 border border-slate-500 text-slate-800 md:w-14 md:h-14 rounded-lg flex items-center justify-center font-bold transition-all ${
                  isSelected
                    ? "ring-2 ring-green-500 scale-105"
                    : "hover:ring-2 hover:ring-slate-300"
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>
      </main>

      {/* Modals */}
      <ModalReport
        show={showReportModal}
        onClose={() => setShowReportModal(false)}
        shopId={shopId}
      />

      <CardModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        winningCardIds={selectedCardId ? [selectedCardId] : []}
      />
    </div>
  );
}
